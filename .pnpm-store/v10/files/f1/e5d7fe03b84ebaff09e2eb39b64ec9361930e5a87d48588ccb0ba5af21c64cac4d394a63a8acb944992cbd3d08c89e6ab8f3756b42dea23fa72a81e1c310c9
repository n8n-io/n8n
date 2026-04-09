var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var enum_exports = {};
__export(enum_exports, {
  default: () => EnumValidationError
});
module.exports = __toCommonJS(enum_exports);
var import_chalk = __toESM(require("chalk"));
var import_leven = __toESM(require("leven"));
var import_jsonpointer = __toESM(require("jsonpointer"));
var import_base = __toESM(require("./base"));
class EnumValidationError extends import_base.default {
  print() {
    const {
      message,
      params: { allowedValues }
    } = this.options;
    const bestMatch = this.findBestMatch();
    const output = [
      import_chalk.default`{red {bold ENUM} ${message}}`,
      import_chalk.default`{red (${allowedValues.join(", ")})}\n`
    ];
    return output.concat(this.getCodeFrame(bestMatch !== null ? import_chalk.default`👈🏽  Did you mean {magentaBright ${bestMatch}} here?` : import_chalk.default`👈🏽  Unexpected value, should be equal to one of the allowed values`));
  }
  getError() {
    const { message, params } = this.options;
    const bestMatch = this.findBestMatch();
    const allowedValues = params.allowedValues.join(", ");
    const output = __spreadProps(__spreadValues({}, this.getLocation()), {
      error: `${this.getDecoratedPath()} ${message}: ${allowedValues}`,
      path: this.instancePath
    });
    if (bestMatch !== null) {
      output.suggestion = `Did you mean ${bestMatch}?`;
    }
    return output;
  }
  findBestMatch() {
    const {
      params: { allowedValues }
    } = this.options;
    const currentValue = this.instancePath === "" ? this.data : import_jsonpointer.default.get(this.data, this.instancePath);
    if (!currentValue) {
      return null;
    }
    const bestMatch = allowedValues.map((value) => ({
      value,
      weight: (0, import_leven.default)(value, currentValue.toString())
    })).sort((x, y) => x.weight > y.weight ? 1 : x.weight < y.weight ? -1 : 0)[0];
    return allowedValues.length === 1 || bestMatch.weight < bestMatch.value.length ? bestMatch.value : null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=enum.js.map
