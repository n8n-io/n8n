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
var merge_exports = {};
__export(merge_exports, {
  createMergedReport: () => createMergedReport
});
module.exports = __toCommonJS(merge_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_blob = require("./blob");
var import_multiplexer = require("./multiplexer");
var import_stringInternPool = require("../isomorphic/stringInternPool");
var import_teleReceiver = require("../isomorphic/teleReceiver");
var import_reporters = require("../runner/reporters");
var import_util = require("../util");
async function createMergedReport(config, dir, reporterDescriptions, rootDirOverride) {
  const reporters = await (0, import_reporters.createReporters)(config, "merge", reporterDescriptions);
  const multiplexer = new import_multiplexer.Multiplexer(reporters);
  const stringPool = new import_stringInternPool.StringInternPool();
  let printStatus = () => {
  };
  if (!multiplexer.printsToStdio()) {
    printStatus = printStatusToStdout;
    printStatus(`merging reports from ${dir}`);
  }
  const shardFiles = await sortedShardFiles(dir);
  if (shardFiles.length === 0)
    throw new Error(`No report files found in ${dir}`);
  const eventData = await mergeEvents(dir, shardFiles, stringPool, printStatus, rootDirOverride);
  const pathSeparator = rootDirOverride ? import_path.default.sep : eventData.pathSeparatorFromMetadata ?? import_path.default.sep;
  const pathPackage = pathSeparator === "/" ? import_path.default.posix : import_path.default.win32;
  const receiver = new import_teleReceiver.TeleReporterReceiver(multiplexer, {
    mergeProjects: false,
    mergeTestCases: false,
    // When merging on a different OS, an absolute path like `C:\foo\bar` from win may look like
    // a relative path on posix, and vice versa.
    // Therefore, we cannot use `path.resolve()` here - it will resolve relative-looking paths
    // against `process.cwd()`, while we just want to normalize ".." and "." segments.
    resolvePath: (rootDir, relativePath) => stringPool.internString(pathPackage.normalize(pathPackage.join(rootDir, relativePath))),
    configOverrides: config.config
  });
  printStatus(`processing test events`);
  const dispatchEvents = async (events) => {
    for (const event of events) {
      if (event.method === "onEnd")
        printStatus(`building final report`);
      await receiver.dispatch(event);
      if (event.method === "onEnd")
        printStatus(`finished building report`);
    }
  };
  await dispatchEvents(eventData.prologue);
  for (const { reportFile, eventPatchers, metadata, tags, startTime, duration } of eventData.reports) {
    const reportJsonl = await import_fs.default.promises.readFile(reportFile);
    const events = parseTestEvents(reportJsonl);
    new import_stringInternPool.JsonStringInternalizer(stringPool).traverse(events);
    eventPatchers.patchers.push(new AttachmentPathPatcher(dir));
    if (metadata.name)
      eventPatchers.patchers.push(new GlobalErrorPatcher(metadata.name));
    if (tags.length)
      eventPatchers.patchers.push(new GlobalErrorPatcher(tags.join(" ")));
    eventPatchers.patchEvents(events);
    await dispatchEvents(events);
    multiplexer.onMachineEnd({
      startTime: new Date(startTime),
      duration,
      tag: tags,
      shardIndex: metadata.shard?.current
    });
  }
  await dispatchEvents(eventData.epilogue);
}
const commonEventNames = ["onBlobReportMetadata", "onConfigure", "onProject", "onBegin", "onEnd"];
const commonEvents = new Set(commonEventNames);
const commonEventRegex = new RegExp(`${commonEventNames.join("|")}`);
function parseCommonEvents(reportJsonl) {
  return splitBufferLines(reportJsonl).map((line) => line.toString("utf8")).filter((line) => commonEventRegex.test(line)).map((line) => JSON.parse(line)).filter((event) => commonEvents.has(event.method));
}
function parseTestEvents(reportJsonl) {
  return splitBufferLines(reportJsonl).map((line) => line.toString("utf8")).filter((line) => line.length).map((line) => JSON.parse(line)).filter((event) => !commonEvents.has(event.method));
}
function splitBufferLines(buffer) {
  const lines = [];
  let start = 0;
  while (start < buffer.length) {
    const end = buffer.indexOf(10, start);
    if (end === -1) {
      lines.push(buffer.slice(start));
      break;
    }
    lines.push(buffer.slice(start, end));
    start = end + 1;
  }
  return lines;
}
async function extractAndParseReports(dir, shardFiles, internalizer, printStatus) {
  const shardEvents = [];
  await import_fs.default.promises.mkdir(import_path.default.join(dir, "resources"), { recursive: true });
  const reportNames = new UniqueFileNameGenerator();
  for (const file of shardFiles) {
    const absolutePath = import_path.default.join(dir, file);
    printStatus(`extracting: ${(0, import_util.relativeFilePath)(absolutePath)}`);
    const zipFile = new import_utils.ZipFile(absolutePath);
    const entryNames = await zipFile.entries();
    for (const entryName of entryNames.sort()) {
      let fileName = import_path.default.join(dir, entryName);
      const content = await zipFile.read(entryName);
      if (entryName.endsWith(".jsonl")) {
        fileName = reportNames.makeUnique(fileName);
        let parsedEvents = parseCommonEvents(content);
        internalizer.traverse(parsedEvents);
        const metadata = findMetadata(parsedEvents, file);
        parsedEvents = modernizer.modernize(metadata.version, parsedEvents);
        shardEvents.push({
          file,
          localPath: fileName,
          metadata,
          parsedEvents
        });
      }
      await import_fs.default.promises.writeFile(fileName, content);
    }
    zipFile.close();
  }
  return shardEvents;
}
function findMetadata(events, file) {
  if (events[0]?.method !== "onBlobReportMetadata")
    throw new Error(`No metadata event found in ${file}`);
  const metadata = events[0].params;
  if (metadata.version > import_blob.currentBlobReportVersion)
    throw new Error(`Blob report ${file} was created with a newer version of Playwright.`);
  return metadata;
}
async function mergeEvents(dir, shardReportFiles, stringPool, printStatus, rootDirOverride) {
  const internalizer = new import_stringInternPool.JsonStringInternalizer(stringPool);
  const configureEvents = [];
  const projectEvents = [];
  const endEvents = [];
  const blobs = await extractAndParseReports(dir, shardReportFiles, internalizer, printStatus);
  blobs.sort((a, b) => {
    const nameA = a.metadata.name ?? "";
    const nameB = b.metadata.name ?? "";
    if (nameA !== nameB)
      return nameA.localeCompare(nameB);
    const shardA = a.metadata.shard?.current ?? 0;
    const shardB = b.metadata.shard?.current ?? 0;
    if (shardA !== shardB)
      return shardA - shardB;
    return a.file.localeCompare(b.file);
  });
  printStatus(`merging events`);
  const reports = [];
  const globalTestIdSet = /* @__PURE__ */ new Set();
  for (let i = 0; i < blobs.length; ++i) {
    const { parsedEvents, metadata, localPath } = blobs[i];
    const eventPatchers = new JsonEventPatchers();
    eventPatchers.patchers.push(new IdsPatcher(
      stringPool,
      metadata.name,
      String(i),
      globalTestIdSet
    ));
    if (rootDirOverride)
      eventPatchers.patchers.push(new PathSeparatorPatcher(metadata.pathSeparator));
    eventPatchers.patchEvents(parsedEvents);
    let tags = [];
    let startTime = 0;
    let duration = 0;
    for (const event of parsedEvents) {
      if (event.method === "onConfigure") {
        configureEvents.push(event);
        tags = event.params.config.tags || [];
      } else if (event.method === "onProject") {
        projectEvents.push(event);
      } else if (event.method === "onEnd") {
        endEvents.push({ event, metadata, tags });
        startTime = event.params.result.startTime;
        duration = event.params.result.duration;
      }
    }
    reports.push({
      eventPatchers,
      reportFile: localPath,
      metadata,
      tags,
      startTime,
      duration
    });
  }
  return {
    prologue: [
      mergeConfigureEvents(configureEvents, rootDirOverride),
      ...projectEvents,
      { method: "onBegin", params: void 0 }
    ],
    reports,
    epilogue: [
      mergeEndEvents(endEvents),
      { method: "onExit", params: void 0 }
    ],
    pathSeparatorFromMetadata: blobs[0]?.metadata.pathSeparator
  };
}
function mergeConfigureEvents(configureEvents, rootDirOverride) {
  if (!configureEvents.length)
    throw new Error("No configure events found");
  let config = {
    configFile: void 0,
    globalTimeout: 0,
    maxFailures: 0,
    metadata: {},
    rootDir: "",
    version: "",
    workers: 0,
    globalSetup: null,
    globalTeardown: null
  };
  for (const event of configureEvents)
    config = mergeConfigs(config, event.params.config);
  if (rootDirOverride) {
    config.rootDir = rootDirOverride;
  } else {
    const rootDirs = new Set(configureEvents.map((e) => e.params.config.rootDir));
    if (rootDirs.size > 1) {
      throw new Error([
        `Blob reports being merged were recorded with different test directories, and`,
        `merging cannot proceed. This may happen if you are merging reports from`,
        `machines with different environments, like different operating systems or`,
        `if the tests ran with different playwright configs.`,
        ``,
        `You can force merge by specifying a merge config file with "-c" option. If`,
        `you'd like all test paths to be correct, make sure 'testDir' in the merge config`,
        `file points to the actual tests location.`,
        ``,
        `Found directories:`,
        ...rootDirs
      ].join("\n"));
    }
  }
  return {
    method: "onConfigure",
    params: {
      config
    }
  };
}
function mergeConfigs(to, from) {
  return {
    ...to,
    ...from,
    metadata: {
      ...to.metadata,
      ...from.metadata,
      actualWorkers: (to.metadata.actualWorkers || 0) + (from.metadata.actualWorkers || 0)
    },
    workers: to.workers + from.workers
  };
}
function mergeEndEvents(endEvents) {
  let startTime = endEvents.length ? 1e13 : Date.now();
  let status = "passed";
  let endTime = 0;
  for (const { event } of endEvents) {
    const shardResult = event.params.result;
    if (shardResult.status === "failed")
      status = "failed";
    else if (shardResult.status === "timedout" && status !== "failed")
      status = "timedout";
    else if (shardResult.status === "interrupted" && status !== "failed" && status !== "timedout")
      status = "interrupted";
    startTime = Math.min(startTime, shardResult.startTime);
    endTime = Math.max(endTime, shardResult.startTime + shardResult.duration);
  }
  const result = {
    status,
    startTime,
    duration: endTime - startTime
  };
  return {
    method: "onEnd",
    params: {
      result
    }
  };
}
async function sortedShardFiles(dir) {
  const files = await import_fs.default.promises.readdir(dir);
  return files.filter((file) => file.endsWith(".zip")).sort();
}
function printStatusToStdout(message) {
  process.stdout.write(`${message}
`);
}
class UniqueFileNameGenerator {
  constructor() {
    this._usedNames = /* @__PURE__ */ new Set();
  }
  makeUnique(name) {
    if (!this._usedNames.has(name)) {
      this._usedNames.add(name);
      return name;
    }
    const extension = import_path.default.extname(name);
    name = name.substring(0, name.length - extension.length);
    let index = 0;
    while (true) {
      const candidate = `${name}-${++index}${extension}`;
      if (!this._usedNames.has(candidate)) {
        this._usedNames.add(candidate);
        return candidate;
      }
    }
  }
}
class IdsPatcher {
  constructor(stringPool, botName, salt, globalTestIdSet) {
    this._stringPool = stringPool;
    this._botName = botName;
    this._salt = salt;
    this._testIdsMap = /* @__PURE__ */ new Map();
    this._globalTestIdSet = globalTestIdSet;
  }
  patchEvent(event) {
    const { method, params } = event;
    switch (method) {
      case "onProject":
        this._onProject(params.project);
        return;
      case "onAttach":
      case "onTestBegin":
      case "onStepBegin":
      case "onStepEnd":
      case "onStdIO":
        params.testId = params.testId ? this._mapTestId(params.testId) : void 0;
        return;
      case "onTestEnd":
        params.test.testId = this._mapTestId(params.test.testId);
        return;
    }
  }
  _onProject(project) {
    project.metadata ??= {};
    project.suites.forEach((suite) => this._updateTestIds(suite));
  }
  _updateTestIds(suite) {
    suite.entries.forEach((entry) => {
      if ("testId" in entry)
        this._updateTestId(entry);
      else
        this._updateTestIds(entry);
    });
  }
  _updateTestId(test) {
    test.testId = this._mapTestId(test.testId);
    if (this._botName) {
      test.tags = test.tags || [];
      test.tags.unshift("@" + this._botName);
    }
  }
  _mapTestId(testId) {
    const t1 = this._stringPool.internString(testId);
    if (this._testIdsMap.has(t1))
      return this._testIdsMap.get(t1);
    if (this._globalTestIdSet.has(t1)) {
      const t2 = this._stringPool.internString(testId + this._salt);
      this._globalTestIdSet.add(t2);
      this._testIdsMap.set(t1, t2);
      return t2;
    }
    this._globalTestIdSet.add(t1);
    this._testIdsMap.set(t1, t1);
    return t1;
  }
}
class AttachmentPathPatcher {
  constructor(_resourceDir) {
    this._resourceDir = _resourceDir;
  }
  patchEvent(event) {
    if (event.method === "onAttach")
      this._patchAttachments(event.params.attachments);
    else if (event.method === "onTestEnd")
      this._patchAttachments(event.params.result.attachments ?? []);
  }
  _patchAttachments(attachments) {
    for (const attachment of attachments) {
      if (!attachment.path)
        continue;
      attachment.path = import_path.default.join(this._resourceDir, attachment.path);
    }
  }
}
class PathSeparatorPatcher {
  constructor(from) {
    this._from = from ?? (import_path.default.sep === "/" ? "\\" : "/");
    this._to = import_path.default.sep;
  }
  patchEvent(jsonEvent) {
    if (this._from === this._to)
      return;
    if (jsonEvent.method === "onProject") {
      this._updateProject(jsonEvent.params.project);
      return;
    }
    if (jsonEvent.method === "onTestEnd") {
      const test = jsonEvent.params.test;
      test.annotations?.forEach((annotation) => this._updateAnnotationLocation(annotation));
      const testResult = jsonEvent.params.result;
      testResult.annotations?.forEach((annotation) => this._updateAnnotationLocation(annotation));
      testResult.errors.forEach((error) => this._updateErrorLocations(error));
      (testResult.attachments ?? []).forEach((attachment) => {
        if (attachment.path)
          attachment.path = this._updatePath(attachment.path);
      });
      return;
    }
    if (jsonEvent.method === "onStepBegin") {
      const step = jsonEvent.params.step;
      this._updateLocation(step.location);
      return;
    }
    if (jsonEvent.method === "onStepEnd") {
      const step = jsonEvent.params.step;
      this._updateErrorLocations(step.error);
      step.annotations?.forEach((annotation) => this._updateAnnotationLocation(annotation));
      return;
    }
    if (jsonEvent.method === "onAttach") {
      const attach = jsonEvent.params;
      attach.attachments.forEach((attachment) => {
        if (attachment.path)
          attachment.path = this._updatePath(attachment.path);
      });
      return;
    }
  }
  _updateProject(project) {
    project.outputDir = this._updatePath(project.outputDir);
    project.testDir = this._updatePath(project.testDir);
    project.snapshotDir = this._updatePath(project.snapshotDir);
    project.suites.forEach((suite) => this._updateSuite(suite, true));
  }
  _updateSuite(suite, isFileSuite = false) {
    this._updateLocation(suite.location);
    if (isFileSuite)
      suite.title = this._updatePath(suite.title);
    for (const entry of suite.entries) {
      if ("testId" in entry) {
        this._updateLocation(entry.location);
        entry.annotations?.forEach((annotation) => this._updateAnnotationLocation(annotation));
      } else {
        this._updateSuite(entry);
      }
    }
  }
  _updateErrorLocations(error) {
    while (error) {
      this._updateLocation(error.location);
      error = error.cause;
    }
  }
  _updateAnnotationLocation(annotation) {
    this._updateLocation(annotation.location);
  }
  _updateLocation(location) {
    if (location)
      location.file = this._updatePath(location.file);
  }
  _updatePath(text) {
    return text.split(this._from).join(this._to);
  }
}
class GlobalErrorPatcher {
  constructor(botName) {
    this._prefix = `(${botName}) `;
  }
  patchEvent(event) {
    if (event.method !== "onError")
      return;
    const error = event.params.error;
    if (error.message !== void 0)
      error.message = this._prefix + error.message;
    if (error.stack !== void 0)
      error.stack = this._prefix + error.stack;
  }
}
class JsonEventPatchers {
  constructor() {
    this.patchers = [];
  }
  patchEvents(events) {
    for (const event of events) {
      for (const patcher of this.patchers)
        patcher.patchEvent(event);
    }
  }
}
class BlobModernizer {
  modernize(fromVersion, events) {
    const result = [];
    for (const event of events)
      result.push(...this._modernize(fromVersion, event));
    return result;
  }
  _modernize(fromVersion, event) {
    let events = [event];
    for (let version = fromVersion; version < import_blob.currentBlobReportVersion; ++version)
      events = this[`_modernize_${version}_to_${version + 1}`].call(this, events);
    return events;
  }
  _modernize_1_to_2(events) {
    return events.map((event) => {
      if (event.method === "onProject") {
        const modernizeSuite = (suite) => {
          const newSuites = suite.suites.map(modernizeSuite);
          const { suites, tests, ...remainder } = suite;
          return { entries: [...newSuites, ...tests], ...remainder };
        };
        const project = event.params.project;
        project.suites = project.suites.map(modernizeSuite);
      }
      return event;
    });
  }
}
const modernizer = new BlobModernizer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMergedReport
});
