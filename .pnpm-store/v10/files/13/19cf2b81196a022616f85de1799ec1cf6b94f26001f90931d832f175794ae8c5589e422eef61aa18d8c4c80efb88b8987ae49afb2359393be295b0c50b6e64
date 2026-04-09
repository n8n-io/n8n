"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FakeEvent = _interopRequireDefault(require("./lib/FakeEvent.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class FDBVersionChangeEvent extends _FakeEvent.default {
  constructor(type, parameters = {}) {
    super(type);
    this.newVersion = parameters.newVersion !== undefined ? parameters.newVersion : null;
    this.oldVersion = parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
  }
  get [Symbol.toStringTag]() {
    return "IDBVersionChangeEvent";
  }
}
var _default = exports.default = FDBVersionChangeEvent;
module.exports = exports.default;