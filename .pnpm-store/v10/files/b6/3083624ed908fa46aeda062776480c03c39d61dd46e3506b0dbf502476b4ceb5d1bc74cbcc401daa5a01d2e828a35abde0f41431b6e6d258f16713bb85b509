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
  bunFileSystemModule: () => bunFileSystemModule,
  toSSG: () => toSSG
});
module.exports = __toCommonJS(ssg_exports);
var import_ssg = require("../../helper/ssg");
const { write } = Bun;
const bunFileSystemModule = {
  writeFile: async (path, data) => {
    await write(path, data);
  },
  mkdir: async () => {
  }
};
const toSSG = async (app, options) => {
  return (0, import_ssg.toSSG)(app, bunFileSystemModule, options);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bunFileSystemModule,
  toSSG
});
