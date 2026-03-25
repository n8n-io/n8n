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
var lruCache_exports = {};
__export(lruCache_exports, {
  LRUCache: () => LRUCache
});
module.exports = __toCommonJS(lruCache_exports);
class LRUCache {
  constructor(maxSize) {
    this._maxSize = maxSize;
    this._map = /* @__PURE__ */ new Map();
    this._size = 0;
  }
  getOrCompute(key, compute) {
    if (this._map.has(key)) {
      const result2 = this._map.get(key);
      this._map.delete(key);
      this._map.set(key, result2);
      return result2.value;
    }
    const result = compute();
    while (this._map.size && this._size + result.size > this._maxSize) {
      const [firstKey, firstValue] = this._map.entries().next().value;
      this._size -= firstValue.size;
      this._map.delete(firstKey);
    }
    this._map.set(key, result);
    this._size += result.size;
    return result.value;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LRUCache
});
