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
var process_exports = {};
__export(process_exports, {
  ProcessRunner: () => ProcessRunner
});
module.exports = __toCommonJS(process_exports);
var import_utils = require("playwright-core/lib/utils");
var import_util = require("../util");
class ProcessRunner {
  async gracefullyClose() {
  }
  dispatchEvent(method, params) {
    const response = { method, params };
    sendMessageToParent({ method: "__dispatch__", params: response });
  }
  async sendRequest(method, params) {
    return await sendRequestToParent(method, params);
  }
  async sendMessageNoReply(method, params) {
    void sendRequestToParent(method, params).catch(() => {
    });
  }
}
let gracefullyCloseCalled = false;
let forceExitInitiated = false;
sendMessageToParent({ method: "ready" });
process.on("disconnect", () => gracefullyCloseAndExit(true));
process.on("SIGINT", () => {
});
process.on("SIGTERM", () => {
});
let processRunner;
let processName;
const startingEnv = { ...process.env };
process.on("message", async (message) => {
  if (message.method === "__init__") {
    const { processParams, runnerParams, runnerScript } = message.params;
    void (0, import_utils.startProfiling)();
    (0, import_utils.setTimeOrigin)(processParams.timeOrigin);
    const { create } = require(runnerScript);
    processRunner = create(runnerParams);
    processName = processParams.processName;
    return;
  }
  if (message.method === "__stop__") {
    const keys = /* @__PURE__ */ new Set([...Object.keys(process.env), ...Object.keys(startingEnv)]);
    const producedEnv = [...keys].filter((key) => startingEnv[key] !== process.env[key]).map((key) => [key, process.env[key] ?? null]);
    sendMessageToParent({ method: "__env_produced__", params: producedEnv });
    await gracefullyCloseAndExit(false);
    return;
  }
  if (message.method === "__dispatch__") {
    const { id, method, params } = message.params;
    try {
      const result = await processRunner[method](params);
      const response = { id, result };
      sendMessageToParent({ method: "__dispatch__", params: response });
    } catch (e) {
      const response = { id, error: (0, import_util.serializeError)(e) };
      sendMessageToParent({ method: "__dispatch__", params: response });
    }
  }
  if (message.method === "__response__")
    handleResponseFromParent(message.params);
});
const kForceExitTimeout = +(process.env.PWTEST_FORCE_EXIT_TIMEOUT || 3e4);
async function gracefullyCloseAndExit(forceExit) {
  if (forceExit && !forceExitInitiated) {
    forceExitInitiated = true;
    setTimeout(() => process.exit(0), kForceExitTimeout);
  }
  if (!gracefullyCloseCalled) {
    gracefullyCloseCalled = true;
    await processRunner?.gracefullyClose().catch(() => {
    });
    if (processName)
      await (0, import_utils.stopProfiling)(processName).catch(() => {
      });
    process.exit(0);
  }
}
function sendMessageToParent(message) {
  try {
    process.send(message);
  } catch (e) {
    try {
      JSON.stringify(message);
    } catch {
      throw e;
    }
  }
}
let lastId = 0;
const requestCallbacks = /* @__PURE__ */ new Map();
async function sendRequestToParent(method, params) {
  const id = ++lastId;
  sendMessageToParent({ method: "__request__", params: { id, method, params } });
  const promise = new import_utils.ManualPromise();
  requestCallbacks.set(id, promise);
  return promise;
}
function handleResponseFromParent(response) {
  const promise = requestCallbacks.get(response.id);
  if (!promise)
    return;
  requestCallbacks.delete(response.id);
  if (response.error)
    promise.reject(new Error(response.error.message));
  else
    promise.resolve(response.result);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProcessRunner
});
