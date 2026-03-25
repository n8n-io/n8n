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
var testTracing_exports = {};
__export(testTracing_exports, {
  TestTracing: () => TestTracing,
  testTraceEntryName: () => testTraceEntryName
});
module.exports = __toCommonJS(testTracing_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_zipBundle = require("playwright-core/lib/zipBundle");
var import_util = require("../util");
const testTraceEntryName = "test.trace";
const version = 8;
let traceOrdinal = 0;
class TestTracing {
  constructor(testInfo, artifactsDir) {
    this._traceEvents = [];
    this._temporaryTraceFiles = [];
    this._didFinishTestFunctionAndAfterEachHooks = false;
    this._testInfo = testInfo;
    this._artifactsDir = artifactsDir;
    this._tracesDir = import_path.default.join(this._artifactsDir, "traces");
    this._contextCreatedEvent = {
      version,
      type: "context-options",
      origin: "testRunner",
      browserName: "",
      playwrightVersion: (0, import_utils.getPlaywrightVersion)(),
      options: {},
      platform: process.platform,
      wallTime: Date.now(),
      monotonicTime: (0, import_utils.monotonicTime)(),
      sdkLanguage: "javascript"
    };
    this._appendTraceEvent(this._contextCreatedEvent);
  }
  _shouldCaptureTrace() {
    if (this._options?.mode === "on")
      return true;
    if (this._options?.mode === "retain-on-failure")
      return true;
    if (this._options?.mode === "on-first-retry" && this._testInfo.retry === 1)
      return true;
    if (this._options?.mode === "on-all-retries" && this._testInfo.retry > 0)
      return true;
    if (this._options?.mode === "retain-on-first-failure" && this._testInfo.retry === 0)
      return true;
    return false;
  }
  async startIfNeeded(value) {
    const defaultTraceOptions = { screenshots: true, snapshots: true, sources: true, attachments: true, _live: false, mode: "off" };
    if (!value) {
      this._options = defaultTraceOptions;
    } else if (typeof value === "string") {
      this._options = { ...defaultTraceOptions, mode: value === "retry-with-trace" ? "on-first-retry" : value };
    } else {
      const mode = value.mode || "off";
      this._options = { ...defaultTraceOptions, ...value, mode: mode === "retry-with-trace" ? "on-first-retry" : mode };
    }
    if (!this._shouldCaptureTrace()) {
      this._options = void 0;
      return;
    }
    if (!this._liveTraceFile && this._options._live) {
      this._liveTraceFile = { file: import_path.default.join(this._tracesDir, `${this._testInfo.testId}-test.trace`), fs: new import_utils.SerializedFS() };
      this._liveTraceFile.fs.mkdir(import_path.default.dirname(this._liveTraceFile.file));
      const data = this._traceEvents.map((e) => JSON.stringify(e)).join("\n") + "\n";
      this._liveTraceFile.fs.writeFile(this._liveTraceFile.file, data);
    }
  }
  didFinishTestFunctionAndAfterEachHooks() {
    this._didFinishTestFunctionAndAfterEachHooks = true;
  }
  artifactsDir() {
    return this._artifactsDir;
  }
  tracesDir() {
    return this._tracesDir;
  }
  traceTitle() {
    return [import_path.default.relative(this._testInfo.project.testDir, this._testInfo.file) + ":" + this._testInfo.line, ...this._testInfo.titlePath.slice(1)].join(" \u203A ");
  }
  generateNextTraceRecordingName() {
    const ordinalSuffix = traceOrdinal ? `-recording${traceOrdinal}` : "";
    ++traceOrdinal;
    const retrySuffix = this._testInfo.retry ? `-retry${this._testInfo.retry}` : "";
    return `${this._testInfo.testId}${retrySuffix}${ordinalSuffix}`;
  }
  _generateNextTraceRecordingPath() {
    const file = import_path.default.join(this._artifactsDir, (0, import_utils.createGuid)() + ".zip");
    this._temporaryTraceFiles.push(file);
    return file;
  }
  traceOptions() {
    return this._options;
  }
  maybeGenerateNextTraceRecordingPath() {
    if (this._didFinishTestFunctionAndAfterEachHooks && this._shouldAbandonTrace())
      return;
    return this._generateNextTraceRecordingPath();
  }
  _shouldAbandonTrace() {
    if (!this._options)
      return true;
    const testFailed = this._testInfo.status !== this._testInfo.expectedStatus;
    return !testFailed && (this._options.mode === "retain-on-failure" || this._options.mode === "retain-on-first-failure");
  }
  async stopIfNeeded() {
    if (!this._options)
      return;
    const error = await this._liveTraceFile?.fs.syncAndGetError();
    if (error)
      throw error;
    if (this._shouldAbandonTrace()) {
      for (const file of this._temporaryTraceFiles)
        await import_fs.default.promises.unlink(file).catch(() => {
        });
      return;
    }
    const zipFile = new import_zipBundle.yazl.ZipFile();
    if (!this._options?.attachments) {
      for (const event of this._traceEvents) {
        if (event.type === "after")
          delete event.attachments;
      }
    }
    if (this._options?.sources) {
      const sourceFiles = /* @__PURE__ */ new Set();
      for (const event of this._traceEvents) {
        if (event.type === "before") {
          for (const frame of event.stack || [])
            sourceFiles.add(frame.file);
        }
      }
      for (const sourceFile of sourceFiles) {
        await import_fs.default.promises.readFile(sourceFile, "utf8").then((source) => {
          zipFile.addBuffer(Buffer.from(source), "resources/src@" + (0, import_utils.calculateSha1)(sourceFile) + ".txt");
        }).catch(() => {
        });
      }
    }
    const sha1s = /* @__PURE__ */ new Set();
    for (const event of this._traceEvents.filter((e) => e.type === "after")) {
      for (const attachment of event.attachments || []) {
        let contentPromise;
        if (attachment.path)
          contentPromise = import_fs.default.promises.readFile(attachment.path).catch(() => void 0);
        else if (attachment.base64)
          contentPromise = Promise.resolve(Buffer.from(attachment.base64, "base64"));
        const content = await contentPromise;
        if (content === void 0)
          continue;
        const sha1 = (0, import_utils.calculateSha1)(content);
        attachment.sha1 = sha1;
        delete attachment.path;
        delete attachment.base64;
        if (sha1s.has(sha1))
          continue;
        sha1s.add(sha1);
        zipFile.addBuffer(content, "resources/" + sha1);
      }
    }
    const traceContent = Buffer.from(this._traceEvents.map((e) => JSON.stringify(e)).join("\n"));
    zipFile.addBuffer(traceContent, testTraceEntryName);
    await new Promise((f) => {
      zipFile.end(void 0, () => {
        zipFile.outputStream.pipe(import_fs.default.createWriteStream(this._generateNextTraceRecordingPath())).on("close", f);
      });
    });
    const tracePath = this._testInfo.outputPath("trace.zip");
    await mergeTraceFiles(tracePath, this._temporaryTraceFiles);
    this._testInfo.attachments.push({ name: "trace", path: tracePath, contentType: "application/zip" });
  }
  appendForError(error) {
    const rawStack = error.stack?.split("\n") || [];
    const stack = rawStack ? (0, import_util.filteredStackTrace)(rawStack) : [];
    this._appendTraceEvent({
      type: "error",
      message: this._formatError(error),
      stack
    });
  }
  _formatError(error) {
    const parts = [error.message || String(error.value)];
    if (error.cause)
      parts.push("[cause]: " + this._formatError(error.cause));
    return parts.join("\n");
  }
  appendStdioToTrace(type, chunk) {
    this._appendTraceEvent({
      type,
      timestamp: (0, import_utils.monotonicTime)(),
      text: typeof chunk === "string" ? chunk : void 0,
      base64: typeof chunk === "string" ? void 0 : chunk.toString("base64")
    });
  }
  appendBeforeActionForStep(options) {
    this._appendTraceEvent({
      type: "before",
      callId: options.stepId,
      stepId: options.stepId,
      parentId: options.parentId,
      startTime: (0, import_utils.monotonicTime)(),
      class: "Test",
      method: options.category,
      title: options.title,
      params: Object.fromEntries(Object.entries(options.params || {}).map(([name, value]) => [name, generatePreview(value)])),
      stack: options.stack,
      group: options.group
    });
  }
  appendAfterActionForStep(callId, error, attachments = [], annotations) {
    this._appendTraceEvent({
      type: "after",
      callId,
      endTime: (0, import_utils.monotonicTime)(),
      attachments: serializeAttachments(attachments),
      annotations,
      error
    });
  }
  _appendTraceEvent(event) {
    this._traceEvents.push(event);
    if (this._liveTraceFile)
      this._liveTraceFile.fs.appendFile(this._liveTraceFile.file, JSON.stringify(event) + "\n", true);
  }
}
function serializeAttachments(attachments) {
  if (attachments.length === 0)
    return void 0;
  return attachments.filter((a) => a.name !== "trace").map((a) => {
    return {
      name: a.name,
      contentType: a.contentType,
      path: a.path,
      base64: a.body?.toString("base64")
    };
  });
}
function generatePreview(value, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(value))
    return "";
  visited.add(value);
  if (typeof value === "string")
    return value;
  if (typeof value === "number")
    return value.toString();
  if (typeof value === "boolean")
    return value.toString();
  if (value === null)
    return "null";
  if (value === void 0)
    return "undefined";
  if (Array.isArray(value))
    return "[" + value.map((v) => generatePreview(v, visited)).join(", ") + "]";
  if (typeof value === "object")
    return "Object";
  return String(value);
}
async function mergeTraceFiles(fileName, temporaryTraceFiles) {
  temporaryTraceFiles = temporaryTraceFiles.filter((file) => import_fs.default.existsSync(file));
  if (temporaryTraceFiles.length === 1) {
    await import_fs.default.promises.rename(temporaryTraceFiles[0], fileName);
    return;
  }
  const mergePromise = new import_utils.ManualPromise();
  const zipFile = new import_zipBundle.yazl.ZipFile();
  const entryNames = /* @__PURE__ */ new Set();
  zipFile.on("error", (error) => mergePromise.reject(error));
  for (let i = temporaryTraceFiles.length - 1; i >= 0; --i) {
    const tempFile = temporaryTraceFiles[i];
    const promise = new import_utils.ManualPromise();
    import_zipBundle.yauzl.open(tempFile, (err, inZipFile) => {
      if (err) {
        promise.reject(err);
        return;
      }
      let pendingEntries = inZipFile.entryCount;
      inZipFile.on("entry", (entry) => {
        let entryName = entry.fileName;
        if (entry.fileName === testTraceEntryName) {
        } else if (entry.fileName.match(/trace\.[a-z]*$/)) {
          entryName = i + "-" + entry.fileName;
        }
        if (entryNames.has(entryName)) {
          if (--pendingEntries === 0)
            promise.resolve();
          return;
        }
        entryNames.add(entryName);
        inZipFile.openReadStream(entry, (err2, readStream) => {
          if (err2) {
            promise.reject(err2);
            return;
          }
          zipFile.addReadStream(readStream, entryName);
          if (--pendingEntries === 0)
            promise.resolve();
        });
      });
    });
    await promise;
  }
  zipFile.end(void 0, () => {
    zipFile.outputStream.pipe(import_fs.default.createWriteStream(fileName)).on("close", () => {
      void Promise.all(temporaryTraceFiles.map((tempFile) => import_fs.default.promises.unlink(tempFile))).then(() => {
        mergePromise.resolve();
      }).catch((error) => mergePromise.reject(error));
    }).on("error", (error) => mergePromise.reject(error));
  });
  await mergePromise;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestTracing,
  testTraceEntryName
});
