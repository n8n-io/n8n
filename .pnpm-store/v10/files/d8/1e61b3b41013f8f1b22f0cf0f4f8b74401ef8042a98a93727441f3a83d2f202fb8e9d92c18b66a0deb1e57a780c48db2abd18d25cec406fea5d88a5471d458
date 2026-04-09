var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_momoa = require("@humanwhocodes/momoa");
var import_helpers = __toESM(require("./helpers"));
var src_default = (schema, data, errors, options = {}) => {
  const { format = "cli", indent = null, json = null } = options;
  const jsonRaw = json || JSON.stringify(data, null, indent);
  const jsonAst = (0, import_momoa.parse)(jsonRaw);
  const customErrorToText = (error) => error.print().join("\n");
  const customErrorToStructure = (error) => error.getError();
  const customErrors = (0, import_helpers.default)(errors, {
    data,
    schema,
    jsonAst,
    jsonRaw
  });
  if (format === "cli") {
    return customErrors.map(customErrorToText).join("\n\n");
  } else {
    return customErrors.map(customErrorToStructure);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=index.js.map
