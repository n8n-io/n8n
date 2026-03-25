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
export declare class RestError extends Error {
    /**
     * Something went wrong when making the request.
     * This means the actual request failed for some reason,
     * such as a DNS issue or the connection being lost.
     */
    static readonly REQUEST_SEND_ERROR: string;
    /**
     * This means that parsing the response from the server failed.
     * It may have been malformed.
     */
    static readonly PARSE_ERROR: string;
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
    constructor(message: string, options?: RestErrorOptions);
}
/**
 * Typeguard for RestError
 * @param e - Something caught by a catch clause.
 */
export declare function isRestError(e: unknown): e is RestError;
//# sourceMappingURL=restError.d.ts.map