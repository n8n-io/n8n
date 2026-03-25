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
var sessionLog_exports = {};
__export(sessionLog_exports, {
  SessionLog: () => SessionLog
});
module.exports = __toCommonJS(sessionLog_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_config = require("./config");
var import_response = require("./response");
class SessionLog {
  constructor(sessionFolder) {
    this._sessionFileQueue = Promise.resolve();
    this._folder = sessionFolder;
    this._file = import_path.default.join(this._folder, "session.md");
  }
  static async create(config, clientInfo) {
    const sessionFolder = await (0, import_config.outputFile)(config, clientInfo, `session-${Date.now()}`, { origin: "code", title: "Saving session" });
    await import_fs.default.promises.mkdir(sessionFolder, { recursive: true });
    console.error(`Session: ${sessionFolder}`);
    return new SessionLog(sessionFolder);
  }
  logResponse(toolName, toolArgs, responseObject) {
    const parsed = (0, import_response.parseResponse)(responseObject);
    if (parsed)
      delete parsed.text;
    const lines = [""];
    lines.push(
      `### Tool call: ${toolName}`,
      `- Args`,
      "```json",
      JSON.stringify(toolArgs, null, 2),
      "```"
    );
    if (parsed) {
      lines.push(`- Result`);
      lines.push("```json");
      lines.push(JSON.stringify(parsed, null, 2));
      lines.push("```");
    }
    lines.push("");
    this._sessionFileQueue = this._sessionFileQueue.then(() => import_fs.default.promises.appendFile(this._file, lines.join("\n")));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SessionLog
});
