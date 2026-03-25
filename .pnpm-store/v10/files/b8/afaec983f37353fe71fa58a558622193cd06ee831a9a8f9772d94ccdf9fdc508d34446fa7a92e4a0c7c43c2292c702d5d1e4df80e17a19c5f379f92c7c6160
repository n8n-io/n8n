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
var text_exports = {};
__export(text_exports, {
  streamText: () => streamText
});
module.exports = __toCommonJS(text_exports);
var import_context = require("../../context");
var import__ = require("./");
const streamText = (c, cb, onError) => {
  c.header("Content-Type", import_context.TEXT_PLAIN);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Transfer-Encoding", "chunked");
  return (0, import__.stream)(c, cb, onError);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  streamText
});
