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
var base_exports = {};
__export(base_exports, {
  TerminalReporter: () => TerminalReporter,
  fitToWidth: () => fitToWidth,
  formatError: () => formatError,
  formatFailure: () => formatFailure,
  formatResultFailure: () => formatResultFailure,
  formatRetry: () => formatRetry,
  internalScreen: () => internalScreen,
  kOutputSymbol: () => kOutputSymbol,
  markErrorsAsReported: () => markErrorsAsReported,
  nonTerminalScreen: () => nonTerminalScreen,
  prepareErrorStack: () => prepareErrorStack,
  relativeFilePath: () => relativeFilePath,
  resolveOutputFile: () => resolveOutputFile,
  separator: () => separator,
  stepSuffix: () => stepSuffix,
  terminalScreen: () => terminalScreen
});
module.exports = __toCommonJS(base_exports);
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_utils2 = require("playwright-core/lib/utils");
var import_util = require("../util");
var import_utilsBundle2 = require("../utilsBundle");
const kOutputSymbol = Symbol("output");
const DEFAULT_TTY_WIDTH = 100;
const DEFAULT_TTY_HEIGHT = 40;
const originalProcessStdout = process.stdout;
const originalProcessStderr = process.stderr;
const terminalScreen = (() => {
  let isTTY = !!originalProcessStdout.isTTY;
  let ttyWidth = originalProcessStdout.columns || 0;
  let ttyHeight = originalProcessStdout.rows || 0;
  if (process.env.PLAYWRIGHT_FORCE_TTY === "false" || process.env.PLAYWRIGHT_FORCE_TTY === "0") {
    isTTY = false;
    ttyWidth = 0;
    ttyHeight = 0;
  } else if (process.env.PLAYWRIGHT_FORCE_TTY === "true" || process.env.PLAYWRIGHT_FORCE_TTY === "1") {
    isTTY = true;
    ttyWidth = originalProcessStdout.columns || DEFAULT_TTY_WIDTH;
    ttyHeight = originalProcessStdout.rows || DEFAULT_TTY_HEIGHT;
  } else if (process.env.PLAYWRIGHT_FORCE_TTY) {
    isTTY = true;
    const sizeMatch = process.env.PLAYWRIGHT_FORCE_TTY.match(/^(\d+)x(\d+)$/);
    if (sizeMatch) {
      ttyWidth = +sizeMatch[1];
      ttyHeight = +sizeMatch[2];
    } else {
      ttyWidth = +process.env.PLAYWRIGHT_FORCE_TTY;
      ttyHeight = DEFAULT_TTY_HEIGHT;
    }
    if (isNaN(ttyWidth))
      ttyWidth = DEFAULT_TTY_WIDTH;
    if (isNaN(ttyHeight))
      ttyHeight = DEFAULT_TTY_HEIGHT;
  }
  let useColors = isTTY;
  if (process.env.DEBUG_COLORS === "0" || process.env.DEBUG_COLORS === "false" || process.env.FORCE_COLOR === "0" || process.env.FORCE_COLOR === "false")
    useColors = false;
  else if (process.env.DEBUG_COLORS || process.env.FORCE_COLOR)
    useColors = true;
  const colors = useColors ? import_utils2.colors : import_utils2.noColors;
  return {
    resolveFiles: "cwd",
    isTTY,
    ttyWidth,
    ttyHeight,
    colors,
    stdout: originalProcessStdout,
    stderr: originalProcessStderr
  };
})();
const nonTerminalScreen = {
  colors: terminalScreen.colors,
  isTTY: false,
  ttyWidth: 0,
  ttyHeight: 0,
  resolveFiles: "rootDir"
};
const internalScreen = {
  colors: import_utils2.colors,
  isTTY: false,
  ttyWidth: 0,
  ttyHeight: 0,
  resolveFiles: "rootDir"
};
class TerminalReporter {
  constructor(options = {}) {
    this.totalTestCount = 0;
    this.fileDurations = /* @__PURE__ */ new Map();
    this._fatalErrors = [];
    this._failureCount = 0;
    this.screen = options.screen ?? terminalScreen;
    this._options = options;
  }
  version() {
    return "v2";
  }
  onConfigure(config) {
    this.config = config;
  }
  onBegin(suite) {
    this.suite = suite;
    this.totalTestCount = suite.allTests().length;
  }
  onStdOut(chunk, test, result) {
    this._appendOutput({ chunk, type: "stdout" }, result);
  }
  onStdErr(chunk, test, result) {
    this._appendOutput({ chunk, type: "stderr" }, result);
  }
  _appendOutput(output, result) {
    if (!result)
      return;
    result[kOutputSymbol] = result[kOutputSymbol] || [];
    result[kOutputSymbol].push(output);
  }
  onTestEnd(test, result) {
    if (result.status !== "skipped" && result.status !== test.expectedStatus)
      ++this._failureCount;
    const projectName = test.titlePath()[1];
    const relativePath = relativeTestPath(this.screen, this.config, test);
    const fileAndProject = (projectName ? `[${projectName}] \u203A ` : "") + relativePath;
    const entry = this.fileDurations.get(fileAndProject) || { duration: 0, workers: /* @__PURE__ */ new Set() };
    entry.duration += result.duration;
    entry.workers.add(result.workerIndex);
    this.fileDurations.set(fileAndProject, entry);
  }
  onError(error) {
    this._fatalErrors.push(error);
  }
  async onEnd(result) {
    this.result = result;
  }
  fitToScreen(line, prefix) {
    if (!this.screen.ttyWidth) {
      return line;
    }
    return fitToWidth(line, this.screen.ttyWidth, prefix);
  }
  generateStartingMessage() {
    const jobs = this.config.metadata.actualWorkers ?? this.config.workers;
    const shardDetails = this.config.shard ? `, shard ${this.config.shard.current} of ${this.config.shard.total}` : "";
    if (!this.totalTestCount)
      return "";
    return "\n" + this.screen.colors.dim("Running ") + this.totalTestCount + this.screen.colors.dim(` test${this.totalTestCount !== 1 ? "s" : ""} using `) + jobs + this.screen.colors.dim(` worker${jobs !== 1 ? "s" : ""}${shardDetails}`);
  }
  getSlowTests() {
    if (!this.config.reportSlowTests)
      return [];
    const fileDurations = [...this.fileDurations.entries()].filter(([key, value]) => value.workers.size === 1).map(([key, value]) => [key, value.duration]);
    fileDurations.sort((a, b) => b[1] - a[1]);
    const count = Math.min(fileDurations.length, this.config.reportSlowTests.max || Number.POSITIVE_INFINITY);
    const threshold = this.config.reportSlowTests.threshold;
    return fileDurations.filter(([, duration]) => duration > threshold).slice(0, count);
  }
  generateSummaryMessage({ didNotRun, skipped, expected, interrupted, unexpected, flaky, fatalErrors }) {
    const tokens = [];
    if (unexpected.length) {
      tokens.push(this.screen.colors.red(`  ${unexpected.length} failed`));
      for (const test of unexpected)
        tokens.push(this.screen.colors.red(this.formatTestHeader(test, { indent: "    " })));
    }
    if (interrupted.length) {
      tokens.push(this.screen.colors.yellow(`  ${interrupted.length} interrupted`));
      for (const test of interrupted)
        tokens.push(this.screen.colors.yellow(this.formatTestHeader(test, { indent: "    " })));
    }
    if (flaky.length) {
      tokens.push(this.screen.colors.yellow(`  ${flaky.length} flaky`));
      for (const test of flaky)
        tokens.push(this.screen.colors.yellow(this.formatTestHeader(test, { indent: "    " })));
    }
    if (skipped)
      tokens.push(this.screen.colors.yellow(`  ${skipped} skipped`));
    if (didNotRun)
      tokens.push(this.screen.colors.yellow(`  ${didNotRun} did not run`));
    if (expected)
      tokens.push(this.screen.colors.green(`  ${expected} passed`) + this.screen.colors.dim(` (${(0, import_utilsBundle.ms)(this.result.duration)})`));
    if (fatalErrors.length && expected + unexpected.length + interrupted.length + flaky.length > 0)
      tokens.push(this.screen.colors.red(`  ${fatalErrors.length === 1 ? "1 error was not a part of any test" : fatalErrors.length + " errors were not a part of any test"}, see above for details`));
    return tokens.join("\n");
  }
  generateSummary() {
    let didNotRun = 0;
    let skipped = 0;
    let expected = 0;
    const interrupted = [];
    const interruptedToPrint = [];
    const unexpected = [];
    const flaky = [];
    this.suite.allTests().forEach((test) => {
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
    const failuresToPrint = [...unexpected, ...flaky, ...interruptedToPrint];
    return {
      didNotRun,
      skipped,
      expected,
      interrupted,
      unexpected,
      flaky,
      failuresToPrint,
      fatalErrors: this._fatalErrors
    };
  }
  epilogue(full) {
    const summary = this.generateSummary();
    const summaryMessage = this.generateSummaryMessage(summary);
    if (full && summary.failuresToPrint.length && !this._options.omitFailures)
      this._printFailures(summary.failuresToPrint);
    this._printSlowTests();
    this._printSummary(summaryMessage);
  }
  _printFailures(failures) {
    this.writeLine("");
    failures.forEach((test, index) => {
      this.writeLine(this.formatFailure(test, index + 1));
    });
  }
  _printSlowTests() {
    const slowTests = this.getSlowTests();
    slowTests.forEach(([file, duration]) => {
      this.writeLine(this.screen.colors.yellow("  Slow test file: ") + file + this.screen.colors.yellow(` (${(0, import_utilsBundle.ms)(duration)})`));
    });
    if (slowTests.length)
      this.writeLine(this.screen.colors.yellow("  Consider running tests from slow files in parallel. See: https://playwright.dev/docs/test-parallel"));
  }
  _printSummary(summary) {
    if (summary.trim())
      this.writeLine(summary);
  }
  willRetry(test) {
    return test.outcome() === "unexpected" && test.results.length <= test.retries;
  }
  formatTestTitle(test, step) {
    return formatTestTitle(this.screen, this.config, test, step, this._options);
  }
  formatTestHeader(test, options = {}) {
    return formatTestHeader(this.screen, this.config, test, { ...options, includeTestId: this._options.includeTestId });
  }
  formatFailure(test, index) {
    return formatFailure(this.screen, this.config, test, index, this._options);
  }
  formatError(error) {
    return formatError(this.screen, error);
  }
  formatResultErrors(test, result) {
    return formatResultErrors(this.screen, test, result);
  }
  writeLine(line) {
    this.screen.stdout?.write(line ? line + "\n" : "\n");
  }
}
function formatResultErrors(screen, test, result) {
  const lines = [];
  if (test.outcome() === "unexpected") {
    const errorDetails = formatResultFailure(screen, test, result, "    ");
    if (errorDetails.length > 0)
      lines.push("");
    for (const error of errorDetails)
      lines.push(error.message, "");
  }
  return lines.join("\n");
}
function formatFailure(screen, config, test, index, options) {
  const lines = [];
  let printedHeader = false;
  for (const result of test.results) {
    const resultLines = [];
    const errors = formatResultFailure(screen, test, result, "    ");
    if (!errors.length)
      continue;
    if (!printedHeader) {
      const header = formatTestHeader(screen, config, test, { indent: "  ", index, mode: "error", includeTestId: options?.includeTestId });
      lines.push(screen.colors.red(header));
      printedHeader = true;
    }
    if (result.retry) {
      resultLines.push("");
      resultLines.push(screen.colors.gray(separator(screen, `    Retry #${result.retry}`)));
    }
    resultLines.push(...errors.map((error) => "\n" + error.message));
    const attachmentGroups = groupAttachments(result.attachments);
    for (let i = 0; i < attachmentGroups.length; ++i) {
      const attachment = attachmentGroups[i];
      if (attachment.name === "error-context" && attachment.path) {
        resultLines.push("");
        resultLines.push(screen.colors.dim(`    Error Context: ${relativeFilePath(screen, config, attachment.path)}`));
        continue;
      }
      if (attachment.name.startsWith("_"))
        continue;
      const hasPrintableContent = attachment.contentType.startsWith("text/");
      if (!attachment.path && !hasPrintableContent)
        continue;
      resultLines.push("");
      resultLines.push(screen.colors.dim(separator(screen, `    attachment #${i + 1}: ${screen.colors.bold(attachment.name)} (${attachment.contentType})`)));
      if (attachment.actual?.path) {
        if (attachment.expected?.path) {
          const expectedPath = relativeFilePath(screen, config, attachment.expected.path);
          resultLines.push(screen.colors.dim(`    Expected: ${expectedPath}`));
        }
        const actualPath = relativeFilePath(screen, config, attachment.actual.path);
        resultLines.push(screen.colors.dim(`    Received: ${actualPath}`));
        if (attachment.previous?.path) {
          const previousPath = relativeFilePath(screen, config, attachment.previous.path);
          resultLines.push(screen.colors.dim(`    Previous: ${previousPath}`));
        }
        if (attachment.diff?.path) {
          const diffPath = relativeFilePath(screen, config, attachment.diff.path);
          resultLines.push(screen.colors.dim(`    Diff:     ${diffPath}`));
        }
      } else if (attachment.path) {
        const relativePath = relativeFilePath(screen, config, attachment.path);
        resultLines.push(screen.colors.dim(`    ${relativePath}`));
        if (attachment.name === "trace") {
          const packageManagerCommand = (0, import_utils.getPackageManagerExecCommand)();
          resultLines.push(screen.colors.dim(`    Usage:`));
          resultLines.push("");
          resultLines.push(screen.colors.dim(`        ${packageManagerCommand} playwright show-trace ${quotePathIfNeeded(relativePath)}`));
          resultLines.push("");
        }
      } else {
        if (attachment.contentType.startsWith("text/") && attachment.body) {
          let text = attachment.body.toString();
          if (text.length > 300)
            text = text.slice(0, 300) + "...";
          for (const line of text.split("\n"))
            resultLines.push(screen.colors.dim(`    ${line}`));
        }
      }
      resultLines.push(screen.colors.dim(separator(screen, "   ")));
    }
    lines.push(...resultLines);
  }
  lines.push("");
  return lines.join("\n");
}
function formatRetry(screen, result) {
  const retryLines = [];
  if (result.retry) {
    retryLines.push("");
    retryLines.push(screen.colors.gray(separator(screen, `    Retry #${result.retry}`)));
  }
  return retryLines;
}
function quotePathIfNeeded(path2) {
  if (/\s/.test(path2))
    return `"${path2}"`;
  return path2;
}
const kReportedSymbol = Symbol("reported");
function markErrorsAsReported(result) {
  result[kReportedSymbol] = result.errors.length;
}
function formatResultFailure(screen, test, result, initialIndent) {
  const errorDetails = [];
  if (result.status === "passed" && test.expectedStatus === "failed") {
    errorDetails.push({
      message: indent(screen.colors.red(`Expected to fail, but passed.`), initialIndent)
    });
  }
  if (result.status === "interrupted") {
    errorDetails.push({
      message: indent(screen.colors.red(`Test was interrupted.`), initialIndent)
    });
  }
  const reportedIndex = result[kReportedSymbol] || 0;
  for (const error of result.errors.slice(reportedIndex)) {
    const formattedError = formatError(screen, error);
    errorDetails.push({
      message: indent(formattedError.message, initialIndent),
      location: formattedError.location
    });
  }
  return errorDetails;
}
function relativeFilePath(screen, config, file) {
  if (screen.resolveFiles === "cwd")
    return import_path.default.relative(process.cwd(), file);
  return import_path.default.relative(config.rootDir, file);
}
function relativeTestPath(screen, config, test) {
  return relativeFilePath(screen, config, test.location.file);
}
function stepSuffix(step) {
  const stepTitles = step ? step.titlePath() : [];
  return stepTitles.map((t) => t.split("\n")[0]).map((t) => " \u203A " + t).join("");
}
function formatTestTitle(screen, config, test, step, options = {}) {
  const [, projectName, , ...titles] = test.titlePath();
  const location = `${relativeTestPath(screen, config, test)}:${test.location.line}:${test.location.column}`;
  const testId = options.includeTestId ? `[id=${test.id}] ` : "";
  const projectLabel = options.includeTestId ? `project=` : "";
  const projectTitle = projectName ? `[${projectLabel}${projectName}] \u203A ` : "";
  const testTitle = `${testId}${projectTitle}${location} \u203A ${titles.join(" \u203A ")}`;
  const extraTags = test.tags.filter((t) => !testTitle.includes(t) && !config.tags.includes(t));
  return `${testTitle}${stepSuffix(step)}${extraTags.length ? " " + extraTags.join(" ") : ""}`;
}
function formatTestHeader(screen, config, test, options = {}) {
  const title = formatTestTitle(screen, config, test, void 0, options);
  const header = `${options.indent || ""}${options.index ? options.index + ") " : ""}${title}`;
  let fullHeader = header;
  if (options.mode === "error") {
    const stepPaths = /* @__PURE__ */ new Set();
    for (const result of test.results.filter((r) => !!r.errors.length)) {
      const stepPath = [];
      const visit = (steps) => {
        const errors = steps.filter((s) => s.error);
        if (errors.length > 1)
          return;
        if (errors.length === 1 && errors[0].category === "test.step") {
          stepPath.push(errors[0].title);
          visit(errors[0].steps);
        }
      };
      visit(result.steps);
      stepPaths.add(["", ...stepPath].join(" \u203A "));
    }
    fullHeader = header + (stepPaths.size === 1 ? stepPaths.values().next().value : "");
  }
  return separator(screen, fullHeader);
}
function formatError(screen, error) {
  const message = error.message || error.value || "";
  const stack = error.stack;
  if (!stack && !error.location)
    return { message };
  const tokens = [];
  const parsedStack = stack ? prepareErrorStack(stack) : void 0;
  tokens.push(parsedStack?.message || message);
  if (error.snippet) {
    let snippet = error.snippet;
    if (!screen.colors.enabled)
      snippet = (0, import_util.stripAnsiEscapes)(snippet);
    tokens.push("");
    tokens.push(snippet);
  }
  if (parsedStack && parsedStack.stackLines.length)
    tokens.push(screen.colors.dim(parsedStack.stackLines.join("\n")));
  let location = error.location;
  if (parsedStack && !location)
    location = parsedStack.location;
  if (error.cause)
    tokens.push(screen.colors.dim("[cause]: ") + formatError(screen, error.cause).message);
  return {
    location,
    message: tokens.join("\n")
  };
}
function separator(screen, text = "") {
  if (text)
    text += " ";
  const columns = Math.min(100, screen.ttyWidth || 100);
  return text + screen.colors.dim("\u2500".repeat(Math.max(0, columns - (0, import_util.stripAnsiEscapes)(text).length)));
}
function indent(lines, tab) {
  return lines.replace(/^(?=.+$)/gm, tab);
}
function prepareErrorStack(stack) {
  return (0, import_utils.parseErrorStack)(stack, import_path.default.sep, !!process.env.PWDEBUGIMPL);
}
function characterWidth(c) {
  return import_utilsBundle2.getEastAsianWidth.eastAsianWidth(c.codePointAt(0));
}
function stringWidth(v) {
  let width = 0;
  for (const { segment } of new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(v))
    width += characterWidth(segment);
  return width;
}
function suffixOfWidth(v, width) {
  const segments = [...new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(v)];
  let suffixBegin = v.length;
  for (const { segment, index } of segments.reverse()) {
    const segmentWidth = stringWidth(segment);
    if (segmentWidth > width)
      break;
    width -= segmentWidth;
    suffixBegin = index;
  }
  return v.substring(suffixBegin);
}
function fitToWidth(line, width, prefix) {
  const prefixLength = prefix ? (0, import_util.stripAnsiEscapes)(prefix).length : 0;
  width -= prefixLength;
  if (stringWidth(line) <= width)
    return line;
  const parts = line.split(import_util.ansiRegex);
  const taken = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (i % 2) {
      taken.push(parts[i]);
    } else {
      let part = suffixOfWidth(parts[i], width);
      const wasTruncated = part.length < parts[i].length;
      if (wasTruncated && parts[i].length > 0) {
        part = "\u2026" + suffixOfWidth(parts[i], width - 1);
      }
      taken.push(part);
      width -= stringWidth(part);
    }
  }
  return taken.reverse().join("");
}
function resolveFromEnv(name) {
  const value = process.env[name];
  if (value)
    return import_path.default.resolve(process.cwd(), value);
  return void 0;
}
function resolveOutputFile(reporterName, options) {
  const name = reporterName.toUpperCase();
  let outputFile = resolveFromEnv(`PLAYWRIGHT_${name}_OUTPUT_FILE`);
  if (!outputFile && options.outputFile)
    outputFile = import_path.default.resolve(options.configDir, options.outputFile);
  if (outputFile)
    return { outputFile };
  let outputDir = resolveFromEnv(`PLAYWRIGHT_${name}_OUTPUT_DIR`);
  if (!outputDir && options.outputDir)
    outputDir = import_path.default.resolve(options.configDir, options.outputDir);
  if (!outputDir && options.default)
    outputDir = (0, import_util.resolveReporterOutputPath)(options.default.outputDir, options.configDir, void 0);
  if (!outputDir)
    outputDir = options.configDir;
  const reportName = process.env[`PLAYWRIGHT_${name}_OUTPUT_NAME`] ?? options.fileName ?? options.default?.fileName;
  if (!reportName)
    return void 0;
  outputFile = import_path.default.resolve(outputDir, reportName);
  return { outputFile, outputDir };
}
function groupAttachments(attachments) {
  const result = [];
  const attachmentsByPrefix = /* @__PURE__ */ new Map();
  for (const attachment of attachments) {
    if (!attachment.path) {
      result.push(attachment);
      continue;
    }
    const match = attachment.name.match(/^(.*)-(expected|actual|diff|previous)(\.[^.]+)?$/);
    if (!match) {
      result.push(attachment);
      continue;
    }
    const [, name, category] = match;
    let group = attachmentsByPrefix.get(name);
    if (!group) {
      group = { ...attachment, name };
      attachmentsByPrefix.set(name, group);
      result.push(group);
    }
    if (category === "expected")
      group.expected = attachment;
    else if (category === "actual")
      group.actual = attachment;
    else if (category === "diff")
      group.diff = attachment;
    else if (category === "previous")
      group.previous = attachment;
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TerminalReporter,
  fitToWidth,
  formatError,
  formatFailure,
  formatResultFailure,
  formatRetry,
  internalScreen,
  kOutputSymbol,
  markErrorsAsReported,
  nonTerminalScreen,
  prepareErrorStack,
  relativeFilePath,
  resolveOutputFile,
  separator,
  stepSuffix,
  terminalScreen
});
