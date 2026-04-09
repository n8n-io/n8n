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

// src/webpack/loaders/transform.ts
var transform_exports = {};
__export(transform_exports, {
  default: () => transform
});
module.exports = __toCommonJS(transform_exports);

// src/utils.ts
function resolveQuery(query) {
  if (typeof query === "string") {
    return new URLSearchParams(query).get("unpluginName");
  } else {
    return query.unpluginName;
  }
}

// src/webpack/context.ts
var import_buffer = require("buffer");
var import_module = require("module");
var import_path = require("path");
var import_process = __toESM(require("process"));
var import_acorn = require("acorn");
function getSource(fileSource) {
  const webpackRequire = (0, import_module.createRequire)(require.resolve("webpack"));
  const RawSource = webpackRequire("webpack-sources").RawSource;
  return new RawSource(
    typeof fileSource === "string" ? fileSource : import_buffer.Buffer.from(fileSource.buffer).toString("utf-8")
  );
}
function createBuildContext(options, compiler, compilation, loaderContext) {
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
          getSource(emittedFile.source)
        );
      }
    },
    getWatchFiles() {
      return options.getWatchFiles();
    },
    getNativeBuildContext() {
      return { framework: "webpack", compiler, compilation, loaderContext };
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

// src/webpack/loaders/transform.ts
async function transform(source, map) {
  var _a;
  const callback = this.async();
  const unpluginName = resolveQuery(this.query);
  const plugin = (_a = this._compiler) == null ? void 0 : _a.$unpluginContext[unpluginName];
  if (!(plugin == null ? void 0 : plugin.transform))
    return callback(null, source, map);
  const context = createContext(this);
  const res = await plugin.transform.call(
    Object.assign({}, createBuildContext({
      addWatchFile: (file) => {
        this.addDependency(file);
      },
      getWatchFiles: () => {
        return this.getDependencies();
      }
    }, this._compiler, this._compilation, this), context),
    source,
    this.resource
  );
  if (res == null)
    callback(null, source, map);
  else if (typeof res !== "string")
    callback(null, res.code, map == null ? map : res.map || map);
  else
    callback(null, res, map);
}
