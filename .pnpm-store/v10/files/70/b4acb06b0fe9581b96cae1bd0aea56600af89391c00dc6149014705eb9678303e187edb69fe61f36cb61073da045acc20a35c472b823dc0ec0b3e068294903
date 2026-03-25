//! AlaSQL v4.3.3 build: develop-b9447ae3 | © 2014-2024 Andrey Gershun & Mathias Wulff | License: MIT
/*
@module alasql
@version 4.3.3

AlaSQL - JavaScript SQL database
© 2014-2024	Andrey Gershun & Mathias Wulff

@license
The MIT License (MIT)

Copyright 2014-2024 Andrey Gershun (agershun@gmail.com) & Mathias Wulff (m@rawu.dk)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/(function(e,f){typeof define=="function"&&define.amd?define([],f):typeof exports=="object"?module.exports=f():e.alasql=f()})(this,function(){function e(r,n,i){n=n||[],typeof n=="function"&&(scope=i,i=n,n=[]),typeof n!="object"&&(n=[n]);var o=e.lastid++;e.buffer[o]=i,e.webworker.postMessage({id:o,sql:r,params:n})}if(e.options={},e.options.progress=function(){},isArray=function(r){return Object.prototype.toString.call(r)==="[object Array]"},e.promise=function(){throw new Error("Please include a Promise/A+ library")},typeof Promise<"u"){var f=function(r,n,i,o){return new Promise(function(t,s){e(r,n,function(u,l){l?s(l):(i&&o&&e.options.progress!==!1&&e.options.progress(i,o),t(u))})})},w=function(r){if(!(r.length<1)){for(var n,i,o,t=[],s=0;s<r.length;s++){if(n=r[s],typeof n=="string"&&(n=[n]),!isArray(n)||n.length<1||2<n.length)throw new Error("Error in .promise parameter");i=n[0],o=n[1]||void 0,t.push(f(i,o,s,r.length))}return Promise.all(t)}};e.promise=function(r,n){if(typeof Promise>"u")throw new Error("Please include a Promise/A+ library");if(typeof r=="string")return f(r,n);if(!isArray(r)||r.length<1||typeof n<"u")throw new Error("Error in .promise parameters");return w(r)}}if(e=e||!1,!e)throw new Error("alasql was not found");return e.worker=function(){throw new Error("Can find webworker in this enviroment")},typeof Worker<"u"&&(e.worker=function(r,n,i){if(r===!0&&(r=void 0),typeof r>"u"){for(var o=document.getElementsByTagName("script"),t=0;t<o.length;t++)if(o[t].src.substr(-16).toLowerCase()==="alasql-worker.js"){r=o[t].src.substr(0,o[t].src.length-16)+"alasql.js";break}else if(o[t].src.substr(-20).toLowerCase()==="alasql-worker.min.js"){r=o[t].src.substr(0,o[t].src.length-20)+"alasql.min.js";break}else if(o[t].src.substr(-9).toLowerCase()==="alasql.js"){r=o[t].src;break}else if(o[t].src.substr(-13).toLowerCase()==="alasql.min.js"){r=o[t].src.substr(0,o[t].src.length-13)+"alasql.min.js";break}}if(typeof r>"u")throw new Error("Path to alasql.js is not specified");if(r!==!1){var s="importScripts('";s+=r,s+="');self.onmessage = function(event) {alasql(event.data.sql,event.data.params, function(data){postMessage({id:event.data.id, data:data});});}";var u=new Blob([s],{type:"text/plain"});if(e.webworker=new Worker(URL.createObjectURL(u)),e.webworker.onmessage=function(a){var d=a.data.id;e.buffer[d](a.data.data),delete e.buffer[d]},e.webworker.onerror=function(a){throw a},arguments.length>1){var l="REQUIRE "+n.map(function(a){return'"'+a+'"'}).join(",");e(l,[],i)}}else if(r===!1){delete e.webworker;return}}),e.lastid=0,e.buffer={},e.worker(),e});
