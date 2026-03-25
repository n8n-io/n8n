"use strict";const node_util=require("node:util"),core=require("@clack/core"),process$1=require("node:process"),e=require("picocolors"),sisteransi=require("sisteransi");function _interopDefaultCompat(t){return t&&typeof t=="object"&&"default"in t?t.default:t}const process__default=_interopDefaultCompat(process$1),e__default=_interopDefaultCompat(e);function isUnicodeSupported(){return process__default.platform!=="win32"?process__default.env.TERM!=="linux":!!process__default.env.CI||!!process__default.env.WT_SESSION||!!process__default.env.TERMINUS_SUBLIME||process__default.env.ConEmuTask==="{cmd::Cmder}"||process__default.env.TERM_PROGRAM==="Terminus-Sublime"||process__default.env.TERM_PROGRAM==="vscode"||process__default.env.TERM==="xterm-256color"||process__default.env.TERM==="alacritty"||process__default.env.TERMINAL_EMULATOR==="JetBrains-JediTerm"}const P=isUnicodeSupported(),u=(t,o)=>P?t:o,ie=u("\u25C6","*"),G=u("\u25A0","x"),L=u("\u25B2","x"),S=u("\u25C7","o"),ae=u("\u250C","T"),a=u("\u2502","|"),g=u("\u2514","\u2014"),_=u("\u25CF",">"),A=u("\u25CB"," "),C=u("\u25FB","[\u2022]"),V=u("\u25FC","[+]"),N=u("\u25FB","[ ]"),oe=u("\u25AA","\u2022"),j=u("\u2500","-"),le=u("\u256E","+"),ce=u("\u251C","+"),ue=u("\u256F","+"),B=u("\u25CF","\u2022"),W=u("\u25C6","*"),H=u("\u25B2","!"),q=u("\u25A0","x"),b=t=>{switch(t){case"initial":case"active":return e__default.cyan(ie);case"cancel":return e__default.red(G);case"error":return e__default.yellow(L);case"submit":return e__default.green(S)}},E=t=>{const{cursor:o,options:s,style:i}=t,r=t.maxItems??Number.POSITIVE_INFINITY,c=Math.max(process.stdout.rows-4,0),n=Math.min(c,Math.max(r,5));let l=0;o>=l+n-3?l=Math.max(Math.min(o-n+3,s.length-n),0):o<l+2&&(l=Math.max(o-2,0));const $=n<s.length&&l>0,h=n<s.length&&l+n<s.length;return s.slice(l,l+n).map((m,y,w)=>{const x=y===0&&$,M=y===w.length-1&&h;return x||M?e__default.dim("..."):i(m,y+l===o)})},text=t=>new core.TextPrompt({validate:t.validate,placeholder:t.placeholder,defaultValue:t.defaultValue,initialValue:t.initialValue,render(){const o=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`,s=t.placeholder?e__default.inverse(t.placeholder[0])+e__default.dim(t.placeholder.slice(1)):e__default.inverse(e__default.hidden("_")),i=this.value?this.valueWithCursor:s;switch(this.state){case"error":return`${o.trim()}
${e__default.yellow(a)}  ${i}
${e__default.yellow(g)}  ${e__default.yellow(this.error)}
`;case"submit":return`${o}${e__default.gray(a)}  ${e__default.dim(this.value||t.placeholder)}`;case"cancel":return`${o}${e__default.gray(a)}  ${e__default.strikethrough(e__default.dim(this.value??""))}${this.value?.trim()?`
${e__default.gray(a)}`:""}`;default:return`${o}${e__default.cyan(a)}  ${i}
${e__default.cyan(g)}
`}}}).prompt(),password=t=>new core.PasswordPrompt({validate:t.validate,mask:t.mask??oe,render(){const o=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`,s=this.valueWithCursor,i=this.masked;switch(this.state){case"error":return`${o.trim()}
${e__default.yellow(a)}  ${i}
${e__default.yellow(g)}  ${e__default.yellow(this.error)}
`;case"submit":return`${o}${e__default.gray(a)}  ${e__default.dim(i)}`;case"cancel":return`${o}${e__default.gray(a)}  ${e__default.strikethrough(e__default.dim(i??""))}${i?`
${e__default.gray(a)}`:""}`;default:return`${o}${e__default.cyan(a)}  ${s}
${e__default.cyan(g)}
`}}}).prompt(),confirm=t=>{const o=t.active??"Yes",s=t.inactive??"No";return new core.ConfirmPrompt({active:o,inactive:s,initialValue:t.initialValue??!0,render(){const i=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`,r=this.value?o:s;switch(this.state){case"submit":return`${i}${e__default.gray(a)}  ${e__default.dim(r)}`;case"cancel":return`${i}${e__default.gray(a)}  ${e__default.strikethrough(e__default.dim(r))}
${e__default.gray(a)}`;default:return`${i}${e__default.cyan(a)}  ${this.value?`${e__default.green(_)} ${o}`:`${e__default.dim(A)} ${e__default.dim(o)}`} ${e__default.dim("/")} ${this.value?`${e__default.dim(A)} ${e__default.dim(s)}`:`${e__default.green(_)} ${s}`}
${e__default.cyan(g)}
`}}}).prompt()},select=t=>{const o=(s,i)=>{const r=s.label??String(s.value);switch(i){case"selected":return`${e__default.dim(r)}`;case"active":return`${e__default.green(_)} ${r} ${s.hint?e__default.dim(`(${s.hint})`):""}`;case"cancelled":return`${e__default.strikethrough(e__default.dim(r))}`;default:return`${e__default.dim(A)} ${e__default.dim(r)}`}};return new core.SelectPrompt({options:t.options,initialValue:t.initialValue,render(){const s=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${s}${e__default.gray(a)}  ${o(this.options[this.cursor],"selected")}`;case"cancel":return`${s}${e__default.gray(a)}  ${o(this.options[this.cursor],"cancelled")}
${e__default.gray(a)}`;default:return`${s}${e__default.cyan(a)}  ${E({cursor:this.cursor,options:this.options,maxItems:t.maxItems,style:(i,r)=>o(i,r?"active":"inactive")}).join(`
${e__default.cyan(a)}  `)}
${e__default.cyan(g)}
`}}}).prompt()},selectKey=t=>{const o=(s,i="inactive")=>{const r=s.label??String(s.value);return i==="selected"?`${e__default.dim(r)}`:i==="cancelled"?`${e__default.strikethrough(e__default.dim(r))}`:i==="active"?`${e__default.bgCyan(e__default.gray(` ${s.value} `))} ${r} ${s.hint?e__default.dim(`(${s.hint})`):""}`:`${e__default.gray(e__default.bgWhite(e__default.inverse(` ${s.value} `)))} ${r} ${s.hint?e__default.dim(`(${s.hint})`):""}`};return new core.SelectKeyPrompt({options:t.options,initialValue:t.initialValue,render(){const s=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${s}${e__default.gray(a)}  ${o(this.options.find(i=>i.value===this.value)??t.options[0],"selected")}`;case"cancel":return`${s}${e__default.gray(a)}  ${o(this.options[0],"cancelled")}
${e__default.gray(a)}`;default:return`${s}${e__default.cyan(a)}  ${this.options.map((i,r)=>o(i,r===this.cursor?"active":"inactive")).join(`
${e__default.cyan(a)}  `)}
${e__default.cyan(g)}
`}}}).prompt()},multiselect=t=>{const o=(s,i)=>{const r=s.label??String(s.value);return i==="active"?`${e__default.cyan(C)} ${r} ${s.hint?e__default.dim(`(${s.hint})`):""}`:i==="selected"?`${e__default.green(V)} ${e__default.dim(r)} ${s.hint?e__default.dim(`(${s.hint})`):""}`:i==="cancelled"?`${e__default.strikethrough(e__default.dim(r))}`:i==="active-selected"?`${e__default.green(V)} ${r} ${s.hint?e__default.dim(`(${s.hint})`):""}`:i==="submitted"?`${e__default.dim(r)}`:`${e__default.dim(N)} ${e__default.dim(r)}`};return new core.MultiSelectPrompt({options:t.options,initialValues:t.initialValues,required:t.required??!0,cursorAt:t.cursorAt,validate(s){if(this.required&&s.length===0)return`Please select at least one option.
${e__default.reset(e__default.dim(`Press ${e__default.gray(e__default.bgWhite(e__default.inverse(" space ")))} to select, ${e__default.gray(e__default.bgWhite(e__default.inverse(" enter ")))} to submit`))}`},render(){const s=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`,i=(r,c)=>{const n=this.value.includes(r.value);return c&&n?o(r,"active-selected"):n?o(r,"selected"):o(r,c?"active":"inactive")};switch(this.state){case"submit":return`${s}${e__default.gray(a)}  ${this.options.filter(({value:r})=>this.value.includes(r)).map(r=>o(r,"submitted")).join(e__default.dim(", "))||e__default.dim("none")}`;case"cancel":{const r=this.options.filter(({value:c})=>this.value.includes(c)).map(c=>o(c,"cancelled")).join(e__default.dim(", "));return`${s}${e__default.gray(a)}  ${r.trim()?`${r}
${e__default.gray(a)}`:""}`}case"error":{const r=this.error.split(`
`).map((c,n)=>n===0?`${e__default.yellow(g)}  ${e__default.yellow(c)}`:`   ${c}`).join(`
`);return`${s+e__default.yellow(a)}  ${E({options:this.options,cursor:this.cursor,maxItems:t.maxItems,style:i}).join(`
${e__default.yellow(a)}  `)}
${r}
`}default:return`${s}${e__default.cyan(a)}  ${E({options:this.options,cursor:this.cursor,maxItems:t.maxItems,style:i}).join(`
${e__default.cyan(a)}  `)}
${e__default.cyan(g)}
`}}}).prompt()},groupMultiselect=t=>{const{selectableGroups:o=!0}=t,s=(i,r,c=[])=>{const n=i.label??String(i.value),l=typeof i.group=="string",$=l&&(c[c.indexOf(i)+1]??{group:!0}),h=l&&$.group===!0,m=l?o?`${h?g:a} `:"  ":"";if(r==="active")return`${e__default.dim(m)}${e__default.cyan(C)} ${n} ${i.hint?e__default.dim(`(${i.hint})`):""}`;if(r==="group-active")return`${m}${e__default.cyan(C)} ${e__default.dim(n)}`;if(r==="group-active-selected")return`${m}${e__default.green(V)} ${e__default.dim(n)}`;if(r==="selected"){const w=l||o?e__default.green(V):"";return`${e__default.dim(m)}${w} ${e__default.dim(n)} ${i.hint?e__default.dim(`(${i.hint})`):""}`}if(r==="cancelled")return`${e__default.strikethrough(e__default.dim(n))}`;if(r==="active-selected")return`${e__default.dim(m)}${e__default.green(V)} ${n} ${i.hint?e__default.dim(`(${i.hint})`):""}`;if(r==="submitted")return`${e__default.dim(n)}`;const y=l||o?e__default.dim(N):"";return`${e__default.dim(m)}${y} ${e__default.dim(n)}`};return new core.GroupMultiSelectPrompt({options:t.options,initialValues:t.initialValues,required:t.required??!0,cursorAt:t.cursorAt,selectableGroups:o,validate(i){if(this.required&&i.length===0)return`Please select at least one option.
${e__default.reset(e__default.dim(`Press ${e__default.gray(e__default.bgWhite(e__default.inverse(" space ")))} to select, ${e__default.gray(e__default.bgWhite(e__default.inverse(" enter ")))} to submit`))}`},render(){const i=`${e__default.gray(a)}
${b(this.state)}  ${t.message}
`;switch(this.state){case"submit":return`${i}${e__default.gray(a)}  ${this.options.filter(({value:r})=>this.value.includes(r)).map(r=>s(r,"submitted")).join(e__default.dim(", "))}`;case"cancel":{const r=this.options.filter(({value:c})=>this.value.includes(c)).map(c=>s(c,"cancelled")).join(e__default.dim(", "));return`${i}${e__default.gray(a)}  ${r.trim()?`${r}
${e__default.gray(a)}`:""}`}case"error":{const r=this.error.split(`
`).map((c,n)=>n===0?`${e__default.yellow(g)}  ${e__default.yellow(c)}`:`   ${c}`).join(`
`);return`${i}${e__default.yellow(a)}  ${this.options.map((c,n,l)=>{const $=this.value.includes(c.value)||c.group===!0&&this.isGroupSelected(`${c.value}`),h=n===this.cursor;return!h&&typeof c.group=="string"&&this.options[this.cursor].value===c.group?s(c,$?"group-active-selected":"group-active",l):h&&$?s(c,"active-selected",l):$?s(c,"selected",l):s(c,h?"active":"inactive",l)}).join(`
${e__default.yellow(a)}  `)}
${r}
`}default:return`${i}${e__default.cyan(a)}  ${this.options.map((r,c,n)=>{const l=this.value.includes(r.value)||r.group===!0&&this.isGroupSelected(`${r.value}`),$=c===this.cursor;return!$&&typeof r.group=="string"&&this.options[this.cursor].value===r.group?s(r,l?"group-active-selected":"group-active",n):$&&l?s(r,"active-selected",n):l?s(r,"selected",n):s(r,$?"active":"inactive",n)}).join(`
${e__default.cyan(a)}  `)}
${e__default.cyan(g)}
`}}}).prompt()},note=(t="",o="")=>{const s=`
${t}
`.split(`
`),i=node_util.stripVTControlCharacters(o).length,r=Math.max(s.reduce((n,l)=>{const $=node_util.stripVTControlCharacters(l);return $.length>n?$.length:n},0),i)+2,c=s.map(n=>`${e__default.gray(a)}  ${e__default.dim(n)}${" ".repeat(r-node_util.stripVTControlCharacters(n).length)}${e__default.gray(a)}`).join(`
`);process.stdout.write(`${e__default.gray(a)}
${e__default.green(S)}  ${e__default.reset(o)} ${e__default.gray(j.repeat(Math.max(r-i-1,1))+le)}
${c}
${e__default.gray(ce+j.repeat(r+2)+ue)}
`)},cancel=(t="")=>{process.stdout.write(`${e__default.gray(g)}  ${e__default.red(t)}

`)},intro=(t="")=>{process.stdout.write(`${e__default.gray(ae)}  ${t}
`)},outro=(t="")=>{process.stdout.write(`${e__default.gray(a)}
${e__default.gray(g)}  ${t}

`)},log={message:(t="",{symbol:o=e__default.gray(a)}={})=>{const s=[`${e__default.gray(a)}`];if(t){const[i,...r]=t.split(`
`);s.push(`${o}  ${i}`,...r.map(c=>`${e__default.gray(a)}  ${c}`))}process.stdout.write(`${s.join(`
`)}
`)},info:t=>{log.message(t,{symbol:e__default.blue(B)})},success:t=>{log.message(t,{symbol:e__default.green(W)})},step:t=>{log.message(t,{symbol:e__default.green(S)})},warn:t=>{log.message(t,{symbol:e__default.yellow(H)})},warning:t=>{log.warn(t)},error:t=>{log.message(t,{symbol:e__default.red(q)})}},D=`${e__default.gray(a)}  `,stream={message:async(t,{symbol:o=e__default.gray(a)}={})=>{process.stdout.write(`${e__default.gray(a)}
${o}  `);let s=3;for await(let i of t){i=i.replace(/\n/g,`
${D}`),i.includes(`
`)&&(s=3+node_util.stripVTControlCharacters(i.slice(i.lastIndexOf(`
`))).length);const r=node_util.stripVTControlCharacters(i).length;s+r<process.stdout.columns?(s+=r,process.stdout.write(i)):(process.stdout.write(`
${D}${i.trimStart()}`),s=3+node_util.stripVTControlCharacters(i.trimStart()).length)}process.stdout.write(`
`)},info:t=>stream.message(t,{symbol:e__default.blue(B)}),success:t=>stream.message(t,{symbol:e__default.green(W)}),step:t=>stream.message(t,{symbol:e__default.green(S)}),warn:t=>stream.message(t,{symbol:e__default.yellow(H)}),warning:t=>stream.warn(t),error:t=>stream.message(t,{symbol:e__default.red(q)})},spinner=({indicator:t="dots"}={})=>{const o=P?["\u25D2","\u25D0","\u25D3","\u25D1"]:["\u2022","o","O","0"],s=P?80:120,i=process.env.CI==="true";let r,c,n=!1,l="",$,h=performance.now();const m=p=>{const d=p>1?"Something went wrong":"Canceled";n&&R(d,p)},y=()=>m(2),w=()=>m(1),x=()=>{process.on("uncaughtExceptionMonitor",y),process.on("unhandledRejection",y),process.on("SIGINT",w),process.on("SIGTERM",w),process.on("exit",m)},M=()=>{process.removeListener("uncaughtExceptionMonitor",y),process.removeListener("unhandledRejection",y),process.removeListener("SIGINT",w),process.removeListener("SIGTERM",w),process.removeListener("exit",m)},T=()=>{if($===void 0)return;i&&process.stdout.write(`
`);const p=$.split(`
`);process.stdout.write(sisteransi.cursor.move(-999,p.length-1)),process.stdout.write(sisteransi.erase.down(p.length))},I=p=>p.replace(/\.+$/,""),k=p=>{const d=(performance.now()-p)/1e3,v=Math.floor(d/60),f=Math.floor(d%60);return v>0?`[${v}m ${f}s]`:`[${f}s]`},O=(p="")=>{n=!0,r=core.block(),l=I(p),h=performance.now(),process.stdout.write(`${e__default.gray(a)}
`);let d=0,v=0;x(),c=setInterval(()=>{if(i&&l===$)return;T(),$=l;const f=e__default.magenta(o[d]);if(i)process.stdout.write(`${f}  ${l}...`);else if(t==="timer")process.stdout.write(`${f}  ${l} ${k(h)}`);else{const F=".".repeat(Math.floor(v)).slice(0,3);process.stdout.write(`${f}  ${l}${F}`)}d=d+1<o.length?d+1:0,v=v<o.length?v+.125:0},s)},R=(p="",d=0)=>{n=!1,clearInterval(c),T();const v=d===0?e__default.green(S):d===1?e__default.red(G):e__default.red(L);l=I(p??l),t==="timer"?process.stdout.write(`${v}  ${l} ${k(h)}
`):process.stdout.write(`${v}  ${l}
`),M(),r()};return{start:O,stop:R,message:(p="")=>{l=I(p??l)}}},group=async(t,o)=>{const s={},i=Object.keys(t);for(const r of i){const c=t[r],n=await c({results:s})?.catch(l=>{throw l});if(typeof o?.onCancel=="function"&&core.isCancel(n)){s[r]="canceled",o.onCancel({results:s});continue}s[r]=n}return s},tasks=async t=>{for(const o of t){if(o.enabled===!1)continue;const s=spinner();s.start(o.title);const i=await o.task(s.message);s.stop(i||o.title)}};exports.isCancel=core.isCancel,exports.updateSettings=core.updateSettings,exports.cancel=cancel,exports.confirm=confirm,exports.group=group,exports.groupMultiselect=groupMultiselect,exports.intro=intro,exports.log=log,exports.multiselect=multiselect,exports.note=note,exports.outro=outro,exports.password=password,exports.select=select,exports.selectKey=selectKey,exports.spinner=spinner,exports.stream=stream,exports.tasks=tasks,exports.text=text;
//# sourceMappingURL=index.cjs.map
