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
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
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
var import_buffer = require("buffer");
var import_process = __toESM(require("process"));
var import_webpack_sources = __toESM(require("webpack-sources"));
var import_acorn = require("acorn");
function createBuildContext(options, compilation) {
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
      options.addWatchFile((0, import_path.resolve)(import_process.default.cwd(), id));
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        if (!compilation)
          throw new Error("unplugin/webpack: emitFile outside supported hooks  (buildStart, buildEnd, load, transform, watchChange)");
        compilation.emitAsset(
          outFileName,
          import_webpack_sources.default ? new import_webpack_sources.default.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === "string" ? emittedFile.source : import_buffer.Buffer.from(emittedFile.source)
          ) : {
            source: () => emittedFile.source,
            size: () => emittedFile.source.length
          }
        );
      }
    },
    getWatchFiles() {
      return options.getWatchFiles();
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
  var _a;
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  let id = this.resource;
  if (!(plugin == null ? void 0 : plugin.load) || !id)
    return callback(null, source, map);
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
  const context = createContext(this);
  const res = await plugin.load.call(
    { ...createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file);
      },
      getWatchFiles: () => {
        return this.getDependencies();
      }
    }, this._compilation), ...context },
    normalizeAbsolutePath(id)
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, res.map ?? map);
  else
    callback(null, res, map);
}
