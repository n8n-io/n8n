"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./errors.js");
var _valueToKeyWithoutThrowing = _interopRequireWildcard(require("./valueToKeyWithoutThrowing.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// https://w3c.github.io/IndexedDB/#convert-value-to-key
// Plus throwing a DataError for invalid value/invalid key, which is commonly done
// in lots of IndexedDB operations
const valueToKey = (input, seen) => {
  const result = (0, _valueToKeyWithoutThrowing.default)(input, seen);
  if (result === _valueToKeyWithoutThrowing.INVALID_VALUE || result === _valueToKeyWithoutThrowing.INVALID_TYPE) {
    // If key is "invalid value" or "invalid type", throw a "DataError" DOMException
    throw new _errors.DataError();
  }
  return result;
};
var _default = exports.default = valueToKey;
module.exports = exports.default;