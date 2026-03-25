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
var expectUtils_exports = {};
__export(expectUtils_exports, {
  callLogText: () => callLogText,
  formatMatcherMessage: () => formatMatcherMessage,
  printReceivedStringContainExpectedResult: () => printReceivedStringContainExpectedResult,
  printReceivedStringContainExpectedSubstring: () => printReceivedStringContainExpectedSubstring,
  serializeExpectedTextValues: () => serializeExpectedTextValues,
  simpleMatcherUtils: () => simpleMatcherUtils
});
module.exports = __toCommonJS(expectUtils_exports);
var import_rtti = require("../../utils/isomorphic/rtti");
var import_utilsBundle = require("../../utilsBundle");
function serializeExpectedTextValues(items, options = {}) {
  return items.map((i) => ({
    string: (0, import_rtti.isString)(i) ? i : void 0,
    regexSource: (0, import_rtti.isRegExp)(i) ? i.source : void 0,
    regexFlags: (0, import_rtti.isRegExp)(i) ? i.flags : void 0,
    matchSubstring: options.matchSubstring,
    ignoreCase: options.ignoreCase,
    normalizeWhiteSpace: options.normalizeWhiteSpace
  }));
}
const printSubstring = (val) => val.replace(/"|\\/g, "\\$&");
const printReceivedStringContainExpectedSubstring = (utils, received, start, length) => utils.RECEIVED_COLOR(
  '"' + printSubstring(received.slice(0, start)) + utils.INVERTED_COLOR(printSubstring(received.slice(start, start + length))) + printSubstring(received.slice(start + length)) + '"'
);
const printReceivedStringContainExpectedResult = (utils, received, result) => result === null ? utils.printReceived(received) : printReceivedStringContainExpectedSubstring(
  utils,
  received,
  result.index,
  result[0].length
);
function formatMatcherMessage(utils, details) {
  const receiver = details.receiver ?? (details.locator ? "locator" : "page");
  let message = utils.DIM_COLOR("expect(") + utils.RECEIVED_COLOR(receiver) + utils.DIM_COLOR(")" + (details.promise ? "." + details.promise : "") + (details.isNot ? ".not" : "") + ".") + details.matcherName + utils.DIM_COLOR("(") + utils.EXPECTED_COLOR(details.expectation) + utils.DIM_COLOR(")") + " failed\n\n";
  const diffLines = details.printedDiff?.split("\n");
  if (diffLines?.length === 2) {
    details.printedExpected = diffLines[0];
    details.printedReceived = diffLines[1];
    details.printedDiff = void 0;
  }
  const align = !details.errorMessage && details.printedExpected?.startsWith("Expected:") && (!details.printedReceived || details.printedReceived.startsWith("Received:"));
  if (details.locator)
    message += `Locator: ${align ? " " : ""}${details.locator}
`;
  if (details.printedExpected)
    message += details.printedExpected + "\n";
  if (details.printedReceived)
    message += details.printedReceived + "\n";
  if (details.timedOut && details.timeout)
    message += `Timeout: ${align ? " " : ""}${details.timeout}ms
`;
  if (details.printedDiff)
    message += details.printedDiff + "\n";
  if (details.errorMessage) {
    message += details.errorMessage;
    if (!details.errorMessage.endsWith("\n"))
      message += "\n";
  }
  message += callLogText(utils, details.log);
  return message;
}
const callLogText = (utils, log) => {
  if (!log || !log.some((l) => !!l))
    return "";
  return `
Call log:
${utils.DIM_COLOR(log.join("\n"))}
`;
};
function printValue(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function printReceived(value) {
  return import_utilsBundle.colors.red(printValue(value));
}
function printExpected(value) {
  return import_utilsBundle.colors.green(printValue(value));
}
const simpleMatcherUtils = {
  DIM_COLOR: import_utilsBundle.colors.dim,
  RECEIVED_COLOR: import_utilsBundle.colors.red,
  EXPECTED_COLOR: import_utilsBundle.colors.green,
  INVERTED_COLOR: import_utilsBundle.colors.inverse,
  printReceived,
  printExpected,
  printDiffOrStringify: (expected, received, expectedLabel, receivedLabel) => {
    const maxLength = Math.max(expectedLabel.length, receivedLabel.length) + 2;
    return `${expectedLabel}: `.padEnd(maxLength) + printExpected(expected) + `
` + `${receivedLabel}: `.padEnd(maxLength) + printReceived(received);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  callLogText,
  formatMatcherMessage,
  printReceivedStringContainExpectedResult,
  printReceivedStringContainExpectedSubstring,
  serializeExpectedTextValues,
  simpleMatcherUtils
});
