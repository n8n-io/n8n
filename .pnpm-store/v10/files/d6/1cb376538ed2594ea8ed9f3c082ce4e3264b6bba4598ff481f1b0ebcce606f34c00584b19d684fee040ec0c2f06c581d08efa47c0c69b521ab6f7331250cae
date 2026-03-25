"use strict";var _=Object.defineProperty;var A=(e,n,t)=>n in e?_(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var b=(e,n,t)=>(A(e,typeof n!="symbol"?n+"":n,t),t),E=(e,n,t)=>{if(!n.has(e))throw TypeError("Cannot "+t)};var c=(e,n,t)=>(E(e,n,"read from private field"),t?t.call(e):n.get(e)),O=(e,n,t)=>{if(n.has(e))throw TypeError("Cannot add the same private member more than once");n instanceof WeakSet?n.add(e):n.set(e,t)},d=(e,n,t,i)=>(E(e,n,"write to private field"),i?i.call(e,t):n.set(e,t),t);var h,w,s;const _format=require("./shared/confbox.3768c7e9.cjs");/*!
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
 */function getLineColFromPtr(e,n){let t=e.slice(0,n).split(/\r\n|\n|\r/g);return[t.length,t.pop().length+1]}function makeCodeBlock(e,n,t){let i=e.split(/\r\n|\n|\r/g),l="",r=(Math.log10(n+1)|0)+1;for(let f=n-1;f<=n+1;f++){let o=i[f-1];o&&(l+=f.toString().padEnd(r," "),l+=":  ",l+=o,l+=`
`,f===n&&(l+=" ".repeat(r+t+2),l+=`^
`))}return l}class TomlError extends Error{constructor(t,i){const[l,r]=getLineColFromPtr(i.toml,i.ptr),f=makeCodeBlock(i.toml,l,r);super(`Invalid TOML document: ${t}

${f}`,i);b(this,"line");b(this,"column");b(this,"codeblock");this.line=l,this.column=r,this.codeblock=f}}/*!
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
 */function indexOfNewline(e,n=0,t=e.length){let i=e.indexOf(`
`,n);return e[i-1]==="\r"&&i--,i<=t?i:-1}function skipComment(e,n){for(let t=n;t<e.length;t++){let i=e[t];if(i===`
`)return t;if(i==="\r"&&e[t+1]===`
`)return t+1;if(i<" "&&i!=="	"||i==="\x7F")throw new TomlError("control characters are not allowed in comments",{toml:e,ptr:n})}return e.length}function skipVoid(e,n,t,i){let l;for(;(l=e[n])===" "||l==="	"||!t&&(l===`
`||l==="\r"&&e[n+1]===`
`);)n++;return i||l!=="#"?n:skipVoid(e,skipComment(e,n),t)}function skipUntil(e,n,t,i,l=!1){if(!i)return n=indexOfNewline(e,n),n<0?e.length:n;for(let r=n;r<e.length;r++){let f=e[r];if(f==="#")r=indexOfNewline(e,r);else{if(f===t)return r+1;if(f===i)return r;if(l&&(f===`
`||f==="\r"&&e[r+1]===`
`))return r}}throw new TomlError("cannot find end of structure",{toml:e,ptr:n})}function getStringEnd(e,n){let t=e[n],i=t===e[n+1]&&e[n+1]===e[n+2]?e.slice(n,n+3):t;n+=i.length-1;do n=e.indexOf(i,++n);while(n>-1&&t!=="'"&&e[n-1]==="\\"&&e[n-2]!=="\\");return n>-1&&(n+=i.length,i.length>1&&(e[n]===t&&n++,e[n]===t&&n++)),n}/*!
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
 */let DATE_TIME_RE=/^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}:\d{2}(?:\.\d+)?)?(Z|[-+]\d{2}:\d{2})?$/i;const g=class g extends Date{constructor(t){let i=!0,l=!0,r="Z";if(typeof t=="string"){let f=t.match(DATE_TIME_RE);f?(f[1]||(i=!1,t=`0000-01-01T${t}`),l=!!f[2],f[2]&&+f[2]>23?t="":(r=f[3]||null,t=t.toUpperCase(),!r&&l&&(t+="Z"))):t=""}super(t);O(this,h,!1);O(this,w,!1);O(this,s,null);isNaN(this.getTime())||(d(this,h,i),d(this,w,l),d(this,s,r))}isDateTime(){return c(this,h)&&c(this,w)}isLocal(){return!c(this,h)||!c(this,w)||!c(this,s)}isDate(){return c(this,h)&&!c(this,w)}isTime(){return c(this,w)&&!c(this,h)}isValid(){return c(this,h)||c(this,w)}toISOString(){let t=super.toISOString();if(this.isDate())return t.slice(0,10);if(this.isTime())return t.slice(11,23);if(c(this,s)===null)return t.slice(0,-1);if(c(this,s)==="Z")return t;let i=+c(this,s).slice(1,3)*60+ +c(this,s).slice(4,6);return i=c(this,s)[0]==="-"?i:-i,new Date(this.getTime()-i*6e4).toISOString().slice(0,-1)+c(this,s)}static wrapAsOffsetDateTime(t,i="Z"){let l=new g(t);return d(l,s,i),l}static wrapAsLocalDateTime(t){let i=new g(t);return d(i,s,null),i}static wrapAsLocalDate(t){let i=new g(t);return d(i,w,!1),d(i,s,null),i}static wrapAsLocalTime(t){let i=new g(t);return d(i,h,!1),d(i,s,null),i}};h=new WeakMap,w=new WeakMap,s=new WeakMap;let TomlDate=g;/*!
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
 */let INT_REGEX=/^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/,FLOAT_REGEX=/^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/,LEADING_ZERO=/^[+-]?0[0-9_]/,ESCAPE_REGEX=/^[0-9a-f]{4,8}$/i,ESC_MAP={b:"\b",t:"	",n:`
`,f:"\f",r:"\r",'"':'"',"\\":"\\"};function parseString(e,n=0,t=e.length){let i=e[n]==="'",l=e[n++]===e[n]&&e[n]===e[n+1];l&&(t-=2,e[n+=2]==="\r"&&n++,e[n]===`
`&&n++);let r=0,f,o="",a=n;for(;n<t-1;){let u=e[n++];if(u===`
`||u==="\r"&&e[n]===`
`){if(!l)throw new TomlError("newlines are not allowed in strings",{toml:e,ptr:n-1})}else if(u<" "&&u!=="	"||u==="\x7F")throw new TomlError("control characters are not allowed in strings",{toml:e,ptr:n-1});if(f){if(f=!1,u==="u"||u==="U"){let m=e.slice(n,n+=u==="u"?4:8);if(!ESCAPE_REGEX.test(m))throw new TomlError("invalid unicode escape",{toml:e,ptr:r});try{o+=String.fromCodePoint(parseInt(m,16))}catch{throw new TomlError("invalid unicode escape",{toml:e,ptr:r})}}else if(l&&(u===`
`||u===" "||u==="	"||u==="\r")){if(n=skipVoid(e,n-1,!0),e[n]!==`
`&&e[n]!=="\r")throw new TomlError("invalid escape: only line-ending whitespace may be escaped",{toml:e,ptr:r});n=skipVoid(e,n)}else if(u in ESC_MAP)o+=ESC_MAP[u];else throw new TomlError("unrecognized escape sequence",{toml:e,ptr:r});a=n}else!i&&u==="\\"&&(r=n-1,f=!0,o+=e.slice(a,r))}return o+e.slice(a,t-1)}function parseValue(e,n,t){if(e==="true")return!0;if(e==="false")return!1;if(e==="-inf")return-1/0;if(e==="inf"||e==="+inf")return 1/0;if(e==="nan"||e==="+nan"||e==="-nan")return NaN;if(e==="-0")return 0;let i;if((i=INT_REGEX.test(e))||FLOAT_REGEX.test(e)){if(LEADING_ZERO.test(e))throw new TomlError("leading zeroes are not allowed",{toml:n,ptr:t});let r=+e.replace(/_/g,"");if(isNaN(r))throw new TomlError("invalid number",{toml:n,ptr:t});if(i&&!Number.isSafeInteger(r))throw new TomlError("integer value cannot be represented losslessly",{toml:n,ptr:t});return r}let l=new TomlDate(e);if(!l.isValid())throw new TomlError("invalid value",{toml:n,ptr:t});return l}/*!
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
 */function sliceAndTrimEndOf(e,n,t,i){let l=e.slice(n,t),r=l.indexOf("#");r>-1&&(skipComment(e,r),l=l.slice(0,r));let f=l.trimEnd();if(!i){let o=l.indexOf(`
`,f.length);if(o>-1)throw new TomlError("newlines are not allowed in inline tables",{toml:e,ptr:n+o})}return[f,r]}function extractValue(e,n,t){let i=e[n];if(i==="["||i==="{"){let[f,o]=i==="["?parseArray(e,n):parseInlineTable(e,n),a=skipUntil(e,o,",",t);if(t==="}"){let u=indexOfNewline(e,o,a);if(u>-1)throw new TomlError("newlines are not allowed in inline tables",{toml:e,ptr:u})}return[f,a]}let l;if(i==='"'||i==="'"){l=getStringEnd(e,n);let f=parseString(e,n,l);if(t){if(l=skipVoid(e,l,t!=="]"),e[l]&&e[l]!==","&&e[l]!==t&&e[l]!==`
`&&e[l]!=="\r")throw new TomlError("unexpected character encountered",{toml:e,ptr:l});l+=+(e[l]===",")}return[f,l]}l=skipUntil(e,n,",",t);let r=sliceAndTrimEndOf(e,n,l-+(e[l-1]===","),t==="]");if(!r[0])throw new TomlError("incomplete key-value declaration: no value specified",{toml:e,ptr:n});return t&&r[1]>-1&&(l=skipVoid(e,n+r[1]),l+=+(e[l]===",")),[parseValue(r[0],e,n),l]}/*!
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
 */let KEY_PART_RE=/^[a-zA-Z0-9-_]+[ \t]*$/;function parseKey(e,n,t="="){let i=n-1,l=[],r=e.indexOf(t,n);if(r<0)throw new TomlError("incomplete key-value: cannot find end of key",{toml:e,ptr:n});do{let f=e[n=++i];if(f!==" "&&f!=="	")if(f==='"'||f==="'"){if(f===e[n+1]&&f===e[n+2])throw new TomlError("multiline strings are not allowed in keys",{toml:e,ptr:n});let o=getStringEnd(e,n);if(o<0)throw new TomlError("unfinished string encountered",{toml:e,ptr:n});i=e.indexOf(".",o);let a=e.slice(o,i<0||i>r?r:i),u=indexOfNewline(a);if(u>-1)throw new TomlError("newlines are not allowed in keys",{toml:e,ptr:n+i+u});if(a.trimStart())throw new TomlError("found extra tokens after the string part",{toml:e,ptr:o});if(r<o&&(r=e.indexOf(t,o),r<0))throw new TomlError("incomplete key-value: cannot find end of key",{toml:e,ptr:n});l.push(parseString(e,n,o))}else{i=e.indexOf(".",n);let o=e.slice(n,i<0||i>r?r:i);if(!KEY_PART_RE.test(o))throw new TomlError("only letter, numbers, dashes and underscores are allowed in keys",{toml:e,ptr:n});l.push(o.trimEnd())}}while(i+1&&i<r);return[l,skipVoid(e,r+1,!0,!0)]}function parseInlineTable(e,n){let t={},i=new Set,l,r=0;for(n++;(l=e[n++])!=="}"&&l;){if(l===`
`)throw new TomlError("newlines are not allowed in inline tables",{toml:e,ptr:n-1});if(l==="#")throw new TomlError("inline tables cannot contain comments",{toml:e,ptr:n-1});if(l===",")throw new TomlError("expected key-value, found comma",{toml:e,ptr:n-1});if(l!==" "&&l!=="	"){let f,o=t,a=!1,[u,m]=parseKey(e,n-1);for(let y=0;y<u.length;y++){if(y&&(o=a?o[f]:o[f]={}),f=u[y],(a=Object.hasOwn(o,f))&&(typeof o[f]!="object"||i.has(o[f])))throw new TomlError("trying to redefine an already defined value",{toml:e,ptr:n});!a&&f==="__proto__"&&Object.defineProperty(o,f,{enumerable:!0,configurable:!0,writable:!0})}if(a)throw new TomlError("trying to redefine an already defined value",{toml:e,ptr:n});let[T,x]=extractValue(e,m,"}");i.add(T),o[f]=T,n=x,r=e[n-1]===","?n-1:0}}if(r)throw new TomlError("trailing commas are not allowed in inline tables",{toml:e,ptr:r});if(!l)throw new TomlError("unfinished table encountered",{toml:e,ptr:n});return[t,n]}function parseArray(e,n){let t=[],i;for(n++;(i=e[n++])!=="]"&&i;){if(i===",")throw new TomlError("expected value, found comma",{toml:e,ptr:n-1});if(i==="#")n=skipComment(e,n);else if(i!==" "&&i!=="	"&&i!==`
`&&i!=="\r"){let l=extractValue(e,n-1,"]");t.push(l[0]),n=l[1]}}if(!i)throw new TomlError("unfinished array encountered",{toml:e,ptr:n});return[t,n]}/*!
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
 */function peekTable(e,n,t,i){let l=n,r=t,f,o=!1,a;for(let u=0;u<e.length;u++){if(u){if(l=o?l[f]:l[f]={},r=(a=r[f]).c,i===0&&(a.t===1||a.t===2))return null;if(a.t===2){let m=l.length-1;l=l[m],r=r[m].c}}if(f=e[u],(o=Object.hasOwn(l,f))&&r[f]?.t===0&&r[f]?.d)return null;o||(f==="__proto__"&&(Object.defineProperty(l,f,{enumerable:!0,configurable:!0,writable:!0}),Object.defineProperty(r,f,{enumerable:!0,configurable:!0,writable:!0})),r[f]={t:u<e.length-1&&i===2?3:i,d:!1,i:0,c:{}})}if(a=r[f],a.t!==i&&!(i===1&&a.t===3)||(i===2&&(a.d||(a.d=!0,l[f]=[]),l[f].push(l={}),a.c[a.i++]=a={t:1,d:!1,i:0,c:{}}),a.d))return null;if(a.d=!0,i===1)l=o?l[f]:l[f]={};else if(i===0&&o)return null;return[f,l,a.c]}function parse(e){let n={},t={},i=n,l=t;for(let r=skipVoid(e,0);r<e.length;){if(e[r]==="["){let f=e[++r]==="[",o=parseKey(e,r+=+f,"]");if(f){if(e[o[1]-1]!=="]")throw new TomlError("expected end of table declaration",{toml:e,ptr:o[1]-1});o[1]++}let a=peekTable(o[0],n,t,f?2:1);if(!a)throw new TomlError("trying to redefine an already defined table or value",{toml:e,ptr:r});l=a[2],i=a[1],r=o[1]}else{let f=parseKey(e,r),o=peekTable(f[0],i,l,0);if(!o)throw new TomlError("trying to redefine an already defined table or value",{toml:e,ptr:r});let a=extractValue(e,f[1]);o[1][o[0]]=a[0],r=a[1]}if(r=skipVoid(e,r,!0),e[r]&&e[r]!==`
`&&e[r]!=="\r")throw new TomlError("each key-value declaration must be followed by an end-of-line",{toml:e,ptr:r});r=skipVoid(e,r)}return n}/*!
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
 */const BARE_KEY=/^[a-z0-9-_]+$/i;function extendedTypeOf(e){let n=typeof e;if(n==="object"){if(Array.isArray(e))return"array";if(e instanceof Date)return"date"}return n}function isArrayOfTables(e){for(let n=0;n<e.length;n++)if(extendedTypeOf(e[n])!=="object")return!1;return e.length!=0}function formatString(e){return JSON.stringify(e).replace(/\x7f/g,"\\u007f")}function stringifyValue(e,n=extendedTypeOf(e)){if(n==="number")return isNaN(e)?"nan":e===1/0?"inf":e===-1/0?"-inf":e.toString();if(n==="bigint"||n==="boolean")return e.toString();if(n==="string")return formatString(e);if(n==="date"){if(isNaN(e.getTime()))throw new TypeError("cannot serialize invalid date");return e.toISOString()}if(n==="object")return stringifyInlineTable(e);if(n==="array")return stringifyArray(e)}function stringifyInlineTable(e){let n=Object.keys(e);if(n.length===0)return"{}";let t="{ ";for(let i=0;i<n.length;i++){let l=n[i];i&&(t+=", "),t+=BARE_KEY.test(l)?l:formatString(l),t+=" = ",t+=stringifyValue(e[l])}return t+" }"}function stringifyArray(e){if(e.length===0)return"[]";let n="[ ";for(let t=0;t<e.length;t++){if(t&&(n+=", "),e[t]===null||e[t]===void 0)throw new TypeError("arrays cannot contain null or undefined values");n+=stringifyValue(e[t])}return n+" ]"}function stringifyArrayTable(e,n){let t="";for(let i=0;i<e.length;i++)t+=`[[${n}]]
`,t+=stringifyTable(e[i],n),t+=`

`;return t}function stringifyTable(e,n=""){let t="",i="",l=Object.keys(e);for(let r=0;r<l.length;r++){let f=l[r];if(e[f]!==null&&e[f]!==void 0){let o=extendedTypeOf(e[f]);if(o==="symbol"||o==="function")throw new TypeError(`cannot serialize values of type '${o}'`);let a=BARE_KEY.test(f)?f:formatString(f);if(o==="array"&&isArrayOfTables(e[f]))i+=stringifyArrayTable(e[f],n?`${n}.${a}`:a);else if(o==="object"){let u=n?`${n}.${a}`:a;i+=`[${u}]
`,i+=stringifyTable(e[f],u),i+=`

`}else t+=a,t+=" = ",t+=stringifyValue(e[f],o),t+=`
`}}return`${t}
${i}`.trim()}function stringify(e){if(extendedTypeOf(e)!=="object")throw new TypeError("stringify can only be called with an object");return stringifyTable(e)}function parseTOML(e){const n=parse(e);return _format.storeFormat(e,n,{preserveIndentation:!1}),n}function stringifyTOML(e){const n=_format.getFormat(e,{preserveIndentation:!1}),t=stringify(e);return n.whitespace.start+t+n.whitespace.end}exports.parseTOML=parseTOML,exports.stringifyTOML=stringifyTOML;
