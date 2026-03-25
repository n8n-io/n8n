"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function md5(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }
  return _nodeCrypto.default.createHash('md5').update(bytes).digest();
}
var _default = exports.default = md5;