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
var logFile_exports = {};
__export(logFile_exports, {
  LogFile: () => LogFile
});
module.exports = __toCommonJS(logFile_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_log = require("../log");
class LogFile {
  constructor(context, startTime, filePrefix, title) {
    this._stopped = false;
    this._line = 0;
    this._entries = 0;
    this._lastLine = 0;
    this._lastEntries = 0;
    this._writeChain = Promise.resolve();
    this._context = context;
    this._startTime = startTime;
    this._filePrefix = filePrefix;
    this._title = title;
  }
  appendLine(wallTime, text) {
    this._writeChain = this._writeChain.then(() => this._write(wallTime, text)).catch(import_log.logUnhandledError);
  }
  stop() {
    this._stopped = true;
  }
  async take(relativeTo) {
    const logChunk = await this._take();
    if (!logChunk)
      return void 0;
    const logFilePath = relativeTo ? import_path.default.relative(relativeTo, logChunk.file) : logChunk.file;
    const lineRange = logChunk.fromLine === logChunk.toLine ? `#L${logChunk.fromLine}` : `#L${logChunk.fromLine}-L${logChunk.toLine}`;
    return `${logFilePath}${lineRange}`;
  }
  async _take() {
    await this._writeChain;
    if (!this._file || this._entries === this._lastEntries)
      return void 0;
    const chunk = {
      type: this._title.toLowerCase(),
      file: this._file,
      fromLine: this._lastLine + 1,
      toLine: this._line,
      entryCount: this._entries - this._lastEntries
    };
    this._lastLine = this._line;
    this._lastEntries = this._entries;
    return chunk;
  }
  async _write(wallTime, text) {
    if (this._stopped)
      return;
    this._file ??= await this._context.outputFile({ prefix: this._filePrefix, ext: "log", date: new Date(this._startTime) }, { origin: "code" });
    const relativeTime = Math.round(wallTime - this._startTime);
    const renderedText = await text();
    const logLine = `[${String(relativeTime).padStart(8, " ")}ms] ${renderedText}
`;
    await import_fs.default.promises.appendFile(this._file, logLine);
    const lineCount = logLine.split("\n").length - 1;
    this._line += lineCount;
    this._entries++;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LogFile
});
