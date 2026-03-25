"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var semaphore_exports = {};
__export(semaphore_exports, {
  Semaphore: () => Semaphore
});
module.exports = __toCommonJS(semaphore_exports);
var import_manualPromise = require("./manualPromise");
class Semaphore {
  constructor(max) {
    this._acquired = 0;
    this._queue = [];
    this._max = max;
  }
  setMax(max) {
    this._max = max;
  }
  acquire() {
    const lock = new import_manualPromise.ManualPromise();
    this._queue.push(lock);
    this._flush();
    return lock;
  }
  release() {
    --this._acquired;
    this._flush();
  }
  _flush() {
    while (this._acquired < this._max && this._queue.length) {
      ++this._acquired;
      this._queue.shift().resolve();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Semaphore
});
