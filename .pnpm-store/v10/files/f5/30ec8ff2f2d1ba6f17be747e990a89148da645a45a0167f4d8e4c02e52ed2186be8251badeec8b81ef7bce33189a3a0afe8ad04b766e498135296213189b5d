"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBCursor = _interopRequireDefault(require("./FDBCursor.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class FDBCursorWithValue extends _FDBCursor.default {
  value = undefined;
  constructor(source, range, direction, request) {
    super(source, range, direction, request);
  }
  get [Symbol.toStringTag]() {
    return "IDBCursorWithValue";
  }
}
var _default = exports.default = FDBCursorWithValue;
module.exports = exports.default;