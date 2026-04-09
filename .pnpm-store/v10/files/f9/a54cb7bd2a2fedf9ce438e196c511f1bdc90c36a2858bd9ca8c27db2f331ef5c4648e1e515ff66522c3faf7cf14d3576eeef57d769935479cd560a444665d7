import { type Agent, type RequestInit } from "./_shims/index.js";
import * as Core from "./core.js";
import * as Errors from "./error.js";
import * as Pagination from "./pagination.js";
import { type CursorPageParams, CursorPageResponse, PageResponse } from "./pagination.js";
import * as Uploads from "./uploads.js";
import * as API from "./resources/index.js";
import { Batch, BatchCreateParams, BatchError, BatchListParams, BatchRequestCounts, Batches, BatchesPage } from "./resources/batches.js";
import { Completion, CompletionChoice, CompletionCreateParams, CompletionCreateParamsNonStreaming, CompletionCreateParamsStreaming, CompletionUsage, Completions } from "./resources/completions.js";
import { CreateEmbeddingResponse, Embedding, EmbeddingCreateParams, EmbeddingModel, Embeddings } from "./resources/embeddings.js";
import { FileContent, FileCreateParams, FileDeleted, FileListParams, FileObject, FileObjectsPage, FilePurpose, Files } from "./resources/files.js";
import { Image, ImageCreateVariationParams, ImageEditParams, ImageGenerateParams, ImageModel, Images, ImagesResponse } from "./resources/images.js";
import { Model, ModelDeleted, Models, ModelsPage } from "./resources/models.js";
import { Moderation, ModerationCreateParams, ModerationCreateResponse, ModerationImageURLInput, ModerationModel, ModerationMultiModalInput, ModerationTextInput, Moderations } from "./resources/moderations.js";
import { Audio, AudioModel, AudioResponseFormat } from "./resources/audio/audio.js";
import { Beta } from "./resources/beta/beta.js";
import { Chat, ChatModel } from "./resources/chat/chat.js";
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionAudio, ChatCompletionAudioParam, ChatCompletionChunk, ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionContentPartInputAudio, ChatCompletionContentPartRefusal, ChatCompletionContentPartText, ChatCompletionCreateParams, ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming, ChatCompletionFunctionCallOption, ChatCompletionFunctionMessageParam, ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionModality, ChatCompletionNamedToolChoice, ChatCompletionPredictionContent, ChatCompletionRole, ChatCompletionStreamOptions, ChatCompletionSystemMessageParam, ChatCompletionTokenLogprob, ChatCompletionTool, ChatCompletionToolChoiceOption, ChatCompletionToolMessageParam, ChatCompletionUserMessageParam } from "./resources/chat/completions.js";
import { FineTuning } from "./resources/fine-tuning/fine-tuning.js";
import { Upload, UploadCompleteParams, UploadCreateParams, Uploads as UploadsAPIUploads } from "./resources/uploads/uploads.js";
export interface ClientOptions {
    /**
     * Defaults to process.env['OPENAI_API_KEY'].
     */
    apiKey?: string | undefined;
    /**
     * Defaults to process.env['OPENAI_ORG_ID'].
     */
    organization?: string | null | undefined;
    /**
     * Defaults to process.env['OPENAI_PROJECT_ID'].
     */
    project?: string | null | undefined;
    /**
     * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
     *
     * Defaults to process.env['OPENAI_BASE_URL'].
     */
    baseURL?: string | null | undefined;
    /**
     * The maximum amount of time (in milliseconds) that the client should wait for a response
     * from the server before timing out a single request.
     *
     * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
     * much longer than this timeout before the promise succeeds or fails.
     */
    timeout?: number;
    /**
     * An HTTP agent used to manage HTTP(S) connections.
     *
     * If not provided, an agent will be constructed by default in the Node.js environment,
     * otherwise no agent is used.
     */
    httpAgent?: Agent;
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
    maxRetries?: number;
    /**
     * Default headers to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * header to `undefined` or `null` in request options.
     */
    defaultHeaders?: Core.Headers;
    /**
     * Default query parameters to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * param to `undefined` in request options.
     */
    defaultQuery?: Core.DefaultQuery;
    /**
     * By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     * Only set this option to `true` if you understand the risks and have appropriate mitigations in place.
     */
    dangerouslyAllowBrowser?: boolean;
}
/**
 * API Client for interfacing with the OpenAI API.
 */
export declare class OpenAI extends Core.APIClient {
    apiKey: string;
    organization: string | null;
    project: string | null;
    private _options;
    /**
     * API Client for interfacing with the OpenAI API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
     * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
     * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
     * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
     * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
     * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL, apiKey, organization, project, ...opts }?: ClientOptions);
    completions: API.Completions;
    chat: API.Chat;
    embeddings: API.Embeddings;
    files: API.Files;
    images: API.Images;
    audio: API.Audio;
    moderations: API.Moderations;
    models: API.Models;
    fineTuning: API.FineTuning;
    beta: API.Beta;
    batches: API.Batches;
    uploads: API.Uploads;
    protected defaultQuery(): Core.DefaultQuery | undefined;
    protected defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    protected authHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    protected stringifyQuery(query: Record<string, unknown>): string;
    static OpenAI: typeof OpenAI;
    static DEFAULT_TIMEOUT: number;
    static OpenAIError: typeof Errors.OpenAIError;
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
export declare namespace OpenAI {
    export type RequestOptions = Core.RequestOptions;
    export import Page = Pagination.Page;
    export { type PageResponse as PageResponse };
    export import CursorPage = Pagination.CursorPage;
    export { type CursorPageParams as CursorPageParams, type CursorPageResponse as CursorPageResponse };
    export { Completions as Completions, type Completion as Completion, type CompletionChoice as CompletionChoice, type CompletionUsage as CompletionUsage, type CompletionCreateParams as CompletionCreateParams, type CompletionCreateParamsNonStreaming as CompletionCreateParamsNonStreaming, type CompletionCreateParamsStreaming as CompletionCreateParamsStreaming, };
    export { Chat as Chat, type ChatModel as ChatModel, type ChatCompletion as ChatCompletion, type ChatCompletionAssistantMessageParam as ChatCompletionAssistantMessageParam, type ChatCompletionAudio as ChatCompletionAudio, type ChatCompletionAudioParam as ChatCompletionAudioParam, type ChatCompletionChunk as ChatCompletionChunk, type ChatCompletionContentPart as ChatCompletionContentPart, type ChatCompletionContentPartImage as ChatCompletionContentPartImage, type ChatCompletionContentPartInputAudio as ChatCompletionContentPartInputAudio, type ChatCompletionContentPartRefusal as ChatCompletionContentPartRefusal, type ChatCompletionContentPartText as ChatCompletionContentPartText, type ChatCompletionFunctionCallOption as ChatCompletionFunctionCallOption, type ChatCompletionFunctionMessageParam as ChatCompletionFunctionMessageParam, type ChatCompletionMessage as ChatCompletionMessage, type ChatCompletionMessageParam as ChatCompletionMessageParam, type ChatCompletionMessageToolCall as ChatCompletionMessageToolCall, type ChatCompletionModality as ChatCompletionModality, type ChatCompletionNamedToolChoice as ChatCompletionNamedToolChoice, type ChatCompletionPredictionContent as ChatCompletionPredictionContent, type ChatCompletionRole as ChatCompletionRole, type ChatCompletionStreamOptions as ChatCompletionStreamOptions, type ChatCompletionSystemMessageParam as ChatCompletionSystemMessageParam, type ChatCompletionTokenLogprob as ChatCompletionTokenLogprob, type ChatCompletionTool as ChatCompletionTool, type ChatCompletionToolChoiceOption as ChatCompletionToolChoiceOption, type ChatCompletionToolMessageParam as ChatCompletionToolMessageParam, type ChatCompletionUserMessageParam as ChatCompletionUserMessageParam, type ChatCompletionCreateParams as ChatCompletionCreateParams, type ChatCompletionCreateParamsNonStreaming as ChatCompletionCreateParamsNonStreaming, type ChatCompletionCreateParamsStreaming as ChatCompletionCreateParamsStreaming, };
    export { Embeddings as Embeddings, type CreateEmbeddingResponse as CreateEmbeddingResponse, type Embedding as Embedding, type EmbeddingModel as EmbeddingModel, type EmbeddingCreateParams as EmbeddingCreateParams, };
    export { Files as Files, type FileContent as FileContent, type FileDeleted as FileDeleted, type FileObject as FileObject, type FilePurpose as FilePurpose, FileObjectsPage as FileObjectsPage, type FileCreateParams as FileCreateParams, type FileListParams as FileListParams, };
    export { Images as Images, type Image as Image, type ImageModel as ImageModel, type ImagesResponse as ImagesResponse, type ImageCreateVariationParams as ImageCreateVariationParams, type ImageEditParams as ImageEditParams, type ImageGenerateParams as ImageGenerateParams, };
    export { Audio as Audio, type AudioModel as AudioModel, type AudioResponseFormat as AudioResponseFormat };
    export { Moderations as Moderations, type Moderation as Moderation, type ModerationImageURLInput as ModerationImageURLInput, type ModerationModel as ModerationModel, type ModerationMultiModalInput as ModerationMultiModalInput, type ModerationTextInput as ModerationTextInput, type ModerationCreateResponse as ModerationCreateResponse, type ModerationCreateParams as ModerationCreateParams, };
    export { Models as Models, type Model as Model, type ModelDeleted as ModelDeleted, ModelsPage as ModelsPage, };
    export { FineTuning as FineTuning };
    export { Beta as Beta };
    export { Batches as Batches, type Batch as Batch, type BatchError as BatchError, type BatchRequestCounts as BatchRequestCounts, BatchesPage as BatchesPage, type BatchCreateParams as BatchCreateParams, type BatchListParams as BatchListParams, };
    export { UploadsAPIUploads as Uploads, type Upload as Upload, type UploadCreateParams as UploadCreateParams, type UploadCompleteParams as UploadCompleteParams, };
    export type ErrorObject = API.ErrorObject;
    export type FunctionDefinition = API.FunctionDefinition;
    export type FunctionParameters = API.FunctionParameters;
    export type ResponseFormatJSONObject = API.ResponseFormatJSONObject;
    export type ResponseFormatJSONSchema = API.ResponseFormatJSONSchema;
    export type ResponseFormatText = API.ResponseFormatText;
}
/** API Client for interfacing with the Azure OpenAI API. */
export interface AzureClientOptions extends ClientOptions {
    /**
     * Defaults to process.env['OPENAI_API_VERSION'].
     */
    apiVersion?: string | undefined;
    /**
     * Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
     */
    endpoint?: string | undefined;
    /**
     * A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
     * Note: this means you won't be able to use non-deployment endpoints. Not supported with Assistants APIs.
     */
    deployment?: string | undefined;
    /**
     * Defaults to process.env['AZURE_OPENAI_API_KEY'].
     */
    apiKey?: string | undefined;
    /**
     * A function that returns an access token for Microsoft Entra (formerly known as Azure Active Directory),
     * which will be invoked on every request.
     */
    azureADTokenProvider?: (() => Promise<string>) | undefined;
}
/** API Client for interfacing with the Azure OpenAI API. */
export declare class AzureOpenAI extends OpenAI {
    private _azureADTokenProvider;
    private _deployment;
    apiVersion: string;
    /**
     * API Client for interfacing with the Azure OpenAI API.
     *
     * @param {string | undefined} [opts.apiVersion=process.env['OPENAI_API_VERSION'] ?? undefined]
     * @param {string | undefined} [opts.endpoint=process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
     * @param {string | undefined} [opts.apiKey=process.env['AZURE_OPENAI_API_KEY'] ?? undefined]
     * @param {string | undefined} opts.deployment - A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
     * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
     * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL']] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`.
     * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
     * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL, apiKey, apiVersion, endpoint, deployment, azureADTokenProvider, dangerouslyAllowBrowser, ...opts }?: AzureClientOptions);
    buildRequest(options: Core.FinalRequestOptions<unknown>): {
        req: RequestInit;
        url: string;
        timeout: number;
    };
    private _getAzureADToken;
    protected authHeaders(opts: Core.FinalRequestOptions): Core.Headers;
    protected prepareOptions(opts: Core.FinalRequestOptions<unknown>): Promise<void>;
}
export { toFile, fileFromPath } from "./uploads.js";
export { OpenAIError, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, NotFoundError, ConflictError, RateLimitError, BadRequestError, AuthenticationError, InternalServerError, PermissionDeniedError, UnprocessableEntityError, } from "./error.js";
export default OpenAI;
//# sourceMappingURL=index.d.ts.map