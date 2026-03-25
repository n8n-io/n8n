// src/test/index.js
import MockRequest from "../mocks/mock-request.mjs";
import MockResource from "../mocks/mock-resource.mjs";
import { Mock as MockGateway } from "../gateway/mock.mjs";
import { configs } from "../index.mjs";
import { toQueryString } from "../utils/index.mjs";
import { requestFactory } from "./request-factory.mjs";
import { responseFactory } from "./response-factory.mjs";
var store = [];
var ids = 1;
var originalGateway = null;
var mockClient = (client) => {
  const entry = new MockResource(ids++, client);
  store.push(entry);
  return entry;
};
var mockRequest = (props) => {
  const entry = new MockRequest(ids++, props);
  store.push(entry);
  return entry.assertObject();
};
var install = () => {
  originalGateway = configs.gateway;
  configs.gateway = MockGateway;
};
var uninstall = () => {
  clear();
  if (originalGateway) {
    configs.gateway = originalGateway;
    originalGateway = null;
  }
};
var clear = () => {
  store = [];
};
var unusedMocks = () => {
  const mocks = store.map((mock) => mock.toMockRequest());
  let count = 0;
  mocks.forEach((mock) => {
    if (mock.calls.length === 0) count++;
  });
  return count;
};
var lookupResponseAsync = (request) => {
  const mocksPendingMiddlewareExecution = store.filter((mock) => mock.pendingMiddlewareExecution);
  return configs.Promise.all(
    mocksPendingMiddlewareExecution.map((mock) => mock.executeMiddlewareStack())
  ).then(() => lookupResponse(request));
};
var lookupResponse = (request) => {
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
var m = {
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
var requestToLog = (request) => `"${request.method().toUpperCase()} ${request.url()}" (body: "${toQueryString(
  request.body()
)}"; headers: "${toQueryString(request.headers())}")`;
var mockToLog = (requestMock) => `"${requestMock.method.toUpperCase()} ${requestMock.url}" (body: "${requestMock.body}"; headers: "${requestMock.headers}")`;
var stringIncludes = (str, search, start) => {
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
export {
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
};
//# sourceMappingURL=index.mjs.map