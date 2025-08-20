function showColFields(id) {
  const type = document.getElementById(`col${id}Type`).value;
  document.getElementById(`col${id}BuiltUp`).style.display = type==='builtup'?'block':'none';
  document.getElementById(`col${id}Box`).style.display = type==='box'?'block':'none';
  document.getElementById(`col${id}Tube`).style.display = type==='tube'?'block':'none';
}

function showBeamFields(id) {
  const type = document.getElementById(`beam${id}Type`).value;
  document.getElementById(`beam${id}BuiltUp`).style.display = type==='builtup'?'block':'none';
  document.getElementById(`beam${id}Box`).style.display = type==='box'?'block':'none';
  document.getElementById(`beam${id}Tube`).style.display = type==='tube'?'block':'none';
}

function getSectionProperties(type, prefix) {
  let A=0, I=0;
  if(type==='builtup') {
    const bw = parseFloat(document.getElementById(prefix+'WebWidth').value)/1000;
    const tw = parseFloat(document.getElementById(prefix+'WebThick').value)/1000;
    const bf = parseFloat(document.getElementById(prefix+'FlWidth').value)/1000;
    const tf = parseFloat(document.getElementById(prefix+'FlThick').value)/1000;
    A = bw*tw + 2*bf*tf;
    I = (bw*Math.pow(tw,3))/12 + 2*(bf*Math.pow(tf,3)/12 + bf*tf*Math.pow(tw/2+tf/2,2));
  } else if(type==='box') {
    const L = parseFloat(document.getElementById(prefix+'BoxLength').value)/1000;
    const W = parseFloat(document.getElementById(prefix+'BoxWidth').value)/1000;
    const t = parseFloat(document.getElementById(prefix+'BoxThick').value)/1000;
    A = 2*t*(L+W -2*t);
    I = (W*Math.pow(L,3) - (W-2*t)*Math.pow(L-2*t,3))/12;
  } else if(type==='tube') {
    const OD = parseFloat(document.getElementById(prefix+'TubeOD').value)/1000;
    const t = parseFloat(document.getElementById(prefix+'TubeThick').value)/1000;
    A = Math.PI*(Math.pow(OD/2,2) - Math.pow(OD/2 - t,2));
    I = (Math.PI/64)*(Math.pow(OD,4)-Math.pow(OD-2*t,4));
  }
  return {A, I};
}

function analyzeFrame() {
  // إدخال القيم العامة
  const H = parseFloat(document.getElementById('colHeight').value)/1000;
  const B = parseFloat(document.getElementById('frameWidth').value)/1000;
  const deadLoad = parseFloat(document.getElementById('deadLoad').value)*0.00981;
  const liveLoad = parseFloat(document.getElementById('liveLoad').value)*0.00981;
  const windLoad = parseFloat(document.getElementById('windLoad').value)*0.00981;
  const fy = parseFloat(document.getElementById('fy').value)*1e6;
  const E = parseFloat(document.getElementById('E').value)*1e9;

  // الأعمدة
  const col1Type = document.getElementById('col1Type').value;
  const col2Type = document.getElementById('col2Type').value;
  const col1Props = getSectionProperties(col1Type,'col1');
  const col2Props = getSectionProperties(col2Type,'col2');

  // الرافترين
  const beam1Type = document.getElementById('beam1Type').value;
  const beam2Type = document.getElementById('beam2Type').value;
  const beam1Props = getSectionProperties(beam1Type,'beam1');
  const beam2Props = getSectionProperties(beam2Type,'beam2');

  // حساب الأعمدة
  const axialCol1 = (deadLoad+liveLoad)*B/2 + windLoad/2;
  const axialCol2 = (deadLoad+liveLoad)*B/2 + windLoad/2;
  const sigmaCol1 = axialCol1*1e3/col1Props.A;
  const sigmaCol2 = axialCol2*1e3/col2Props.A;
  const EulerCol1 = Math.PI**2*E*col1Props.I/(H**2);
  const EulerCol2 = Math.PI**2*E*col2Props.I/(H**2);
  const utilCol1 = sigmaCol1/fy;
  const utilCol2 = sigmaCol2/fy;
  const safeCol1 = utilCol1<=1?'آمن':'غير آمن';
  const safeCol2 = utilCol2<=1?'آمن':'غير آمن';

  // حساب الرافترين
  const uniformLoad = deadLoad+liveLoad;
  const Lbeam = B/2;
  const Mbeam1 = uniformLoad*Math.pow(Lbeam,2)/8*1e3;
  const Mbeam2 = uniformLoad*Math.pow(Lbeam,2)/8*1e3;
  const sigmaBeam1 = Mbeam1*beam1Props.I/(beam1Props.I*2); // تقريبا تقريبي
  const sigmaBeam2 = Mbeam2*beam2Props.I/(beam2Props.I*2);
  const utilBeam1 = sigmaBeam1/fy;
  const utilBeam2 = sigmaBeam2/fy;
  const safeBeam1 = utilBeam1<=1?'آمن':'غير آمن';
  const safeBeam2 = utilBeam2<=1?'آمن':'غير آمن';

  // عرض النتائج
  const outputDiv = document.getElementById('output');
  outputDiv.innerHTML = '';
  const createMemberDiv = (name, stress, euler, util, safe)=>{
    const div = document.createElement('div');
    div.className='member-result '+(safe==='آمن'?'safe':'unsafe');
    div.innerHTML = `<h3>${name}</h3><p>الإجهاد: ${(stress/1e6).toFixed(2)} MPa</p>
    ${euler>0?`<p>عزم الانبعاج Euler: ${(euler/1e6).toFixed(2)} MPa</p>`:''}
    <p>معامل الأمان: ${util.toFixed(2)}</p>
    <p>الحالة: ${safe}</p>`;
    return div;
  }

  outputDiv.appendChild(createMemberDiv('العمود الأيسر', sigmaCol1,EulerCol1,utilCol1,safeCol1));
  outputDiv.appendChild(createMemberDiv('العمود الأيمن', sigmaCol2,EulerCol2,utilCol2,safeCol2));
  outputDiv.appendChild(createMemberDiv('الرافتر الأيسر', sigmaBeam1,0,utilBeam1,safeBeam1));
  outputDiv.appendChild(createMemberDiv('الرافتر الأيمن', sigmaBeam2,0,utilBeam2,safeBeam2));

  // الرسم
  const svg=document.getElementById('frameSVG');
  svg.innerHTML='';
  const maxDim=Math.max(B,H);
  const scale=600/maxDim;
  const baseX=100;
  const baseY=300;

  const colColor1=safeCol1==='آمن'?'green':'red';
  const colColor2=safeCol2==='آمن'?'green':'red';
  const beamColor1=safeBeam1==='آمن'?'green':'red';
  const beamColor2=safeBeam2==='آمن'?'green':'red';

  // الأعمدة
  svg.innerHTML+=`<rect x="${baseX}" y="${baseY-H*scale}" width="${col1Props.A*100}" height="${H*scale}" fill="${colColor1}"/>`;
  svg.innerHTML+=`<rect x="${baseX+B*scale- col2Props.A*100}" y="${baseY-H*scale}" width="${col2Props.A*100}" height="${H*scale}" fill="${colColor2}"/>`;

  // الرافترين
  const midX=baseX+B*scale/2;
  const topY=baseY-H*scale;
  svg.innerHTML+=`<line x1="${baseX}" y1="${topY}" x2="${midX}" y2="${topY-B*scale/4}" stroke="${beamColor1}" stroke-width="${beam1Props.A*100}"/>`;
  svg.innerHTML+=`<line x1="${baseX+B*scale}" y1="${topY}" x2="${midX}" y2="${topY-B*scale/4}" stroke="${beamColor2}" stroke-width="${beam2Props.A*100}"/>`;
}
