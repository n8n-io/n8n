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
var additional_prop_exports = {};
__export(additional_prop_exports, {
  default: () => AdditionalPropValidationError
});
module.exports = __toCommonJS(additional_prop_exports);
var import_chalk = __toESM(require("chalk"));
var import_base = __toESM(require("./base"));
class AdditionalPropValidationError extends import_base.default {
  constructor(...args) {
    super(...args);
    this.options.isIdentifierLocation = true;
  }
  print() {
    const { message, params } = this.options;
    const output = [import_chalk.default`{red {bold ADDTIONAL PROPERTY} ${message}}\n`];
    return output.concat(this.getCodeFrame(import_chalk.default`😲  {magentaBright ${params.additionalProperty}} is not expected to be here!`, `${this.instancePath}/${params.additionalProperty}`));
  }
  getError() {
    const { params } = this.options;
    return __spreadProps(__spreadValues({}, this.getLocation(`${this.instancePath}/${params.additionalProperty}`)), {
      error: `${this.getDecoratedPath()} Property ${params.additionalProperty} is not expected to be here`,
      path: this.instancePath
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=additional-prop.js.map
