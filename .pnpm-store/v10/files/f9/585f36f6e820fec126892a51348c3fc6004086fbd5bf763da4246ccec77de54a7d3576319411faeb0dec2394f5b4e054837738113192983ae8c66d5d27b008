import type { PipelineRequest, PipelineResponse } from "./interfaces.js";
/**
 * The options supported by RestError.
 */
export interface RestErrorOptions {
    /**
     * The code of the error itself (use statics on RestError if possible.)
     */
    code?: string;
    /**
     * The HTTP status code of the request (if applicable.)
     */
    statusCode?: number;
    /**
     * The request that was made.
     */
    request?: PipelineRequest;
    /**
     * The response received (if any.)
     */
    response?: PipelineResponse;
}
/**
 * A custom error type for failed pipeline requests.
 */
export interface RestErrorConstructor {
    /**
     * Something went wrong when making the request.
     * This means the actual request failed for some reason,
     * such as a DNS issue or the connection being lost.
     */
    readonly REQUEST_SEND_ERROR: string;
    /**
     * This means that parsing the response from the server failed.
     * It may have been malformed.
     */
    readonly PARSE_ERROR: string;
    /**
     * Prototype of RestError
     */
    readonly prototype: RestError;
    /**
     * Construct a new RestError.
     */
    new (message: string, options?: RestErrorOptions): RestError;
}
/**
 * A custom error type for failed pipeline requests.
 */
export interface RestError extends Error {
    /**
     * The code of the error itself (use statics on RestError if possible.)
     */
    code?: string;
    /**
     * The HTTP status code of the request (if applicable.)
     */
    statusCode?: number;
    /**
     * The request that was made.
     * This property is non-enumerable.
     */
    request?: PipelineRequest;
    /**
     * The response received (if any.)
     * This property is non-enumerable.
     */
    response?: PipelineResponse;
    /**
     * Bonus property set by the throw site.
     */
    details?: unknown;
}
/**
 * A custom error type for failed pipeline requests.
 */
export declare const RestError: RestErrorConstructor;
/**
 * Typeguard for RestError
 * @param e - Something caught by a catch clause.
 */
export declare function isRestError(e: unknown): e is RestError;
//# sourceMappingURL=restError.d.ts.map