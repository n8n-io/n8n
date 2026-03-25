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
var toMatchText_exports = {};
__export(toMatchText_exports, {
  toMatchText: () => toMatchText
});
module.exports = __toCommonJS(toMatchText_exports);
var import_utils = require("playwright-core/lib/utils");
var import_util = require("../util");
async function toMatchText(matcherName, receiver, receiverType, query, expected, options = {}) {
  (0, import_util.expectTypes)(receiver, [receiverType], matcherName);
  const locator = receiverType === "Locator" ? receiver : void 0;
  if (!(typeof expected === "string") && !(expected && typeof expected.test === "function")) {
    const errorMessage2 = `Error: ${this.utils.EXPECTED_COLOR("expected")} value must be a string or regular expression
${this.utils.printWithType("Expected", expected, this.utils.printExpected)}`;
    throw new Error((0, import_utils.formatMatcherMessage)(this.utils, { promise: this.promise, isNot: this.isNot, locator: locator?.toString(), matcherName, expectation: "expected", errorMessage: errorMessage2 }));
  }
  const timeout = options.timeout ?? this.timeout;
  const { matches: pass, received, log, timedOut, errorMessage } = await query(!!this.isNot, timeout);
  if (pass === !this.isNot) {
    return {
      name: matcherName,
      message: () => "",
      pass,
      expected
    };
  }
  const expectedSuffix = typeof expected === "string" ? options.matchSubstring ? " substring" : "" : " pattern";
  const receivedSuffix = typeof expected === "string" ? options.matchSubstring ? " string" : "" : " string";
  const receivedString = received || "";
  let printedReceived;
  let printedExpected;
  let printedDiff;
  if (pass) {
    if (typeof expected === "string") {
      printedExpected = `Expected${expectedSuffix}: not ${this.utils.printExpected(expected)}`;
      if (!errorMessage) {
        const formattedReceived = (0, import_utils.printReceivedStringContainExpectedSubstring)(this.utils, receivedString, receivedString.indexOf(expected), expected.length);
        printedReceived = `Received${receivedSuffix}: ${formattedReceived}`;
      }
    } else {
      printedExpected = `Expected${expectedSuffix}: not ${this.utils.printExpected(expected)}`;
      if (!errorMessage) {
        const formattedReceived = (0, import_utils.printReceivedStringContainExpectedResult)(this.utils, receivedString, typeof expected.exec === "function" ? expected.exec(receivedString) : null);
        printedReceived = `Received${receivedSuffix}: ${formattedReceived}`;
      }
    }
  } else {
    if (errorMessage)
      printedExpected = `Expected${expectedSuffix}: ${this.utils.printExpected(expected)}`;
    else
      printedDiff = this.utils.printDiffOrStringify(expected, receivedString, `Expected${expectedSuffix}`, `Received${receivedSuffix}`, false);
  }
  const message = () => {
    return (0, import_utils.formatMatcherMessage)(this.utils, {
      promise: this.promise,
      isNot: this.isNot,
      matcherName,
      expectation: "expected",
      locator: locator?.toString(),
      timeout,
      timedOut,
      printedExpected,
      printedReceived,
      printedDiff,
      log,
      errorMessage
    });
  };
  return {
    name: matcherName,
    expected,
    message,
    pass,
    actual: received,
    log,
    timeout: timedOut ? timeout : void 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toMatchText
});
