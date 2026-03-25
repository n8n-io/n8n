import type { RequestOptions, ResponseHeaders, OctokitResponse } from "@octokit/types";
import type { RequestErrorOptions } from "./types";
/**
 * Error with extra properties to help with debugging
 */
export declare class RequestError extends Error {
    name: "HttpError";
    /**
     * http status code
     */
    status: number;
    /**
     * http status code
     *
     * @deprecated `error.code` is deprecated in favor of `error.status`
     */
    code: number;
    /**
     * Request options that lead to the error.
     */
    request: RequestOptions;
    /**
     * error response headers
     *
     * @deprecated `error.headers` is deprecated in favor of `error.response.headers`
     */
    headers: ResponseHeaders;
    /**
     * Response object if a response was received
     */
    response?: OctokitResponse<unknown>;
    constructor(message: string, statusCode: number, options: RequestErrorOptions);
}
