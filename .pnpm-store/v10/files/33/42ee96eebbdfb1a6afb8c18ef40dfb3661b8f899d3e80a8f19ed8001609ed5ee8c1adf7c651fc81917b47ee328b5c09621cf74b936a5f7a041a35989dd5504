// @ts-ignore
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { GoogleAuthOptions } from 'google-auth-library';

/** Marks the end of user activity.

 This can only be sent if automatic (i.e. server-side) activity detection is
 disabled.
 */
export declare interface ActivityEnd {
}

/** The different ways of handling user activity. */
export declare enum ActivityHandling {
    /**
     * If unspecified, the default behavior is `START_OF_ACTIVITY_INTERRUPTS`.
     */
    ACTIVITY_HANDLING_UNSPECIFIED = "ACTIVITY_HANDLING_UNSPECIFIED",
    /**
     * If true, start of activity will interrupt the model's response (also called "barge in"). The model's current response will be cut-off in the moment of the interruption. This is the default behavior.
     */
    START_OF_ACTIVITY_INTERRUPTS = "START_OF_ACTIVITY_INTERRUPTS",
    /**
     * The model's response will not be interrupted.
     */
    NO_INTERRUPTION = "NO_INTERRUPTION"
}

/** Marks the start of user activity.

 This can only be sent if automatic (i.e. server-side) activity detection is
 disabled.
 */
export declare interface ActivityStart {
}

/** Optional. Adapter size for tuning. */
export declare enum AdapterSize {
    /**
     * Adapter size is unspecified.
     */
    ADAPTER_SIZE_UNSPECIFIED = "ADAPTER_SIZE_UNSPECIFIED",
    /**
     * Adapter size 1.
     */
    ADAPTER_SIZE_ONE = "ADAPTER_SIZE_ONE",
    /**
     * Adapter size 2.
     */
    ADAPTER_SIZE_TWO = "ADAPTER_SIZE_TWO",
    /**
     * Adapter size 4.
     */
    ADAPTER_SIZE_FOUR = "ADAPTER_SIZE_FOUR",
    /**
     * Adapter size 8.
     */
    ADAPTER_SIZE_EIGHT = "ADAPTER_SIZE_EIGHT",
    /**
     * Adapter size 16.
     */
    ADAPTER_SIZE_SIXTEEN = "ADAPTER_SIZE_SIXTEEN",
    /**
     * Adapter size 32.
     */
    ADAPTER_SIZE_THIRTY_TWO = "ADAPTER_SIZE_THIRTY_TWO"
}

/** The generic reusable api auth config. Deprecated. Please use AuthConfig (google/cloud/aiplatform/master/auth.proto) instead. */
export declare interface ApiAuth {
    /** The API secret. */
    apiKeyConfig?: ApiAuthApiKeyConfig;
}

/** The API secret. */
export declare interface ApiAuthApiKeyConfig {
    /** Required. The SecretManager secret version resource name storing API key. e.g. projects/{project}/secrets/{secret}/versions/{version} */
    apiKeySecretVersion?: string;
    /** The API key string. Either this or `api_key_secret_version` must be set. */
    apiKeyString?: string;
}

/**
 * The ApiClient class is used to send requests to the Gemini API or Vertex AI
 * endpoints.
 */
declare class ApiClient {
    readonly clientOptions: ApiClientInitOptions;
    constructor(opts: ApiClientInitOptions);
    /**
     * Determines the base URL for Vertex AI based on project and location.
     * Uses the global endpoint if location is 'global' or if project/location
     * are not specified (implying API key usage).
     * @private
     */
    private baseUrlFromProjectLocation;
    /**
     * Normalizes authentication parameters for Vertex AI.
     * If project and location are provided, API key is cleared.
     * If project and location are not provided (implying API key usage),
     * project and location are cleared.
     * @private
     */
    private normalizeAuthParameters;
    isVertexAI(): boolean;
    getProject(): string | undefined;
    getLocation(): string | undefined;
    getApiVersion(): string;
    getBaseUrl(): string;
    getRequestUrl(): string;
    getHeaders(): Record<string, string>;
    private getRequestUrlInternal;
    getBaseResourcePath(): string;
    getApiKey(): string | undefined;
    getWebsocketBaseUrl(): string;
    setBaseUrl(url: string): void;
    private constructUrl;
    private shouldPrependVertexProjectPath;
    request(request: HttpRequest): Promise<HttpResponse>;
    private patchHttpOptions;
    requestStream(request: HttpRequest): Promise<AsyncGenerator<HttpResponse>>;
    private includeExtraHttpOptionsToRequestInit;
    private unaryApiCall;
    private streamApiCall;
    processStreamResponse(response: Response): AsyncGenerator<HttpResponse>;
    private apiCall;
    getDefaultHeaders(): Record<string, string>;
    private getHeadersInternal;
    /**
     * Uploads a file asynchronously using Gemini API only, this is not supported
     * in Vertex AI.
     *
     * @param file The string path to the file to be uploaded or a Blob object.
     * @param config Optional parameters specified in the `UploadFileConfig`
     *     interface. @see {@link UploadFileConfig}
     * @return A promise that resolves to a `File` object.
     * @throws An error if called on a Vertex AI client.
     * @throws An error if the `mimeType` is not provided and can not be inferred,
     */
    uploadFile(file: string | Blob, config?: UploadFileConfig): Promise<File_2>;
    /**
     * Downloads a file asynchronously to the specified path.
     *
     * @params params - The parameters for the download request, see {@link
     * DownloadFileParameters}
     */
    downloadFile(params: DownloadFileParameters): Promise<void>;
    private fetchUploadUrl;
}

/**
 * Options for initializing the ApiClient. The ApiClient uses the parameters
 * for authentication purposes as well as to infer if SDK should send the
 * request to Vertex AI or Gemini API.
 */
declare interface ApiClientInitOptions {
    /**
     * The object used for adding authentication headers to API requests.
     */
    auth: Auth;
    /**
     * The uploader to use for uploading files. This field is required for
     * creating a client, will be set through the Node_client or Web_client.
     */
    uploader: Uploader;
    /**
     * Optional. The downloader to use for downloading files. This field is
     * required for creating a client, will be set through the Node_client or
     * Web_client.
     */
    downloader: Downloader;
    /**
     * Optional. The Google Cloud project ID for Vertex AI users.
     * It is not the numeric project name.
     * If not provided, SDK will try to resolve it from runtime environment.
     */
    project?: string;
    /**
     * Optional. The Google Cloud project location for Vertex AI users.
     * If not provided, SDK will try to resolve it from runtime environment.
     */
    location?: string;
    /**
     * The API Key. This is required for Gemini API users.
     */
    apiKey?: string;
    /**
     * Optional. Set to true if you intend to call Vertex AI endpoints.
     * If unset, default SDK behavior is to call Gemini API.
     */
    vertexai?: boolean;
    /**
     * Optional. The API version for the endpoint.
     * If unset, SDK will choose a default api version.
     */
    apiVersion?: string;
    /**
     * Optional. A set of customizable configuration for HTTP requests.
     */
    httpOptions?: HttpOptions;
    /**
     * Optional. An extra string to append at the end of the User-Agent header.
     *
     * This can be used to e.g specify the runtime and its version.
     */
    userAgentExtra?: string;
}

/**
 * API errors raised by the GenAI API.
 */
export declare class ApiError extends Error {
    /** HTTP status code */
    status: number;
    constructor(options: ApiErrorInfo);
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Details for errors from calling the API.
 */
export declare interface ApiErrorInfo {
    /** The error message. */
    message: string;
    /** The HTTP status code. */
    status: number;
}

/** Config for authentication with API key. */
export declare interface ApiKeyConfig {
    /** The API key to be used in the request directly. */
    apiKeyString?: string;
}

/** The API spec that the external API implements. */
export declare enum ApiSpec {
    /**
     * Unspecified API spec. This value should not be used.
     */
    API_SPEC_UNSPECIFIED = "API_SPEC_UNSPECIFIED",
    /**
     * Simple search API spec.
     */
    SIMPLE_SEARCH = "SIMPLE_SEARCH",
    /**
     * Elastic search API spec.
     */
    ELASTIC_SEARCH = "ELASTIC_SEARCH"
}

/** Representation of an audio chunk. */
export declare interface AudioChunk {
    /** Raw bytes of audio data.
     * @remarks Encoded as base64 string. */
    data?: string;
    /** MIME type of the audio chunk. */
    mimeType?: string;
    /** Prompts and config used for generating this audio chunk. */
    sourceMetadata?: LiveMusicSourceMetadata;
}

/** The audio transcription configuration in Setup. */
export declare interface AudioTranscriptionConfig {
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * The Auth interface is used to authenticate with the API service.
 */
declare interface Auth {
    /**
     * Sets the headers needed to authenticate with the API service.
     *
     * @param headers - The Headers object that will be updated with the authentication headers.
     */
    addAuthHeaders(headers: Headers): Promise<void>;
}

/** Auth configuration to run the extension. */
export declare interface AuthConfig {
    /** Config for API key auth. */
    apiKeyConfig?: ApiKeyConfig;
    /** Type of auth scheme. */
    authType?: AuthType;
    /** Config for Google Service Account auth. */
    googleServiceAccountConfig?: AuthConfigGoogleServiceAccountConfig;
    /** Config for HTTP Basic auth. */
    httpBasicAuthConfig?: AuthConfigHttpBasicAuthConfig;
    /** Config for user oauth. */
    oauthConfig?: AuthConfigOauthConfig;
    /** Config for user OIDC auth. */
    oidcConfig?: AuthConfigOidcConfig;
}

/** Config for Google Service Account Authentication. */
export declare interface AuthConfigGoogleServiceAccountConfig {
    /** Optional. The service account that the extension execution service runs as. - If the service account is specified, the `iam.serviceAccounts.getAccessToken` permission should be granted to Vertex AI Extension Service Agent (https://cloud.google.com/vertex-ai/docs/general/access-control#service-agents) on the specified service account. - If not specified, the Vertex AI Extension Service Agent will be used to execute the Extension. */
    serviceAccount?: string;
}

/** Config for HTTP Basic Authentication. */
export declare interface AuthConfigHttpBasicAuthConfig {
    /** Required. The name of the SecretManager secret version resource storing the base64 encoded credentials. Format: `projects/{project}/secrets/{secrete}/versions/{version}` - If specified, the `secretmanager.versions.access` permission should be granted to Vertex AI Extension Service Agent (https://cloud.google.com/vertex-ai/docs/general/access-control#service-agents) on the specified resource. */
    credentialSecret?: string;
}

/** Config for user oauth. */
export declare interface AuthConfigOauthConfig {
    /** Access token for extension endpoint. Only used to propagate token from [[ExecuteExtensionRequest.runtime_auth_config]] at request time. */
    accessToken?: string;
    /** The service account used to generate access tokens for executing the Extension. - If the service account is specified, the `iam.serviceAccounts.getAccessToken` permission should be granted to Vertex AI Extension Service Agent (https://cloud.google.com/vertex-ai/docs/general/access-control#service-agents) on the provided service account. */
    serviceAccount?: string;
}

/** Config for user OIDC auth. */
export declare interface AuthConfigOidcConfig {
    /** OpenID Connect formatted ID token for extension endpoint. Only used to propagate token from [[ExecuteExtensionRequest.runtime_auth_config]] at request time. */
    idToken?: string;
    /** The service account used to generate an OpenID Connect (OIDC)-compatible JWT token signed by the Google OIDC Provider (accounts.google.com) for extension endpoint (https://cloud.google.com/iam/docs/create-short-lived-credentials-direct#sa-credentials-oidc). - The audience for the token will be set to the URL in the server url defined in the OpenApi spec. - If the service account is provided, the service account should grant `iam.serviceAccounts.getOpenIdToken` permission to Vertex AI Extension Service Agent (https://cloud.google.com/vertex-ai/docs/general/access-control#service-agents). */
    serviceAccount?: string;
}

/** Config for auth_tokens.create parameters. */
export declare interface AuthToken {
    /** The name of the auth token. */
    name?: string;
}

/** Type of auth scheme. */
export declare enum AuthType {
    AUTH_TYPE_UNSPECIFIED = "AUTH_TYPE_UNSPECIFIED",
    /**
     * No Auth.
     */
    NO_AUTH = "NO_AUTH",
    /**
     * API Key Auth.
     */
    API_KEY_AUTH = "API_KEY_AUTH",
    /**
     * HTTP Basic Auth.
     */
    HTTP_BASIC_AUTH = "HTTP_BASIC_AUTH",
    /**
     * Google Service Account Auth.
     */
    GOOGLE_SERVICE_ACCOUNT_AUTH = "GOOGLE_SERVICE_ACCOUNT_AUTH",
    /**
     * OAuth auth.
     */
    OAUTH = "OAUTH",
    /**
     * OpenID Connect (OIDC) Auth.
     */
    OIDC_AUTH = "OIDC_AUTH"
}

/** Configures automatic detection of activity. */
export declare interface AutomaticActivityDetection {
    /** If enabled, detected voice and text input count as activity. If disabled, the client must send activity signals. */
    disabled?: boolean;
    /** Determines how likely speech is to be detected. */
    startOfSpeechSensitivity?: StartSensitivity;
    /** Determines how likely detected speech is ended. */
    endOfSpeechSensitivity?: EndSensitivity;
    /** The required duration of detected speech before start-of-speech is committed. The lower this value the more sensitive the start-of-speech detection is and the shorter speech can be recognized. However, this also increases the probability of false positives. */
    prefixPaddingMs?: number;
    /** The required duration of detected non-speech (e.g. silence) before end-of-speech is committed. The larger this value, the longer speech gaps can be without interrupting the user's activity but this will increase the model's latency. */
    silenceDurationMs?: number;
}

/** The configuration for automatic function calling. */
export declare interface AutomaticFunctionCallingConfig {
    /** Whether to disable automatic function calling.
     If not set or set to False, will enable automatic function calling.
     If set to True, will disable automatic function calling.
     */
    disable?: boolean;
    /** If automatic function calling is enabled,
     maximum number of remote calls for automatic function calling.
     This number should be a positive integer.
     If not set, SDK will set maximum number of remote calls to 10.
     */
    maximumRemoteCalls?: number;
    /** If automatic function calling is enabled,
     whether to ignore call history to the response.
     If not set, SDK will set ignore_call_history to false,
     and will append the call history to
     GenerateContentResponse.automatic_function_calling_history.
     */
    ignoreCallHistory?: boolean;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
declare class BaseModule {
}

/**
 * Parameters for setting the base URLs for the Gemini API and Vertex AI API.
 */
export declare interface BaseUrlParameters {
    geminiUrl?: string;
    vertexUrl?: string;
}

export declare class Batches extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Create batch job.
     *
     * @param params - The parameters for create batch job request.
     * @return The created batch job.
     *
     * @example
     * ```ts
     * const response = await ai.batches.create({
     *   model: 'gemini-2.0-flash',
     *   src: {gcsUri: 'gs://bucket/path/to/file.jsonl', format: 'jsonl'},
     *   config: {
     *     dest: {gcsUri: 'gs://bucket/path/output/directory', format: 'jsonl'},
     *   }
     * });
     * console.log(response);
     * ```
     */
    create: (params: types.CreateBatchJobParameters) => Promise<types.BatchJob>;
    /**
     * **Experimental** Creates an embedding batch job.
     *
     * @param params - The parameters for create embedding batch job request.
     * @return The created batch job.
     *
     * @example
     * ```ts
     * const response = await ai.batches.createEmbeddings({
     *   model: 'text-embedding-004',
     *   src: {fileName: 'files/my_embedding_input'},
     * });
     * console.log(response);
     * ```
     */
    createEmbeddings: (params: types.CreateEmbeddingsBatchJobParameters) => Promise<types.BatchJob>;
    /**
     * Lists batch job configurations.
     *
     * @param params - The parameters for the list request.
     * @return The paginated results of the list of batch jobs.
     *
     * @example
     * ```ts
     * const batchJobs = await ai.batches.list({config: {'pageSize': 2}});
     * for await (const batchJob of batchJobs) {
     *   console.log(batchJob);
     * }
     * ```
     */
    list: (params?: types.ListBatchJobsParameters) => Promise<Pager<types.BatchJob>>;
    private createInlinedGenerateContentRequest;
    private createInlinedEmbedContentRequest;
    private getGcsUri;
    private getBigqueryUri;
    private formatDestination;
    /**
     * Internal method to create batch job.
     *
     * @param params - The parameters for create batch job request.
     * @return The created batch job.
     *
     */
    private createInternal;
    /**
     * Internal method to create batch job.
     *
     * @param params - The parameters for create batch job request.
     * @return The created batch job.
     *
     */
    private createEmbeddingsInternal;
    /**
     * Gets batch job configurations.
     *
     * @param params - The parameters for the get request.
     * @return The batch job.
     *
     * @example
     * ```ts
     * await ai.batches.get({name: '...'}); // The server-generated resource name.
     * ```
     */
    get(params: types.GetBatchJobParameters): Promise<types.BatchJob>;
    /**
     * Cancels a batch job.
     *
     * @param params - The parameters for the cancel request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.batches.cancel({name: '...'}); // The server-generated resource name.
     * ```
     */
    cancel(params: types.CancelBatchJobParameters): Promise<void>;
    private listInternal;
    /**
     * Deletes a batch job.
     *
     * @param params - The parameters for the delete request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.batches.delete({name: '...'}); // The server-generated resource name.
     * ```
     */
    delete(params: types.DeleteBatchJobParameters): Promise<types.DeleteResourceJob>;
}

/** Config for batches.create return value. */
export declare interface BatchJob {
    /** The resource name of the BatchJob. Output only.".
     */
    name?: string;
    /** The display name of the BatchJob.
     */
    displayName?: string;
    /** The state of the BatchJob.
     */
    state?: JobState;
    /** Output only. Only populated when the job's state is JOB_STATE_FAILED or JOB_STATE_CANCELLED. */
    error?: JobError;
    /** The time when the BatchJob was created.
     */
    createTime?: string;
    /** Output only. Time when the Job for the first time entered the `JOB_STATE_RUNNING` state. */
    startTime?: string;
    /** The time when the BatchJob was completed.
     */
    endTime?: string;
    /** The time when the BatchJob was last updated.
     */
    updateTime?: string;
    /** The name of the model that produces the predictions via the BatchJob.
     */
    model?: string;
    /** Configuration for the input data.
     */
    src?: BatchJobSource;
    /** Configuration for the output data.
     */
    dest?: BatchJobDestination;
}

/** Config for `des` parameter. */
export declare interface BatchJobDestination {
    /** Storage format of the output files. Must be one of:
     'jsonl', 'bigquery'.
     */
    format?: string;
    /** The Google Cloud Storage URI to the output file.
     */
    gcsUri?: string;
    /** The BigQuery URI to the output table.
     */
    bigqueryUri?: string;
    /** The Gemini Developer API's file resource name of the output data
     (e.g. "files/12345"). The file will be a JSONL file with a single response
     per line. The responses will be GenerateContentResponse messages formatted
     as JSON. The responses will be written in the same order as the input
     requests.
     */
    fileName?: string;
    /** The responses to the requests in the batch. Returned when the batch was
     built using inlined requests. The responses will be in the same order as
     the input requests.
     */
    inlinedResponses?: InlinedResponse[];
    /** The responses to the requests in the batch. Returned when the batch was
     built using inlined requests. The responses will be in the same order as
     the input requests.
     */
    inlinedEmbedContentResponses?: InlinedEmbedContentResponse[];
}

export declare type BatchJobDestinationUnion = BatchJobDestination | string;

/** Config for `src` parameter. */
export declare interface BatchJobSource {
    /** Storage format of the input files. Must be one of:
     'jsonl', 'bigquery'.
     */
    format?: string;
    /** The Google Cloud Storage URIs to input files.
     */
    gcsUri?: string[];
    /** The BigQuery URI to input table.
     */
    bigqueryUri?: string;
    /** The Gemini Developer API's file resource name of the input data
     (e.g. "files/12345").
     */
    fileName?: string;
    /** The Gemini Developer API's inlined input data to run batch job.
     */
    inlinedRequests?: InlinedRequest[];
}

export declare type BatchJobSourceUnion = BatchJobSource | InlinedRequest[] | string;

/** Defines the function behavior. Defaults to `BLOCKING`. */
export declare enum Behavior {
    /**
     * This value is unused.
     */
    UNSPECIFIED = "UNSPECIFIED",
    /**
     * If set, the system will wait to receive the function response before continuing the conversation.
     */
    BLOCKING = "BLOCKING",
    /**
     * If set, the system will not wait to receive the function response. Instead, it will attempt to handle function responses as they become available while maintaining the conversation between the user and the model.
     */
    NON_BLOCKING = "NON_BLOCKING"
}

/** Content blob. */
declare interface Blob_2 {
    /** Optional. Display name of the blob. Used to provide a label or filename to distinguish blobs. This field is not currently used in the Gemini GenerateContent calls. */
    displayName?: string;
    /** Required. Raw bytes.
     * @remarks Encoded as base64 string. */
    data?: string;
    /** Required. The IANA standard MIME type of the source data. */
    mimeType?: string;
}
export { Blob_2 as Blob }

export declare type BlobImageUnion = Blob_2;

/** Output only. Blocked reason. */
export declare enum BlockedReason {
    /**
     * Unspecified blocked reason.
     */
    BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED",
    /**
     * Candidates blocked due to safety.
     */
    SAFETY = "SAFETY",
    /**
     * Candidates blocked due to other reason.
     */
    OTHER = "OTHER",
    /**
     * Candidates blocked due to the terms which are included from the terminology blocklist.
     */
    BLOCKLIST = "BLOCKLIST",
    /**
     * Candidates blocked due to prohibited content.
     */
    PROHIBITED_CONTENT = "PROHIBITED_CONTENT",
    /**
     * Candidates blocked due to unsafe image generation content.
     */
    IMAGE_SAFETY = "IMAGE_SAFETY"
}

/** A resource used in LLM queries for users to explicitly specify what to cache. */
export declare interface CachedContent {
    /** The server-generated resource name of the cached content. */
    name?: string;
    /** The user-generated meaningful display name of the cached content. */
    displayName?: string;
    /** The name of the publisher model to use for cached content. */
    model?: string;
    /** Creation time of the cache entry. */
    createTime?: string;
    /** When the cache entry was last updated in UTC time. */
    updateTime?: string;
    /** Expiration time of the cached content. */
    expireTime?: string;
    /** Metadata on the usage of the cached content. */
    usageMetadata?: CachedContentUsageMetadata;
}

/** Metadata on the usage of the cached content. */
export declare interface CachedContentUsageMetadata {
    /** Duration of audio in seconds. */
    audioDurationSeconds?: number;
    /** Number of images. */
    imageCount?: number;
    /** Number of text characters. */
    textCount?: number;
    /** Total number of tokens that the cached content consumes. */
    totalTokenCount?: number;
    /** Duration of video in seconds. */
    videoDurationSeconds?: number;
}

export declare class Caches extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Lists cached content configurations.
     *
     * @param params - The parameters for the list request.
     * @return The paginated results of the list of cached contents.
     *
     * @example
     * ```ts
     * const cachedContents = await ai.caches.list({config: {'pageSize': 2}});
     * for await (const cachedContent of cachedContents) {
     *   console.log(cachedContent);
     * }
     * ```
     */
    list: (params?: types.ListCachedContentsParameters) => Promise<Pager<types.CachedContent>>;
    /**
     * Creates a cached contents resource.
     *
     * @remarks
     * Context caching is only supported for specific models. See [Gemini
     * Developer API reference](https://ai.google.dev/gemini-api/docs/caching?lang=node/context-cac)
     * and [Vertex AI reference](https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview#supported_models)
     * for more information.
     *
     * @param params - The parameters for the create request.
     * @return The created cached content.
     *
     * @example
     * ```ts
     * const contents = ...; // Initialize the content to cache.
     * const response = await ai.caches.create({
     *   model: 'gemini-2.0-flash-001',
     *   config: {
     *    'contents': contents,
     *    'displayName': 'test cache',
     *    'systemInstruction': 'What is the sum of the two pdfs?',
     *    'ttl': '86400s',
     *  }
     * });
     * ```
     */
    create(params: types.CreateCachedContentParameters): Promise<types.CachedContent>;
    /**
     * Gets cached content configurations.
     *
     * @param params - The parameters for the get request.
     * @return The cached content.
     *
     * @example
     * ```ts
     * await ai.caches.get({name: '...'}); // The server-generated resource name.
     * ```
     */
    get(params: types.GetCachedContentParameters): Promise<types.CachedContent>;
    /**
     * Deletes cached content.
     *
     * @param params - The parameters for the delete request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.caches.delete({name: '...'}); // The server-generated resource name.
     * ```
     */
    delete(params: types.DeleteCachedContentParameters): Promise<types.DeleteCachedContentResponse>;
    /**
     * Updates cached content configurations.
     *
     * @param params - The parameters for the update request.
     * @return The updated cached content.
     *
     * @example
     * ```ts
     * const response = await ai.caches.update({
     *   name: '...',  // The server-generated resource name.
     *   config: {'ttl': '7600s'}
     * });
     * ```
     */
    update(params: types.UpdateCachedContentParameters): Promise<types.CachedContent>;
    private listInternal;
}

/**
 * CallableTool is an invokable tool that can be executed with external
 * application (e.g., via Model Context Protocol) or local functions with
 * function calling.
 */
export declare interface CallableTool {
    /**
     * Returns tool that can be called by Gemini.
     */
    tool(): Promise<Tool>;
    /**
     * Executes the callable tool with the given function call arguments and
     * returns the response parts from the tool execution.
     */
    callTool(functionCalls: FunctionCall[]): Promise<Part[]>;
}

/**
 * CallableToolConfig is the configuration for a callable tool.
 */
export declare interface CallableToolConfig {
    /**
     * Specifies the model's behavior after invoking this tool.
     */
    behavior?: Behavior;
    /**
     * Timeout for remote calls in milliseconds. Note this timeout applies only to
     * tool remote calls, and not making HTTP requests to the API. */
    timeout?: number;
}

/** Optional parameters. */
export declare interface CancelBatchJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Config for batches.cancel parameters. */
export declare interface CancelBatchJobParameters {
    /** A fully-qualified BatchJob resource name or ID.
     Example: "projects/.../locations/.../batchPredictionJobs/456"
     or "456" when project and location are initialized in the client.
     */
    name: string;
    /** Optional parameters for the request. */
    config?: CancelBatchJobConfig;
}

/** Optional parameters for tunings.cancel method. */
export declare interface CancelTuningJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for the cancel method. */
export declare interface CancelTuningJobParameters {
    /** The resource name of the tuning job. */
    name: string;
    /** Optional parameters for the request. */
    config?: CancelTuningJobConfig;
}

/** A response candidate generated from the model. */
export declare interface Candidate {
    /** Contains the multi-part content of the response.
     */
    content?: Content;
    /** Source attribution of the generated content.
     */
    citationMetadata?: CitationMetadata;
    /** Describes the reason the model stopped generating tokens.
     */
    finishMessage?: string;
    /** Number of tokens for this candidate.
     */
    tokenCount?: number;
    /** The reason why the model stopped generating tokens.
     If empty, the model has not stopped generating the tokens.
     */
    finishReason?: FinishReason;
    /** Metadata related to url context retrieval tool. */
    urlContextMetadata?: UrlContextMetadata;
    /** Output only. Average log probability score of the candidate. */
    avgLogprobs?: number;
    /** Output only. Metadata specifies sources used to ground generated content. */
    groundingMetadata?: GroundingMetadata;
    /** Output only. Index of the candidate. */
    index?: number;
    /** Output only. Log-likelihood scores for the response tokens and top tokens */
    logprobsResult?: LogprobsResult;
    /** Output only. List of ratings for the safety of a response candidate. There is at most one rating per category. */
    safetyRatings?: SafetyRating[];
}

/**
 * Chat session that enables sending messages to the model with previous
 * conversation context.
 *
 * @remarks
 * The session maintains all the turns between user and model.
 */
export declare class Chat {
    private readonly apiClient;
    private readonly modelsModule;
    private readonly model;
    private readonly config;
    private history;
    private sendPromise;
    constructor(apiClient: ApiClient, modelsModule: Models, model: string, config?: types.GenerateContentConfig, history?: types.Content[]);
    /**
     * Sends a message to the model and returns the response.
     *
     * @remarks
     * This method will wait for the previous message to be processed before
     * sending the next message.
     *
     * @see {@link Chat#sendMessageStream} for streaming method.
     * @param params - parameters for sending messages within a chat session.
     * @returns The model's response.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
     * const response = await chat.sendMessage({
     *   message: 'Why is the sky blue?'
     * });
     * console.log(response.text);
     * ```
     */
    sendMessage(params: types.SendMessageParameters): Promise<types.GenerateContentResponse>;
    /**
     * Sends a message to the model and returns the response in chunks.
     *
     * @remarks
     * This method will wait for the previous message to be processed before
     * sending the next message.
     *
     * @see {@link Chat#sendMessage} for non-streaming method.
     * @param params - parameters for sending the message.
     * @return The model's response.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
     * const response = await chat.sendMessageStream({
     *   message: 'Why is the sky blue?'
     * });
     * for await (const chunk of response) {
     *   console.log(chunk.text);
     * }
     * ```
     */
    sendMessageStream(params: types.SendMessageParameters): Promise<AsyncGenerator<types.GenerateContentResponse>>;
    /**
     * Returns the chat history.
     *
     * @remarks
     * The history is a list of contents alternating between user and model.
     *
     * There are two types of history:
     * - The `curated history` contains only the valid turns between user and
     * model, which will be included in the subsequent requests sent to the model.
     * - The `comprehensive history` contains all turns, including invalid or
     *   empty model outputs, providing a complete record of the history.
     *
     * The history is updated after receiving the response from the model,
     * for streaming response, it means receiving the last chunk of the response.
     *
     * The `comprehensive history` is returned by default. To get the `curated
     * history`, set the `curated` parameter to `true`.
     *
     * @param curated - whether to return the curated history or the comprehensive
     *     history.
     * @return History contents alternating between user and model for the entire
     *     chat session.
     */
    getHistory(curated?: boolean): types.Content[];
    private processStreamResponse;
    private recordHistory;
}

/**
 * A utility class to create a chat session.
 */
export declare class Chats {
    private readonly modelsModule;
    private readonly apiClient;
    constructor(modelsModule: Models, apiClient: ApiClient);
    /**
     * Creates a new chat session.
     *
     * @remarks
     * The config in the params will be used for all requests within the chat
     * session unless overridden by a per-request `config` in
     * @see {@link types.SendMessageParameters#config}.
     *
     * @param params - Parameters for creating a chat session.
     * @returns A new chat session.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({
     *   model: 'gemini-2.0-flash'
     *   config: {
     *     temperature: 0.5,
     *     maxOutputTokens: 1024,
     *   }
     * });
     * ```
     */
    create(params: types.CreateChatParameters): Chat;
}

/** Describes the machine learning model version checkpoint. */
export declare interface Checkpoint {
    /** The ID of the checkpoint.
     */
    checkpointId?: string;
    /** The epoch of the checkpoint.
     */
    epoch?: string;
    /** The step of the checkpoint.
     */
    step?: string;
}

/** Source attributions for content. */
export declare interface Citation {
    /** Output only. End index into the content. */
    endIndex?: number;
    /** Output only. License of the attribution. */
    license?: string;
    /** Output only. Publication date of the attribution. */
    publicationDate?: GoogleTypeDate;
    /** Output only. Start index into the content. */
    startIndex?: number;
    /** Output only. Title of the attribution. */
    title?: string;
    /** Output only. Url reference of the attribution. */
    uri?: string;
}

/** Citation information when the model quotes another source. */
export declare interface CitationMetadata {
    /** Contains citation information when the model directly quotes, at
     length, from another source. Can include traditional websites and code
     repositories.
     */
    citations?: Citation[];
}

/** Result of executing the [ExecutableCode]. Only generated when using the [CodeExecution] tool, and always follows a `part` containing the [ExecutableCode]. */
export declare interface CodeExecutionResult {
    /** Required. Outcome of the code execution. */
    outcome?: Outcome;
    /** Optional. Contains stdout when code execution is successful, stderr or other description otherwise. */
    output?: string;
}

/** Optional parameters for computing tokens. */
export declare interface ComputeTokensConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for computing tokens. */
export declare interface ComputeTokensParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** Input content. */
    contents: ContentListUnion;
    /** Optional parameters for the request.
     */
    config?: ComputeTokensConfig;
}

/** Response for computing tokens. */
export declare class ComputeTokensResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Lists of tokens info from the input. A ComputeTokensRequest could have multiple instances with a prompt in each instance. We also need to return lists of tokens info for the request with multiple instances. */
    tokensInfo?: TokensInfo[];
}

/** Contains the multi-part content of a message. */
export declare interface Content {
    /** List of parts that constitute a single message. Each part may have
     a different IANA MIME type. */
    parts?: Part[];
    /** Optional. The producer of the content. Must be either 'user' or
     'model'. Useful to set for multi-turn conversations, otherwise can be
     empty. If role is not specified, SDK will determine the role. */
    role?: string;
}

/** The embedding generated from an input content. */
export declare interface ContentEmbedding {
    /** A list of floats representing an embedding.
     */
    values?: number[];
    /** Vertex API only. Statistics of the input text associated with this
     embedding.
     */
    statistics?: ContentEmbeddingStatistics;
}

/** Statistics of the input text associated with the result of content embedding. */
export declare interface ContentEmbeddingStatistics {
    /** Vertex API only. If the input text was truncated due to having
     a length longer than the allowed maximum input.
     */
    truncated?: boolean;
    /** Vertex API only. Number of tokens of the input text.
     */
    tokenCount?: number;
}

export declare type ContentListUnion = Content | Content[] | PartUnion | PartUnion[];

export declare type ContentUnion = Content | PartUnion[] | PartUnion;

/** Enables context window compression -- mechanism managing model context window so it does not exceed given length. */
export declare interface ContextWindowCompressionConfig {
    /** Number of tokens (before running turn) that triggers context window compression mechanism. */
    triggerTokens?: string;
    /** Sliding window compression mechanism. */
    slidingWindow?: SlidingWindow;
}

/** Configuration for a Control reference image. */
export declare interface ControlReferenceConfig {
    /** The type of control reference image to use. */
    controlType?: ControlReferenceType;
    /** Defaults to False. When set to True, the control image will be
     computed by the model based on the control type. When set to False,
     the control image must be provided by the user. */
    enableControlImageComputation?: boolean;
}

/** A control reference image.

 The image of the control reference image is either a control image provided
 by the user, or a regular image which the backend will use to generate a
 control image of. In the case of the latter, the
 enable_control_image_computation field in the config should be set to True.

 A control image is an image that represents a sketch image of areas for the
 model to fill in based on the prompt.
 */
export declare class ControlReferenceImage {
    /** The reference image for the editing operation. */
    referenceImage?: Image_2;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Configuration for the control reference image. */
    config?: ControlReferenceConfig;
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI(): ReferenceImageAPIInternal;
}

/** Enum representing the control type of a control reference image. */
export declare enum ControlReferenceType {
    CONTROL_TYPE_DEFAULT = "CONTROL_TYPE_DEFAULT",
    CONTROL_TYPE_CANNY = "CONTROL_TYPE_CANNY",
    CONTROL_TYPE_SCRIBBLE = "CONTROL_TYPE_SCRIBBLE",
    CONTROL_TYPE_FACE_MESH = "CONTROL_TYPE_FACE_MESH"
}

/** Config for the count_tokens method. */
export declare interface CountTokensConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Instructions for the model to steer it toward better performance.
     */
    systemInstruction?: ContentUnion;
    /** Code that enables the system to interact with external systems to
     perform an action outside of the knowledge and scope of the model.
     */
    tools?: Tool[];
    /** Configuration that the model uses to generate the response. Not
     supported by the Gemini Developer API.
     */
    generationConfig?: GenerationConfig;
}

/** Parameters for counting tokens. */
export declare interface CountTokensParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** Input content. */
    contents: ContentListUnion;
    /** Configuration for counting tokens. */
    config?: CountTokensConfig;
}

/** Response for counting tokens. */
export declare class CountTokensResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Total number of tokens. */
    totalTokens?: number;
    /** Number of tokens in the cached part of the prompt (the cached content). */
    cachedContentTokenCount?: number;
}

/** Optional parameters. */
export declare interface CreateAuthTokenConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** An optional time after which, when using the resulting token,
     messages in Live API sessions will be rejected. (Gemini may
     preemptively close the session after this time.)

     If not set then this defaults to 30 minutes in the future. If set, this
     value must be less than 20 hours in the future. */
    expireTime?: string;
    /** The time after which new Live API sessions using the token
     resulting from this request will be rejected.

     If not set this defaults to 60 seconds in the future. If set, this value
     must be less than 20 hours in the future. */
    newSessionExpireTime?: string;
    /** The number of times the token can be used. If this value is zero
     then no limit is applied. Default is 1. Resuming a Live API session does
     not count as a use. */
    uses?: number;
    /** Configuration specific to Live API connections created using this token. */
    liveConnectConstraints?: LiveConnectConstraints;
    /** Additional fields to lock in the effective LiveConnectParameters. */
    lockAdditionalFields?: string[];
}

/** Config for auth_tokens.create parameters. */
export declare interface CreateAuthTokenParameters {
    /** Optional parameters for the request. */
    config?: CreateAuthTokenConfig;
}

/** Config for optional parameters. */
export declare interface CreateBatchJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The user-defined name of this BatchJob.
     */
    displayName?: string;
    /** GCS or BigQuery URI prefix for the output predictions. Example:
     "gs://path/to/output/data" or "bq://projectId.bqDatasetId.bqTableId".
     */
    dest?: BatchJobDestinationUnion;
}

/** Config for batches.create parameters. */
export declare interface CreateBatchJobParameters {
    /** The name of the model to produces the predictions via the BatchJob.
     */
    model?: string;
    /** GCS URI(-s) or BigQuery URI to your input data to run batch job.
     Example: "gs://path/to/input/data" or "bq://projectId.bqDatasetId.bqTableId".
     */
    src: BatchJobSourceUnion;
    /** Optional parameters for creating a BatchJob.
     */
    config?: CreateBatchJobConfig;
}

/** Optional configuration for cached content creation. */
export declare interface CreateCachedContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The TTL for this resource. The expiration time is computed: now + TTL. It is a duration string, with up to nine fractional digits, terminated by 's'. Example: "3.5s". */
    ttl?: string;
    /** Timestamp of when this resource is considered expired. Uses RFC 3339 format, Example: 2014-10-02T15:01:23Z. */
    expireTime?: string;
    /** The user-generated meaningful display name of the cached content.
     */
    displayName?: string;
    /** The content to cache.
     */
    contents?: ContentListUnion;
    /** Developer set system instruction.
     */
    systemInstruction?: ContentUnion;
    /** A list of `Tools` the model may use to generate the next response.
     */
    tools?: Tool[];
    /** Configuration for the tools to use. This config is shared for all tools.
     */
    toolConfig?: ToolConfig;
    /** The Cloud KMS resource identifier of the customer managed
     encryption key used to protect a resource.
     The key needs to be in the same region as where the compute resource is
     created. See
     https://cloud.google.com/vertex-ai/docs/general/cmek for more
     details. If this is set, then all created CachedContent objects
     will be encrypted with the provided encryption key.
     Allowed formats: projects/{project}/locations/{location}/keyRings/{key_ring}/cryptoKeys/{crypto_key}
     */
    kmsKeyName?: string;
}

/** Parameters for caches.create method. */
export declare interface CreateCachedContentParameters {
    /** ID of the model to use. Example: gemini-2.0-flash */
    model: string;
    /** Configuration that contains optional parameters.
     */
    config?: CreateCachedContentConfig;
}

/** Parameters for initializing a new chat session.

 These parameters are used when creating a chat session with the
 `chats.create()` method.
 */
export declare interface CreateChatParameters {
    /** The name of the model to use for the chat session.

     For example: 'gemini-2.0-flash', 'gemini-2.0-flash-lite', etc. See Gemini API
     docs to find the available models.
     */
    model: string;
    /** Config for the entire chat session.

     This config applies to all requests within the session
     unless overridden by a per-request `config` in `SendMessageParameters`.
     */
    config?: GenerateContentConfig;
    /** The initial conversation history for the chat session.

     This allows you to start the chat with a pre-existing history. The history
     must be a list of `Content` alternating between 'user' and 'model' roles.
     It should start with a 'user' message.
     */
    history?: Content[];
}

/** Config for optional parameters. */
export declare interface CreateEmbeddingsBatchJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The user-defined name of this BatchJob.
     */
    displayName?: string;
}

/** Config for batches.create parameters. */
export declare interface CreateEmbeddingsBatchJobParameters {
    /** The name of the model to produces the predictions via the BatchJob.
     */
    model?: string;
    /** input data to run batch job".
     */
    src: EmbeddingsBatchJobSource;
    /** Optional parameters for creating a BatchJob.
     */
    config?: CreateEmbeddingsBatchJobConfig;
}

/** Used to override the default configuration. */
export declare interface CreateFileConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Generates the parameters for the private _create method. */
export declare interface CreateFileParameters {
    /** The file to be uploaded.
     mime_type: (Required) The MIME type of the file. Must be provided.
     name: (Optional) The name of the file in the destination (e.g.
     'files/sample-image').
     display_name: (Optional) The display name of the file.
     */
    file: File_2;
    /** Used to override the default configuration. */
    config?: CreateFileConfig;
}

/** Response for the create file method. */
export declare class CreateFileResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
}

/**
 * Creates a `Content` object with a model role from a `PartListUnion` object or `string`.
 */
export declare function createModelContent(partOrString: PartListUnion | string): Content;

/**
 * Creates a `Part` object from a `base64` encoded `string`.
 */
export declare function createPartFromBase64(data: string, mimeType: string): Part;

/**
 * Creates a `Part` object from the `outcome` and `output` of a `CodeExecutionResult` object.
 */
export declare function createPartFromCodeExecutionResult(outcome: Outcome, output: string): Part;

/**
 * Creates a `Part` object from the `code` and `language` of an `ExecutableCode` object.
 */
export declare function createPartFromExecutableCode(code: string, language: Language): Part;

/**
 * Creates a `Part` object from a `FunctionCall` object.
 */
export declare function createPartFromFunctionCall(name: string, args: Record<string, unknown>): Part;

/**
 * Creates a `Part` object from a `FunctionResponse` object.
 */
export declare function createPartFromFunctionResponse(id: string, name: string, response: Record<string, unknown>): Part;

/**
 * Creates a `Part` object from a `text` string.
 */
export declare function createPartFromText(text: string): Part;

/**
 * Creates a `Part` object from a `URI` string.
 */
export declare function createPartFromUri(uri: string, mimeType: string): Part;

/** Supervised fine-tuning job creation request - optional fields. */
export declare interface CreateTuningJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Cloud Storage path to file containing training dataset for tuning. The dataset must be formatted as a JSONL file. */
    validationDataset?: TuningValidationDataset;
    /** The display name of the tuned Model. The name can be up to 128 characters long and can consist of any UTF-8 characters. */
    tunedModelDisplayName?: string;
    /** The description of the TuningJob */
    description?: string;
    /** Number of complete passes the model makes over the entire training dataset during training. */
    epochCount?: number;
    /** Multiplier for adjusting the default learning rate. */
    learningRateMultiplier?: number;
    /** If set to true, disable intermediate checkpoints for SFT and only the last checkpoint will be exported. Otherwise, enable intermediate checkpoints for SFT. */
    exportLastCheckpointOnly?: boolean;
    /** The optional checkpoint id of the pre-tuned model to use for tuning, if applicable. */
    preTunedModelCheckpointId?: string;
    /** Adapter size for tuning. */
    adapterSize?: AdapterSize;
    /** The batch size hyperparameter for tuning. If not set, a default of 4 or 16 will be used based on the number of training examples. */
    batchSize?: number;
    /** The learning rate hyperparameter for tuning. If not set, a default of 0.001 or 0.0002 will be calculated based on the number of training examples. */
    learningRate?: number;
    /** Optional. The labels with user-defined metadata to organize TuningJob and generated resources such as Model and Endpoint. Label keys and values can be no longer than 64 characters (Unicode codepoints), can only contain lowercase letters, numeric characters, underscores and dashes. International characters are allowed. See https://goo.gl/xmQnxf for more information and examples of labels. */
    labels?: Record<string, string>;
}

/** Supervised fine-tuning job creation parameters - optional fields. */
export declare interface CreateTuningJobParameters {
    /** The base model that is being tuned, e.g., "gemini-2.5-flash". */
    baseModel: string;
    /** Cloud Storage path to file containing training dataset for tuning. The dataset must be formatted as a JSONL file. */
    trainingDataset: TuningDataset;
    /** Configuration for the tuning job. */
    config?: CreateTuningJobConfig;
}

/** Supervised fine-tuning job creation parameters - optional fields. */
export declare interface CreateTuningJobParametersPrivate {
    /** The base model that is being tuned, e.g., "gemini-2.5-flash". */
    baseModel?: string;
    /** The PreTunedModel that is being tuned. */
    preTunedModel?: PreTunedModel;
    /** Cloud Storage path to file containing training dataset for tuning. The dataset must be formatted as a JSONL file. */
    trainingDataset: TuningDataset;
    /** Configuration for the tuning job. */
    config?: CreateTuningJobConfig;
}

/**
 * Creates a `Content` object with a user role from a `PartListUnion` object or `string`.
 */
export declare function createUserContent(partOrString: PartListUnion | string): Content;

/** Distribution computed over a tuning dataset. */
export declare interface DatasetDistribution {
    /** Output only. Defines the histogram bucket. */
    buckets?: DatasetDistributionDistributionBucket[];
    /** Output only. The maximum of the population values. */
    max?: number;
    /** Output only. The arithmetic mean of the values in the population. */
    mean?: number;
    /** Output only. The median of the values in the population. */
    median?: number;
    /** Output only. The minimum of the population values. */
    min?: number;
    /** Output only. The 5th percentile of the values in the population. */
    p5?: number;
    /** Output only. The 95th percentile of the values in the population. */
    p95?: number;
    /** Output only. Sum of a given population of values. */
    sum?: number;
}

/** Dataset bucket used to create a histogram for the distribution given a population of values. */
export declare interface DatasetDistributionDistributionBucket {
    /** Output only. Number of values in the bucket. */
    count?: string;
    /** Output only. Left bound of the bucket. */
    left?: number;
    /** Output only. Right bound of the bucket. */
    right?: number;
}

/** Statistics computed over a tuning dataset. */
export declare interface DatasetStats {
    /** Output only. Number of billable characters in the tuning dataset. */
    totalBillableCharacterCount?: string;
    /** Output only. Number of tuning characters in the tuning dataset. */
    totalTuningCharacterCount?: string;
    /** Output only. Number of examples in the tuning dataset. */
    tuningDatasetExampleCount?: string;
    /** Output only. Number of tuning steps for this Tuning Job. */
    tuningStepCount?: string;
    /** Output only. Sample user messages in the training dataset uri. */
    userDatasetExamples?: Content[];
    /** Output only. Dataset distributions for the user input tokens. */
    userInputTokenDistribution?: DatasetDistribution;
    /** Output only. Dataset distributions for the messages per example. */
    userMessagePerExampleDistribution?: DatasetDistribution;
    /** Output only. Dataset distributions for the user output tokens. */
    userOutputTokenDistribution?: DatasetDistribution;
}

/** Optional parameters for models.get method. */
export declare interface DeleteBatchJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Config for batches.delete parameters. */
export declare interface DeleteBatchJobParameters {
    /** A fully-qualified BatchJob resource name or ID.
     Example: "projects/.../locations/.../batchPredictionJobs/456"
     or "456" when project and location are initialized in the client.
     */
    name: string;
    /** Optional parameters for the request. */
    config?: DeleteBatchJobConfig;
}

/** Optional parameters for caches.delete method. */
export declare interface DeleteCachedContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for caches.delete method. */
export declare interface DeleteCachedContentParameters {
    /** The server-generated resource name of the cached content.
     */
    name: string;
    /** Optional parameters for the request.
     */
    config?: DeleteCachedContentConfig;
}

/** Empty response for caches.delete method. */
export declare class DeleteCachedContentResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
}

/** Used to override the default configuration. */
export declare interface DeleteFileConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Generates the parameters for the get method. */
export declare interface DeleteFileParameters {
    /** The name identifier for the file to be deleted. */
    name: string;
    /** Used to override the default configuration. */
    config?: DeleteFileConfig;
}

/** Response for the delete file method. */
export declare class DeleteFileResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
}

/** Configuration for deleting a tuned model. */
export declare interface DeleteModelConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for deleting a tuned model. */
export declare interface DeleteModelParameters {
    model: string;
    /** Optional parameters for the request. */
    config?: DeleteModelConfig;
}

export declare class DeleteModelResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
}

/** The return value of delete operation. */
export declare interface DeleteResourceJob {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    name?: string;
    done?: boolean;
    error?: JobError;
}

/** Statistics computed for datasets used for distillation. */
export declare interface DistillationDataStats {
    /** Output only. Statistics computed for the training dataset. */
    trainingDatasetStats?: DatasetStats;
}

export declare type DownloadableFileUnion = string | File_2 | GeneratedVideo | Video;

declare interface Downloader {
    /**
     * Downloads a file to the given location.
     *
     * @param params The parameters for downloading the file.
     * @param apiClient The ApiClient to use for uploading.
     * @return A Promises that resolves when the download is complete.
     */
    download(params: DownloadFileParameters, apiClient: ApiClient): Promise<void>;
}

/** Used to override the default configuration. */
export declare interface DownloadFileConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters used to download a file. */
export declare interface DownloadFileParameters {
    /** The file to download. It can be a file name, a file object or a generated video. */
    file: DownloadableFileUnion;
    /** Location where the file should be downloaded to. */
    downloadPath: string;
    /** Configuration to for the download operation. */
    config?: DownloadFileConfig;
}

/** Describes the options to customize dynamic retrieval. */
export declare interface DynamicRetrievalConfig {
    /** The mode of the predictor to be used in dynamic retrieval. */
    mode?: DynamicRetrievalConfigMode;
    /** Optional. The threshold to be used in dynamic retrieval. If not set, a system default value is used. */
    dynamicThreshold?: number;
}

/** Config for the dynamic retrieval config mode. */
export declare enum DynamicRetrievalConfigMode {
    /**
     * Always trigger retrieval.
     */
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    /**
     * Run retrieval only when system decides it is necessary.
     */
    MODE_DYNAMIC = "MODE_DYNAMIC"
}

/** Configuration for editing an image. */
export declare interface EditImageConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Cloud Storage URI used to store the generated images. */
    outputGcsUri?: string;
    /** Description of what to discourage in the generated images. */
    negativePrompt?: string;
    /** Number of images to generate. */
    numberOfImages?: number;
    /** Aspect ratio of the generated images. Supported values are
     "1:1", "3:4", "4:3", "9:16", and "16:9". */
    aspectRatio?: string;
    /** Controls how much the model adheres to the text prompt. Large
     values increase output and prompt alignment, but may compromise image
     quality. */
    guidanceScale?: number;
    /** Random seed for image generation. This is not available when
     ``add_watermark`` is set to true. */
    seed?: number;
    /** Filter level for safety filtering. */
    safetyFilterLevel?: SafetyFilterLevel;
    /** Allows generation of people by the model. */
    personGeneration?: PersonGeneration;
    /** Whether to report the safety scores of each generated image and
     the positive prompt in the response. */
    includeSafetyAttributes?: boolean;
    /** Whether to include the Responsible AI filter reason if the image
     is filtered out of the response. */
    includeRaiReason?: boolean;
    /** Language of the text in the prompt. */
    language?: ImagePromptLanguage;
    /** MIME type of the generated image. */
    outputMimeType?: string;
    /** Compression quality of the generated image (for ``image/jpeg``
     only). */
    outputCompressionQuality?: number;
    /** Whether to add a watermark to the generated images. */
    addWatermark?: boolean;
    /** Describes the editing mode for the request. */
    editMode?: EditMode;
    /** The number of sampling steps. A higher value has better image
     quality, while a lower value has better latency. */
    baseSteps?: number;
}

/** Parameters for the request to edit an image. */
export declare interface EditImageParameters {
    /** The model to use. */
    model: string;
    /** A text description of the edit to apply to the image. */
    prompt: string;
    /** The reference images for Imagen 3 editing. */
    referenceImages: ReferenceImage[];
    /** Configuration for editing. */
    config?: EditImageConfig;
}

/** Response for the request to edit an image. */
export declare class EditImageResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Generated images. */
    generatedImages?: GeneratedImage[];
}

/** Enum representing the editing mode. */
export declare enum EditMode {
    EDIT_MODE_DEFAULT = "EDIT_MODE_DEFAULT",
    EDIT_MODE_INPAINT_REMOVAL = "EDIT_MODE_INPAINT_REMOVAL",
    EDIT_MODE_INPAINT_INSERTION = "EDIT_MODE_INPAINT_INSERTION",
    EDIT_MODE_OUTPAINT = "EDIT_MODE_OUTPAINT",
    EDIT_MODE_CONTROLLED_EDITING = "EDIT_MODE_CONTROLLED_EDITING",
    EDIT_MODE_STYLE = "EDIT_MODE_STYLE",
    EDIT_MODE_BGSWAP = "EDIT_MODE_BGSWAP",
    EDIT_MODE_PRODUCT_IMAGE = "EDIT_MODE_PRODUCT_IMAGE"
}

/** Parameters for the embed_content method. */
export declare interface EmbedContentBatch {
    /** The content to embed. Only the `parts.text` fields will be counted.
     */
    contents?: ContentListUnion;
    /** Configuration that contains optional parameters.
     */
    config?: EmbedContentConfig;
}

/** Optional parameters for the embed_content method. */
export declare interface EmbedContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Type of task for which the embedding will be used.
     */
    taskType?: string;
    /** Title for the text. Only applicable when TaskType is
     `RETRIEVAL_DOCUMENT`.
     */
    title?: string;
    /** Reduced dimension for the output embedding. If set,
     excessive values in the output embedding are truncated from the end.
     Supported by newer models since 2024 only. You cannot set this value if
     using the earlier model (`models/embedding-001`).
     */
    outputDimensionality?: number;
    /** Vertex API only. The MIME type of the input.
     */
    mimeType?: string;
    /** Vertex API only. Whether to silently truncate inputs longer than
     the max sequence length. If this option is set to false, oversized inputs
     will lead to an INVALID_ARGUMENT error, similar to other text APIs.
     */
    autoTruncate?: boolean;
}

/** Request-level metadata for the Vertex Embed Content API. */
export declare interface EmbedContentMetadata {
    /** Vertex API only. The total number of billable characters included
     in the request.
     */
    billableCharacterCount?: number;
}

/** Parameters for the embed_content method. */
export declare interface EmbedContentParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** The content to embed. Only the `parts.text` fields will be counted.
     */
    contents: ContentListUnion;
    /** Configuration that contains optional parameters.
     */
    config?: EmbedContentConfig;
}

/** Response for the embed_content method. */
export declare class EmbedContentResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** The embeddings for each request, in the same order as provided in
     the batch request.
     */
    embeddings?: ContentEmbedding[];
    /** Vertex API only. Metadata about the request.
     */
    metadata?: EmbedContentMetadata;
}

export declare interface EmbeddingsBatchJobSource {
    /** The Gemini Developer API's file resource name of the input data
     (e.g. "files/12345").
     */
    fileName?: string;
    /** The Gemini Developer API's inlined input data to run batch job.
     */
    inlinedRequests?: EmbedContentBatch;
}

/** Represents a customer-managed encryption key spec that can be applied to a top-level resource. */
export declare interface EncryptionSpec {
    /** Required. The Cloud KMS resource identifier of the customer managed encryption key used to protect a resource. Has the form: `projects/my-project/locations/my-region/keyRings/my-kr/cryptoKeys/my-key`. The key needs to be in the same region as where the compute resource is created. */
    kmsKeyName?: string;
}

/** An endpoint where you deploy models. */
export declare interface Endpoint {
    /** Resource name of the endpoint. */
    name?: string;
    /** ID of the model that's deployed to the endpoint. */
    deployedModelId?: string;
}

/** End of speech sensitivity. */
export declare enum EndSensitivity {
    /**
     * The default is END_SENSITIVITY_LOW.
     */
    END_SENSITIVITY_UNSPECIFIED = "END_SENSITIVITY_UNSPECIFIED",
    /**
     * Automatic detection ends speech more often.
     */
    END_SENSITIVITY_HIGH = "END_SENSITIVITY_HIGH",
    /**
     * Automatic detection ends speech less often.
     */
    END_SENSITIVITY_LOW = "END_SENSITIVITY_LOW"
}

/** Tool to search public web data, powered by Vertex AI Search and Sec4 compliance. */
export declare interface EnterpriseWebSearch {
    /** Optional. List of domains to be excluded from the search results. The default limit is 2000 domains. */
    excludeDomains?: string[];
}

/** An entity representing the segmented area. */
export declare interface EntityLabel {
    /** The label of the segmented entity. */
    label?: string;
    /** The confidence score of the detected label. */
    score?: number;
}

/** The environment being operated. */
export declare enum Environment {
    /**
     * Defaults to browser.
     */
    ENVIRONMENT_UNSPECIFIED = "ENVIRONMENT_UNSPECIFIED",
    /**
     * Operates in a web browser.
     */
    ENVIRONMENT_BROWSER = "ENVIRONMENT_BROWSER"
}

/** Code generated by the model that is meant to be executed, and the result returned to the model. Generated when using the [CodeExecution] tool, in which the code will be automatically executed, and a corresponding [CodeExecutionResult] will also be generated. */
export declare interface ExecutableCode {
    /** Required. The code to be executed. */
    code?: string;
    /** Required. Programming language of the `code`. */
    language?: Language;
}

/** Retrieve from data source powered by external API for grounding. The external API is not owned by Google, but need to follow the pre-defined API spec. */
export declare interface ExternalApi {
    /** The authentication config to access the API. Deprecated. Please use auth_config instead. */
    apiAuth?: ApiAuth;
    /** The API spec that the external API implements. */
    apiSpec?: ApiSpec;
    /** The authentication config to access the API. */
    authConfig?: AuthConfig;
    /** Parameters for the elastic search API. */
    elasticSearchParams?: ExternalApiElasticSearchParams;
    /** The endpoint of the external API. The system will call the API at this endpoint to retrieve the data for grounding. Example: https://acme.com:443/search */
    endpoint?: string;
    /** Parameters for the simple search API. */
    simpleSearchParams?: ExternalApiSimpleSearchParams;
}

/** The search parameters to use for the ELASTIC_SEARCH spec. */
export declare interface ExternalApiElasticSearchParams {
    /** The ElasticSearch index to use. */
    index?: string;
    /** Optional. Number of hits (chunks) to request. When specified, it is passed to Elasticsearch as the `num_hits` param. */
    numHits?: number;
    /** The ElasticSearch search template to use. */
    searchTemplate?: string;
}

/** The search parameters to use for SIMPLE_SEARCH spec. */
export declare interface ExternalApiSimpleSearchParams {
}

/** Options for feature selection preference. */
export declare enum FeatureSelectionPreference {
    FEATURE_SELECTION_PREFERENCE_UNSPECIFIED = "FEATURE_SELECTION_PREFERENCE_UNSPECIFIED",
    PRIORITIZE_QUALITY = "PRIORITIZE_QUALITY",
    BALANCED = "BALANCED",
    PRIORITIZE_COST = "PRIORITIZE_COST"
}

export declare interface FetchPredictOperationConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for the fetchPredictOperation method. */
export declare interface FetchPredictOperationParameters {
    /** The server-assigned name for the operation. */
    operationName: string;
    resourceName: string;
    /** Used to override the default configuration. */
    config?: FetchPredictOperationConfig;
}

/** A file uploaded to the API. */
declare interface File_2 {
    /** The `File` resource name. The ID (name excluding the "files/" prefix) can contain up to 40 characters that are lowercase alphanumeric or dashes (-). The ID cannot start or end with a dash. If the name is empty on create, a unique name will be generated. Example: `files/123-456` */
    name?: string;
    /** Optional. The human-readable display name for the `File`. The display name must be no more than 512 characters in length, including spaces. Example: 'Welcome Image' */
    displayName?: string;
    /** Output only. MIME type of the file. */
    mimeType?: string;
    /** Output only. Size of the file in bytes. */
    sizeBytes?: string;
    /** Output only. The timestamp of when the `File` was created. */
    createTime?: string;
    /** Output only. The timestamp of when the `File` will be deleted. Only set if the `File` is scheduled to expire. */
    expirationTime?: string;
    /** Output only. The timestamp of when the `File` was last updated. */
    updateTime?: string;
    /** Output only. SHA-256 hash of the uploaded bytes. The hash value is encoded in base64 format. */
    sha256Hash?: string;
    /** Output only. The URI of the `File`. */
    uri?: string;
    /** Output only. The URI of the `File`, only set for downloadable (generated) files. */
    downloadUri?: string;
    /** Output only. Processing state of the File. */
    state?: FileState;
    /** Output only. The source of the `File`. */
    source?: FileSource;
    /** Output only. Metadata for a video. */
    videoMetadata?: Record<string, unknown>;
    /** Output only. Error status if File processing failed. */
    error?: FileStatus;
}
export { File_2 as File }

/** URI based data. */
export declare interface FileData {
    /** Optional. Display name of the file data. Used to provide a label or filename to distinguish file datas. It is not currently used in the Gemini GenerateContent calls. */
    displayName?: string;
    /** Required. URI. */
    fileUri?: string;
    /** Required. The IANA standard MIME type of the source data. */
    mimeType?: string;
}

export declare class Files extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Lists all current project files from the service.
     *
     * @param params - The parameters for the list request
     * @return The paginated results of the list of files
     *
     * @example
     * The following code prints the names of all files from the service, the
     * size of each page is 10.
     *
     * ```ts
     * const listResponse = await ai.files.list({config: {'pageSize': 10}});
     * for await (const file of listResponse) {
     *   console.log(file.name);
     * }
     * ```
     */
    list: (params?: types.ListFilesParameters) => Promise<Pager<types.File>>;
    /**
     * Uploads a file asynchronously to the Gemini API.
     * This method is not available in Vertex AI.
     * Supported upload sources:
     * - Node.js: File path (string) or Blob object.
     * - Browser: Blob object (e.g., File).
     *
     * @remarks
     * The `mimeType` can be specified in the `config` parameter. If omitted:
     *  - For file path (string) inputs, the `mimeType` will be inferred from the
     *     file extension.
     *  - For Blob object inputs, the `mimeType` will be set to the Blob's `type`
     *     property.
     * Somex eamples for file extension to mimeType mapping:
     * .txt -> text/plain
     * .json -> application/json
     * .jpg  -> image/jpeg
     * .png -> image/png
     * .mp3 -> audio/mpeg
     * .mp4 -> video/mp4
     *
     * This section can contain multiple paragraphs and code examples.
     *
     * @param params - Optional parameters specified in the
     *        `types.UploadFileParameters` interface.
     *         @see {@link types.UploadFileParameters#config} for the optional
     *         config in the parameters.
     * @return A promise that resolves to a `types.File` object.
     * @throws An error if called on a Vertex AI client.
     * @throws An error if the `mimeType` is not provided and can not be inferred,
     * the `mimeType` can be provided in the `params.config` parameter.
     * @throws An error occurs if a suitable upload location cannot be established.
     *
     * @example
     * The following code uploads a file to Gemini API.
     *
     * ```ts
     * const file = await ai.files.upload({file: 'file.txt', config: {
     *   mimeType: 'text/plain',
     * }});
     * console.log(file.name);
     * ```
     */
    upload(params: types.UploadFileParameters): Promise<types.File>;
    /**
     * Downloads a remotely stored file asynchronously to a location specified in
     * the `params` object. This method only works on Node environment, to
     * download files in the browser, use a browser compliant method like an <a>
     * tag.
     *
     * @param params - The parameters for the download request.
     *
     * @example
     * The following code downloads an example file named "files/mehozpxf877d" as
     * "file.txt".
     *
     * ```ts
     * await ai.files.download({file: file.name, downloadPath: 'file.txt'});
     * ```
     */
    download(params: types.DownloadFileParameters): Promise<void>;
    private listInternal;
    private createInternal;
    /**
     * Retrieves the file information from the service.
     *
     * @param params - The parameters for the get request
     * @return The Promise that resolves to the types.File object requested.
     *
     * @example
     * ```ts
     * const config: GetFileParameters = {
     *   name: fileName,
     * };
     * file = await ai.files.get(config);
     * console.log(file.name);
     * ```
     */
    get(params: types.GetFileParameters): Promise<types.File>;
    /**
     * Deletes a remotely stored file.
     *
     * @param params - The parameters for the delete request.
     * @return The DeleteFileResponse, the response for the delete method.
     *
     * @example
     * The following code deletes an example file named "files/mehozpxf877d".
     *
     * ```ts
     * await ai.files.delete({name: file.name});
     * ```
     */
    delete(params: types.DeleteFileParameters): Promise<types.DeleteFileResponse>;
}

/** Source of the File. */
export declare enum FileSource {
    SOURCE_UNSPECIFIED = "SOURCE_UNSPECIFIED",
    UPLOADED = "UPLOADED",
    GENERATED = "GENERATED"
}

/**
 * Represents the size and mimeType of a file. The information is used to
 * request the upload URL from the https://generativelanguage.googleapis.com/upload/v1beta/files endpoint.
 * This interface defines the structure for constructing and executing HTTP
 * requests.
 */
declare interface FileStat {
    /**
     * The size of the file in bytes.
     */
    size: number;
    /**
     * The MIME type of the file.
     */
    type: string | undefined;
}

/** State for the lifecycle of a File. */
export declare enum FileState {
    STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
    PROCESSING = "PROCESSING",
    ACTIVE = "ACTIVE",
    FAILED = "FAILED"
}

/** Status of a File that uses a common error model. */
export declare interface FileStatus {
    /** A list of messages that carry the error details. There is a common set of message types for APIs to use. */
    details?: Record<string, unknown>[];
    /** A list of messages that carry the error details. There is a common set of message types for APIs to use. */
    message?: string;
    /** The status code. 0 for OK, 1 for CANCELLED */
    code?: number;
}

/** Output only. The reason why the model stopped generating tokens.

 If empty, the model has not stopped generating the tokens.
 */
export declare enum FinishReason {
    /**
     * The finish reason is unspecified.
     */
    FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED",
    /**
     * Token generation reached a natural stopping point or a configured stop sequence.
     */
    STOP = "STOP",
    /**
     * Token generation reached the configured maximum output tokens.
     */
    MAX_TOKENS = "MAX_TOKENS",
    /**
     * Token generation stopped because the content potentially contains safety violations. NOTE: When streaming, [content][] is empty if content filters blocks the output.
     */
    SAFETY = "SAFETY",
    /**
     * The token generation stopped because of potential recitation.
     */
    RECITATION = "RECITATION",
    /**
     * The token generation stopped because of using an unsupported language.
     */
    LANGUAGE = "LANGUAGE",
    /**
     * All other reasons that stopped the token generation.
     */
    OTHER = "OTHER",
    /**
     * Token generation stopped because the content contains forbidden terms.
     */
    BLOCKLIST = "BLOCKLIST",
    /**
     * Token generation stopped for potentially containing prohibited content.
     */
    PROHIBITED_CONTENT = "PROHIBITED_CONTENT",
    /**
     * Token generation stopped because the content potentially contains Sensitive Personally Identifiable Information (SPII).
     */
    SPII = "SPII",
    /**
     * The function call generated by the model is invalid.
     */
    MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL",
    /**
     * Token generation stopped because generated images have safety violations.
     */
    IMAGE_SAFETY = "IMAGE_SAFETY",
    /**
     * The tool call generated by the model is invalid.
     */
    UNEXPECTED_TOOL_CALL = "UNEXPECTED_TOOL_CALL"
}

/** A function call. */
export declare interface FunctionCall {
    /** The unique id of the function call. If populated, the client to execute the
     `function_call` and return the response with the matching `id`. */
    id?: string;
    /** Optional. The function parameters and values in JSON object format. See [FunctionDeclaration.parameters] for parameter details. */
    args?: Record<string, unknown>;
    /** Required. The name of the function to call. Matches [FunctionDeclaration.name]. */
    name?: string;
}

/** Function calling config. */
export declare interface FunctionCallingConfig {
    /** Optional. Function calling mode. */
    mode?: FunctionCallingConfigMode;
    /** Optional. Function names to call. Only set when the Mode is ANY. Function names should match [FunctionDeclaration.name]. With mode set to ANY, model will predict a function call from the set of function names provided. */
    allowedFunctionNames?: string[];
}

/** Config for the function calling config mode. */
export declare enum FunctionCallingConfigMode {
    /**
     * The function calling config mode is unspecified. Should not be used.
     */
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    /**
     * Default model behavior, model decides to predict either function calls or natural language response.
     */
    AUTO = "AUTO",
    /**
     * Model is constrained to always predicting function calls only. If "allowed_function_names" are set, the predicted function calls will be limited to any one of "allowed_function_names", else the predicted function calls will be any one of the provided "function_declarations".
     */
    ANY = "ANY",
    /**
     * Model will not predict any function calls. Model behavior is same as when not passing any function declarations.
     */
    NONE = "NONE",
    /**
     * Model decides to predict either a function call or a natural language response, but will validate function calls with constrained decoding. If "allowed_function_names" are set, the predicted function call will be limited to any one of "allowed_function_names", else the predicted function call will be any one of the provided "function_declarations".
     */
    VALIDATED = "VALIDATED"
}

/** Defines a function that the model can generate JSON inputs for.

 The inputs are based on `OpenAPI 3.0 specifications
 <https://spec.openapis.org/oas/v3.0.3>`_.
 */
export declare interface FunctionDeclaration {
    /** Defines the function behavior. */
    behavior?: Behavior;
    /** Optional. Description and purpose of the function. Model uses it to decide how and whether to call the function. */
    description?: string;
    /** Required. The name of the function to call. Must start with a letter or an underscore. Must be a-z, A-Z, 0-9, or contain underscores, dots and dashes, with a maximum length of 64. */
    name?: string;
    /** Optional. Describes the parameters to this function in JSON Schema Object format. Reflects the Open API 3.03 Parameter Object. string Key: the name of the parameter. Parameter names are case sensitive. Schema Value: the Schema defining the type used for the parameter. For function with no parameters, this can be left unset. Parameter names must start with a letter or an underscore and must only contain chars a-z, A-Z, 0-9, or underscores with a maximum length of 64. Example with 1 required and 1 optional parameter: type: OBJECT properties: param1: type: STRING param2: type: INTEGER required: - param1 */
    parameters?: Schema;
    /** Optional. Describes the parameters to the function in JSON Schema format. The schema must describe an object where the properties are the parameters to the function. For example: ``` { "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" } }, "additionalProperties": false, "required": ["name", "age"], "propertyOrdering": ["name", "age"] } ``` This field is mutually exclusive with `parameters`. */
    parametersJsonSchema?: unknown;
    /** Optional. Describes the output from this function in JSON Schema format. Reflects the Open API 3.03 Response Object. The Schema defines the type used for the response value of the function. */
    response?: Schema;
    /** Optional. Describes the output from this function in JSON Schema format. The value specified by the schema is the response value of the function. This field is mutually exclusive with `response`. */
    responseJsonSchema?: unknown;
}

/** A function response. */
export declare class FunctionResponse {
    /** Signals that function call continues, and more responses will be returned, turning the function call into a generator. Is only applicable to NON_BLOCKING function calls (see FunctionDeclaration.behavior for details), ignored otherwise. If false, the default, future responses will not be considered. Is only applicable to NON_BLOCKING function calls, is ignored otherwise. If set to false, future responses will not be considered. It is allowed to return empty `response` with `will_continue=False` to signal that the function call is finished. */
    willContinue?: boolean;
    /** Specifies how the response should be scheduled in the conversation. Only applicable to NON_BLOCKING function calls, is ignored otherwise. Defaults to WHEN_IDLE. */
    scheduling?: FunctionResponseScheduling;
    /** Optional. The id of the function call this response is for. Populated by the client to match the corresponding function call `id`. */
    id?: string;
    /** Required. The name of the function to call. Matches [FunctionDeclaration.name] and [FunctionCall.name]. */
    name?: string;
    /** Required. The function response in JSON object format. Use "output" key to specify function output and "error" key to specify error details (if any). If "output" and "error" keys are not specified, then whole "response" is treated as function output. */
    response?: Record<string, unknown>;
}

/** Specifies how the response should be scheduled in the conversation. */
export declare enum FunctionResponseScheduling {
    /**
     * This value is unused.
     */
    SCHEDULING_UNSPECIFIED = "SCHEDULING_UNSPECIFIED",
    /**
     * Only add the result to the conversation context, do not interrupt or trigger generation.
     */
    SILENT = "SILENT",
    /**
     * Add the result to the conversation context, and prompt to generate output without interrupting ongoing generation.
     */
    WHEN_IDLE = "WHEN_IDLE",
    /**
     * Add the result to the conversation context, interrupt ongoing generation and prompt to generate output.
     */
    INTERRUPT = "INTERRUPT"
}

/** Input example for preference optimization. */
export declare interface GeminiPreferenceExample {
    /** List of completions for a given prompt. */
    completions?: GeminiPreferenceExampleCompletion[];
    /** Multi-turn contents that represents the Prompt. */
    contents?: Content[];
}

/** Completion and its preference score. */
export declare interface GeminiPreferenceExampleCompletion {
    /** Single turn completion for the given prompt. */
    completion?: Content;
    /** The score for the given completion. */
    score?: number;
}

/** Optional model configuration parameters.

 For more information, see `Content generation parameters
 <https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters>`_.
 */
export declare interface GenerateContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Instructions for the model to steer it toward better performance.
     For example, "Answer as concisely as possible" or "Don't use technical
     terms in your response".
     */
    systemInstruction?: ContentUnion;
    /** Value that controls the degree of randomness in token selection.
     Lower temperatures are good for prompts that require a less open-ended or
     creative response, while higher temperatures can lead to more diverse or
     creative results.
     */
    temperature?: number;
    /** Tokens are selected from the most to least probable until the sum
     of their probabilities equals this value. Use a lower value for less
     random responses and a higher value for more random responses.
     */
    topP?: number;
    /** For each token selection step, the ``top_k`` tokens with the
     highest probabilities are sampled. Then tokens are further filtered based
     on ``top_p`` with the final token selected using temperature sampling. Use
     a lower number for less random responses and a higher number for more
     random responses.
     */
    topK?: number;
    /** Number of response variations to return.
     */
    candidateCount?: number;
    /** Maximum number of tokens that can be generated in the response.
     */
    maxOutputTokens?: number;
    /** List of strings that tells the model to stop generating text if one
     of the strings is encountered in the response.
     */
    stopSequences?: string[];
    /** Whether to return the log probabilities of the tokens that were
     chosen by the model at each step.
     */
    responseLogprobs?: boolean;
    /** Number of top candidate tokens to return the log probabilities for
     at each generation step.
     */
    logprobs?: number;
    /** Positive values penalize tokens that already appear in the
     generated text, increasing the probability of generating more diverse
     content.
     */
    presencePenalty?: number;
    /** Positive values penalize tokens that repeatedly appear in the
     generated text, increasing the probability of generating more diverse
     content.
     */
    frequencyPenalty?: number;
    /** When ``seed`` is fixed to a specific number, the model makes a best
     effort to provide the same response for repeated requests. By default, a
     random number is used.
     */
    seed?: number;
    /** Output response mimetype of the generated candidate text.
     Supported mimetype:
     - `text/plain`: (default) Text output.
     - `application/json`: JSON response in the candidates.
     The model needs to be prompted to output the appropriate response type,
     otherwise the behavior is undefined.
     This is a preview feature.
     */
    responseMimeType?: string;
    /** The `Schema` object allows the definition of input and output data types.
     These types can be objects, but also primitives and arrays.
     Represents a select subset of an [OpenAPI 3.0 schema
     object](https://spec.openapis.org/oas/v3.0.3#schema).
     If set, a compatible response_mime_type must also be set.
     Compatible mimetypes: `application/json`: Schema for JSON response.
     */
    responseSchema?: SchemaUnion;
    /** Optional. Output schema of the generated response.
     This is an alternative to `response_schema` that accepts [JSON
     Schema](https://json-schema.org/). If set, `response_schema` must be
     omitted, but `response_mime_type` is required. While the full JSON Schema
     may be sent, not all features are supported. Specifically, only the
     following properties are supported: - `$id` - `$defs` - `$ref` - `$anchor`
     - `type` - `format` - `title` - `description` - `enum` (for strings and
     numbers) - `items` - `prefixItems` - `minItems` - `maxItems` - `minimum` -
     `maximum` - `anyOf` - `oneOf` (interpreted the same as `anyOf`) -
     `properties` - `additionalProperties` - `required` The non-standard
     `propertyOrdering` property may also be set. Cyclic references are
     unrolled to a limited degree and, as such, may only be used within
     non-required properties. (Nullable properties are not sufficient.) If
     `$ref` is set on a sub-schema, no other properties, except for than those
     starting as a `$`, may be set. */
    responseJsonSchema?: unknown;
    /** Configuration for model router requests.
     */
    routingConfig?: GenerationConfigRoutingConfig;
    /** Configuration for model selection.
     */
    modelSelectionConfig?: ModelSelectionConfig;
    /** Safety settings in the request to block unsafe content in the
     response.
     */
    safetySettings?: SafetySetting[];
    /** Code that enables the system to interact with external systems to
     perform an action outside of the knowledge and scope of the model.
     */
    tools?: ToolListUnion;
    /** Associates model output to a specific function call.
     */
    toolConfig?: ToolConfig;
    /** Labels with user-defined metadata to break down billed charges. */
    labels?: Record<string, string>;
    /** Resource name of a context cache that can be used in subsequent
     requests.
     */
    cachedContent?: string;
    /** The requested modalities of the response. Represents the set of
     modalities that the model can return.
     */
    responseModalities?: string[];
    /** If specified, the media resolution specified will be used.
     */
    mediaResolution?: MediaResolution;
    /** The speech generation configuration.
     */
    speechConfig?: SpeechConfigUnion;
    /** If enabled, audio timestamp will be included in the request to the
     model.
     */
    audioTimestamp?: boolean;
    /** The configuration for automatic function calling.
     */
    automaticFunctionCalling?: AutomaticFunctionCallingConfig;
    /** The thinking features configuration.
     */
    thinkingConfig?: ThinkingConfig;
}

/** Config for models.generate_content parameters. */
export declare interface GenerateContentParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** Content of the request.
     */
    contents: ContentListUnion;
    /** Configuration that contains optional model parameters.
     */
    config?: GenerateContentConfig;
}

/** Response message for PredictionService.GenerateContent. */
export declare class GenerateContentResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Response variations returned by the model.
     */
    candidates?: Candidate[];
    /** Timestamp when the request is made to the server.
     */
    createTime?: string;
    /** The history of automatic function calling.
     */
    automaticFunctionCallingHistory?: Content[];
    /** Output only. The model version used to generate the response. */
    modelVersion?: string;
    /** Output only. Content filter results for a prompt sent in the request. Note: Sent only in the first stream chunk. Only happens when no candidates were generated due to content violations. */
    promptFeedback?: GenerateContentResponsePromptFeedback;
    /** Output only. response_id is used to identify each response. It is the encoding of the event_id. */
    responseId?: string;
    /** Usage metadata about the response(s). */
    usageMetadata?: GenerateContentResponseUsageMetadata;
    /**
     * Returns the concatenation of all text parts from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the text from the first
     * one will be returned.
     * If there are non-text parts in the response, the concatenation of all text
     * parts will be returned, and a warning will be logged.
     * If there are thought parts in the response, the concatenation of all text
     * parts excluding the thought parts will be returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'Why is the sky blue?',
     * });
     *
     * console.debug(response.text);
     * ```
     */
    get text(): string | undefined;
    /**
     * Returns the concatenation of all inline data parts from the first candidate
     * in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the inline data from the
     * first one will be returned. If there are non-inline data parts in the
     * response, the concatenation of all inline data parts will be returned, and
     * a warning will be logged.
     */
    get data(): string | undefined;
    /**
     * Returns the function calls from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the function calls from
     * the first one will be returned.
     * If there are no function calls in the response, undefined will be returned.
     *
     * @example
     * ```ts
     * const controlLightFunctionDeclaration: FunctionDeclaration = {
     *   name: 'controlLight',
     *   parameters: {
     *   type: Type.OBJECT,
     *   description: 'Set the brightness and color temperature of a room light.',
     *   properties: {
     *     brightness: {
     *       type: Type.NUMBER,
     *       description:
     *         'Light level from 0 to 100. Zero is off and 100 is full brightness.',
     *     },
     *     colorTemperature: {
     *       type: Type.STRING,
     *       description:
     *         'Color temperature of the light fixture which can be `daylight`, `cool` or `warm`.',
     *     },
     *   },
     *   required: ['brightness', 'colorTemperature'],
     *  };
     *  const response = await ai.models.generateContent({
     *     model: 'gemini-2.0-flash',
     *     contents: 'Dim the lights so the room feels cozy and warm.',
     *     config: {
     *       tools: [{functionDeclarations: [controlLightFunctionDeclaration]}],
     *       toolConfig: {
     *         functionCallingConfig: {
     *           mode: FunctionCallingConfigMode.ANY,
     *           allowedFunctionNames: ['controlLight'],
     *         },
     *       },
     *     },
     *   });
     *  console.debug(JSON.stringify(response.functionCalls));
     * ```
     */
    get functionCalls(): FunctionCall[] | undefined;
    /**
     * Returns the first executable code from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the executable code from
     * the first one will be returned.
     * If there are no executable code in the response, undefined will be
     * returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
     *   config: {
     *     tools: [{codeExecution: {}}],
     *   },
     * });
     *
     * console.debug(response.executableCode);
     * ```
     */
    get executableCode(): string | undefined;
    /**
     * Returns the first code execution result from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the code execution result from
     * the first one will be returned.
     * If there are no code execution result in the response, undefined will be returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
     *   config: {
     *     tools: [{codeExecution: {}}],
     *   },
     * });
     *
     * console.debug(response.codeExecutionResult);
     * ```
     */
    get codeExecutionResult(): string | undefined;
}

/** Content filter results for a prompt sent in the request. */
export declare class GenerateContentResponsePromptFeedback {
    /** Output only. Blocked reason. */
    blockReason?: BlockedReason;
    /** Output only. A readable block reason message. */
    blockReasonMessage?: string;
    /** Output only. Safety ratings. */
    safetyRatings?: SafetyRating[];
}

/** Usage metadata about response(s). */
export declare class GenerateContentResponseUsageMetadata {
    /** Output only. List of modalities of the cached content in the request input. */
    cacheTokensDetails?: ModalityTokenCount[];
    /** Output only. Number of tokens in the cached part in the input (the cached content). */
    cachedContentTokenCount?: number;
    /** Number of tokens in the response(s). */
    candidatesTokenCount?: number;
    /** Output only. List of modalities that were returned in the response. */
    candidatesTokensDetails?: ModalityTokenCount[];
    /** Number of tokens in the request. When `cached_content` is set, this is still the total effective prompt size meaning this includes the number of tokens in the cached content. */
    promptTokenCount?: number;
    /** Output only. List of modalities that were processed in the request input. */
    promptTokensDetails?: ModalityTokenCount[];
    /** Output only. Number of tokens present in thoughts output. */
    thoughtsTokenCount?: number;
    /** Output only. Number of tokens present in tool-use prompt(s). */
    toolUsePromptTokenCount?: number;
    /** Output only. List of modalities that were processed for tool-use request inputs. */
    toolUsePromptTokensDetails?: ModalityTokenCount[];
    /** Total token count for prompt, response candidates, and tool-use prompts (if present). */
    totalTokenCount?: number;
    /** Output only. Traffic type. This shows whether a request consumes Pay-As-You-Go or Provisioned Throughput quota. */
    trafficType?: TrafficType;
}

/** An output image. */
export declare interface GeneratedImage {
    /** The output image data. */
    image?: Image_2;
    /** Responsible AI filter reason if the image is filtered out of the
     response. */
    raiFilteredReason?: string;
    /** Safety attributes of the image. Lists of RAI categories and their
     scores of each content. */
    safetyAttributes?: SafetyAttributes;
    /** The rewritten prompt used for the image generation if the prompt
     enhancer is enabled. */
    enhancedPrompt?: string;
}

/** A generated image mask. */
export declare interface GeneratedImageMask {
    /** The generated image mask. */
    mask?: Image_2;
    /** The detected entities on the segmented area. */
    labels?: EntityLabel[];
}

/** A generated video. */
export declare interface GeneratedVideo {
    /** The output video */
    video?: Video;
}

/** The config for generating an images. */
export declare interface GenerateImagesConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Cloud Storage URI used to store the generated images. */
    outputGcsUri?: string;
    /** Description of what to discourage in the generated images. */
    negativePrompt?: string;
    /** Number of images to generate. */
    numberOfImages?: number;
    /** Aspect ratio of the generated images. Supported values are
     "1:1", "3:4", "4:3", "9:16", and "16:9". */
    aspectRatio?: string;
    /** Controls how much the model adheres to the text prompt. Large
     values increase output and prompt alignment, but may compromise image
     quality. */
    guidanceScale?: number;
    /** Random seed for image generation. This is not available when
     ``add_watermark`` is set to true. */
    seed?: number;
    /** Filter level for safety filtering. */
    safetyFilterLevel?: SafetyFilterLevel;
    /** Allows generation of people by the model. */
    personGeneration?: PersonGeneration;
    /** Whether to report the safety scores of each generated image and
     the positive prompt in the response. */
    includeSafetyAttributes?: boolean;
    /** Whether to include the Responsible AI filter reason if the image
     is filtered out of the response. */
    includeRaiReason?: boolean;
    /** Language of the text in the prompt. */
    language?: ImagePromptLanguage;
    /** MIME type of the generated image. */
    outputMimeType?: string;
    /** Compression quality of the generated image (for ``image/jpeg``
     only). */
    outputCompressionQuality?: number;
    /** Whether to add a watermark to the generated images. */
    addWatermark?: boolean;
    /** The size of the largest dimension of the generated image.
     Supported sizes are 1K and 2K (not supported for Imagen 3 models). */
    imageSize?: string;
    /** Whether to use the prompt rewriting logic. */
    enhancePrompt?: boolean;
}

/** The parameters for generating images. */
export declare interface GenerateImagesParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** Text prompt that typically describes the images to output.
     */
    prompt: string;
    /** Configuration for generating images.
     */
    config?: GenerateImagesConfig;
}

/** The output images response. */
export declare class GenerateImagesResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** List of generated images. */
    generatedImages?: GeneratedImage[];
    /** Safety attributes of the positive prompt. Only populated if
     ``include_safety_attributes`` is set to True. */
    positivePromptSafetyAttributes?: SafetyAttributes;
}

/** Configuration for generating videos. */
export declare interface GenerateVideosConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Number of output videos. */
    numberOfVideos?: number;
    /** The gcs bucket where to save the generated videos. */
    outputGcsUri?: string;
    /** Frames per second for video generation. */
    fps?: number;
    /** Duration of the clip for video generation in seconds. */
    durationSeconds?: number;
    /** The RNG seed. If RNG seed is exactly same for each request with
     unchanged inputs, the prediction results will be consistent. Otherwise,
     a random RNG seed will be used each time to produce a different
     result. */
    seed?: number;
    /** The aspect ratio for the generated video. 16:9 (landscape) and
     9:16 (portrait) are supported. */
    aspectRatio?: string;
    /** The resolution for the generated video. 720p and 1080p are
     supported. */
    resolution?: string;
    /** Whether allow to generate person videos, and restrict to specific
     ages. Supported values are: dont_allow, allow_adult. */
    personGeneration?: string;
    /** The pubsub topic where to publish the video generation
     progress. */
    pubsubTopic?: string;
    /** Explicitly state what should not be included in the generated
     videos. */
    negativePrompt?: string;
    /** Whether to use the prompt rewriting logic. */
    enhancePrompt?: boolean;
    /** Whether to generate audio along with the video. */
    generateAudio?: boolean;
    /** Image to use as the last frame of generated videos.
     Only supported for image to video use cases. */
    lastFrame?: Image_2;
    /** The images to use as the references to generate the videos.
     If this field is provided, the text prompt field must also be provided.
     The image, video, or last_frame field are not supported. Each image must
     be associated with a type. Veo 2 supports up to 3 asset images *or* 1
     style image. */
    referenceImages?: VideoGenerationReferenceImage[];
    /** The mask to use for generating videos. */
    mask?: VideoGenerationMask;
    /** Compression quality of the generated videos. */
    compressionQuality?: VideoCompressionQuality;
}

/** A video generation operation. */
export declare class GenerateVideosOperation implements Operation<GenerateVideosResponse> {
    /** The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the `name` should be a resource name ending with `operations/{unique_id}`. */
    name?: string;
    /** Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata.  Any method that returns a long-running operation should document the metadata type, if any. */
    metadata?: Record<string, unknown>;
    /** If the value is `false`, it means the operation is still in progress. If `true`, the operation is completed, and either `error` or `response` is available. */
    done?: boolean;
    /** The error result of the operation in case of failure or cancellation. */
    error?: Record<string, unknown>;
    /** The generated videos. */
    response?: GenerateVideosResponse;
    /**
     * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
     * @internal
     */
    _fromAPIResponse({ apiResponse, isVertexAI, }: OperationFromAPIResponseParameters): Operation<GenerateVideosResponse>;
    /** The full HTTP response. */
    sdkHttpResponse?: HttpResponse;
}

/** Class that represents the parameters for generating videos. */
export declare interface GenerateVideosParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** The text prompt for generating the videos.
     Optional if image or video is provided. */
    prompt?: string;
    /** The input image for generating the videos.
     Optional if prompt is provided. Not allowed if video is provided. */
    image?: Image_2;
    /** The input video for video extension use cases.
     Optional if prompt is provided. Not allowed if image is provided. */
    video?: Video;
    /** A set of source input(s) for video generation. */
    source?: GenerateVideosSource;
    /** Configuration for generating videos. */
    config?: GenerateVideosConfig;
}

/** Response with generated videos. */
export declare class GenerateVideosResponse {
    /** List of the generated videos */
    generatedVideos?: GeneratedVideo[];
    /** Returns if any videos were filtered due to RAI policies. */
    raiMediaFilteredCount?: number;
    /** Returns rai failure reasons if any. */
    raiMediaFilteredReasons?: string[];
}

/** A set of source input(s) for video generation. */
export declare interface GenerateVideosSource {
    /** The text prompt for generating the videos.
     Optional if image or video is provided. */
    prompt?: string;
    /** The input image for generating the videos.
     Optional if prompt is provided. Not allowed if video is provided. */
    image?: Image_2;
    /** The input video for video extension use cases.
     Optional if prompt is provided. Not allowed if image is provided. */
    video?: Video;
}

/** Generation config. */
export declare interface GenerationConfig {
    /** Optional. Config for model selection. */
    modelSelectionConfig?: ModelSelectionConfig;
    /** Optional. If enabled, audio timestamp will be included in the request to the model. */
    audioTimestamp?: boolean;
    /** Optional. Number of candidates to generate. */
    candidateCount?: number;
    /** Optional. If enabled, the model will detect emotions and adapt its responses accordingly. */
    enableAffectiveDialog?: boolean;
    /** Optional. Frequency penalties. */
    frequencyPenalty?: number;
    /** Optional. Logit probabilities. */
    logprobs?: number;
    /** Optional. The maximum number of output tokens to generate per message. */
    maxOutputTokens?: number;
    /** Optional. If specified, the media resolution specified will be used. */
    mediaResolution?: MediaResolution;
    /** Optional. Positive penalties. */
    presencePenalty?: number;
    /** Optional. Output schema of the generated response. This is an alternative to `response_schema` that accepts [JSON Schema](https://json-schema.org/). If set, `response_schema` must be omitted, but `response_mime_type` is required. While the full JSON Schema may be sent, not all features are supported. Specifically, only the following properties are supported: - `$id` - `$defs` - `$ref` - `$anchor` - `type` - `format` - `title` - `description` - `enum` (for strings and numbers) - `items` - `prefixItems` - `minItems` - `maxItems` - `minimum` - `maximum` - `anyOf` - `oneOf` (interpreted the same as `anyOf`) - `properties` - `additionalProperties` - `required` The non-standard `propertyOrdering` property may also be set. Cyclic references are unrolled to a limited degree and, as such, may only be used within non-required properties. (Nullable properties are not sufficient.) If `$ref` is set on a sub-schema, no other properties, except for than those starting as a `$`, may be set. */
    responseJsonSchema?: unknown;
    /** Optional. If true, export the logprobs results in response. */
    responseLogprobs?: boolean;
    /** Optional. Output response mimetype of the generated candidate text. Supported mimetype: - `text/plain`: (default) Text output. - `application/json`: JSON response in the candidates. The model needs to be prompted to output the appropriate response type, otherwise the behavior is undefined. This is a preview feature. */
    responseMimeType?: string;
    /** Optional. The modalities of the response. */
    responseModalities?: Modality[];
    /** Optional. The `Schema` object allows the definition of input and output data types. These types can be objects, but also primitives and arrays. Represents a select subset of an [OpenAPI 3.0 schema object](https://spec.openapis.org/oas/v3.0.3#schema). If set, a compatible response_mime_type must also be set. Compatible mimetypes: `application/json`: Schema for JSON response. */
    responseSchema?: Schema;
    /** Optional. Routing configuration. */
    routingConfig?: GenerationConfigRoutingConfig;
    /** Optional. Seed. */
    seed?: number;
    /** Optional. The speech generation config. */
    speechConfig?: SpeechConfig;
    /** Optional. Stop sequences. */
    stopSequences?: string[];
    /** Optional. Controls the randomness of predictions. */
    temperature?: number;
    /** Optional. Config for thinking features. An error will be returned if this field is set for models that don't support thinking. */
    thinkingConfig?: GenerationConfigThinkingConfig;
    /** Optional. If specified, top-k sampling will be used. */
    topK?: number;
    /** Optional. If specified, nucleus sampling will be used. */
    topP?: number;
}

/** The configuration for routing the request to a specific model. */
export declare interface GenerationConfigRoutingConfig {
    /** Automated routing. */
    autoMode?: GenerationConfigRoutingConfigAutoRoutingMode;
    /** Manual routing. */
    manualMode?: GenerationConfigRoutingConfigManualRoutingMode;
}

/** When automated routing is specified, the routing will be determined by the pretrained routing model and customer provided model routing preference. */
export declare interface GenerationConfigRoutingConfigAutoRoutingMode {
    /** The model routing preference. */
    modelRoutingPreference?: 'UNKNOWN' | 'PRIORITIZE_QUALITY' | 'BALANCED' | 'PRIORITIZE_COST';
}

/** When manual routing is set, the specified model will be used directly. */
export declare interface GenerationConfigRoutingConfigManualRoutingMode {
    /** The model name to use. Only the public LLM models are accepted. See [Supported models](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference#supported-models). */
    modelName?: string;
}

/** Config for thinking features. */
export declare interface GenerationConfigThinkingConfig {
    /** Optional. Indicates whether to include thoughts in the response. If true, thoughts are returned only when available. */
    includeThoughts?: boolean;
    /** Optional. Indicates the thinking budget in tokens. */
    thinkingBudget?: number;
}

/** Optional parameters. */
export declare interface GetBatchJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Config for batches.get parameters. */
export declare interface GetBatchJobParameters {
    /** A fully-qualified BatchJob resource name or ID.
     Example: "projects/.../locations/.../batchPredictionJobs/456"
     or "456" when project and location are initialized in the client.
     */
    name: string;
    /** Optional parameters for the request. */
    config?: GetBatchJobConfig;
}

/** Optional parameters for caches.get method. */
export declare interface GetCachedContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for caches.get method. */
export declare interface GetCachedContentParameters {
    /** The server-generated resource name of the cached content.
     */
    name: string;
    /** Optional parameters for the request.
     */
    config?: GetCachedContentConfig;
}

/** Used to override the default configuration. */
export declare interface GetFileConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Generates the parameters for the get method. */
export declare interface GetFileParameters {
    /** The name identifier for the file to retrieve. */
    name: string;
    /** Used to override the default configuration. */
    config?: GetFileConfig;
}

/** Optional parameters for models.get method. */
export declare interface GetModelConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

export declare interface GetModelParameters {
    model: string;
    /** Optional parameters for the request. */
    config?: GetModelConfig;
}

export declare interface GetOperationConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for the GET method. */
export declare interface GetOperationParameters {
    /** The server-assigned name for the operation. */
    operationName: string;
    /** Used to override the default configuration. */
    config?: GetOperationConfig;
}

export declare interface GetTuningJobConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
}

/** Parameters for the get method. */
export declare interface GetTuningJobParameters {
    name: string;
    /** Optional parameters for the request. */
    config?: GetTuningJobConfig;
}

/**
 * The Google GenAI SDK.
 *
 * @remarks
 * Provides access to the GenAI features through either the {@link
 * https://cloud.google.com/vertex-ai/docs/reference/rest | Gemini API} or
 * the {@link https://cloud.google.com/vertex-ai/docs/reference/rest | Vertex AI
 * API}.
 *
 * The {@link GoogleGenAIOptions.vertexai} value determines which of the API
 * services to use.
 *
 * When using the Gemini API, a {@link GoogleGenAIOptions.apiKey} must also be
 * set. When using Vertex AI, both {@link GoogleGenAIOptions.project} and {@link
 * GoogleGenAIOptions.location} must be set, or a {@link
 * GoogleGenAIOptions.apiKey} must be set when using Express Mode.
 *
 * Explicitly passed in values in {@link GoogleGenAIOptions} will always take
 * precedence over environment variables. If both project/location and api_key
 * exist in the environment variables, the project/location will be used.
 *
 * @example
 * Initializing the SDK for using the Gemini API:
 * ```ts
 * import {GoogleGenAI} from '@google/genai';
 * const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
 * ```
 *
 * @example
 * Initializing the SDK for using the Vertex AI API:
 * ```ts
 * import {GoogleGenAI} from '@google/genai';
 * const ai = new GoogleGenAI({
 *   vertexai: true,
 *   project: 'PROJECT_ID',
 *   location: 'PROJECT_LOCATION'
 * });
 * ```
 *
 */
export declare class GoogleGenAI {
    protected readonly apiClient: ApiClient;
    private readonly apiKey?;
    readonly vertexai: boolean;
    private readonly googleAuthOptions?;
    private readonly project?;
    private readonly location?;
    private readonly apiVersion?;
    readonly models: Models;
    readonly live: Live;
    readonly batches: Batches;
    readonly chats: Chats;
    readonly caches: Caches;
    readonly files: Files;
    readonly operations: Operations;
    readonly authTokens: Tokens;
    readonly tunings: Tunings;
    constructor(options: GoogleGenAIOptions);
}

/**
 * Google Gen AI SDK's configuration options.
 *
 * See {@link GoogleGenAI} for usage samples.
 */
export declare interface GoogleGenAIOptions {
    /**
     * Optional. Determines whether to use the Vertex AI or the Gemini API.
     *
     * @remarks
     * When true, the {@link https://cloud.google.com/vertex-ai/docs/reference/rest | Vertex AI API} will used.
     * When false, the {@link https://ai.google.dev/api | Gemini API} will be used.
     *
     * If unset, default SDK behavior is to use the Gemini API service.
     */
    vertexai?: boolean;
    /**
     * Optional. The Google Cloud project ID for Vertex AI clients.
     *
     * Find your project ID: https://cloud.google.com/resource-manager/docs/creating-managing-projects#identifying_projects
     *
     * @remarks
     * Only supported on Node runtimes, ignored on browser runtimes.
     */
    project?: string;
    /**
     * Optional. The Google Cloud project {@link https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations | location} for Vertex AI clients.
     *
     * @remarks
     * Only supported on Node runtimes, ignored on browser runtimes.
     *
     */
    location?: string;
    /**
     * The API Key, required for Gemini API clients.
     *
     * @remarks
     * Required on browser runtimes.
     */
    apiKey?: string;
    /**
     * Optional. The API version to use.
     *
     * @remarks
     * If unset, the default API version will be used.
     */
    apiVersion?: string;
    /**
     * Optional. Authentication options defined by the by google-auth-library for Vertex AI clients.
     *
     * @remarks
     * @see {@link https://github.com/googleapis/google-auth-library-nodejs/blob/v9.15.0/src/auth/googleauth.ts | GoogleAuthOptions interface in google-auth-library-nodejs}.
     *
     * Only supported on Node runtimes, ignored on browser runtimes.
     *
     */
    googleAuthOptions?: GoogleAuthOptions;
    /**
     * Optional. A set of customizable configuration for HTTP requests.
     */
    httpOptions?: HttpOptions;
}

/** Tool to support Google Maps in Model. */
export declare interface GoogleMaps {
    /** Optional. Auth config for the Google Maps tool. */
    authConfig?: AuthConfig;
}

/** The `Status` type defines a logical error model that is suitable for different programming environments, including REST APIs and RPC APIs. It is used by [gRPC](https://github.com/grpc). Each `Status` message contains three pieces of data: error code, error message, and error details. You can find out more about this error model and how to work with it in the [API Design Guide](https://cloud.google.com/apis/design/errors). */
export declare interface GoogleRpcStatus {
    /** The status code, which should be an enum value of google.rpc.Code. */
    code?: number;
    /** A list of messages that carry the error details. There is a common set of message types for APIs to use. */
    details?: Record<string, unknown>[];
    /** A developer-facing error message, which should be in English. Any user-facing error message should be localized and sent in the google.rpc.Status.details field, or localized by the client. */
    message?: string;
}

/** Tool to support Google Search in Model. Powered by Google. */
export declare interface GoogleSearch {
    /** Optional. Filter search results to a specific time range.
     If customers set a start time, they must set an end time (and vice versa).
     */
    timeRangeFilter?: Interval;
    /** Optional. List of domains to be excluded from the search results.
     The default limit is 2000 domains. */
    excludeDomains?: string[];
}

/** Tool to retrieve public web data for grounding, powered by Google. */
export declare interface GoogleSearchRetrieval {
    /** Specifies the dynamic retrieval configuration for the given source. */
    dynamicRetrievalConfig?: DynamicRetrievalConfig;
}

/** Represents a whole or partial calendar date, such as a birthday. The time of day and time zone are either specified elsewhere or are insignificant. The date is relative to the Gregorian Calendar. This can represent one of the following: * A full date, with non-zero year, month, and day values. * A month and day, with a zero year (for example, an anniversary). * A year on its own, with a zero month and a zero day. * A year and month, with a zero day (for example, a credit card expiration date). Related types: * google.type.TimeOfDay * google.type.DateTime * google.protobuf.Timestamp */
export declare interface GoogleTypeDate {
    /** Day of a month. Must be from 1 to 31 and valid for the year and month, or 0 to specify a year by itself or a year and month where the day isn't significant. */
    day?: number;
    /** Month of a year. Must be from 1 to 12, or 0 to specify a year without a month and day. */
    month?: number;
    /** Year of the date. Must be from 1 to 9999, or 0 to specify a date without a year. */
    year?: number;
}

/** Grounding chunk. */
export declare interface GroundingChunk {
    /** Grounding chunk from Google Maps. */
    maps?: GroundingChunkMaps;
    /** Grounding chunk from context retrieved by the retrieval tools. */
    retrievedContext?: GroundingChunkRetrievedContext;
    /** Grounding chunk from the web. */
    web?: GroundingChunkWeb;
}

/** Chunk from Google Maps. */
export declare interface GroundingChunkMaps {
    /** Sources used to generate the place answer. This includes review snippets and photos that were used to generate the answer, as well as uris to flag content. */
    placeAnswerSources?: GroundingChunkMapsPlaceAnswerSources;
    /** This Place's resource name, in `places/{place_id}` format. Can be used to look up the Place. */
    placeId?: string;
    /** Text of the chunk. */
    text?: string;
    /** Title of the chunk. */
    title?: string;
    /** URI reference of the chunk. */
    uri?: string;
}

/** Sources used to generate the place answer. */
export declare interface GroundingChunkMapsPlaceAnswerSources {
    /** A link where users can flag a problem with the generated answer. */
    flagContentUri?: string;
    /** Snippets of reviews that are used to generate the answer. */
    reviewSnippets?: GroundingChunkMapsPlaceAnswerSourcesReviewSnippet[];
}

/** Author attribution for a photo or review. */
export declare interface GroundingChunkMapsPlaceAnswerSourcesAuthorAttribution {
    /** Name of the author of the Photo or Review. */
    displayName?: string;
    /** Profile photo URI of the author of the Photo or Review. */
    photoUri?: string;
    /** URI of the author of the Photo or Review. */
    uri?: string;
}

/** Encapsulates a review snippet. */
export declare interface GroundingChunkMapsPlaceAnswerSourcesReviewSnippet {
    /** This review's author. */
    authorAttribution?: GroundingChunkMapsPlaceAnswerSourcesAuthorAttribution;
    /** A link where users can flag a problem with the review. */
    flagContentUri?: string;
    /** A link to show the review on Google Maps. */
    googleMapsUri?: string;
    /** A string of formatted recent time, expressing the review time relative to the current time in a form appropriate for the language and country. */
    relativePublishTimeDescription?: string;
    /** A reference representing this place review which may be used to look up this place review again. */
    review?: string;
}

/** Chunk from context retrieved by the retrieval tools. */
export declare interface GroundingChunkRetrievedContext {
    /** Output only. The full document name for the referenced Vertex AI Search document. */
    documentName?: string;
    /** Additional context for the RAG retrieval result. This is only populated when using the RAG retrieval tool. */
    ragChunk?: RagChunk;
    /** Text of the attribution. */
    text?: string;
    /** Title of the attribution. */
    title?: string;
    /** URI reference of the attribution. */
    uri?: string;
}

/** Chunk from the web. */
export declare interface GroundingChunkWeb {
    /** Domain of the (original) URI. */
    domain?: string;
    /** Title of the chunk. */
    title?: string;
    /** URI reference of the chunk. */
    uri?: string;
}

/** Metadata returned to client when grounding is enabled. */
export declare interface GroundingMetadata {
    /** Optional. Output only. Resource name of the Google Maps widget context token to be used with the PlacesContextElement widget to render contextual data. This is populated only for Google Maps grounding. */
    googleMapsWidgetContextToken?: string;
    /** List of supporting references retrieved from specified grounding source. */
    groundingChunks?: GroundingChunk[];
    /** Optional. List of grounding support. */
    groundingSupports?: GroundingSupport[];
    /** Optional. Output only. Retrieval metadata. */
    retrievalMetadata?: RetrievalMetadata;
    /** Optional. Queries executed by the retrieval tools. */
    retrievalQueries?: string[];
    /** Optional. Google search entry for the following-up web searches. */
    searchEntryPoint?: SearchEntryPoint;
    /** Optional. Web search queries for the following-up web search. */
    webSearchQueries?: string[];
}

/** Grounding support. */
export declare interface GroundingSupport {
    /** Confidence score of the support references. Ranges from 0 to 1. 1 is the most confident. For Gemini 2.0 and before, this list must have the same size as the grounding_chunk_indices. For Gemini 2.5 and after, this list will be empty and should be ignored. */
    confidenceScores?: number[];
    /** A list of indices (into 'grounding_chunk') specifying the citations associated with the claim. For instance [1,3,4] means that grounding_chunk[1], grounding_chunk[3], grounding_chunk[4] are the retrieved content attributed to the claim. */
    groundingChunkIndices?: number[];
    /** Segment of the content this support belongs to. */
    segment?: Segment;
}

/** Optional. Specify if the threshold is used for probability or severity score. If not specified, the threshold is used for probability score. */
export declare enum HarmBlockMethod {
    /**
     * The harm block method is unspecified.
     */
    HARM_BLOCK_METHOD_UNSPECIFIED = "HARM_BLOCK_METHOD_UNSPECIFIED",
    /**
     * The harm block method uses both probability and severity scores.
     */
    SEVERITY = "SEVERITY",
    /**
     * The harm block method uses the probability score.
     */
    PROBABILITY = "PROBABILITY"
}

/** Required. The harm block threshold. */
export declare enum HarmBlockThreshold {
    /**
     * Unspecified harm block threshold.
     */
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
    /**
     * Block low threshold and above (i.e. block more).
     */
    BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
    /**
     * Block medium threshold and above.
     */
    BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
    /**
     * Block only high threshold (i.e. block less).
     */
    BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
    /**
     * Block none.
     */
    BLOCK_NONE = "BLOCK_NONE",
    /**
     * Turn off the safety filter.
     */
    OFF = "OFF"
}

/** Required. Harm category. */
export declare enum HarmCategory {
    /**
     * The harm category is unspecified.
     */
    HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
    /**
     * The harm category is hate speech.
     */
    HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
    /**
     * The harm category is dangerous content.
     */
    HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
    /**
     * The harm category is harassment.
     */
    HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
    /**
     * The harm category is sexually explicit content.
     */
    HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    /**
     * Deprecated: Election filter is not longer supported. The harm category is civic integrity.
     */
    HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY",
    /**
     * The harm category is image hate.
     */
    HARM_CATEGORY_IMAGE_HATE = "HARM_CATEGORY_IMAGE_HATE",
    /**
     * The harm category is image dangerous content.
     */
    HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT = "HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT",
    /**
     * The harm category is image harassment.
     */
    HARM_CATEGORY_IMAGE_HARASSMENT = "HARM_CATEGORY_IMAGE_HARASSMENT",
    /**
     * The harm category is image sexually explicit content.
     */
    HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT = "HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT"
}

/** Output only. Harm probability levels in the content. */
export declare enum HarmProbability {
    /**
     * Harm probability unspecified.
     */
    HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED",
    /**
     * Negligible level of harm.
     */
    NEGLIGIBLE = "NEGLIGIBLE",
    /**
     * Low level of harm.
     */
    LOW = "LOW",
    /**
     * Medium level of harm.
     */
    MEDIUM = "MEDIUM",
    /**
     * High level of harm.
     */
    HIGH = "HIGH"
}

/** Output only. Harm severity levels in the content. */
export declare enum HarmSeverity {
    /**
     * Harm severity unspecified.
     */
    HARM_SEVERITY_UNSPECIFIED = "HARM_SEVERITY_UNSPECIFIED",
    /**
     * Negligible level of harm severity.
     */
    HARM_SEVERITY_NEGLIGIBLE = "HARM_SEVERITY_NEGLIGIBLE",
    /**
     * Low level of harm severity.
     */
    HARM_SEVERITY_LOW = "HARM_SEVERITY_LOW",
    /**
     * Medium level of harm severity.
     */
    HARM_SEVERITY_MEDIUM = "HARM_SEVERITY_MEDIUM",
    /**
     * High level of harm severity.
     */
    HARM_SEVERITY_HIGH = "HARM_SEVERITY_HIGH"
}

/** HTTP options to be used in each of the requests. */
export declare interface HttpOptions {
    /** The base URL for the AI platform service endpoint. */
    baseUrl?: string;
    /** Specifies the version of the API to use. */
    apiVersion?: string;
    /** Additional HTTP headers to be sent with the request. */
    headers?: Record<string, string>;
    /** Timeout for the request in milliseconds. */
    timeout?: number;
    /** Extra parameters to add to the request body.
     The structure must match the backend API's request structure.
     - VertexAI backend API docs: https://cloud.google.com/vertex-ai/docs/reference/rest
     - GeminiAPI backend API docs: https://ai.google.dev/api/rest */
    extraBody?: Record<string, unknown>;
}

/**
 * Represents the necessary information to send a request to an API endpoint.
 * This interface defines the structure for constructing and executing HTTP
 * requests.
 */
declare interface HttpRequest {
    /**
     * URL path from the modules, this path is appended to the base API URL to
     * form the complete request URL.
     *
     * If you wish to set full URL, use httpOptions.baseUrl instead. Example to
     * set full URL in the request:
     *
     * const request: HttpRequest = {
     *   path: '',
     *   httpOptions: {
     *     baseUrl: 'https://<custom-full-url>',
     *     apiVersion: '',
     *   },
     *   httpMethod: 'GET',
     * };
     *
     * The result URL will be: https://<custom-full-url>
     *
     */
    path: string;
    /**
     * Optional query parameters to be appended to the request URL.
     */
    queryParams?: Record<string, string>;
    /**
     * Optional request body in json string or Blob format, GET request doesn't
     * need a request body.
     */
    body?: string | Blob;
    /**
     * The HTTP method to be used for the request.
     */
    httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    /**
     * Optional set of customizable configuration for HTTP requests.
     */
    httpOptions?: HttpOptions;
    /**
     * Optional abort signal which can be used to cancel the request.
     */
    abortSignal?: AbortSignal;
}

/** A wrapper class for the http response. */
export declare class HttpResponse {
    /** Used to retain the processed HTTP headers in the response. */
    headers?: Record<string, string>;
    /**
     * The original http response.
     */
    responseInternal: Response;
    constructor(response: Response);
    json(): Promise<unknown>;
}

/** An image. */
declare interface Image_2 {
    /** The Cloud Storage URI of the image. ``Image`` can contain a value
     for this field or the ``image_bytes`` field but not both. */
    gcsUri?: string;
    /** The image bytes data. ``Image`` can contain a value for this field
     or the ``gcs_uri`` field but not both.
     * @remarks Encoded as base64 string. */
    imageBytes?: string;
    /** The MIME type of the image. */
    mimeType?: string;
}
export { Image_2 as Image }

/** Enum that specifies the language of the text in the prompt. */
export declare enum ImagePromptLanguage {
    /**
     * Auto-detect the language.
     */
    auto = "auto",
    /**
     * English
     */
    en = "en",
    /**
     * Japanese
     */
    ja = "ja",
    /**
     * Korean
     */
    ko = "ko",
    /**
     * Hindi
     */
    hi = "hi",
    /**
     * Chinese
     */
    zh = "zh",
    /**
     * Portuguese
     */
    pt = "pt",
    /**
     * Spanish
     */
    es = "es"
}

/** Config for `inlined_embedding_responses` parameter. */
export declare class InlinedEmbedContentResponse {
    /** The response to the request.
     */
    response?: SingleEmbedContentResponse;
    /** The error encountered while processing the request.
     */
    error?: JobError;
}

/** Config for inlined request. */
export declare interface InlinedRequest {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model?: string;
    /** Content of the request.
     */
    contents?: ContentListUnion;
    /** Configuration that contains optional model parameters.
     */
    config?: GenerateContentConfig;
}

/** Config for `inlined_responses` parameter. */
export declare class InlinedResponse {
    /** The response to the request.
     */
    response?: GenerateContentResponse;
    /** The error encountered while processing the request.
     */
    error?: JobError;
}

/** Represents a time interval, encoded as a start time (inclusive) and an end time (exclusive).

 The start time must be less than or equal to the end time.
 When the start equals the end time, the interval is an empty interval.
 (matches no time)
 When both start and end are unspecified, the interval matches any time.
 */
export declare interface Interval {
    /** The start time of the interval. */
    startTime?: string;
    /** The end time of the interval. */
    endTime?: string;
}

/** Job error. */
export declare interface JobError {
    /** A list of messages that carry the error details. There is a common set of message types for APIs to use. */
    details?: string[];
    /** The status code. */
    code?: number;
    /** A developer-facing error message, which should be in English. Any user-facing error message should be localized and sent in the `details` field. */
    message?: string;
}

/** Job state. */
export declare enum JobState {
    /**
     * The job state is unspecified.
     */
    JOB_STATE_UNSPECIFIED = "JOB_STATE_UNSPECIFIED",
    /**
     * The job has been just created or resumed and processing has not yet begun.
     */
    JOB_STATE_QUEUED = "JOB_STATE_QUEUED",
    /**
     * The service is preparing to run the job.
     */
    JOB_STATE_PENDING = "JOB_STATE_PENDING",
    /**
     * The job is in progress.
     */
    JOB_STATE_RUNNING = "JOB_STATE_RUNNING",
    /**
     * The job completed successfully.
     */
    JOB_STATE_SUCCEEDED = "JOB_STATE_SUCCEEDED",
    /**
     * The job failed.
     */
    JOB_STATE_FAILED = "JOB_STATE_FAILED",
    /**
     * The job is being cancelled. From this state the job may only go to either `JOB_STATE_SUCCEEDED`, `JOB_STATE_FAILED` or `JOB_STATE_CANCELLED`.
     */
    JOB_STATE_CANCELLING = "JOB_STATE_CANCELLING",
    /**
     * The job has been cancelled.
     */
    JOB_STATE_CANCELLED = "JOB_STATE_CANCELLED",
    /**
     * The job has been stopped, and can be resumed.
     */
    JOB_STATE_PAUSED = "JOB_STATE_PAUSED",
    /**
     * The job has expired.
     */
    JOB_STATE_EXPIRED = "JOB_STATE_EXPIRED",
    /**
     * The job is being updated. Only jobs in the `JOB_STATE_RUNNING` state can be updated. After updating, the job goes back to the `JOB_STATE_RUNNING` state.
     */
    JOB_STATE_UPDATING = "JOB_STATE_UPDATING",
    /**
     * The job is partially succeeded, some results may be missing due to errors.
     */
    JOB_STATE_PARTIALLY_SUCCEEDED = "JOB_STATE_PARTIALLY_SUCCEEDED"
}

/** Required. Programming language of the `code`. */
export declare enum Language {
    /**
     * Unspecified language. This value should not be used.
     */
    LANGUAGE_UNSPECIFIED = "LANGUAGE_UNSPECIFIED",
    /**
     * Python >= 3.10, with numpy and simpy available.
     */
    PYTHON = "PYTHON"
}

/** An object that represents a latitude/longitude pair.

 This is expressed as a pair of doubles to represent degrees latitude and
 degrees longitude. Unless specified otherwise, this object must conform to the
 <a href="https://en.wikipedia.org/wiki/World_Geodetic_System#1984_version">
 WGS84 standard</a>. Values must be within normalized ranges.
 */
export declare interface LatLng {
    /** The latitude in degrees. It must be in the range [-90.0, +90.0]. */
    latitude?: number;
    /** The longitude in degrees. It must be in the range [-180.0, +180.0] */
    longitude?: number;
}

/** Config for optional parameters. */
export declare interface ListBatchJobsConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    pageSize?: number;
    pageToken?: string;
    filter?: string;
}

/** Config for batches.list parameters. */
export declare interface ListBatchJobsParameters {
    config?: ListBatchJobsConfig;
}

/** Config for batches.list return value. */
export declare class ListBatchJobsResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    nextPageToken?: string;
    batchJobs?: BatchJob[];
}

/** Config for caches.list method. */
export declare interface ListCachedContentsConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    pageSize?: number;
    pageToken?: string;
}

/** Parameters for caches.list method. */
export declare interface ListCachedContentsParameters {
    /** Configuration that contains optional parameters.
     */
    config?: ListCachedContentsConfig;
}

export declare class ListCachedContentsResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    nextPageToken?: string;
    /** List of cached contents.
     */
    cachedContents?: CachedContent[];
}

/** Used to override the default configuration. */
export declare interface ListFilesConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    pageSize?: number;
    pageToken?: string;
}

/** Generates the parameters for the list method. */
export declare interface ListFilesParameters {
    /** Used to override the default configuration. */
    config?: ListFilesConfig;
}

/** Response for the list files method. */
export declare class ListFilesResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** A token to retrieve next page of results. */
    nextPageToken?: string;
    /** The list of files. */
    files?: File_2[];
}

export declare interface ListModelsConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    pageSize?: number;
    pageToken?: string;
    filter?: string;
    /** Set true to list base models, false to list tuned models. */
    queryBase?: boolean;
}

export declare interface ListModelsParameters {
    config?: ListModelsConfig;
}

export declare class ListModelsResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    nextPageToken?: string;
    models?: Model[];
}

/** Configuration for the list tuning jobs method. */
export declare interface ListTuningJobsConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    pageSize?: number;
    pageToken?: string;
    filter?: string;
}

/** Parameters for the list tuning jobs method. */
export declare interface ListTuningJobsParameters {
    config?: ListTuningJobsConfig;
}

/** Response for the list tuning jobs method. */
export declare class ListTuningJobsResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** A token to retrieve the next page of results. Pass to ListTuningJobsRequest.page_token to obtain that page. */
    nextPageToken?: string;
    /** List of TuningJobs in the requested page. */
    tuningJobs?: TuningJob[];
}

/**
 Live class encapsulates the configuration for live interaction with the
 Generative Language API. It embeds ApiClient for general API settings.

 @experimental
 */
export declare class Live {
    private readonly apiClient;
    private readonly auth;
    private readonly webSocketFactory;
    readonly music: LiveMusic;
    constructor(apiClient: ApiClient, auth: Auth, webSocketFactory: WebSocketFactory);
    /**
     Establishes a connection to the specified model with the given
     configuration and returns a Session object representing that connection.

     @experimental Built-in MCP support is an experimental feature, may change in
     future versions.

     @remarks

     @param params - The parameters for establishing a connection to the model.
     @return A live session.

     @example
     ```ts
     let model: string;
     if (GOOGLE_GENAI_USE_VERTEXAI) {
     model = 'gemini-2.0-flash-live-preview-04-09';
     } else {
     model = 'gemini-live-2.5-flash-preview';
     }
     const session = await ai.live.connect({
     model: model,
     config: {
     responseModalities: [Modality.AUDIO],
     },
     callbacks: {
     onopen: () => {
     console.log('Connected to the socket.');
     },
     onmessage: (e: MessageEvent) => {
     console.log('Received message from the server: %s\n', debug(e.data));
     },
     onerror: (e: ErrorEvent) => {
     console.log('Error occurred: %s\n', debug(e.error));
     },
     onclose: (e: CloseEvent) => {
     console.log('Connection closed.');
     },
     },
     });
     ```
     */
    connect(params: types.LiveConnectParameters): Promise<Session>;
    private isCallableTool;
}

/** Callbacks for the live API. */
export declare interface LiveCallbacks {
    /**
     * Called when the websocket connection is established.
     */
    onopen?: (() => void) | null;
    /**
     * Called when a message is received from the server.
     */
    onmessage: (e: LiveServerMessage) => void;
    /**
     * Called when an error occurs.
     */
    onerror?: ((e: ErrorEvent) => void) | null;
    /**
     * Called when the websocket connection is closed.
     */
    onclose?: ((e: CloseEvent) => void) | null;
}

/** Incremental update of the current conversation delivered from the client.

 All the content here will unconditionally be appended to the conversation
 history and used as part of the prompt to the model to generate content.

 A message here will interrupt any current model generation.
 */
export declare interface LiveClientContent {
    /** The content appended to the current conversation with the model.

     For single-turn queries, this is a single instance. For multi-turn
     queries, this is a repeated field that contains conversation history and
     latest request.
     */
    turns?: Content[];
    /** If true, indicates that the server content generation should start with
     the currently accumulated prompt. Otherwise, the server will await
     additional messages before starting generation. */
    turnComplete?: boolean;
}

/** Messages sent by the client in the API call. */
export declare interface LiveClientMessage {
    /** Message to be sent by the system when connecting to the API. SDK users should not send this message. */
    setup?: LiveClientSetup;
    /** Incremental update of the current conversation delivered from the client. */
    clientContent?: LiveClientContent;
    /** User input that is sent in real time. */
    realtimeInput?: LiveClientRealtimeInput;
    /** Response to a `ToolCallMessage` received from the server. */
    toolResponse?: LiveClientToolResponse;
}

/** User input that is sent in real time.

 This is different from `LiveClientContent` in a few ways:

 - Can be sent continuously without interruption to model generation.
 - If there is a need to mix data interleaved across the
 `LiveClientContent` and the `LiveClientRealtimeInput`, server attempts to
 optimize for best response, but there are no guarantees.
 - End of turn is not explicitly specified, but is rather derived from user
 activity (for example, end of speech).
 - Even before the end of turn, the data is processed incrementally
 to optimize for a fast start of the response from the model.
 - Is always assumed to be the user's input (cannot be used to populate
 conversation history).
 */
export declare interface LiveClientRealtimeInput {
    /** Inlined bytes data for media input. */
    mediaChunks?: Blob_2[];
    /** The realtime audio input stream. */
    audio?: Blob_2;
    /**
     Indicates that the audio stream has ended, e.g. because the microphone was
     turned off.

     This should only be sent when automatic activity detection is enabled
     (which is the default).

     The client can reopen the stream by sending an audio message.
     */
    audioStreamEnd?: boolean;
    /** The realtime video input stream. */
    video?: Blob_2;
    /** The realtime text input stream. */
    text?: string;
    /** Marks the start of user activity. */
    activityStart?: ActivityStart;
    /** Marks the end of user activity. */
    activityEnd?: ActivityEnd;
}

/** Message contains configuration that will apply for the duration of the streaming session. */
export declare interface LiveClientSetup {
    /**
     The fully qualified name of the publisher model or tuned model endpoint to
     use.
     */
    model?: string;
    /** The generation configuration for the session.
     Note: only a subset of fields are supported.
     */
    generationConfig?: GenerationConfig;
    /** The user provided system instructions for the model.
     Note: only text should be used in parts and content in each part will be
     in a separate paragraph. */
    systemInstruction?: ContentUnion;
    /**  A list of `Tools` the model may use to generate the next response.

     A `Tool` is a piece of code that enables the system to interact with
     external systems to perform an action, or set of actions, outside of
     knowledge and scope of the model. */
    tools?: ToolListUnion;
    /** Configures the realtime input behavior in BidiGenerateContent. */
    realtimeInputConfig?: RealtimeInputConfig;
    /** Configures session resumption mechanism.

     If included server will send SessionResumptionUpdate messages. */
    sessionResumption?: SessionResumptionConfig;
    /** Configures context window compression mechanism.

     If included, server will compress context window to fit into given length. */
    contextWindowCompression?: ContextWindowCompressionConfig;
    /** The transcription of the input aligns with the input audio language.
     */
    inputAudioTranscription?: AudioTranscriptionConfig;
    /** The transcription of the output aligns with the language code
     specified for the output audio.
     */
    outputAudioTranscription?: AudioTranscriptionConfig;
    /** Configures the proactivity of the model. This allows the model to respond proactively to
     the input and to ignore irrelevant input. */
    proactivity?: ProactivityConfig;
}

/** Client generated response to a `ToolCall` received from the server.

 Individual `FunctionResponse` objects are matched to the respective
 `FunctionCall` objects by the `id` field.

 Note that in the unary and server-streaming GenerateContent APIs function
 calling happens by exchanging the `Content` parts, while in the bidi
 GenerateContent APIs function calling happens over this dedicated set of
 messages.
 */
export declare class LiveClientToolResponse {
    /** The response to the function calls. */
    functionResponses?: FunctionResponse[];
}

/** Session config for the API connection. */
export declare interface LiveConnectConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The generation configuration for the session. */
    generationConfig?: GenerationConfig;
    /** The requested modalities of the response. Represents the set of
     modalities that the model can return. Defaults to AUDIO if not specified.
     */
    responseModalities?: Modality[];
    /** Value that controls the degree of randomness in token selection.
     Lower temperatures are good for prompts that require a less open-ended or
     creative response, while higher temperatures can lead to more diverse or
     creative results.
     */
    temperature?: number;
    /** Tokens are selected from the most to least probable until the sum
     of their probabilities equals this value. Use a lower value for less
     random responses and a higher value for more random responses.
     */
    topP?: number;
    /** For each token selection step, the ``top_k`` tokens with the
     highest probabilities are sampled. Then tokens are further filtered based
     on ``top_p`` with the final token selected using temperature sampling. Use
     a lower number for less random responses and a higher number for more
     random responses.
     */
    topK?: number;
    /** Maximum number of tokens that can be generated in the response.
     */
    maxOutputTokens?: number;
    /** If specified, the media resolution specified will be used.
     */
    mediaResolution?: MediaResolution;
    /** When ``seed`` is fixed to a specific number, the model makes a best
     effort to provide the same response for repeated requests. By default, a
     random number is used.
     */
    seed?: number;
    /** The speech generation configuration.
     */
    speechConfig?: SpeechConfig;
    /** If enabled, the model will detect emotions and adapt its responses accordingly. */
    enableAffectiveDialog?: boolean;
    /** The user provided system instructions for the model.
     Note: only text should be used in parts and content in each part will be
     in a separate paragraph. */
    systemInstruction?: ContentUnion;
    /** A list of `Tools` the model may use to generate the next response.

     A `Tool` is a piece of code that enables the system to interact with
     external systems to perform an action, or set of actions, outside of
     knowledge and scope of the model. */
    tools?: ToolListUnion;
    /** Configures session resumption mechanism.

     If included the server will send SessionResumptionUpdate messages. */
    sessionResumption?: SessionResumptionConfig;
    /** The transcription of the input aligns with the input audio language.
     */
    inputAudioTranscription?: AudioTranscriptionConfig;
    /** The transcription of the output aligns with the language code
     specified for the output audio.
     */
    outputAudioTranscription?: AudioTranscriptionConfig;
    /** Configures the realtime input behavior in BidiGenerateContent. */
    realtimeInputConfig?: RealtimeInputConfig;
    /** Configures context window compression mechanism.

     If included, server will compress context window to fit into given length. */
    contextWindowCompression?: ContextWindowCompressionConfig;
    /** Configures the proactivity of the model. This allows the model to respond proactively to
     the input and to ignore irrelevant input. */
    proactivity?: ProactivityConfig;
}

/** Config for LiveConnectConstraints for Auth Token creation. */
export declare interface LiveConnectConstraints {
    /** ID of the model to configure in the ephemeral token for Live API.
     For a list of models, see `Gemini models
     <https://ai.google.dev/gemini-api/docs/models>`. */
    model?: string;
    /** Configuration specific to Live API connections created using this token. */
    config?: LiveConnectConfig;
}

/** Parameters for connecting to the live API. */
export declare interface LiveConnectParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** callbacks */
    callbacks: LiveCallbacks;
    /** Optional configuration parameters for the request.
     */
    config?: LiveConnectConfig;
}

/**
 LiveMusic class encapsulates the configuration for live music
 generation via Lyria Live models.

 @experimental
 */
declare class LiveMusic {
    private readonly apiClient;
    private readonly auth;
    private readonly webSocketFactory;
    constructor(apiClient: ApiClient, auth: Auth, webSocketFactory: WebSocketFactory);
    /**
     Establishes a connection to the specified model and returns a
     LiveMusicSession object representing that connection.

     @experimental

     @remarks

     @param params - The parameters for establishing a connection to the model.
     @return A live session.

     @example
     ```ts
     let model = 'models/lyria-realtime-exp';
     const session = await ai.live.music.connect({
     model: model,
     callbacks: {
     onmessage: (e: MessageEvent) => {
     console.log('Received message from the server: %s\n', debug(e.data));
     },
     onerror: (e: ErrorEvent) => {
     console.log('Error occurred: %s\n', debug(e.error));
     },
     onclose: (e: CloseEvent) => {
     console.log('Connection closed.');
     },
     },
     });
     ```
     */
    connect(params: types.LiveMusicConnectParameters): Promise<LiveMusicSession>;
}

/** Callbacks for the realtime music API. */
export declare interface LiveMusicCallbacks {
    /**
     * Called when a message is received from the server.
     */
    onmessage: (e: LiveMusicServerMessage) => void;
    /**
     * Called when an error occurs.
     */
    onerror?: ((e: ErrorEvent) => void) | null;
    /**
     * Called when the websocket connection is closed.
     */
    onclose?: ((e: CloseEvent) => void) | null;
}

/** User input to start or steer the music. */
export declare interface LiveMusicClientContent {
    /** Weighted prompts as the model input. */
    weightedPrompts?: WeightedPrompt[];
}

/** Messages sent by the client in the LiveMusicClientMessage call. */
export declare interface LiveMusicClientMessage {
    /** Message to be sent in the first (and only in the first) `LiveMusicClientMessage`.
     Clients should wait for a `LiveMusicSetupComplete` message before
     sending any additional messages. */
    setup?: LiveMusicClientSetup;
    /** User input to influence music generation. */
    clientContent?: LiveMusicClientContent;
    /** Configuration for music generation. */
    musicGenerationConfig?: LiveMusicGenerationConfig;
    /** Playback control signal for the music generation. */
    playbackControl?: LiveMusicPlaybackControl;
}

/** Message to be sent by the system when connecting to the API. */
export declare interface LiveMusicClientSetup {
    /** The model's resource name. Format: `models/{model}`. */
    model?: string;
}

/** Parameters for connecting to the live API. */
export declare interface LiveMusicConnectParameters {
    /** The model's resource name. */
    model: string;
    /** Callbacks invoked on server events. */
    callbacks: LiveMusicCallbacks;
}

/** A prompt that was filtered with the reason. */
export declare interface LiveMusicFilteredPrompt {
    /** The text prompt that was filtered. */
    text?: string;
    /** The reason the prompt was filtered. */
    filteredReason?: string;
}

/** Configuration for music generation. */
export declare interface LiveMusicGenerationConfig {
    /** Controls the variance in audio generation. Higher values produce
     higher variance. Range is [0.0, 3.0]. */
    temperature?: number;
    /** Controls how the model selects tokens for output. Samples the topK
     tokens with the highest probabilities. Range is [1, 1000]. */
    topK?: number;
    /** Seeds audio generation. If not set, the request uses a randomly
     generated seed. */
    seed?: number;
    /** Controls how closely the model follows prompts.
     Higher guidance follows more closely, but will make transitions more
     abrupt. Range is [0.0, 6.0]. */
    guidance?: number;
    /** Beats per minute. Range is [60, 200]. */
    bpm?: number;
    /** Density of sounds. Range is [0.0, 1.0]. */
    density?: number;
    /** Brightness of the music. Range is [0.0, 1.0]. */
    brightness?: number;
    /** Scale of the generated music. */
    scale?: Scale;
    /** Whether the audio output should contain bass. */
    muteBass?: boolean;
    /** Whether the audio output should contain drums. */
    muteDrums?: boolean;
    /** Whether the audio output should contain only bass and drums. */
    onlyBassAndDrums?: boolean;
    /** The mode of music generation. Default mode is QUALITY. */
    musicGenerationMode?: MusicGenerationMode;
}

/** The playback control signal to apply to the music generation. */
export declare enum LiveMusicPlaybackControl {
    /**
     * This value is unused.
     */
    PLAYBACK_CONTROL_UNSPECIFIED = "PLAYBACK_CONTROL_UNSPECIFIED",
    /**
     * Start generating the music.
     */
    PLAY = "PLAY",
    /**
     * Hold the music generation. Use PLAY to resume from the current position.
     */
    PAUSE = "PAUSE",
    /**
     * Stop the music generation and reset the context (prompts retained).
     Use PLAY to restart the music generation.
     */
    STOP = "STOP",
    /**
     * Reset the context of the music generation without stopping it.
     Retains the current prompts and config.
     */
    RESET_CONTEXT = "RESET_CONTEXT"
}

/** Server update generated by the model in response to client messages.

 Content is generated as quickly as possible, and not in real time.
 Clients may choose to buffer and play it out in real time.
 */
export declare interface LiveMusicServerContent {
    /** The audio chunks that the model has generated. */
    audioChunks?: AudioChunk[];
}

/** Response message for the LiveMusicClientMessage call. */
export declare class LiveMusicServerMessage {
    /** Message sent in response to a `LiveMusicClientSetup` message from the client.
     Clients should wait for this message before sending any additional messages. */
    setupComplete?: LiveMusicServerSetupComplete;
    /** Content generated by the model in response to client messages. */
    serverContent?: LiveMusicServerContent;
    /** A prompt that was filtered with the reason. */
    filteredPrompt?: LiveMusicFilteredPrompt;
    /**
     * Returns the first audio chunk from the server content, if present.
     *
     * @remarks
     * If there are no audio chunks in the response, undefined will be returned.
     */
    get audioChunk(): AudioChunk | undefined;
}

/** Sent in response to a `LiveMusicClientSetup` message from the client. */
export declare interface LiveMusicServerSetupComplete {
}

/**
 Represents a connection to the API.

 @experimental
 */
export declare class LiveMusicSession {
    readonly conn: WebSocket_2;
    private readonly apiClient;
    constructor(conn: WebSocket_2, apiClient: ApiClient);
    /**
     Sets inputs to steer music generation. Updates the session's current
     weighted prompts.

     @param params - Contains one property, `weightedPrompts`.

     - `weightedPrompts` to send to the model; weights are normalized to
     sum to 1.0.

     @experimental
     */
    setWeightedPrompts(params: types.LiveMusicSetWeightedPromptsParameters): Promise<void>;
    /**
     Sets a configuration to the model. Updates the session's current
     music generation config.

     @param params - Contains one property, `musicGenerationConfig`.

     - `musicGenerationConfig` to set in the model. Passing an empty or
     undefined config to the model will reset the config to defaults.

     @experimental
     */
    setMusicGenerationConfig(params: types.LiveMusicSetConfigParameters): Promise<void>;
    private sendPlaybackControl;
    /**
     * Start the music stream.
     *
     * @experimental
     */
    play(): void;
    /**
     * Temporarily halt the music stream. Use `play` to resume from the current
     * position.
     *
     * @experimental
     */
    pause(): void;
    /**
     * Stop the music stream and reset the state. Retains the current prompts
     * and config.
     *
     * @experimental
     */
    stop(): void;
    /**
     * Resets the context of the music generation without stopping it.
     * Retains the current prompts and config.
     *
     * @experimental
     */
    resetContext(): void;
    /**
     Terminates the WebSocket connection.

     @experimental
     */
    close(): void;
}

/** Parameters for setting config for the live music API. */
export declare interface LiveMusicSetConfigParameters {
    /** Configuration for music generation. */
    musicGenerationConfig: LiveMusicGenerationConfig;
}

/** Parameters for setting weighted prompts for the live music API. */
export declare interface LiveMusicSetWeightedPromptsParameters {
    /** A map of text prompts to weights to use for the generation request. */
    weightedPrompts: WeightedPrompt[];
}

/** Prompts and config used for generating this audio chunk. */
export declare interface LiveMusicSourceMetadata {
    /** Weighted prompts for generating this audio chunk. */
    clientContent?: LiveMusicClientContent;
    /** Music generation config for generating this audio chunk. */
    musicGenerationConfig?: LiveMusicGenerationConfig;
}

/** Parameters for sending client content to the live API. */
export declare interface LiveSendClientContentParameters {
    /** Client content to send to the session. */
    turns?: ContentListUnion;
    /** If true, indicates that the server content generation should start with
     the currently accumulated prompt. Otherwise, the server will await
     additional messages before starting generation. */
    turnComplete?: boolean;
}

/** Parameters for sending realtime input to the live API. */
export declare interface LiveSendRealtimeInputParameters {
    /** Realtime input to send to the session. */
    media?: BlobImageUnion;
    /** The realtime audio input stream. */
    audio?: Blob_2;
    /**
     Indicates that the audio stream has ended, e.g. because the microphone was
     turned off.

     This should only be sent when automatic activity detection is enabled
     (which is the default).

     The client can reopen the stream by sending an audio message.
     */
    audioStreamEnd?: boolean;
    /** The realtime video input stream. */
    video?: BlobImageUnion;
    /** The realtime text input stream. */
    text?: string;
    /** Marks the start of user activity. */
    activityStart?: ActivityStart;
    /** Marks the end of user activity. */
    activityEnd?: ActivityEnd;
}

/** Parameters for sending tool responses to the live API. */
export declare class LiveSendToolResponseParameters {
    /** Tool responses to send to the session. */
    functionResponses: FunctionResponse[] | FunctionResponse;
}

/** Incremental server update generated by the model in response to client messages.

 Content is generated as quickly as possible, and not in real time. Clients
 may choose to buffer and play it out in real time.
 */
export declare interface LiveServerContent {
    /** The content that the model has generated as part of the current conversation with the user. */
    modelTurn?: Content;
    /** If true, indicates that the model is done generating. Generation will only start in response to additional client messages. Can be set alongside `content`, indicating that the `content` is the last in the turn. */
    turnComplete?: boolean;
    /** If true, indicates that a client message has interrupted current model generation. If the client is playing out the content in realtime, this is a good signal to stop and empty the current queue. */
    interrupted?: boolean;
    /** Metadata returned to client when grounding is enabled. */
    groundingMetadata?: GroundingMetadata;
    /** If true, indicates that the model is done generating. When model is
     interrupted while generating there will be no generation_complete message
     in interrupted turn, it will go through interrupted > turn_complete.
     When model assumes realtime playback there will be delay between
     generation_complete and turn_complete that is caused by model
     waiting for playback to finish. If true, indicates that the model
     has finished generating all content. This is a signal to the client
     that it can stop sending messages. */
    generationComplete?: boolean;
    /** Input transcription. The transcription is independent to the model
     turn which means it doesn’t imply any ordering between transcription and
     model turn. */
    inputTranscription?: Transcription;
    /** Output transcription. The transcription is independent to the model
     turn which means it doesn’t imply any ordering between transcription and
     model turn.
     */
    outputTranscription?: Transcription;
    /** Metadata related to url context retrieval tool. */
    urlContextMetadata?: UrlContextMetadata;
}

/** Server will not be able to service client soon. */
export declare interface LiveServerGoAway {
    /** The remaining time before the connection will be terminated as ABORTED. The minimal time returned here is specified differently together with the rate limits for a given model. */
    timeLeft?: string;
}

/** Response message for API call. */
export declare class LiveServerMessage {
    /** Sent in response to a `LiveClientSetup` message from the client. */
    setupComplete?: LiveServerSetupComplete;
    /** Content generated by the model in response to client messages. */
    serverContent?: LiveServerContent;
    /** Request for the client to execute the `function_calls` and return the responses with the matching `id`s. */
    toolCall?: LiveServerToolCall;
    /** Notification for the client that a previously issued `ToolCallMessage` with the specified `id`s should have been not executed and should be cancelled. */
    toolCallCancellation?: LiveServerToolCallCancellation;
    /** Usage metadata about model response(s). */
    usageMetadata?: UsageMetadata;
    /** Server will disconnect soon. */
    goAway?: LiveServerGoAway;
    /** Update of the session resumption state. */
    sessionResumptionUpdate?: LiveServerSessionResumptionUpdate;
    /**
     * Returns the concatenation of all text parts from the server content if present.
     *
     * @remarks
     * If there are non-text parts in the response, the concatenation of all text
     * parts will be returned, and a warning will be logged.
     */
    get text(): string | undefined;
    /**
     * Returns the concatenation of all inline data parts from the server content if present.
     *
     * @remarks
     * If there are non-inline data parts in the
     * response, the concatenation of all inline data parts will be returned, and
     * a warning will be logged.
     */
    get data(): string | undefined;
}

/** Update of the session resumption state.

 Only sent if `session_resumption` was set in the connection config.
 */
export declare interface LiveServerSessionResumptionUpdate {
    /** New handle that represents state that can be resumed. Empty if `resumable`=false. */
    newHandle?: string;
    /** True if session can be resumed at this point. It might be not possible to resume session at some points. In that case we send update empty new_handle and resumable=false. Example of such case could be model executing function calls or just generating. Resuming session (using previous session token) in such state will result in some data loss. */
    resumable?: boolean;
    /** Index of last message sent by client that is included in state represented by this SessionResumptionToken. Only sent when `SessionResumptionConfig.transparent` is set.

     Presence of this index allows users to transparently reconnect and avoid issue of losing some part of realtime audio input/video. If client wishes to temporarily disconnect (for example as result of receiving GoAway) they can do it without losing state by buffering messages sent since last `SessionResmumptionTokenUpdate`. This field will enable them to limit buffering (avoid keeping all requests in RAM).

     Note: This should not be used for when resuming a session at some time later -- in those cases partial audio and video frames arelikely not needed. */
    lastConsumedClientMessageIndex?: string;
}

/** Sent in response to a `LiveGenerateContentSetup` message from the client. */
export declare interface LiveServerSetupComplete {
    /** The session id of the live session. */
    sessionId?: string;
}

/** Request for the client to execute the `function_calls` and return the responses with the matching `id`s. */
export declare interface LiveServerToolCall {
    /** The function call to be executed. */
    functionCalls?: FunctionCall[];
}

/** Notification for the client that a previously issued `ToolCallMessage` with the specified `id`s should have been not executed and should be cancelled.

 If there were side-effects to those tool calls, clients may attempt to undo
 the tool calls. This message occurs only in cases where the clients interrupt
 server turns.
 */
export declare interface LiveServerToolCallCancellation {
    /** The ids of the tool calls to be cancelled. */
    ids?: string[];
}

/** Logprobs Result */
export declare interface LogprobsResult {
    /** Length = total number of decoding steps. The chosen candidates may or may not be in top_candidates. */
    chosenCandidates?: LogprobsResultCandidate[];
    /** Length = total number of decoding steps. */
    topCandidates?: LogprobsResultTopCandidates[];
}

/** Candidate for the logprobs token and score. */
export declare interface LogprobsResultCandidate {
    /** The candidate's log probability. */
    logProbability?: number;
    /** The candidate's token string value. */
    token?: string;
    /** The candidate's token id value. */
    tokenId?: number;
}

/** Candidates with top log probabilities at each decoding step. */
export declare interface LogprobsResultTopCandidates {
    /** Sorted by log probability in descending order. */
    candidates?: LogprobsResultCandidate[];
}

/** Configuration for a Mask reference image. */
export declare interface MaskReferenceConfig {
    /** Prompts the model to generate a mask instead of you needing to
     provide one (unless MASK_MODE_USER_PROVIDED is used). */
    maskMode?: MaskReferenceMode;
    /** A list of up to 5 class ids to use for semantic segmentation.
     Automatically creates an image mask based on specific objects. */
    segmentationClasses?: number[];
    /** Dilation percentage of the mask provided.
     Float between 0 and 1. */
    maskDilation?: number;
}

/** A mask reference image.

 This encapsulates either a mask image provided by the user and configs for
 the user provided mask, or only config parameters for the model to generate
 a mask.

 A mask image is an image whose non-zero values indicate where to edit the base
 image. If the user provides a mask image, the mask must be in the same
 dimensions as the raw image.
 */
export declare class MaskReferenceImage {
    /** The reference image for the editing operation. */
    referenceImage?: Image_2;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Configuration for the mask reference image. */
    config?: MaskReferenceConfig;
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI(): ReferenceImageAPIInternal;
}

/** Enum representing the mask mode of a mask reference image. */
export declare enum MaskReferenceMode {
    MASK_MODE_DEFAULT = "MASK_MODE_DEFAULT",
    MASK_MODE_USER_PROVIDED = "MASK_MODE_USER_PROVIDED",
    MASK_MODE_BACKGROUND = "MASK_MODE_BACKGROUND",
    MASK_MODE_FOREGROUND = "MASK_MODE_FOREGROUND",
    MASK_MODE_SEMANTIC = "MASK_MODE_SEMANTIC"
}

/**
 * Creates a McpCallableTool from MCP clients and an optional config.
 *
 * The callable tool can invoke the MCP clients with given function call
 * arguments. (often for automatic function calling).
 * Use the config to modify tool parameters such as behavior.
 *
 * @experimental Built-in MCP support is an experimental feature, may change in future
 * versions.
 */
export declare function mcpToTool(...args: [...Client[], CallableToolConfig | Client]): CallableTool;

/** Server content modalities. */
export declare enum MediaModality {
    /**
     * The modality is unspecified.
     */
    MODALITY_UNSPECIFIED = "MODALITY_UNSPECIFIED",
    /**
     * Plain text.
     */
    TEXT = "TEXT",
    /**
     * Images.
     */
    IMAGE = "IMAGE",
    /**
     * Video.
     */
    VIDEO = "VIDEO",
    /**
     * Audio.
     */
    AUDIO = "AUDIO",
    /**
     * Document, e.g. PDF.
     */
    DOCUMENT = "DOCUMENT"
}

/** The media resolution to use. */
export declare enum MediaResolution {
    /**
     * Media resolution has not been set
     */
    MEDIA_RESOLUTION_UNSPECIFIED = "MEDIA_RESOLUTION_UNSPECIFIED",
    /**
     * Media resolution set to low (64 tokens).
     */
    MEDIA_RESOLUTION_LOW = "MEDIA_RESOLUTION_LOW",
    /**
     * Media resolution set to medium (256 tokens).
     */
    MEDIA_RESOLUTION_MEDIUM = "MEDIA_RESOLUTION_MEDIUM",
    /**
     * Media resolution set to high (zoomed reframing with 256 tokens).
     */
    MEDIA_RESOLUTION_HIGH = "MEDIA_RESOLUTION_HIGH"
}

/** Server content modalities. */
export declare enum Modality {
    /**
     * The modality is unspecified.
     */
    MODALITY_UNSPECIFIED = "MODALITY_UNSPECIFIED",
    /**
     * Indicates the model should return text
     */
    TEXT = "TEXT",
    /**
     * Indicates the model should return images.
     */
    IMAGE = "IMAGE",
    /**
     * Indicates the model should return audio.
     */
    AUDIO = "AUDIO"
}

/** Represents token counting info for a single modality. */
export declare interface ModalityTokenCount {
    /** The modality associated with this token count. */
    modality?: MediaModality;
    /** Number of tokens. */
    tokenCount?: number;
}

/** The mode of the predictor to be used in dynamic retrieval. */
export declare enum Mode {
    /**
     * Always trigger retrieval.
     */
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    /**
     * Run retrieval only when system decides it is necessary.
     */
    MODE_DYNAMIC = "MODE_DYNAMIC"
}

/** A trained machine learning model. */
export declare interface Model {
    /** Resource name of the model. */
    name?: string;
    /** Display name of the model. */
    displayName?: string;
    /** Description of the model. */
    description?: string;
    /** Version ID of the model. A new version is committed when a new
     model version is uploaded or trained under an existing model ID. The
     version ID is an auto-incrementing decimal number in string
     representation. */
    version?: string;
    /** List of deployed models created from this base model. Note that a
     model could have been deployed to endpoints in different locations. */
    endpoints?: Endpoint[];
    /** Labels with user-defined metadata to organize your models. */
    labels?: Record<string, string>;
    /** Information about the tuned model from the base model. */
    tunedModelInfo?: TunedModelInfo;
    /** The maximum number of input tokens that the model can handle. */
    inputTokenLimit?: number;
    /** The maximum number of output tokens that the model can generate. */
    outputTokenLimit?: number;
    /** List of actions that are supported by the model. */
    supportedActions?: string[];
    /** The default checkpoint id of a model version.
     */
    defaultCheckpointId?: string;
    /** The checkpoints of the model. */
    checkpoints?: Checkpoint[];
}

export declare class Models extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Makes an API request to generate content with a given model.
     *
     * For the `model` parameter, supported formats for Vertex AI API include:
     * - The Gemini model ID, for example: 'gemini-2.0-flash'
     * - The full resource name starts with 'projects/', for example:
     *  'projects/my-project-id/locations/us-central1/publishers/google/models/gemini-2.0-flash'
     * - The partial resource name with 'publishers/', for example:
     *  'publishers/google/models/gemini-2.0-flash' or
     *  'publishers/meta/models/llama-3.1-405b-instruct-maas'
     * - `/` separated publisher and model name, for example:
     * 'google/gemini-2.0-flash' or 'meta/llama-3.1-405b-instruct-maas'
     *
     * For the `model` parameter, supported formats for Gemini API include:
     * - The Gemini model ID, for example: 'gemini-2.0-flash'
     * - The model name starts with 'models/', for example:
     *  'models/gemini-2.0-flash'
     * - For tuned models, the model name starts with 'tunedModels/',
     * for example:
     * 'tunedModels/1234567890123456789'
     *
     * Some models support multimodal input and output.
     *
     * @param params - The parameters for generating content.
     * @return The response from generating content.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents: 'why is the sky blue?',
     *   config: {
     *     candidateCount: 2,
     *   }
     * });
     * console.log(response);
     * ```
     */
    generateContent: (params: types.GenerateContentParameters) => Promise<types.GenerateContentResponse>;
    /**
     * This logic is needed for GenerateContentConfig only.
     * Previously we made GenerateContentConfig.responseSchema field to accept
     * unknown. Since v1.9.0, we switch to use backend JSON schema support.
     * To maintain backward compatibility, we move the data that was treated as
     * JSON schema from the responseSchema field to the responseJsonSchema field.
     */
    private maybeMoveToResponseJsonSchem;
    /**
     * Makes an API request to generate content with a given model and yields the
     * response in chunks.
     *
     * For the `model` parameter, supported formats for Vertex AI API include:
     * - The Gemini model ID, for example: 'gemini-2.0-flash'
     * - The full resource name starts with 'projects/', for example:
     *  'projects/my-project-id/locations/us-central1/publishers/google/models/gemini-2.0-flash'
     * - The partial resource name with 'publishers/', for example:
     *  'publishers/google/models/gemini-2.0-flash' or
     *  'publishers/meta/models/llama-3.1-405b-instruct-maas'
     * - `/` separated publisher and model name, for example:
     * 'google/gemini-2.0-flash' or 'meta/llama-3.1-405b-instruct-maas'
     *
     * For the `model` parameter, supported formats for Gemini API include:
     * - The Gemini model ID, for example: 'gemini-2.0-flash'
     * - The model name starts with 'models/', for example:
     *  'models/gemini-2.0-flash'
     * - For tuned models, the model name starts with 'tunedModels/',
     * for example:
     *  'tunedModels/1234567890123456789'
     *
     * Some models support multimodal input and output.
     *
     * @param params - The parameters for generating content with streaming response.
     * @return The response from generating content.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContentStream({
     *   model: 'gemini-2.0-flash',
     *   contents: 'why is the sky blue?',
     *   config: {
     *     maxOutputTokens: 200,
     *   }
     * });
     * for await (const chunk of response) {
     *   console.log(chunk);
     * }
     * ```
     */
    generateContentStream: (params: types.GenerateContentParameters) => Promise<AsyncGenerator<types.GenerateContentResponse>>;
    /**
     * Transforms the CallableTools in the parameters to be simply Tools, it
     * copies the params into a new object and replaces the tools, it does not
     * modify the original params. Also sets the MCP usage header if there are
     * MCP tools in the parameters.
     */
    private processParamsMaybeAddMcpUsage;
    private initAfcToolsMap;
    private processAfcStream;
    /**
     * Generates an image based on a text description and configuration.
     *
     * @param params - The parameters for generating images.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await client.models.generateImages({
     *  model: 'imagen-3.0-generate-002',
     *  prompt: 'Robot holding a red skateboard',
     *  config: {
     *    numberOfImages: 1,
     *    includeRaiReason: true,
     *  },
     * });
     * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
     * ```
     */
    generateImages: (params: types.GenerateImagesParameters) => Promise<types.GenerateImagesResponse>;
    list: (params?: types.ListModelsParameters) => Promise<Pager<types.Model>>;
    /**
     * Edits an image based on a prompt, list of reference images, and configuration.
     *
     * @param params - The parameters for editing an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await client.models.editImage({
     *  model: 'imagen-3.0-capability-001',
     *  prompt: 'Generate an image containing a mug with the product logo [1] visible on the side of the mug.',
     *  referenceImages: [subjectReferenceImage]
     *  config: {
     *    numberOfImages: 1,
     *    includeRaiReason: true,
     *  },
     * });
     * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
     * ```
     */
    editImage: (params: types.EditImageParameters) => Promise<types.EditImageResponse>;
    /**
     * Upscales an image based on an image, upscale factor, and configuration.
     * Only supported in Vertex AI currently.
     *
     * @param params - The parameters for upscaling an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await client.models.upscaleImage({
     *  model: 'imagen-3.0-generate-002',
     *  image: image,
     *  upscaleFactor: 'x2',
     *  config: {
     *    includeRaiReason: true,
     *  },
     * });
     * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
     * ```
     */
    upscaleImage: (params: types.UpscaleImageParameters) => Promise<types.UpscaleImageResponse>;
    /**
     *  Generates videos based on a text description and configuration.
     *
     * @param params - The parameters for generating videos.
     * @return A Promise<GenerateVideosOperation> which allows you to track the progress and eventually retrieve the generated videos using the operations.get method.
     *
     * @example
     * ```ts
     * const operation = await ai.models.generateVideos({
     *  model: 'veo-2.0-generate-001',
     *  source: {
     *    prompt: 'A neon hologram of a cat driving at top speed',
     *  },
     *  config: {
     *    numberOfVideos: 1
     * });
     *
     * while (!operation.done) {
     *   await new Promise(resolve => setTimeout(resolve, 10000));
     *   operation = await ai.operations.getVideosOperation({operation: operation});
     * }
     *
     * console.log(operation.response?.generatedVideos?.[0]?.video?.uri);
     * ```
     */
    generateVideos: (params: types.GenerateVideosParameters) => Promise<types.GenerateVideosOperation>;
    private generateContentInternal;
    private generateContentStreamInternal;
    /**
     * Calculates embeddings for the given contents. Only text is supported.
     *
     * @param params - The parameters for embedding contents.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.embedContent({
     *  model: 'text-embedding-004',
     *  contents: [
     *    'What is your name?',
     *    'What is your favorite color?',
     *  ],
     *  config: {
     *    outputDimensionality: 64,
     *  },
     * });
     * console.log(response);
     * ```
     */
    embedContent(params: types.EmbedContentParameters): Promise<types.EmbedContentResponse>;
    /**
     * Private method for generating images.
     */
    private generateImagesInternal;
    /**
     * Private method for editing an image.
     */
    private editImageInternal;
    /**
     * Private method for upscaling an image.
     */
    private upscaleImageInternal;
    /**
     * Recontextualizes an image.
     *
     * There are two types of recontextualization currently supported:
     * 1) Imagen Product Recontext - Generate images of products in new scenes
     *    and contexts.
     * 2) Virtual Try-On: Generate images of persons modeling fashion products.
     *
     * @param params - The parameters for recontextualizing an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response1 = await ai.models.recontextImage({
     *  model: 'imagen-product-recontext-preview-06-30',
     *  source: {
     *    prompt: 'In a modern kitchen setting.',
     *    productImages: [productImage],
     *  },
     *  config: {
     *    numberOfImages: 1,
     *  },
     * });
     * console.log(response1?.generatedImages?.[0]?.image?.imageBytes);
     *
     * const response2 = await ai.models.recontextImage({
     *  model: 'virtual-try-on-preview-08-04',
     *  source: {
     *    personImage: personImage,
     *    productImages: [productImage],
     *  },
     *  config: {
     *    numberOfImages: 1,
     *  },
     * });
     * console.log(response2?.generatedImages?.[0]?.image?.imageBytes);
     * ```
     */
    recontextImage(params: types.RecontextImageParameters): Promise<types.RecontextImageResponse>;
    /**
     * Segments an image, creating a mask of a specified area.
     *
     * @param params - The parameters for segmenting an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.segmentImage({
     *  model: 'image-segmentation-001',
     *  source: {
     *    image: image,
     *  },
     *  config: {
     *    mode: 'foreground',
     *  },
     * });
     * console.log(response?.generatedMasks?.[0]?.mask?.imageBytes);
     * ```
     */
    segmentImage(params: types.SegmentImageParameters): Promise<types.SegmentImageResponse>;
    /**
     * Fetches information about a model by name.
     *
     * @example
     * ```ts
     * const modelInfo = await ai.models.get({model: 'gemini-2.0-flash'});
     * ```
     */
    get(params: types.GetModelParameters): Promise<types.Model>;
    private listInternal;
    /**
     * Updates a tuned model by its name.
     *
     * @param params - The parameters for updating the model.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.update({
     *   model: 'tuned-model-name',
     *   config: {
     *     displayName: 'New display name',
     *     description: 'New description',
     *   },
     * });
     * ```
     */
    update(params: types.UpdateModelParameters): Promise<types.Model>;
    /**
     * Deletes a tuned model by its name.
     *
     * @param params - The parameters for deleting the model.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.delete({model: 'tuned-model-name'});
     * ```
     */
    delete(params: types.DeleteModelParameters): Promise<types.DeleteModelResponse>;
    /**
     * Counts the number of tokens in the given contents. Multimodal input is
     * supported for Gemini models.
     *
     * @param params - The parameters for counting tokens.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.countTokens({
     *  model: 'gemini-2.0-flash',
     *  contents: 'The quick brown fox jumps over the lazy dog.'
     * });
     * console.log(response);
     * ```
     */
    countTokens(params: types.CountTokensParameters): Promise<types.CountTokensResponse>;
    /**
     * Given a list of contents, returns a corresponding TokensInfo containing
     * the list of tokens and list of token ids.
     *
     * This method is not supported by the Gemini Developer API.
     *
     * @param params - The parameters for computing tokens.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.computeTokens({
     *  model: 'gemini-2.0-flash',
     *  contents: 'What is your name?'
     * });
     * console.log(response);
     * ```
     */
    computeTokens(params: types.ComputeTokensParameters): Promise<types.ComputeTokensResponse>;
    /**
     * Private method for generating videos.
     */
    private generateVideosInternal;
}

/** Config for model selection. */
export declare interface ModelSelectionConfig {
    /** Options for feature selection preference. */
    featureSelectionPreference?: FeatureSelectionPreference;
}

/** The configuration for the multi-speaker setup. */
export declare interface MultiSpeakerVoiceConfig {
    /** The configuration for the speaker to use. */
    speakerVoiceConfigs?: SpeakerVoiceConfig[];
}

/** The mode of music generation. */
export declare enum MusicGenerationMode {
    /**
     * Rely on the server default generation mode.
     */
    MUSIC_GENERATION_MODE_UNSPECIFIED = "MUSIC_GENERATION_MODE_UNSPECIFIED",
    /**
     * Steer text prompts to regions of latent space with higher quality
     music.
     */
    QUALITY = "QUALITY",
    /**
     * Steer text prompts to regions of latent space with a larger
     diversity of music.
     */
    DIVERSITY = "DIVERSITY",
    /**
     * Steer text prompts to regions of latent space more likely to
     generate music with vocals.
     */
    VOCALIZATION = "VOCALIZATION"
}

/** A long-running operation. */
export declare interface Operation<T> {
    /** The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the `name` should be a resource name ending with `operations/{unique_id}`. */
    name?: string;
    /** Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata.  Any method that returns a long-running operation should document the metadata type, if any. */
    metadata?: Record<string, unknown>;
    /** If the value is `false`, it means the operation is still in progress. If `true`, the operation is completed, and either `error` or `response` is available. */
    done?: boolean;
    /** The error result of the operation in case of failure or cancellation. */
    error?: Record<string, unknown>;
    /** The response if the operation is successful. */
    response?: T;
    /**
     * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
     * @internal
     */
    _fromAPIResponse({ apiResponse, isVertexAI, }: OperationFromAPIResponseParameters): Operation<T>;
}

/** Parameters of the fromAPIResponse method of the Operation class. */
export declare interface OperationFromAPIResponseParameters {
    /** The API response to be converted to an Operation. */
    apiResponse: Record<string, unknown>;
    /** Whether the API response is from Vertex AI. */
    isVertexAI: boolean;
}

/** Parameters for the get method of the operations module. */
export declare interface OperationGetParameters<T, U extends Operation<T>> {
    /** Used to override the default configuration. */
    config?: GetOperationConfig;
    /** The operation to be retrieved. */
    operation: U;
}

export declare class Operations extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Gets the status of a long-running operation.
     *
     * @param parameters The parameters for the get operation request.
     * @return The updated Operation object, with the latest status or result.
     */
    getVideosOperation(parameters: types.OperationGetParameters<types.GenerateVideosResponse, types.GenerateVideosOperation>): Promise<types.GenerateVideosOperation>;
    /**
     * Gets the status of a long-running operation.
     *
     * @param parameters The parameters for the get operation request.
     * @return The updated Operation object, with the latest status or result.
     */
    get<T, U extends types.Operation<T>>(parameters: types.OperationGetParameters<T, U>): Promise<types.Operation<T>>;
    private getVideosOperationInternal;
    private fetchPredictVideosOperationInternal;
}

/** Required. Outcome of the code execution. */
export declare enum Outcome {
    /**
     * Unspecified status. This value should not be used.
     */
    OUTCOME_UNSPECIFIED = "OUTCOME_UNSPECIFIED",
    /**
     * Code execution completed successfully.
     */
    OUTCOME_OK = "OUTCOME_OK",
    /**
     * Code execution finished but with a failure. `stderr` should contain the reason.
     */
    OUTCOME_FAILED = "OUTCOME_FAILED",
    /**
     * Code execution ran for too long, and was cancelled. There may or may not be a partial output present.
     */
    OUTCOME_DEADLINE_EXCEEDED = "OUTCOME_DEADLINE_EXCEEDED"
}

export declare enum PagedItem {
    PAGED_ITEM_BATCH_JOBS = "batchJobs",
    PAGED_ITEM_MODELS = "models",
    PAGED_ITEM_TUNING_JOBS = "tuningJobs",
    PAGED_ITEM_FILES = "files",
    PAGED_ITEM_CACHED_CONTENTS = "cachedContents"
}

declare interface PagedItemConfig {
    config?: {
        pageToken?: string;
        pageSize?: number;
    };
}

declare interface PagedItemResponse<T> {
    nextPageToken?: string;
    sdkHttpResponse?: types.HttpResponse;
    batchJobs?: T[];
    models?: T[];
    tuningJobs?: T[];
    files?: T[];
    cachedContents?: T[];
}

/**
 * Pager class for iterating through paginated results.
 */
export declare class Pager<T> implements AsyncIterable<T> {
    private nameInternal;
    private pageInternal;
    private paramsInternal;
    private pageInternalSize;
    private sdkHttpResponseInternal?;
    protected requestInternal: (params: PagedItemConfig) => Promise<PagedItemResponse<T>>;
    protected idxInternal: number;
    constructor(name: PagedItem, request: (params: PagedItemConfig) => Promise<PagedItemResponse<T>>, response: PagedItemResponse<T>, params: PagedItemConfig);
    private init;
    private initNextPage;
    /**
     * Returns the current page, which is a list of items.
     *
     * @remarks
     * The first page is retrieved when the pager is created. The returned list of
     * items could be a subset of the entire list.
     */
    get page(): T[];
    /**
     * Returns the type of paged item (for example, ``batch_jobs``).
     */
    get name(): PagedItem;
    /**
     * Returns the length of the page fetched each time by this pager.
     *
     * @remarks
     * The number of items in the page is less than or equal to the page length.
     */
    get pageSize(): number;
    /**
     * Returns the headers of the API response.
     */
    get sdkHttpResponse(): types.HttpResponse | undefined;
    /**
     * Returns the parameters when making the API request for the next page.
     *
     * @remarks
     * Parameters contain a set of optional configs that can be
     * used to customize the API request. For example, the `pageToken` parameter
     * contains the token to request the next page.
     */
    get params(): PagedItemConfig;
    /**
     * Returns the total number of items in the current page.
     */
    get pageLength(): number;
    /**
     * Returns the item at the given index.
     */
    getItem(index: number): T;
    /**
     * Returns an async iterator that support iterating through all items
     * retrieved from the API.
     *
     * @remarks
     * The iterator will automatically fetch the next page if there are more items
     * to fetch from the API.
     *
     * @example
     *
     * ```ts
     * const pager = await ai.files.list({config: {pageSize: 10}});
     * for await (const file of pager) {
     *   console.log(file.name);
     * }
     * ```
     */
    [Symbol.asyncIterator](): AsyncIterator<T>;
    /**
     * Fetches the next page of items. This makes a new API request.
     *
     * @throws {Error} If there are no more pages to fetch.
     *
     * @example
     *
     * ```ts
     * const pager = await ai.files.list({config: {pageSize: 10}});
     * let page = pager.page;
     * while (true) {
     *   for (const file of page) {
     *     console.log(file.name);
     *   }
     *   if (!pager.hasNextPage()) {
     *     break;
     *   }
     *   page = await pager.nextPage();
     * }
     * ```
     */
    nextPage(): Promise<T[]>;
    /**
     * Returns true if there are more pages to fetch from the API.
     */
    hasNextPage(): boolean;
}

/** A datatype containing media content.

 Exactly one field within a Part should be set, representing the specific type
 of content being conveyed. Using multiple fields within the same `Part`
 instance is considered invalid.
 */
export declare interface Part {
    /** Metadata for a given video. */
    videoMetadata?: VideoMetadata;
    /** Indicates if the part is thought from the model. */
    thought?: boolean;
    /** Optional. Inlined bytes data. */
    inlineData?: Blob_2;
    /** Optional. URI based data. */
    fileData?: FileData;
    /** An opaque signature for the thought so it can be reused in subsequent requests.
     * @remarks Encoded as base64 string. */
    thoughtSignature?: string;
    /** A predicted [FunctionCall] returned from the model that contains a string
     representing the [FunctionDeclaration.name] and a structured JSON object
     containing the parameters and their values. */
    functionCall?: FunctionCall;
    /** Optional. Result of executing the [ExecutableCode]. */
    codeExecutionResult?: CodeExecutionResult;
    /** Optional. Code generated by the model that is meant to be executed. */
    executableCode?: ExecutableCode;
    /** Optional. The result output of a [FunctionCall] that contains a string representing the [FunctionDeclaration.name] and a structured JSON object containing any output from the function call. It is used as context to the model. */
    functionResponse?: FunctionResponse;
    /** Optional. Text part (can be code). */
    text?: string;
}

export declare type PartListUnion = PartUnion[] | PartUnion;

/** Tuning spec for Partner models. */
export declare interface PartnerModelTuningSpec {
    /** Hyperparameters for tuning. The accepted hyper_parameters and their valid range of values will differ depending on the base model. */
    hyperParameters?: Record<string, unknown>;
    /** Required. Cloud Storage path to file containing training dataset for tuning. The dataset must be formatted as a JSONL file. */
    trainingDatasetUri?: string;
    /** Optional. Cloud Storage path to file containing validation dataset for tuning. The dataset must be formatted as a JSONL file. */
    validationDatasetUri?: string;
}

export declare type PartUnion = Part | string;

/** Enum that controls the generation of people. */
export declare enum PersonGeneration {
    /**
     * Block generation of images of people.
     */
    DONT_ALLOW = "DONT_ALLOW",
    /**
     * Generate images of adults, but not children.
     */
    ALLOW_ADULT = "ALLOW_ADULT",
    /**
     * Generate images that include adults and children.
     */
    ALLOW_ALL = "ALLOW_ALL"
}

/** The configuration for the prebuilt speaker to use. */
export declare interface PrebuiltVoiceConfig {
    /** The name of the prebuilt voice to use. */
    voiceName?: string;
}

/** Statistics computed for datasets used for preference optimization. */
export declare interface PreferenceOptimizationDataStats {
    /** Output only. Dataset distributions for scores variance per example. */
    scoreVariancePerExampleDistribution?: DatasetDistribution;
    /** Output only. Dataset distributions for scores. */
    scoresDistribution?: DatasetDistribution;
    /** Output only. Number of billable tokens in the tuning dataset. */
    totalBillableTokenCount?: string;
    /** Output only. Number of examples in the tuning dataset. */
    tuningDatasetExampleCount?: string;
    /** Output only. Number of tuning steps for this Tuning Job. */
    tuningStepCount?: string;
    /** Output only. Sample user examples in the training dataset. */
    userDatasetExamples?: GeminiPreferenceExample[];
    /** Output only. Dataset distributions for the user input tokens. */
    userInputTokenDistribution?: DatasetDistribution;
    /** Output only. Dataset distributions for the user output tokens. */
    userOutputTokenDistribution?: DatasetDistribution;
}

/** A pre-tuned model for continuous tuning. */
export declare interface PreTunedModel {
    /** Output only. The name of the base model this PreTunedModel was tuned from. */
    baseModel?: string;
    /** Optional. The source checkpoint id. If not specified, the default checkpoint will be used. */
    checkpointId?: string;
    /** The resource name of the Model. E.g., a model resource name with a specified version id or alias: `projects/{project}/locations/{location}/models/{model}@{version_id}` `projects/{project}/locations/{location}/models/{model}@{alias}` Or, omit the version id to use the default version: `projects/{project}/locations/{location}/models/{model}` */
    tunedModelName?: string;
}

/** Config for proactivity features. */
export declare interface ProactivityConfig {
    /** If enabled, the model can reject responding to the last prompt. For
     example, this allows the model to ignore out of context speech or to stay
     silent if the user did not make a request, yet. */
    proactiveAudio?: boolean;
}

/** An image of the product. */
export declare interface ProductImage {
    /** An image of the product to be recontextualized. */
    productImage?: Image_2;
}

/** A RagChunk includes the content of a chunk of a RagFile, and associated metadata. */
export declare interface RagChunk {
    /** If populated, represents where the chunk starts and ends in the document. */
    pageSpan?: RagChunkPageSpan;
    /** The content of the chunk. */
    text?: string;
}

/** Represents where the chunk starts and ends in the document. */
export declare interface RagChunkPageSpan {
    /** Page where chunk starts in the document. Inclusive. 1-indexed. */
    firstPage?: number;
    /** Page where chunk ends in the document. Inclusive. 1-indexed. */
    lastPage?: number;
}

/** Specifies the context retrieval config. */
export declare interface RagRetrievalConfig {
    /** Optional. Config for filters. */
    filter?: RagRetrievalConfigFilter;
    /** Optional. Config for Hybrid Search. */
    hybridSearch?: RagRetrievalConfigHybridSearch;
    /** Optional. Config for ranking and reranking. */
    ranking?: RagRetrievalConfigRanking;
    /** Optional. The number of contexts to retrieve. */
    topK?: number;
}

/** Config for filters. */
export declare interface RagRetrievalConfigFilter {
    /** Optional. String for metadata filtering. */
    metadataFilter?: string;
    /** Optional. Only returns contexts with vector distance smaller than the threshold. */
    vectorDistanceThreshold?: number;
    /** Optional. Only returns contexts with vector similarity larger than the threshold. */
    vectorSimilarityThreshold?: number;
}

/** Config for Hybrid Search. */
export declare interface RagRetrievalConfigHybridSearch {
    /** Optional. Alpha value controls the weight between dense and sparse vector search results. The range is [0, 1], while 0 means sparse vector search only and 1 means dense vector search only. The default value is 0.5 which balances sparse and dense vector search equally. */
    alpha?: number;
}

/** Config for ranking and reranking. */
export declare interface RagRetrievalConfigRanking {
    /** Optional. Config for LlmRanker. */
    llmRanker?: RagRetrievalConfigRankingLlmRanker;
    /** Optional. Config for Rank Service. */
    rankService?: RagRetrievalConfigRankingRankService;
}

/** Config for LlmRanker. */
export declare interface RagRetrievalConfigRankingLlmRanker {
    /** Optional. The model name used for ranking. See [Supported models](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference#supported-models). */
    modelName?: string;
}

/** Config for Rank Service. */
export declare interface RagRetrievalConfigRankingRankService {
    /** Optional. The model name of the rank service. Format: `semantic-ranker-512@latest` */
    modelName?: string;
}

/** A raw reference image.

 A raw reference image represents the base image to edit, provided by the user.
 It can optionally be provided in addition to a mask reference image or
 a style reference image.
 */
export declare class RawReferenceImage {
    /** The reference image for the editing operation. */
    referenceImage?: Image_2;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI(): ReferenceImageAPIInternal;
}

/** Marks the end of user activity.

 This can only be sent if automatic (i.e. server-side) activity detection is
 disabled.
 */
export declare interface RealtimeInputConfig {
    /** If not set, automatic activity detection is enabled by default. If automatic voice detection is disabled, the client must send activity signals. */
    automaticActivityDetection?: AutomaticActivityDetection;
    /** Defines what effect activity has. */
    activityHandling?: ActivityHandling;
    /** Defines which input is included in the user's turn. */
    turnCoverage?: TurnCoverage;
}

/** Configuration for recontextualizing an image. */
export declare interface RecontextImageConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Number of images to generate. */
    numberOfImages?: number;
    /** The number of sampling steps. A higher value has better image
     quality, while a lower value has better latency. */
    baseSteps?: number;
    /** Cloud Storage URI used to store the generated images. */
    outputGcsUri?: string;
    /** Random seed for image generation. */
    seed?: number;
    /** Filter level for safety filtering. */
    safetyFilterLevel?: SafetyFilterLevel;
    /** Whether allow to generate person images, and restrict to specific
     ages. */
    personGeneration?: PersonGeneration;
    /** Whether to add a SynthID watermark to the generated images. */
    addWatermark?: boolean;
    /** MIME type of the generated image. */
    outputMimeType?: string;
    /** Compression quality of the generated image (for ``image/jpeg``
     only). */
    outputCompressionQuality?: number;
    /** Whether to use the prompt rewriting logic. */
    enhancePrompt?: boolean;
}

/** The parameters for recontextualizing an image. */
export declare interface RecontextImageParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** A set of source input(s) for image recontextualization. */
    source: RecontextImageSource;
    /** Configuration for image recontextualization. */
    config?: RecontextImageConfig;
}

/** The output images response. */
export declare class RecontextImageResponse {
    /** List of generated images. */
    generatedImages?: GeneratedImage[];
}

/** A set of source input(s) for image recontextualization. */
export declare interface RecontextImageSource {
    /** A text prompt for guiding the model during image
     recontextualization. Not supported for Virtual Try-On. */
    prompt?: string;
    /** Image of the person or subject who will be wearing the
     product(s). */
    personImage?: Image_2;
    /** A list of product images. */
    productImages?: ProductImage[];
}

export declare type ReferenceImage = RawReferenceImage | MaskReferenceImage | ControlReferenceImage | StyleReferenceImage | SubjectReferenceImage;

/** Private class that represents a Reference image that is sent to API. */
declare interface ReferenceImageAPIInternal {
    /** The reference image for the editing operation. */
    referenceImage?: types.Image;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Configuration for the mask reference image. */
    maskImageConfig?: types.MaskReferenceConfig;
    /** Configuration for the control reference image. */
    controlImageConfig?: types.ControlReferenceConfig;
    /** Configuration for the style reference image. */
    styleImageConfig?: types.StyleReferenceConfig;
    /** Configuration for the subject reference image. */
    subjectImageConfig?: types.SubjectReferenceConfig;
}

/** Represents a recorded session. */
export declare interface ReplayFile {
    replayId?: string;
    interactions?: ReplayInteraction[];
}

/** Represents a single interaction, request and response in a replay. */
export declare interface ReplayInteraction {
    request?: ReplayRequest;
    response?: ReplayResponse;
}

/** Represents a single request in a replay. */
export declare interface ReplayRequest {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    bodySegments?: Record<string, unknown>[];
}

/** Represents a single response in a replay. */
export declare class ReplayResponse {
    statusCode?: number;
    headers?: Record<string, string>;
    bodySegments?: Record<string, unknown>[];
    sdkResponseSegments?: Record<string, unknown>[];
}

/** Defines a retrieval tool that model can call to access external knowledge. */
export declare interface Retrieval {
    /** Optional. Deprecated. This option is no longer supported. */
    disableAttribution?: boolean;
    /** Use data source powered by external API for grounding. */
    externalApi?: ExternalApi;
    /** Set to use data source powered by Vertex AI Search. */
    vertexAiSearch?: VertexAISearch;
    /** Set to use data source powered by Vertex RAG store. User data is uploaded via the VertexRagDataService. */
    vertexRagStore?: VertexRagStore;
}

/** Retrieval config.
 */
export declare interface RetrievalConfig {
    /** Optional. The location of the user. */
    latLng?: LatLng;
    /** The language code of the user. */
    languageCode?: string;
}

/** Metadata related to retrieval in the grounding flow. */
export declare interface RetrievalMetadata {
    /** Optional. Score indicating how likely information from Google Search could help answer the prompt. The score is in the range `[0, 1]`, where 0 is the least likely and 1 is the most likely. This score is only populated when Google Search grounding and dynamic retrieval is enabled. It will be compared to the threshold to determine whether to trigger Google Search. */
    googleSearchDynamicRetrievalScore?: number;
}

/** Safety attributes of a GeneratedImage or the user-provided prompt. */
export declare interface SafetyAttributes {
    /** List of RAI categories. */
    categories?: string[];
    /** List of scores of each categories. */
    scores?: number[];
    /** Internal use only. */
    contentType?: string;
}

/** Enum that controls the safety filter level for objectionable content. */
export declare enum SafetyFilterLevel {
    BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
    BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
    BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
    BLOCK_NONE = "BLOCK_NONE"
}

/** Safety rating corresponding to the generated content. */
export declare interface SafetyRating {
    /** Output only. Indicates whether the content was filtered out because of this rating. */
    blocked?: boolean;
    /** Output only. Harm category. */
    category?: HarmCategory;
    /** Output only. The overwritten threshold for the safety category of Gemini 2.0 image out. If minors are detected in the output image, the threshold of each safety category will be overwritten if user sets a lower threshold. */
    overwrittenThreshold?: HarmBlockThreshold;
    /** Output only. Harm probability levels in the content. */
    probability?: HarmProbability;
    /** Output only. Harm probability score. */
    probabilityScore?: number;
    /** Output only. Harm severity levels in the content. */
    severity?: HarmSeverity;
    /** Output only. Harm severity score. */
    severityScore?: number;
}

/** Safety settings. */
export declare interface SafetySetting {
    /** Determines if the harm block method uses probability or probability
     and severity scores. */
    method?: HarmBlockMethod;
    /** Required. Harm category. */
    category?: HarmCategory;
    /** Required. The harm block threshold. */
    threshold?: HarmBlockThreshold;
}

/** Scale of the generated music. */
export declare enum Scale {
    /**
     * Default value. This value is unused.
     */
    SCALE_UNSPECIFIED = "SCALE_UNSPECIFIED",
    /**
     * C major or A minor.
     */
    C_MAJOR_A_MINOR = "C_MAJOR_A_MINOR",
    /**
     * Db major or Bb minor.
     */
    D_FLAT_MAJOR_B_FLAT_MINOR = "D_FLAT_MAJOR_B_FLAT_MINOR",
    /**
     * D major or B minor.
     */
    D_MAJOR_B_MINOR = "D_MAJOR_B_MINOR",
    /**
     * Eb major or C minor
     */
    E_FLAT_MAJOR_C_MINOR = "E_FLAT_MAJOR_C_MINOR",
    /**
     * E major or Db minor.
     */
    E_MAJOR_D_FLAT_MINOR = "E_MAJOR_D_FLAT_MINOR",
    /**
     * F major or D minor.
     */
    F_MAJOR_D_MINOR = "F_MAJOR_D_MINOR",
    /**
     * Gb major or Eb minor.
     */
    G_FLAT_MAJOR_E_FLAT_MINOR = "G_FLAT_MAJOR_E_FLAT_MINOR",
    /**
     * G major or E minor.
     */
    G_MAJOR_E_MINOR = "G_MAJOR_E_MINOR",
    /**
     * Ab major or F minor.
     */
    A_FLAT_MAJOR_F_MINOR = "A_FLAT_MAJOR_F_MINOR",
    /**
     * A major or Gb minor.
     */
    A_MAJOR_G_FLAT_MINOR = "A_MAJOR_G_FLAT_MINOR",
    /**
     * Bb major or G minor.
     */
    B_FLAT_MAJOR_G_MINOR = "B_FLAT_MAJOR_G_MINOR",
    /**
     * B major or Ab minor.
     */
    B_MAJOR_A_FLAT_MINOR = "B_MAJOR_A_FLAT_MINOR"
}

/** Schema is used to define the format of input/output data.

 Represents a select subset of an [OpenAPI 3.0 schema
 object](https://spec.openapis.org/oas/v3.0.3#schema-object). More fields may
 be added in the future as needed.
 */
export declare interface Schema {
    /** Optional. The value should be validated against any (one or more) of the subschemas in the list. */
    anyOf?: Schema[];
    /** Optional. Default value of the data. */
    default?: unknown;
    /** Optional. The description of the data. */
    description?: string;
    /** Optional. Possible values of the element of primitive type with enum format. Examples: 1. We can define direction as : {type:STRING, format:enum, enum:["EAST", NORTH", "SOUTH", "WEST"]} 2. We can define apartment number as : {type:INTEGER, format:enum, enum:["101", "201", "301"]} */
    enum?: string[];
    /** Optional. Example of the object. Will only populated when the object is the root. */
    example?: unknown;
    /** Optional. The format of the data. Supported formats: for NUMBER type: "float", "double" for INTEGER type: "int32", "int64" for STRING type: "email", "byte", etc */
    format?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE ARRAY Schema of the elements of Type.ARRAY. */
    items?: Schema;
    /** Optional. Maximum number of the elements for Type.ARRAY. */
    maxItems?: string;
    /** Optional. Maximum length of the Type.STRING */
    maxLength?: string;
    /** Optional. Maximum number of the properties for Type.OBJECT. */
    maxProperties?: string;
    /** Optional. Maximum value of the Type.INTEGER and Type.NUMBER */
    maximum?: number;
    /** Optional. Minimum number of the elements for Type.ARRAY. */
    minItems?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE STRING Minimum length of the Type.STRING */
    minLength?: string;
    /** Optional. Minimum number of the properties for Type.OBJECT. */
    minProperties?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE INTEGER and NUMBER Minimum value of the Type.INTEGER and Type.NUMBER */
    minimum?: number;
    /** Optional. Indicates if the value may be null. */
    nullable?: boolean;
    /** Optional. Pattern of the Type.STRING to restrict a string to a regular expression. */
    pattern?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE OBJECT Properties of Type.OBJECT. */
    properties?: Record<string, Schema>;
    /** Optional. The order of the properties. Not a standard field in open api spec. Only used to support the order of the properties. */
    propertyOrdering?: string[];
    /** Optional. Required properties of Type.OBJECT. */
    required?: string[];
    /** Optional. The title of the Schema. */
    title?: string;
    /** Optional. The type of the data. */
    type?: Type;
}

export declare type SchemaUnion = Schema | unknown;

/** An image mask representing a brush scribble. */
export declare interface ScribbleImage {
    /** The brush scribble to guide segmentation. Valid for the interactive mode. */
    image?: Image_2;
}

/** Google search entry point. */
export declare interface SearchEntryPoint {
    /** Optional. Web content snippet that can be embedded in a web page or an app webview. */
    renderedContent?: string;
    /** Optional. Base64 encoded JSON representing array of tuple.
     * @remarks Encoded as base64 string. */
    sdkBlob?: string;
}

/** Segment of the content. */
export declare interface Segment {
    /** Output only. End index in the given Part, measured in bytes. Offset from the start of the Part, exclusive, starting at zero. */
    endIndex?: number;
    /** Output only. The index of a Part object within its parent Content object. */
    partIndex?: number;
    /** Output only. Start index in the given Part, measured in bytes. Offset from the start of the Part, inclusive, starting at zero. */
    startIndex?: number;
    /** Output only. The text corresponding to the segment from the response. */
    text?: string;
}

/** Configuration for segmenting an image. */
export declare interface SegmentImageConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The segmentation mode to use. */
    mode?: SegmentMode;
    /** The maximum number of predictions to return up to, by top
     confidence score. */
    maxPredictions?: number;
    /** The confidence score threshold for the detections as a decimal
     value. Only predictions with a confidence score higher than this
     threshold will be returned. */
    confidenceThreshold?: number;
    /** A decimal value representing how much dilation to apply to the
     masks. 0 for no dilation. 1.0 means the masked area covers the whole
     image. */
    maskDilation?: number;
    /** The binary color threshold to apply to the masks. The threshold
     can be set to a decimal value between 0 and 255 non-inclusive.
     Set to -1 for no binary color thresholding. */
    binaryColorThreshold?: number;
}

/** The parameters for segmenting an image. */
export declare interface SegmentImageParameters {
    /** ID of the model to use. For a list of models, see `Google models
     <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models>`_. */
    model: string;
    /** A set of source input(s) for image segmentation. */
    source: SegmentImageSource;
    /** Configuration for image segmentation. */
    config?: SegmentImageConfig;
}

/** The output images response. */
export declare class SegmentImageResponse {
    /** List of generated image masks.
     */
    generatedMasks?: GeneratedImageMask[];
}

/** A set of source input(s) for image segmentation. */
export declare interface SegmentImageSource {
    /** A text prompt for guiding the model during image segmentation.
     Required for prompt mode and semantic mode, disallowed for other modes. */
    prompt?: string;
    /** The image to be segmented. */
    image?: Image_2;
    /** The brush scribble to guide segmentation.
     Required for the interactive mode, disallowed for other modes. */
    scribbleImage?: ScribbleImage;
}

/** Enum that represents the segmentation mode. */
export declare enum SegmentMode {
    FOREGROUND = "FOREGROUND",
    BACKGROUND = "BACKGROUND",
    PROMPT = "PROMPT",
    SEMANTIC = "SEMANTIC",
    INTERACTIVE = "INTERACTIVE"
}

/** Parameters for sending a message within a chat session.

 These parameters are used with the `chat.sendMessage()` method.
 */
export declare interface SendMessageParameters {
    /** The message to send to the model.

     The SDK will combine all parts into a single 'user' content to send to
     the model.
     */
    message: PartListUnion;
    /**  Config for this specific request.

     Please note that the per-request config does not change the chat level
     config, nor inherit from it. If you intend to use some values from the
     chat's default config, you must explicitly copy them into this per-request
     config.
     */
    config?: GenerateContentConfig;
}

/**
 Represents a connection to the API.

 @experimental
 */
export declare class Session {
    readonly conn: WebSocket_2;
    private readonly apiClient;
    constructor(conn: WebSocket_2, apiClient: ApiClient);
    private tLiveClientContent;
    private tLiveClienttToolResponse;
    /**
     Send a message over the established connection.

     @param params - Contains two **optional** properties, `turns` and
     `turnComplete`.

     - `turns` will be converted to a `Content[]`
     - `turnComplete: true` [default] indicates that you are done sending
     content and expect a response. If `turnComplete: false`, the server
     will wait for additional messages before starting generation.

     @experimental

     @remarks
     There are two ways to send messages to the live API:
     `sendClientContent` and `sendRealtimeInput`.

     `sendClientContent` messages are added to the model context **in order**.
     Having a conversation using `sendClientContent` messages is roughly
     equivalent to using the `Chat.sendMessageStream`, except that the state of
     the `chat` history is stored on the API server instead of locally.

     Because of `sendClientContent`'s order guarantee, the model cannot respons
     as quickly to `sendClientContent` messages as to `sendRealtimeInput`
     messages. This makes the biggest difference when sending objects that have
     significant preprocessing time (typically images).

     The `sendClientContent` message sends a `Content[]`
     which has more options than the `Blob` sent by `sendRealtimeInput`.

     So the main use-cases for `sendClientContent` over `sendRealtimeInput` are:

     - Sending anything that can't be represented as a `Blob` (text,
     `sendClientContent({turns="Hello?"}`)).
     - Managing turns when not using audio input and voice activity detection.
     (`sendClientContent({turnComplete:true})` or the short form
     `sendClientContent()`)
     - Prefilling a conversation context
     ```
     sendClientContent({
     turns: [
     Content({role:user, parts:...}),
     Content({role:user, parts:...}),
     ...
     ]
     })
     ```
     @experimental
     */
    sendClientContent(params: types.LiveSendClientContentParameters): void;
    /**
     Send a realtime message over the established connection.

     @param params - Contains one property, `media`.

     - `media` will be converted to a `Blob`

     @experimental

     @remarks
     Use `sendRealtimeInput` for realtime audio chunks and video frames (images).

     With `sendRealtimeInput` the api will respond to audio automatically
     based on voice activity detection (VAD).

     `sendRealtimeInput` is optimized for responsivness at the expense of
     deterministic ordering guarantees. Audio and video tokens are to the
     context when they become available.

     Note: The Call signature expects a `Blob` object, but only a subset
     of audio and image mimetypes are allowed.
     */
    sendRealtimeInput(params: types.LiveSendRealtimeInputParameters): void;
    /**
     Send a function response message over the established connection.

     @param params - Contains property `functionResponses`.

     - `functionResponses` will be converted to a `functionResponses[]`

     @remarks
     Use `sendFunctionResponse` to reply to `LiveServerToolCall` from the server.

     Use {@link types.LiveConnectConfig#tools} to configure the callable functions.

     @experimental
     */
    sendToolResponse(params: types.LiveSendToolResponseParameters): void;
    /**
     Terminates the WebSocket connection.

     @experimental

     @example
     ```ts
     let model: string;
     if (GOOGLE_GENAI_USE_VERTEXAI) {
     model = 'gemini-2.0-flash-live-preview-04-09';
     } else {
     model = 'gemini-live-2.5-flash-preview';
     }
     const session = await ai.live.connect({
     model: model,
     config: {
     responseModalities: [Modality.AUDIO],
     }
     });

     session.close();
     ```
     */
    close(): void;
}

/** Configuration of session resumption mechanism.

 Included in `LiveConnectConfig.session_resumption`. If included server
 will send `LiveServerSessionResumptionUpdate` messages.
 */
export declare interface SessionResumptionConfig {
    /** Session resumption handle of previous session (session to restore).

     If not present new session will be started. */
    handle?: string;
    /** If set the server will send `last_consumed_client_message_index` in the `session_resumption_update` messages to allow for transparent reconnections. */
    transparent?: boolean;
}

/**
 * Overrides the base URLs for the Gemini API and Vertex AI API.
 *
 * @remarks This function should be called before initializing the SDK. If the
 * base URLs are set after initializing the SDK, the base URLs will not be
 * updated. Base URLs provided in the HttpOptions will also take precedence over
 * URLs set here.
 *
 * @example
 * ```ts
 * import {GoogleGenAI, setDefaultBaseUrls} from '@google/genai';
 * // Override the base URL for the Gemini API.
 * setDefaultBaseUrls({geminiUrl:'https://gemini.google.com'});
 *
 * // Override the base URL for the Vertex AI API.
 * setDefaultBaseUrls({vertexUrl: 'https://vertexai.googleapis.com'});
 *
 * const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
 * ```
 */
export declare function setDefaultBaseUrls(baseUrlParams: BaseUrlParameters): void;

/** Config for `response` parameter. */
export declare class SingleEmbedContentResponse {
    /** The response to the request.
     */
    embedding?: ContentEmbedding;
    /** The error encountered while processing the request.
     */
    tokenCount?: string;
}

/** Context window will be truncated by keeping only suffix of it.

 Context window will always be cut at start of USER role turn. System
 instructions and `BidiGenerateContentSetup.prefix_turns` will not be
 subject to the sliding window mechanism, they will always stay at the
 beginning of context window.
 */
export declare interface SlidingWindow {
    /** Session reduction target -- how many tokens we should keep. Window shortening operation has some latency costs, so we should avoid running it on every turn. Should be < trigger_tokens. If not set, trigger_tokens/2 is assumed. */
    targetTokens?: string;
}

/** The configuration for the speaker to use. */
export declare interface SpeakerVoiceConfig {
    /** The name of the speaker to use. Should be the same as in the
     prompt. */
    speaker?: string;
    /** The configuration for the voice to use. */
    voiceConfig?: VoiceConfig;
}

/** The speech generation configuration. */
export declare interface SpeechConfig {
    /** The configuration for the speaker to use.
     */
    voiceConfig?: VoiceConfig;
    /** The configuration for the multi-speaker setup.
     It is mutually exclusive with the voice_config field.
     */
    multiSpeakerVoiceConfig?: MultiSpeakerVoiceConfig;
    /** Language code (ISO 639. e.g. en-US) for the speech synthesization.
     Only available for Live API.
     */
    languageCode?: string;
}

export declare type SpeechConfigUnion = SpeechConfig | string;

/** Start of speech sensitivity. */
export declare enum StartSensitivity {
    /**
     * The default is START_SENSITIVITY_LOW.
     */
    START_SENSITIVITY_UNSPECIFIED = "START_SENSITIVITY_UNSPECIFIED",
    /**
     * Automatic detection will detect the start of speech more often.
     */
    START_SENSITIVITY_HIGH = "START_SENSITIVITY_HIGH",
    /**
     * Automatic detection will detect the start of speech less often.
     */
    START_SENSITIVITY_LOW = "START_SENSITIVITY_LOW"
}

/** Configuration for a Style reference image. */
export declare interface StyleReferenceConfig {
    /** A text description of the style to use for the generated image. */
    styleDescription?: string;
}

/** A style reference image.

 This encapsulates a style reference image provided by the user, and
 additionally optional config parameters for the style reference image.

 A raw reference image can also be provided as a destination for the style to
 be applied to.
 */
export declare class StyleReferenceImage {
    /** The reference image for the editing operation. */
    referenceImage?: Image_2;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Configuration for the style reference image. */
    config?: StyleReferenceConfig;
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI(): ReferenceImageAPIInternal;
}

/** Configuration for a Subject reference image. */
export declare interface SubjectReferenceConfig {
    /** The subject type of a subject reference image. */
    subjectType?: SubjectReferenceType;
    /** Subject description for the image. */
    subjectDescription?: string;
}

/** A subject reference image.

 This encapsulates a subject reference image provided by the user, and
 additionally optional config parameters for the subject reference image.

 A raw reference image can also be provided as a destination for the subject to
 be applied to.
 */
export declare class SubjectReferenceImage {
    /** The reference image for the editing operation. */
    referenceImage?: Image_2;
    /** The id of the reference image. */
    referenceId?: number;
    /** The type of the reference image. Only set by the SDK. */
    referenceType?: string;
    /** Configuration for the subject reference image. */
    config?: SubjectReferenceConfig;
    toReferenceImageAPI(): ReferenceImageAPIInternal;
}

/** Enum representing the subject type of a subject reference image. */
export declare enum SubjectReferenceType {
    SUBJECT_TYPE_DEFAULT = "SUBJECT_TYPE_DEFAULT",
    SUBJECT_TYPE_PERSON = "SUBJECT_TYPE_PERSON",
    SUBJECT_TYPE_ANIMAL = "SUBJECT_TYPE_ANIMAL",
    SUBJECT_TYPE_PRODUCT = "SUBJECT_TYPE_PRODUCT"
}

/** Hyperparameters for SFT. */
export declare interface SupervisedHyperParameters {
    /** Optional. Adapter size for tuning. */
    adapterSize?: AdapterSize;
    /** Optional. Batch size for tuning. This feature is only available for open source models. */
    batchSize?: string;
    /** Optional. Number of complete passes the model makes over the entire training dataset during training. */
    epochCount?: string;
    /** Optional. Learning rate for tuning. Mutually exclusive with `learning_rate_multiplier`. This feature is only available for open source models. */
    learningRate?: number;
    /** Optional. Multiplier for adjusting the default learning rate. Mutually exclusive with `learning_rate`. This feature is only available for 1P models. */
    learningRateMultiplier?: number;
}

/** Dataset distribution for Supervised Tuning. */
export declare interface SupervisedTuningDatasetDistribution {
    /** Output only. Sum of a given population of values that are billable. */
    billableSum?: string;
    /** Output only. Defines the histogram bucket. */
    buckets?: SupervisedTuningDatasetDistributionDatasetBucket[];
    /** Output only. The maximum of the population values. */
    max?: number;
    /** Output only. The arithmetic mean of the values in the population. */
    mean?: number;
    /** Output only. The median of the values in the population. */
    median?: number;
    /** Output only. The minimum of the population values. */
    min?: number;
    /** Output only. The 5th percentile of the values in the population. */
    p5?: number;
    /** Output only. The 95th percentile of the values in the population. */
    p95?: number;
    /** Output only. Sum of a given population of values. */
    sum?: string;
}

/** Dataset bucket used to create a histogram for the distribution given a population of values. */
export declare interface SupervisedTuningDatasetDistributionDatasetBucket {
    /** Output only. Number of values in the bucket. */
    count?: number;
    /** Output only. Left bound of the bucket. */
    left?: number;
    /** Output only. Right bound of the bucket. */
    right?: number;
}

/** Tuning data statistics for Supervised Tuning. */
export declare interface SupervisedTuningDataStats {
    /** Output only. For each index in `truncated_example_indices`, the user-facing reason why the example was dropped. */
    droppedExampleReasons?: string[];
    /** Output only. Number of billable characters in the tuning dataset. */
    totalBillableCharacterCount?: string;
    /** Output only. Number of billable tokens in the tuning dataset. */
    totalBillableTokenCount?: string;
    /** Output only. The number of examples in the dataset that have been dropped. An example can be dropped for reasons including: too many tokens, contains an invalid image, contains too many images, etc. */
    totalTruncatedExampleCount?: string;
    /** Output only. Number of tuning characters in the tuning dataset. */
    totalTuningCharacterCount?: string;
    /** Output only. A partial sample of the indices (starting from 1) of the dropped examples. */
    truncatedExampleIndices?: string[];
    /** Output only. Number of examples in the tuning dataset. */
    tuningDatasetExampleCount?: string;
    /** Output only. Number of tuning steps for this Tuning Job. */
    tuningStepCount?: string;
    /** Output only. Sample user messages in the training dataset uri. */
    userDatasetExamples?: Content[];
    /** Output only. Dataset distributions for the user input tokens. */
    userInputTokenDistribution?: SupervisedTuningDatasetDistribution;
    /** Output only. Dataset distributions for the messages per example. */
    userMessagePerExampleDistribution?: SupervisedTuningDatasetDistribution;
    /** Output only. Dataset distributions for the user output tokens. */
    userOutputTokenDistribution?: SupervisedTuningDatasetDistribution;
}

/** Tuning Spec for Supervised Tuning for first party models. */
export declare interface SupervisedTuningSpec {
    /** Optional. If set to true, disable intermediate checkpoints for SFT and only the last checkpoint will be exported. Otherwise, enable intermediate checkpoints for SFT. Default is false. */
    exportLastCheckpointOnly?: boolean;
    /** Optional. Hyperparameters for SFT. */
    hyperParameters?: SupervisedHyperParameters;
    /** Required. Training dataset used for tuning. The dataset can be specified as either a Cloud Storage path to a JSONL file or as the resource name of a Vertex Multimodal Dataset. */
    trainingDatasetUri?: string;
    /** Tuning mode. */
    tuningMode?: TuningMode;
    /** Optional. Validation dataset used for tuning. The dataset can be specified as either a Cloud Storage path to a JSONL file or as the resource name of a Vertex Multimodal Dataset. */
    validationDatasetUri?: string;
}

export declare interface TestTableFile {
    comment?: string;
    testMethod?: string;
    parameterNames?: string[];
    testTable?: TestTableItem[];
}

export declare interface TestTableItem {
    /** The name of the test. This is used to derive the replay id. */
    name?: string;
    /** The parameters to the test. Use pydantic models. */
    parameters?: Record<string, unknown>;
    /** Expects an exception for MLDev matching the string. */
    exceptionIfMldev?: string;
    /** Expects an exception for Vertex matching the string. */
    exceptionIfVertex?: string;
    /** Use if you don't want to use the default replay id which is derived from the test name. */
    overrideReplayId?: string;
    /** True if the parameters contain an unsupported union type. This test  will be skipped for languages that do not support the union type. */
    hasUnion?: boolean;
    /** When set to a reason string, this test will be skipped in the API mode. Use this flag for tests that can not be reproduced with the real API. E.g. a test that deletes a resource. */
    skipInApiMode?: string;
    /** Keys to ignore when comparing the request and response. This is useful for tests that are not deterministic. */
    ignoreKeys?: string[];
}

/** The thinking features configuration. */
export declare interface ThinkingConfig {
    /** Indicates whether to include thoughts in the response. If true, thoughts are returned only if the model supports thought and thoughts are available.
     */
    includeThoughts?: boolean;
    /** Indicates the thinking budget in tokens. 0 is DISABLED. -1 is AUTOMATIC. The default values and allowed ranges are model dependent.
     */
    thinkingBudget?: number;
}

export declare class Tokens extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Creates an ephemeral auth token resource.
     *
     * @experimental
     *
     * @remarks
     * Ephemeral auth tokens is only supported in the Gemini Developer API.
     * It can be used for the session connection to the Live constrained API.
     * Support in v1alpha only.
     *
     * @param params - The parameters for the create request.
     * @return The created auth token.
     *
     * @example
     * ```ts
     * const ai = new GoogleGenAI({
     *     apiKey: token.name,
     *     httpOptions: { apiVersion: 'v1alpha' }  // Support in v1alpha only.
     * });
     *
     * // Case 1: If LiveEphemeralParameters is unset, unlock LiveConnectConfig
     * // when using the token in Live API sessions. Each session connection can
     * // use a different configuration.
     * const config: CreateAuthTokenConfig = {
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 2: If LiveEphemeralParameters is set, lock all fields in
     * // LiveConnectConfig when using the token in Live API sessions. For
     * // example, changing `outputAudioTranscription` in the Live API
     * // connection will be ignored by the API.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     }
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 3: If LiveEphemeralParameters is set and lockAdditionalFields is
     * // set, lock LiveConnectConfig with set and additional fields (e.g.
     * // responseModalities, systemInstruction, temperature in this example) when
     * // using the token in Live API sessions.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     },
     *     lockAdditionalFields: ['temperature'],
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 4: If LiveEphemeralParameters is set and lockAdditionalFields is
     * // empty array, lock LiveConnectConfig with set fields (e.g.
     * // responseModalities, systemInstruction in this example) when using the
     * // token in Live API sessions.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     },
     *     lockAdditionalFields: [],
     * }
     * const token = await ai.tokens.create(config);
     * ```
     */
    create(params: types.CreateAuthTokenParameters): Promise<types.AuthToken>;
}

/** Tokens info with a list of tokens and the corresponding list of token ids. */
export declare interface TokensInfo {
    /** Optional fields for the role from the corresponding Content. */
    role?: string;
    /** A list of token ids from the input. */
    tokenIds?: string[];
    /** A list of tokens from the input.
     * @remarks Encoded as base64 string. */
    tokens?: string[];
}

/** Tool details of a tool that the model may use to generate a response. */
export declare interface Tool {
    /** List of function declarations that the tool supports. */
    functionDeclarations?: FunctionDeclaration[];
    /** Optional. Retrieval tool type. System will always execute the provided retrieval tool(s) to get external knowledge to answer the prompt. Retrieval results are presented to the model for generation. */
    retrieval?: Retrieval;
    /** Optional. Google Search tool type. Specialized retrieval tool
     that is powered by Google Search. */
    googleSearch?: GoogleSearch;
    /** Optional. GoogleSearchRetrieval tool type. Specialized retrieval tool that is powered by Google search. */
    googleSearchRetrieval?: GoogleSearchRetrieval;
    /** Optional. Enterprise web search tool type. Specialized retrieval
     tool that is powered by Vertex AI Search and Sec4 compliance. */
    enterpriseWebSearch?: EnterpriseWebSearch;
    /** Optional. Google Maps tool type. Specialized retrieval tool
     that is powered by Google Maps. */
    googleMaps?: GoogleMaps;
    /** Optional. Tool to support URL context retrieval. */
    urlContext?: UrlContext;
    /** Optional. Tool to support the model interacting directly with the
     computer. If enabled, it automatically populates computer-use specific
     Function Declarations. */
    computerUse?: ToolComputerUse;
    /** Optional. CodeExecution tool type. Enables the model to execute code as part of generation. */
    codeExecution?: ToolCodeExecution;
}

/** Tool that executes code generated by the model, and automatically returns the result to the model. See also [ExecutableCode]and [CodeExecutionResult] which are input and output to this tool. */
export declare interface ToolCodeExecution {
}

/** Tool to support computer use. */
export declare interface ToolComputerUse {
    /** Required. The environment being operated. */
    environment?: Environment;
}

/** Tool config.

 This config is shared for all tools provided in the request.
 */
export declare interface ToolConfig {
    /** Optional. Function calling config. */
    functionCallingConfig?: FunctionCallingConfig;
    /** Optional. Retrieval config. */
    retrievalConfig?: RetrievalConfig;
}

export declare type ToolListUnion = ToolUnion[];

export declare type ToolUnion = Tool | CallableTool;

/** Output only. Traffic type. This shows whether a request consumes Pay-As-You-Go or Provisioned Throughput quota. */
export declare enum TrafficType {
    /**
     * Unspecified request traffic type.
     */
    TRAFFIC_TYPE_UNSPECIFIED = "TRAFFIC_TYPE_UNSPECIFIED",
    /**
     * Type for Pay-As-You-Go traffic.
     */
    ON_DEMAND = "ON_DEMAND",
    /**
     * Type for Provisioned Throughput traffic.
     */
    PROVISIONED_THROUGHPUT = "PROVISIONED_THROUGHPUT"
}

/** Audio transcription in Server Conent. */
export declare interface Transcription {
    /** Transcription text.
     */
    text?: string;
    /** The bool indicates the end of the transcription.
     */
    finished?: boolean;
}

export declare interface TunedModel {
    /** Output only. The resource name of the TunedModel. Format: `projects/{project}/locations/{location}/models/{model}@{version_id}` When tuning from a base model, the version_id will be 1. For continuous tuning, the version id will be incremented by 1 from the last version id in the parent model. E.g., `projects/{project}/locations/{location}/models/{model}@{last_version_id + 1}` */
    model?: string;
    /** Output only. A resource name of an Endpoint. Format: `projects/{project}/locations/{location}/endpoints/{endpoint}`. */
    endpoint?: string;
    /** The checkpoints associated with this TunedModel.
     This field is only populated for tuning jobs that enable intermediate
     checkpoints. */
    checkpoints?: TunedModelCheckpoint[];
}

/** TunedModelCheckpoint for the Tuned Model of a Tuning Job. */
export declare interface TunedModelCheckpoint {
    /** The ID of the checkpoint.
     */
    checkpointId?: string;
    /** The epoch of the checkpoint.
     */
    epoch?: string;
    /** The step of the checkpoint.
     */
    step?: string;
    /** The Endpoint resource name that the checkpoint is deployed to.
     Format: `projects/{project}/locations/{location}/endpoints/{endpoint}`.
     */
    endpoint?: string;
}

/** A tuned machine learning model. */
export declare interface TunedModelInfo {
    /** ID of the base model that you want to tune. */
    baseModel?: string;
    /** Date and time when the base model was created. */
    createTime?: string;
    /** Date and time when the base model was last updated. */
    updateTime?: string;
}

/** Supervised fine-tuning training dataset. */
export declare interface TuningDataset {
    /** GCS URI of the file containing training dataset in JSONL format. */
    gcsUri?: string;
    /** The resource name of the Vertex Multimodal Dataset that is used as training dataset. Example: 'projects/my-project-id-or-number/locations/my-location/datasets/my-dataset-id'. */
    vertexDatasetResource?: string;
    /** Inline examples with simple input/output text. */
    examples?: TuningExample[];
}

/** The tuning data statistic values for TuningJob. */
export declare interface TuningDataStats {
    /** Output only. Statistics for distillation. */
    distillationDataStats?: DistillationDataStats;
    /** Output only. Statistics for preference optimization. */
    preferenceOptimizationDataStats?: PreferenceOptimizationDataStats;
    /** The SFT Tuning data stats. */
    supervisedTuningDataStats?: SupervisedTuningDataStats;
}

export declare interface TuningExample {
    /** Text model input. */
    textInput?: string;
    /** The expected model output. */
    output?: string;
}

/** A tuning job. */
export declare interface TuningJob {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Output only. Identifier. Resource name of a TuningJob. Format: `projects/{project}/locations/{location}/tuningJobs/{tuning_job}` */
    name?: string;
    /** Output only. The detailed state of the job. */
    state?: JobState;
    /** Output only. Time when the TuningJob was created. */
    createTime?: string;
    /** Output only. Time when the TuningJob for the first time entered the `JOB_STATE_RUNNING` state. */
    startTime?: string;
    /** Output only. Time when the TuningJob entered any of the following JobStates: `JOB_STATE_SUCCEEDED`, `JOB_STATE_FAILED`, `JOB_STATE_CANCELLED`, `JOB_STATE_EXPIRED`. */
    endTime?: string;
    /** Output only. Time when the TuningJob was most recently updated. */
    updateTime?: string;
    /** Output only. Only populated when job's state is `JOB_STATE_FAILED` or `JOB_STATE_CANCELLED`. */
    error?: GoogleRpcStatus;
    /** Optional. The description of the TuningJob. */
    description?: string;
    /** The base model that is being tuned. See [Supported models](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/tuning#supported_models). */
    baseModel?: string;
    /** Output only. The tuned model resources associated with this TuningJob. */
    tunedModel?: TunedModel;
    /** The pre-tuned model for continuous tuning. */
    preTunedModel?: PreTunedModel;
    /** Tuning Spec for Supervised Fine Tuning. */
    supervisedTuningSpec?: SupervisedTuningSpec;
    /** Output only. The tuning data statistics associated with this TuningJob. */
    tuningDataStats?: TuningDataStats;
    /** Customer-managed encryption key options for a TuningJob. If this is set, then all resources created by the TuningJob will be encrypted with the provided encryption key. */
    encryptionSpec?: EncryptionSpec;
    /** Tuning Spec for open sourced and third party Partner models. */
    partnerModelTuningSpec?: PartnerModelTuningSpec;
    /** Optional. The user-provided path to custom model weights. Set this field to tune a custom model. The path must be a Cloud Storage directory that contains the model weights in .safetensors format along with associated model metadata files. If this field is set, the base_model field must still be set to indicate which base model the custom model is derived from. This feature is only available for open source models. */
    customBaseModel?: string;
    /** Output only. The Experiment associated with this TuningJob. */
    experiment?: string;
    /** Optional. The labels with user-defined metadata to organize TuningJob and generated resources such as Model and Endpoint. Label keys and values can be no longer than 64 characters (Unicode codepoints), can only contain lowercase letters, numeric characters, underscores and dashes. International characters are allowed. See https://goo.gl/xmQnxf for more information and examples of labels. */
    labels?: Record<string, string>;
    /** Optional. Cloud Storage path to the directory where tuning job outputs are written to. This field is only available and required for open source models. */
    outputUri?: string;
    /** Output only. The resource name of the PipelineJob associated with the TuningJob. Format: `projects/{project}/locations/{location}/pipelineJobs/{pipeline_job}`. */
    pipelineJob?: string;
    /** The service account that the tuningJob workload runs as. If not specified, the Vertex AI Secure Fine-Tuned Service Agent in the project will be used. See https://cloud.google.com/iam/docs/service-agents#vertex-ai-secure-fine-tuning-service-agent Users starting the pipeline must have the `iam.serviceAccounts.actAs` permission on this service account. */
    serviceAccount?: string;
    /** Optional. The display name of the TunedModel. The name can be up to 128 characters long and can consist of any UTF-8 characters. */
    tunedModelDisplayName?: string;
}

/** Tuning mode. */
export declare enum TuningMode {
    /**
     * Tuning mode is unspecified.
     */
    TUNING_MODE_UNSPECIFIED = "TUNING_MODE_UNSPECIFIED",
    /**
     * Full fine-tuning mode.
     */
    TUNING_MODE_FULL = "TUNING_MODE_FULL",
    /**
     * PEFT adapter tuning mode.
     */
    TUNING_MODE_PEFT_ADAPTER = "TUNING_MODE_PEFT_ADAPTER"
}

/** A long-running operation. */
export declare interface TuningOperation {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the `name` should be a resource name ending with `operations/{unique_id}`. */
    name?: string;
    /** Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata.  Any method that returns a long-running operation should document the metadata type, if any. */
    metadata?: Record<string, unknown>;
    /** If the value is `false`, it means the operation is still in progress. If `true`, the operation is completed, and either `error` or `response` is available. */
    done?: boolean;
    /** The error result of the operation in case of failure or cancellation. */
    error?: Record<string, unknown>;
}

declare class Tunings extends BaseModule {
    private readonly apiClient;
    constructor(apiClient: ApiClient);
    /**
     * Gets a TuningJob.
     *
     * @param name - The resource name of the tuning job.
     * @return - A TuningJob object.
     *
     * @experimental - The SDK's tuning implementation is experimental, and may
     * change in future versions.
     */
    get: (params: types.GetTuningJobParameters) => Promise<types.TuningJob>;
    /**
     * Lists tuning jobs.
     *
     * @param config - The configuration for the list request.
     * @return - A list of tuning jobs.
     *
     * @experimental - The SDK's tuning implementation is experimental, and may
     * change in future versions.
     */
    list: (params?: types.ListTuningJobsParameters) => Promise<Pager<types.TuningJob>>;
    /**
     * Creates a supervised fine-tuning job.
     *
     * @param params - The parameters for the tuning job.
     * @return - A TuningJob operation.
     *
     * @experimental - The SDK's tuning implementation is experimental, and may
     * change in future versions.
     */
    tune: (params: types.CreateTuningJobParameters) => Promise<types.TuningJob>;
    private getInternal;
    private listInternal;
    /**
     * Cancels a tuning job.
     *
     * @param params - The parameters for the cancel request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.tunings.cancel({name: '...'}); // The server-generated resource name.
     * ```
     */
    cancel(params: types.CancelTuningJobParameters): Promise<void>;
    private tuneInternal;
    private tuneMldevInternal;
}

export declare interface TuningValidationDataset {
    /** GCS URI of the file containing validation dataset in JSONL format. */
    gcsUri?: string;
    /** The resource name of the Vertex Multimodal Dataset that is used as training dataset. Example: 'projects/my-project-id-or-number/locations/my-location/datasets/my-dataset-id'. */
    vertexDatasetResource?: string;
}

/** Options about which input is included in the user's turn. */
export declare enum TurnCoverage {
    /**
     * If unspecified, the default behavior is `TURN_INCLUDES_ONLY_ACTIVITY`.
     */
    TURN_COVERAGE_UNSPECIFIED = "TURN_COVERAGE_UNSPECIFIED",
    /**
     * The users turn only includes activity since the last turn, excluding inactivity (e.g. silence on the audio stream). This is the default behavior.
     */
    TURN_INCLUDES_ONLY_ACTIVITY = "TURN_INCLUDES_ONLY_ACTIVITY",
    /**
     * The users turn includes all realtime input since the last turn, including inactivity (e.g. silence on the audio stream).
     */
    TURN_INCLUDES_ALL_INPUT = "TURN_INCLUDES_ALL_INPUT"
}

/** Optional. The type of the data. */
export declare enum Type {
    /**
     * Not specified, should not be used.
     */
    TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
    /**
     * OpenAPI string type
     */
    STRING = "STRING",
    /**
     * OpenAPI number type
     */
    NUMBER = "NUMBER",
    /**
     * OpenAPI integer type
     */
    INTEGER = "INTEGER",
    /**
     * OpenAPI boolean type
     */
    BOOLEAN = "BOOLEAN",
    /**
     * OpenAPI array type
     */
    ARRAY = "ARRAY",
    /**
     * OpenAPI object type
     */
    OBJECT = "OBJECT",
    /**
     * Null type
     */
    NULL = "NULL"
}

declare namespace types {
    export {
        createPartFromUri,
        createPartFromText,
        createPartFromFunctionCall,
        createPartFromFunctionResponse,
        createPartFromBase64,
        createPartFromCodeExecutionResult,
        createPartFromExecutableCode,
        createUserContent,
        createModelContent,
        Outcome,
        Language,
        Type,
        HarmCategory,
        HarmBlockMethod,
        HarmBlockThreshold,
        Mode,
        AuthType,
        ApiSpec,
        UrlRetrievalStatus,
        FinishReason,
        HarmProbability,
        HarmSeverity,
        BlockedReason,
        TrafficType,
        Modality,
        MediaResolution,
        JobState,
        TuningMode,
        AdapterSize,
        FeatureSelectionPreference,
        Behavior,
        DynamicRetrievalConfigMode,
        Environment,
        FunctionCallingConfigMode,
        SafetyFilterLevel,
        PersonGeneration,
        ImagePromptLanguage,
        MaskReferenceMode,
        ControlReferenceType,
        SubjectReferenceType,
        EditMode,
        SegmentMode,
        VideoGenerationReferenceType,
        VideoCompressionQuality,
        FileState,
        FileSource,
        MediaModality,
        StartSensitivity,
        EndSensitivity,
        ActivityHandling,
        TurnCoverage,
        FunctionResponseScheduling,
        Scale,
        MusicGenerationMode,
        LiveMusicPlaybackControl,
        VideoMetadata,
        Blob_2 as Blob,
        FileData,
        FunctionCall,
        CodeExecutionResult,
        ExecutableCode,
        FunctionResponse,
        Part,
        Content,
        HttpOptions,
        Schema,
        ModelSelectionConfig,
        SafetySetting,
        FunctionDeclaration,
        Interval,
        GoogleSearch,
        DynamicRetrievalConfig,
        GoogleSearchRetrieval,
        EnterpriseWebSearch,
        ApiKeyConfig,
        AuthConfigGoogleServiceAccountConfig,
        AuthConfigHttpBasicAuthConfig,
        AuthConfigOauthConfig,
        AuthConfigOidcConfig,
        AuthConfig,
        GoogleMaps,
        UrlContext,
        ToolComputerUse,
        ApiAuthApiKeyConfig,
        ApiAuth,
        ExternalApiElasticSearchParams,
        ExternalApiSimpleSearchParams,
        ExternalApi,
        VertexAISearchDataStoreSpec,
        VertexAISearch,
        VertexRagStoreRagResource,
        RagRetrievalConfigFilter,
        RagRetrievalConfigHybridSearch,
        RagRetrievalConfigRankingLlmRanker,
        RagRetrievalConfigRankingRankService,
        RagRetrievalConfigRanking,
        RagRetrievalConfig,
        VertexRagStore,
        Retrieval,
        ToolCodeExecution,
        Tool,
        FunctionCallingConfig,
        LatLng,
        RetrievalConfig,
        ToolConfig,
        PrebuiltVoiceConfig,
        VoiceConfig,
        SpeakerVoiceConfig,
        MultiSpeakerVoiceConfig,
        SpeechConfig,
        AutomaticFunctionCallingConfig,
        ThinkingConfig,
        GenerationConfigRoutingConfigAutoRoutingMode,
        GenerationConfigRoutingConfigManualRoutingMode,
        GenerationConfigRoutingConfig,
        GenerateContentConfig,
        GenerateContentParameters,
        HttpResponse,
        LiveCallbacks,
        GoogleTypeDate,
        Citation,
        CitationMetadata,
        UrlMetadata,
        UrlContextMetadata,
        GroundingChunkMapsPlaceAnswerSourcesAuthorAttribution,
        GroundingChunkMapsPlaceAnswerSourcesReviewSnippet,
        GroundingChunkMapsPlaceAnswerSources,
        GroundingChunkMaps,
        RagChunkPageSpan,
        RagChunk,
        GroundingChunkRetrievedContext,
        GroundingChunkWeb,
        GroundingChunk,
        Segment,
        GroundingSupport,
        RetrievalMetadata,
        SearchEntryPoint,
        GroundingMetadata,
        LogprobsResultCandidate,
        LogprobsResultTopCandidates,
        LogprobsResult,
        SafetyRating,
        Candidate,
        GenerateContentResponsePromptFeedback,
        ModalityTokenCount,
        GenerateContentResponseUsageMetadata,
        GenerateContentResponse,
        ReferenceImage,
        EditImageParameters,
        EmbedContentConfig,
        EmbedContentParameters,
        ContentEmbeddingStatistics,
        ContentEmbedding,
        EmbedContentMetadata,
        EmbedContentResponse,
        GenerateImagesConfig,
        GenerateImagesParameters,
        Image_2 as Image,
        SafetyAttributes,
        GeneratedImage,
        GenerateImagesResponse,
        MaskReferenceConfig,
        ControlReferenceConfig,
        StyleReferenceConfig,
        SubjectReferenceConfig,
        EditImageConfig,
        EditImageResponse,
        UpscaleImageResponse,
        ProductImage,
        RecontextImageSource,
        RecontextImageConfig,
        RecontextImageParameters,
        RecontextImageResponse,
        ScribbleImage,
        SegmentImageSource,
        SegmentImageConfig,
        SegmentImageParameters,
        EntityLabel,
        GeneratedImageMask,
        SegmentImageResponse,
        GetModelConfig,
        GetModelParameters,
        Endpoint,
        TunedModelInfo,
        Checkpoint,
        Model,
        ListModelsConfig,
        ListModelsParameters,
        ListModelsResponse,
        UpdateModelConfig,
        UpdateModelParameters,
        DeleteModelConfig,
        DeleteModelParameters,
        DeleteModelResponse,
        GenerationConfigThinkingConfig,
        GenerationConfig,
        CountTokensConfig,
        CountTokensParameters,
        CountTokensResponse,
        ComputeTokensConfig,
        ComputeTokensParameters,
        TokensInfo,
        ComputeTokensResponse,
        Video,
        GenerateVideosSource,
        VideoGenerationReferenceImage,
        VideoGenerationMask,
        GenerateVideosConfig,
        GenerateVideosParameters,
        GeneratedVideo,
        GenerateVideosResponse,
        Operation,
        GenerateVideosOperation,
        GetTuningJobConfig,
        GetTuningJobParameters,
        TunedModelCheckpoint,
        TunedModel,
        GoogleRpcStatus,
        PreTunedModel,
        SupervisedHyperParameters,
        SupervisedTuningSpec,
        DatasetDistributionDistributionBucket,
        DatasetDistribution,
        DatasetStats,
        DistillationDataStats,
        GeminiPreferenceExampleCompletion,
        GeminiPreferenceExample,
        PreferenceOptimizationDataStats,
        SupervisedTuningDatasetDistributionDatasetBucket,
        SupervisedTuningDatasetDistribution,
        SupervisedTuningDataStats,
        TuningDataStats,
        EncryptionSpec,
        PartnerModelTuningSpec,
        TuningJob,
        ListTuningJobsConfig,
        ListTuningJobsParameters,
        ListTuningJobsResponse,
        CancelTuningJobConfig,
        CancelTuningJobParameters,
        TuningExample,
        TuningDataset,
        TuningValidationDataset,
        CreateTuningJobConfig,
        CreateTuningJobParametersPrivate,
        TuningOperation,
        CreateCachedContentConfig,
        CreateCachedContentParameters,
        CachedContentUsageMetadata,
        CachedContent,
        GetCachedContentConfig,
        GetCachedContentParameters,
        DeleteCachedContentConfig,
        DeleteCachedContentParameters,
        DeleteCachedContentResponse,
        UpdateCachedContentConfig,
        UpdateCachedContentParameters,
        ListCachedContentsConfig,
        ListCachedContentsParameters,
        ListCachedContentsResponse,
        ListFilesConfig,
        ListFilesParameters,
        FileStatus,
        File_2 as File,
        ListFilesResponse,
        CreateFileConfig,
        CreateFileParameters,
        CreateFileResponse,
        GetFileConfig,
        GetFileParameters,
        DeleteFileConfig,
        DeleteFileParameters,
        DeleteFileResponse,
        InlinedRequest,
        BatchJobSource,
        JobError,
        InlinedResponse,
        SingleEmbedContentResponse,
        InlinedEmbedContentResponse,
        BatchJobDestination,
        CreateBatchJobConfig,
        CreateBatchJobParameters,
        BatchJob,
        EmbedContentBatch,
        EmbeddingsBatchJobSource,
        CreateEmbeddingsBatchJobConfig,
        CreateEmbeddingsBatchJobParameters,
        GetBatchJobConfig,
        GetBatchJobParameters,
        CancelBatchJobConfig,
        CancelBatchJobParameters,
        ListBatchJobsConfig,
        ListBatchJobsParameters,
        ListBatchJobsResponse,
        DeleteBatchJobConfig,
        DeleteBatchJobParameters,
        DeleteResourceJob,
        GetOperationConfig,
        GetOperationParameters,
        FetchPredictOperationConfig,
        FetchPredictOperationParameters,
        TestTableItem,
        TestTableFile,
        ReplayRequest,
        ReplayResponse,
        ReplayInteraction,
        ReplayFile,
        UploadFileConfig,
        DownloadFileConfig,
        DownloadFileParameters,
        UpscaleImageConfig,
        UpscaleImageParameters,
        RawReferenceImage,
        MaskReferenceImage,
        ControlReferenceImage,
        StyleReferenceImage,
        SubjectReferenceImage,
        LiveServerSetupComplete,
        Transcription,
        LiveServerContent,
        LiveServerToolCall,
        LiveServerToolCallCancellation,
        UsageMetadata,
        LiveServerGoAway,
        LiveServerSessionResumptionUpdate,
        LiveServerMessage,
        OperationFromAPIResponseParameters,
        AutomaticActivityDetection,
        RealtimeInputConfig,
        SessionResumptionConfig,
        SlidingWindow,
        ContextWindowCompressionConfig,
        AudioTranscriptionConfig,
        ProactivityConfig,
        LiveClientSetup,
        LiveClientContent,
        ActivityStart,
        ActivityEnd,
        LiveClientRealtimeInput,
        LiveClientToolResponse,
        LiveSendRealtimeInputParameters,
        LiveClientMessage,
        LiveConnectConfig,
        LiveConnectParameters,
        CreateChatParameters,
        SendMessageParameters,
        LiveSendClientContentParameters,
        LiveSendToolResponseParameters,
        LiveMusicClientSetup,
        WeightedPrompt,
        LiveMusicClientContent,
        LiveMusicGenerationConfig,
        LiveMusicClientMessage,
        LiveMusicServerSetupComplete,
        LiveMusicSourceMetadata,
        AudioChunk,
        LiveMusicServerContent,
        LiveMusicFilteredPrompt,
        LiveMusicServerMessage,
        LiveMusicCallbacks,
        UploadFileParameters,
        CallableTool,
        CallableToolConfig,
        LiveMusicConnectParameters,
        LiveMusicSetConfigParameters,
        LiveMusicSetWeightedPromptsParameters,
        AuthToken,
        LiveConnectConstraints,
        CreateAuthTokenConfig,
        CreateAuthTokenParameters,
        OperationGetParameters,
        CreateTuningJobParameters,
        BlobImageUnion,
        PartUnion,
        PartListUnion,
        ContentUnion,
        ContentListUnion,
        SchemaUnion,
        SpeechConfigUnion,
        ToolUnion,
        ToolListUnion,
        DownloadableFileUnion,
        BatchJobSourceUnion,
        BatchJobDestinationUnion
    }
}

/** Optional parameters for caches.update method. */
export declare interface UpdateCachedContentConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The TTL for this resource. The expiration time is computed: now + TTL. It is a duration string, with up to nine fractional digits, terminated by 's'. Example: "3.5s". */
    ttl?: string;
    /** Timestamp of when this resource is considered expired. Uses RFC 3339 format, Example: 2014-10-02T15:01:23Z. */
    expireTime?: string;
}

export declare interface UpdateCachedContentParameters {
    /** The server-generated resource name of the cached content.
     */
    name: string;
    /** Configuration that contains optional parameters.
     */
    config?: UpdateCachedContentConfig;
}

/** Configuration for updating a tuned model. */
export declare interface UpdateModelConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    displayName?: string;
    description?: string;
    defaultCheckpointId?: string;
}

/** Configuration for updating a tuned model. */
export declare interface UpdateModelParameters {
    model: string;
    config?: UpdateModelConfig;
}

declare interface Uploader {
    /**
     * Uploads a file to the given upload url.
     *
     * @param file The file to upload. file is in string type or a Blob.
     * @param uploadUrl The upload URL as a string is where the file will be
     *     uploaded to. The uploadUrl must be a url that was returned by the
     * https://generativelanguage.googleapis.com/upload/v1beta/files endpoint
     * @param apiClient The ApiClient to use for uploading.
     * @return A Promise that resolves to types.File.
     */
    upload(file: string | Blob, uploadUrl: string, apiClient: ApiClient): Promise<File_2>;
    /**
     * Returns the file's mimeType and the size of a given file. If the file is a
     * string path, the file type is determined by the file extension. If the
     * file's type cannot be determined, the type will be set to undefined.
     *
     * @param file The file to get the stat for. Can be a string path or a Blob.
     * @return A Promise that resolves to the file stat of the given file.
     */
    stat(file: string | Blob): Promise<FileStat>;
}

/** Used to override the default configuration. */
export declare interface UploadFileConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** The name of the file in the destination (e.g., 'files/sample-image'. If not provided one will be generated. */
    name?: string;
    /** mime_type: The MIME type of the file. If not provided, it will be inferred from the file extension. */
    mimeType?: string;
    /** Optional display name of the file. */
    displayName?: string;
}

/** Parameters for the upload file method. */
export declare interface UploadFileParameters {
    /** The string path to the file to be uploaded or a Blob object. */
    file: string | globalThis.Blob;
    /** Configuration that contains optional parameters. */
    config?: UploadFileConfig;
}

/** Configuration for upscaling an image.

 For more information on this configuration, refer to
 the `Imagen API reference documentation
 <https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api>`_.
 */
export declare interface UpscaleImageConfig {
    /** Used to override HTTP request options. */
    httpOptions?: HttpOptions;
    /** Abort signal which can be used to cancel the request.

     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations.
     */
    abortSignal?: AbortSignal;
    /** Cloud Storage URI used to store the generated images. */
    outputGcsUri?: string;
    /** Whether to include a reason for filtered-out images in the
     response. */
    includeRaiReason?: boolean;
    /** The image format that the output should be saved as. */
    outputMimeType?: string;
    /** The level of compression. Only applicable if the
     ``output_mime_type`` is ``image/jpeg``. */
    outputCompressionQuality?: number;
    /** Whether to add an image enhancing step before upscaling.
     It is expected to suppress the noise and JPEG compression artifacts
     from the input image. */
    enhanceInputImage?: boolean;
    /** With a higher image preservation factor, the original image
     pixels are more respected. With a lower image preservation factor, the
     output image will have be more different from the input image, but
     with finer details and less noise. */
    imagePreservationFactor?: number;
}

/** User-facing config UpscaleImageParameters. */
export declare interface UpscaleImageParameters {
    /** The model to use. */
    model: string;
    /** The input image to upscale. */
    image: Image_2;
    /** The factor to upscale the image (x2 or x4). */
    upscaleFactor: string;
    /** Configuration for upscaling. */
    config?: UpscaleImageConfig;
}

export declare class UpscaleImageResponse {
    /** Used to retain the full HTTP response. */
    sdkHttpResponse?: HttpResponse;
    /** Generated images. */
    generatedImages?: GeneratedImage[];
}

/** Tool to support URL context retrieval. */
export declare interface UrlContext {
}

/** Metadata related to url context retrieval tool. */
export declare interface UrlContextMetadata {
    /** List of url context. */
    urlMetadata?: UrlMetadata[];
}

/** Context for a single url retrieval. */
export declare interface UrlMetadata {
    /** The URL retrieved by the tool. */
    retrievedUrl?: string;
    /** Status of the url retrieval. */
    urlRetrievalStatus?: UrlRetrievalStatus;
}

/** Status of the url retrieval. */
export declare enum UrlRetrievalStatus {
    /**
     * Default value. This value is unused
     */
    URL_RETRIEVAL_STATUS_UNSPECIFIED = "URL_RETRIEVAL_STATUS_UNSPECIFIED",
    /**
     * Url retrieval is successful.
     */
    URL_RETRIEVAL_STATUS_SUCCESS = "URL_RETRIEVAL_STATUS_SUCCESS",
    /**
     * Url retrieval is failed due to error.
     */
    URL_RETRIEVAL_STATUS_ERROR = "URL_RETRIEVAL_STATUS_ERROR",
    /**
     * Url retrieval is failed because the content is behind paywall.
     */
    URL_RETRIEVAL_STATUS_PAYWALL = "URL_RETRIEVAL_STATUS_PAYWALL",
    /**
     * Url retrieval is failed because the content is unsafe.
     */
    URL_RETRIEVAL_STATUS_UNSAFE = "URL_RETRIEVAL_STATUS_UNSAFE"
}

/** Usage metadata about response(s). */
export declare interface UsageMetadata {
    /** Number of tokens in the prompt. When `cached_content` is set, this is still the total effective prompt size meaning this includes the number of tokens in the cached content. */
    promptTokenCount?: number;
    /** Number of tokens in the cached part of the prompt (the cached content). */
    cachedContentTokenCount?: number;
    /** Total number of tokens across all the generated response candidates. */
    responseTokenCount?: number;
    /** Number of tokens present in tool-use prompt(s). */
    toolUsePromptTokenCount?: number;
    /** Number of tokens of thoughts for thinking models. */
    thoughtsTokenCount?: number;
    /** Total token count for prompt, response candidates, and tool-use prompts(if present). */
    totalTokenCount?: number;
    /** List of modalities that were processed in the request input. */
    promptTokensDetails?: ModalityTokenCount[];
    /** List of modalities that were processed in the cache input. */
    cacheTokensDetails?: ModalityTokenCount[];
    /** List of modalities that were returned in the response. */
    responseTokensDetails?: ModalityTokenCount[];
    /** List of modalities that were processed in the tool-use prompt. */
    toolUsePromptTokensDetails?: ModalityTokenCount[];
    /** Traffic type. This shows whether a request consumes Pay-As-You-Go
     or Provisioned Throughput quota. */
    trafficType?: TrafficType;
}

/** Retrieve from Vertex AI Search datastore or engine for grounding. datastore and engine are mutually exclusive. See https://cloud.google.com/products/agent-builder */
export declare interface VertexAISearch {
    /** Specifications that define the specific DataStores to be searched, along with configurations for those data stores. This is only considered for Engines with multiple data stores. It should only be set if engine is used. */
    dataStoreSpecs?: VertexAISearchDataStoreSpec[];
    /** Optional. Fully-qualified Vertex AI Search data store resource ID. Format: `projects/{project}/locations/{location}/collections/{collection}/dataStores/{dataStore}` */
    datastore?: string;
    /** Optional. Fully-qualified Vertex AI Search engine resource ID. Format: `projects/{project}/locations/{location}/collections/{collection}/engines/{engine}` */
    engine?: string;
    /** Optional. Filter strings to be passed to the search API. */
    filter?: string;
    /** Optional. Number of search results to return per query. The default value is 10. The maximumm allowed value is 10. */
    maxResults?: number;
}

/** Define data stores within engine to filter on in a search call and configurations for those data stores. For more information, see https://cloud.google.com/generative-ai-app-builder/docs/reference/rpc/google.cloud.discoveryengine.v1#datastorespec */
export declare interface VertexAISearchDataStoreSpec {
    /** Full resource name of DataStore, such as Format: `projects/{project}/locations/{location}/collections/{collection}/dataStores/{dataStore}` */
    dataStore?: string;
    /** Optional. Filter specification to filter documents in the data store specified by data_store field. For more information on filtering, see [Filtering](https://cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata) */
    filter?: string;
}

/** Retrieve from Vertex RAG Store for grounding. */
export declare interface VertexRagStore {
    /** Optional. Deprecated. Please use rag_resources instead. */
    ragCorpora?: string[];
    /** Optional. The representation of the rag source. It can be used to specify corpus only or ragfiles. Currently only support one corpus or multiple files from one corpus. In the future we may open up multiple corpora support. */
    ragResources?: VertexRagStoreRagResource[];
    /** Optional. The retrieval config for the Rag query. */
    ragRetrievalConfig?: RagRetrievalConfig;
    /** Optional. Number of top k results to return from the selected corpora. */
    similarityTopK?: number;
    /** Optional. Currently only supported for Gemini Multimodal Live API. In Gemini Multimodal Live API, if `store_context` bool is specified, Gemini will leverage it to automatically memorize the interactions between the client and Gemini, and retrieve context when needed to augment the response generation for users' ongoing and future interactions. */
    storeContext?: boolean;
    /** Optional. Only return results with vector distance smaller than the threshold. */
    vectorDistanceThreshold?: number;
}

/** The definition of the Rag resource. */
export declare interface VertexRagStoreRagResource {
    /** Optional. RagCorpora resource name. Format: `projects/{project}/locations/{location}/ragCorpora/{rag_corpus}` */
    ragCorpus?: string;
    /** Optional. rag_file_id. The files should be in the same rag_corpus set in rag_corpus field. */
    ragFileIds?: string[];
}

/** A generated video. */
export declare interface Video {
    /** Path to another storage. */
    uri?: string;
    /** Video bytes.
     * @remarks Encoded as base64 string. */
    videoBytes?: string;
    /** Video encoding, for example ``video/mp4``. */
    mimeType?: string;
}

/** Enum that controls the compression quality of the generated videos. */
export declare enum VideoCompressionQuality {
    /**
     * Optimized video compression quality. This will produce videos
     with a compressed, smaller file size.
     */
    OPTIMIZED = "OPTIMIZED",
    /**
     * Lossless video compression quality. This will produce videos
     with a larger file size.
     */
    LOSSLESS = "LOSSLESS"
}

/** A mask for video generation. */
export declare interface VideoGenerationMask {
    /** The image mask to use for generating videos. */
    image?: Image_2;
    /** Describes how the mask will be used. Inpainting masks must
     match the aspect ratio of the input video. Outpainting masks can be
     either 9:16 or 16:9. */
    maskMode?: string;
}

/** A reference image for video generation. */
export declare interface VideoGenerationReferenceImage {
    /** The reference image. */
    image?: Image_2;
    /** The type of the reference image, which defines how the reference
     image will be used to generate the video. */
    referenceType?: VideoGenerationReferenceType;
}

/** Enum for the reference type of a video generation reference image. */
export declare enum VideoGenerationReferenceType {
    /**
     * A reference image that provides assets to the generated video,
     such as the scene, an object, a character, etc.
     */
    ASSET = "ASSET",
    /**
     * A reference image that provides aesthetics including colors,
     lighting, texture, etc., to be used as the style of the generated video,
     such as 'anime', 'photography', 'origami', etc.
     */
    STYLE = "STYLE"
}

/** Describes how the video in the Part should be used by the model. */
export declare interface VideoMetadata {
    /** The frame rate of the video sent to the model. If not specified, the
     default value will be 1.0. The fps range is (0.0, 24.0]. */
    fps?: number;
    /** Optional. The end offset of the video. */
    endOffset?: string;
    /** Optional. The start offset of the video. */
    startOffset?: string;
}

/** The configuration for the voice to use. */
export declare interface VoiceConfig {
    /** The configuration for the speaker to use.
     */
    prebuiltVoiceConfig?: PrebuiltVoiceConfig;
}

declare interface WebSocket_2 {
    /**
     * Connects the socket to the server.
     */
    connect(): void;
    /**
     * Sends a message to the server.
     */
    send(message: string): void;
    /**
     * Closes the socket connection.
     */
    close(): void;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
declare interface WebSocketCallbacks {
    onopen: () => void;
    onerror: (e: any) => void;
    onmessage: (e: any) => void;
    onclose: (e: any) => void;
}

declare interface WebSocketFactory {
    /**
     * Returns a new WebSocket instance.
     */
    create(url: string, headers: Record<string, string>, callbacks: WebSocketCallbacks): WebSocket_2;
}

/** Maps a prompt to a relative weight to steer music generation. */
export declare interface WeightedPrompt {
    /** Text prompt. */
    text?: string;
    /** Weight of the prompt. The weight is used to control the relative
     importance of the prompt. Higher weights are more important than lower
     weights.

     Weight must not be 0. Weights of all weighted_prompts in this
     LiveMusicClientContent message will be normalized. */
    weight?: number;
}

export { }
