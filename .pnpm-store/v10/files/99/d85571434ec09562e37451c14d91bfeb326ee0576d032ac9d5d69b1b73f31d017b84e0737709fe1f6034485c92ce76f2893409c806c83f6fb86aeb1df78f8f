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
var test_exports = {};
__export(test_exports, {
  Suite: () => Suite,
  TestCase: () => TestCase
});
module.exports = __toCommonJS(test_exports);
var import_testType = require("./testType");
var import_teleReceiver = require("../isomorphic/teleReceiver");
class Base {
  constructor(title) {
    this._only = false;
    this._requireFile = "";
    this.title = title;
  }
}
class Suite extends Base {
  constructor(title, type) {
    super(title);
    this._use = [];
    this._entries = [];
    this._hooks = [];
    // Annotations known statically before running the test, e.g. `test.describe.skip()` or `test.describe({ annotation }, body)`.
    this._staticAnnotations = [];
    // Explicitly declared tags that are not a part of the title.
    this._tags = [];
    this._modifiers = [];
    this._parallelMode = "none";
    this._type = type;
  }
  get type() {
    return this._type;
  }
  entries() {
    return this._entries;
  }
  get suites() {
    return this._entries.filter((entry) => entry instanceof Suite);
  }
  get tests() {
    return this._entries.filter((entry) => entry instanceof TestCase);
  }
  _addTest(test) {
    test.parent = this;
    this._entries.push(test);
  }
  _addSuite(suite) {
    suite.parent = this;
    this._entries.push(suite);
  }
  _prependSuite(suite) {
    suite.parent = this;
    this._entries.unshift(suite);
  }
  allTests() {
    const result = [];
    const visit = (suite) => {
      for (const entry of suite._entries) {
        if (entry instanceof Suite)
          visit(entry);
        else
          result.push(entry);
      }
    };
    visit(this);
    return result;
  }
  _hasTests() {
    let result = false;
    const visit = (suite) => {
      for (const entry of suite._entries) {
        if (result)
          return;
        if (entry instanceof Suite)
          visit(entry);
        else
          result = true;
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
  _collectGrepTitlePath(path) {
    if (this.parent)
      this.parent._collectGrepTitlePath(path);
    if (this.title || this._type !== "describe")
      path.push(this.title);
    path.push(...this._tags);
  }
  _getOnlyItems() {
    const items = [];
    if (this._only)
      items.push(this);
    for (const suite of this.suites)
      items.push(...suite._getOnlyItems());
    items.push(...this.tests.filter((test) => test._only));
    return items;
  }
  _deepClone() {
    const suite = this._clone();
    for (const entry of this._entries) {
      if (entry instanceof Suite)
        suite._addSuite(entry._deepClone());
      else
        suite._addTest(entry._clone());
    }
    return suite;
  }
  _deepSerialize() {
    const suite = this._serialize();
    suite.entries = [];
    for (const entry of this._entries) {
      if (entry instanceof Suite)
        suite.entries.push(entry._deepSerialize());
      else
        suite.entries.push(entry._serialize());
    }
    return suite;
  }
  static _deepParse(data) {
    const suite = Suite._parse(data);
    for (const entry of data.entries) {
      if (entry.kind === "suite")
        suite._addSuite(Suite._deepParse(entry));
      else
        suite._addTest(TestCase._parse(entry));
    }
    return suite;
  }
  forEachTest(visitor) {
    for (const entry of this._entries) {
      if (entry instanceof Suite)
        entry.forEachTest(visitor);
      else
        visitor(entry, this);
    }
  }
  _serialize() {
    return {
      kind: "suite",
      title: this.title,
      type: this._type,
      location: this.location,
      only: this._only,
      requireFile: this._requireFile,
      timeout: this._timeout,
      retries: this._retries,
      staticAnnotations: this._staticAnnotations.slice(),
      tags: this._tags.slice(),
      modifiers: this._modifiers.slice(),
      parallelMode: this._parallelMode,
      hooks: this._hooks.map((h) => ({ type: h.type, location: h.location, title: h.title })),
      fileId: this._fileId
    };
  }
  static _parse(data) {
    const suite = new Suite(data.title, data.type);
    suite.location = data.location;
    suite._only = data.only;
    suite._requireFile = data.requireFile;
    suite._timeout = data.timeout;
    suite._retries = data.retries;
    suite._staticAnnotations = data.staticAnnotations;
    suite._tags = data.tags;
    suite._modifiers = data.modifiers;
    suite._parallelMode = data.parallelMode;
    suite._hooks = data.hooks.map((h) => ({ type: h.type, location: h.location, title: h.title, fn: () => {
    } }));
    suite._fileId = data.fileId;
    return suite;
  }
  _clone() {
    const data = this._serialize();
    const suite = Suite._parse(data);
    suite._use = this._use.slice();
    suite._hooks = this._hooks.slice();
    suite._fullProject = this._fullProject;
    return suite;
  }
  project() {
    return this._fullProject?.project || this.parent?.project();
  }
}
class TestCase extends Base {
  constructor(title, fn, testType, location) {
    super(title);
    this.results = [];
    this.type = "test";
    this.expectedStatus = "passed";
    this.timeout = 0;
    this.annotations = [];
    this.retries = 0;
    this.repeatEachIndex = 0;
    this.id = "";
    this._poolDigest = "";
    this._workerHash = "";
    this._projectId = "";
    // Explicitly declared tags that are not a part of the title.
    this._tags = [];
    this.fn = fn;
    this._testType = testType;
    this.location = location;
  }
  titlePath() {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    titlePath.push(this.title);
    return titlePath;
  }
  outcome() {
    return (0, import_teleReceiver.computeTestCaseOutcome)(this);
  }
  ok() {
    const status = this.outcome();
    return status === "expected" || status === "flaky" || status === "skipped";
  }
  get tags() {
    const titleTags = this._grepBaseTitlePath().join(" ").match(/@[\S]+/g) || [];
    return [
      ...titleTags,
      ...this._tags
    ];
  }
  _serialize() {
    return {
      kind: "test",
      id: this.id,
      title: this.title,
      retries: this.retries,
      timeout: this.timeout,
      expectedStatus: this.expectedStatus,
      location: this.location,
      only: this._only,
      requireFile: this._requireFile,
      poolDigest: this._poolDigest,
      workerHash: this._workerHash,
      annotations: this.annotations.slice(),
      tags: this._tags.slice(),
      projectId: this._projectId
    };
  }
  static _parse(data) {
    const test = new TestCase(data.title, () => {
    }, import_testType.rootTestType, data.location);
    test.id = data.id;
    test.retries = data.retries;
    test.timeout = data.timeout;
    test.expectedStatus = data.expectedStatus;
    test._only = data.only;
    test._requireFile = data.requireFile;
    test._poolDigest = data.poolDigest;
    test._workerHash = data.workerHash;
    test.annotations = data.annotations;
    test._tags = data.tags;
    test._projectId = data.projectId;
    return test;
  }
  _clone() {
    const data = this._serialize();
    const test = TestCase._parse(data);
    test._testType = this._testType;
    test.fn = this.fn;
    return test;
  }
  _appendTestResult() {
    const result = {
      retry: this.results.length,
      parallelIndex: -1,
      workerIndex: -1,
      duration: 0,
      startTime: /* @__PURE__ */ new Date(),
      stdout: [],
      stderr: [],
      attachments: [],
      status: "skipped",
      steps: [],
      errors: [],
      annotations: []
    };
    this.results.push(result);
    return result;
  }
  _grepBaseTitlePath() {
    const path = [];
    this.parent._collectGrepTitlePath(path);
    path.push(this.title);
    return path;
  }
  _grepTitleWithTags() {
    const path = this._grepBaseTitlePath();
    path.push(...this._tags);
    return path.join(" ");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Suite,
  TestCase
});
