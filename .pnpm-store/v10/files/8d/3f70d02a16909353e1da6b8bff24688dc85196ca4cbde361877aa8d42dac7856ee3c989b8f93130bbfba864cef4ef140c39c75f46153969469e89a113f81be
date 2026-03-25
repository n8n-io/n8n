"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnprocessableEntityError = exports.PermissionDeniedError = exports.InternalServerError = exports.AuthenticationError = exports.BadRequestError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.APIUserAbortError = exports.APIConnectionTimeoutError = exports.APIConnectionError = exports.APIError = exports.GroqError = exports.fileFromPath = exports.toFile = exports.Groq = void 0;
const Core = __importStar(require("./core.js"));
const Errors = __importStar(require("./error.js"));
const Uploads = __importStar(require("./uploads.js"));
const API = __importStar(require("./resources/index.js"));
const batches_1 = require("./resources/batches.js");
const completions_1 = require("./resources/completions.js");
const embeddings_1 = require("./resources/embeddings.js");
const files_1 = require("./resources/files.js");
const models_1 = require("./resources/models.js");
const audio_1 = require("./resources/audio/audio.js");
const chat_1 = require("./resources/chat/chat.js");
/**
 * API Client for interfacing with the Groq API.
 */
class Groq extends Core.APIClient {
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
exports.Groq = Groq;
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
Groq.Completions = completions_1.Completions;
Groq.Chat = chat_1.Chat;
Groq.Embeddings = embeddings_1.Embeddings;
Groq.Audio = audio_1.Audio;
Groq.Models = models_1.Models;
Groq.Batches = batches_1.Batches;
Groq.Files = files_1.Files;
var uploads_1 = require("./uploads.js");
Object.defineProperty(exports, "toFile", { enumerable: true, get: function () { return uploads_1.toFile; } });
Object.defineProperty(exports, "fileFromPath", { enumerable: true, get: function () { return uploads_1.fileFromPath; } });
var error_1 = require("./error.js");
Object.defineProperty(exports, "GroqError", { enumerable: true, get: function () { return error_1.GroqError; } });
Object.defineProperty(exports, "APIError", { enumerable: true, get: function () { return error_1.APIError; } });
Object.defineProperty(exports, "APIConnectionError", { enumerable: true, get: function () { return error_1.APIConnectionError; } });
Object.defineProperty(exports, "APIConnectionTimeoutError", { enumerable: true, get: function () { return error_1.APIConnectionTimeoutError; } });
Object.defineProperty(exports, "APIUserAbortError", { enumerable: true, get: function () { return error_1.APIUserAbortError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return error_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return error_1.ConflictError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return error_1.RateLimitError; } });
Object.defineProperty(exports, "BadRequestError", { enumerable: true, get: function () { return error_1.BadRequestError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return error_1.AuthenticationError; } });
Object.defineProperty(exports, "InternalServerError", { enumerable: true, get: function () { return error_1.InternalServerError; } });
Object.defineProperty(exports, "PermissionDeniedError", { enumerable: true, get: function () { return error_1.PermissionDeniedError; } });
Object.defineProperty(exports, "UnprocessableEntityError", { enumerable: true, get: function () { return error_1.UnprocessableEntityError; } });
exports = module.exports = Groq;
exports.default = Groq;
//# sourceMappingURL=index.js.map