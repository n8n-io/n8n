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
var processHost_exports = {};
__export(processHost_exports, {
  ProcessHost: () => ProcessHost
});
module.exports = __toCommonJS(processHost_exports);
var import_child_process = __toESM(require("child_process"));
var import_events = require("events");
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
class ProcessHost extends import_events.EventEmitter {
  constructor(runnerScript, processName, env) {
    super();
    this._didSendStop = false;
    this._processDidExit = false;
    this._didExitAndRanOnExit = false;
    this._lastMessageId = 0;
    this._callbacks = /* @__PURE__ */ new Map();
    this._producedEnv = {};
    this._requestHandlers = /* @__PURE__ */ new Map();
    this._runnerScript = runnerScript;
    this._processName = processName;
    this._extraEnv = env;
  }
  async startRunner(runnerParams, options = {}) {
    (0, import_utils.assert)(!this.process, "Internal error: starting the same process twice");
    this.process = import_child_process.default.fork(require.resolve("../common/process"), {
      // Note: we pass detached:false, so that workers are in the same process group.
      // This way Ctrl+C or a kill command can shutdown all workers in case they misbehave.
      // Otherwise user can end up with a bunch of workers stuck in a busy loop without self-destructing.
      detached: false,
      env: {
        ...process.env,
        ...this._extraEnv
      },
      stdio: [
        "ignore",
        options.onStdOut ? "pipe" : "inherit",
        options.onStdErr && !process.env.PW_RUNNER_DEBUG ? "pipe" : "inherit",
        "ipc"
      ]
    });
    this.process.on("exit", async (code, signal) => {
      this._processDidExit = true;
      await this.onExit();
      this._didExitAndRanOnExit = true;
      this.emit("exit", { unexpectedly: !this._didSendStop, code, signal });
    });
    this.process.on("error", (e) => {
    });
    this.process.on("message", (message) => {
      if (import_utilsBundle.debug.enabled("pw:test:protocol"))
        (0, import_utilsBundle.debug)("pw:test:protocol")("\u25C0 RECV " + JSON.stringify(message));
      if (message.method === "__env_produced__") {
        const producedEnv = message.params;
        this._producedEnv = Object.fromEntries(producedEnv.map((e) => [e[0], e[1] ?? void 0]));
      } else if (message.method === "__dispatch__") {
        const { id, error: error2, method, params, result } = message.params;
        if (id && this._callbacks.has(id)) {
          const { resolve, reject } = this._callbacks.get(id);
          this._callbacks.delete(id);
          if (error2) {
            const errorObject = new Error(error2.message);
            errorObject.stack = error2.stack;
            reject(errorObject);
          } else {
            resolve(result);
          }
        } else {
          this.emit(method, params);
        }
      } else if (message.method === "__request__") {
        const { id, method, params } = message.params;
        const handler = this._requestHandlers.get(method);
        if (!handler) {
          this.send({ method: "__response__", params: { id, error: { message: "Unknown method" } } });
        } else {
          handler(params).then((result) => {
            this.send({ method: "__response__", params: { id, result } });
          }).catch((error2) => {
            this.send({ method: "__response__", params: { id, error: { message: error2.message } } });
          });
        }
      } else {
        this.emit(message.method, message.params);
      }
    });
    if (options.onStdOut)
      this.process.stdout?.on("data", options.onStdOut);
    if (options.onStdErr)
      this.process.stderr?.on("data", options.onStdErr);
    const error = await new Promise((resolve) => {
      this.process.once("exit", (code, signal) => resolve({ unexpectedly: true, code, signal }));
      this.once("ready", () => resolve(void 0));
    });
    if (error)
      return error;
    const processParams = {
      processName: this._processName,
      timeOrigin: (0, import_utils.timeOrigin)()
    };
    this.send({
      method: "__init__",
      params: {
        processParams,
        runnerScript: this._runnerScript,
        runnerParams
      }
    });
  }
  sendMessage(message) {
    const id = ++this._lastMessageId;
    this.send({
      method: "__dispatch__",
      params: { id, ...message }
    });
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject });
    });
  }
  sendMessageNoReply(message) {
    this.sendMessage(message).catch(() => {
    });
  }
  async onExit() {
  }
  onRequest(method, handler) {
    this._requestHandlers.set(method, handler);
  }
  async stop() {
    if (!this._processDidExit && !this._didSendStop) {
      this.send({ method: "__stop__" });
      this._didSendStop = true;
    }
    if (!this._didExitAndRanOnExit)
      await new Promise((f) => this.once("exit", f));
  }
  didSendStop() {
    return this._didSendStop;
  }
  producedEnv() {
    return this._producedEnv;
  }
  send(message) {
    if (import_utilsBundle.debug.enabled("pw:test:protocol"))
      (0, import_utilsBundle.debug)("pw:test:protocol")("SEND \u25BA " + JSON.stringify(message));
    this.process?.send(message);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProcessHost
});
