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
var dot_exports = {};
__export(dot_exports, {
  default: () => dot_default
});
module.exports = __toCommonJS(dot_exports);
var import_base = require("./base");
class DotReporter extends import_base.TerminalReporter {
  constructor() {
    super(...arguments);
    this._counter = 0;
  }
  onBegin(suite) {
    super.onBegin(suite);
    this.writeLine(this.generateStartingMessage());
  }
  onStdOut(chunk, test, result) {
    super.onStdOut(chunk, test, result);
    if (!this.config.quiet)
      this.screen.stdout.write(chunk);
  }
  onStdErr(chunk, test, result) {
    super.onStdErr(chunk, test, result);
    if (!this.config.quiet)
      this.screen.stderr.write(chunk);
  }
  onTestEnd(test, result) {
    super.onTestEnd(test, result);
    if (this._counter === 80) {
      this.screen.stdout.write("\n");
      this._counter = 0;
    }
    ++this._counter;
    if (result.status === "skipped") {
      this.screen.stdout.write(this.screen.colors.yellow("\xB0"));
      return;
    }
    if (this.willRetry(test)) {
      this.screen.stdout.write(this.screen.colors.gray("\xD7"));
      return;
    }
    switch (test.outcome()) {
      case "expected":
        this.screen.stdout.write(this.screen.colors.green("\xB7"));
        break;
      case "unexpected":
        this.screen.stdout.write(this.screen.colors.red(result.status === "timedOut" ? "T" : "F"));
        break;
      case "flaky":
        this.screen.stdout.write(this.screen.colors.yellow("\xB1"));
        break;
    }
  }
  onError(error) {
    super.onError(error);
    this.writeLine("\n" + this.formatError(error).message);
    this._counter = 0;
  }
  async onTestPaused(test, result) {
    if (!process.stdin.isTTY && !process.env.PW_TEST_DEBUG_REPORTERS)
      return;
    this.screen.stdout.write("\n");
    if (test.outcome() === "unexpected") {
      this.writeLine(this.screen.colors.red(this.formatTestHeader(test, { indent: "  " })));
      this.writeLine(this.formatResultErrors(test, result));
      (0, import_base.markErrorsAsReported)(result);
      this.writeLine(this.screen.colors.yellow("    Paused on error. Press Ctrl+C to end.") + "\n");
    } else {
      this.writeLine(this.screen.colors.yellow(this.formatTestHeader(test, { indent: "  " })));
      this.writeLine(this.screen.colors.yellow("    Paused at test end. Press Ctrl+C to end.") + "\n");
    }
    this._counter = 0;
    await new Promise(() => {
    });
  }
  async onEnd(result) {
    await super.onEnd(result);
    this.screen.stdout.write("\n");
    this.epilogue(true);
  }
}
var dot_default = DotReporter;
