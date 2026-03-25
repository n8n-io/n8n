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
var testTree_exports = {};
__export(testTree_exports, {
  TestTree: () => TestTree,
  sortAndPropagateStatus: () => sortAndPropagateStatus,
  statusEx: () => statusEx
});
module.exports = __toCommonJS(testTree_exports);
class TestTree {
  constructor(rootFolder, rootSuite, loadErrors, projectFilters, pathSeparator, hideFiles) {
    this._treeItemById = /* @__PURE__ */ new Map();
    this._treeItemByTestId = /* @__PURE__ */ new Map();
    const filterProjects = projectFilters && [...projectFilters.values()].some(Boolean);
    this.pathSeparator = pathSeparator;
    this.rootItem = {
      kind: "group",
      subKind: "folder",
      id: rootFolder,
      title: "",
      location: { file: "", line: 0, column: 0 },
      duration: 0,
      parent: void 0,
      children: [],
      status: "none",
      hasLoadErrors: false
    };
    this._treeItemById.set(rootFolder, this.rootItem);
    const visitSuite = (project, parentSuite, parentGroup, mode) => {
      for (const suite of mode === "tests" ? [] : parentSuite.suites) {
        if (!suite.title) {
          visitSuite(project, suite, parentGroup, "all");
          continue;
        }
        let group = parentGroup.children.find((item) => item.kind === "group" && item.title === suite.title);
        if (!group) {
          group = {
            kind: "group",
            subKind: "describe",
            id: "suite:" + parentSuite.titlePath().join("") + "" + suite.title,
            // account for anonymous suites
            title: suite.title,
            location: suite.location,
            duration: 0,
            parent: parentGroup,
            children: [],
            status: "none",
            hasLoadErrors: false
          };
          this._addChild(parentGroup, group);
        }
        visitSuite(project, suite, group, "all");
      }
      for (const test of mode === "suites" ? [] : parentSuite.tests) {
        const title = test.title;
        let testCaseItem = parentGroup.children.find((t) => t.kind !== "group" && t.title === title);
        if (!testCaseItem) {
          testCaseItem = {
            kind: "case",
            id: "test:" + test.titlePath().join(""),
            title,
            parent: parentGroup,
            children: [],
            tests: [],
            location: test.location,
            duration: 0,
            status: "none",
            project: void 0,
            test: void 0,
            tags: test.tags
          };
          this._addChild(parentGroup, testCaseItem);
        }
        const result = test.results[0];
        let status = "none";
        if (result?.[statusEx] === "scheduled")
          status = "scheduled";
        else if (result?.[statusEx] === "running")
          status = "running";
        else if (result?.status === "skipped")
          status = "skipped";
        else if (result?.status === "interrupted")
          status = "none";
        else if (result && test.outcome() !== "expected")
          status = "failed";
        else if (result && test.outcome() === "expected")
          status = "passed";
        testCaseItem.tests.push(test);
        const testItem = {
          kind: "test",
          id: test.id,
          title: project.name,
          location: test.location,
          test,
          parent: testCaseItem,
          children: [],
          status,
          duration: test.results.length ? Math.max(0, test.results[0].duration) : 0,
          project
        };
        this._addChild(testCaseItem, testItem);
        this._treeItemByTestId.set(test.id, testItem);
        testCaseItem.duration = testCaseItem.children.reduce((a, b) => a + b.duration, 0);
      }
    };
    for (const projectSuite of rootSuite?.suites || []) {
      if (filterProjects && !projectFilters.get(projectSuite.title))
        continue;
      for (const fileSuite of projectSuite.suites) {
        if (hideFiles) {
          visitSuite(projectSuite.project(), fileSuite, this.rootItem, "suites");
          if (fileSuite.tests.length) {
            const defaultDescribeItem = this._defaultDescribeItem();
            visitSuite(projectSuite.project(), fileSuite, defaultDescribeItem, "tests");
          }
        } else {
          const fileItem = this._fileItem(fileSuite.location.file.split(pathSeparator), true);
          visitSuite(projectSuite.project(), fileSuite, fileItem, "all");
        }
      }
    }
    for (const loadError of loadErrors) {
      if (!loadError.location)
        continue;
      const fileItem = this._fileItem(loadError.location.file.split(pathSeparator), true);
      fileItem.hasLoadErrors = true;
    }
  }
  _addChild(parent, child) {
    parent.children.push(child);
    child.parent = parent;
    this._treeItemById.set(child.id, child);
  }
  filterTree(filterText, statusFilters, runningTestIds) {
    const tokens = filterText.trim().toLowerCase().split(" ");
    const filtersStatuses = [...statusFilters.values()].some(Boolean);
    const filter = (testCase) => {
      const titleWithTags = [...testCase.tests[0].titlePath(), ...testCase.tests[0].tags].join(" ").toLowerCase();
      if (!tokens.every((token) => titleWithTags.includes(token)) && !testCase.tests.some((t) => runningTestIds?.has(t.id)))
        return false;
      testCase.children = testCase.children.filter((test) => {
        return !filtersStatuses || runningTestIds?.has(test.test.id) || statusFilters.get(test.status);
      });
      testCase.tests = testCase.children.map((c) => c.test);
      return !!testCase.children.length;
    };
    const visit = (treeItem) => {
      const newChildren = [];
      for (const child of treeItem.children) {
        if (child.kind === "case") {
          if (filter(child))
            newChildren.push(child);
        } else {
          visit(child);
          if (child.children.length || child.hasLoadErrors)
            newChildren.push(child);
        }
      }
      treeItem.children = newChildren;
    };
    visit(this.rootItem);
  }
  _fileItem(filePath, isFile) {
    if (filePath.length === 0)
      return this.rootItem;
    const fileName = filePath.join(this.pathSeparator);
    const existingFileItem = this._treeItemById.get(fileName);
    if (existingFileItem)
      return existingFileItem;
    const parentFileItem = this._fileItem(filePath.slice(0, filePath.length - 1), false);
    const fileItem = {
      kind: "group",
      subKind: isFile ? "file" : "folder",
      id: fileName,
      title: filePath[filePath.length - 1],
      location: { file: fileName, line: 0, column: 0 },
      duration: 0,
      parent: parentFileItem,
      children: [],
      status: "none",
      hasLoadErrors: false
    };
    this._addChild(parentFileItem, fileItem);
    return fileItem;
  }
  _defaultDescribeItem() {
    let defaultDescribeItem = this._treeItemById.get("<anonymous>");
    if (!defaultDescribeItem) {
      defaultDescribeItem = {
        kind: "group",
        subKind: "describe",
        id: "<anonymous>",
        title: "<anonymous>",
        location: { file: "", line: 0, column: 0 },
        duration: 0,
        parent: this.rootItem,
        children: [],
        status: "none",
        hasLoadErrors: false
      };
      this._addChild(this.rootItem, defaultDescribeItem);
    }
    return defaultDescribeItem;
  }
  sortAndPropagateStatus() {
    sortAndPropagateStatus(this.rootItem);
  }
  flattenForSingleProject() {
    const visit = (treeItem) => {
      if (treeItem.kind === "case" && treeItem.children.length === 1) {
        treeItem.project = treeItem.children[0].project;
        treeItem.test = treeItem.children[0].test;
        treeItem.children = [];
        this._treeItemByTestId.set(treeItem.test.id, treeItem);
      } else {
        treeItem.children.forEach(visit);
      }
    };
    visit(this.rootItem);
  }
  shortenRoot() {
    let shortRoot = this.rootItem;
    while (shortRoot.children.length === 1 && shortRoot.children[0].kind === "group" && shortRoot.children[0].subKind === "folder")
      shortRoot = shortRoot.children[0];
    shortRoot.location = this.rootItem.location;
    this.rootItem = shortRoot;
  }
  fileNames() {
    const result = /* @__PURE__ */ new Set();
    const visit = (treeItem) => {
      if (treeItem.kind === "group" && treeItem.subKind === "file")
        result.add(treeItem.id);
      else
        treeItem.children.forEach(visit);
    };
    visit(this.rootItem);
    return [...result];
  }
  flatTreeItems() {
    const result = [];
    const visit = (treeItem) => {
      result.push(treeItem);
      treeItem.children.forEach(visit);
    };
    visit(this.rootItem);
    return result;
  }
  treeItemById(id) {
    return this._treeItemById.get(id);
  }
  collectTestIds(treeItem) {
    return collectTestIds(treeItem);
  }
}
function sortAndPropagateStatus(treeItem) {
  for (const child of treeItem.children)
    sortAndPropagateStatus(child);
  if (treeItem.kind === "group") {
    treeItem.children.sort((a, b) => {
      const fc = a.location.file.localeCompare(b.location.file);
      return fc || a.location.line - b.location.line;
    });
  }
  let allPassed = treeItem.children.length > 0;
  let allSkipped = treeItem.children.length > 0;
  let hasFailed = false;
  let hasRunning = false;
  let hasScheduled = false;
  for (const child of treeItem.children) {
    allSkipped = allSkipped && child.status === "skipped";
    allPassed = allPassed && (child.status === "passed" || child.status === "skipped");
    hasFailed = hasFailed || child.status === "failed";
    hasRunning = hasRunning || child.status === "running";
    hasScheduled = hasScheduled || child.status === "scheduled";
  }
  if (hasRunning)
    treeItem.status = "running";
  else if (hasScheduled)
    treeItem.status = "scheduled";
  else if (hasFailed)
    treeItem.status = "failed";
  else if (allSkipped)
    treeItem.status = "skipped";
  else if (allPassed)
    treeItem.status = "passed";
}
function collectTestIds(treeItem) {
  const testIds = /* @__PURE__ */ new Set();
  const locations = /* @__PURE__ */ new Set();
  const visit = (treeItem2) => {
    if (treeItem2.kind !== "test" && treeItem2.kind !== "case") {
      treeItem2.children.forEach(visit);
      return;
    }
    let fileItem = treeItem2;
    while (fileItem && fileItem.parent && !(fileItem.kind === "group" && fileItem.subKind === "file"))
      fileItem = fileItem.parent;
    locations.add(fileItem.location.file);
    if (treeItem2.kind === "case")
      treeItem2.tests.forEach((test) => testIds.add(test.id));
    else
      testIds.add(treeItem2.id);
  };
  visit(treeItem);
  return { testIds, locations };
}
const statusEx = Symbol("statusEx");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestTree,
  sortAndPropagateStatus,
  statusEx
});
