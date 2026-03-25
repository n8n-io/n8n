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
var list_exports = {};
__export(list_exports, {
  default: () => list_default
});
module.exports = __toCommonJS(list_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_base = require("./base");
var import_util = require("../util");
const DOES_NOT_SUPPORT_UTF8_IN_TERMINAL = process.platform === "win32" && process.env.TERM_PROGRAM !== "vscode" && !process.env.WT_SESSION;
const POSITIVE_STATUS_MARK = DOES_NOT_SUPPORT_UTF8_IN_TERMINAL ? "ok" : "\u2713";
const NEGATIVE_STATUS_MARK = DOES_NOT_SUPPORT_UTF8_IN_TERMINAL ? "x" : "\u2718";
class ListReporter extends import_base.TerminalReporter {
  constructor(options) {
    super(options);
    this._lastRow = 0;
    this._lastColumn = 0;
    this._testRows = /* @__PURE__ */ new Map();
    this._stepRows = /* @__PURE__ */ new Map();
    this._resultIndex = /* @__PURE__ */ new Map();
    this._stepIndex = /* @__PURE__ */ new Map();
    this._needNewLine = false;
    this._paused = /* @__PURE__ */ new Set();
    this._printSteps = (0, import_utils.getAsBooleanFromENV)("PLAYWRIGHT_LIST_PRINT_STEPS", options?.printSteps);
  }
  onBegin(suite) {
    super.onBegin(suite);
    const startingMessage = this.generateStartingMessage();
    if (startingMessage) {
      this.writeLine(startingMessage);
      this.writeLine("");
    }
  }
  onTestBegin(test, result) {
    const index = String(this._resultIndex.size + 1);
    this._resultIndex.set(result, index);
    if (!this.screen.isTTY)
      return;
    this._maybeWriteNewLine();
    this._testRows.set(test, this._lastRow);
    const prefix = this._testPrefix(index, "");
    const line = this.screen.colors.dim(this.formatTestTitle(test)) + this._retrySuffix(result);
    this._appendLine(line, prefix);
  }
  onStdOut(chunk, test, result) {
    super.onStdOut(chunk, test, result);
    this._dumpToStdio(test, chunk, this.screen.stdout, "out");
  }
  onStdErr(chunk, test, result) {
    super.onStdErr(chunk, test, result);
    this._dumpToStdio(test, chunk, this.screen.stderr, "err");
  }
  getStepIndex(testIndex, result, step) {
    if (this._stepIndex.has(step))
      return this._stepIndex.get(step);
    const ordinal = (result[lastStepOrdinalSymbol] || 0) + 1;
    result[lastStepOrdinalSymbol] = ordinal;
    const stepIndex = `${testIndex}.${ordinal}`;
    this._stepIndex.set(step, stepIndex);
    return stepIndex;
  }
  onStepBegin(test, result, step) {
    if (step.category !== "test.step")
      return;
    const testIndex = this._resultIndex.get(result) || "";
    if (!this.screen.isTTY)
      return;
    if (this._printSteps) {
      this._maybeWriteNewLine();
      this._stepRows.set(step, this._lastRow);
      const prefix = this._testPrefix(this.getStepIndex(testIndex, result, step), "");
      const line = test.title + this.screen.colors.dim((0, import_base.stepSuffix)(step));
      this._appendLine(line, prefix);
    } else {
      this._updateOrAppendLine(this._testRows, test, this.screen.colors.dim(this.formatTestTitle(test, step)) + this._retrySuffix(result), this._testPrefix(testIndex, ""));
    }
  }
  onStepEnd(test, result, step) {
    if (step.category !== "test.step")
      return;
    const testIndex = this._resultIndex.get(result) || "";
    if (!this._printSteps) {
      if (this.screen.isTTY)
        this._updateOrAppendLine(this._testRows, test, this.screen.colors.dim(this.formatTestTitle(test, step.parent)) + this._retrySuffix(result), this._testPrefix(testIndex, ""));
      return;
    }
    const index = this.getStepIndex(testIndex, result, step);
    const title = this.screen.isTTY ? test.title + this.screen.colors.dim((0, import_base.stepSuffix)(step)) : this.formatTestTitle(test, step);
    const prefix = this._testPrefix(index, "");
    let text = "";
    if (step.error)
      text = this.screen.colors.red(title);
    else
      text = title;
    text += this.screen.colors.dim(` (${(0, import_utilsBundle.ms)(step.duration)})`);
    this._updateOrAppendLine(this._stepRows, step, text, prefix);
  }
  _maybeWriteNewLine() {
    if (this._needNewLine) {
      this._needNewLine = false;
      this.screen.stdout.write("\n");
      ++this._lastRow;
      this._lastColumn = 0;
    }
  }
  _updateLineCountAndNewLineFlagForOutput(text) {
    this._needNewLine = text[text.length - 1] !== "\n";
    if (!this.screen.ttyWidth)
      return;
    for (const ch of text) {
      if (ch === "\n") {
        this._lastColumn = 0;
        ++this._lastRow;
        continue;
      }
      ++this._lastColumn;
      if (this._lastColumn > this.screen.ttyWidth) {
        this._lastColumn = 0;
        ++this._lastRow;
      }
    }
  }
  _dumpToStdio(test, chunk, stream, stdio) {
    if (this.config.quiet)
      return;
    const text = chunk.toString("utf-8");
    this._updateLineCountAndNewLineFlagForOutput(text);
    stream.write(chunk);
  }
  async onTestPaused(test, result) {
    if (!process.stdin.isTTY && !process.env.PW_TEST_DEBUG_REPORTERS)
      return;
    this._paused.add(result);
    this._updateTestLine(test, result);
    this._maybeWriteNewLine();
    if (test.outcome() === "unexpected") {
      const errors = this.formatResultErrors(test, result);
      this.writeLine(errors);
      this._updateLineCountAndNewLineFlagForOutput(errors);
      (0, import_base.markErrorsAsReported)(result);
    }
    this._appendLine(this.screen.colors.yellow(`Paused ${test.outcome() === "unexpected" ? "on error" : "at test end"}. Press Ctrl+C to end.`), this._testPrefix("", ""));
    await new Promise(() => {
    });
  }
  onTestEnd(test, result) {
    super.onTestEnd(test, result);
    const wasPaused = this._paused.delete(result);
    if (!wasPaused)
      this._updateTestLine(test, result);
  }
  _updateTestLine(test, result) {
    const title = this.formatTestTitle(test);
    let prefix = "";
    let text = "";
    let index = this._resultIndex.get(result);
    if (!index) {
      index = String(this._resultIndex.size + 1);
      this._resultIndex.set(result, index);
    }
    if (result.status === "skipped") {
      prefix = this._testPrefix(index, this.screen.colors.green("-"));
      text = this.screen.colors.cyan(title) + this._retrySuffix(result);
    } else {
      const statusMark = result.status === "passed" ? POSITIVE_STATUS_MARK : NEGATIVE_STATUS_MARK;
      if (result.status === test.expectedStatus) {
        prefix = this._testPrefix(index, this.screen.colors.green(statusMark));
        text = title;
      } else {
        prefix = this._testPrefix(index, this.screen.colors.red(statusMark));
        text = this.screen.colors.red(title);
      }
      text += this._retrySuffix(result) + this.screen.colors.dim(` (${(0, import_utilsBundle.ms)(result.duration)})`);
    }
    this._updateOrAppendLine(this._testRows, test, text, prefix);
  }
  _updateOrAppendLine(entityRowNumbers, entity, text, prefix) {
    const row = entityRowNumbers.get(entity);
    if (row !== void 0 && this.screen.isTTY && this._lastRow - row < this.screen.ttyHeight) {
      this._updateLine(row, text, prefix);
    } else {
      this._maybeWriteNewLine();
      entityRowNumbers.set(entity, this._lastRow);
      this._appendLine(text, prefix);
    }
  }
  _appendLine(text, prefix) {
    const line = prefix + this.fitToScreen(text, prefix);
    if (process.env.PW_TEST_DEBUG_REPORTERS) {
      this.screen.stdout.write("#" + this._lastRow + " : " + line + "\n");
    } else {
      this.screen.stdout.write(line);
      this.screen.stdout.write("\n");
    }
    ++this._lastRow;
    this._lastColumn = 0;
  }
  _updateLine(row, text, prefix) {
    const line = prefix + this.fitToScreen(text, prefix);
    if (process.env.PW_TEST_DEBUG_REPORTERS)
      this.screen.stdout.write("#" + row + " : " + line + "\n");
    else
      this._updateLineForTTY(row, line);
  }
  _updateLineForTTY(row, line) {
    if (row !== this._lastRow)
      this.screen.stdout.write(`\x1B[${this._lastRow - row}A`);
    this.screen.stdout.write("\x1B[2K\x1B[0G");
    this.screen.stdout.write(line);
    if (row !== this._lastRow)
      this.screen.stdout.write(`\x1B[${this._lastRow - row}E`);
  }
  _testPrefix(index, statusMark) {
    const statusMarkLength = (0, import_util.stripAnsiEscapes)(statusMark).length;
    const indexLength = Math.ceil(Math.log10(this.totalTestCount + 1));
    return "  " + statusMark + " ".repeat(3 - statusMarkLength) + this.screen.colors.dim(index.padStart(indexLength) + " ");
  }
  _retrySuffix(result) {
    return result.retry ? this.screen.colors.yellow(` (retry #${result.retry})`) : "";
  }
  onError(error) {
    super.onError(error);
    this._maybeWriteNewLine();
    const message = this.formatError(error).message + "\n";
    this._updateLineCountAndNewLineFlagForOutput(message);
    this.screen.stdout.write(message);
  }
  async onEnd(result) {
    await super.onEnd(result);
    this.screen.stdout.write("\n");
    this.epilogue(true);
  }
}
const lastStepOrdinalSymbol = Symbol("lastStepOrdinal");
var list_default = ListReporter;
