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
var line_exports = {};
__export(line_exports, {
  default: () => line_default
});
module.exports = __toCommonJS(line_exports);
var import_base = require("./base");
class LineReporter extends import_base.TerminalReporter {
  constructor() {
    super(...arguments);
    this._current = 0;
    this._failures = 0;
    this._didBegin = false;
  }
  onBegin(suite) {
    super.onBegin(suite);
    const startingMessage = this.generateStartingMessage();
    if (startingMessage) {
      this.writeLine(startingMessage);
      this.writeLine();
    }
    this._didBegin = true;
  }
  onStdOut(chunk, test, result) {
    super.onStdOut(chunk, test, result);
    this._dumpToStdio(test, chunk, this.screen.stdout);
  }
  onStdErr(chunk, test, result) {
    super.onStdErr(chunk, test, result);
    this._dumpToStdio(test, chunk, this.screen.stderr);
  }
  _dumpToStdio(test, chunk, stream) {
    if (this.config.quiet)
      return;
    if (!process.env.PW_TEST_DEBUG_REPORTERS)
      stream.write(`\x1B[1A\x1B[2K`);
    if (test && this._lastTest !== test) {
      const title = this.screen.colors.dim(this.formatTestTitle(test));
      stream.write(this.fitToScreen(title) + `
`);
      this._lastTest = test;
    }
    stream.write(chunk);
    if (chunk[chunk.length - 1] !== "\n")
      this.writeLine();
    this.writeLine();
  }
  onTestBegin(test, result) {
    ++this._current;
    this._updateLine(test, result, void 0);
  }
  onStepBegin(test, result, step) {
    if (this.screen.isTTY && step.category === "test.step")
      this._updateLine(test, result, step);
  }
  onStepEnd(test, result, step) {
    if (this.screen.isTTY && step.category === "test.step")
      this._updateLine(test, result, step.parent);
  }
  async onTestPaused(test, result) {
    if (!process.stdin.isTTY && !process.env.PW_TEST_DEBUG_REPORTERS)
      return;
    if (!process.env.PW_TEST_DEBUG_REPORTERS)
      this.screen.stdout.write(`\x1B[1A\x1B[2K`);
    if (test.outcome() === "unexpected") {
      this.writeLine(this.screen.colors.red(this.formatTestHeader(test, { indent: "  ", index: ++this._failures })));
      this.writeLine(this.formatResultErrors(test, result));
      (0, import_base.markErrorsAsReported)(result);
      this.writeLine(this.screen.colors.yellow(`    Paused on error. Press Ctrl+C to end.`) + "\n\n");
    } else {
      this.writeLine(this.screen.colors.yellow(this.formatTestHeader(test, { indent: "  " })));
      this.writeLine(this.screen.colors.yellow(`    Paused at test end. Press Ctrl+C to end.`) + "\n\n");
    }
    this._updateLine(test, result, void 0);
    await new Promise(() => {
    });
  }
  onTestEnd(test, result) {
    super.onTestEnd(test, result);
    if (!this.willRetry(test) && (test.outcome() === "flaky" || test.outcome() === "unexpected" || result.status === "interrupted")) {
      if (!process.env.PW_TEST_DEBUG_REPORTERS)
        this.screen.stdout.write(`\x1B[1A\x1B[2K`);
      this.writeLine(this.formatFailure(test, ++this._failures));
      this.writeLine();
    }
  }
  _updateLine(test, result, step) {
    const retriesPrefix = this.totalTestCount < this._current ? ` (retries)` : ``;
    const prefix = `[${this._current}/${this.totalTestCount}]${retriesPrefix} `;
    const currentRetrySuffix = result.retry ? this.screen.colors.yellow(` (retry #${result.retry})`) : "";
    const title = this.formatTestTitle(test, step) + currentRetrySuffix;
    if (process.env.PW_TEST_DEBUG_REPORTERS)
      this.screen.stdout.write(`${prefix + title}
`);
    else
      this.screen.stdout.write(`\x1B[1A\x1B[2K${prefix + this.fitToScreen(title, prefix)}
`);
  }
  onError(error) {
    super.onError(error);
    const message = this.formatError(error).message + "\n";
    if (!process.env.PW_TEST_DEBUG_REPORTERS && this._didBegin)
      this.screen.stdout.write(`\x1B[1A\x1B[2K`);
    this.screen.stdout.write(message);
    this.writeLine();
  }
  async onEnd(result) {
    if (!process.env.PW_TEST_DEBUG_REPORTERS && this._didBegin)
      this.screen.stdout.write(`\x1B[1A\x1B[2K`);
    await super.onEnd(result);
    this.epilogue(false);
  }
}
var line_default = LineReporter;
