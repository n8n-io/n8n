"use strict";
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

// src/rspack/loaders/load.ts
var load_exports = {};
__export(load_exports, {
  default: () => load
});
module.exports = __toCommonJS(load_exports);

// src/utils.ts
var import_path = require("path");
function normalizeAbsolutePath(path) {
  if ((0, import_path.isAbsolute)(path))
    return (0, import_path.normalize)(path);
  else
    return path;
}

// src/rspack/context.ts
var import_buffer = require("buffer");
var import_path2 = require("path");
var import_acorn = require("acorn");
function createBuildContext(compiler, compilation, loaderContext) {
  return {
    getNativeBuildContext() {
      return {
        framework: "rspack",
        compiler,
        compilation,
        loaderContext
      };
    },
    addWatchFile(file) {
      compilation.fileDependencies.add((0, import_path2.resolve)(process.cwd(), file));
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies);
    },
    parse(code, opts = {}) {
      return import_acorn.Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        const { sources } = compilation.compiler.webpack;
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            typeof emittedFile.source === "string" ? emittedFile.source : import_buffer.Buffer.from(emittedFile.source)
          )
        );
      }
    }
  };
}
function createContext(loader) {
  return {
    error: (error) => loader.emitError(normalizeMessage(error)),
    warn: (message) => loader.emitWarning(normalizeMessage(message))
  };
}
function normalizeMessage(error) {
  const err = new Error(typeof error === "string" ? error : error.message);
  if (typeof error === "object") {
    err.stack = error.stack;
    err.cause = error.meta;
  }
  return err;
}

// src/rspack/utils.ts
var import_path3 = require("path");
function decodeVirtualModuleId(encoded, _plugin) {
  return decodeURIComponent((0, import_path3.basename)(encoded));
}
function isVirtualModuleId(encoded, plugin) {
  return (0, import_path3.dirname)(encoded) === plugin.__virtualModulePrefix;
}

// src/rspack/loaders/load.ts
async function load(source, map) {
  var _a;
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!(plugin == null ? void 0 : plugin.load) || !id)
    return callback(null, source, map);
  if (isVirtualModuleId(id, plugin))
    id = decodeVirtualModuleId(id, plugin);
  const context = createContext(this);
  const res = await plugin.load.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context
    ),
    normalizeAbsolutePath(id)
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, res.map ?? map);
  else
    callback(null, res, map);
}
