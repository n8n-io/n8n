import { LanguageModelV3FunctionTool, LanguageModelV3ProviderTool, ImageModelV3File, AISDKError, JSONSchema7, JSONParseError, TypeValidationError, JSONValue, APICallError, LanguageModelV3Prompt, SharedV3ProviderOptions, TypeValidationContext } from '@ai-sdk/provider';
import { StandardSchemaV1, StandardJSONSchemaV1 } from '@standard-schema/spec';
export * from '@standard-schema/spec';
import * as z3 from 'zod/v3';
import * as z4 from 'zod/v4';
export { EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

declare function combineHeaders(...headers: Array<Record<string, string | undefined> | undefined>): Record<string, string | undefined>;

/**
 * Converts an AsyncIterator to a ReadableStream.
 *
 * @template T - The type of elements produced by the AsyncIterator.
 * @param { <T>} iterator - The AsyncIterator to convert.
 * @returns {ReadableStream<T>} - A ReadableStream that provides the same data as the AsyncIterator.
 */
declare function convertAsyncIteratorToReadableStream<T>(iterator: AsyncIterator<T>): ReadableStream<T>;

/**
 * Interface for mapping between custom tool names and provider tool names.
 */
interface ToolNameMapping {
    /**
     * Maps a custom tool name (used by the client) to the provider's tool name.
     * If the custom tool name does not have a mapping, returns the input name.
     *
     * @param customToolName - The custom name of the tool defined by the client.
     * @returns The corresponding provider tool name, or the input name if not mapped.
     */
    toProviderToolName: (customToolName: string) => string;
    /**
     * Maps a provider tool name to the custom tool name used by the client.
     * If the provider tool name does not have a mapping, returns the input name.
     *
     * @param providerToolName - The name of the tool as understood by the provider.
     * @returns The corresponding custom tool name, or the input name if not mapped.
     */
    toCustomToolName: (providerToolName: string) => string;
}
/**
 * @param tools - Tools that were passed to the language model.
 * @param providerToolNames - Maps the provider tool ids to the provider tool names.
 */
declare function createToolNameMapping({ tools, providerToolNames, resolveProviderToolName, }: {
    /**
     * Tools that were passed to the language model.
     */
    tools: Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool> | undefined;
    /**
     * Maps the provider tool ids to the provider tool names.
     */
    providerToolNames: Record<`${string}.${string}`, string>;
    /**
     * Optional resolver for provider tool names that cannot be represented as
     * static id -> name mappings (e.g. dynamic provider names).
     */
    resolveProviderToolName?: (tool: LanguageModelV3ProviderTool) => string | undefined;
}): ToolNameMapping;

/**
 * Creates a Promise that resolves after a specified delay
 * @param delayInMs - The delay duration in milliseconds. If null or undefined, resolves immediately.
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns A Promise that resolves after the specified delay
 * @throws {DOMException} When the signal is aborted
 */
declare function delay(delayInMs?: number | null, options?: {
    abortSignal?: AbortSignal;
}): Promise<void>;

/**
 * Delayed promise. It is only constructed once the value is accessed.
 * This is useful to avoid unhandled promise rejections when the promise is created
 * but not accessed.
 */
declare class DelayedPromise<T> {
    private status;
    private _promise;
    private _resolve;
    private _reject;
    get promise(): Promise<T>;
    resolve(value: T): void;
    reject(error: unknown): void;
    isResolved(): boolean;
    isRejected(): boolean;
    isPending(): boolean;
}

/**
 * Extracts the headers from a response object and returns them as a key-value object.
 *
 * @param response - The response object to extract headers from.
 * @returns The headers as a key-value object.
 */
declare function extractResponseHeaders(response: Response): {
    [k: string]: string;
};

/**
 * Convert an ImageModelV3File to a URL or data URI string.
 *
 * If the file is a URL, it returns the URL as-is.
 * If the file is base64 data, it returns a data URI with the base64 data.
 * If the file is a Uint8Array, it converts it to base64 and returns a data URI.
 */
declare function convertImageModelFileToDataUri(file: ImageModelV3File): string;

/**
 * Converts an input object to FormData for multipart/form-data requests.
 *
 * Handles the following cases:
 * - `null` or `undefined` values are skipped
 * - Arrays with a single element are appended as a single value
 * - Arrays with multiple elements are appended with `[]` suffix (e.g., `image[]`)
 *   unless `useArrayBrackets` is set to `false`
 * - All other values are appended directly
 *
 * @param input - The input object to convert. Use a generic type for type validation.
 * @param options - Optional configuration object.
 * @param options.useArrayBrackets - Whether to add `[]` suffix for multi-element arrays.
 *   Defaults to `true`. Set to `false` for APIs that expect repeated keys without brackets.
 * @returns A FormData object containing the input values.
 *
 * @example
 * ```ts
 * type MyInput = {
 *   model: string;
 *   prompt: string;
 *   images: Blob[];
 * };
 *
 * const formData = convertToFormData<MyInput>({
 *   model: 'gpt-image-1',
 *   prompt: 'A cat',
 *   images: [blob1, blob2],
 * });
 * ```
 */
declare function convertToFormData<T extends Record<string, unknown>>(input: T, options?: {
    useArrayBrackets?: boolean;
}): FormData;

/**
 * Download a file from a URL and return it as a Blob.
 *
 * @param url - The URL to download from.
 * @param options - Optional settings for the download.
 * @param options.maxBytes - Maximum allowed download size in bytes. Defaults to 100 MiB.
 * @param options.abortSignal - An optional abort signal to cancel the download.
 * @returns A Promise that resolves to the downloaded Blob.
 *
 * @throws DownloadError if the download fails or exceeds maxBytes.
 */
declare function downloadBlob(url: string, options?: {
    maxBytes?: number;
    abortSignal?: AbortSignal;
}): Promise<Blob>;

declare const symbol: unique symbol;
declare class DownloadError extends AISDKError {
    private readonly [symbol];
    readonly url: string;
    readonly statusCode?: number;
    readonly statusText?: string;
    constructor({ url, statusCode, statusText, cause, message, }: {
        url: string;
        statusCode?: number;
        statusText?: string;
        message?: string;
        cause?: unknown;
    });
    static isInstance(error: unknown): error is DownloadError;
}

/**
 * Default maximum download size: 2 GiB.
 *
 * `fetch().arrayBuffer()` has ~2x peak memory overhead (undici buffers the
 * body internally, then creates the JS ArrayBuffer), so very large downloads
 * risk exceeding the default V8 heap limit on 64-bit systems and terminating
 * the process with an out-of-memory error.
 *
 * Setting this limit converts an unrecoverable OOM crash into a catchable
 * `DownloadError`.
 */
declare const DEFAULT_MAX_DOWNLOAD_SIZE: number;
/**
 * Reads a fetch Response body with a size limit to prevent memory exhaustion.
 *
 * Checks the Content-Length header for early rejection, then reads the body
 * incrementally via ReadableStream and aborts with a DownloadError when the
 * limit is exceeded.
 *
 * @param response - The fetch Response to read.
 * @param url - The URL being downloaded (used in error messages).
 * @param maxBytes - Maximum allowed bytes. Defaults to DEFAULT_MAX_DOWNLOAD_SIZE.
 * @returns A Uint8Array containing the response body.
 * @throws DownloadError if the response exceeds maxBytes.
 */
declare function readResponseWithSizeLimit({ response, url, maxBytes, }: {
    response: Response;
    url: string;
    maxBytes?: number;
}): Promise<Uint8Array>;

/**
 * Fetch function type (standardizes the version of fetch used).
 */
type FetchFunction = typeof globalThis.fetch;

/**
 * Creates an ID generator.
 * The total length of the ID is the sum of the prefix, separator, and random part length.
 * Not cryptographically secure.
 *
 * @param alphabet - The alphabet to use for the ID. Default: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.
 * @param prefix - The prefix of the ID to generate. Optional.
 * @param separator - The separator between the prefix and the random part of the ID. Default: '-'.
 * @param size - The size of the random part of the ID to generate. Default: 16.
 */
declare const createIdGenerator: ({ prefix, size, alphabet, separator, }?: {
    prefix?: string;
    separator?: string;
    size?: number;
    alphabet?: string;
}) => IdGenerator;
/**
 * A function that generates an ID.
 */
type IdGenerator = () => string;
/**
 * Generates a 16-character random string to use for IDs.
 * Not cryptographically secure.
 */
declare const generateId: IdGenerator;

declare function getErrorMessage(error: unknown | undefined): string;

/**
 * Used to mark schemas so we can support both Zod and custom schemas.
 */
declare const schemaSymbol: unique symbol;
type ValidationResult<OBJECT> = {
    success: true;
    value: OBJECT;
} | {
    success: false;
    error: Error;
};
type Schema<OBJECT = unknown> = {
    /**
     * Used to mark schemas so we can support both Zod and custom schemas.
     */
    [schemaSymbol]: true;
    /**
     * Schema type for inference.
     */
    _type: OBJECT;
    /**
     * Optional. Validates that the structure of a value matches this schema,
     * and returns a typed version of the value if it does.
     */
    readonly validate?: (value: unknown) => ValidationResult<OBJECT> | PromiseLike<ValidationResult<OBJECT>>;
    /**
     * The JSON Schema for the schema. It is passed to the providers.
     */
    readonly jsonSchema: JSONSchema7 | PromiseLike<JSONSchema7>;
};
/**
 * Creates a schema with deferred creation.
 * This is important to reduce the startup time of the library
 * and to avoid initializing unused validators.
 *
 * @param createValidator A function that creates a schema.
 * @returns A function that returns a schema.
 */
declare function lazySchema<SCHEMA>(createSchema: () => Schema<SCHEMA>): LazySchema<SCHEMA>;
type LazySchema<SCHEMA> = () => Schema<SCHEMA>;
type ZodSchema<SCHEMA = any> = z3.Schema<SCHEMA, z3.ZodTypeDef, any> | z4.core.$ZodType<SCHEMA, any>;
type StandardSchema<SCHEMA = any> = StandardSchemaV1<unknown, SCHEMA> & StandardJSONSchemaV1<unknown, SCHEMA>;
type FlexibleSchema<SCHEMA = any> = Schema<SCHEMA> | LazySchema<SCHEMA> | ZodSchema<SCHEMA> | StandardSchema<SCHEMA>;
type InferSchema<SCHEMA> = SCHEMA extends ZodSchema<infer T> ? T : SCHEMA extends StandardSchema<infer T> ? T : SCHEMA extends LazySchema<infer T> ? T : SCHEMA extends Schema<infer T> ? T : never;
/**
 * Create a schema using a JSON Schema.
 *
 * @param jsonSchema The JSON Schema for the schema.
 * @param options.validate Optional. A validation function for the schema.
 */
declare function jsonSchema<OBJECT = unknown>(jsonSchema: JSONSchema7 | PromiseLike<JSONSchema7> | (() => JSONSchema7 | PromiseLike<JSONSchema7>), { validate, }?: {
    validate?: (value: unknown) => ValidationResult<OBJECT> | PromiseLike<ValidationResult<OBJECT>>;
}): Schema<OBJECT>;
declare function asSchema<OBJECT>(schema: FlexibleSchema<OBJECT> | undefined): Schema<OBJECT>;
declare function zodSchema<OBJECT>(zodSchema: z4.core.$ZodType<OBJECT, any> | z3.Schema<OBJECT, z3.ZodTypeDef, any>, options?: {
    /**
     * Enables support for references in the schema.
     * This is required for recursive schemas, e.g. with `z.lazy`.
     * However, not all language models and providers support such references.
     * Defaults to `false`.
     */
    useReferences?: boolean;
}): Schema<OBJECT>;

/**
 * Parses a JSON string into an unknown object.
 *
 * @param text - The JSON string to parse.
 * @returns {JSONValue} - The parsed JSON object.
 */
declare function parseJSON(options: {
    text: string;
    schema?: undefined;
}): Promise<JSONValue>;
/**
 * Parses a JSON string into a strongly-typed object using the provided schema.
 *
 * @template T - The type of the object to parse the JSON into.
 * @param {string} text - The JSON string to parse.
 * @param {Validator<T>} schema - The schema to use for parsing the JSON.
 * @returns {Promise<T>} - The parsed object.
 */
declare function parseJSON<T>(options: {
    text: string;
    schema: FlexibleSchema<T>;
}): Promise<T>;
type ParseResult<T> = {
    success: true;
    value: T;
    rawValue: unknown;
} | {
    success: false;
    error: JSONParseError | TypeValidationError;
    rawValue: unknown;
};
/**
 * Safely parses a JSON string and returns the result as an object of type `unknown`.
 *
 * @param text - The JSON string to parse.
 * @returns {Promise<object>} Either an object with `success: true` and the parsed data, or an object with `success: false` and the error that occurred.
 */
declare function safeParseJSON(options: {
    text: string;
    schema?: undefined;
}): Promise<ParseResult<JSONValue>>;
/**
 * Safely parses a JSON string into a strongly-typed object, using a provided schema to validate the object.
 *
 * @template T - The type of the object to parse the JSON into.
 * @param {string} text - The JSON string to parse.
 * @param {Validator<T>} schema - The schema to use for parsing the JSON.
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object.
 */
declare function safeParseJSON<T>(options: {
    text: string;
    schema: FlexibleSchema<T>;
}): Promise<ParseResult<T>>;
declare function isParsableJson(input: string): boolean;

type ResponseHandler<RETURN_TYPE> = (options: {
    url: string;
    requestBodyValues: unknown;
    response: Response;
}) => PromiseLike<{
    value: RETURN_TYPE;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const createJsonErrorResponseHandler: <T>({ errorSchema, errorToMessage, isRetryable, }: {
    errorSchema: FlexibleSchema<T>;
    errorToMessage: (error: T) => string;
    isRetryable?: (response: Response, error?: T) => boolean;
}) => ResponseHandler<APICallError>;
declare const createEventSourceResponseHandler: <T>(chunkSchema: FlexibleSchema<T>) => ResponseHandler<ReadableStream<ParseResult<T>>>;
declare const createJsonResponseHandler: <T>(responseSchema: FlexibleSchema<T>) => ResponseHandler<T>;
declare const createBinaryResponseHandler: () => ResponseHandler<Uint8Array>;
declare const createStatusCodeErrorResponseHandler: () => ResponseHandler<APICallError>;

declare const getFromApi: <T>({ url, headers, successfulResponseHandler, failedResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    failedResponseHandler: ResponseHandler<Error>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;

declare function getRuntimeEnvironmentUserAgent(globalThisAny?: any): string;

declare function injectJsonInstructionIntoMessages({ messages, schema, schemaPrefix, schemaSuffix, }: {
    messages: LanguageModelV3Prompt;
    schema?: JSONSchema7;
    schemaPrefix?: string;
    schemaSuffix?: string;
}): LanguageModelV3Prompt;

declare function isAbortError(error: unknown): error is Error;

/**
 * Type guard that checks whether a value is not `null` or `undefined`.
 *
 * @template T - The type of the value to check.
 * @param value - The value to check.
 * @returns `true` if the value is neither `null` nor `undefined`, otherwise `false`.
 */
declare function isNonNullable<T>(value: T | undefined | null): value is NonNullable<T>;

/**
 * Checks if the given URL is supported natively by the model.
 *
 * @param mediaType - The media type of the URL. Case-sensitive.
 * @param url - The URL to check.
 * @param supportedUrls - A record where keys are case-sensitive media types (or '*')
 *                        and values are arrays of RegExp patterns for URLs.
 *
 * @returns `true` if the URL matches a pattern under the specific media type
 *          or the wildcard '*', `false` otherwise.
 */
declare function isUrlSupported({ mediaType, url, supportedUrls, }: {
    mediaType: string;
    url: string;
    supportedUrls: Record<string, RegExp[]>;
}): boolean;

declare function loadApiKey({ apiKey, environmentVariableName, apiKeyParameterName, description, }: {
    apiKey: string | undefined;
    environmentVariableName: string;
    apiKeyParameterName?: string;
    description: string;
}): string;

/**
 * Loads an optional `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @returns The setting value.
 */
declare function loadOptionalSetting({ settingValue, environmentVariableName, }: {
    settingValue: string | undefined;
    environmentVariableName: string;
}): string | undefined;

/**
 * Loads a `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @param settingName - The setting name.
 * @param description - The description of the setting.
 * @returns The setting value.
 */
declare function loadSetting({ settingValue, environmentVariableName, settingName, description, }: {
    settingValue: string | undefined;
    environmentVariableName: string;
    settingName: string;
    description: string;
}): string;

type MaybePromiseLike<T> = T | PromiseLike<T>;

/**
 * Maps a media type to its corresponding file extension.
 * It was originally introduced to set a filename for audio file uploads
 * in https://github.com/vercel/ai/pull/8159.
 *
 * @param mediaType The media type to map.
 * @returns The corresponding file extension
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
 */
declare function mediaTypeToExtension(mediaType: string): string;

/**
 * Normalizes different header inputs into a plain record with lower-case keys.
 * Entries with `undefined` or `null` values are removed.
 *
 * @param headers - Input headers (`Headers`, tuples array, plain record) to normalize.
 * @returns A record containing the normalized header entries.
 */
declare function normalizeHeaders(headers: HeadersInit | Record<string, string | undefined> | Array<[string, string | undefined]> | undefined): Record<string, string>;

/**
 * Parses a JSON event stream into a stream of parsed JSON objects.
 */
declare function parseJsonEventStream<T>({ stream, schema, }: {
    stream: ReadableStream<Uint8Array>;
    schema: FlexibleSchema<T>;
}): ReadableStream<ParseResult<T>>;

declare function parseProviderOptions<OPTIONS>({ provider, providerOptions, schema, }: {
    provider: string;
    providerOptions: Record<string, unknown> | undefined;
    schema: FlexibleSchema<OPTIONS>;
}): Promise<OPTIONS | undefined>;

declare const postJsonToApi: <T>({ url, headers, body, failedResponseHandler, successfulResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    body: unknown;
    failedResponseHandler: ResponseHandler<APICallError>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const postFormDataToApi: <T>({ url, headers, formData, failedResponseHandler, successfulResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    formData: FormData;
    failedResponseHandler: ResponseHandler<APICallError>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const postToApi: <T>({ url, headers, body, successfulResponseHandler, failedResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    body: {
        content: string | FormData | Uint8Array;
        values: unknown;
    };
    failedResponseHandler: ResponseHandler<Error>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;

/**
 * Data content. Can either be a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer.
 */
type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

/**
 * Additional provider-specific options.
 *
 * They are passed through to the provider from the AI SDK and enable
 * provider-specific functionality that can be fully encapsulated in the provider.
 */
type ProviderOptions = SharedV3ProviderOptions;

/**
 * Text content part of a prompt. It contains a string of text.
 */
interface TextPart {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}
/**
 * Image content part of a prompt. It contains an image.
 */
interface ImagePart {
    type: 'image';
    /**
     * Image data. Can either be:
     *
     * - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
     * - URL: a URL that points to the image
     */
    image: DataContent | URL;
    /**
     * Optional IANA media type of the image.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType?: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}
/**
 * File content part of a prompt. It contains a file.
 */
interface FilePart {
    type: 'file';
    /**
     * File data. Can either be:
     *
     * - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
     * - URL: a URL that points to the image
     */
    data: DataContent | URL;
    /**
     * Optional filename of the file.
     */
    filename?: string;
    /**
     * IANA media type of the file.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}
/**
 * Reasoning content part of a prompt. It contains a reasoning.
 */
interface ReasoningPart {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}
/**
 * Tool call content part of a prompt. It contains a tool call (usually generated by the AI model).
 */
interface ToolCallPart {
    type: 'tool-call';
    /**
     * ID of the tool call. This ID is used to match the tool call with the tool result.
     */
    toolCallId: string;
    /**
     * Name of the tool that is being called.
     */
    toolName: string;
    /**
     * Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    input: unknown;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Whether the tool call was executed by the provider.
     */
    providerExecuted?: boolean;
}
/**
 * Tool result content part of a prompt. It contains the result of the tool call with the matching ID.
 */
interface ToolResultPart {
    type: 'tool-result';
    /**
     * ID of the tool call that this result is associated with.
     */
    toolCallId: string;
    /**
     * Name of the tool that generated this result.
     */
    toolName: string;
    /**
     * Result of the tool call. This is a JSON-serializable object.
     */
    output: ToolResultOutput;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}
/**
 * Output of a tool result.
 */
type ToolResultOutput = {
    /**
     * Text tool output that should be directly sent to the API.
     */
    type: 'text';
    value: string;
    /**
     * Provider-specific options.
     */
    providerOptions?: ProviderOptions;
} | {
    type: 'json';
    value: JSONValue;
    /**
     * Provider-specific options.
     */
    providerOptions?: ProviderOptions;
} | {
    /**
     * Type when the user has denied the execution of the tool call.
     */
    type: 'execution-denied';
    /**
     * Optional reason for the execution denial.
     */
    reason?: string;
    /**
     * Provider-specific options.
     */
    providerOptions?: ProviderOptions;
} | {
    type: 'error-text';
    value: string;
    /**
     * Provider-specific options.
     */
    providerOptions?: ProviderOptions;
} | {
    type: 'error-json';
    value: JSONValue;
    /**
     * Provider-specific options.
     */
    providerOptions?: ProviderOptions;
} | {
    type: 'content';
    value: Array<{
        type: 'text';
        /**
         * Text content.
         */
        text: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        /**
         * @deprecated Use image-data or file-data instead.
         */
        type: 'media';
        data: string;
        mediaType: string;
    } | {
        type: 'file-data';
        /**
         * Base-64 encoded media data.
         */
        data: string;
        /**
         * IANA media type.
         * @see https://www.iana.org/assignments/media-types/media-types.xhtml
         */
        mediaType: string;
        /**
         * Optional filename of the file.
         */
        filename?: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        type: 'file-url';
        /**
         * URL of the file.
         */
        url: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        type: 'file-id';
        /**
         * ID of the file.
         *
         * If you use multiple providers, you need to
         * specify the provider specific ids using
         * the Record option. The key is the provider
         * name, e.g. 'openai' or 'anthropic'.
         */
        fileId: string | Record<string, string>;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        /**
         * Images that are referenced using base64 encoded data.
         */
        type: 'image-data';
        /**
         * Base-64 encoded image data.
         */
        data: string;
        /**
         * IANA media type.
         * @see https://www.iana.org/assignments/media-types/media-types.xhtml
         */
        mediaType: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        /**
         * Images that are referenced using a URL.
         */
        type: 'image-url';
        /**
         * URL of the image.
         */
        url: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        /**
         * Images that are referenced using a provider file id.
         */
        type: 'image-file-id';
        /**
         * Image that is referenced using a provider file id.
         *
         * If you use multiple providers, you need to
         * specify the provider specific ids using
         * the Record option. The key is the provider
         * name, e.g. 'openai' or 'anthropic'.
         */
        fileId: string | Record<string, string>;
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    } | {
        /**
         * Custom content part. This can be used to implement
         * provider-specific content parts.
         */
        type: 'custom';
        /**
         * Provider-specific options.
         */
        providerOptions?: ProviderOptions;
    }>;
};

/**
 * Tool approval request prompt part.
 */
type ToolApprovalRequest = {
    type: 'tool-approval-request';
    /**
     * ID of the tool approval.
     */
    approvalId: string;
    /**
     * ID of the tool call that the approval request is for.
     */
    toolCallId: string;
};

/**
 * An assistant message. It can contain text, tool calls, or a combination of text and tool calls.
 */
type AssistantModelMessage = {
    role: 'assistant';
    content: AssistantContent;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};
/**
 * Content of an assistant message.
 * It can be a string or an array of text, image, reasoning, redacted reasoning, and tool call parts.
 */
type AssistantContent = string | Array<TextPart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart | ToolApprovalRequest>;

/**
 * A system message. It can contain system information.
 *
 * Note: using the "system" part of the prompt is strongly preferred
 * to increase the resilience against prompt injection attacks,
 * and because not all providers support several system messages.
 */
type SystemModelMessage = {
    role: 'system';
    content: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};

/**
 * Tool approval response prompt part.
 */
type ToolApprovalResponse = {
    type: 'tool-approval-response';
    /**
     * ID of the tool approval.
     */
    approvalId: string;
    /**
     * Flag indicating whether the approval was granted or denied.
     */
    approved: boolean;
    /**
     * Optional reason for the approval or denial.
     */
    reason?: string;
    /**
     * Flag indicating whether the tool call is provider-executed.
     * Only provider-executed tool approval responses should be sent to the model.
     */
    providerExecuted?: boolean;
};

/**
 * A tool message. It contains the result of one or more tool calls.
 */
type ToolModelMessage = {
    role: 'tool';
    content: ToolContent;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};
/**
 * Content of a tool message. It is an array of tool result parts.
 */
type ToolContent = Array<ToolResultPart | ToolApprovalResponse>;

/**
 * A user message. It can contain text or a combination of text and images.
 */
type UserModelMessage = {
    role: 'user';
    content: UserContent;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};
/**
 * Content of a user message. It can be a string or an array of text and image parts.
 */
type UserContent = string | Array<TextPart | ImagePart | FilePart>;

/**
 * A message that can be used in the `messages` field of a prompt.
 * It can be a user message, an assistant message, or a tool message.
 */
type ModelMessage = SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage;

/**
 * Additional options that are sent into each tool call.
 */
interface ToolExecutionOptions {
    /**
     * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
     */
    toolCallId: string;
    /**
     * Messages that were sent to the language model to initiate the response that contained the tool call.
     * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
     */
    messages: ModelMessage[];
    /**
     * An optional abort signal that indicates that the overall operation should be aborted.
     */
    abortSignal?: AbortSignal;
    /**
     * User-defined context.
     *
     * Treat the context object as immutable inside tools.
     * Mutating the context object can lead to race conditions and unexpected results
     * when tools are called in parallel.
     *
     * If you need to mutate the context, analyze the tool calls and results
     * in `prepareStep` and update it there.
     *
     * Experimental (can break in patch releases).
     */
    experimental_context?: unknown;
}
/**
 * Function that is called to determine if the tool needs approval before it can be executed.
 */
type ToolNeedsApprovalFunction<INPUT> = (input: INPUT, options: {
    /**
     * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
     */
    toolCallId: string;
    /**
     * Messages that were sent to the language model to initiate the response that contained the tool call.
     * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
     */
    messages: ModelMessage[];
    /**
     * Additional context.
     *
     * Experimental (can break in patch releases).
     */
    experimental_context?: unknown;
}) => boolean | PromiseLike<boolean>;
type ToolExecuteFunction<INPUT, OUTPUT> = (input: INPUT, options: ToolExecutionOptions) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;
type NeverOptional<N, T> = 0 extends 1 & N ? Partial<T> : [N] extends [never] ? Partial<Record<keyof T, undefined>> : T;
type ToolOutputProperties<INPUT, OUTPUT> = NeverOptional<OUTPUT, {
    /**
     * An async function that is called with the arguments from the tool call and produces a result.
     * If not provided, the tool will not be executed automatically.
     *
     * @args is the input of the tool call.
     * @options.abortSignal is a signal that can be used to abort the tool call.
     */
    execute: ToolExecuteFunction<INPUT, OUTPUT>;
    outputSchema?: FlexibleSchema<OUTPUT>;
} | {
    outputSchema: FlexibleSchema<OUTPUT>;
    execute?: never;
}>;
/**
 * A tool contains the description and the schema of the input that the tool expects.
 * This enables the language model to generate the input.
 *
 * The tool can also contain an optional execute function for the actual execution function of the tool.
 */
type Tool<INPUT extends JSONValue | unknown | never = any, OUTPUT extends JSONValue | unknown | never = any> = {
    /**
     * An optional description of what the tool does.
     * Will be used by the language model to decide whether to use the tool.
     * Not used for provider-defined tools.
     */
    description?: string;
    /**
     * An optional title of the tool.
     */
    title?: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * The schema of the input that the tool expects.
     * The language model will use this to generate the input.
     * It is also used to validate the output of the language model.
     *
     * You can use descriptions on the schema properties to make the input understandable for the language model.
     */
    inputSchema: FlexibleSchema<INPUT>;
    /**
     * An optional list of input examples that show the language
     * model what the input should look like.
     */
    inputExamples?: Array<{
        input: NoInfer<INPUT>;
    }>;
    /**
     * Whether the tool needs approval before it can be executed.
     */
    needsApproval?: boolean | ToolNeedsApprovalFunction<[INPUT] extends [never] ? unknown : INPUT>;
    /**
     * Strict mode setting for the tool.
     *
     * Providers that support strict mode will use this setting to determine
     * how the input should be generated. Strict mode will always produce
     * valid inputs, but it might limit what input schemas are supported.
     */
    strict?: boolean;
    /**
     * Optional function that is called when the argument streaming starts.
     * Only called when the tool is used in a streaming context.
     */
    onInputStart?: (options: ToolExecutionOptions) => void | PromiseLike<void>;
    /**
     * Optional function that is called when an argument streaming delta is available.
     * Only called when the tool is used in a streaming context.
     */
    onInputDelta?: (options: {
        inputTextDelta: string;
    } & ToolExecutionOptions) => void | PromiseLike<void>;
    /**
     * Optional function that is called when a tool call can be started,
     * even if the execute function is not provided.
     */
    onInputAvailable?: (options: {
        input: [INPUT] extends [never] ? unknown : INPUT;
    } & ToolExecutionOptions) => void | PromiseLike<void>;
} & ToolOutputProperties<INPUT, OUTPUT> & {
    /**
     * Optional conversion function that maps the tool result to an output that can be used by the language model.
     *
     * If not provided, the tool result will be sent as a JSON object.
     */
    toModelOutput?: (options: {
        /**
         * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
         */
        toolCallId: string;
        /**
         * The input of the tool call.
         */
        input: [INPUT] extends [never] ? unknown : INPUT;
        /**
         * The output of the tool call.
         */
        output: 0 extends 1 & OUTPUT ? any : [OUTPUT] extends [never] ? any : NoInfer<OUTPUT>;
    }) => ToolResultOutput | PromiseLike<ToolResultOutput>;
} & ({
    /**
     * Tool with user-defined input and output schemas.
     */
    type?: undefined | 'function';
} | {
    /**
     * Tool that is defined at runtime (e.g. an MCP tool).
     * The types of input and output are not known at development time.
     */
    type: 'dynamic';
} | {
    /**
     * Tool with provider-defined input and output schemas.
     */
    type: 'provider';
    /**
     * The ID of the tool. Must follow the format `<provider-name>.<unique-tool-name>`.
     */
    id: `${string}.${string}`;
    /**
     * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
     */
    args: Record<string, unknown>;
    /**
     * Whether this provider-executed tool supports deferred results.
     *
     * When true, the tool result may not be returned in the same turn as the
     * tool call (e.g., when using programmatic tool calling where a server tool
     * triggers a client-executed tool, and the server tool's result is deferred
     * until the client tool is resolved).
     *
     * This flag allows the AI SDK to handle tool results that arrive without
     * a matching tool call in the current response.
     *
     * @default false
     */
    supportsDeferredResults?: boolean;
});
/**
 * Infer the input type of a tool.
 */
type InferToolInput<TOOL extends Tool> = TOOL extends Tool<infer INPUT, any> ? INPUT : never;
/**
 * Infer the output type of a tool.
 */
type InferToolOutput<TOOL extends Tool> = TOOL extends Tool<any, infer OUTPUT> ? OUTPUT : never;
/**
 * Helper function for inferring the execute args of a tool.
 */
declare function tool<INPUT, OUTPUT>(tool: Tool<INPUT, OUTPUT>): Tool<INPUT, OUTPUT>;
declare function tool<INPUT>(tool: Tool<INPUT, never>): Tool<INPUT, never>;
declare function tool<OUTPUT>(tool: Tool<never, OUTPUT>): Tool<never, OUTPUT>;
declare function tool(tool: Tool<never, never>): Tool<never, never>;
/**
 * Defines a dynamic tool.
 */
declare function dynamicTool(tool: {
    description?: string;
    title?: string;
    providerOptions?: ProviderOptions;
    inputSchema: FlexibleSchema<unknown>;
    execute: ToolExecuteFunction<unknown, unknown>;
    /**
     * Optional conversion function that maps the tool result to an output that can be used by the language model.
     *
     * If not provided, the tool result will be sent as a JSON object.
     */
    toModelOutput?: (options: {
        /**
         * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
         */
        toolCallId: string;
        /**
         * The input of the tool call.
         */
        input: unknown;
        /**
         * The output of the tool call.
         */
        output: unknown;
    }) => ToolResultOutput | PromiseLike<ToolResultOutput>;
    /**
     * Whether the tool needs approval before it can be executed.
     */
    needsApproval?: boolean | ToolNeedsApprovalFunction<unknown>;
}): Tool<unknown, unknown> & {
    type: 'dynamic';
};

type ProviderToolFactory<INPUT, ARGS extends object> = <OUTPUT>(options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
}) => Tool<INPUT, OUTPUT>;
declare function createProviderToolFactory<INPUT, ARGS extends object>({ id, inputSchema, }: {
    id: `${string}.${string}`;
    inputSchema: FlexibleSchema<INPUT>;
}): ProviderToolFactory<INPUT, ARGS>;
type ProviderToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS extends object> = (options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
}) => Tool<INPUT, OUTPUT>;
declare function createProviderToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS extends object>({ id, inputSchema, outputSchema, supportsDeferredResults, }: {
    id: `${string}.${string}`;
    inputSchema: FlexibleSchema<INPUT>;
    outputSchema: FlexibleSchema<OUTPUT>;
    /**
     * Whether this provider-executed tool supports deferred results.
     *
     * When true, the tool result may not be returned in the same turn as the
     * tool call (e.g., when using programmatic tool calling where a server tool
     * triggers a client-executed tool, and the server tool's result is deferred
     * until the client tool is resolved).
     *
     * @default false
     */
    supportsDeferredResults?: boolean;
}): ProviderToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS>;

/**
 * Removes entries from a record where the value is null or undefined.
 * @param record - The input object whose entries may be null or undefined.
 * @returns A new object containing only entries with non-null and non-undefined values.
 */
declare function removeUndefinedEntries<T>(record: Record<string, T | undefined>): Record<string, T>;

type Resolvable<T> = MaybePromiseLike<T> | (() => MaybePromiseLike<T>);
/**
 * Resolves a value that could be a raw value, a Promise, a function returning a value,
 * or a function returning a Promise.
 */
declare function resolve<T>(value: Resolvable<T>): Promise<T>;

/**
 * Strips file extension segments from a filename.
 *
 * Examples:
 * - "report.pdf" -> "report"
 * - "archive.tar.gz" -> "archive"
 * - "filename" -> "filename"
 */
declare function stripFileExtension(filename: string): string;

declare function convertBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer>;
declare function convertUint8ArrayToBase64(array: Uint8Array): string;
declare function convertToBase64(value: string | Uint8Array): string;

/**
 * Validates that a URL is safe to download from, blocking private/internal addresses
 * to prevent SSRF attacks.
 *
 * @param url - The URL string to validate.
 * @throws DownloadError if the URL is unsafe.
 */
declare function validateDownloadUrl(url: string): void;

/**
 * Validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @param {TypeValidationContext} options.context - Optional context about what is being validated.
 * @returns {Promise<T>} - The typed object.
 */
declare function validateTypes<OBJECT>({ value, schema, context, }: {
    value: unknown;
    schema: FlexibleSchema<OBJECT>;
    context?: TypeValidationContext;
}): Promise<OBJECT>;
/**
 * Safely validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The JSON object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @param {TypeValidationContext} options.context - Optional context about what is being validated.
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object.
 */
declare function safeValidateTypes<OBJECT>({ value, schema, context, }: {
    value: unknown;
    schema: FlexibleSchema<OBJECT>;
    context?: TypeValidationContext;
}): Promise<{
    success: true;
    value: OBJECT;
    rawValue: unknown;
} | {
    success: false;
    error: TypeValidationError;
    rawValue: unknown;
}>;

declare const VERSION: string;

/**
 * Appends suffix parts to the `user-agent` header.
 * If a `user-agent` header already exists, the suffix parts are appended to it.
 * If no `user-agent` header exists, a new one is created with the suffix parts.
 * Automatically removes undefined entries from the headers.
 *
 * @param headers - The original headers.
 * @param userAgentSuffixParts - The parts to append to the `user-agent` header.
 * @returns The new headers with the `user-agent` header set or updated.
 */
declare function withUserAgentSuffix(headers: HeadersInit | Record<string, string | undefined> | undefined, ...userAgentSuffixParts: string[]): Record<string, string>;

declare function withoutTrailingSlash(url: string | undefined): string | undefined;

declare function executeTool<INPUT, OUTPUT>({ execute, input, options, }: {
    execute: ToolExecuteFunction<INPUT, OUTPUT>;
    input: INPUT;
    options: ToolExecutionOptions;
}): AsyncGenerator<{
    type: 'preliminary';
    output: OUTPUT;
} | {
    type: 'final';
    output: OUTPUT;
}>;

/**
 * Typed tool call that is returned by generateText and streamText.
 * It contains the tool call ID, the tool name, and the tool arguments.
 */
interface ToolCall<NAME extends string, INPUT> {
    /**
     * ID of the tool call. This ID is used to match the tool call with the tool result.
     */
    toolCallId: string;
    /**
     * Name of the tool that is being called.
     */
    toolName: NAME;
    /**
     * Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    input: INPUT;
    /**
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Whether the tool is dynamic.
     */
    dynamic?: boolean;
}

/**
 * Typed tool result that is returned by `generateText` and `streamText`.
 * It contains the tool call ID, the tool name, the tool arguments, and the tool result.
 */
interface ToolResult<NAME extends string, INPUT, OUTPUT> {
    /**
     * ID of the tool call. This ID is used to match the tool call with the tool result.
     */
    toolCallId: string;
    /**
     * Name of the tool that was called.
     */
    toolName: NAME;
    /**
     * Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    input: INPUT;
    /**
     * Result of the tool call. This is the result of the tool's execution.
     */
    output: OUTPUT;
    /**
     * Whether the tool result has been executed by the provider.
     */
    providerExecuted?: boolean;
    /**
     * Whether the tool is dynamic.
     */
    dynamic?: boolean;
}

/**
 * @deprecated Use ToolExecutionOptions instead.
 */
type ToolCallOptions = ToolExecutionOptions;

export { type AssistantContent, type AssistantModelMessage, DEFAULT_MAX_DOWNLOAD_SIZE, type DataContent, DelayedPromise, DownloadError, type FetchFunction, type FilePart, type FlexibleSchema, type IdGenerator, type ImagePart, type InferSchema, type InferToolInput, type InferToolOutput, type LazySchema, type MaybePromiseLike, type ModelMessage, type ParseResult, type ProviderOptions, type ProviderToolFactory, type ProviderToolFactoryWithOutputSchema, type ReasoningPart, type Resolvable, type ResponseHandler, type Schema, type SystemModelMessage, type TextPart, type Tool, type ToolApprovalRequest, type ToolApprovalResponse, type ToolCall, type ToolCallOptions, type ToolCallPart, type ToolContent, type ToolExecuteFunction, type ToolExecutionOptions, type ToolModelMessage, type ToolNameMapping, type ToolNeedsApprovalFunction, type ToolResult, type ToolResultOutput, type ToolResultPart, type UserContent, type UserModelMessage, VERSION, type ValidationResult, asSchema, combineHeaders, convertAsyncIteratorToReadableStream, convertBase64ToUint8Array, convertImageModelFileToDataUri, convertToBase64, convertToFormData, convertUint8ArrayToBase64, createBinaryResponseHandler, createEventSourceResponseHandler, createIdGenerator, createJsonErrorResponseHandler, createJsonResponseHandler, createProviderToolFactory, createProviderToolFactoryWithOutputSchema, createStatusCodeErrorResponseHandler, createToolNameMapping, delay, downloadBlob, dynamicTool, executeTool, extractResponseHeaders, generateId, getErrorMessage, getFromApi, getRuntimeEnvironmentUserAgent, injectJsonInstructionIntoMessages, isAbortError, isNonNullable, isParsableJson, isUrlSupported, jsonSchema, lazySchema, loadApiKey, loadOptionalSetting, loadSetting, mediaTypeToExtension, normalizeHeaders, parseJSON, parseJsonEventStream, parseProviderOptions, postFormDataToApi, postJsonToApi, postToApi, readResponseWithSizeLimit, removeUndefinedEntries, resolve, safeParseJSON, safeValidateTypes, stripFileExtension, tool, validateDownloadUrl, validateTypes, withUserAgentSuffix, withoutTrailingSlash, zodSchema };
