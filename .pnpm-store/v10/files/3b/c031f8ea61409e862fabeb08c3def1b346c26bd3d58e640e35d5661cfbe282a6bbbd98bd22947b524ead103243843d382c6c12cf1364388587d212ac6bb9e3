"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _cmp = _interopRequireDefault(require("./lib/cmp.js"));
var _errors = require("./lib/errors.js");
var _valueToKey = _interopRequireDefault(require("./lib/valueToKey.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#range-concept
class FDBKeyRange {
  static only(value) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    value = (0, _valueToKey.default)(value);
    return new FDBKeyRange(value, value, false, false);
  }
  static lowerBound(lower, open = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    lower = (0, _valueToKey.default)(lower);
    return new FDBKeyRange(lower, undefined, open, true);
  }
  static upperBound(upper, open = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    upper = (0, _valueToKey.default)(upper);
    return new FDBKeyRange(undefined, upper, true, open);
  }
  static bound(lower, upper, lowerOpen = false, upperOpen = false) {
    if (arguments.length < 2) {
      throw new TypeError();
    }
    const cmpResult = (0, _cmp.default)(lower, upper);
    if (cmpResult === 1 || cmpResult === 0 && (lowerOpen || upperOpen)) {
      throw new _errors.DataError();
    }
    lower = (0, _valueToKey.default)(lower);
    upper = (0, _valueToKey.default)(upper);
    return new FDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }
  constructor(lower, upper, lowerOpen, upperOpen) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbkeyrange-includes
  includes(key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    key = (0, _valueToKey.default)(key);
    if (this.lower !== undefined) {
      const cmpResult = (0, _cmp.default)(this.lower, key);
      if (cmpResult === 1 || cmpResult === 0 && this.lowerOpen) {
        return false;
      }
    }
    if (this.upper !== undefined) {
      const cmpResult = (0, _cmp.default)(this.upper, key);
      if (cmpResult === -1 || cmpResult === 0 && this.upperOpen) {
        return false;
      }
    }
    return true;
  }
  toString() {
    return "[object IDBKeyRange]";
  }
}
var _default = exports.default = FDBKeyRange;
module.exports = exports.default;