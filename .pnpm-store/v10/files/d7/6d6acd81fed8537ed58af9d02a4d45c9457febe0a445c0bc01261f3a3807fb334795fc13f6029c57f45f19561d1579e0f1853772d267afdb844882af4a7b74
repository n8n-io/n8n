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
var github_exports = {};
__export(github_exports, {
  GitHubReporter: () => GitHubReporter,
  default: () => github_default
});
module.exports = __toCommonJS(github_exports);
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_base = require("./base");
var import_util = require("../util");
class GitHubLogger {
  _log(message, type = "notice", options = {}) {
    message = message.replace(/\n/g, "%0A");
    const configs = Object.entries(options).map(([key, option]) => `${key}=${option}`).join(",");
    process.stdout.write((0, import_util.stripAnsiEscapes)(`::${type} ${configs}::${message}
`));
  }
  debug(message, options) {
    this._log(message, "debug", options);
  }
  error(message, options) {
    this._log(message, "error", options);
  }
  notice(message, options) {
    this._log(message, "notice", options);
  }
  warning(message, options) {
    this._log(message, "warning", options);
  }
}
class GitHubReporter extends import_base.TerminalReporter {
  constructor(options = {}) {
    super(options);
    this.githubLogger = new GitHubLogger();
    this.screen = { ...this.screen, colors: import_utils.noColors };
  }
  printsToStdio() {
    return false;
  }
  async onEnd(result) {
    await super.onEnd(result);
    this._printAnnotations();
  }
  onError(error) {
    const errorMessage = this.formatError(error).message;
    this.githubLogger.error(errorMessage);
  }
  _printAnnotations() {
    const summary = this.generateSummary();
    const summaryMessage = this.generateSummaryMessage(summary);
    if (summary.failuresToPrint.length)
      this._printFailureAnnotations(summary.failuresToPrint);
    this._printSlowTestAnnotations();
    this._printSummaryAnnotation(summaryMessage);
  }
  _printSlowTestAnnotations() {
    this.getSlowTests().forEach(([file, duration]) => {
      const filePath = workspaceRelativePath(import_path.default.join(process.cwd(), file));
      this.githubLogger.warning(`${filePath} took ${(0, import_utilsBundle.ms)(duration)}`, {
        title: "Slow Test",
        file: filePath
      });
    });
  }
  _printSummaryAnnotation(summary) {
    this.githubLogger.notice(summary, {
      title: "\u{1F3AD} Playwright Run Summary"
    });
  }
  _printFailureAnnotations(failures) {
    failures.forEach((test, index) => {
      const title = this.formatTestTitle(test);
      const header = this.formatTestHeader(test, { indent: "  ", index: index + 1, mode: "error" });
      for (const result of test.results) {
        const errors = (0, import_base.formatResultFailure)(this.screen, test, result, "    ");
        for (const error of errors) {
          const options = {
            file: workspaceRelativePath(error.location?.file || test.location.file),
            title
          };
          if (error.location) {
            options.line = error.location.line;
            options.col = error.location.column;
          }
          const message = [header, ...(0, import_base.formatRetry)(this.screen, result), error.message].join("\n");
          this.githubLogger.error(message, options);
        }
      }
    });
  }
}
function workspaceRelativePath(filePath) {
  return import_path.default.relative(process.env["GITHUB_WORKSPACE"] ?? "", filePath);
}
var github_default = GitHubReporter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GitHubReporter
});
