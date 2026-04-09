"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBKeyRange = _interopRequireDefault(require("../FDBKeyRange.js"));
var _valueToKeyWithoutThrowing = _interopRequireWildcard(require("./valueToKeyWithoutThrowing.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// https://www.w3.org/TR/IndexedDB/#is-a-potentially-valid-key-range
const isPotentiallyValidKeyRange = value => {
  // If value is a key range, return true.
  if (value instanceof _FDBKeyRange.default) {
    return true;
  }

  // Let key be the result of converting a value to a key with value.
  const key = (0, _valueToKeyWithoutThrowing.default)(value);

  // If key is "invalid type" return false.
  // Else return true.
  return key !== _valueToKeyWithoutThrowing.INVALID_TYPE;
};
var _default = exports.default = isPotentiallyValidKeyRange;
module.exports = exports.default;