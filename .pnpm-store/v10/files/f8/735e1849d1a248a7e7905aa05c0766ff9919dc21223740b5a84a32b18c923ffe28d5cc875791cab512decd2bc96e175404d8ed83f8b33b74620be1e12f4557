import { type Agent } from "./_shims/index.js";
import * as Core from "./core.js";
import * as Errors from "./error.js";
import * as Uploads from "./uploads.js";
import * as API from "./resources/index.js";
import { Context, ContextCreateParams, ContextCreateResponse, ContextUpdateResponse, Contexts } from "./resources/contexts.js";
import { Extension, ExtensionCreateParams, Extensions } from "./resources/extensions.js";
import { Project, ProjectListResponse, ProjectUsage, Projects } from "./resources/projects.js";
import { Session, SessionCreateParams, SessionCreateResponse, SessionListParams, SessionListResponse, SessionLiveURLs, SessionRetrieveResponse, SessionUpdateParams, Sessions } from "./resources/sessions/sessions.js";
export interface ClientOptions {
    /**
     * Your [Browserbase API Key](https://www.browserbase.com/settings).
     */
    apiKey?: string | undefined;
    /**
     * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
     *
     * Defaults to process.env['BROWSERBASE_BASE_URL'].
     */
    baseURL?: string | null | undefined;
    /**
     * The maximum amount of time (in milliseconds) that the client should wait for a response
     * from the server before timing out a single request.
     *
     * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
     * much longer than this timeout before the promise succeeds or fails.
     */
    timeout?: number | undefined;
    /**
     * An HTTP agent used to manage HTTP(S) connections.
     *
     * If not provided, an agent will be constructed by default in the Node.js environment,
     * otherwise no agent is used.
     */
    httpAgent?: Agent | undefined;
    /**
     * Specify a custom `fetch` function implementation.
     *
     * If not provided, we use `node-fetch` on Node.js and otherwise expect that `fetch` is
     * defined globally.
     */
    fetch?: Core.Fetch | undefined;
    /**
     * The maximum number of times that the client will retry a request in case of a
     * temporary failure, like a network error or a 5XX error from the server.
     *
     * @default 2
     */
    maxRetries?: number | undefined;
    /**
     * Default headers to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * header to `undefined` or `null` in request options.
     */
    defaultHeaders?: Core.Headers | undefined;
    /**
     * Default query parameters to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * param to `undefined` in request options.
     */
    defaultQuery?: Core.DefaultQuery | undefined;
}
/**
 * API Client for interfacing with the Browserbase API.
 */
export declare class Browserbase extends Core.APIClient {
    apiKey: string;
    private _options;
    /**
     * API Client for interfacing with the Browserbase API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['BROWSERBASE_API_KEY'] ?? undefined]
     * @param {string} [opts.baseURL=process.env['BROWSERBASE_BASE_URL'] ?? https://api.browserbase.com] - Override the default base URL for the API.
     * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
     * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     */
    constructor({ baseURL, apiKey, ...opts }?: ClientOptions);
    contexts: API.Contexts;
    extensions: API.Extensions;
    projects: API.Projects;
    sessions: API.Sessions;
    protected defaultQuery(): Core.DefaultQuery | undefined;
    protected defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    protected authHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    static Browserbase: typeof Browserbase;
    static DEFAULT_TIMEOUT: number;
    static BrowserbaseError: typeof Errors.BrowserbaseError;
    static APIError: typeof Errors.APIError;
    static APIConnectionError: typeof Errors.APIConnectionError;
    static APIConnectionTimeoutError: typeof Errors.APIConnectionTimeoutError;
    static APIUserAbortError: typeof Errors.APIUserAbortError;
    static NotFoundError: typeof Errors.NotFoundError;
    static ConflictError: typeof Errors.ConflictError;
    static RateLimitError: typeof Errors.RateLimitError;
    static BadRequestError: typeof Errors.BadRequestError;
    static AuthenticationError: typeof Errors.AuthenticationError;
    static InternalServerError: typeof Errors.InternalServerError;
    static PermissionDeniedError: typeof Errors.PermissionDeniedError;
    static UnprocessableEntityError: typeof Errors.UnprocessableEntityError;
    static toFile: typeof Uploads.toFile;
    static fileFromPath: typeof Uploads.fileFromPath;
}
export declare namespace Browserbase {
    export type RequestOptions = Core.RequestOptions;
    export { Contexts as Contexts, type Context as Context, type ContextCreateResponse as ContextCreateResponse, type ContextUpdateResponse as ContextUpdateResponse, type ContextCreateParams as ContextCreateParams, };
    export { Extensions as Extensions, type Extension as Extension, type ExtensionCreateParams as ExtensionCreateParams, };
    export { Projects as Projects, type Project as Project, type ProjectUsage as ProjectUsage, type ProjectListResponse as ProjectListResponse, };
    export { Sessions as Sessions, type Session as Session, type SessionLiveURLs as SessionLiveURLs, type SessionCreateResponse as SessionCreateResponse, type SessionRetrieveResponse as SessionRetrieveResponse, type SessionListResponse as SessionListResponse, type SessionCreateParams as SessionCreateParams, type SessionUpdateParams as SessionUpdateParams, type SessionListParams as SessionListParams, };
}
export { toFile, fileFromPath } from "./uploads.js";
export { BrowserbaseError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } from "./error.js";
export default Browserbase;
//# sourceMappingURL=index.d.ts.map