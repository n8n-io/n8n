import type { JsonObject } from "./vendor/type-fest/basic.js";
/**
 * Base class for all inference-related errors.
 */
export declare abstract class InferenceClientError extends Error {
    constructor(message: string);
}
export declare class InferenceClientInputError extends InferenceClientError {
    constructor(message: string);
}
interface HttpRequest {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: JsonObject;
}
interface HttpResponse {
    requestId: string;
    status: number;
    body: JsonObject | string;
}
declare abstract class InferenceClientHttpRequestError extends InferenceClientError {
    httpRequest: HttpRequest;
    httpResponse: HttpResponse;
    constructor(message: string, httpRequest: HttpRequest, httpResponse: HttpResponse);
}
/**
 * Thrown when the HTTP request to the provider fails, e.g. due to API issues or server errors.
 */
export declare class InferenceClientProviderApiError extends InferenceClientHttpRequestError {
    constructor(message: string, httpRequest: HttpRequest, httpResponse: HttpResponse);
}
/**
 * Thrown when the HTTP request to the hub fails, e.g. due to API issues or server errors.
 */
export declare class InferenceClientHubApiError extends InferenceClientHttpRequestError {
    constructor(message: string, httpRequest: HttpRequest, httpResponse: HttpResponse);
}
/**
 * Thrown when the inference output returned by the provider is invalid / does not match the expectations
 */
export declare class InferenceClientProviderOutputError extends InferenceClientError {
    constructor(message: string);
}
export {};
//# sourceMappingURL=errors.d.ts.map