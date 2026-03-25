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
var json_exports = {};
__export(json_exports, {
  default: () => json_default,
  serializePatterns: () => serializePatterns
});
module.exports = __toCommonJS(json_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_base = require("./base");
var import_config = require("../common/config");
class JSONReporter {
  constructor(options) {
    this._errors = [];
    this._resolvedOutputFile = (0, import_base.resolveOutputFile)("JSON", options)?.outputFile;
  }
  version() {
    return "v2";
  }
  printsToStdio() {
    return !this._resolvedOutputFile;
  }
  onConfigure(config) {
    this.config = config;
  }
  onBegin(suite) {
    this.suite = suite;
  }
  onError(error) {
    this._errors.push(error);
  }
  async onEnd(result) {
    await outputReport(this._serializeReport(result), this._resolvedOutputFile);
  }
  _serializeReport(result) {
    const report = {
      config: {
        ...removePrivateFields(this.config),
        rootDir: (0, import_utils.toPosixPath)(this.config.rootDir),
        projects: this.config.projects.map((project) => {
          return {
            outputDir: (0, import_utils.toPosixPath)(project.outputDir),
            repeatEach: project.repeatEach,
            retries: project.retries,
            metadata: project.metadata,
            id: (0, import_config.getProjectId)(project),
            name: project.name,
            testDir: (0, import_utils.toPosixPath)(project.testDir),
            testIgnore: serializePatterns(project.testIgnore),
            testMatch: serializePatterns(project.testMatch),
            timeout: project.timeout
          };
        })
      },
      suites: this._mergeSuites(this.suite.suites),
      errors: this._errors,
      stats: {
        startTime: result.startTime.toISOString(),
        duration: result.duration,
        expected: 0,
        skipped: 0,
        unexpected: 0,
        flaky: 0
      }
    };
    for (const test of this.suite.allTests())
      ++report.stats[test.outcome()];
    return report;
  }
  _mergeSuites(suites) {
    const fileSuites = new import_utils.MultiMap();
    for (const projectSuite of suites) {
      const projectId = (0, import_config.getProjectId)(projectSuite.project());
      const projectName = projectSuite.project().name;
      for (const fileSuite of projectSuite.suites) {
        const file = fileSuite.location.file;
        const serialized = this._serializeSuite(projectId, projectName, fileSuite);
        if (serialized)
          fileSuites.set(file, serialized);
      }
    }
    const results = [];
    for (const [, suites2] of fileSuites) {
      const result = {
        title: suites2[0].title,
        file: suites2[0].file,
        column: 0,
        line: 0,
        specs: []
      };
      for (const suite of suites2)
        this._mergeTestsFromSuite(result, suite);
      results.push(result);
    }
    return results;
  }
  _relativeLocation(location) {
    if (!location)
      return { file: "", line: 0, column: 0 };
    return {
      file: (0, import_utils.toPosixPath)(import_path.default.relative(this.config.rootDir, location.file)),
      line: location.line,
      column: location.column
    };
  }
  _locationMatches(s1, s2) {
    return s1.file === s2.file && s1.line === s2.line && s1.column === s2.column;
  }
  _mergeTestsFromSuite(to, from) {
    for (const fromSuite of from.suites || []) {
      const toSuite = (to.suites || []).find((s) => s.title === fromSuite.title && this._locationMatches(s, fromSuite));
      if (toSuite) {
        this._mergeTestsFromSuite(toSuite, fromSuite);
      } else {
        if (!to.suites)
          to.suites = [];
        to.suites.push(fromSuite);
      }
    }
    for (const spec of from.specs || []) {
      const toSpec = to.specs.find((s) => s.title === spec.title && s.file === (0, import_utils.toPosixPath)(import_path.default.relative(this.config.rootDir, spec.file)) && s.line === spec.line && s.column === spec.column);
      if (toSpec)
        toSpec.tests.push(...spec.tests);
      else
        to.specs.push(spec);
    }
  }
  _serializeSuite(projectId, projectName, suite) {
    if (!suite.allTests().length)
      return null;
    const suites = suite.suites.map((suite2) => this._serializeSuite(projectId, projectName, suite2)).filter((s) => s);
    return {
      title: suite.title,
      ...this._relativeLocation(suite.location),
      specs: suite.tests.map((test) => this._serializeTestSpec(projectId, projectName, test)),
      suites: suites.length ? suites : void 0
    };
  }
  _serializeTestSpec(projectId, projectName, test) {
    return {
      title: test.title,
      ok: test.ok(),
      tags: test.tags.map((tag) => tag.substring(1)),
      // Strip '@'.
      tests: [this._serializeTest(projectId, projectName, test)],
      id: test.id,
      ...this._relativeLocation(test.location)
    };
  }
  _serializeTest(projectId, projectName, test) {
    return {
      timeout: test.timeout,
      annotations: test.annotations,
      expectedStatus: test.expectedStatus,
      projectId,
      projectName,
      results: test.results.map((r) => this._serializeTestResult(r, test)),
      status: test.outcome()
    };
  }
  _serializeTestResult(result, test) {
    const steps = result.steps.filter((s) => s.category === "test.step");
    const jsonResult = {
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex,
      status: result.status,
      duration: result.duration,
      error: result.error,
      errors: result.errors.map((e) => this._serializeError(e)),
      stdout: result.stdout.map((s) => stdioEntry(s)),
      stderr: result.stderr.map((s) => stdioEntry(s)),
      retry: result.retry,
      steps: steps.length ? steps.map((s) => this._serializeTestStep(s)) : void 0,
      startTime: result.startTime.toISOString(),
      annotations: result.annotations,
      attachments: result.attachments.map((a) => ({
        name: a.name,
        contentType: a.contentType,
        path: a.path,
        body: a.body?.toString("base64")
      }))
    };
    if (result.error?.stack)
      jsonResult.errorLocation = (0, import_base.prepareErrorStack)(result.error.stack).location;
    return jsonResult;
  }
  _serializeError(error) {
    return (0, import_base.formatError)(import_base.nonTerminalScreen, error);
  }
  _serializeTestStep(step) {
    const steps = step.steps.filter((s) => s.category === "test.step");
    return {
      title: step.title,
      duration: step.duration,
      error: step.error,
      steps: steps.length ? steps.map((s) => this._serializeTestStep(s)) : void 0
    };
  }
}
async function outputReport(report, resolvedOutputFile) {
  const reportString = JSON.stringify(report, void 0, 2);
  if (resolvedOutputFile) {
    await import_fs.default.promises.mkdir(import_path.default.dirname(resolvedOutputFile), { recursive: true });
    await import_fs.default.promises.writeFile(resolvedOutputFile, reportString);
  } else {
    console.log(reportString);
  }
}
function stdioEntry(s) {
  if (typeof s === "string")
    return { text: s };
  return { buffer: s.toString("base64") };
}
function removePrivateFields(config) {
  return Object.fromEntries(Object.entries(config).filter(([name, value]) => !name.startsWith("_")));
}
function serializePatterns(patterns) {
  if (!Array.isArray(patterns))
    patterns = [patterns];
  return patterns.map((s) => s.toString());
}
var json_default = JSONReporter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  serializePatterns
});
