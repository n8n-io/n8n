var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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

// src/utils.js
var eq = (x) => (y) => x === y;
var not = (fn) => (x) => !fn(x);
var getValues = (o) => Object.values(o);
var notUndefined = (x) => x !== void 0;
var isXError = (x) => (error) => error.keyword === x;
var isRequiredError = isXError("required");
var isAnyOfError = isXError("anyOf");
var isEnumError = isXError("enum");
var getErrors = (node) => node && node.errors ? node.errors.map((e) => e.keyword === "errorMessage" ? __spreadProps(__spreadValues({}, e.params.errors[0]), { message: e.message }) : e) : [];
var getChildren = (node) => node && getValues(node.children) || [];
var getSiblings = (parent) => (node) => getChildren(parent).filter(not(eq(node)));
var concatAll = (xs) => (ys) => ys.reduce((zs, z) => zs.concat(z), xs);
export {
  concatAll,
  getChildren,
  getErrors,
  getSiblings,
  isAnyOfError,
  isEnumError,
  isRequiredError,
  notUndefined
};
//# sourceMappingURL=utils.mjs.map
