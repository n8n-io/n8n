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
var esmLoaderHost_exports = {};
__export(esmLoaderHost_exports, {
  configureESMLoader: () => configureESMLoader,
  configureESMLoaderTransformConfig: () => configureESMLoaderTransformConfig,
  incorporateCompilationCache: () => incorporateCompilationCache,
  registerESMLoader: () => registerESMLoader,
  startCollectingFileDeps: () => startCollectingFileDeps,
  stopCollectingFileDeps: () => stopCollectingFileDeps
});
module.exports = __toCommonJS(esmLoaderHost_exports);
var import_url = __toESM(require("url"));
var import_compilationCache = require("../transform/compilationCache");
var import_portTransport = require("../transform/portTransport");
var import_transform = require("../transform/transform");
let loaderChannel;
function registerESMLoader() {
  if (process.env.PW_DISABLE_TS_ESM)
    return true;
  if ("Bun" in globalThis)
    return true;
  if (loaderChannel)
    return true;
  const register = require("node:module").register;
  if (!register)
    return false;
  const { port1, port2 } = new MessageChannel();
  register(import_url.default.pathToFileURL(require.resolve("../transform/esmLoader")), {
    data: { port: port2 },
    transferList: [port2]
  });
  loaderChannel = createPortTransport(port1);
  return true;
}
function createPortTransport(port) {
  return new import_portTransport.PortTransport(port, async (method, params) => {
    if (method === "pushToCompilationCache")
      (0, import_compilationCache.addToCompilationCache)(params.cache);
  });
}
async function startCollectingFileDeps() {
  if (!loaderChannel)
    return;
  await loaderChannel.send("startCollectingFileDeps", {});
}
async function stopCollectingFileDeps(file) {
  if (!loaderChannel)
    return;
  await loaderChannel.send("stopCollectingFileDeps", { file });
}
async function incorporateCompilationCache() {
  if (!loaderChannel)
    return;
  const result = await loaderChannel.send("getCompilationCache", {});
  (0, import_compilationCache.addToCompilationCache)(result.cache);
}
async function configureESMLoader() {
  if (!loaderChannel)
    return;
  await loaderChannel.send("setSingleTSConfig", { tsconfig: (0, import_transform.singleTSConfig)() });
  await loaderChannel.send("addToCompilationCache", { cache: (0, import_compilationCache.serializeCompilationCache)() });
}
async function configureESMLoaderTransformConfig() {
  if (!loaderChannel)
    return;
  await loaderChannel.send("setSingleTSConfig", { tsconfig: (0, import_transform.singleTSConfig)() });
  await loaderChannel.send("setTransformConfig", { config: (0, import_transform.transformConfig)() });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  configureESMLoader,
  configureESMLoaderTransformConfig,
  incorporateCompilationCache,
  registerESMLoader,
  startCollectingFileDeps,
  stopCollectingFileDeps
});
