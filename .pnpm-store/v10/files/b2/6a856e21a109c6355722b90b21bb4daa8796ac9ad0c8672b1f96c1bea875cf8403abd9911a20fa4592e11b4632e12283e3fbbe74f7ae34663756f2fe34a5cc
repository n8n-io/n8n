(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('worker-timers-broker')) :
    typeof define === 'function' && define.amd ? define(['exports', 'worker-timers-broker'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.workerTimers = {}, global.workerTimersBroker));
})(this, (function (exports, workerTimersBroker) { 'use strict';

    var createLoadOrReturnBroker = function createLoadOrReturnBroker(loadBroker, worker) {
      var broker = null;
      return function () {
        if (broker !== null) {
          return broker;
        }
        var blob = new Blob([worker], {
          type: 'application/javascript; charset=utf-8'
        });
        var url = URL.createObjectURL(blob);
        broker = loadBroker(url);
        // Bug #1: Edge up until v18 didn't like the URL to be revoked directly.
        setTimeout(function () {
          return URL.revokeObjectURL(url);
        });
        return broker;
      };
    };

    // This is the minified and stringified code of the worker-timers-worker package.
    var worker = "(()=>{var e={472:(e,t,r)=>{var o,i;void 0===(i=\"function\"==typeof(o=function(){\"use strict\";var e=new Map,t=new Map,r=function(t){var r=e.get(t);if(void 0===r)throw new Error('There is no interval scheduled with the given id \"'.concat(t,'\".'));clearTimeout(r),e.delete(t)},o=function(e){var r=t.get(e);if(void 0===r)throw new Error('There is no timeout scheduled with the given id \"'.concat(e,'\".'));clearTimeout(r),t.delete(e)},i=function(e,t){var r,o=performance.now();return{expected:o+(r=e-Math.max(0,o-t)),remainingDelay:r}},n=function e(t,r,o,i){var n=performance.now();n>o?postMessage({id:null,method:\"call\",params:{timerId:r,timerType:i}}):t.set(r,setTimeout(e,o-n,t,r,o,i))},a=function(t,r,o){var a=i(t,o),s=a.expected,d=a.remainingDelay;e.set(r,setTimeout(n,d,e,r,s,\"interval\"))},s=function(e,r,o){var a=i(e,o),s=a.expected,d=a.remainingDelay;t.set(r,setTimeout(n,d,t,r,s,\"timeout\"))};addEventListener(\"message\",(function(e){var t=e.data;try{if(\"clear\"===t.method){var i=t.id,n=t.params,d=n.timerId,c=n.timerType;if(\"interval\"===c)r(d),postMessage({error:null,id:i});else{if(\"timeout\"!==c)throw new Error('The given type \"'.concat(c,'\" is not supported'));o(d),postMessage({error:null,id:i})}}else{if(\"set\"!==t.method)throw new Error('The given method \"'.concat(t.method,'\" is not supported'));var u=t.params,l=u.delay,p=u.now,m=u.timerId,v=u.timerType;if(\"interval\"===v)a(l,m,p);else{if(\"timeout\"!==v)throw new Error('The given type \"'.concat(v,'\" is not supported'));s(l,m,p)}}}catch(e){postMessage({error:{message:e.message},id:t.id,result:null})}}))})?o.call(t,r,t,e):o)||(e.exports=i)}},t={};function r(o){var i=t[o];if(void 0!==i)return i.exports;var n=t[o]={exports:{}};return e[o](n,n.exports,r),n.exports}r.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return r.d(t,{a:t}),t},r.d=(e,t)=>{for(var o in t)r.o(t,o)&&!r.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})},r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{\"use strict\";r(472)})()})();"; // tslint:disable-line:max-line-length

    var loadOrReturnBroker = createLoadOrReturnBroker(workerTimersBroker.load, worker);
    var clearInterval = function clearInterval(timerId) {
      return loadOrReturnBroker().clearInterval(timerId);
    };
    var clearTimeout = function clearTimeout(timerId) {
      return loadOrReturnBroker().clearTimeout(timerId);
    };
    var setInterval = function setInterval() {
      var _loadOrReturnBroker;
      return (_loadOrReturnBroker = loadOrReturnBroker()).setInterval.apply(_loadOrReturnBroker, arguments);
    };
    var setTimeout$1 = function setTimeout() {
      var _loadOrReturnBroker2;
      return (_loadOrReturnBroker2 = loadOrReturnBroker()).setTimeout.apply(_loadOrReturnBroker2, arguments);
    };

    exports.clearInterval = clearInterval;
    exports.clearTimeout = clearTimeout;
    exports.setInterval = setInterval;
    exports.setTimeout = setTimeout$1;

}));
