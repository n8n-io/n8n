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
var getClient_exports = {};
__export(getClient_exports, {
  getClient: () => getClient
});
module.exports = __toCommonJS(getClient_exports);
var import_clientHelpers = require("./clientHelpers.js");
var import_sendRequest = require("./sendRequest.js");
var import_urlHelpers = require("./urlHelpers.js");
var import_checkEnvironment = require("../util/checkEnvironment.js");
function getClient(endpoint, clientOptions = {}) {
  const pipeline = clientOptions.pipeline ?? (0, import_clientHelpers.createDefaultPipeline)(clientOptions);
  if (clientOptions.additionalPolicies?.length) {
    for (const { policy, position } of clientOptions.additionalPolicies) {
      const afterPhase = position === "perRetry" ? "Sign" : void 0;
      pipeline.addPolicy(policy, {
        afterPhase
      });
    }
  }
  const { allowInsecureConnection, httpClient } = clientOptions;
  const endpointUrl = clientOptions.endpoint ?? endpoint;
  const client = (path, ...args) => {
    const getUrl = (requestOptions) => (0, import_urlHelpers.buildRequestUrl)(endpointUrl, path, args, { allowInsecureConnection, ...requestOptions });
    return {
      get: (requestOptions = {}) => {
        return buildOperation(
          "GET",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      post: (requestOptions = {}) => {
        return buildOperation(
          "POST",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      put: (requestOptions = {}) => {
        return buildOperation(
          "PUT",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      patch: (requestOptions = {}) => {
        return buildOperation(
          "PATCH",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      delete: (requestOptions = {}) => {
        return buildOperation(
          "DELETE",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      head: (requestOptions = {}) => {
        return buildOperation(
          "HEAD",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      options: (requestOptions = {}) => {
        return buildOperation(
          "OPTIONS",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      },
      trace: (requestOptions = {}) => {
        return buildOperation(
          "TRACE",
          getUrl(requestOptions),
          pipeline,
          requestOptions,
          allowInsecureConnection,
          httpClient
        );
      }
    };
  };
  return {
    path: client,
    pathUnchecked: client,
    pipeline
  };
}
function buildOperation(method, url, pipeline, options, allowInsecureConnection, httpClient) {
  allowInsecureConnection = options.allowInsecureConnection ?? allowInsecureConnection;
  return {
    then: function(onFulfilled, onrejected) {
      return (0, import_sendRequest.sendRequest)(
        method,
        url,
        pipeline,
        { ...options, allowInsecureConnection },
        httpClient
      ).then(onFulfilled, onrejected);
    },
    async asBrowserStream() {
      if (import_checkEnvironment.isNodeLike) {
        throw new Error(
          "`asBrowserStream` is supported only in the browser environment. Use `asNodeStream` instead to obtain the response body stream. If you require a Web stream of the response in Node, consider using `Readable.toWeb` on the result of `asNodeStream`."
        );
      } else {
        return (0, import_sendRequest.sendRequest)(
          method,
          url,
          pipeline,
          { ...options, allowInsecureConnection, responseAsStream: true },
          httpClient
        );
      }
    },
    async asNodeStream() {
      if (import_checkEnvironment.isNodeLike) {
        return (0, import_sendRequest.sendRequest)(
          method,
          url,
          pipeline,
          { ...options, allowInsecureConnection, responseAsStream: true },
          httpClient
        );
      } else {
        throw new Error(
          "`isNodeStream` is not supported in the browser environment. Use `asBrowserStream` to obtain the response body stream."
        );
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getClient
});
