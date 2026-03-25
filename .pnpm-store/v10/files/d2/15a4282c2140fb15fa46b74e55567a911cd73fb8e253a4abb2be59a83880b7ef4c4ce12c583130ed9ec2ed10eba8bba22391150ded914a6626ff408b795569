"use strict";
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/webpack/loaders/load.ts
var load_exports = {};
__export(load_exports, {
  default: () => load
});
module.exports = __toCommonJS(load_exports);

// src/webpack/context.ts
var import_path = require("path");
var import_webpack_sources = __toESM(require("webpack-sources"));
var import_acorn = require("acorn");
function createContext(compilation) {
  return {
    parse(code, opts = {}) {
      return import_acorn.Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile(id) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(
        (0, import_path.resolve)(process.cwd(), id)
      );
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          import_webpack_sources.default ? new import_webpack_sources.default.RawSource(
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)
          ) : {
            source: () => emittedFile.source,
            size: () => emittedFile.source.length
          }
        );
      }
    },
    getWatchFiles() {
      return Array.from(
        compilation.fileDependencies ?? compilation.compilationDependencies
      );
    }
  };
}

// src/utils.ts
var import_path2 = require("path");
function normalizeAbsolutePath(path) {
  if ((0, import_path2.isAbsolute)(path))
    return (0, import_path2.normalize)(path);
  else
    return path;
}

// src/webpack/loaders/load.ts
async function load(source, map) {
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = this._compiler?.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!plugin?.load || !id)
    return callback(null, source, map);
  const context = {
    error: (error) => this.emitError(typeof error === "string" ? new Error(error) : error),
    warn: (error) => this.emitWarning(typeof error === "string" ? new Error(error) : error)
  };
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
  const res = await plugin.load.call(
    Object.assign(this._compilation && createContext(this._compilation), context),
    normalizeAbsolutePath(id)
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, res.map ?? map);
  else
    callback(null, res, map);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
