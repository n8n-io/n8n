import type { Fetch } from "./Fetch";
import type { Signal } from "./Signal";
/**
 * Octokit-specific request options which are ignored for the actual request, but can be used by Octokit or plugins to manipulate how the request is sent or how a response is handled
 */
export type RequestRequestOptions = {
    /**
     * Custom replacement for built-in fetch method. Useful for testing or request hooks.
     */
    fetch?: Fetch;
    /**
     * Use an `AbortController` instance to cancel a request. In node you can only cancel streamed requests.
     */
    signal?: Signal;
    /**
     * If set to `false`, the response body will not be parsed and will be returned as a stream.
     */
    parseSuccessResponseBody?: boolean;
    [option: string]: any;
};
