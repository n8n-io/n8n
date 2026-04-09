"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBKeyRange = _interopRequireDefault(require("../FDBKeyRange.js"));
var _errors = require("./errors.js");
var _valueToKey = _interopRequireDefault(require("./valueToKey.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// http://w3c.github.io/IndexedDB/#convert-a-value-to-a-key-range
const valueToKeyRange = (value, nullDisallowedFlag = false) => {
  if (value instanceof _FDBKeyRange.default) {
    return value;
  }
  if (value === null || value === undefined) {
    if (nullDisallowedFlag) {
      throw new _errors.DataError();
    }
    return new _FDBKeyRange.default(undefined, undefined, false, false);
  }
  const key = (0, _valueToKey.default)(value);
  return _FDBKeyRange.default.only(key);
};
var _default = exports.default = valueToKeyRange;
module.exports = exports.default;