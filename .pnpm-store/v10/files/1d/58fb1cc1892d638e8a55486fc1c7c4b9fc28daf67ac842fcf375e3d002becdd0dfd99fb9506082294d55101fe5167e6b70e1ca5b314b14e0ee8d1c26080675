"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./lib/errors.js");
var _FakeEventTarget = _interopRequireDefault(require("./lib/FakeEventTarget.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class FDBRequest extends _FakeEventTarget.default {
  _result = null;
  _error = null;
  source = null;
  transaction = null;
  readyState = "pending";
  onsuccess = null;
  onerror = null;
  get error() {
    if (this.readyState === "pending") {
      throw new _errors.InvalidStateError();
    }
    return this._error;
  }
  set error(value) {
    this._error = value;
  }
  get result() {
    if (this.readyState === "pending") {
      throw new _errors.InvalidStateError();
    }
    return this._result;
  }
  set result(value) {
    this._result = value;
  }
  get [Symbol.toStringTag]() {
    return "IDBRequest";
  }
}
var _default = exports.default = FDBRequest;
module.exports = exports.default;