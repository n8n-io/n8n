// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _a;
import * as Errors from "./error.mjs";
import * as Uploads from "./uploads.mjs";
import * as Core from "./core.mjs";
import * as API from "./resources/index.mjs";
/**
 * API Client for interfacing with the Anthropic API.
 */
export class Anthropic extends Core.APIClient {
    /**
     * API Client for interfacing with the Anthropic API.
     *
     * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
     * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
     * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
     * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
     * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL = Core.readEnv('ANTHROPIC_BASE_URL'), apiKey = Core.readEnv('ANTHROPIC_API_KEY') ?? null, authToken = Core.readEnv('ANTHROPIC_AUTH_TOKEN') ?? null, ...opts } = {}) {
        const options = {
            apiKey,
            authToken,
            ...opts,
            baseURL: baseURL || `https://api.anthropic.com`,
        };
        if (!options.dangerouslyAllowBrowser && Core.isRunningInBrowser()) {
            throw new Errors.AnthropicError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n\nTODO: link!\n");
        }
        super({
            baseURL: options.baseURL,
            timeout: options.timeout ?? 600000 /* 10 minutes */,
            httpAgent: options.httpAgent,
            maxRetries: options.maxRetries,
            fetch: options.fetch,
        });
        this.completions = new API.Completions(this);
        this.messages = new API.Messages(this);
        this.beta = new API.Beta(this);
        this._options = options;
        this.apiKey = apiKey;
        this.authToken = authToken;
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    defaultHeaders(opts) {
        return {
            ...super.defaultHeaders(opts),
            ...(this._options.dangerouslyAllowBrowser ?
                { 'anthropic-dangerous-direct-browser-access': 'true' }
                : undefined),
            'anthropic-version': '2023-06-01',
            ...this._options.defaultHeaders,
        };
    }
    validateHeaders(headers, customHeaders) {
        if (this.apiKey && headers['x-api-key']) {
            return;
        }
        if (customHeaders['x-api-key'] === null) {
            return;
        }
        if (this.authToken && headers['authorization']) {
            return;
        }
        if (customHeaders['authorization'] === null) {
            return;
        }
        throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
    }
    authHeaders(opts) {
        const apiKeyAuth = this.apiKeyAuth(opts);
        const bearerAuth = this.bearerAuth(opts);
        if (apiKeyAuth != null && !Core.isEmptyObj(apiKeyAuth)) {
            return apiKeyAuth;
        }
        if (bearerAuth != null && !Core.isEmptyObj(bearerAuth)) {
            return bearerAuth;
        }
        return {};
    }
    apiKeyAuth(opts) {
        if (this.apiKey == null) {
            return {};
        }
        return { 'X-Api-Key': this.apiKey };
    }
    bearerAuth(opts) {
        if (this.authToken == null) {
            return {};
        }
        return { Authorization: `Bearer ${this.authToken}` };
    }
}
_a = Anthropic;
Anthropic.Anthropic = _a;
Anthropic.HUMAN_PROMPT = '\n\nHuman:';
Anthropic.AI_PROMPT = '\n\nAssistant:';
Anthropic.DEFAULT_TIMEOUT = 600000; // 10 minutes
Anthropic.AnthropicError = Errors.AnthropicError;
Anthropic.APIError = Errors.APIError;
Anthropic.APIConnectionError = Errors.APIConnectionError;
Anthropic.APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
Anthropic.APIUserAbortError = Errors.APIUserAbortError;
Anthropic.NotFoundError = Errors.NotFoundError;
Anthropic.ConflictError = Errors.ConflictError;
Anthropic.RateLimitError = Errors.RateLimitError;
Anthropic.BadRequestError = Errors.BadRequestError;
Anthropic.AuthenticationError = Errors.AuthenticationError;
Anthropic.InternalServerError = Errors.InternalServerError;
Anthropic.PermissionDeniedError = Errors.PermissionDeniedError;
Anthropic.UnprocessableEntityError = Errors.UnprocessableEntityError;
Anthropic.toFile = Uploads.toFile;
Anthropic.fileFromPath = Uploads.fileFromPath;
export const { HUMAN_PROMPT, AI_PROMPT } = Anthropic;
export const { AnthropicError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } = Errors;
export var toFile = Uploads.toFile;
export var fileFromPath = Uploads.fileFromPath;
(function (Anthropic) {
    Anthropic.Completions = API.Completions;
    Anthropic.Messages = API.Messages;
    Anthropic.Beta = API.Beta;
})(Anthropic || (Anthropic = {}));
export default Anthropic;
//# sourceMappingURL=index.mjs.map