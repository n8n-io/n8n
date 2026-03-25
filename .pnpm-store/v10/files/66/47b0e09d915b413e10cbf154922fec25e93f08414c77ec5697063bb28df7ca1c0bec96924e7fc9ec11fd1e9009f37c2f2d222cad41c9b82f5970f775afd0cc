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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ssg_exports = {};
__export(ssg_exports, {
  X_HONO_DISABLE_SSG_HEADER_KEY: () => import_middleware.X_HONO_DISABLE_SSG_HEADER_KEY,
  defaultPlugin: () => import_plugins.defaultPlugin,
  disableSSG: () => import_middleware.disableSSG,
  isSSGContext: () => import_middleware.isSSGContext,
  onlySSG: () => import_middleware.onlySSG,
  redirectPlugin: () => import_plugins.redirectPlugin,
  ssgParams: () => import_middleware.ssgParams
});
module.exports = __toCommonJS(ssg_exports);
__reExport(ssg_exports, require("./ssg"), module.exports);
var import_middleware = require("./middleware");
var import_plugins = require("./plugins");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  X_HONO_DISABLE_SSG_HEADER_KEY,
  defaultPlugin,
  disableSSG,
  isSSGContext,
  onlySSG,
  redirectPlugin,
  ssgParams,
  ...require("./ssg")
});
