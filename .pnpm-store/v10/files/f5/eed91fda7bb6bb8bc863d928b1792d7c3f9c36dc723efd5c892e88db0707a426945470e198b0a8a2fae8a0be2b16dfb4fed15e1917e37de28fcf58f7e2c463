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
var reporters_exports = {};
__export(reporters_exports, {
  createErrorCollectingReporter: () => createErrorCollectingReporter,
  createReporterForTestServer: () => createReporterForTestServer,
  createReporters: () => createReporters
});
module.exports = __toCommonJS(reporters_exports);
var import_utils = require("playwright-core/lib/utils");
var import_loadUtils = require("./loadUtils");
var import_base = require("../reporters/base");
var import_blob = require("../reporters/blob");
var import_dot = __toESM(require("../reporters/dot"));
var import_empty = __toESM(require("../reporters/empty"));
var import_github = __toESM(require("../reporters/github"));
var import_html = __toESM(require("../reporters/html"));
var import_json = __toESM(require("../reporters/json"));
var import_junit = __toESM(require("../reporters/junit"));
var import_line = __toESM(require("../reporters/line"));
var import_list = __toESM(require("../reporters/list"));
var import_listModeReporter = __toESM(require("../reporters/listModeReporter"));
var import_reporterV2 = require("../reporters/reporterV2");
async function createReporters(config, mode, descriptions) {
  const defaultReporters = {
    blob: import_blob.BlobReporter,
    dot: mode === "list" ? import_listModeReporter.default : import_dot.default,
    line: mode === "list" ? import_listModeReporter.default : import_line.default,
    list: mode === "list" ? import_listModeReporter.default : import_list.default,
    github: import_github.default,
    json: import_json.default,
    junit: import_junit.default,
    null: import_empty.default,
    html: import_html.default
  };
  const reporters = [];
  descriptions ??= config.config.reporter;
  if (config.configCLIOverrides.additionalReporters)
    descriptions = [...descriptions, ...config.configCLIOverrides.additionalReporters];
  const runOptions = reporterOptions(config, mode);
  for (const r of descriptions) {
    const [name, arg] = r;
    const options = { ...runOptions, ...arg };
    if (name in defaultReporters) {
      reporters.push(new defaultReporters[name](options));
    } else {
      const reporterConstructor = await (0, import_loadUtils.loadReporter)(config, name);
      reporters.push((0, import_reporterV2.wrapReporterAsV2)(new reporterConstructor(options)));
    }
  }
  if (process.env.PW_TEST_REPORTER) {
    const reporterConstructor = await (0, import_loadUtils.loadReporter)(config, process.env.PW_TEST_REPORTER);
    reporters.push((0, import_reporterV2.wrapReporterAsV2)(new reporterConstructor(runOptions)));
  }
  const someReporterPrintsToStdio = reporters.some((r) => r.printsToStdio ? r.printsToStdio() : true);
  if (reporters.length && !someReporterPrintsToStdio) {
    if (mode === "list")
      reporters.unshift(new import_listModeReporter.default());
    else if (mode !== "merge")
      reporters.unshift(!process.env.CI ? new import_line.default() : new import_dot.default());
  }
  return reporters;
}
async function createReporterForTestServer(file, messageSink) {
  const reporterConstructor = await (0, import_loadUtils.loadReporter)(null, file);
  return (0, import_reporterV2.wrapReporterAsV2)(new reporterConstructor({
    _send: messageSink
  }));
}
function createErrorCollectingReporter(screen) {
  const errors = [];
  return {
    version: () => "v2",
    onError(error) {
      errors.push(error);
      screen.stderr?.write((0, import_base.formatError)(screen, error).message + "\n");
    },
    errors: () => errors
  };
}
function reporterOptions(config, mode) {
  return {
    configDir: config.configDir,
    _mode: mode,
    _commandHash: computeCommandHash(config)
  };
}
function computeCommandHash(config) {
  const parts = [];
  if (config.cliProjectFilter)
    parts.push(...config.cliProjectFilter);
  const command = {};
  if (config.cliArgs.length)
    command.cliArgs = config.cliArgs;
  if (config.cliGrep)
    command.cliGrep = config.cliGrep;
  if (config.cliGrepInvert)
    command.cliGrepInvert = config.cliGrepInvert;
  if (config.cliOnlyChanged)
    command.cliOnlyChanged = config.cliOnlyChanged;
  if (config.config.tags.length)
    command.tags = config.config.tags.join(" ");
  if (Object.keys(command).length)
    parts.push((0, import_utils.calculateSha1)(JSON.stringify(command)).substring(0, 7));
  return parts.join("-");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createErrorCollectingReporter,
  createReporterForTestServer,
  createReporters
});
