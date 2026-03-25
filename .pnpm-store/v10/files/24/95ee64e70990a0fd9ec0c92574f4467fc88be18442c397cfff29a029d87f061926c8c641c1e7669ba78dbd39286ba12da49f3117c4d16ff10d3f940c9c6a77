"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _valueToKey = _interopRequireDefault(require("./valueToKey.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-extracting-a-key-from-a-value-using-a-key-path
const extractKey = (keyPath, value) => {
  if (Array.isArray(keyPath)) {
    const result = [];
    for (let item of keyPath) {
      // This doesn't make sense to me based on the spec, but it is needed to pass the W3C KeyPath tests (see same
      // comment in validateKeyPath)
      if (item !== undefined && item !== null && typeof item !== "string" && item.toString) {
        item = item.toString();
      }
      result.push((0, _valueToKey.default)(extractKey(item, value)));
    }
    return result;
  }
  if (keyPath === "") {
    return value;
  }
  let remainingKeyPath = keyPath;
  let object = value;
  while (remainingKeyPath !== null) {
    let identifier;
    const i = remainingKeyPath.indexOf(".");
    if (i >= 0) {
      identifier = remainingKeyPath.slice(0, i);
      remainingKeyPath = remainingKeyPath.slice(i + 1);
    } else {
      identifier = remainingKeyPath;
      remainingKeyPath = null;
    }
    if (object === undefined || object === null || !Object.hasOwn(object, identifier)) {
      return;
    }
    object = object[identifier];
  }
  return object;
};
var _default = exports.default = extractKey;
module.exports = exports.default;