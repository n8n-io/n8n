"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./errors.js");
// https://w3c.github.io/IndexedDB/#convert-value-to-key
const valueToKey = (input, seen) => {
  if (typeof input === "number") {
    if (isNaN(input)) {
      throw new _errors.DataError();
    }
    return input;
  } else if (Object.prototype.toString.call(input) === "[object Date]") {
    const ms = input.valueOf();
    if (isNaN(ms)) {
      throw new _errors.DataError();
    }
    return new Date(ms);
  } else if (typeof input === "string") {
    return input;
  } else if (input instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) {
    let arrayBuffer;
    let offset = 0;
    let length = 0;
    if (input instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer) {
      arrayBuffer = input;
      length = input.byteLength;
    } else {
      arrayBuffer = input.buffer;
      offset = input.byteOffset;
      length = input.byteLength;
    }
    if (arrayBuffer.detached) {
      return new ArrayBuffer(0);
    }
    return arrayBuffer.slice(offset, offset + length);
  } else if (Array.isArray(input)) {
    if (seen === undefined) {
      seen = new Set();
    } else if (seen.has(input)) {
      throw new _errors.DataError();
    }
    seen.add(input);
    const keys = [];
    for (let i = 0; i < input.length; i++) {
      const hop = Object.hasOwn(input, i);
      if (!hop) {
        throw new _errors.DataError();
      }
      const entry = input[i];
      const key = valueToKey(entry, seen);
      keys.push(key);
    }
    return keys;
  } else {
    throw new _errors.DataError();
  }
};
var _default = exports.default = valueToKey;
module.exports = exports.default;