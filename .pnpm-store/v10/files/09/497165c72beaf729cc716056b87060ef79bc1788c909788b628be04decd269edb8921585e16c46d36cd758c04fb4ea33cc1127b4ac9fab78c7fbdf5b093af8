import type { RequestRequestOptions } from "./RequestRequestOptions.js";
import type { RequestHeaders } from "./RequestHeaders.js";
import type { Url } from "./Url.js";
/**
 * Parameters that can be passed into `request(route, parameters)` or `endpoint(route, parameters)` methods
 */
export type RequestParameters = {
    /**
     * Base URL to be used when a relative URL is passed, such as `/orgs/{org}`.
     * If `baseUrl` is `https://enterprise.acme-inc.com/api/v3`, then the request
     * will be sent to `https://enterprise.acme-inc.com/api/v3/orgs/{org}`.
     */
    baseUrl?: Url;
    /**
     * HTTP headers. Use lowercase keys.
     */
    headers?: RequestHeaders;
    /**
     * Media type options, see {@link https://developer.github.com/v3/media/|GitHub Developer Guide}
     */
    mediaType?: {
        /**
         * `json` by default. Can be `raw`, `text`, `html`, `full`, `diff`, `patch`, `sha`, `base64`. Depending on endpoint
         */
        format?: string;
        /**
         * Custom media type names of {@link https://docs.github.com/en/graphql/overview/schema-previews|GraphQL API Previews} without the `-preview` suffix.
         * Example for single preview: `['squirrel-girl']`.
         * Example for multiple previews: `['squirrel-girl', 'mister-fantastic']`.
         */
        previews?: string[];
    };
    /**
     * The name of the operation to execute.
     * Required only if multiple operations are present in the query document.
     */
    operationName?: string;
    /**
     * The GraphQL query string to be sent in the request.
     * This is required and must contain a valid GraphQL document.
     */
    query?: string;
    /**
     * Pass custom meta information for the request. The `request` object will be returned as is.
     */
    request?: RequestRequestOptions;
    /**
     * Any additional parameter will be passed as follows
     * 1. URL parameter if `':parameter'` or `{parameter}` is part of `url`
     * 2. Query parameter if `method` is `'GET'` or `'HEAD'`
     * 3. Request body if `parameter` is `'data'`
     * 4. JSON in the request body in the form of `body[parameter]` unless `parameter` key is `'data'`
     */
    [parameter: string]: unknown;
};
