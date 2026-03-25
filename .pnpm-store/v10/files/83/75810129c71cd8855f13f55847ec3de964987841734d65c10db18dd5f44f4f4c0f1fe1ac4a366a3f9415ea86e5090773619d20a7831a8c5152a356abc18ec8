/*
  didYouMean.js copyright (c) 2013-2014 Dave Porter.

  [Available on GitHub](https://github.com/dcporter/didyoumean.js).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License
  [here](http://www.apache.org/licenses/LICENSE-2.0).

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
(function(){"use strict";function e(t,r,i){if(!t)return null;if(!e.caseSensitive){t=t.toLowerCase()}var s=e.threshold===null?null:e.threshold*t.length,o=e.thresholdAbsolute,u;if(s!==null&&o!==null)u=Math.min(s,o);else if(s!==null)u=s;else if(o!==null)u=o;else u=null;var a,f,l,c,h,p=r.length;for(h=0;h<p;h++){f=r[h];if(i){f=f[i]}if(!f){continue}if(!e.caseSensitive){l=f.toLowerCase()}else{l=f}c=n(t,l,u);if(u===null||c<u){u=c;if(i&&e.returnWinningObject)a=r[h];else a=f;if(e.returnFirstMatch)return a}}return a||e.nullResultValue}function n(e,n,r){r=r||r===0?r:t;var i=e.length;var s=n.length;if(i===0)return Math.min(r+1,s);if(s===0)return Math.min(r+1,i);if(Math.abs(i-s)>r)return r+1;var o=[],u,a,f,l,c;for(u=0;u<=s;u++){o[u]=[u]}for(a=0;a<=i;a++){o[0][a]=a}for(u=1;u<=s;u++){f=t;l=1;if(u>r)l=u-r;c=s+1;if(c>r+u)c=r+u;for(a=1;a<=i;a++){if(a<l||a>c){o[u][a]=r+1}else{if(n.charAt(u-1)===e.charAt(a-1)){o[u][a]=o[u-1][a-1]}else{o[u][a]=Math.min(o[u-1][a-1]+1,Math.min(o[u][a-1]+1,o[u-1][a]+1))}}if(o[u][a]<f)f=o[u][a]}if(f>r)return r+1}return o[s][i]}e.threshold=.4;e.thresholdAbsolute=20;e.caseSensitive=false;e.nullResultValue=null;e.returnWinningObject=null;e.returnFirstMatch=false;if(typeof module!=="undefined"&&module.exports){module.exports=e}else{window.didYouMean=e}var t=Math.pow(2,32)-1})();