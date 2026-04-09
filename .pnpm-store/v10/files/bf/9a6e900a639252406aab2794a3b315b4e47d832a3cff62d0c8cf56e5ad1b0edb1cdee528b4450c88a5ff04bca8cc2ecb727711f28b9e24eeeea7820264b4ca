/*!
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
*/
function e(e,t){let n=e.slice(0,t).split(/\r\n|\n|\r/g);return[n.length,n.pop().length+1]}function t(e,t,n){let r=e.split(/\r\n|\n|\r/g),i=``,a=(Math.log10(t+1)|0)+1;for(let e=t-1;e<=t+1;e++){let o=r[e-1];o&&(i+=e.toString().padEnd(a,` `),i+=`:  `,i+=o,i+=`
`,e===t&&(i+=` `.repeat(a+n+2),i+=`^
`))}return i}var n=class extends Error{line;column;codeblock;constructor(n,r){let[i,a]=e(r.toml,r.ptr),o=t(r.toml,i,a);super(`Invalid TOML document: ${n}\n\n${o}`,r),this.line=i,this.column=a,this.codeblock=o}};
/*!
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
*/
function r(e,t){let n=0;for(;e[t-++n]===`\\`;);return--n&&n%2}function i(e,t=0,n=e.length){let r=e.indexOf(`
`,t);return e[r-1]===`\r`&&r--,r<=n?r:-1}function a(e,t){for(let r=t;r<e.length;r++){let i=e[r];if(i===`
`)return r;if(i===`\r`&&e[r+1]===`
`)return r+1;if(i<` `&&i!==`	`||i===``)throw new n(`control characters are not allowed in comments`,{toml:e,ptr:t})}return e.length}function o(e,t,n,r){let i;for(;(i=e[t])===` `||i===`	`||!n&&(i===`
`||i===`\r`&&e[t+1]===`
`);)t++;return r||i!==`#`?t:o(e,a(e,t),n)}function s(e,t,r,a,o=!1){if(!a)return t=i(e,t),t<0?e.length:t;for(let n=t;n<e.length;n++){let t=e[n];if(t===`#`)n=i(e,n);else if(t===r)return n+1;else if(t===a||o&&(t===`
`||t===`\r`&&e[n+1]===`
`))return n}throw new n(`cannot find end of structure`,{toml:e,ptr:t})}function c(e,t){let n=e[t],i=n===e[t+1]&&e[t+1]===e[t+2]?e.slice(t,t+3):n;t+=i.length-1;do t=e.indexOf(i,++t);while(t>-1&&n!==`'`&&r(e,t));return t>-1&&(t+=i.length,i.length>1&&(e[t]===n&&t++,e[t]===n&&t++)),t}
/*!
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
*/
let l=/^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;var u=class e extends Date{#e=!1;#t=!1;#n=null;constructor(e){let t=!0,n=!0,r=`Z`;if(typeof e==`string`){let i=e.match(l);i?(i[1]||(t=!1,e=`0000-01-01T${e}`),n=!!i[2],n&&e[10]===` `&&(e=e.replace(` `,`T`)),i[2]&&+i[2]>23?e=``:(r=i[3]||null,e=e.toUpperCase(),!r&&n&&(e+=`Z`))):e=``}super(e),isNaN(this.getTime())||(this.#e=t,this.#t=n,this.#n=r)}isDateTime(){return this.#e&&this.#t}isLocal(){return!this.#e||!this.#t||!this.#n}isDate(){return this.#e&&!this.#t}isTime(){return this.#t&&!this.#e}isValid(){return this.#e||this.#t}toISOString(){let e=super.toISOString();if(this.isDate())return e.slice(0,10);if(this.isTime())return e.slice(11,23);if(this.#n===null)return e.slice(0,-1);if(this.#n===`Z`)return e;let t=this.#n.slice(1,3)*60+ +this.#n.slice(4,6);return t=this.#n[0]===`-`?t:-t,new Date(this.getTime()-t*6e4).toISOString().slice(0,-1)+this.#n}static wrapAsOffsetDateTime(t,n=`Z`){let r=new e(t);return r.#n=n,r}static wrapAsLocalDateTime(t){let n=new e(t);return n.#n=null,n}static wrapAsLocalDate(t){let n=new e(t);return n.#t=!1,n.#n=null,n}static wrapAsLocalTime(t){let n=new e(t);return n.#e=!1,n.#n=null,n}};
/*!
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
*/
let d=/^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/,f=/^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/,p=/^[+-]?0[0-9_]/,m=/^[0-9a-f]{2,8}$/i,h={b:`\b`,t:`	`,n:`
`,f:`\f`,r:`\r`,e:`\x1B`,'"':`"`,"\\":`\\`};function g(e,t=0,r=e.length){let i=e[t]===`'`,a=e[t++]===e[t]&&e[t]===e[t+1];a&&(r-=2,e[t+=2]===`\r`&&t++,e[t]===`
`&&t++);let s=0,c,l=``,u=t;for(;t<r-1;){let r=e[t++];if(r===`
`||r===`\r`&&e[t]===`
`){if(!a)throw new n(`newlines are not allowed in strings`,{toml:e,ptr:t-1})}else if(r<` `&&r!==`	`||r===``)throw new n(`control characters are not allowed in strings`,{toml:e,ptr:t-1});if(c){if(c=!1,r===`x`||r===`u`||r===`U`){let i=e.slice(t,t+=r===`x`?2:r===`u`?4:8);if(!m.test(i))throw new n(`invalid unicode escape`,{toml:e,ptr:s});try{l+=String.fromCodePoint(parseInt(i,16))}catch{throw new n(`invalid unicode escape`,{toml:e,ptr:s})}}else if(a&&(r===`
`||r===` `||r===`	`||r===`\r`)){if(t=o(e,t-1,!0),e[t]!==`
`&&e[t]!==`\r`)throw new n(`invalid escape: only line-ending whitespace may be escaped`,{toml:e,ptr:s});t=o(e,t)}else if(r in h)l+=h[r];else throw new n(`unrecognized escape sequence`,{toml:e,ptr:s});u=t}else !i&&r===`\\`&&(s=t-1,c=!0,l+=e.slice(u,s))}return l+e.slice(u,r-1)}function _(e,t,r,i){if(e===`true`)return!0;if(e===`false`)return!1;if(e===`-inf`)return-1/0;if(e===`inf`||e===`+inf`)return 1/0;if(e===`nan`||e===`+nan`||e===`-nan`)return NaN;if(e===`-0`)return i?0n:0;let a=d.test(e);if(a||f.test(e)){if(p.test(e))throw new n(`leading zeroes are not allowed`,{toml:t,ptr:r});e=e.replace(/_/g,``);let o=+e;if(isNaN(o))throw new n(`invalid number`,{toml:t,ptr:r});if(a){if((a=!Number.isSafeInteger(o))&&!i)throw new n(`integer value cannot be represented losslessly`,{toml:t,ptr:r});(a||i===!0)&&(o=BigInt(e))}return o}let o=new u(e);if(!o.isValid())throw new n(`invalid value`,{toml:t,ptr:r});return o}
/*!
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
*/
function v(e,t,n){let r=e.slice(t,n),i=r.indexOf(`#`);return i>-1&&(a(e,i),r=r.slice(0,i)),[r.trimEnd(),i]}function y(e,t,r,i,a){if(i===0)throw new n(`document contains excessively nested structures. aborting.`,{toml:e,ptr:t});let l=e[t];if(l===`[`||l===`{`){let[s,c]=l===`[`?C(e,t,i,a):S(e,t,i,a);if(r){if(c=o(e,c),e[c]===`,`)c++;else if(e[c]!==r)throw new n(`expected comma or end of structure`,{toml:e,ptr:c})}return[s,c]}let u;if(l===`"`||l===`'`){u=c(e,t);let i=g(e,t,u);if(r){if(u=o(e,u),e[u]&&e[u]!==`,`&&e[u]!==r&&e[u]!==`
`&&e[u]!==`\r`)throw new n(`unexpected character encountered`,{toml:e,ptr:u});u+=+(e[u]===`,`)}return[i,u]}u=s(e,t,`,`,r);let d=v(e,t,u-+(e[u-1]===`,`));if(!d[0])throw new n(`incomplete key-value declaration: no value specified`,{toml:e,ptr:t});return r&&d[1]>-1&&(u=o(e,t+d[1]),u+=+(e[u]===`,`)),[_(d[0],e,t,a),u]}
/*!
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
*/
let b=/^[a-zA-Z0-9-_]+[ \t]*$/;function x(e,t,r=`=`){let a=t-1,s=[],l=e.indexOf(r,t);if(l<0)throw new n(`incomplete key-value: cannot find end of key`,{toml:e,ptr:t});do{let o=e[t=++a];if(o!==` `&&o!==`	`)if(o===`"`||o===`'`){if(o===e[t+1]&&o===e[t+2])throw new n(`multiline strings are not allowed in keys`,{toml:e,ptr:t});let u=c(e,t);if(u<0)throw new n(`unfinished string encountered`,{toml:e,ptr:t});a=e.indexOf(`.`,u);let d=e.slice(u,a<0||a>l?l:a),f=i(d);if(f>-1)throw new n(`newlines are not allowed in keys`,{toml:e,ptr:t+a+f});if(d.trimStart())throw new n(`found extra tokens after the string part`,{toml:e,ptr:u});if(l<u&&(l=e.indexOf(r,u),l<0))throw new n(`incomplete key-value: cannot find end of key`,{toml:e,ptr:t});s.push(g(e,t,u))}else{a=e.indexOf(`.`,t);let r=e.slice(t,a<0||a>l?l:a);if(!b.test(r))throw new n(`only letter, numbers, dashes and underscores are allowed in keys`,{toml:e,ptr:t});s.push(r.trimEnd())}}while(a+1&&a<l);return[s,o(e,l+1,!0,!0)]}function S(e,t,r,i){let o={},s=new Set,c;for(t++;(c=e[t++])!==`}`&&c;)if(c===`,`)throw new n(`expected value, found comma`,{toml:e,ptr:t-1});else if(c===`#`)t=a(e,t);else if(c!==` `&&c!==`	`&&c!==`
`&&c!==`\r`){let a,c=o,l=!1,[u,d]=x(e,t-1);for(let r=0;r<u.length;r++){if(r&&(c=l?c[a]:c[a]={}),a=u[r],(l=Object.hasOwn(c,a))&&(typeof c[a]!=`object`||s.has(c[a])))throw new n(`trying to redefine an already defined value`,{toml:e,ptr:t});!l&&a===`__proto__`&&Object.defineProperty(c,a,{enumerable:!0,configurable:!0,writable:!0})}if(l)throw new n(`trying to redefine an already defined value`,{toml:e,ptr:t});let[f,p]=y(e,d,`}`,r-1,i);s.add(f),c[a]=f,t=p}if(!c)throw new n(`unfinished table encountered`,{toml:e,ptr:t});return[o,t]}function C(e,t,r,i){let o=[],s;for(t++;(s=e[t++])!==`]`&&s;)if(s===`,`)throw new n(`expected value, found comma`,{toml:e,ptr:t-1});else if(s===`#`)t=a(e,t);else if(s!==` `&&s!==`	`&&s!==`
`&&s!==`\r`){let n=y(e,t-1,`]`,r-1,i);o.push(n[0]),t=n[1]}if(!s)throw new n(`unfinished array encountered`,{toml:e,ptr:t});return[o,t]}
/*!
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
*/
function w(e,t,n,r){let i=t,a=n,o,s=!1,c;for(let t=0;t<e.length;t++){if(t){if(i=s?i[o]:i[o]={},a=(c=a[o]).c,r===0&&(c.t===1||c.t===2))return null;if(c.t===2){let e=i.length-1;i=i[e],a=a[e].c}}if(o=e[t],(s=Object.hasOwn(i,o))&&a[o]?.t===0&&a[o]?.d)return null;s||(o===`__proto__`&&(Object.defineProperty(i,o,{enumerable:!0,configurable:!0,writable:!0}),Object.defineProperty(a,o,{enumerable:!0,configurable:!0,writable:!0})),a[o]={t:t<e.length-1&&r===2?3:r,d:!1,i:0,c:{}})}if(c=a[o],c.t!==r&&!(r===1&&c.t===3)||(r===2&&(c.d||(c.d=!0,i[o]=[]),i[o].push(i={}),c.c[c.i++]=c={t:1,d:!1,i:0,c:{}}),c.d))return null;if(c.d=!0,r===1)i=s?i[o]:i[o]={};else if(r===0&&s)return null;return[o,i,c.c]}function T(e,{maxDepth:t=1e3,integersAsBigInt:r}={}){let i={},a={},s=i,c=a;for(let l=o(e,0);l<e.length;){if(e[l]===`[`){let t=e[++l]===`[`,r=x(e,l+=+t,`]`);if(t){if(e[r[1]-1]!==`]`)throw new n(`expected end of table declaration`,{toml:e,ptr:r[1]-1});r[1]++}let o=w(r[0],i,a,t?2:1);if(!o)throw new n(`trying to redefine an already defined table or value`,{toml:e,ptr:l});c=o[2],s=o[1],l=r[1]}else{let i=x(e,l),a=w(i[0],s,c,0);if(!a)throw new n(`trying to redefine an already defined table or value`,{toml:e,ptr:l});let o=y(e,i[1],void 0,t,r);a[1][a[0]]=o[0],l=o[1]}if(l=o(e,l,!0),e[l]&&e[l]!==`
`&&e[l]!==`\r`)throw new n(`each key-value declaration must be followed by an end-of-line`,{toml:e,ptr:l});l=o(e,l)}return i}
/*!
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
*/
let E=/^[a-z0-9-_]+$/i;function D(e){let t=typeof e;if(t===`object`){if(Array.isArray(e))return`array`;if(e instanceof Date)return`date`}return t}function O(e){for(let t=0;t<e.length;t++)if(D(e[t])!==`object`)return!1;return e.length!=0}function k(e){return JSON.stringify(e).replace(/\x7f/g,`\\u007f`)}function A(e,t,n,r){if(n===0)throw Error(`Could not stringify the object: maximum object depth exceeded`);if(t===`number`)return isNaN(e)?`nan`:e===1/0?`inf`:e===-1/0?`-inf`:r&&Number.isInteger(e)?e.toFixed(1):e.toString();if(t===`bigint`||t===`boolean`)return e.toString();if(t===`string`)return k(e);if(t===`date`){if(isNaN(e.getTime()))throw TypeError(`cannot serialize invalid date`);return e.toISOString()}if(t===`object`)return j(e,n,r);if(t===`array`)return M(e,n,r)}function j(e,t,n){let r=Object.keys(e);if(r.length===0)return`{}`;let i=`{ `;for(let a=0;a<r.length;a++){let o=r[a];a&&(i+=`, `),i+=E.test(o)?o:k(o),i+=` = `,i+=A(e[o],D(e[o]),t-1,n)}return i+` }`}function M(e,t,n){if(e.length===0)return`[]`;let r=`[ `;for(let i=0;i<e.length;i++){if(i&&(r+=`, `),e[i]===null||e[i]===void 0)throw TypeError(`arrays cannot contain null or undefined values`);r+=A(e[i],D(e[i]),t-1,n)}return r+` ]`}function N(e,t,n,r){if(n===0)throw Error(`Could not stringify the object: maximum object depth exceeded`);let i=``;for(let a=0;a<e.length;a++)i+=`${i&&`
`}[[${t}]]\n`,i+=P(0,e[a],t,n,r);return i}function P(e,t,n,r,i){if(r===0)throw Error(`Could not stringify the object: maximum object depth exceeded`);let a=``,o=``,s=Object.keys(t);for(let e=0;e<s.length;e++){let c=s[e];if(t[c]!==null&&t[c]!==void 0){let e=D(t[c]);if(e===`symbol`||e===`function`)throw TypeError(`cannot serialize values of type '${e}'`);let s=E.test(c)?c:k(c);if(e===`array`&&O(t[c]))o+=(o&&`
`)+N(t[c],n?`${n}.${s}`:s,r-1,i);else if(e===`object`){let e=n?`${n}.${s}`:s;o+=(o&&`
`)+P(e,t[c],e,r-1,i)}else a+=s,a+=` = `,a+=A(t[c],e,r,i),a+=`
`}}return e&&(a||!o)&&(a=a?`[${e}]\n${a}`:`[${e}]`),a&&o?`${a}\n${o}`:a||o}function F(e,{maxDepth:t=1e3,numbersAsFloat:n=!1}={}){if(D(e)!==`object`)throw TypeError(`stringify can only be called with an object`);let r=P(0,e,``,t,n);return r[r.length-1]===`
`?r:r+`
`}export{T as n,F as t};