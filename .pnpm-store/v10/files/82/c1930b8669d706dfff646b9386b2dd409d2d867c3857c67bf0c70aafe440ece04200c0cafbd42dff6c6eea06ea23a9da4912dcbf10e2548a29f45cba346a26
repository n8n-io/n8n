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
var test_exports = {};
__export(test_exports, {
  clear: () => clear,
  install: () => install,
  lookupResponse: () => lookupResponse,
  lookupResponseAsync: () => lookupResponseAsync,
  m: () => m,
  mockClient: () => mockClient,
  mockRequest: () => mockRequest,
  requestFactory: () => import_request_factory.requestFactory,
  responseFactory: () => import_response_factory.responseFactory,
  uninstall: () => uninstall,
  unusedMocks: () => unusedMocks
});
module.exports = __toCommonJS(test_exports);
var import_mock_request = __toESM(require("../mocks/mock-request"));
var import_mock_resource = __toESM(require("../mocks/mock-resource"));
var import_mock = require("../gateway/mock");
var import__ = require("../index");
var import_utils = require("../utils/index");
var import_request_factory = require("./request-factory");
var import_response_factory = require("./response-factory");
let store = [];
let ids = 1;
let originalGateway = null;
const mockClient = (client) => {
  const entry = new import_mock_resource.default(ids++, client);
  store.push(entry);
  return entry;
};
const mockRequest = (props) => {
  const entry = new import_mock_request.default(ids++, props);
  store.push(entry);
  return entry.assertObject();
};
const install = () => {
  originalGateway = import__.configs.gateway;
  import__.configs.gateway = import_mock.Mock;
};
const uninstall = () => {
  clear();
  if (originalGateway) {
    import__.configs.gateway = originalGateway;
    originalGateway = null;
  }
};
const clear = () => {
  store = [];
};
const unusedMocks = () => {
  const mocks = store.map((mock) => mock.toMockRequest());
  let count = 0;
  mocks.forEach((mock) => {
    if (mock.calls.length === 0) count++;
  });
  return count;
};
const lookupResponseAsync = (request) => {
  const mocksPendingMiddlewareExecution = store.filter((mock) => mock.pendingMiddlewareExecution);
  return import__.configs.Promise.all(
    mocksPendingMiddlewareExecution.map((mock) => mock.executeMiddlewareStack())
  ).then(() => lookupResponse(request));
};
const lookupResponse = (request) => {
  const mocks = store.map((mock) => mock.toMockRequest());
  const exactMatch = mocks.filter((mock) => mock.isExactMatch(request)).pop();
  if (exactMatch) {
    return exactMatch.call(request);
  }
  const partialMatch = mocks.filter((mock) => mock.isPartialMatch(request)).pop();
  if (partialMatch) {
    throw new Error(
      `[Mappersmith Test] No exact match found for ${requestToLog(
        request
      )}, partial match with ${mockToLog(partialMatch)}, check your mock definition`
    );
  }
  throw new Error(
    `[Mappersmith Test] No match found for ${requestToLog(request)}, check your mock definition`
  );
};
const m = {
  stringMatching: (regexp) => {
    if (!(regexp instanceof RegExp)) {
      throw new Error(`[Mappersmith Test] "stringMatching" received an invalid regexp (${regexp})`);
    }
    return (string) => regexp.test(string);
  },
  stringContaining: (sample) => {
    if (typeof sample !== "string") {
      throw new Error(
        `[Mappersmith Test] "stringContaining" received an invalid string (${sample})`
      );
    }
    return (string) => stringIncludes(string, sample);
  },
  uuid4: () => {
    const uuid4Rx = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
    return (string) => uuid4Rx.test(string);
  },
  anything: () => () => true
};
const requestToLog = (request) => `"${request.method().toUpperCase()} ${request.url()}" (body: "${(0, import_utils.toQueryString)(
  request.body()
)}"; headers: "${(0, import_utils.toQueryString)(request.headers())}")`;
const mockToLog = (requestMock) => `"${requestMock.method.toUpperCase()} ${requestMock.url}" (body: "${requestMock.body}"; headers: "${requestMock.headers}")`;
const stringIncludes = (str, search, start) => {
  if (typeof start !== "number") {
    start = 0;
  }
  if (typeof str.includes === "function") {
    return str.includes(search, start);
  }
  if (start + search.length > str.length) {
    return false;
  }
  return str.indexOf(search, start) !== -1;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clear,
  install,
  lookupResponse,
  lookupResponseAsync,
  m,
  mockClient,
  mockRequest,
  requestFactory,
  responseFactory,
  uninstall,
  unusedMocks
});
//# sourceMappingURL=index.js.map