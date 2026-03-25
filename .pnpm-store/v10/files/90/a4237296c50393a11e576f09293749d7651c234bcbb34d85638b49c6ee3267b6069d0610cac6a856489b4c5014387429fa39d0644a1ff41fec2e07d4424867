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
var toHaveURL_exports = {};
__export(toHaveURL_exports, {
  toHaveURLWithPredicate: () => toHaveURLWithPredicate
});
module.exports = __toCommonJS(toHaveURL_exports);
var import_utils = require("playwright-core/lib/utils");
async function toHaveURLWithPredicate(page, expected, options) {
  const matcherName = "toHaveURL";
  const timeout = options?.timeout ?? this.timeout;
  const baseURL = page.context()._options.baseURL;
  let conditionSucceeded = false;
  let lastCheckedURLString = void 0;
  try {
    await page.mainFrame().waitForURL(
      (url) => {
        lastCheckedURLString = url.toString();
        if (options?.ignoreCase) {
          return !this.isNot === (0, import_utils.urlMatches)(
            baseURL?.toLocaleLowerCase(),
            lastCheckedURLString.toLocaleLowerCase(),
            expected
          );
        }
        return !this.isNot === (0, import_utils.urlMatches)(baseURL, lastCheckedURLString, expected);
      },
      { timeout }
    );
    conditionSucceeded = true;
  } catch (e) {
    conditionSucceeded = false;
  }
  if (conditionSucceeded)
    return { name: matcherName, pass: !this.isNot, message: () => "" };
  return {
    name: matcherName,
    pass: this.isNot,
    message: () => toHaveURLMessage(
      this,
      matcherName,
      expected,
      lastCheckedURLString,
      this.isNot,
      true,
      timeout
    ),
    actual: lastCheckedURLString,
    timeout
  };
}
function toHaveURLMessage(state, matcherName, expected, received, pass, timedOut, timeout) {
  const receivedString = received || "";
  let printedReceived;
  let printedExpected;
  let printedDiff;
  if (typeof expected === "function") {
    printedExpected = `Expected: predicate to ${!state.isNot ? "succeed" : "fail"}`;
    printedReceived = `Received: ${state.utils.printReceived(receivedString)}`;
  } else {
    if (pass) {
      printedExpected = `Expected pattern: not ${state.utils.printExpected(expected)}`;
      const formattedReceived = (0, import_utils.printReceivedStringContainExpectedResult)(state.utils, receivedString, null);
      printedReceived = `Received string: ${formattedReceived}`;
    } else {
      const labelExpected = `Expected ${typeof expected === "string" ? "string" : "pattern"}`;
      printedDiff = state.utils.printDiffOrStringify(expected, receivedString, labelExpected, "Received string", false);
    }
  }
  return (0, import_utils.formatMatcherMessage)(state.utils, {
    isNot: state.isNot,
    promise: state.promise,
    matcherName,
    expectation: "expected",
    timeout,
    timedOut,
    printedExpected,
    printedReceived,
    printedDiff
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toHaveURLWithPredicate
});
