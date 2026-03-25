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
var serve_static_exports = {};
__export(serve_static_exports, {
  serveStatic: () => serveStatic
});
module.exports = __toCommonJS(serve_static_exports);
var import_node_path = require("node:path");
var import_serve_static = require("../../middleware/serve-static");
const { open, lstatSync, errors } = Deno;
const serveStatic = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      try {
        if (isDir(path)) {
          return null;
        }
        const file = await open(path);
        return file.readable;
      } catch (e) {
        if (!(e instanceof errors.NotFound)) {
          console.warn(`${e}`);
        }
        return null;
      }
    };
    const isDir = (path) => {
      let isDir2;
      try {
        const stat = lstatSync(path);
        isDir2 = stat.isDirectory;
      } catch {
      }
      return isDir2;
    };
    return (0, import_serve_static.serveStatic)({
      ...options,
      getContent,
      join: import_node_path.join,
      isDir
    })(c, next);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  serveStatic
});
