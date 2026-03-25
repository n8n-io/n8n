"use strict";

exports.__esModule = true;
exports.default = _default;
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const webPolyfills = {
  "web.timers": {},
  "web.immediate": {},
  "web.dom.iterable": {}
};
const purePolyfills = {
  "es6.parse-float": {},
  "es6.parse-int": {},
  "es7.string.at": {}
};
function _default(targets, method, polyfills) {
  const targetNames = Object.keys(targets);
  const isAnyTarget = !targetNames.length;
  const isWebTarget = targetNames.some(name => name !== "node");
  return _extends({}, polyfills, method === "usage-pure" ? purePolyfills : null, isAnyTarget || isWebTarget ? webPolyfills : null);
}