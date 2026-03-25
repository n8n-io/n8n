/**
 * @description This file is a modified version of `fetch-result-please` (`ofetch`), minimalized and adapted to Hono's custom needs.
 *
 * @link https://www.npmjs.com/package/fetch-result-please
 */
/**
 * Smartly parses and return the consumable result from a fetch `Response`.
 *
 * Throwing a structured error if the response is not `ok`. ({@link DetailedError})
 */
export declare function fetchRP(fetchRes: Response | Promise<Response>): Promise<any>;
export declare class DetailedError extends Error {
    /**
     * Additional `message` that will be logged AND returned to client
     */
    detail?: any;
    /**
     * Additional `code` that will be logged AND returned to client
     */
    code?: any;
    /**
     * Additional value that will be logged AND NOT returned to client
     */
    log?: any;
    /**
     * Optionally set the status code to return, in a web server context
     */
    statusCode?: any;
    constructor(message: string, options?: {
        detail?: any;
        code?: any;
        statusCode?: number;
        log?: any;
    });
}
