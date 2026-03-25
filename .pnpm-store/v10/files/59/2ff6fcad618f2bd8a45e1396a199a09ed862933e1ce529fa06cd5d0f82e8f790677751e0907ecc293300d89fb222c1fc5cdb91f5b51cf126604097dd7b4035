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
var teleEmitter_exports = {};
__export(teleEmitter_exports, {
  TeleReporterEmitter: () => TeleReporterEmitter
});
module.exports = __toCommonJS(teleEmitter_exports);
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_teleReceiver = require("../isomorphic/teleReceiver");
class TeleReporterEmitter {
  constructor(messageSink, options = {}) {
    this._resultKnownAttachmentCounts = /* @__PURE__ */ new Map();
    this._resultKnownErrorCounts = /* @__PURE__ */ new Map();
    // In case there is blob reporter and UI mode, make sure one doesn't override
    // the id assigned by the other.
    this._idSymbol = Symbol("id");
    this._messageSink = messageSink;
    this._emitterOptions = options;
  }
  version() {
    return "v2";
  }
  onConfigure(config) {
    this._rootDir = config.rootDir;
    this._messageSink({ method: "onConfigure", params: { config: this._serializeConfig(config) } });
  }
  onBegin(suite) {
    const projects = suite.suites.map((projectSuite) => this._serializeProject(projectSuite));
    for (const project of projects)
      this._messageSink({ method: "onProject", params: { project } });
    this._messageSink({ method: "onBegin", params: void 0 });
  }
  onTestBegin(test, result) {
    result[this._idSymbol] = (0, import_utils.createGuid)();
    this._messageSink({
      method: "onTestBegin",
      params: {
        testId: test.id,
        result: this._serializeResultStart(result)
      }
    });
  }
  async onTestPaused(test, result) {
    const resultId = result[this._idSymbol];
    this._resultKnownErrorCounts.set(resultId, result.errors.length);
    this._messageSink({
      method: "onTestPaused",
      params: {
        testId: test.id,
        resultId,
        errors: result.errors
      }
    });
    await new Promise(() => {
    });
  }
  onTestEnd(test, result) {
    const testEnd = {
      testId: test.id,
      expectedStatus: test.expectedStatus,
      timeout: test.timeout,
      annotations: []
    };
    this._sendNewAttachments(result, test.id);
    this._messageSink({
      method: "onTestEnd",
      params: {
        test: testEnd,
        result: this._serializeResultEnd(result)
      }
    });
    const resultId = result[this._idSymbol];
    this._resultKnownAttachmentCounts.delete(resultId);
    this._resultKnownErrorCounts.delete(resultId);
  }
  onStepBegin(test, result, step) {
    step[this._idSymbol] = (0, import_utils.createGuid)();
    this._messageSink({
      method: "onStepBegin",
      params: {
        testId: test.id,
        resultId: result[this._idSymbol],
        step: this._serializeStepStart(step)
      }
    });
  }
  onStepEnd(test, result, step) {
    const resultId = result[this._idSymbol];
    this._sendNewAttachments(result, test.id);
    this._messageSink({
      method: "onStepEnd",
      params: {
        testId: test.id,
        resultId,
        step: this._serializeStepEnd(step, result)
      }
    });
  }
  onError(error) {
    this._messageSink({
      method: "onError",
      params: { error }
    });
  }
  onStdOut(chunk, test, result) {
    this._onStdIO("stdout", chunk, test, result);
  }
  onStdErr(chunk, test, result) {
    this._onStdIO("stderr", chunk, test, result);
  }
  _onStdIO(type, chunk, test, result) {
    if (this._emitterOptions.omitOutput)
      return;
    const isBase64 = typeof chunk !== "string";
    const data = isBase64 ? chunk.toString("base64") : chunk;
    this._messageSink({
      method: "onStdIO",
      params: { testId: test?.id, resultId: result ? result[this._idSymbol] : void 0, type, data, isBase64 }
    });
  }
  async onEnd(result) {
    const resultPayload = {
      status: result.status,
      startTime: result.startTime.getTime(),
      duration: result.duration
    };
    this._messageSink({
      method: "onEnd",
      params: {
        result: resultPayload
      }
    });
  }
  printsToStdio() {
    return false;
  }
  _serializeConfig(config) {
    return {
      configFile: this._relativePath(config.configFile),
      globalTimeout: config.globalTimeout,
      maxFailures: config.maxFailures,
      metadata: config.metadata,
      rootDir: config.rootDir,
      version: config.version,
      workers: config.workers,
      globalSetup: config.globalSetup,
      globalTeardown: config.globalTeardown,
      tags: config.tags,
      webServer: config.webServer
    };
  }
  _serializeProject(suite) {
    const project = suite.project();
    const report = {
      metadata: project.metadata,
      name: project.name,
      outputDir: this._relativePath(project.outputDir),
      repeatEach: project.repeatEach,
      retries: project.retries,
      testDir: this._relativePath(project.testDir),
      testIgnore: (0, import_teleReceiver.serializeRegexPatterns)(project.testIgnore),
      testMatch: (0, import_teleReceiver.serializeRegexPatterns)(project.testMatch),
      timeout: project.timeout,
      suites: suite.suites.map((fileSuite) => {
        return this._serializeSuite(fileSuite);
      }),
      grep: (0, import_teleReceiver.serializeRegexPatterns)(project.grep),
      grepInvert: (0, import_teleReceiver.serializeRegexPatterns)(project.grepInvert || []),
      dependencies: project.dependencies,
      snapshotDir: this._relativePath(project.snapshotDir),
      teardown: project.teardown,
      use: this._serializeProjectUseOptions(project.use)
    };
    return report;
  }
  _serializeProjectUseOptions(use) {
    return {
      testIdAttribute: use.testIdAttribute
    };
  }
  _serializeSuite(suite) {
    const result = {
      title: suite.title,
      location: this._relativeLocation(suite.location),
      entries: suite.entries().map((e) => {
        if (e.type === "test")
          return this._serializeTest(e);
        return this._serializeSuite(e);
      })
    };
    return result;
  }
  _serializeTest(test) {
    return {
      testId: test.id,
      title: test.title,
      location: this._relativeLocation(test.location),
      retries: test.retries,
      tags: test.tags,
      repeatEachIndex: test.repeatEachIndex,
      annotations: this._relativeAnnotationLocations(test.annotations)
    };
  }
  _serializeResultStart(result) {
    return {
      id: result[this._idSymbol],
      retry: result.retry,
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex,
      startTime: +result.startTime
    };
  }
  _serializeResultEnd(result) {
    const id = result[this._idSymbol];
    return {
      id,
      duration: result.duration,
      status: result.status,
      errors: this._resultKnownErrorCounts.has(id) ? result.errors.slice(this._resultKnownAttachmentCounts.get(id)) : result.errors,
      annotations: result.annotations?.length ? this._relativeAnnotationLocations(result.annotations) : void 0
    };
  }
  _sendNewAttachments(result, testId) {
    const resultId = result[this._idSymbol];
    const knownAttachmentCount = this._resultKnownAttachmentCounts.get(resultId) ?? 0;
    if (result.attachments.length > knownAttachmentCount) {
      this._messageSink({
        method: "onAttach",
        params: {
          testId,
          resultId,
          attachments: this._serializeAttachments(result.attachments.slice(knownAttachmentCount))
        }
      });
    }
    this._resultKnownAttachmentCounts.set(resultId, result.attachments.length);
  }
  _serializeAttachments(attachments) {
    return attachments.map((a) => {
      const { body, ...rest } = a;
      return {
        ...rest,
        // There is no Buffer in the browser, so there is no point in sending the data there.
        base64: body && !this._emitterOptions.omitBuffers ? body.toString("base64") : void 0
      };
    });
  }
  _serializeStepStart(step) {
    return {
      id: step[this._idSymbol],
      parentStepId: step.parent?.[this._idSymbol],
      title: step.title,
      category: step.category,
      startTime: +step.startTime,
      location: this._relativeLocation(step.location)
    };
  }
  _serializeStepEnd(step, result) {
    return {
      id: step[this._idSymbol],
      duration: step.duration,
      error: step.error,
      attachments: step.attachments.length ? step.attachments.map((a) => result.attachments.indexOf(a)) : void 0,
      annotations: step.annotations.length ? this._relativeAnnotationLocations(step.annotations) : void 0
    };
  }
  _relativeAnnotationLocations(annotations) {
    return annotations.map((annotation) => ({
      ...annotation,
      location: annotation.location ? this._relativeLocation(annotation.location) : void 0
    }));
  }
  _relativeLocation(location) {
    if (!location)
      return location;
    return {
      ...location,
      file: this._relativePath(location.file)
    };
  }
  _relativePath(absolutePath) {
    if (!absolutePath)
      return absolutePath;
    return import_path.default.relative(this._rootDir, absolutePath);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TeleReporterEmitter
});
