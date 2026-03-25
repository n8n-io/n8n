"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InferenceClientProviderOutputError = exports.InferenceClientHubApiError = exports.InferenceClientProviderApiError = exports.InferenceClientInputError = exports.InferenceClientError = void 0;
/**
 * Base class for all inference-related errors.
 */
class InferenceClientError extends Error {
    constructor(message) {
        super(message);
        this.name = "InferenceClientError";
    }
}
exports.InferenceClientError = InferenceClientError;
class InferenceClientInputError extends InferenceClientError {
    constructor(message) {
        super(message);
        this.name = "InputError";
    }
}
exports.InferenceClientInputError = InferenceClientInputError;
class InferenceClientHttpRequestError extends InferenceClientError {
    httpRequest;
    httpResponse;
    constructor(message, httpRequest, httpResponse) {
        super(message);
        this.httpRequest = {
            ...httpRequest,
            ...(httpRequest.headers
                ? {
                    headers: {
                        ...httpRequest.headers,
                        ...("Authorization" in httpRequest.headers ? { Authorization: `Bearer [redacted]` } : undefined),
                        /// redact authentication in the request headers
                    },
                }
                : undefined),
        };
        this.httpResponse = httpResponse;
    }
}
/**
 * Thrown when the HTTP request to the provider fails, e.g. due to API issues or server errors.
 */
class InferenceClientProviderApiError extends InferenceClientHttpRequestError {
    constructor(message, httpRequest, httpResponse) {
        super(message, httpRequest, httpResponse);
        this.name = "ProviderApiError";
    }
}
exports.InferenceClientProviderApiError = InferenceClientProviderApiError;
/**
 * Thrown when the HTTP request to the hub fails, e.g. due to API issues or server errors.
 */
class InferenceClientHubApiError extends InferenceClientHttpRequestError {
    constructor(message, httpRequest, httpResponse) {
        super(message, httpRequest, httpResponse);
        this.name = "HubApiError";
    }
}
exports.InferenceClientHubApiError = InferenceClientHubApiError;
/**
 * Thrown when the inference output returned by the provider is invalid / does not match the expectations
 */
class InferenceClientProviderOutputError extends InferenceClientError {
    constructor(message) {
        super(message);
        this.name = "ProviderOutputError";
    }
}
exports.InferenceClientProviderOutputError = InferenceClientProviderOutputError;
