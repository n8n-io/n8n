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
var handler_exports = {};
__export(handler_exports, {
  findTargetHandler: () => findTargetHandler,
  isMiddleware: () => isMiddleware
});
module.exports = __toCommonJS(handler_exports);
var import_constants = require("./constants");
const isMiddleware = (handler) => handler.length > 1;
const findTargetHandler = (handler) => {
  return handler[import_constants.COMPOSED_HANDLER] ? (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findTargetHandler(handler[import_constants.COMPOSED_HANDLER])
  ) : handler;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findTargetHandler,
  isMiddleware
});
