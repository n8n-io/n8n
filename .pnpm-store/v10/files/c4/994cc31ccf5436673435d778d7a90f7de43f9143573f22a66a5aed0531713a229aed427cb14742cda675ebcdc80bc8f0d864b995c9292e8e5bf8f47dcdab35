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
var failureTracker_exports = {};
__export(failureTracker_exports, {
  FailureTracker: () => FailureTracker
});
module.exports = __toCommonJS(failureTracker_exports);
class FailureTracker {
  constructor(config, options) {
    this._failureCount = 0;
    this._hasWorkerErrors = false;
    this._topLevelProjects = [];
    this._config = config;
    this._pauseOnError = !!options?.pauseOnError;
    this._pauseAtEnd = !!options?.pauseAtEnd;
  }
  onRootSuite(rootSuite, topLevelProjects) {
    this._rootSuite = rootSuite;
    this._topLevelProjects = topLevelProjects;
  }
  onTestEnd(test, result) {
    if (test.outcome() === "unexpected" && test.results.length > test.retries)
      ++this._failureCount;
  }
  onWorkerError() {
    this._hasWorkerErrors = true;
  }
  pauseOnError() {
    return this._pauseOnError;
  }
  pauseAtEnd(inProject) {
    return this._topLevelProjects.includes(inProject) && this._pauseAtEnd;
  }
  hasReachedMaxFailures() {
    return this.maxFailures() > 0 && this._failureCount >= this.maxFailures();
  }
  hasWorkerErrors() {
    return this._hasWorkerErrors;
  }
  result() {
    return this._hasWorkerErrors || this.hasReachedMaxFailures() || this.hasFailedTests() || this._config.failOnFlakyTests && this.hasFlakyTests() ? "failed" : "passed";
  }
  hasFailedTests() {
    return this._rootSuite?.allTests().some((test) => !test.ok());
  }
  hasFlakyTests() {
    return this._rootSuite?.allTests().some((test) => test.outcome() === "flaky");
  }
  maxFailures() {
    return this._config.config.maxFailures;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FailureTracker
});
