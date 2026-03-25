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
var markdown_exports = {};
__export(markdown_exports, {
  default: () => markdown_default
});
module.exports = __toCommonJS(markdown_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
class MarkdownReporter {
  constructor(options) {
    this._fatalErrors = [];
    this._options = options;
  }
  printsToStdio() {
    return false;
  }
  onBegin(config, suite) {
    this._config = config;
    this._suite = suite;
  }
  onError(error) {
    this._fatalErrors.push(error);
  }
  async onEnd(result) {
    const summary = this._generateSummary();
    const lines = [];
    if (this._fatalErrors.length)
      lines.push(`**${this._fatalErrors.length} fatal errors, not part of any test**`);
    if (summary.unexpected.length) {
      lines.push(`**${summary.unexpected.length} failed**`);
      this._printTestList(":x:", summary.unexpected, lines);
    }
    if (summary.flaky.length) {
      lines.push(`<details>`);
      lines.push(`<summary><b>${summary.flaky.length} flaky</b></summary>`);
      this._printTestList(":warning:", summary.flaky, lines, " <br/>");
      lines.push(`</details>`);
      lines.push(``);
    }
    if (summary.interrupted.length) {
      lines.push(`<details>`);
      lines.push(`<summary><b>${summary.interrupted.length} interrupted</b></summary>`);
      this._printTestList(":warning:", summary.interrupted, lines, " <br/>");
      lines.push(`</details>`);
      lines.push(``);
    }
    const skipped = summary.skipped ? `, ${summary.skipped} skipped` : "";
    const didNotRun = summary.didNotRun ? `, ${summary.didNotRun} did not run` : "";
    lines.push(`**${summary.expected} passed${skipped}${didNotRun}**`);
    lines.push(``);
    await this.publishReport(lines.join("\n"));
  }
  async publishReport(report) {
    const maybeRelativeFile = this._options.outputFile || "report.md";
    const reportFile = import_path.default.resolve(this._options.configDir, maybeRelativeFile);
    await import_fs.default.promises.mkdir(import_path.default.dirname(reportFile), { recursive: true });
    await import_fs.default.promises.writeFile(reportFile, report);
  }
  _generateSummary() {
    let didNotRun = 0;
    let skipped = 0;
    let expected = 0;
    const interrupted = [];
    const interruptedToPrint = [];
    const unexpected = [];
    const flaky = [];
    this._suite.allTests().forEach((test) => {
      switch (test.outcome()) {
        case "skipped": {
          if (test.results.some((result) => result.status === "interrupted")) {
            if (test.results.some((result) => !!result.error))
              interruptedToPrint.push(test);
            interrupted.push(test);
          } else if (!test.results.length || test.expectedStatus !== "skipped") {
            ++didNotRun;
          } else {
            ++skipped;
          }
          break;
        }
        case "expected":
          ++expected;
          break;
        case "unexpected":
          unexpected.push(test);
          break;
        case "flaky":
          flaky.push(test);
          break;
      }
    });
    return {
      didNotRun,
      skipped,
      expected,
      interrupted,
      unexpected,
      flaky
    };
  }
  _printTestList(prefix, tests, lines, suffix) {
    for (const test of tests)
      lines.push(`${prefix} ${formatTestTitle(this._config.rootDir, test)}${suffix || ""}`);
    lines.push(``);
  }
}
function formatTestTitle(rootDir, test) {
  const [, projectName, , ...titles] = test.titlePath();
  const relativeTestPath = import_path.default.relative(rootDir, test.location.file);
  const location = `${relativeTestPath}:${test.location.line}`;
  const projectTitle = projectName ? `[${projectName}] \u203A ` : "";
  const testTitle = `${projectTitle}${location} \u203A ${titles.join(" \u203A ")}`;
  const extraTags = test.tags.filter((t) => !testTitle.includes(t));
  const formattedTags = extraTags.map((t) => `\`${t}\``).join(" ");
  return `${testTitle}${extraTags.length ? " " + formattedTags : ""}`;
}
var markdown_default = MarkdownReporter;
