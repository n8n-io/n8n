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
var ssg_exports = {};
__export(ssg_exports, {
  denoFileSystemModule: () => denoFileSystemModule,
  toSSG: () => toSSG
});
module.exports = __toCommonJS(ssg_exports);
var import_ssg = require("../../helper/ssg/index");
const denoFileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    await Deno.writeFile(path, uint8Data);
  },
  mkdir: async (path, options) => {
    return Deno.mkdir(path, { recursive: options?.recursive ?? false });
  }
};
const toSSG = async (app, options) => {
  return (0, import_ssg.toSSG)(app, denoFileSystemModule, options);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  denoFileSystemModule,
  toSSG
});
