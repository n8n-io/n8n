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
var import_serve_static = require("../../middleware/serve-static");
var import_utils = require("./utils");
const serveStatic = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      return (0, import_utils.getContentFromKVAsset)(path, {
        manifest: options.manifest,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        namespace: options.namespace ? options.namespace : c.env ? c.env.__STATIC_CONTENT : void 0
      });
    };
    return (0, import_serve_static.serveStatic)({
      ...options,
      getContent
    })(c, next);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  serveStatic
});
