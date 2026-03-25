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
var clone_exports = {};
__export(clone_exports, {
  clone: () => clone
});
module.exports = __toCommonJS(clone_exports);
var import_index = require("./index");
const clone = (obj) => {
  if ((0, import_index.isPlainObject)(obj)) {
    return cloneObject(obj);
  } else if (Array.isArray(obj)) {
    return cloneArray(obj);
  } else {
    return obj;
  }
};
const cloneObject = (obj) => {
  const clone2 = {};
  for (const i in obj) {
    const value = obj[i];
    if ((0, import_index.isObject)(value)) {
      clone2[i] = cloneObject(value);
    } else if (Array.isArray(value)) {
      clone2[i] = cloneArray(value);
    } else {
      clone2[i] = value;
    }
  }
  return clone2;
};
const cloneArray = (obj) => {
  const clone2 = [];
  for (const i in obj) {
    const value = obj[i];
    if ((0, import_index.isObject)(value)) {
      clone2.push(cloneObject(value));
    } else if (Array.isArray(value)) {
      clone2.push(cloneArray(value));
    } else {
      clone2.push(value);
    }
  }
  return clone2;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clone
});
//# sourceMappingURL=clone.js.map