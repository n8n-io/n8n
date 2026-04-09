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
var tracingPolicy_exports = {};
__export(tracingPolicy_exports, {
  tracingPolicy: () => tracingPolicy,
  tracingPolicyName: () => tracingPolicyName
});
module.exports = __toCommonJS(tracingPolicy_exports);
var import_core_tracing = require("@azure/core-tracing");
var import_constants = require("../constants.js");
var import_userAgent = require("../util/userAgent.js");
var import_log = require("../log.js");
var import_core_util = require("@azure/core-util");
var import_restError = require("../restError.js");
var import_util = require("@typespec/ts-http-runtime/internal/util");
const tracingPolicyName = "tracingPolicy";
function tracingPolicy(options = {}) {
  const userAgentPromise = (0, import_userAgent.getUserAgentValue)(options.userAgentPrefix);
  const sanitizer = new import_util.Sanitizer({
    additionalAllowedQueryParameters: options.additionalAllowedQueryParameters
  });
  const tracingClient = tryCreateTracingClient();
  return {
    name: tracingPolicyName,
    async sendRequest(request, next) {
      if (!tracingClient) {
        return next(request);
      }
      const userAgent = await userAgentPromise;
      const spanAttributes = {
        "http.url": sanitizer.sanitizeUrl(request.url),
        "http.method": request.method,
        "http.user_agent": userAgent,
        requestId: request.requestId
      };
      if (userAgent) {
        spanAttributes["http.user_agent"] = userAgent;
      }
      const { span, tracingContext } = tryCreateSpan(tracingClient, request, spanAttributes) ?? {};
      if (!span || !tracingContext) {
        return next(request);
      }
      try {
        const response = await tracingClient.withContext(tracingContext, next, request);
        tryProcessResponse(span, response);
        return response;
      } catch (err) {
        tryProcessError(span, err);
        throw err;
      }
    }
  };
}
function tryCreateTracingClient() {
  try {
    return (0, import_core_tracing.createTracingClient)({
      namespace: "",
      packageName: "@azure/core-rest-pipeline",
      packageVersion: import_constants.SDK_VERSION
    });
  } catch (e) {
    import_log.logger.warning(`Error when creating the TracingClient: ${(0, import_core_util.getErrorMessage)(e)}`);
    return void 0;
  }
}
function tryCreateSpan(tracingClient, request, spanAttributes) {
  try {
    const { span, updatedOptions } = tracingClient.startSpan(
      `HTTP ${request.method}`,
      { tracingOptions: request.tracingOptions },
      {
        spanKind: "client",
        spanAttributes
      }
    );
    if (!span.isRecording()) {
      span.end();
      return void 0;
    }
    const headers = tracingClient.createRequestHeaders(
      updatedOptions.tracingOptions.tracingContext
    );
    for (const [key, value] of Object.entries(headers)) {
      request.headers.set(key, value);
    }
    return { span, tracingContext: updatedOptions.tracingOptions.tracingContext };
  } catch (e) {
    import_log.logger.warning(`Skipping creating a tracing span due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
    return void 0;
  }
}
function tryProcessError(span, error) {
  try {
    span.setStatus({
      status: "error",
      error: (0, import_core_util.isError)(error) ? error : void 0
    });
    if ((0, import_restError.isRestError)(error) && error.statusCode) {
      span.setAttribute("http.status_code", error.statusCode);
    }
    span.end();
  } catch (e) {
    import_log.logger.warning(`Skipping tracing span processing due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
  }
}
function tryProcessResponse(span, response) {
  try {
    span.setAttribute("http.status_code", response.status);
    const serviceRequestId = response.headers.get("x-ms-request-id");
    if (serviceRequestId) {
      span.setAttribute("serviceRequestId", serviceRequestId);
    }
    if (response.status >= 400) {
      span.setStatus({
        status: "error"
      });
    }
    span.end();
  } catch (e) {
    import_log.logger.warning(`Skipping tracing span processing due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  tracingPolicy,
  tracingPolicyName
});
