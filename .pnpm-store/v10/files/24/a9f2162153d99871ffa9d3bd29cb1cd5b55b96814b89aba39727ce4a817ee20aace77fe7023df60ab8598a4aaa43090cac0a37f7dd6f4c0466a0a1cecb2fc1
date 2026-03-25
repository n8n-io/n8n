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
var teleSuiteUpdater_exports = {};
__export(teleSuiteUpdater_exports, {
  TeleSuiteUpdater: () => TeleSuiteUpdater
});
module.exports = __toCommonJS(teleSuiteUpdater_exports);
var import_teleReceiver = require("./teleReceiver");
var import_testTree = require("./testTree");
class TeleSuiteUpdater {
  constructor(options) {
    this.loadErrors = [];
    this.progress = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    this._lastRunTestCount = 0;
    this._receiver = new import_teleReceiver.TeleReporterReceiver(this._createReporter(), {
      mergeProjects: true,
      mergeTestCases: true,
      resolvePath: createPathResolve(options.pathSeparator),
      clearPreviousResultsWhenTestBegins: true
    });
    this._options = options;
  }
  _createReporter() {
    return {
      version: () => "v2",
      onConfigure: (config) => {
        this.config = config;
        this._lastRunReceiver = new import_teleReceiver.TeleReporterReceiver({
          version: () => "v2",
          onBegin: (suite) => {
            this._lastRunTestCount = suite.allTests().length;
            this._lastRunReceiver = void 0;
          }
        }, {
          mergeProjects: true,
          mergeTestCases: false,
          resolvePath: createPathResolve(this._options.pathSeparator)
        });
        void this._lastRunReceiver.dispatch({ method: "onConfigure", params: { config } });
      },
      onBegin: (suite) => {
        if (!this.rootSuite)
          this.rootSuite = suite;
        if (this._testResultsSnapshot) {
          for (const test of this.rootSuite.allTests())
            test.results = this._testResultsSnapshot?.get(test.id) || test.results;
          this._testResultsSnapshot = void 0;
        }
        this.progress.total = this._lastRunTestCount;
        this.progress.passed = 0;
        this.progress.failed = 0;
        this.progress.skipped = 0;
        this._options.onUpdate(true);
      },
      onEnd: () => {
        this._options.onUpdate(true);
      },
      onTestBegin: (test, testResult) => {
        testResult[import_testTree.statusEx] = "running";
        this._options.onUpdate();
      },
      onTestEnd: (test, testResult) => {
        if (test.outcome() === "skipped")
          ++this.progress.skipped;
        else if (test.outcome() === "unexpected")
          ++this.progress.failed;
        else
          ++this.progress.passed;
        testResult[import_testTree.statusEx] = testResult.status;
        this._options.onUpdate();
      },
      onError: (error) => this._handleOnError(error),
      printsToStdio: () => false
    };
  }
  processGlobalReport(report) {
    const receiver = new import_teleReceiver.TeleReporterReceiver({
      version: () => "v2",
      onConfigure: (c) => {
        this.config = c;
      },
      onError: (error) => this._handleOnError(error)
    });
    for (const message of report)
      void receiver.dispatch(message);
  }
  processListReport(report) {
    const tests = this.rootSuite?.allTests() || [];
    this._testResultsSnapshot = new Map(tests.map((test) => [test.id, test.results]));
    this._receiver.reset();
    for (const message of report)
      void this._receiver.dispatch(message);
  }
  processTestReportEvent(message) {
    this._lastRunReceiver?.dispatch(message)?.catch(() => {
    });
    this._receiver.dispatch(message)?.catch(() => {
    });
  }
  _handleOnError(error) {
    this.loadErrors.push(error);
    this._options.onError?.(error);
    this._options.onUpdate();
  }
  asModel() {
    return {
      rootSuite: this.rootSuite || new import_teleReceiver.TeleSuite("", "root"),
      config: this.config,
      loadErrors: this.loadErrors,
      progress: this.progress
    };
  }
}
function createPathResolve(pathSeparator) {
  return (rootDir, relativePath) => {
    const segments = [];
    for (const segment of [...rootDir.split(pathSeparator), ...relativePath.split(pathSeparator)]) {
      const isAfterDrive = pathSeparator === "\\" && segments.length === 1 && segments[0].endsWith(":");
      const isFirst = !segments.length;
      if (!segment && !isFirst && !isAfterDrive)
        continue;
      if (segment === ".")
        continue;
      if (segment === "..") {
        segments.pop();
        continue;
      }
      segments.push(segment);
    }
    return segments.join(pathSeparator);
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TeleSuiteUpdater
});
