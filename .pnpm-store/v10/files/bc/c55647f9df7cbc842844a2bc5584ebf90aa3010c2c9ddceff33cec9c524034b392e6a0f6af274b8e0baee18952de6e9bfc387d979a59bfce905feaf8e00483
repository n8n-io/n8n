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
var teleReceiver_exports = {};
__export(teleReceiver_exports, {
  TeleReporterReceiver: () => TeleReporterReceiver,
  TeleSuite: () => TeleSuite,
  TeleTestCase: () => TeleTestCase,
  TeleTestResult: () => TeleTestResult,
  baseFullConfig: () => baseFullConfig,
  computeTestCaseOutcome: () => computeTestCaseOutcome,
  parseRegexPatterns: () => parseRegexPatterns,
  serializeRegexPatterns: () => serializeRegexPatterns
});
module.exports = __toCommonJS(teleReceiver_exports);
class TeleReporterReceiver {
  constructor(reporter, options = {}) {
    this.isListing = false;
    this._tests = /* @__PURE__ */ new Map();
    this._rootSuite = new TeleSuite("", "root");
    this._options = options;
    this._reporter = reporter;
  }
  reset() {
    this._rootSuite._entries = [];
    this._tests.clear();
  }
  dispatch(message) {
    const { method, params } = message;
    if (method === "onConfigure") {
      this._onConfigure(params.config);
      return;
    }
    if (method === "onProject") {
      this._onProject(params.project);
      return;
    }
    if (method === "onBegin") {
      this._onBegin();
      return;
    }
    if (method === "onTestBegin") {
      this._onTestBegin(params.testId, params.result);
      return;
    }
    if (method === "onTestPaused") {
      this._onTestPaused(params.testId, params.resultId, params.errors);
      return;
    }
    if (method === "onTestEnd") {
      this._onTestEnd(params.test, params.result);
      return;
    }
    if (method === "onStepBegin") {
      this._onStepBegin(params.testId, params.resultId, params.step);
      return;
    }
    if (method === "onAttach") {
      this._onAttach(params.testId, params.resultId, params.attachments);
      return;
    }
    if (method === "onStepEnd") {
      this._onStepEnd(params.testId, params.resultId, params.step);
      return;
    }
    if (method === "onError") {
      this._onError(params.error);
      return;
    }
    if (method === "onStdIO") {
      this._onStdIO(params.type, params.testId, params.resultId, params.data, params.isBase64);
      return;
    }
    if (method === "onEnd")
      return this._onEnd(params.result);
    if (method === "onExit")
      return this._onExit();
  }
  _onConfigure(config) {
    this._rootDir = config.rootDir;
    this._config = this._parseConfig(config);
    this._reporter.onConfigure?.(this._config);
  }
  _onProject(project) {
    let projectSuite = this._options.mergeProjects ? this._rootSuite.suites.find((suite) => suite.project().name === project.name) : void 0;
    if (!projectSuite) {
      projectSuite = new TeleSuite(project.name, "project");
      this._rootSuite._addSuite(projectSuite);
    }
    projectSuite._project = this._parseProject(project);
    for (const suite of project.suites)
      this._mergeSuiteInto(suite, projectSuite);
  }
  _onBegin() {
    this._reporter.onBegin?.(this._rootSuite);
  }
  _onTestBegin(testId, payload) {
    const test = this._tests.get(testId);
    if (this._options.clearPreviousResultsWhenTestBegins)
      test.results = [];
    const testResult = test._createTestResult(payload.id);
    testResult.retry = payload.retry;
    testResult.workerIndex = payload.workerIndex;
    testResult.parallelIndex = payload.parallelIndex;
    testResult.setStartTimeNumber(payload.startTime);
    this._reporter.onTestBegin?.(test, testResult);
  }
  _onTestPaused(testId, resultId, errors) {
    const test = this._tests.get(testId);
    const result = test.results.find((r) => r._id === resultId);
    result.errors.push(...errors);
    result.error = result.errors[0];
    void this._reporter.onTestPaused?.(test, result);
  }
  _onTestEnd(testEndPayload, payload) {
    const test = this._tests.get(testEndPayload.testId);
    test.timeout = testEndPayload.timeout;
    test.expectedStatus = testEndPayload.expectedStatus;
    const result = test.results.find((r) => r._id === payload.id);
    result.duration = payload.duration;
    result.status = payload.status;
    result.errors.push(...payload.errors ?? []);
    result.error = result.errors[0];
    if (!!payload.attachments)
      result.attachments = this._parseAttachments(payload.attachments);
    if (payload.annotations) {
      this._absoluteAnnotationLocationsInplace(payload.annotations);
      result.annotations = payload.annotations;
      test.annotations = payload.annotations;
    }
    this._reporter.onTestEnd?.(test, result);
    result._stepMap = /* @__PURE__ */ new Map();
  }
  _onStepBegin(testId, resultId, payload) {
    const test = this._tests.get(testId);
    const result = test.results.find((r) => r._id === resultId);
    const parentStep = payload.parentStepId ? result._stepMap.get(payload.parentStepId) : void 0;
    const location = this._absoluteLocation(payload.location);
    const step = new TeleTestStep(payload, parentStep, location, result);
    if (parentStep)
      parentStep.steps.push(step);
    else
      result.steps.push(step);
    result._stepMap.set(payload.id, step);
    this._reporter.onStepBegin?.(test, result, step);
  }
  _onStepEnd(testId, resultId, payload) {
    const test = this._tests.get(testId);
    const result = test.results.find((r) => r._id === resultId);
    const step = result._stepMap.get(payload.id);
    step._endPayload = payload;
    step.duration = payload.duration;
    step.error = payload.error;
    this._reporter.onStepEnd?.(test, result, step);
  }
  _onAttach(testId, resultId, attachments) {
    const test = this._tests.get(testId);
    const result = test.results.find((r) => r._id === resultId);
    result.attachments.push(...attachments.map((a) => ({
      name: a.name,
      contentType: a.contentType,
      path: a.path,
      body: a.base64 && globalThis.Buffer ? Buffer.from(a.base64, "base64") : void 0
    })));
  }
  _onError(error) {
    this._reporter.onError?.(error);
  }
  _onStdIO(type, testId, resultId, data, isBase64) {
    const chunk = isBase64 ? globalThis.Buffer ? Buffer.from(data, "base64") : atob(data) : data;
    const test = testId ? this._tests.get(testId) : void 0;
    const result = test && resultId ? test.results.find((r) => r._id === resultId) : void 0;
    if (type === "stdout") {
      result?.stdout.push(chunk);
      this._reporter.onStdOut?.(chunk, test, result);
    } else {
      result?.stderr.push(chunk);
      this._reporter.onStdErr?.(chunk, test, result);
    }
  }
  async _onEnd(result) {
    await this._reporter.onEnd?.({
      status: result.status,
      startTime: new Date(result.startTime),
      duration: result.duration
    });
  }
  _onExit() {
    return this._reporter.onExit?.();
  }
  _parseConfig(config) {
    const result = { ...baseFullConfig, ...config };
    if (this._options.configOverrides) {
      result.configFile = this._options.configOverrides.configFile;
      result.reportSlowTests = this._options.configOverrides.reportSlowTests;
      result.quiet = this._options.configOverrides.quiet;
      result.reporter = [...this._options.configOverrides.reporter];
    }
    return result;
  }
  _parseProject(project) {
    return {
      metadata: project.metadata,
      name: project.name,
      outputDir: this._absolutePath(project.outputDir),
      repeatEach: project.repeatEach,
      retries: project.retries,
      testDir: this._absolutePath(project.testDir),
      testIgnore: parseRegexPatterns(project.testIgnore),
      testMatch: parseRegexPatterns(project.testMatch),
      timeout: project.timeout,
      grep: parseRegexPatterns(project.grep),
      grepInvert: parseRegexPatterns(project.grepInvert),
      dependencies: project.dependencies,
      teardown: project.teardown,
      snapshotDir: this._absolutePath(project.snapshotDir),
      use: project.use
    };
  }
  _parseAttachments(attachments) {
    return attachments.map((a) => {
      return {
        ...a,
        body: a.base64 && globalThis.Buffer ? Buffer.from(a.base64, "base64") : void 0
      };
    });
  }
  _mergeSuiteInto(jsonSuite, parent) {
    let targetSuite = parent.suites.find((s) => s.title === jsonSuite.title);
    if (!targetSuite) {
      targetSuite = new TeleSuite(jsonSuite.title, parent.type === "project" ? "file" : "describe");
      parent._addSuite(targetSuite);
    }
    targetSuite.location = this._absoluteLocation(jsonSuite.location);
    jsonSuite.entries.forEach((e) => {
      if ("testId" in e)
        this._mergeTestInto(e, targetSuite);
      else
        this._mergeSuiteInto(e, targetSuite);
    });
  }
  _mergeTestInto(jsonTest, parent) {
    let targetTest = this._options.mergeTestCases ? parent.tests.find((s) => s.title === jsonTest.title && s.repeatEachIndex === jsonTest.repeatEachIndex) : void 0;
    if (!targetTest) {
      targetTest = new TeleTestCase(jsonTest.testId, jsonTest.title, this._absoluteLocation(jsonTest.location), jsonTest.repeatEachIndex);
      parent._addTest(targetTest);
      this._tests.set(targetTest.id, targetTest);
    }
    this._updateTest(jsonTest, targetTest);
  }
  _updateTest(payload, test) {
    test.id = payload.testId;
    test.location = this._absoluteLocation(payload.location);
    test.retries = payload.retries;
    test.tags = payload.tags ?? [];
    test.annotations = payload.annotations ?? [];
    this._absoluteAnnotationLocationsInplace(test.annotations);
    return test;
  }
  _absoluteAnnotationLocationsInplace(annotations) {
    for (const annotation of annotations) {
      if (annotation.location)
        annotation.location = this._absoluteLocation(annotation.location);
    }
  }
  _absoluteLocation(location) {
    if (!location)
      return location;
    return {
      ...location,
      file: this._absolutePath(location.file)
    };
  }
  _absolutePath(relativePath) {
    if (relativePath === void 0)
      return;
    return this._options.resolvePath ? this._options.resolvePath(this._rootDir, relativePath) : this._rootDir + "/" + relativePath;
  }
}
class TeleSuite {
  constructor(title, type) {
    this._entries = [];
    this._requireFile = "";
    this._parallelMode = "none";
    this.title = title;
    this._type = type;
  }
  get type() {
    return this._type;
  }
  get suites() {
    return this._entries.filter((e) => e.type !== "test");
  }
  get tests() {
    return this._entries.filter((e) => e.type === "test");
  }
  entries() {
    return this._entries;
  }
  allTests() {
    const result = [];
    const visit = (suite) => {
      for (const entry of suite.entries()) {
        if (entry.type === "test")
          result.push(entry);
        else
          visit(entry);
      }
    };
    visit(this);
    return result;
  }
  titlePath() {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    if (this.title || this._type !== "describe")
      titlePath.push(this.title);
    return titlePath;
  }
  project() {
    return this._project ?? this.parent?.project();
  }
  _addTest(test) {
    test.parent = this;
    this._entries.push(test);
  }
  _addSuite(suite) {
    suite.parent = this;
    this._entries.push(suite);
  }
}
class TeleTestCase {
  constructor(id, title, location, repeatEachIndex) {
    this.fn = () => {
    };
    this.results = [];
    this.type = "test";
    this.expectedStatus = "passed";
    this.timeout = 0;
    this.annotations = [];
    this.retries = 0;
    this.tags = [];
    this.repeatEachIndex = 0;
    this.id = id;
    this.title = title;
    this.location = location;
    this.repeatEachIndex = repeatEachIndex;
  }
  titlePath() {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    titlePath.push(this.title);
    return titlePath;
  }
  outcome() {
    return computeTestCaseOutcome(this);
  }
  ok() {
    const status = this.outcome();
    return status === "expected" || status === "flaky" || status === "skipped";
  }
  _createTestResult(id) {
    const result = new TeleTestResult(this.results.length, id);
    this.results.push(result);
    return result;
  }
}
class TeleTestStep {
  constructor(payload, parentStep, location, result) {
    this.duration = -1;
    this.steps = [];
    this._startTime = 0;
    this.title = payload.title;
    this.category = payload.category;
    this.location = location;
    this.parent = parentStep;
    this._startTime = payload.startTime;
    this._result = result;
  }
  titlePath() {
    const parentPath = this.parent?.titlePath() || [];
    return [...parentPath, this.title];
  }
  get startTime() {
    return new Date(this._startTime);
  }
  set startTime(value) {
    this._startTime = +value;
  }
  get attachments() {
    return this._endPayload?.attachments?.map((index) => this._result.attachments[index]) ?? [];
  }
  get annotations() {
    return this._endPayload?.annotations ?? [];
  }
}
class TeleTestResult {
  constructor(retry, id) {
    this.parallelIndex = -1;
    this.workerIndex = -1;
    this.duration = -1;
    this.stdout = [];
    this.stderr = [];
    this.attachments = [];
    this.annotations = [];
    this.status = "skipped";
    this.steps = [];
    this.errors = [];
    this._stepMap = /* @__PURE__ */ new Map();
    this._startTime = 0;
    this.retry = retry;
    this._id = id;
  }
  setStartTimeNumber(startTime) {
    this._startTime = startTime;
  }
  get startTime() {
    return new Date(this._startTime);
  }
  set startTime(value) {
    this._startTime = +value;
  }
}
const baseFullConfig = {
  forbidOnly: false,
  fullyParallel: false,
  globalSetup: null,
  globalTeardown: null,
  globalTimeout: 0,
  grep: /.*/,
  grepInvert: null,
  maxFailures: 0,
  metadata: {},
  preserveOutput: "always",
  projects: [],
  reporter: [[process.env.CI ? "dot" : "list"]],
  reportSlowTests: {
    max: 5,
    threshold: 3e5
    /* 5 minutes */
  },
  configFile: "",
  rootDir: "",
  quiet: false,
  shard: null,
  tags: [],
  updateSnapshots: "missing",
  updateSourceMethod: "patch",
  // @ts-expect-error runAgents is hidden
  runAgents: "none",
  version: "",
  workers: 0,
  webServer: null
};
function serializeRegexPatterns(patterns) {
  if (!Array.isArray(patterns))
    patterns = [patterns];
  return patterns.map((s) => {
    if (typeof s === "string")
      return { s };
    return { r: { source: s.source, flags: s.flags } };
  });
}
function parseRegexPatterns(patterns) {
  return patterns.map((p) => {
    if (p.s !== void 0)
      return p.s;
    return new RegExp(p.r.source, p.r.flags);
  });
}
function computeTestCaseOutcome(test) {
  let skipped = 0;
  let didNotRun = 0;
  let expected = 0;
  let interrupted = 0;
  let unexpected = 0;
  for (const result of test.results) {
    if (result.status === "interrupted") {
      ++interrupted;
    } else if (result.status === "skipped" && test.expectedStatus === "skipped") {
      ++skipped;
    } else if (result.status === "skipped") {
      ++didNotRun;
    } else if (result.status === test.expectedStatus) {
      ++expected;
    } else {
      ++unexpected;
    }
  }
  if (expected === 0 && unexpected === 0)
    return "skipped";
  if (unexpected === 0)
    return "expected";
  if (expected === 0 && skipped === 0)
    return "unexpected";
  return "flaky";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TeleReporterReceiver,
  TeleSuite,
  TeleTestCase,
  TeleTestResult,
  baseFullConfig,
  computeTestCaseOutcome,
  parseRegexPatterns,
  serializeRegexPatterns
});
