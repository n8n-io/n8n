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
var suiteUtils_exports = {};
__export(suiteUtils_exports, {
  applyRepeatEachIndex: () => applyRepeatEachIndex,
  bindFileSuiteToProject: () => bindFileSuiteToProject,
  filterByFocusedLine: () => filterByFocusedLine,
  filterOnly: () => filterOnly,
  filterSuite: () => filterSuite,
  filterTestsRemoveEmptySuites: () => filterTestsRemoveEmptySuites
});
module.exports = __toCommonJS(suiteUtils_exports);
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_util = require("../util");
function filterSuite(suite, suiteFilter, testFilter) {
  for (const child of suite.suites) {
    if (!suiteFilter(child))
      filterSuite(child, suiteFilter, testFilter);
  }
  const filteredTests = suite.tests.filter(testFilter);
  const entries = /* @__PURE__ */ new Set([...suite.suites, ...filteredTests]);
  suite._entries = suite._entries.filter((e) => entries.has(e));
}
function filterTestsRemoveEmptySuites(suite, filter) {
  const filteredSuites = suite.suites.filter((child) => filterTestsRemoveEmptySuites(child, filter));
  const filteredTests = suite.tests.filter(filter);
  const entries = /* @__PURE__ */ new Set([...filteredSuites, ...filteredTests]);
  suite._entries = suite._entries.filter((e) => entries.has(e));
  return !!suite._entries.length;
}
function bindFileSuiteToProject(project, suite) {
  const relativeFile = import_path.default.relative(project.project.testDir, suite.location.file);
  const fileId = (0, import_utils.calculateSha1)((0, import_utils.toPosixPath)(relativeFile)).slice(0, 20);
  const result = suite._deepClone();
  result._fileId = fileId;
  result.forEachTest((test, suite2) => {
    suite2._fileId = fileId;
    const [file, ...titles] = test.titlePath();
    const testIdExpression = `[project=${project.id}]${(0, import_utils.toPosixPath)(file)}${titles.join("")}`;
    const testId = fileId + "-" + (0, import_utils.calculateSha1)(testIdExpression).slice(0, 20);
    test.id = testId;
    test._projectId = project.id;
    let inheritedRetries;
    let inheritedTimeout;
    for (let parentSuite = suite2; parentSuite; parentSuite = parentSuite.parent) {
      if (parentSuite._staticAnnotations.length)
        test.annotations.unshift(...parentSuite._staticAnnotations);
      if (inheritedRetries === void 0 && parentSuite._retries !== void 0)
        inheritedRetries = parentSuite._retries;
      if (inheritedTimeout === void 0 && parentSuite._timeout !== void 0)
        inheritedTimeout = parentSuite._timeout;
    }
    test.retries = inheritedRetries ?? project.project.retries;
    test.timeout = inheritedTimeout ?? project.project.timeout;
    if (test.annotations.some((a) => a.type === "skip" || a.type === "fixme"))
      test.expectedStatus = "skipped";
    if (test._poolDigest)
      test._workerHash = `${project.id}-${test._poolDigest}-0`;
  });
  return result;
}
function applyRepeatEachIndex(project, fileSuite, repeatEachIndex) {
  fileSuite.forEachTest((test, suite) => {
    if (repeatEachIndex) {
      const [file, ...titles] = test.titlePath();
      const testIdExpression = `[project=${project.id}]${(0, import_utils.toPosixPath)(file)}${titles.join("")} (repeat:${repeatEachIndex})`;
      const testId = suite._fileId + "-" + (0, import_utils.calculateSha1)(testIdExpression).slice(0, 20);
      test.id = testId;
      test.repeatEachIndex = repeatEachIndex;
      if (test._poolDigest)
        test._workerHash = `${project.id}-${test._poolDigest}-${repeatEachIndex}`;
    }
  });
}
function filterOnly(suite) {
  if (!suite._getOnlyItems().length)
    return;
  const suiteFilter = (suite2) => suite2._only;
  const testFilter = (test) => test._only;
  return filterSuiteWithOnlySemantics(suite, suiteFilter, testFilter);
}
function filterSuiteWithOnlySemantics(suite, suiteFilter, testFilter) {
  const onlySuites = suite.suites.filter((child) => filterSuiteWithOnlySemantics(child, suiteFilter, testFilter) || suiteFilter(child));
  const onlyTests = suite.tests.filter(testFilter);
  const onlyEntries = /* @__PURE__ */ new Set([...onlySuites, ...onlyTests]);
  if (onlyEntries.size) {
    suite._entries = suite._entries.filter((e) => onlyEntries.has(e));
    return true;
  }
  return false;
}
function filterByFocusedLine(suite, focusedTestFileLines) {
  if (!focusedTestFileLines.length)
    return;
  const matchers = focusedTestFileLines.map(createFileMatcherFromFilter);
  const testFileLineMatches = (testFileName, testLine, testColumn) => matchers.some((m) => m(testFileName, testLine, testColumn));
  const suiteFilter = (suite2) => !!suite2.location && testFileLineMatches(suite2.location.file, suite2.location.line, suite2.location.column);
  const testFilter = (test) => testFileLineMatches(test.location.file, test.location.line, test.location.column);
  return filterSuite(suite, suiteFilter, testFilter);
}
function createFileMatcherFromFilter(filter) {
  const fileMatcher = (0, import_util.createFileMatcher)(filter.re || filter.exact || "");
  return (testFileName, testLine, testColumn) => fileMatcher(testFileName) && (filter.line === testLine || filter.line === null) && (filter.column === testColumn || filter.column === null);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyRepeatEachIndex,
  bindFileSuiteToProject,
  filterByFocusedLine,
  filterOnly,
  filterSuite,
  filterTestsRemoveEmptySuites
});
