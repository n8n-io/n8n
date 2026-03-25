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

// src/submodules/serde/index.ts
var serde_exports = {};
__export(serde_exports, {
  NumericValue: () => NumericValue,
  nv: () => nv
});
module.exports = __toCommonJS(serde_exports);

// src/submodules/serde/value/NumericValue.ts
var NumericValue = class {
  constructor(string, type) {
    this.string = string;
    this.type = type;
  }
};
function nv(string) {
  return new NumericValue(string, "bigDecimal");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NumericValue,
  nv
});
