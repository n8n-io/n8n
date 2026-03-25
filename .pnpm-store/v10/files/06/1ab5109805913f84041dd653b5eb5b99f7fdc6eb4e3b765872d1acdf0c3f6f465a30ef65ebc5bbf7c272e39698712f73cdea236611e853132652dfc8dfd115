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
var debugLogger_exports = {};
__export(debugLogger_exports, {
  RecentLogsCollector: () => RecentLogsCollector,
  debugLogger: () => debugLogger
});
module.exports = __toCommonJS(debugLogger_exports);
var import_fs = __toESM(require("fs"));
var import_utilsBundle = require("../../utilsBundle");
const debugLoggerColorMap = {
  "api": 45,
  // cyan
  "protocol": 34,
  // green
  "install": 34,
  // green
  "download": 34,
  // green
  "browser": 0,
  // reset
  "socks": 92,
  // purple
  "client-certificates": 92,
  // purple
  "error": 160,
  // red,
  "channel": 33,
  // blue
  "server": 45,
  // cyan
  "server:channel": 34,
  // green
  "server:metadata": 33,
  // blue,
  "recorder": 45
  // cyan
};
class DebugLogger {
  constructor() {
    this._debuggers = /* @__PURE__ */ new Map();
    if (process.env.DEBUG_FILE) {
      const ansiRegex = new RegExp([
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|"), "g");
      const stream = import_fs.default.createWriteStream(process.env.DEBUG_FILE);
      import_utilsBundle.debug.log = (data) => {
        stream.write(data.replace(ansiRegex, ""));
        stream.write("\n");
      };
    }
  }
  log(name, message) {
    let cachedDebugger = this._debuggers.get(name);
    if (!cachedDebugger) {
      cachedDebugger = (0, import_utilsBundle.debug)(`pw:${name}`);
      this._debuggers.set(name, cachedDebugger);
      cachedDebugger.color = debugLoggerColorMap[name] || 0;
    }
    cachedDebugger(message);
  }
  isEnabled(name) {
    return import_utilsBundle.debug.enabled(`pw:${name}`);
  }
}
const debugLogger = new DebugLogger();
const kLogCount = 150;
class RecentLogsCollector {
  constructor() {
    this._logs = [];
    this._listeners = [];
  }
  log(message) {
    this._logs.push(message);
    if (this._logs.length === kLogCount * 2)
      this._logs.splice(0, kLogCount);
    for (const listener of this._listeners)
      listener(message);
  }
  recentLogs() {
    if (this._logs.length > kLogCount)
      return this._logs.slice(-kLogCount);
    return this._logs;
  }
  onMessage(listener) {
    for (const message of this._logs)
      listener(message);
    this._listeners.push(listener);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RecentLogsCollector,
  debugLogger
});
