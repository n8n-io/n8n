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
var stringInternPool_exports = {};
__export(stringInternPool_exports, {
  JsonStringInternalizer: () => JsonStringInternalizer,
  StringInternPool: () => StringInternPool
});
module.exports = __toCommonJS(stringInternPool_exports);
class StringInternPool {
  constructor() {
    this._stringCache = /* @__PURE__ */ new Map();
  }
  internString(s) {
    let result = this._stringCache.get(s);
    if (!result) {
      this._stringCache.set(s, s);
      result = s;
    }
    return result;
  }
}
class JsonStringInternalizer {
  constructor(pool) {
    this._pool = pool;
  }
  traverse(value) {
    if (typeof value !== "object")
      return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === "string")
          value[i] = this.intern(value[i]);
        else
          this.traverse(value[i]);
      }
    } else {
      for (const name in value) {
        if (typeof value[name] === "string")
          value[name] = this.intern(value[name]);
        else
          this.traverse(value[name]);
      }
    }
  }
  intern(value) {
    return this._pool.internString(value);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JsonStringInternalizer,
  StringInternPool
});
