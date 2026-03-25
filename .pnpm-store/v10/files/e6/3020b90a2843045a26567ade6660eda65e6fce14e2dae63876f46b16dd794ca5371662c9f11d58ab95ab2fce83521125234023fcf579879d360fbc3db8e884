// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _a;
import * as Core from "./core.mjs";
import * as Errors from "./error.mjs";
import * as Uploads from "./uploads.mjs";
import * as API from "./resources/index.mjs";
import { Contexts, } from "./resources/contexts.mjs";
import { Extensions } from "./resources/extensions.mjs";
import { Projects } from "./resources/projects.mjs";
import { Sessions, } from "./resources/sessions/sessions.mjs";
/**
 * API Client for interfacing with the Browserbase API.
 */
export class Browserbase extends Core.APIClient {
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
    constructor({ baseURL = Core.readEnv('BROWSERBASE_BASE_URL'), apiKey = Core.readEnv('BROWSERBASE_API_KEY'), ...opts } = {}) {
        if (apiKey === undefined) {
            throw new Errors.BrowserbaseError("The BROWSERBASE_API_KEY environment variable is missing or empty; either provide it, or instantiate the Browserbase client with an apiKey option, like new Browserbase({ apiKey: 'My API Key' }).");
        }
        const options = {
            apiKey,
            ...opts,
            baseURL: baseURL || `https://api.browserbase.com`,
        };
        super({
            baseURL: options.baseURL,
            timeout: options.timeout ?? 60000 /* 1 minute */,
            httpAgent: options.httpAgent,
            maxRetries: options.maxRetries,
            fetch: options.fetch,
        });
        this.contexts = new API.Contexts(this);
        this.extensions = new API.Extensions(this);
        this.projects = new API.Projects(this);
        this.sessions = new API.Sessions(this);
        this._options = options;
        this.apiKey = apiKey;
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    defaultHeaders(opts) {
        return {
            ...super.defaultHeaders(opts),
            ...this._options.defaultHeaders,
        };
    }
    authHeaders(opts) {
        return { 'X-BB-API-Key': this.apiKey };
    }
}
_a = Browserbase;
Browserbase.Browserbase = _a;
Browserbase.DEFAULT_TIMEOUT = 60000; // 1 minute
Browserbase.BrowserbaseError = Errors.BrowserbaseError;
Browserbase.APIError = Errors.APIError;
Browserbase.APIConnectionError = Errors.APIConnectionError;
Browserbase.APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
Browserbase.APIUserAbortError = Errors.APIUserAbortError;
Browserbase.NotFoundError = Errors.NotFoundError;
Browserbase.ConflictError = Errors.ConflictError;
Browserbase.RateLimitError = Errors.RateLimitError;
Browserbase.BadRequestError = Errors.BadRequestError;
Browserbase.AuthenticationError = Errors.AuthenticationError;
Browserbase.InternalServerError = Errors.InternalServerError;
Browserbase.PermissionDeniedError = Errors.PermissionDeniedError;
Browserbase.UnprocessableEntityError = Errors.UnprocessableEntityError;
Browserbase.toFile = Uploads.toFile;
Browserbase.fileFromPath = Uploads.fileFromPath;
Browserbase.Contexts = Contexts;
Browserbase.Extensions = Extensions;
Browserbase.Projects = Projects;
Browserbase.Sessions = Sessions;
export { toFile, fileFromPath } from "./uploads.mjs";
export { BrowserbaseError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } from "./error.mjs";
export default Browserbase;
//# sourceMappingURL=index.mjs.map