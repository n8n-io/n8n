"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  addExpectContinueMiddleware: () => addExpectContinueMiddleware,
  addExpectContinueMiddlewareOptions: () => addExpectContinueMiddlewareOptions,
  getAddExpectContinuePlugin: () => getAddExpectContinuePlugin
});
module.exports = __toCommonJS(index_exports);
var import_protocol_http = require("@smithy/protocol-http");
function addExpectContinueMiddleware(options) {
  return (next) => async (args) => {
    const { request } = args;
    if (import_protocol_http.HttpRequest.isInstance(request) && request.body && options.runtime === "node") {
      if (options.requestHandler?.constructor?.name !== "FetchHttpHandler") {
        request.headers = {
          ...request.headers,
          Expect: "100-continue"
        };
      }
    }
    return next({
      ...args,
      request
    });
  };
}
__name(addExpectContinueMiddleware, "addExpectContinueMiddleware");
var addExpectContinueMiddlewareOptions = {
  step: "build",
  tags: ["SET_EXPECT_HEADER", "EXPECT_HEADER"],
  name: "addExpectContinueMiddleware",
  override: true
};
var getAddExpectContinuePlugin = /* @__PURE__ */ __name((options) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(addExpectContinueMiddleware(options), addExpectContinueMiddlewareOptions);
  }, "applyToStack")
}), "getAddExpectContinuePlugin");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  addExpectContinueMiddlewareOptions,
  getAddExpectContinuePlugin,
  addExpectContinueMiddleware
});

