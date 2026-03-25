/**
 * Base class for all inference-related errors.
 */
export class InferenceClientError extends Error {
    constructor(message) {
        super(message);
        this.name = "InferenceClientError";
    }
}
export class InferenceClientInputError extends InferenceClientError {
    constructor(message) {
        super(message);
        this.name = "InputError";
    }
}
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
export class InferenceClientProviderApiError extends InferenceClientHttpRequestError {
    constructor(message, httpRequest, httpResponse) {
        super(message, httpRequest, httpResponse);
        this.name = "ProviderApiError";
    }
}
/**
 * Thrown when the HTTP request to the hub fails, e.g. due to API issues or server errors.
 */
export class InferenceClientHubApiError extends InferenceClientHttpRequestError {
    constructor(message, httpRequest, httpResponse) {
        super(message, httpRequest, httpResponse);
        this.name = "HubApiError";
    }
}
/**
 * Thrown when the inference output returned by the provider is invalid / does not match the expectations
 */
export class InferenceClientProviderOutputError extends InferenceClientError {
    constructor(message) {
        super(message);
        this.name = "ProviderOutputError";
    }
}
