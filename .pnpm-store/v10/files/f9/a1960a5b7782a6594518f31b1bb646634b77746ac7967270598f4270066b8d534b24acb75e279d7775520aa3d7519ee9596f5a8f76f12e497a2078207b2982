"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingPolicyName = void 0;
exports.tracingPolicy = tracingPolicy;
const core_tracing_1 = require("@azure/core-tracing");
const constants_js_1 = require("../constants.js");
const userAgent_js_1 = require("../util/userAgent.js");
const log_js_1 = require("../log.js");
const core_util_1 = require("@azure/core-util");
const restError_js_1 = require("../restError.js");
const util_1 = require("@typespec/ts-http-runtime/internal/util");
/**
 * The programmatic identifier of the tracingPolicy.
 */
exports.tracingPolicyName = "tracingPolicy";
/**
 * A simple policy to create OpenTelemetry Spans for each request made by the pipeline
 * that has SpanOptions with a parent.
 * Requests made without a parent Span will not be recorded.
 * @param options - Options to configure the telemetry logged by the tracing policy.
 */
function tracingPolicy(options = {}) {
    const userAgentPromise = (0, userAgent_js_1.getUserAgentValue)(options.userAgentPrefix);
    const sanitizer = new util_1.Sanitizer({
        additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
    });
    const tracingClient = tryCreateTracingClient();
    return {
        name: exports.tracingPolicyName,
        async sendRequest(request, next) {
            var _a;
            if (!tracingClient) {
                return next(request);
            }
            const userAgent = await userAgentPromise;
            const spanAttributes = {
                "http.url": sanitizer.sanitizeUrl(request.url),
                "http.method": request.method,
                "http.user_agent": userAgent,
                requestId: request.requestId,
            };
            if (userAgent) {
                spanAttributes["http.user_agent"] = userAgent;
            }
            const { span, tracingContext } = (_a = tryCreateSpan(tracingClient, request, spanAttributes)) !== null && _a !== void 0 ? _a : {};
            if (!span || !tracingContext) {
                return next(request);
            }
            try {
                const response = await tracingClient.withContext(tracingContext, next, request);
                tryProcessResponse(span, response);
                return response;
            }
            catch (err) {
                tryProcessError(span, err);
                throw err;
            }
        },
    };
}
function tryCreateTracingClient() {
    try {
        return (0, core_tracing_1.createTracingClient)({
            namespace: "",
            packageName: "@azure/core-rest-pipeline",
            packageVersion: constants_js_1.SDK_VERSION,
        });
    }
    catch (e) {
        log_js_1.logger.warning(`Error when creating the TracingClient: ${(0, core_util_1.getErrorMessage)(e)}`);
        return undefined;
    }
}
function tryCreateSpan(tracingClient, request, spanAttributes) {
    try {
        // As per spec, we do not need to differentiate between HTTP and HTTPS in span name.
        const { span, updatedOptions } = tracingClient.startSpan(`HTTP ${request.method}`, { tracingOptions: request.tracingOptions }, {
            spanKind: "client",
            spanAttributes,
        });
        // If the span is not recording, don't do any more work.
        if (!span.isRecording()) {
            span.end();
            return undefined;
        }
        // set headers
        const headers = tracingClient.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
        for (const [key, value] of Object.entries(headers)) {
            request.headers.set(key, value);
        }
        return { span, tracingContext: updatedOptions.tracingOptions.tracingContext };
    }
    catch (e) {
        log_js_1.logger.warning(`Skipping creating a tracing span due to an error: ${(0, core_util_1.getErrorMessage)(e)}`);
        return undefined;
    }
}
function tryProcessError(span, error) {
    try {
        span.setStatus({
            status: "error",
            error: (0, core_util_1.isError)(error) ? error : undefined,
        });
        if ((0, restError_js_1.isRestError)(error) && error.statusCode) {
            span.setAttribute("http.status_code", error.statusCode);
        }
        span.end();
    }
    catch (e) {
        log_js_1.logger.warning(`Skipping tracing span processing due to an error: ${(0, core_util_1.getErrorMessage)(e)}`);
    }
}
function tryProcessResponse(span, response) {
    try {
        span.setAttribute("http.status_code", response.status);
        const serviceRequestId = response.headers.get("x-ms-request-id");
        if (serviceRequestId) {
            span.setAttribute("serviceRequestId", serviceRequestId);
        }
        // Per semantic conventions, only set the status to error if the status code is 4xx or 5xx.
        // Otherwise, the status MUST remain unset.
        // https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status
        if (response.status >= 400) {
            span.setStatus({
                status: "error",
            });
        }
        span.end();
    }
    catch (e) {
        log_js_1.logger.warning(`Skipping tracing span processing due to an error: ${(0, core_util_1.getErrorMessage)(e)}`);
    }
}
//# sourceMappingURL=tracingPolicy.js.map