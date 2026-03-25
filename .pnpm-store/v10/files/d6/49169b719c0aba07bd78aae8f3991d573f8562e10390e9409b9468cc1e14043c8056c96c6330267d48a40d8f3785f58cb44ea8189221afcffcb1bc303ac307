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
var listModeReporter_exports = {};
__export(listModeReporter_exports, {
  default: () => listModeReporter_default
});
module.exports = __toCommonJS(listModeReporter_exports);
var import_path = __toESM(require("path"));
var import_base = require("./base");
class ListModeReporter {
  constructor(options = {}) {
    this._options = options;
    this.screen = options?.screen ?? import_base.terminalScreen;
  }
  version() {
    return "v2";
  }
  onConfigure(config) {
    this.config = config;
  }
  onBegin(suite) {
    this._writeLine(`Listing tests:`);
    const tests = suite.allTests();
    const files = /* @__PURE__ */ new Set();
    for (const test of tests) {
      const [, projectName, , ...titles] = test.titlePath();
      const location = `${import_path.default.relative(this.config.rootDir, test.location.file)}:${test.location.line}:${test.location.column}`;
      const testId = this._options.includeTestId ? `[id=${test.id}] ` : "";
      const projectLabel = this._options.includeTestId ? `project=` : "";
      const projectTitle = projectName ? `[${projectLabel}${projectName}] \u203A ` : "";
      this._writeLine(`  ${testId}${projectTitle}${location} \u203A ${titles.join(" \u203A ")}`);
      files.add(test.location.file);
    }
    this._writeLine(`Total: ${tests.length} ${tests.length === 1 ? "test" : "tests"} in ${files.size} ${files.size === 1 ? "file" : "files"}`);
  }
  onError(error) {
    this.screen.stderr.write("\n" + (0, import_base.formatError)(import_base.terminalScreen, error).message + "\n");
  }
  _writeLine(line) {
    this.screen.stdout.write(line + "\n");
  }
}
var listModeReporter_default = ListModeReporter;
