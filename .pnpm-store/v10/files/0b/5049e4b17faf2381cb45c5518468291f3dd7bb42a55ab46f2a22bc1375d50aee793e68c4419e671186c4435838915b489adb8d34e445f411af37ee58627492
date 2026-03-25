// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _a;
import * as Core from "./core.mjs";
import * as Errors from "./error.mjs";
import * as Uploads from "./uploads.mjs";
import * as API from "./resources/index.mjs";
import { Batches, } from "./resources/batches.mjs";
import { Completions } from "./resources/completions.mjs";
import { Embeddings, } from "./resources/embeddings.mjs";
import { Files, } from "./resources/files.mjs";
import { Models } from "./resources/models.mjs";
import { Audio } from "./resources/audio/audio.mjs";
import { Chat } from "./resources/chat/chat.mjs";
/**
 * API Client for interfacing with the Groq API.
 */
export class Groq extends Core.APIClient {
    /**
     * API Client for interfacing with the Groq API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['GROQ_API_KEY'] ?? undefined]
     * @param {string} [opts.baseURL=process.env['GROQ_BASE_URL'] ?? https://api.groq.com] - Override the default base URL for the API.
     * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
     * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL = Core.readEnv('GROQ_BASE_URL'), apiKey = Core.readEnv('GROQ_API_KEY'), ...opts } = {}) {
        if (apiKey === undefined) {
            throw new Errors.GroqError("The GROQ_API_KEY environment variable is missing or empty; either provide it, or instantiate the Groq client with an apiKey option, like new Groq({ apiKey: 'My API Key' }).");
        }
        const options = {
            apiKey,
            ...opts,
            baseURL: baseURL || `https://api.groq.com`,
        };
        if (!options.dangerouslyAllowBrowser && Core.isRunningInBrowser()) {
            throw new Errors.GroqError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Groq({ apiKey, dangerouslyAllowBrowser: true })");
        }
        super({
            baseURL: options.baseURL,
            timeout: options.timeout ?? 60000 /* 1 minute */,
            httpAgent: options.httpAgent,
            maxRetries: options.maxRetries,
            fetch: options.fetch,
        });
        this.completions = new API.Completions(this);
        this.chat = new API.Chat(this);
        this.embeddings = new API.Embeddings(this);
        this.audio = new API.Audio(this);
        this.models = new API.Models(this);
        this.batches = new API.Batches(this);
        this.files = new API.Files(this);
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
        return { Authorization: `Bearer ${this.apiKey}` };
    }
}
_a = Groq;
Groq.Groq = _a;
Groq.DEFAULT_TIMEOUT = 60000; // 1 minute
Groq.GroqError = Errors.GroqError;
Groq.APIError = Errors.APIError;
Groq.APIConnectionError = Errors.APIConnectionError;
Groq.APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
Groq.APIUserAbortError = Errors.APIUserAbortError;
Groq.NotFoundError = Errors.NotFoundError;
Groq.ConflictError = Errors.ConflictError;
Groq.RateLimitError = Errors.RateLimitError;
Groq.BadRequestError = Errors.BadRequestError;
Groq.AuthenticationError = Errors.AuthenticationError;
Groq.InternalServerError = Errors.InternalServerError;
Groq.PermissionDeniedError = Errors.PermissionDeniedError;
Groq.UnprocessableEntityError = Errors.UnprocessableEntityError;
Groq.toFile = Uploads.toFile;
Groq.fileFromPath = Uploads.fileFromPath;
Groq.Completions = Completions;
Groq.Chat = Chat;
Groq.Embeddings = Embeddings;
Groq.Audio = Audio;
Groq.Models = Models;
Groq.Batches = Batches;
Groq.Files = Files;
export { toFile, fileFromPath } from "./uploads.mjs";
export { GroqError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } from "./error.mjs";
export default Groq;
//# sourceMappingURL=index.mjs.map