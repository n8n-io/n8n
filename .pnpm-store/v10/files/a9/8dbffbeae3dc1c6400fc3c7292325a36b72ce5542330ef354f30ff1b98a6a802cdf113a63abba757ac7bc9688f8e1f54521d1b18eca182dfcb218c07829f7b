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
var workerHost_exports = {};
__export(workerHost_exports, {
  WorkerHost: () => WorkerHost
});
module.exports = __toCommonJS(workerHost_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_processHost = require("./processHost");
var import_ipc = require("../common/ipc");
var import_folders = require("../isomorphic/folders");
let lastWorkerIndex = 0;
class WorkerHost extends import_processHost.ProcessHost {
  constructor(testGroup, options) {
    const workerIndex = lastWorkerIndex++;
    super(require.resolve("../worker/workerMain.js"), `worker-${workerIndex}`, {
      ...options.extraEnv,
      FORCE_COLOR: "1",
      DEBUG_COLORS: process.env.DEBUG_COLORS === void 0 ? "1" : process.env.DEBUG_COLORS
    });
    this._didFail = false;
    this.workerIndex = workerIndex;
    this.parallelIndex = options.parallelIndex;
    this._hash = testGroup.workerHash;
    this._params = {
      workerIndex: this.workerIndex,
      parallelIndex: options.parallelIndex,
      repeatEachIndex: testGroup.repeatEachIndex,
      projectId: testGroup.projectId,
      config: options.config,
      artifactsDir: import_path.default.join(options.outputDir, (0, import_folders.artifactsFolderName)(workerIndex)),
      pauseOnError: options.pauseOnError,
      pauseAtEnd: options.pauseAtEnd
    };
  }
  artifactsDir() {
    return this._params.artifactsDir;
  }
  async start() {
    await import_fs.default.promises.mkdir(this._params.artifactsDir, { recursive: true });
    return await this.startRunner(this._params, {
      onStdOut: (chunk) => this.emit("stdOut", (0, import_ipc.stdioChunkToParams)(chunk)),
      onStdErr: (chunk) => this.emit("stdErr", (0, import_ipc.stdioChunkToParams)(chunk))
    });
  }
  async onExit() {
    await (0, import_utils.removeFolders)([this._params.artifactsDir]);
  }
  async stop(didFail) {
    if (didFail)
      this._didFail = true;
    await super.stop();
  }
  runTestGroup(runPayload) {
    this.sendMessageNoReply({ method: "runTestGroup", params: runPayload });
  }
  async sendCustomMessage(payload) {
    return await this.sendMessage({ method: "customMessage", params: payload });
  }
  sendResume(payload) {
    this.sendMessageNoReply({ method: "resume", params: payload });
  }
  hash() {
    return this._hash;
  }
  projectId() {
    return this._params.projectId;
  }
  didFail() {
    return this._didFail;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WorkerHost
});
