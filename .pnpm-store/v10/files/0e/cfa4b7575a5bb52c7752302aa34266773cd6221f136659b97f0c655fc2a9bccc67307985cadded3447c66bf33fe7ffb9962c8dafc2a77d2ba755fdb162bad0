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
var zones_exports = {};
__export(zones_exports, {
  Zone: () => Zone,
  currentZone: () => currentZone,
  emptyZone: () => emptyZone
});
module.exports = __toCommonJS(zones_exports);
var import_async_hooks = require("async_hooks");
const asyncLocalStorage = new import_async_hooks.AsyncLocalStorage();
class Zone {
  constructor(asyncLocalStorage2, store) {
    this._asyncLocalStorage = asyncLocalStorage2;
    this._data = store;
  }
  with(type, data) {
    return new Zone(this._asyncLocalStorage, new Map(this._data).set(type, data));
  }
  without(type) {
    const data = type ? new Map(this._data) : /* @__PURE__ */ new Map();
    data.delete(type);
    return new Zone(this._asyncLocalStorage, data);
  }
  run(func) {
    return this._asyncLocalStorage.run(this, func);
  }
  data(type) {
    return this._data.get(type);
  }
}
const emptyZone = new Zone(asyncLocalStorage, /* @__PURE__ */ new Map());
function currentZone() {
  return asyncLocalStorage.getStore() ?? emptyZone;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Zone,
  currentZone,
  emptyZone
});
