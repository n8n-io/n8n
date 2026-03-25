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
var loaderHost_exports = {};
__export(loaderHost_exports, {
  InProcessLoaderHost: () => InProcessLoaderHost,
  OutOfProcessLoaderHost: () => OutOfProcessLoaderHost
});
module.exports = __toCommonJS(loaderHost_exports);
var import_processHost = require("./processHost");
var import_esmLoaderHost = require("../common/esmLoaderHost");
var import_ipc = require("../common/ipc");
var import_poolBuilder = require("../common/poolBuilder");
var import_test = require("../common/test");
var import_testLoader = require("../common/testLoader");
var import_compilationCache = require("../transform/compilationCache");
class InProcessLoaderHost {
  constructor(config) {
    this._config = config;
    this._poolBuilder = import_poolBuilder.PoolBuilder.createForLoader();
  }
  async start(errors) {
    return true;
  }
  async loadTestFile(file, testErrors) {
    const result = await (0, import_testLoader.loadTestFile)(file, this._config, testErrors);
    this._poolBuilder.buildPools(result, testErrors);
    return result;
  }
  async stop() {
    await (0, import_esmLoaderHost.incorporateCompilationCache)();
  }
}
class OutOfProcessLoaderHost {
  constructor(config) {
    this._config = config;
    this._processHost = new import_processHost.ProcessHost(require.resolve("../loader/loaderMain.js"), "loader", {});
  }
  async start(errors) {
    const startError = await this._processHost.startRunner((0, import_ipc.serializeConfig)(this._config, false));
    if (startError) {
      errors.push({
        message: `Test loader process failed to start with code "${startError.code}" and signal "${startError.signal}"`
      });
      return false;
    }
    return true;
  }
  async loadTestFile(file, testErrors) {
    const result = await this._processHost.sendMessage({ method: "loadTestFile", params: { file } });
    testErrors.push(...result.testErrors);
    return import_test.Suite._deepParse(result.fileSuite);
  }
  async stop() {
    const result = await this._processHost.sendMessage({ method: "getCompilationCacheFromLoader" });
    (0, import_compilationCache.addToCompilationCache)(result);
    await this._processHost.stop();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InProcessLoaderHost,
  OutOfProcessLoaderHost
});
