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

// src/rspack/loaders/transform.ts
var transform_exports = {};
__export(transform_exports, {
  default: () => transform
});
module.exports = __toCommonJS(transform_exports);

// src/rspack/context.ts
var import_buffer = require("buffer");
var import_path = require("path");
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
      compilation.fileDependencies.add((0, import_path.resolve)(process.cwd(), file));
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

// src/rspack/loaders/transform.ts
async function transform(source, map) {
  var _a;
  const callback = this.async();
  let unpluginName;
  if (typeof this.query === "string") {
    const query = new URLSearchParams(this.query);
    unpluginName = query.get("unpluginName");
  } else {
    unpluginName = this.query.unpluginName;
  }
  const id = this.resource;
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  if (!(plugin == null ? void 0 : plugin.transform))
    return callback(null, source, map);
  const context = createContext(this);
  const res = await plugin.transform.call(
    Object.assign(
      {},
      this._compilation && createBuildContext(this._compiler, this._compilation, this),
      context
    ),
    source,
    id
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, map == null ? map : res.map || map);
  else callback(null, res, map);
}
