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
var router_exports = {};
__export(router_exports, {
  MESSAGE_MATCHER_IS_ALREADY_BUILT: () => MESSAGE_MATCHER_IS_ALREADY_BUILT,
  METHODS: () => METHODS,
  METHOD_NAME_ALL: () => METHOD_NAME_ALL,
  METHOD_NAME_ALL_LOWERCASE: () => METHOD_NAME_ALL_LOWERCASE,
  UnsupportedPathError: () => UnsupportedPathError
});
module.exports = __toCommonJS(router_exports);
const METHOD_NAME_ALL = "ALL";
const METHOD_NAME_ALL_LOWERCASE = "all";
const METHODS = ["get", "post", "put", "delete", "options", "patch"];
const MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
class UnsupportedPathError extends Error {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MESSAGE_MATCHER_IS_ALREADY_BUILT,
  METHODS,
  METHOD_NAME_ALL,
  METHOD_NAME_ALL_LOWERCASE,
  UnsupportedPathError
});
