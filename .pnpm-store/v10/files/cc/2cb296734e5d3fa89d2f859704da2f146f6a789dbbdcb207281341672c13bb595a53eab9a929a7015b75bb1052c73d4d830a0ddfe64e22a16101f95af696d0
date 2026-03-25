var F=Object.defineProperty;var V=(e,n,t)=>n in e?F(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var O=(e,n,t)=>(V(e,typeof n!="symbol"?n+"":n,t),t),L=(e,n,t)=>{if(!n.has(e))throw TypeError("Cannot "+t)};var d=(e,n,t)=>(L(e,n,"read from private field"),t?t.call(e):n.get(e)),T=(e,n,t)=>{if(n.has(e))throw TypeError("Cannot add the same private member more than once");n instanceof WeakSet?n.add(e):n.set(e,t)},w=(e,n,t,i)=>(L(e,n,"write to private field"),i?i.call(e,t):n.set(e,t),t);var h,m,s;import{s as G,g as K}from"./shared/confbox.9388d834.mjs";/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */function U(e,n){let t=e.slice(0,n).split(/\r\n|\n|\r/g);return[t.length,t.pop().length+1]}function X(e,n,t){let i=e.split(/\r\n|\n|\r/g),l="",r=(Math.log10(n+1)|0)+1;for(let f=n-1;f<=n+1;f++){let o=i[f-1];o&&(l+=f.toString().padEnd(r," "),l+=":  ",l+=o,l+=`
`,f===n&&(l+=" ".repeat(r+t+2),l+=`^
`))}return l}class u extends Error{constructor(t,i){const[l,r]=U(i.toml,i.ptr),f=X(i.toml,l,r);super(`Invalid TOML document: ${t}

${f}`,i);O(this,"line");O(this,"column");O(this,"codeblock");this.line=l,this.column=r,this.codeblock=f}}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */function x(e,n=0,t=e.length){let i=e.indexOf(`
`,n);return e[i-1]==="\r"&&i--,i<=t?i:-1}function A(e,n){for(let t=n;t<e.length;t++){let i=e[t];if(i===`
`)return t;if(i==="\r"&&e[t+1]===`
`)return t+1;if(i<" "&&i!=="	"||i==="\x7F")throw new u("control characters are not allowed in comments",{toml:e,ptr:n})}return e.length}function g(e,n,t,i){let l;for(;(l=e[n])===" "||l==="	"||!t&&(l===`
`||l==="\r"&&e[n+1]===`
`);)n++;return i||l!=="#"?n:g(e,A(e,n),t)}function P(e,n,t,i,l=!1){if(!i)return n=x(e,n),n<0?e.length:n;for(let r=n;r<e.length;r++){let f=e[r];if(f==="#")r=x(e,r);else{if(f===t)return r+1;if(f===i)return r;if(l&&(f===`
`||f==="\r"&&e[r+1]===`
`))return r}}throw new u("cannot find end of structure",{toml:e,ptr:n})}function v(e,n){let t=e[n],i=t===e[n+1]&&e[n+1]===e[n+2]?e.slice(n,n+3):t;n+=i.length-1;do n=e.indexOf(i,++n);while(n>-1&&t!=="'"&&e[n-1]==="\\"&&e[n-2]!=="\\");return n>-1&&(n+=i.length,i.length>1&&(e[n]===t&&n++,e[n]===t&&n++)),n}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */let B=/^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}:\d{2}(?:\.\d+)?)?(Z|[-+]\d{2}:\d{2})?$/i;const b=class b extends Date{constructor(t){let i=!0,l=!0,r="Z";if(typeof t=="string"){let f=t.match(B);f?(f[1]||(i=!1,t=`0000-01-01T${t}`),l=!!f[2],f[2]&&+f[2]>23?t="":(r=f[3]||null,t=t.toUpperCase(),!r&&l&&(t+="Z"))):t=""}super(t);T(this,h,!1);T(this,m,!1);T(this,s,null);isNaN(this.getTime())||(w(this,h,i),w(this,m,l),w(this,s,r))}isDateTime(){return d(this,h)&&d(this,m)}isLocal(){return!d(this,h)||!d(this,m)||!d(this,s)}isDate(){return d(this,h)&&!d(this,m)}isTime(){return d(this,m)&&!d(this,h)}isValid(){return d(this,h)||d(this,m)}toISOString(){let t=super.toISOString();if(this.isDate())return t.slice(0,10);if(this.isTime())return t.slice(11,23);if(d(this,s)===null)return t.slice(0,-1);if(d(this,s)==="Z")return t;let i=+d(this,s).slice(1,3)*60+ +d(this,s).slice(4,6);return i=d(this,s)[0]==="-"?i:-i,new Date(this.getTime()-i*6e4).toISOString().slice(0,-1)+d(this,s)}static wrapAsOffsetDateTime(t,i="Z"){let l=new b(t);return w(l,s,i),l}static wrapAsLocalDateTime(t){let i=new b(t);return w(i,s,null),i}static wrapAsLocalDate(t){let i=new b(t);return w(i,m,!1),w(i,s,null),i}static wrapAsLocalTime(t){let i=new b(t);return w(i,h,!1),w(i,s,null),i}};h=new WeakMap,m=new WeakMap,s=new WeakMap;let S=b;/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */let Y=/^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/,j=/^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/,q=/^[+-]?0[0-9_]/,J=/^[0-9a-f]{4,8}$/i,R={b:"\b",t:"	",n:`
`,f:"\f",r:"\r",'"':'"',"\\":"\\"};function C(e,n=0,t=e.length){let i=e[n]==="'",l=e[n++]===e[n]&&e[n]===e[n+1];l&&(t-=2,e[n+=2]==="\r"&&n++,e[n]===`
`&&n++);let r=0,f,o="",a=n;for(;n<t-1;){let c=e[n++];if(c===`
`||c==="\r"&&e[n]===`
`){if(!l)throw new u("newlines are not allowed in strings",{toml:e,ptr:n-1})}else if(c<" "&&c!=="	"||c==="\x7F")throw new u("control characters are not allowed in strings",{toml:e,ptr:n-1});if(f){if(f=!1,c==="u"||c==="U"){let y=e.slice(n,n+=c==="u"?4:8);if(!J.test(y))throw new u("invalid unicode escape",{toml:e,ptr:r});try{o+=String.fromCodePoint(parseInt(y,16))}catch{throw new u("invalid unicode escape",{toml:e,ptr:r})}}else if(l&&(c===`
`||c===" "||c==="	"||c==="\r")){if(n=g(e,n-1,!0),e[n]!==`
`&&e[n]!=="\r")throw new u("invalid escape: only line-ending whitespace may be escaped",{toml:e,ptr:r});n=g(e,n)}else if(c in R)o+=R[c];else throw new u("unrecognized escape sequence",{toml:e,ptr:r});a=n}else!i&&c==="\\"&&(r=n-1,f=!0,o+=e.slice(a,r))}return o+e.slice(a,t-1)}function H(e,n,t){if(e==="true")return!0;if(e==="false")return!1;if(e==="-inf")return-1/0;if(e==="inf"||e==="+inf")return 1/0;if(e==="nan"||e==="+nan"||e==="-nan")return NaN;if(e==="-0")return 0;let i;if((i=Y.test(e))||j.test(e)){if(q.test(e))throw new u("leading zeroes are not allowed",{toml:n,ptr:t});let r=+e.replace(/_/g,"");if(isNaN(r))throw new u("invalid number",{toml:n,ptr:t});if(i&&!Number.isSafeInteger(r))throw new u("integer value cannot be represented losslessly",{toml:n,ptr:t});return r}let l=new S(e);if(!l.isValid())throw new u("invalid value",{toml:n,ptr:t});return l}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */function Q(e,n,t,i){let l=e.slice(n,t),r=l.indexOf("#");r>-1&&(A(e,r),l=l.slice(0,r));let f=l.trimEnd();if(!i){let o=l.indexOf(`
`,f.length);if(o>-1)throw new u("newlines are not allowed in inline tables",{toml:e,ptr:n+o})}return[f,r]}function I(e,n,t){let i=e[n];if(i==="["||i==="{"){let[f,o]=i==="["?ne(e,n):ee(e,n),a=P(e,o,",",t);if(t==="}"){let c=x(e,o,a);if(c>-1)throw new u("newlines are not allowed in inline tables",{toml:e,ptr:c})}return[f,a]}let l;if(i==='"'||i==="'"){l=v(e,n);let f=C(e,n,l);if(t){if(l=g(e,l,t!=="]"),e[l]&&e[l]!==","&&e[l]!==t&&e[l]!==`
`&&e[l]!=="\r")throw new u("unexpected character encountered",{toml:e,ptr:l});l+=+(e[l]===",")}return[f,l]}l=P(e,n,",",t);let r=Q(e,n,l-+(e[l-1]===","),t==="]");if(!r[0])throw new u("incomplete key-value declaration: no value specified",{toml:e,ptr:n});return t&&r[1]>-1&&(l=g(e,n+r[1]),l+=+(e[l]===",")),[H(r[0],e,n),l]}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */let W=/^[a-zA-Z0-9-_]+[ \t]*$/;function p(e,n,t="="){let i=n-1,l=[],r=e.indexOf(t,n);if(r<0)throw new u("incomplete key-value: cannot find end of key",{toml:e,ptr:n});do{let f=e[n=++i];if(f!==" "&&f!=="	")if(f==='"'||f==="'"){if(f===e[n+1]&&f===e[n+2])throw new u("multiline strings are not allowed in keys",{toml:e,ptr:n});let o=v(e,n);if(o<0)throw new u("unfinished string encountered",{toml:e,ptr:n});i=e.indexOf(".",o);let a=e.slice(o,i<0||i>r?r:i),c=x(a);if(c>-1)throw new u("newlines are not allowed in keys",{toml:e,ptr:n+i+c});if(a.trimStart())throw new u("found extra tokens after the string part",{toml:e,ptr:o});if(r<o&&(r=e.indexOf(t,o),r<0))throw new u("incomplete key-value: cannot find end of key",{toml:e,ptr:n});l.push(C(e,n,o))}else{i=e.indexOf(".",n);let o=e.slice(n,i<0||i>r?r:i);if(!W.test(o))throw new u("only letter, numbers, dashes and underscores are allowed in keys",{toml:e,ptr:n});l.push(o.trimEnd())}}while(i+1&&i<r);return[l,g(e,r+1,!0,!0)]}function ee(e,n){let t={},i=new Set,l,r=0;for(n++;(l=e[n++])!=="}"&&l;){if(l===`
`)throw new u("newlines are not allowed in inline tables",{toml:e,ptr:n-1});if(l==="#")throw new u("inline tables cannot contain comments",{toml:e,ptr:n-1});if(l===",")throw new u("expected key-value, found comma",{toml:e,ptr:n-1});if(l!==" "&&l!=="	"){let f,o=t,a=!1,[c,y]=p(e,n-1);for(let E=0;E<c.length;E++){if(E&&(o=a?o[f]:o[f]={}),f=c[E],(a=Object.hasOwn(o,f))&&(typeof o[f]!="object"||i.has(o[f])))throw new u("trying to redefine an already defined value",{toml:e,ptr:n});!a&&f==="__proto__"&&Object.defineProperty(o,f,{enumerable:!0,configurable:!0,writable:!0})}if(a)throw new u("trying to redefine an already defined value",{toml:e,ptr:n});let[k,z]=I(e,y,"}");i.add(k),o[f]=k,n=z,r=e[n-1]===","?n-1:0}}if(r)throw new u("trailing commas are not allowed in inline tables",{toml:e,ptr:r});if(!l)throw new u("unfinished table encountered",{toml:e,ptr:n});return[t,n]}function ne(e,n){let t=[],i;for(n++;(i=e[n++])!=="]"&&i;){if(i===",")throw new u("expected value, found comma",{toml:e,ptr:n-1});if(i==="#")n=A(e,n);else if(i!==" "&&i!=="	"&&i!==`
`&&i!=="\r"){let l=I(e,n-1,"]");t.push(l[0]),n=l[1]}}if(!i)throw new u("unfinished array encountered",{toml:e,ptr:n});return[t,n]}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */function M(e,n,t,i){let l=n,r=t,f,o=!1,a;for(let c=0;c<e.length;c++){if(c){if(l=o?l[f]:l[f]={},r=(a=r[f]).c,i===0&&(a.t===1||a.t===2))return null;if(a.t===2){let y=l.length-1;l=l[y],r=r[y].c}}if(f=e[c],(o=Object.hasOwn(l,f))&&r[f]?.t===0&&r[f]?.d)return null;o||(f==="__proto__"&&(Object.defineProperty(l,f,{enumerable:!0,configurable:!0,writable:!0}),Object.defineProperty(r,f,{enumerable:!0,configurable:!0,writable:!0})),r[f]={t:c<e.length-1&&i===2?3:i,d:!1,i:0,c:{}})}if(a=r[f],a.t!==i&&!(i===1&&a.t===3)||(i===2&&(a.d||(a.d=!0,l[f]=[]),l[f].push(l={}),a.c[a.i++]=a={t:1,d:!1,i:0,c:{}}),a.d))return null;if(a.d=!0,i===1)l=o?l[f]:l[f]={};else if(i===0&&o)return null;return[f,l,a.c]}function te(e){let n={},t={},i=n,l=t;for(let r=g(e,0);r<e.length;){if(e[r]==="["){let f=e[++r]==="[",o=p(e,r+=+f,"]");if(f){if(e[o[1]-1]!=="]")throw new u("expected end of table declaration",{toml:e,ptr:o[1]-1});o[1]++}let a=M(o[0],n,t,f?2:1);if(!a)throw new u("trying to redefine an already defined table or value",{toml:e,ptr:r});l=a[2],i=a[1],r=o[1]}else{let f=p(e,r),o=M(f[0],i,l,0);if(!o)throw new u("trying to redefine an already defined table or value",{toml:e,ptr:r});let a=I(e,f[1]);o[1][o[0]]=a[0],r=a[1]}if(r=g(e,r,!0),e[r]&&e[r]!==`
`&&e[r]!=="\r")throw new u("each key-value declaration must be followed by an end-of-line",{toml:e,ptr:r});r=g(e,r)}return n}/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */const Z=/^[a-z0-9-_]+$/i;function _(e){let n=typeof e;if(n==="object"){if(Array.isArray(e))return"array";if(e instanceof Date)return"date"}return n}function ie(e){for(let n=0;n<e.length;n++)if(_(e[n])!=="object")return!1;return e.length!=0}function $(e){return JSON.stringify(e).replace(/\x7f/g,"\\u007f")}function N(e,n=_(e)){if(n==="number")return isNaN(e)?"nan":e===1/0?"inf":e===-1/0?"-inf":e.toString();if(n==="bigint"||n==="boolean")return e.toString();if(n==="string")return $(e);if(n==="date"){if(isNaN(e.getTime()))throw new TypeError("cannot serialize invalid date");return e.toISOString()}if(n==="object")return le(e);if(n==="array")return re(e)}function le(e){let n=Object.keys(e);if(n.length===0)return"{}";let t="{ ";for(let i=0;i<n.length;i++){let l=n[i];i&&(t+=", "),t+=Z.test(l)?l:$(l),t+=" = ",t+=N(e[l])}return t+" }"}function re(e){if(e.length===0)return"[]";let n="[ ";for(let t=0;t<e.length;t++){if(t&&(n+=", "),e[t]===null||e[t]===void 0)throw new TypeError("arrays cannot contain null or undefined values");n+=N(e[t])}return n+" ]"}function fe(e,n){let t="";for(let i=0;i<e.length;i++)t+=`[[${n}]]
`,t+=D(e[i],n),t+=`

`;return t}function D(e,n=""){let t="",i="",l=Object.keys(e);for(let r=0;r<l.length;r++){let f=l[r];if(e[f]!==null&&e[f]!==void 0){let o=_(e[f]);if(o==="symbol"||o==="function")throw new TypeError(`cannot serialize values of type '${o}'`);let a=Z.test(f)?f:$(f);if(o==="array"&&ie(e[f]))i+=fe(e[f],n?`${n}.${a}`:a);else if(o==="object"){let c=n?`${n}.${a}`:a;i+=`[${c}]
`,i+=D(e[f],c),i+=`

`}else t+=a,t+=" = ",t+=N(e[f],o),t+=`
`}}return`${t}
${i}`.trim()}function oe(e){if(_(e)!=="object")throw new TypeError("stringify can only be called with an object");return D(e)}function ae(e){const n=te(e);return G(e,n,{preserveIndentation:!1}),n}function ue(e){const n=K(e,{preserveIndentation:!1}),t=oe(e);return n.whitespace.start+t+n.whitespace.end}export{ae as parseTOML,ue as stringifyTOML};
