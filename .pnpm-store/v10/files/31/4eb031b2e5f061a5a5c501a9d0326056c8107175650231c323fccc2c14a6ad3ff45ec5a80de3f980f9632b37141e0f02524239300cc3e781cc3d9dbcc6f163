"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FakeEvent = _interopRequireDefault(require("./lib/FakeEvent.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class FDBVersionChangeEvent extends _FakeEvent.default {
  constructor(type, parameters = {}) {
    super(type);
    this.newVersion = parameters.newVersion !== undefined ? parameters.newVersion : null;
    this.oldVersion = parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
  }
  toString() {
    return "[object IDBVersionChangeEvent]";
  }
}
var _default = exports.default = FDBVersionChangeEvent;
module.exports = exports.default;