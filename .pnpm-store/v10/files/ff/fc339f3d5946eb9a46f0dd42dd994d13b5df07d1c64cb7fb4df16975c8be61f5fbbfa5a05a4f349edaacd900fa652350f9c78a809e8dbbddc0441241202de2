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

// src/rspack/loaders/load.ts
var load_exports = {};
__export(load_exports, {
  default: () => load
});
module.exports = __toCommonJS(load_exports);

// src/rspack/context.ts
var import_buffer = require("buffer");
var import_webpack_sources = __toESM(require("webpack-sources"));
var import_acorn = require("acorn");
function createBuildContext(compilation) {
  return {
    parse(code, opts = {}) {
      return import_acorn.Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile() {
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          new import_webpack_sources.default.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === "string" ? emittedFile.source : import_buffer.Buffer.from(emittedFile.source)
          )
        );
      }
    },
    getWatchFiles() {
      return [];
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
var import_path = require("path");
function normalizeAbsolutePath(path) {
  if ((0, import_path.isAbsolute)(path))
    return (0, import_path.normalize)(path);
  else
    return path;
}

// src/rspack/loaders/load.ts
async function load(source, map) {
  var _a;
  const callback = this.async();
  const { unpluginName } = this.query;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  const id = this.resource;
  if (!(plugin == null ? void 0 : plugin.load) || !id)
    return callback(null, source, map);
  if (plugin.loadInclude && !plugin.loadInclude(id))
    return callback(null, source, map);
  const context = createContext(this);
  const res = await plugin.load.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compilation),
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
