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
var toBeTruthy_exports = {};
__export(toBeTruthy_exports, {
  toBeTruthy: () => toBeTruthy
});
module.exports = __toCommonJS(toBeTruthy_exports);
var import_utils = require("playwright-core/lib/utils");
var import_util = require("../util");
async function toBeTruthy(matcherName, locator, receiverType, expected, arg, query, options = {}) {
  (0, import_util.expectTypes)(locator, [receiverType], matcherName);
  const timeout = options.timeout ?? this.timeout;
  const { matches: pass, log, timedOut, received, errorMessage } = await query(!!this.isNot, timeout);
  if (pass === !this.isNot) {
    return {
      name: matcherName,
      message: () => "",
      pass,
      expected
    };
  }
  let printedReceived;
  let printedExpected;
  if (pass) {
    printedExpected = `Expected: not ${expected}`;
    printedReceived = errorMessage ? "" : `Received: ${expected}`;
  } else {
    printedExpected = `Expected: ${expected}`;
    printedReceived = errorMessage ? "" : `Received: ${received}`;
  }
  const message = () => {
    return (0, import_utils.formatMatcherMessage)(this.utils, {
      isNot: this.isNot,
      promise: this.promise,
      matcherName,
      expectation: arg,
      locator: locator.toString(),
      timeout,
      timedOut,
      printedExpected,
      printedReceived,
      errorMessage,
      log
    });
  };
  return {
    message,
    pass,
    actual: received,
    name: matcherName,
    expected,
    log,
    timeout: timedOut ? timeout : void 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toBeTruthy
});
