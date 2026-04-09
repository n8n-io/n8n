var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utils_exports = {};
__export(utils_exports, {
  concatAll: () => concatAll,
  getChildren: () => getChildren,
  getErrors: () => getErrors,
  getSiblings: () => getSiblings,
  isAnyOfError: () => isAnyOfError,
  isEnumError: () => isEnumError,
  isRequiredError: () => isRequiredError,
  notUndefined: () => notUndefined
});
module.exports = __toCommonJS(utils_exports);
const eq = (x) => (y) => x === y;
const not = (fn) => (x) => !fn(x);
const getValues = (o) => Object.values(o);
const notUndefined = (x) => x !== void 0;
const isXError = (x) => (error) => error.keyword === x;
const isRequiredError = isXError("required");
const isAnyOfError = isXError("anyOf");
const isEnumError = isXError("enum");
const getErrors = (node) => node && node.errors ? node.errors.map((e) => e.keyword === "errorMessage" ? __spreadProps(__spreadValues({}, e.params.errors[0]), { message: e.message }) : e) : [];
const getChildren = (node) => node && getValues(node.children) || [];
const getSiblings = (parent) => (node) => getChildren(parent).filter(not(eq(node)));
const concatAll = (xs) => (ys) => ys.reduce((zs, z) => zs.concat(z), xs);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  concatAll,
  getChildren,
  getErrors,
  getSiblings,
  isAnyOfError,
  isEnumError,
  isRequiredError,
  notUndefined
});
//# sourceMappingURL=utils.js.map
