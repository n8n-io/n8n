import{stripVTControlCharacters as S}from"node:util";import{TextPrompt as Q,PasswordPrompt as X,ConfirmPrompt as Z,SelectPrompt as ee,SelectKeyPrompt as te,MultiSelectPrompt as re,GroupMultiSelectPrompt as se,isCancel as ie,block as ne}from"@clack/core";export{isCancel,updateSettings}from"@clack/core";import y from"node:process";import e from"picocolors";import{cursor as oe,erase as ae}from"sisteransi";function ce(){return y.platform!=="win32"?y.env.TERM!=="linux":!!y.env.CI||!!y.env.WT_SESSION||!!y.env.TERMINUS_SUBLIME||y.env.ConEmuTask==="{cmd::Cmder}"||y.env.TERM_PROGRAM==="Terminus-Sublime"||y.env.TERM_PROGRAM==="vscode"||y.env.TERM==="xterm-256color"||y.env.TERM==="alacritty"||y.env.TERMINAL_EMULATOR==="JetBrains-JediTerm"}const V=ce(),u=(t,n)=>V?t:n,le=u("\u25C6","*"),L=u("\u25A0","x"),W=u("\u25B2","x"),C=u("\u25C7","o"),ue=u("\u250C","T"),o=u("\u2502","|"),d=u("\u2514","\u2014"),k=u("\u25CF",">"),P=u("\u25CB"," "),A=u("\u25FB","[\u2022]"),T=u("\u25FC","[+]"),F=u("\u25FB","[ ]"),$e=u("\u25AA","\u2022"),_=u("\u2500","-"),me=u("\u256E","+"),de=u("\u251C","+"),pe=u("\u256F","+"),q=u("\u25CF","\u2022"),D=u("\u25C6","*"),U=u("\u25B2","!"),K=u("\u25A0","x"),b=t=>{switch(t){case"initial":case"active":return e.cyan(le);case"cancel":return e.red(L);case"error":return e.yellow(W);case"submit":return e.green(C)}},G=t=>{const{cursor:n,options:r,style:i}=t,s=t.maxItems??Number.POSITIVE_INFINITY,c=Math.max(process.stdout.rows-4,0),a=Math.min(c,Math.max(s,5));let l=0;n>=l+a-3?l=Math.max(Math.min(n-a+3,r.length-a),0):n<l+2&&(l=Math.max(n-2,0));const $=a<r.length&&l>0,g=a<r.length&&l+a<r.length;return r.slice(l,l+a).map((p,v,f)=>{const j=v===0&&$,E=v===f.length-1&&g;return j||E?e.dim("..."):i(p,v+l===n)})},he=t=>new Q({validate:t.validate,placeholder:t.placeholder,defaultValue:t.defaultValue,initialValue:t.initialValue,render(){const n=`${e.gray(o)}
${b(this.state)}  ${t.message}
`,r=t.placeholder?e.inverse(t.placeholder[0])+e.dim(t.placeholder.slice(1)):e.inverse(e.hidden("_")),i=this.value?this.valueWithCursor:r;switch(this.state){case"error":return`${n.trim()}
${e.yellow(o)}  ${i}
${e.yellow(d)}  ${e.yellow(this.error)}
`;case"submit":return`${n}${e.gray(o)}  ${e.dim(this.value||t.placeholder)}`;case"cancel":return`${n}${e.gray(o)}  ${e.strikethrough(e.dim(this.value??""))}${this.value?.trim()?`
${e.gray(o)}`:""}`;default:return`${n}${e.cyan(o)}  ${i}
${e.cyan(d)}
`}}}).prompt(),ge=t=>new X({validate:t.validate,mask:t.mask??$e,render(){const n=`${e.gray(o)}
${b(this.state)}  ${t.message}
`,r=this.valueWithCursor,i=this.masked;switch(this.state){case"error":return`${n.trim()}
${e.yellow(o)}  ${i}
${e.yellow(d)}  ${e.yellow(this.error)}
`;case"submit":return`${n}${e.gray(o)}  ${e.dim(i)}`;case"cancel":return`${n}${e.gray(o)}  ${e.strikethrough(e.dim(i??""))}${i?`
${e.gray(o)}`:""}`;default:return`${n}${e.cyan(o)}  ${r}
${e.cyan(d)}
`}}}).prompt(),ye=t=>{const n=t.active??"Yes",r=t.inactive??"No";return new Z({active:n,inactive:r,initialValue:t.initialValue??!0,render(){const i=`${e.gray(o)}
${b(this.state)}  ${t.message}
`,s=this.value?n:r;switch(this.state){case"submit":return`${i}${e.gray(o)}  ${e.dim(s)}`;case"cancel":return`${i}${e.gray(o)}  ${e.strikethrough(e.dim(s))}
${e.gray(o)}`;default:return`${i}${e.cyan(o)}  ${this.value?`${e.green(k)} ${n}`:`${e.dim(P)} ${e.dim(n)}`} ${e.dim("/")} ${this.value?`${e.dim(P)} ${e.dim(r)}`:`${e.green(k)} ${r}`}
${e.cyan(d)}
`}}}).prompt()},ve=t=>{const n=(r,i)=>{const s=r.label??String(r.value);switch(i){case"selected":return`${e.dim(s)}`;case"active":return`${e.green(k)} ${s} ${r.hint?e.dim(`(${r.hint})`):""}`;case"cancelled":return`${e.strikethrough(e.dim(s))}`;default:return`${e.dim(P)} ${e.dim(s)}`}};return new ee({options:t.options,initialValue:t.initialValue,render(){const r=`${e.gray(o)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${r}${e.gray(o)}  ${n(this.options[this.cursor],"selected")}`;case"cancel":return`${r}${e.gray(o)}  ${n(this.options[this.cursor],"cancelled")}
${e.gray(o)}`;default:return`${r}${e.cyan(o)}  ${G({cursor:this.cursor,options:this.options,maxItems:t.maxItems,style:(i,s)=>n(i,s?"active":"inactive")}).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`}}}).prompt()},we=t=>{const n=(r,i="inactive")=>{const s=r.label??String(r.value);return i==="selected"?`${e.dim(s)}`:i==="cancelled"?`${e.strikethrough(e.dim(s))}`:i==="active"?`${e.bgCyan(e.gray(` ${r.value} `))} ${s} ${r.hint?e.dim(`(${r.hint})`):""}`:`${e.gray(e.bgWhite(e.inverse(` ${r.value} `)))} ${s} ${r.hint?e.dim(`(${r.hint})`):""}`};return new te({options:t.options,initialValue:t.initialValue,render(){const r=`${e.gray(o)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${r}${e.gray(o)}  ${n(this.options.find(i=>i.value===this.value)??t.options[0],"selected")}`;case"cancel":return`${r}${e.gray(o)}  ${n(this.options[0],"cancelled")}
${e.gray(o)}`;default:return`${r}${e.cyan(o)}  ${this.options.map((i,s)=>n(i,s===this.cursor?"active":"inactive")).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`}}}).prompt()},fe=t=>{const n=(r,i)=>{const s=r.label??String(r.value);return i==="active"?`${e.cyan(A)} ${s} ${r.hint?e.dim(`(${r.hint})`):""}`:i==="selected"?`${e.green(T)} ${e.dim(s)} ${r.hint?e.dim(`(${r.hint})`):""}`:i==="cancelled"?`${e.strikethrough(e.dim(s))}`:i==="active-selected"?`${e.green(T)} ${s} ${r.hint?e.dim(`(${r.hint})`):""}`:i==="submitted"?`${e.dim(s)}`:`${e.dim(F)} ${e.dim(s)}`};return new re({options:t.options,initialValues:t.initialValues,required:t.required??!0,cursorAt:t.cursorAt,validate(r){if(this.required&&r.length===0)return`Please select at least one option.
${e.reset(e.dim(`Press ${e.gray(e.bgWhite(e.inverse(" space ")))} to select, ${e.gray(e.bgWhite(e.inverse(" enter ")))} to submit`))}`},render(){const r=`${e.gray(o)}
${b(this.state)}  ${t.message}
`,i=(s,c)=>{const a=this.value.includes(s.value);return c&&a?n(s,"active-selected"):a?n(s,"selected"):n(s,c?"active":"inactive")};switch(this.state){case"submit":return`${r}${e.gray(o)}  ${this.options.filter(({value:s})=>this.value.includes(s)).map(s=>n(s,"submitted")).join(e.dim(", "))||e.dim("none")}`;case"cancel":{const s=this.options.filter(({value:c})=>this.value.includes(c)).map(c=>n(c,"cancelled")).join(e.dim(", "));return`${r}${e.gray(o)}  ${s.trim()?`${s}
${e.gray(o)}`:""}`}case"error":{const s=this.error.split(`
`).map((c,a)=>a===0?`${e.yellow(d)}  ${e.yellow(c)}`:`   ${c}`).join(`
`);return`${r+e.yellow(o)}  ${G({options:this.options,cursor:this.cursor,maxItems:t.maxItems,style:i}).join(`
${e.yellow(o)}  `)}
${s}
`}default:return`${r}${e.cyan(o)}  ${G({options:this.options,cursor:this.cursor,maxItems:t.maxItems,style:i}).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`}}}).prompt()},be=t=>{const{selectableGroups:n=!0}=t,r=(i,s,c=[])=>{const a=i.label??String(i.value),l=typeof i.group=="string",$=l&&(c[c.indexOf(i)+1]??{group:!0}),g=l&&$.group===!0,p=l?n?`${g?d:o} `:"  ":"";if(s==="active")return`${e.dim(p)}${e.cyan(A)} ${a} ${i.hint?e.dim(`(${i.hint})`):""}`;if(s==="group-active")return`${p}${e.cyan(A)} ${e.dim(a)}`;if(s==="group-active-selected")return`${p}${e.green(T)} ${e.dim(a)}`;if(s==="selected"){const f=l||n?e.green(T):"";return`${e.dim(p)}${f} ${e.dim(a)} ${i.hint?e.dim(`(${i.hint})`):""}`}if(s==="cancelled")return`${e.strikethrough(e.dim(a))}`;if(s==="active-selected")return`${e.dim(p)}${e.green(T)} ${a} ${i.hint?e.dim(`(${i.hint})`):""}`;if(s==="submitted")return`${e.dim(a)}`;const v=l||n?e.dim(F):"";return`${e.dim(p)}${v} ${e.dim(a)}`};return new se({options:t.options,initialValues:t.initialValues,required:t.required??!0,cursorAt:t.cursorAt,selectableGroups:n,validate(i){if(this.required&&i.length===0)return`Please select at least one option.
${e.reset(e.dim(`Press ${e.gray(e.bgWhite(e.inverse(" space ")))} to select, ${e.gray(e.bgWhite(e.inverse(" enter ")))} to submit`))}`},render(){const i=`${e.gray(o)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${i}${e.gray(o)}  ${this.options.filter(({value:s})=>this.value.includes(s)).map(s=>r(s,"submitted")).join(e.dim(", "))}`;case"cancel":{const s=this.options.filter(({value:c})=>this.value.includes(c)).map(c=>r(c,"cancelled")).join(e.dim(", "));return`${i}${e.gray(o)}  ${s.trim()?`${s}
${e.gray(o)}`:""}`}case"error":{const s=this.error.split(`
`).map((c,a)=>a===0?`${e.yellow(d)}  ${e.yellow(c)}`:`   ${c}`).join(`
`);return`${i}${e.yellow(o)}  ${this.options.map((c,a,l)=>{const $=this.value.includes(c.value)||c.group===!0&&this.isGroupSelected(`${c.value}`),g=a===this.cursor;return!g&&typeof c.group=="string"&&this.options[this.cursor].value===c.group?r(c,$?"group-active-selected":"group-active",l):g&&$?r(c,"active-selected",l):$?r(c,"selected",l):r(c,g?"active":"inactive",l)}).join(`
${e.yellow(o)}  `)}
${s}
`}default:return`${i}${e.cyan(o)}  ${this.options.map((s,c,a)=>{const l=this.value.includes(s.value)||s.group===!0&&this.isGroupSelected(`${s.value}`),$=c===this.cursor;return!$&&typeof s.group=="string"&&this.options[this.cursor].value===s.group?r(s,l?"group-active-selected":"group-active",a):$&&l?r(s,"active-selected",a):l?r(s,"selected",a):r(s,$?"active":"inactive",a)}).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`}}}).prompt()},Me=(t="",n="")=>{const r=`
${t}
`.split(`
`),i=S(n).length,s=Math.max(r.reduce((a,l)=>{const $=S(l);return $.length>a?$.length:a},0),i)+2,c=r.map(a=>`${e.gray(o)}  ${e.dim(a)}${" ".repeat(s-S(a).length)}${e.gray(o)}`).join(`
`);process.stdout.write(`${e.gray(o)}
${e.green(C)}  ${e.reset(n)} ${e.gray(_.repeat(Math.max(s-i-1,1))+me)}
${c}
${e.gray(de+_.repeat(s+2)+pe)}
`)},xe=(t="")=>{process.stdout.write(`${e.gray(d)}  ${e.red(t)}

`)},Ie=(t="")=>{process.stdout.write(`${e.gray(ue)}  ${t}
`)},Se=(t="")=>{process.stdout.write(`${e.gray(o)}
${e.gray(d)}  ${t}

`)},M={message:(t="",{symbol:n=e.gray(o)}={})=>{const r=[`${e.gray(o)}`];if(t){const[i,...s]=t.split(`
`);r.push(`${n}  ${i}`,...s.map(c=>`${e.gray(o)}  ${c}`))}process.stdout.write(`${r.join(`
`)}
`)},info:t=>{M.message(t,{symbol:e.blue(q)})},success:t=>{M.message(t,{symbol:e.green(D)})},step:t=>{M.message(t,{symbol:e.green(C)})},warn:t=>{M.message(t,{symbol:e.yellow(U)})},warning:t=>{M.warn(t)},error:t=>{M.message(t,{symbol:e.red(K)})}},J=`${e.gray(o)}  `,x={message:async(t,{symbol:n=e.gray(o)}={})=>{process.stdout.write(`${e.gray(o)}
${n}  `);let r=3;for await(let i of t){i=i.replace(/\n/g,`
${J}`),i.includes(`
`)&&(r=3+S(i.slice(i.lastIndexOf(`
`))).length);const s=S(i).length;r+s<process.stdout.columns?(r+=s,process.stdout.write(i)):(process.stdout.write(`
${J}${i.trimStart()}`),r=3+S(i.trimStart()).length)}process.stdout.write(`
`)},info:t=>x.message(t,{symbol:e.blue(q)}),success:t=>x.message(t,{symbol:e.green(D)}),step:t=>x.message(t,{symbol:e.green(C)}),warn:t=>x.message(t,{symbol:e.yellow(U)}),warning:t=>x.warn(t),error:t=>x.message(t,{symbol:e.red(K)})},Y=({indicator:t="dots"}={})=>{const n=V?["\u25D2","\u25D0","\u25D3","\u25D1"]:["\u2022","o","O","0"],r=V?80:120,i=process.env.CI==="true";let s,c,a=!1,l="",$,g=performance.now();const p=m=>{const h=m>1?"Something went wrong":"Canceled";a&&N(h,m)},v=()=>p(2),f=()=>p(1),j=()=>{process.on("uncaughtExceptionMonitor",v),process.on("unhandledRejection",v),process.on("SIGINT",f),process.on("SIGTERM",f),process.on("exit",p)},E=()=>{process.removeListener("uncaughtExceptionMonitor",v),process.removeListener("unhandledRejection",v),process.removeListener("SIGINT",f),process.removeListener("SIGTERM",f),process.removeListener("exit",p)},B=()=>{if($===void 0)return;i&&process.stdout.write(`
`);const m=$.split(`
`);process.stdout.write(oe.move(-999,m.length-1)),process.stdout.write(ae.down(m.length))},R=m=>m.replace(/\.+$/,""),O=m=>{const h=(performance.now()-m)/1e3,w=Math.floor(h/60),I=Math.floor(h%60);return w>0?`[${w}m ${I}s]`:`[${I}s]`},H=(m="")=>{a=!0,s=ne(),l=R(m),g=performance.now(),process.stdout.write(`${e.gray(o)}
`);let h=0,w=0;j(),c=setInterval(()=>{if(i&&l===$)return;B(),$=l;const I=e.magenta(n[h]);if(i)process.stdout.write(`${I}  ${l}...`);else if(t==="timer")process.stdout.write(`${I}  ${l} ${O(g)}`);else{const z=".".repeat(Math.floor(w)).slice(0,3);process.stdout.write(`${I}  ${l}${z}`)}h=h+1<n.length?h+1:0,w=w<n.length?w+.125:0},r)},N=(m="",h=0)=>{a=!1,clearInterval(c),B();const w=h===0?e.green(C):h===1?e.red(L):e.red(W);l=R(m??l),t==="timer"?process.stdout.write(`${w}  ${l} ${O(g)}
`):process.stdout.write(`${w}  ${l}
`),E(),s()};return{start:H,stop:N,message:(m="")=>{l=R(m??l)}}},Ce=async(t,n)=>{const r={},i=Object.keys(t);for(const s of i){const c=t[s],a=await c({results:r})?.catch(l=>{throw l});if(typeof n?.onCancel=="function"&&ie(a)){r[s]="canceled",n.onCancel({results:r});continue}r[s]=a}return r},Te=async t=>{for(const n of t){if(n.enabled===!1)continue;const r=Y();r.start(n.title);const i=await n.task(r.message);r.stop(i||n.title)}};export{xe as cancel,ye as confirm,Ce as group,be as groupMultiselect,Ie as intro,M as log,fe as multiselect,Me as note,Se as outro,ge as password,ve as select,we as selectKey,Y as spinner,x as stream,Te as tasks,he as text};
//# sourceMappingURL=index.mjs.map
