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
exports.UnprocessableEntityError = exports.PermissionDeniedError = exports.InternalServerError = exports.AuthenticationError = exports.BadRequestError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.APIUserAbortError = exports.APIConnectionTimeoutError = exports.APIConnectionError = exports.APIError = exports.BrowserbaseError = exports.fileFromPath = exports.toFile = exports.Browserbase = void 0;
const Core = __importStar(require("./core.js"));
const Errors = __importStar(require("./error.js"));
const Uploads = __importStar(require("./uploads.js"));
const API = __importStar(require("./resources/index.js"));
const contexts_1 = require("./resources/contexts.js");
const extensions_1 = require("./resources/extensions.js");
const projects_1 = require("./resources/projects.js");
const sessions_1 = require("./resources/sessions/sessions.js");
/**
 * API Client for interfacing with the Browserbase API.
 */
class Browserbase extends Core.APIClient {
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
exports.Browserbase = Browserbase;
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
Browserbase.Contexts = contexts_1.Contexts;
Browserbase.Extensions = extensions_1.Extensions;
Browserbase.Projects = projects_1.Projects;
Browserbase.Sessions = sessions_1.Sessions;
var uploads_1 = require("./uploads.js");
Object.defineProperty(exports, "toFile", { enumerable: true, get: function () { return uploads_1.toFile; } });
Object.defineProperty(exports, "fileFromPath", { enumerable: true, get: function () { return uploads_1.fileFromPath; } });
var error_1 = require("./error.js");
Object.defineProperty(exports, "BrowserbaseError", { enumerable: true, get: function () { return error_1.BrowserbaseError; } });
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
exports = module.exports = Browserbase;
exports.default = Browserbase;
//# sourceMappingURL=index.js.map