"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_fs = __toESM(require("fs"));
var import_url = __toESM(require("url"));
var import_compilationCache = require("./compilationCache");
var import_portTransport = require("./portTransport");
var import_transform = require("./transform");
var import_util = require("../util");
const esmPreflightExtension = ".esm.preflight";
async function resolve(originalSpecifier, context, defaultResolve) {
  let specifier = originalSpecifier.replace(esmPreflightExtension, "");
  if (context.parentURL && context.parentURL.startsWith("file://")) {
    const filename = import_url.default.fileURLToPath(context.parentURL);
    const resolved = (0, import_transform.resolveHook)(filename, specifier);
    if (resolved !== void 0)
      specifier = import_url.default.pathToFileURL(resolved).toString();
  }
  const result = await defaultResolve(specifier, context, defaultResolve);
  if (result?.url && result.url.startsWith("file://"))
    (0, import_compilationCache.currentFileDepsCollector)()?.add(import_url.default.fileURLToPath(result.url));
  if (originalSpecifier.endsWith(esmPreflightExtension))
    result.url = result.url + esmPreflightExtension;
  return result;
}
const kSupportedFormats = /* @__PURE__ */ new Map([
  ["commonjs", "commonjs"],
  ["module", "module"],
  ["commonjs-typescript", "commonjs"],
  ["module-typescript", "module"],
  [null, null],
  [void 0, void 0]
]);
async function load(originalModuleUrl, context, defaultLoad) {
  const moduleUrl = originalModuleUrl.replace(esmPreflightExtension, "");
  if (!kSupportedFormats.has(context.format))
    return defaultLoad(moduleUrl, context, defaultLoad);
  if (!moduleUrl.startsWith("file://"))
    return defaultLoad(moduleUrl, context, defaultLoad);
  const filename = import_url.default.fileURLToPath(moduleUrl);
  if (!(0, import_transform.shouldTransform)(filename))
    return defaultLoad(moduleUrl, context, defaultLoad);
  const code = import_fs.default.readFileSync(filename, "utf-8");
  const transformed = (0, import_transform.transformHook)(code, filename, moduleUrl);
  if (transformed.serializedCache)
    transport?.post("pushToCompilationCache", { cache: transformed.serializedCache });
  return {
    format: kSupportedFormats.get(context.format) || ((0, import_util.fileIsModule)(filename) ? "module" : "commonjs"),
    source: originalModuleUrl.endsWith(esmPreflightExtension) ? `void 0;` : transformed.code,
    shortCircuit: true
  };
}
let transport;
function initialize(data) {
  transport = createTransport(data?.port);
}
function createTransport(port) {
  return new import_portTransport.PortTransport(port, async (method, params) => {
    if (method === "setSingleTSConfig") {
      (0, import_transform.setSingleTSConfig)(params.tsconfig);
      return;
    }
    if (method === "setTransformConfig") {
      (0, import_transform.setTransformConfig)(params.config);
      return;
    }
    if (method === "addToCompilationCache") {
      (0, import_compilationCache.addToCompilationCache)(params.cache);
      return;
    }
    if (method === "getCompilationCache")
      return { cache: (0, import_compilationCache.serializeCompilationCache)() };
    if (method === "startCollectingFileDeps") {
      (0, import_compilationCache.startCollectingFileDeps)();
      return;
    }
    if (method === "stopCollectingFileDeps") {
      (0, import_compilationCache.stopCollectingFileDeps)(params.file);
      return;
    }
  });
}
module.exports = { initialize, load, resolve };
