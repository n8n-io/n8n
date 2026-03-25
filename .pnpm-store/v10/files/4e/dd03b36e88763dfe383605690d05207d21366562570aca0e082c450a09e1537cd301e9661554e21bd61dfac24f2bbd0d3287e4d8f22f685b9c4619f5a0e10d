"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recursionDetectionMiddleware = void 0;
const lambda_invoke_store_1 = require("@aws/lambda-invoke-store");
const protocol_http_1 = require("@smithy/protocol-http");
const TRACE_ID_HEADER_NAME = "X-Amzn-Trace-Id";
const ENV_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
const ENV_TRACE_ID = "_X_AMZN_TRACE_ID";
const recursionDetectionMiddleware = () => (next) => async (args) => {
    const { request } = args;
    if (!protocol_http_1.HttpRequest.isInstance(request)) {
        return next(args);
    }
    const traceIdHeader = Object.keys(request.headers ?? {}).find((h) => h.toLowerCase() === TRACE_ID_HEADER_NAME.toLowerCase()) ??
        TRACE_ID_HEADER_NAME;
    if (request.headers.hasOwnProperty(traceIdHeader)) {
        return next(args);
    }
    const functionName = process.env[ENV_LAMBDA_FUNCTION_NAME];
    const traceIdFromEnv = process.env[ENV_TRACE_ID];
    const invokeStore = await lambda_invoke_store_1.InvokeStore.getInstanceAsync();
    const traceIdFromInvokeStore = invokeStore?.getXRayTraceId();
    const traceId = traceIdFromInvokeStore ?? traceIdFromEnv;
    const nonEmptyString = (str) => typeof str === "string" && str.length > 0;
    if (nonEmptyString(functionName) && nonEmptyString(traceId)) {
        request.headers[TRACE_ID_HEADER_NAME] = traceId;
    }
    return next({
        ...args,
        request,
    });
};
exports.recursionDetectionMiddleware = recursionDetectionMiddleware;
