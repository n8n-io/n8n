import { type Agent } from "./_shims/index.js";
import * as Core from "./core.js";
import * as Errors from "./error.js";
import * as Uploads from "./uploads.js";
import * as API from "./resources/index.js";
import { BatchCreateParams, BatchCreateResponse, BatchListResponse, BatchRetrieveResponse, Batches } from "./resources/batches.js";
import { CompletionUsage, Completions } from "./resources/completions.js";
import { CreateEmbeddingResponse, Embedding, EmbeddingCreateParams, Embeddings } from "./resources/embeddings.js";
import { FileContentResponse, FileCreateParams, FileCreateResponse, FileDeleteResponse, FileInfoResponse, FileListResponse, Files } from "./resources/files.js";
import { Model, ModelDeleted, ModelListResponse, Models } from "./resources/models.js";
import { Audio } from "./resources/audio/audio.js";
import { Chat } from "./resources/chat/chat.js";
export interface ClientOptions {
    /**
     * Defaults to process.env['GROQ_API_KEY'].
     */
    apiKey?: string | undefined;
    /**
     * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
     *
     * Defaults to process.env['GROQ_BASE_URL'].
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
    /**
     * By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     * Only set this option to `true` if you understand the risks and have appropriate mitigations in place.
     */
    dangerouslyAllowBrowser?: boolean | undefined;
}
/**
 * API Client for interfacing with the Groq API.
 */
export declare class Groq extends Core.APIClient {
    apiKey: string;
    private _options;
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
    constructor({ baseURL, apiKey, ...opts }?: ClientOptions);
    completions: API.Completions;
    chat: API.Chat;
    embeddings: API.Embeddings;
    audio: API.Audio;
    models: API.Models;
    batches: API.Batches;
    files: API.Files;
    protected defaultQuery(): Core.DefaultQuery | undefined;
    protected defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    protected authHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    static Groq: typeof Groq;
    static DEFAULT_TIMEOUT: number;
    static GroqError: typeof Errors.GroqError;
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
export declare namespace Groq {
    export type RequestOptions = Core.RequestOptions;
    export { Completions as Completions, type CompletionUsage as CompletionUsage };
    export { Chat as Chat };
    export { Embeddings as Embeddings, type CreateEmbeddingResponse as CreateEmbeddingResponse, type Embedding as Embedding, type EmbeddingCreateParams as EmbeddingCreateParams, };
    export { Audio as Audio };
    export { Models as Models, type Model as Model, type ModelDeleted as ModelDeleted, type ModelListResponse as ModelListResponse, };
    export { Batches as Batches, type BatchCreateResponse as BatchCreateResponse, type BatchRetrieveResponse as BatchRetrieveResponse, type BatchListResponse as BatchListResponse, type BatchCreateParams as BatchCreateParams, };
    export { Files as Files, type FileCreateResponse as FileCreateResponse, type FileListResponse as FileListResponse, type FileDeleteResponse as FileDeleteResponse, type FileContentResponse as FileContentResponse, type FileInfoResponse as FileInfoResponse, type FileCreateParams as FileCreateParams, };
    export type ErrorObject = API.ErrorObject;
    export type FunctionDefinition = API.FunctionDefinition;
    export type FunctionParameters = API.FunctionParameters;
}
export { toFile, fileFromPath } from "./uploads.js";
export { GroqError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } from "./error.js";
export default Groq;
//# sourceMappingURL=index.d.ts.map