"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./errors.js");
const MAX_KEY = 9007199254740992;
class KeyGenerator {
  // This is kind of wrong. Should start at 1 and increment only after record is saved
  num = 0;
  next() {
    if (this.num >= MAX_KEY) {
      throw new _errors.ConstraintError();
    }
    this.num += 1;
    return this.num;
  }

  // https://w3c.github.io/IndexedDB/#possibly-update-the-key-generator
  setIfLarger(num) {
    const value = Math.floor(Math.min(num, MAX_KEY)) - 1;
    if (value >= this.num) {
      this.num = value + 1;
    }
  }
}
var _default = exports.default = KeyGenerator;
module.exports = exports.default;