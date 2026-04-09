import { JSONSchema7 } from 'json-schema';
export { JSONSchema7, JSONSchema7Definition } from 'json-schema';

type SharedV3Headers = Record<string, string>;

/**
 * A JSON value can be a string, number, boolean, object, array, or null.
 * JSON values can be serialized and deserialized by the JSON.stringify and JSON.parse methods.
 */
type JSONValue = null | string | number | boolean | JSONObject | JSONArray;
type JSONObject = {
    [key: string]: JSONValue | undefined;
};
type JSONArray = JSONValue[];

/**
 * Additional provider-specific metadata.
 * Metadata are additional outputs from the provider.
 * They are passed through to the provider from the AI SDK
 * and enable provider-specific functionality
 * that can be fully encapsulated in the provider.
 *
 * This enables us to quickly ship provider-specific functionality
 * without affecting the core AI SDK.
 *
 * The outer record is keyed by the provider name, and the inner
 * record is keyed by the provider-specific metadata key.
 *
 * ```ts
 * {
 *   "anthropic": {
 *     "cacheControl": { "type": "ephemeral" }
 *   }
 * }
 * ```
 */
type SharedV3ProviderMetadata = Record<string, JSONObject>;

/**
 * Additional provider-specific options.
 * Options are additional input to the provider.
 * They are passed through to the provider from the AI SDK
 * and enable provider-specific functionality
 * that can be fully encapsulated in the provider.
 *
 * This enables us to quickly ship provider-specific functionality
 * without affecting the core AI SDK.
 *
 * The outer record is keyed by the provider name, and the inner
 * record is keyed by the provider-specific metadata key.
 *
 * ```ts
 * {
 *   "anthropic": {
 *     "cacheControl": { "type": "ephemeral" }
 *   }
 * }
 * ```
 */
type SharedV3ProviderOptions = Record<string, JSONObject>;

/**
 * Warning from the model.
 *
 * For example, that certain features are unsupported or compatibility
 * functionality is used (which might lead to suboptimal results).
 */
type SharedV3Warning = {
    /**
     * A feature is not supported by the model.
     */
    type: 'unsupported';
    /**
     * The feature that is not supported.
     */
    feature: string;
    /**
     * Additional details about the warning.
     */
    details?: string;
} | {
    /**
     * A compatibility feature is used that might lead to suboptimal results.
     */
    type: 'compatibility';
    /**
     * The feature that is used in a compatibility mode.
     */
    feature: string;
    /**
     * Additional details about the warning.
     */
    details?: string;
} | {
    /**
     * Other warning.
     */
    type: 'other';
    /**
     * The message of the warning.
     */
    message: string;
};

type SharedV2Headers = Record<string, string>;

/**
 * Additional provider-specific metadata.
 * Metadata are additional outputs from the provider.
 * They are passed through to the provider from the AI SDK
 * and enable provider-specific functionality
 * that can be fully encapsulated in the provider.
 *
 * This enables us to quickly ship provider-specific functionality
 * without affecting the core AI SDK.
 *
 * The outer record is keyed by the provider name, and the inner
 * record is keyed by the provider-specific metadata key.
 *
 * ```ts
 * {
 *   "anthropic": {
 *     "cacheControl": { "type": "ephemeral" }
 *   }
 * }
 * ```
 */
type SharedV2ProviderMetadata = Record<string, Record<string, JSONValue>>;

/**
 * Additional provider-specific options.
 * Options are additional input to the provider.
 * They are passed through to the provider from the AI SDK
 * and enable provider-specific functionality
 * that can be fully encapsulated in the provider.
 *
 * This enables us to quickly ship provider-specific functionality
 * without affecting the core AI SDK.
 *
 * The outer record is keyed by the provider name, and the inner
 * record is keyed by the provider-specific metadata key.
 *
 * ```ts
 * {
 *   "anthropic": {
 *     "cacheControl": { "type": "ephemeral" }
 *   }
 * }
 * ```
 */
type SharedV2ProviderOptions = Record<string, Record<string, JSONValue>>;

type EmbeddingModelV3CallOptions = {
    /**
     * List of text values to generate embeddings for.
     */
    values: Array<string>;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: SharedV3Headers;
};

/**
 * An embedding is a vector, i.e. an array of numbers.
 * It is e.g. used to represent a text as a vector of word embeddings.
 */
type EmbeddingModelV3Embedding = Array<number>;

/**
 * The result of a embedding model doEmbed call.
 */
type EmbeddingModelV3Result = {
    /**
     * Generated embeddings. They are in the same order as the input values.
     */
    embeddings: Array<EmbeddingModelV3Embedding>;
    /**
     * Token usage. We only have input tokens for embeddings.
     */
    usage?: {
        tokens: number;
    };
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    providerMetadata?: SharedV3ProviderMetadata;
    /**
     * Optional response information for debugging purposes.
     */
    response?: {
        /**
         * Response headers.
         */
        headers?: SharedV3Headers;
        /**
         * The response body.
         */
        body?: unknown;
    };
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    warnings: Array<SharedV3Warning>;
};

/**
 * Specification for an embedding model that implements the embedding model
 * interface version 3.
 *
 * It is specific to text embeddings.
 */
type EmbeddingModelV3 = {
    /**
     * The embedding model must specify which embedding model interface
     * version it implements. This will allow us to evolve the embedding
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v3';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Limit of how many embeddings can be generated in a single API call.
     *
     * Use Infinity for models that do not have a limit.
     */
    readonly maxEmbeddingsPerCall: PromiseLike<number | undefined> | number | undefined;
    /**
     * True if the model can handle multiple embedding calls in parallel.
     */
    readonly supportsParallelCalls: PromiseLike<boolean> | boolean;
    /**
     * Generates a list of embeddings for the given input text.
     *
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     */
    doEmbed(options: EmbeddingModelV3CallOptions): PromiseLike<EmbeddingModelV3Result>;
};

/**
 * An embedding is a vector, i.e. an array of numbers.
 * It is e.g. used to represent a text as a vector of word embeddings.
 */
type EmbeddingModelV2Embedding = Array<number>;

/**
 * Specification for an embedding model that implements the embedding model
 * interface version 2.
 *
 * VALUE is the type of the values that the model can embed.
 * This will allow us to go beyond text embeddings in the future,
 * e.g. to support image embeddings
 */
type EmbeddingModelV2<VALUE> = {
    /**
     * The embedding model must specify which embedding model interface
     * version it implements. This will allow us to evolve the embedding
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v2';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Limit of how many embeddings can be generated in a single API call.
     *
     * Use Infinity for models that do not have a limit.
     */
    readonly maxEmbeddingsPerCall: PromiseLike<number | undefined> | number | undefined;
    /**
     * True if the model can handle multiple embedding calls in parallel.
     */
    readonly supportsParallelCalls: PromiseLike<boolean> | boolean;
    /**
     * Generates a list of embeddings for the given input text.
     *
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     */
    doEmbed(options: {
        /**
         * List of values to embed.
         */
        values: Array<VALUE>;
        /**
         * Abort signal for cancelling the operation.
         */
        abortSignal?: AbortSignal;
        /**
         * Additional provider-specific options. They are passed through
         * to the provider from the AI SDK and enable provider-specific
         * functionality that can be fully encapsulated in the provider.
         */
        providerOptions?: SharedV2ProviderOptions;
        /**
         * Additional HTTP headers to be sent with the request.
         * Only applicable for HTTP-based providers.
         */
        headers?: Record<string, string | undefined>;
    }): PromiseLike<{
        /**
         * Generated embeddings. They are in the same order as the input values.
         */
        embeddings: Array<EmbeddingModelV2Embedding>;
        /**
         * Token usage. We only have input tokens for embeddings.
         */
        usage?: {
            tokens: number;
        };
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: SharedV2ProviderMetadata;
        /**
         * Optional response information for debugging purposes.
         */
        response?: {
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
            /**
             * The response body.
             */
            body?: unknown;
        };
    }>;
};

declare const symbol$d: unique symbol;
/**
 * Custom error class for AI SDK related errors.
 * @extends Error
 */
declare class AISDKError extends Error {
    private readonly [symbol$d];
    /**
     * The underlying cause of the error, if any.
     */
    readonly cause?: unknown;
    /**
     * Creates an AI SDK Error.
     *
     * @param {Object} params - The parameters for creating the error.
     * @param {string} params.name - The name of the error.
     * @param {string} params.message - The error message.
     * @param {unknown} [params.cause] - The underlying cause of the error.
     */
    constructor({ name, message, cause, }: {
        name: string;
        message: string;
        cause?: unknown;
    });
    /**
     * Checks if the given error is an AI SDK Error.
     * @param {unknown} error - The error to check.
     * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
     */
    static isInstance(error: unknown): error is AISDKError;
    protected static hasMarker(error: unknown, marker: string): boolean;
}

declare const symbol$c: unique symbol;
declare class APICallError extends AISDKError {
    private readonly [symbol$c];
    readonly url: string;
    readonly requestBodyValues: unknown;
    readonly statusCode?: number;
    readonly responseHeaders?: Record<string, string>;
    readonly responseBody?: string;
    readonly isRetryable: boolean;
    readonly data?: unknown;
    constructor({ message, url, requestBodyValues, statusCode, responseHeaders, responseBody, cause, isRetryable, // server error
    data, }: {
        message: string;
        url: string;
        requestBodyValues: unknown;
        statusCode?: number;
        responseHeaders?: Record<string, string>;
        responseBody?: string;
        cause?: unknown;
        isRetryable?: boolean;
        data?: unknown;
    });
    static isInstance(error: unknown): error is APICallError;
}

declare const symbol$b: unique symbol;
declare class EmptyResponseBodyError extends AISDKError {
    private readonly [symbol$b];
    constructor({ message }?: {
        message?: string;
    });
    static isInstance(error: unknown): error is EmptyResponseBodyError;
}

declare function getErrorMessage(error: unknown | undefined): string;

declare const symbol$a: unique symbol;
/**
 * A function argument is invalid.
 */
declare class InvalidArgumentError extends AISDKError {
    private readonly [symbol$a];
    readonly argument: string;
    constructor({ message, cause, argument, }: {
        argument: string;
        message: string;
        cause?: unknown;
    });
    static isInstance(error: unknown): error is InvalidArgumentError;
}

declare const symbol$9: unique symbol;
/**
 * A prompt is invalid. This error should be thrown by providers when they cannot
 * process a prompt.
 */
declare class InvalidPromptError extends AISDKError {
    private readonly [symbol$9];
    readonly prompt: unknown;
    constructor({ prompt, message, cause, }: {
        prompt: unknown;
        message: string;
        cause?: unknown;
    });
    static isInstance(error: unknown): error is InvalidPromptError;
}

declare const symbol$8: unique symbol;
/**
 * Server returned a response with invalid data content.
 * This should be thrown by providers when they cannot parse the response from the API.
 */
declare class InvalidResponseDataError extends AISDKError {
    private readonly [symbol$8];
    readonly data: unknown;
    constructor({ data, message, }: {
        data: unknown;
        message?: string;
    });
    static isInstance(error: unknown): error is InvalidResponseDataError;
}

declare const symbol$7: unique symbol;
declare class JSONParseError extends AISDKError {
    private readonly [symbol$7];
    readonly text: string;
    constructor({ text, cause }: {
        text: string;
        cause: unknown;
    });
    static isInstance(error: unknown): error is JSONParseError;
}

declare const symbol$6: unique symbol;
declare class LoadAPIKeyError extends AISDKError {
    private readonly [symbol$6];
    constructor({ message }: {
        message: string;
    });
    static isInstance(error: unknown): error is LoadAPIKeyError;
}

declare const symbol$5: unique symbol;
declare class LoadSettingError extends AISDKError {
    private readonly [symbol$5];
    constructor({ message }: {
        message: string;
    });
    static isInstance(error: unknown): error is LoadSettingError;
}

declare const symbol$4: unique symbol;
/**
 * Thrown when the AI provider fails to generate any content.
 */
declare class NoContentGeneratedError extends AISDKError {
    private readonly [symbol$4];
    constructor({ message, }?: {
        message?: string;
    });
    static isInstance(error: unknown): error is NoContentGeneratedError;
}

declare const symbol$3: unique symbol;
declare class NoSuchModelError extends AISDKError {
    private readonly [symbol$3];
    readonly modelId: string;
    readonly modelType: 'languageModel' | 'embeddingModel' | 'imageModel' | 'transcriptionModel' | 'speechModel' | 'rerankingModel' | 'videoModel';
    constructor({ errorName, modelId, modelType, message, }: {
        errorName?: string;
        modelId: string;
        modelType: 'languageModel' | 'embeddingModel' | 'imageModel' | 'transcriptionModel' | 'speechModel' | 'rerankingModel' | 'videoModel';
        message?: string;
    });
    static isInstance(error: unknown): error is NoSuchModelError;
}

declare const symbol$2: unique symbol;
declare class TooManyEmbeddingValuesForCallError extends AISDKError {
    private readonly [symbol$2];
    readonly provider: string;
    readonly modelId: string;
    readonly maxEmbeddingsPerCall: number;
    readonly values: Array<unknown>;
    constructor(options: {
        provider: string;
        modelId: string;
        maxEmbeddingsPerCall: number;
        values: Array<unknown>;
    });
    static isInstance(error: unknown): error is TooManyEmbeddingValuesForCallError;
}

declare const symbol$1: unique symbol;
interface TypeValidationContext {
    /**
     * Field path in dot notation (e.g., "message.metadata", "message.parts[3].data")
     */
    field?: string;
    /**
     * Entity name (e.g., tool name, data type name)
     */
    entityName?: string;
    /**
     * Entity identifier (e.g., message ID, tool call ID)
     */
    entityId?: string;
}
declare class TypeValidationError extends AISDKError {
    private readonly [symbol$1];
    readonly value: unknown;
    readonly context?: TypeValidationContext;
    constructor({ value, cause, context, }: {
        value: unknown;
        cause: unknown;
        context?: TypeValidationContext;
    });
    static isInstance(error: unknown): error is TypeValidationError;
    /**
     * Wraps an error into a TypeValidationError.
     * If the cause is already a TypeValidationError with the same value and context, it returns the cause.
     * Otherwise, it creates a new TypeValidationError.
     *
     * @param {Object} params - The parameters for wrapping the error.
     * @param {unknown} params.value - The value that failed validation.
     * @param {unknown} params.cause - The original error or cause of the validation failure.
     * @param {TypeValidationContext} params.context - Optional context about what is being validated.
     * @returns {TypeValidationError} A TypeValidationError instance.
     */
    static wrap({ value, cause, context, }: {
        value: unknown;
        cause: unknown;
        context?: TypeValidationContext;
    }): TypeValidationError;
}

declare const symbol: unique symbol;
declare class UnsupportedFunctionalityError extends AISDKError {
    private readonly [symbol];
    readonly functionality: string;
    constructor({ functionality, message, }: {
        functionality: string;
        message?: string;
    });
    static isInstance(error: unknown): error is UnsupportedFunctionalityError;
}

declare function isJSONValue(value: unknown): value is JSONValue;
declare function isJSONArray(value: unknown): value is JSONArray;
declare function isJSONObject(value: unknown): value is JSONObject;

/**
 * Usage information for an image model call.
 */
type ImageModelV3Usage = {
    /**
     * The number of input (prompt) tokens used.
     */
    inputTokens: number | undefined;
    /**
     * The number of output tokens used, if reported by the provider.
     */
    outputTokens: number | undefined;
    /**
     * The total number of tokens as reported by the provider.
     */
    totalTokens: number | undefined;
};

/**
 * An image file that can be used for image editing or variation generation.
 */
type ImageModelV3File = {
    type: 'file';
    /**
     * The IANA media type of the file, e.g. `image/png`. Any string is supported.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Generated file data as base64 encoded strings or binary data.
     *
     * The file data should be returned without any unnecessary conversion.
     * If the API returns base64 encoded strings, the file data should be returned
     * as base64 encoded strings. If the API returns binary data, the file data should
     * be returned as binary data.
     */
    data: string | Uint8Array;
    /**
     * Optional provider-specific metadata for the file part.
     */
    providerOptions?: SharedV3ProviderMetadata;
} | {
    type: 'url';
    /**
     * The URL of the image file.
     */
    url: string;
    /**
     * Optional provider-specific metadata for the file part.
     */
    providerOptions?: SharedV3ProviderMetadata;
};

type ImageModelV3CallOptions = {
    /**
     * Prompt for the image generation. Some operations, like upscaling, may not require a prompt.
     */
    prompt: string | undefined;
    /**
     * Number of images to generate.
     */
    n: number;
    /**
     * Size of the images to generate.
     * Must have the format `{width}x{height}`.
     * `undefined` will use the provider's default size.
     */
    size: `${number}x${number}` | undefined;
    /**
     * Aspect ratio of the images to generate.
     * Must have the format `{width}:{height}`.
     * `undefined` will use the provider's default aspect ratio.
     */
    aspectRatio: `${number}:${number}` | undefined;
    /**
     * Seed for the image generation.
     * `undefined` will use the provider's default seed.
     */
    seed: number | undefined;
    /**
     * Array of images for image editing or variation generation.
     * The images should be provided as base64 encoded strings or binary data.
     */
    files: ImageModelV3File[] | undefined;
    /**
     * Mask image for inpainting operations.
     * The mask should be provided as base64 encoded strings or binary data.
     */
    mask: ImageModelV3File | undefined;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     *
     * ```ts
     * {
     *   "openai": {
     *     "style": "vivid"
     *   }
     * }
     * ```
     */
    providerOptions: SharedV3ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

type ImageModelV3ProviderMetadata = Record<string, {
    images: JSONArray;
} & JSONValue>;
type GetMaxImagesPerCallFunction$1 = (options: {
    modelId: string;
}) => PromiseLike<number | undefined> | number | undefined;
/**
 * Image generation model specification version 3.
 */
type ImageModelV3 = {
    /**
     * The image model must specify which image model interface
     * version it implements. This will allow us to evolve the image
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v3';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Limit of how many images can be generated in a single API call.
     * Can be set to a number for a fixed limit, to undefined to use
     * the global limit, or a function that returns a number or undefined,
     * optionally as a promise.
     */
    readonly maxImagesPerCall: number | undefined | GetMaxImagesPerCallFunction$1;
    /**
     * Generates an array of images.
     */
    doGenerate(options: ImageModelV3CallOptions): PromiseLike<{
        /**
         * Generated images as base64 encoded strings or binary data.
         * The images should be returned without any unnecessary conversion.
         * If the API returns base64 encoded strings, the images should be returned
         * as base64 encoded strings. If the API returns binary data, the images should
         * be returned as binary data.
         */
        images: Array<string> | Array<Uint8Array>;
        /**
         * Warnings for the call, e.g. unsupported features.
         */
        warnings: Array<SharedV3Warning>;
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         *
         * The outer record is keyed by the provider name, and the inner
         * record is provider-specific metadata. It always includes an
         * `images` key with image-specific metadata
         *
         * ```ts
         * {
         * "openai": {
         * "images": ["revisedPrompt": "Revised prompt here."]
         * }
         * }
         * ```
         */
        providerMetadata?: ImageModelV3ProviderMetadata;
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers: Record<string, string> | undefined;
        };
        /**
         * Optional token usage for the image generation call (if the provider reports it).
         */
        usage?: ImageModelV3Usage;
    }>;
};

type ImageModelV2CallOptions = {
    /**
     * Prompt for the image generation.
     */
    prompt: string;
    /**
     * Number of images to generate.
     */
    n: number;
    /**
     * Size of the images to generate.
     * Must have the format `{width}x{height}`.
     * `undefined` will use the provider's default size.
     */
    size: `${number}x${number}` | undefined;
    /**
     * Aspect ratio of the images to generate.
     * Must have the format `{width}:{height}`.
     * `undefined` will use the provider's default aspect ratio.
     */
    aspectRatio: `${number}:${number}` | undefined;
    /**
     * Seed for the image generation.
     * `undefined` will use the provider's default seed.
     */
    seed: number | undefined;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     * "openai": {
     * "style": "vivid"
     * }
     * }
     * ```
     */
    providerOptions: SharedV2ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type ImageModelV2CallWarning = {
    type: 'unsupported-setting';
    setting: keyof ImageModelV2CallOptions;
    details?: string;
} | {
    type: 'other';
    message: string;
};

type ImageModelV2ProviderMetadata = Record<string, {
    images: JSONArray;
} & JSONValue>;
type GetMaxImagesPerCallFunction = (options: {
    modelId: string;
}) => PromiseLike<number | undefined> | number | undefined;
/**
 * Image generation model specification version 2.
 */
type ImageModelV2 = {
    /**
     * The image model must specify which image model interface
     * version it implements. This will allow us to evolve the image
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v2';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Limit of how many images can be generated in a single API call.
     * Can be set to a number for a fixed limit, to undefined to use
     * the global limit, or a function that returns a number or undefined,
     * optionally as a promise.
     */
    readonly maxImagesPerCall: number | undefined | GetMaxImagesPerCallFunction;
    /**
     * Generates an array of images.
     */
    doGenerate(options: ImageModelV2CallOptions): PromiseLike<{
        /**
         * Generated images as base64 encoded strings or binary data.
         * The images should be returned without any unnecessary conversion.
         * If the API returns base64 encoded strings, the images should be returned
         * as base64 encoded strings. If the API returns binary data, the images should
         * be returned as binary data.
         */
        images: Array<string> | Array<Uint8Array>;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<ImageModelV2CallWarning>;
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         *
         * The outer record is keyed by the provider name, and the inner
         * record is provider-specific metadata. It always includes an
         * `images` key with image-specific metadata
         *
         * ```ts
         * {
         * "openai": {
         * "images": ["revisedPrompt": "Revised prompt here."]
         * }
         * }
         * ```
         */
        providerMetadata?: ImageModelV2ProviderMetadata;
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers: Record<string, string> | undefined;
        };
    }>;
};

/**
 * Middleware for ImageModelV3.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of ImageModelV3 operations.
 */
type ImageModelV3Middleware = {
    /**
     * Middleware specification version. Use `v3` for the current version.
     */
    readonly specificationVersion: 'v3';
    /**
     * Override the provider name if desired.
     * @param options.model - The image model instance.
     */
    overrideProvider?: (options: {
        model: ImageModelV3;
    }) => string;
    /**
     * Override the model ID if desired.
     * @param options.model - The image model instance.
     */
    overrideModelId?: (options: {
        model: ImageModelV3;
    }) => string;
    /**
     * Override the limit of how many images can be generated in a single API call if desired.
     * @param options.model - The image model instance.
     */
    overrideMaxImagesPerCall?: (options: {
        model: ImageModelV3;
    }) => ImageModelV3['maxImagesPerCall'];
    /**
     * Transforms the parameters before they are passed to the image model.
     * @param options - Object containing the parameters.
     * @param options.params - The original parameters for the image model call.
     * @returns A promise that resolves to the transformed parameters.
     */
    transformParams?: (options: {
        params: ImageModelV3CallOptions;
        model: ImageModelV3;
    }) => PromiseLike<ImageModelV3CallOptions>;
    /**
     * Wraps the generate operation of the image model.
     *
     * @param options - Object containing the generate function, parameters, and model.
     * @param options.doGenerate - The original generate function.
     * @param options.params - The parameters for the generate call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The image model instance.
     * @returns A promise that resolves to the result of the generate operation.
     */
    wrapGenerate?: (options: {
        doGenerate: () => ReturnType<ImageModelV3['doGenerate']>;
        params: ImageModelV3CallOptions;
        model: ImageModelV3;
    }) => Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>>;
};

/**
 * A tool has a name, a description, and a set of parameters.
 *
 * Note: this is **not** the user-facing tool definition. The AI SDK methods will
 * map the user-facing tool definitions to this format.
 */
type LanguageModelV3FunctionTool = {
    /**
     * The type of the tool (always 'function').
     */
    type: 'function';
    /**
     * The name of the tool. Unique within this model call.
     */
    name: string;
    /**
     * A description of the tool. The language model uses this to understand the
     * tool's purpose and to provide better completion suggestions.
     */
    description?: string;
    /**
     * The parameters that the tool expects. The language model uses this to
     * understand the tool's input requirements and to provide matching suggestions.
     */
    inputSchema: JSONSchema7;
    /**
     * An optional list of input examples that show the language
     * model what the input should look like.
     */
    inputExamples?: Array<{
        input: JSONObject;
    }>;
    /**
     * Strict mode setting for the tool.
     *
     * Providers that support strict mode will use this setting to determine
     * how the input should be generated. Strict mode will always produce
     * valid inputs, but it might limit what input schemas are supported.
     */
    strict?: boolean;
    /**
     * The provider-specific options for the tool.
     */
    providerOptions?: SharedV3ProviderOptions;
};

/**
 * Data content. Can be a Uint8Array, base64 encoded data as a string or a URL.
 */
type LanguageModelV3DataContent = Uint8Array | string | URL;

/**
 * A prompt is a list of messages.
 *
 * Note: Not all models and prompt formats support multi-modal inputs and
 * tool calls. The validation happens at runtime.
 *
 * Note: This is not a user-facing prompt. The AI SDK methods will map the
 * user-facing prompt types such as chat or instruction prompts to this format.
 */
type LanguageModelV3Prompt = Array<LanguageModelV3Message>;
type LanguageModelV3Message = ({
    role: 'system';
    content: string;
} | {
    role: 'user';
    content: Array<LanguageModelV3TextPart | LanguageModelV3FilePart>;
} | {
    role: 'assistant';
    content: Array<LanguageModelV3TextPart | LanguageModelV3FilePart | LanguageModelV3ReasoningPart | LanguageModelV3ToolCallPart | LanguageModelV3ToolResultPart>;
} | {
    role: 'tool';
    content: Array<LanguageModelV3ToolResultPart | LanguageModelV3ToolApprovalResponsePart>;
}) & {
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
};
/**
 * Text content part of a prompt. It contains a string of text.
 */
interface LanguageModelV3TextPart {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * Reasoning content part of a prompt. It contains a string of reasoning text.
 */
interface LanguageModelV3ReasoningPart {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * File content part of a prompt. It contains a file.
 */
interface LanguageModelV3FilePart {
    type: 'file';
    /**
     * Optional filename of the file.
     */
    filename?: string;
    /**
     * File data. Can be a Uint8Array, base64 encoded data as a string or a URL.
     */
    data: LanguageModelV3DataContent;
    /**
     * IANA media type of the file.
     *
     * Can support wildcards, e.g. `image/*` (in which case the provider needs to take appropriate action).
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * Tool call content part of a prompt. It contains a tool call (usually generated by the AI model).
 */
interface LanguageModelV3ToolCallPart {
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
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * Tool result content part of a prompt. It contains the result of the tool call with the matching ID.
 */
interface LanguageModelV3ToolResultPart {
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
     * Result of the tool call.
     */
    output: LanguageModelV3ToolResultOutput;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * Tool approval response content part of a prompt. It contains the user's
 * decision to approve or deny a provider-executed tool call.
 */
interface LanguageModelV3ToolApprovalResponsePart {
    type: 'tool-approval-response';
    /**
     * ID of the approval request that this response refers to.
     */
    approvalId: string;
    /**
     * Whether the approval was granted (true) or denied (false).
     */
    approved: boolean;
    /**
     * Optional reason for approval or denial.
     */
    reason?: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
}
/**
 * Result of a tool call.
 */
type LanguageModelV3ToolResultOutput = {
    /**
     * Text tool output that should be directly sent to the API.
     */
    type: 'text';
    value: string;
    /**
     * Provider-specific options.
     */
    providerOptions?: SharedV3ProviderOptions;
} | {
    type: 'json';
    value: JSONValue;
    /**
     * Provider-specific options.
     */
    providerOptions?: SharedV3ProviderOptions;
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
    providerOptions?: SharedV3ProviderOptions;
} | {
    type: 'error-text';
    value: string;
    /**
     * Provider-specific options.
     */
    providerOptions?: SharedV3ProviderOptions;
} | {
    type: 'error-json';
    value: JSONValue;
    /**
     * Provider-specific options.
     */
    providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
    } | {
        type: 'file-url';
        /**
         * URL of the file.
         */
        url: string;
        /**
         * Provider-specific options.
         */
        providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
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
        providerOptions?: SharedV3ProviderOptions;
    } | {
        /**
         * Custom content part. This can be used to implement
         * provider-specific content parts.
         */
        type: 'custom';
        /**
         * Provider-specific options.
         */
        providerOptions?: SharedV3ProviderOptions;
    }>;
};

/**
 * The configuration of a provider tool.
 *
 * Provider tools are tools that are specific to a certain provider.
 * The input and output schemas are defined be the provider, and
 * some of the tools are also executed on the provider systems.
 */
type LanguageModelV3ProviderTool = {
    /**
     * The type of the tool (always 'provider').
     */
    type: 'provider';
    /**
     * The ID of the tool. Should follow the format `<provider-id>.<unique-tool-name>`.
     */
    id: `${string}.${string}`;
    /**
     * The name of the tool. Unique within this model call.
     */
    name: string;
    /**
     * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
     */
    args: Record<string, unknown>;
};

type LanguageModelV3ToolChoice = {
    type: 'auto';
} | {
    type: 'none';
} | {
    type: 'required';
} | {
    type: 'tool';
    toolName: string;
};

type LanguageModelV3CallOptions = {
    /**
     * A language mode prompt is a standardized prompt type.
     *
     * Note: This is **not** the user-facing prompt. The AI SDK methods will map the
     * user-facing prompt types such as chat or instruction prompts to this format.
     * That approach allows us to evolve the user  facing prompts without breaking
     * the language model interface.
     */
    prompt: LanguageModelV3Prompt;
    /**
     * Maximum number of tokens to generate.
     */
    maxOutputTokens?: number;
    /**
     * Temperature setting. The range depends on the provider and model.
     */
    temperature?: number;
    /**
     * Stop sequences.
     * If set, the model will stop generating text when one of the stop sequences is generated.
     * Providers may have limits on the number of stop sequences.
     */
    stopSequences?: string[];
    /**
     * Nucleus sampling.
     */
    topP?: number;
    /**
     * Only sample from the top K options for each subsequent token.
     *
     * Used to remove "long tail" low probability responses.
     * Recommended for advanced use cases only. You usually only need to use temperature.
     */
    topK?: number;
    /**
     * Presence penalty setting. It affects the likelihood of the model to
     * repeat information that is already in the prompt.
     */
    presencePenalty?: number;
    /**
     * Frequency penalty setting. It affects the likelihood of the model
     * to repeatedly use the same words or phrases.
     */
    frequencyPenalty?: number;
    /**
     * Response format. The output can either be text or JSON. Default is text.
     *
     * If JSON is selected, a schema can optionally be provided to guide the LLM.
     */
    responseFormat?: {
        type: 'text';
    } | {
        type: 'json';
        /**
         * JSON schema that the generated output should conform to.
         */
        schema?: JSONSchema7;
        /**
         * Name of output that should be generated. Used by some providers for additional LLM guidance.
         */
        name?: string;
        /**
         * Description of the output that should be generated. Used by some providers for additional LLM guidance.
         */
        description?: string;
    };
    /**
     * The seed (integer) to use for random sampling. If set and supported
     * by the model, calls will generate deterministic results.
     */
    seed?: number;
    /**
     * The tools that are available for the model.
     */
    tools?: Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool>;
    /**
     * Specifies how the tool should be selected. Defaults to 'auto'.
     */
    toolChoice?: LanguageModelV3ToolChoice;
    /**
     * Include raw chunks in the stream. Only applicable for streaming calls.
     */
    includeRawChunks?: boolean;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
};

/**
 * A file that has been generated by the model.
 * Generated files as base64 encoded strings or binary data.
 * The files should be returned without any unnecessary conversion.
 */
type LanguageModelV3File = {
    type: 'file';
    /**
     * The IANA media type of the file, e.g. `image/png` or `audio/mp3`.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Generated file data as base64 encoded strings or binary data.
     *
     * The file data should be returned without any unnecessary conversion.
     * If the API returns base64 encoded strings, the file data should be returned
     * as base64 encoded strings. If the API returns binary data, the file data should
     * be returned as binary data.
     */
    data: string | Uint8Array;
    /**
     * Optional provider-specific metadata for the file part.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * Reasoning that the model has generated.
 */
type LanguageModelV3Reasoning = {
    type: 'reasoning';
    text: string;
    /**
     * Optional provider-specific metadata for the reasoning part.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * A source that has been used as input to generate the response.
 */
type LanguageModelV3Source = {
    type: 'source';
    /**
     * The type of source - URL sources reference web content.
     */
    sourceType: 'url';
    /**
     * The ID of the source.
     */
    id: string;
    /**
     * The URL of the source.
     */
    url: string;
    /**
     * The title of the source.
     */
    title?: string;
    /**
     * Additional provider metadata for the source.
     */
    providerMetadata?: SharedV3ProviderMetadata;
} | {
    type: 'source';
    /**
     * The type of source - document sources reference files/documents.
     */
    sourceType: 'document';
    /**
     * The ID of the source.
     */
    id: string;
    /**
     * IANA media type of the document (e.g., 'application/pdf').
     */
    mediaType: string;
    /**
     * The title of the document.
     */
    title: string;
    /**
     * Optional filename of the document.
     */
    filename?: string;
    /**
     * Additional provider metadata for the source.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * Text that the model has generated.
 */
type LanguageModelV3Text = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * Tool approval request emitted by a provider for a provider-executed tool call.
 *
 * This is used for flows where the provider executes the tool (e.g. MCP tools)
 * but requires an explicit user approval before continuing.
 */
type LanguageModelV3ToolApprovalRequest = {
    type: 'tool-approval-request';
    /**
     * ID of the approval request. This ID is referenced by the subsequent
     * tool-approval-response (tool message) to approve or deny execution.
     */
    approvalId: string;
    /**
     * The tool call ID that this approval request is for.
     */
    toolCallId: string;
    /**
     * Additional provider-specific metadata for the approval request.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * Tool calls that the model has generated.
 */
type LanguageModelV3ToolCall = {
    type: 'tool-call';
    /**
     * The identifier of the tool call. It must be unique across all tool calls.
     */
    toolCallId: string;
    /**
     * The name of the tool that should be called.
     */
    toolName: string;
    /**
     * Stringified JSON object with the tool call arguments. Must match the
     * parameters schema of the tool.
     */
    input: string;
    /**
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Whether the tool is dynamic, i.e. defined at runtime.
     * For example, MCP (Model Context Protocol) tools that are executed by the provider.
     */
    dynamic?: boolean;
    /**
     * Additional provider-specific metadata for the tool call.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

/**
 * Result of a tool call that has been executed by the provider.
 */
type LanguageModelV3ToolResult = {
    type: 'tool-result';
    /**
     * The ID of the tool call that this result is associated with.
     */
    toolCallId: string;
    /**
     * Name of the tool that generated this result.
     */
    toolName: string;
    /**
     * Result of the tool call. This is a JSON-serializable object.
     */
    result: NonNullable<JSONValue>;
    /**
     * Optional flag if the result is an error or an error message.
     */
    isError?: boolean;
    /**
     * Whether the tool result is preliminary.
     *
     * Preliminary tool results replace each other, e.g. image previews.
     * There always has to be a final, non-preliminary tool result.
     *
     * If this flag is set to true, the tool result is preliminary.
     * If this flag is not set or is false, the tool result is not preliminary.
     */
    preliminary?: boolean;
    /**
     * Whether the tool is dynamic, i.e. defined at runtime.
     * For example, MCP (Model Context Protocol) tools that are executed by the provider.
     */
    dynamic?: boolean;
    /**
     * Additional provider-specific metadata for the tool result.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

type LanguageModelV3Content = LanguageModelV3Text | LanguageModelV3Reasoning | LanguageModelV3File | LanguageModelV3ToolApprovalRequest | LanguageModelV3Source | LanguageModelV3ToolCall | LanguageModelV3ToolResult;

/**
 * Reason why a language model finished generating a response.
 *
 * Contains both a unified finish reason and a raw finish reason from the provider.
 * The unified finish reason is used to provide a consistent finish reason across different providers.
 * The raw finish reason is used to provide the original finish reason from the provider.
 */
type LanguageModelV3FinishReason = {
    /**
     * Unified finish reason. This enables using the same finish reason across different providers.
     *
     * Can be one of the following:
     * - `stop`: model generated stop sequence
     * - `length`: model generated maximum number of tokens
     * - `content-filter`: content filter violation stopped the model
     * - `tool-calls`: model triggered tool calls
     * - `error`: model stopped because of an error
     * - `other`: model stopped for other reasons
     */
    unified: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';
    /**
     * Raw finish reason from the provider.
     * This is the original finish reason from the provider.
     */
    raw: string | undefined;
};

interface LanguageModelV3ResponseMetadata {
    /**
     * ID for the generated response, if the provider sends one.
     */
    id?: string;
    /**
     * Timestamp for the start of the generated response, if the provider sends one.
     */
    timestamp?: Date;
    /**
     * The ID of the response model that was used to generate the response, if the provider sends one.
     */
    modelId?: string;
}

/**
 * Usage information for a language model call.
 */
type LanguageModelV3Usage = {
    /**
     * Information about the input tokens.
     */
    inputTokens: {
        /**
         * The total number of input (prompt) tokens used.
         */
        total: number | undefined;
        /**
         * The number of non-cached input (prompt) tokens used.
         */
        noCache: number | undefined;
        /**
         * The number of cached input (prompt) tokens read.
         */
        cacheRead: number | undefined;
        /**
         * The number of cached input (prompt) tokens written.
         */
        cacheWrite: number | undefined;
    };
    /**
     * Information about the output tokens.
     */
    outputTokens: {
        /**
         * The total number of output (completion) tokens used.
         */
        total: number | undefined;
        /**
         * The number of text tokens used.
         */
        text: number | undefined;
        /**
         * The number of reasoning tokens used.
         */
        reasoning: number | undefined;
    };
    /**
     * Raw usage information from the provider.
     *
     * This is the usage information in the shape that the provider returns.
     * It can include additional information that is not part of the standard usage information.
     */
    raw?: JSONObject;
};

/**
 * The result of a language model doGenerate call.
 */
type LanguageModelV3GenerateResult = {
    /**
     * Ordered content that the model has generated.
     */
    content: Array<LanguageModelV3Content>;
    /**
     * The finish reason.
     */
    finishReason: LanguageModelV3FinishReason;
    /**
     * The usage information.
     */
    usage: LanguageModelV3Usage;
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    providerMetadata?: SharedV3ProviderMetadata;
    /**
     * Optional request information for telemetry and debugging purposes.
     */
    request?: {
        /**
         * Request HTTP body that was sent to the provider API.
         */
        body?: unknown;
    };
    /**
     * Optional response information for telemetry and debugging purposes.
     */
    response?: LanguageModelV3ResponseMetadata & {
        /**
         * Response headers.
         */
        headers?: SharedV3Headers;
        /**
         * Response HTTP body.
         */
        body?: unknown;
    };
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    warnings: Array<SharedV3Warning>;
};

type LanguageModelV3StreamPart = {
    type: 'text-start';
    providerMetadata?: SharedV3ProviderMetadata;
    id: string;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: SharedV3ProviderMetadata;
    delta: string;
} | {
    type: 'text-end';
    providerMetadata?: SharedV3ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-start';
    providerMetadata?: SharedV3ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-delta';
    id: string;
    providerMetadata?: SharedV3ProviderMetadata;
    delta: string;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: SharedV3ProviderMetadata;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: SharedV3ProviderMetadata;
    providerExecuted?: boolean;
    dynamic?: boolean;
    title?: string;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: SharedV3ProviderMetadata;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: SharedV3ProviderMetadata;
} | LanguageModelV3ToolApprovalRequest | LanguageModelV3ToolCall | LanguageModelV3ToolResult | LanguageModelV3File | LanguageModelV3Source | {
    type: 'stream-start';
    warnings: Array<SharedV3Warning>;
} | ({
    type: 'response-metadata';
} & LanguageModelV3ResponseMetadata) | {
    type: 'finish';
    usage: LanguageModelV3Usage;
    finishReason: LanguageModelV3FinishReason;
    providerMetadata?: SharedV3ProviderMetadata;
} | {
    type: 'raw';
    rawValue: unknown;
} | {
    type: 'error';
    error: unknown;
};

/**
 * The result of a language model doStream call.
 */
type LanguageModelV3StreamResult = {
    /**
     * The stream.
     */
    stream: ReadableStream<LanguageModelV3StreamPart>;
    /**
     * Optional request information for telemetry and debugging purposes.
     */
    request?: {
        /**
         * Request HTTP body that was sent to the provider API.
         */
        body?: unknown;
    };
    /**
     * Optional response data.
     */
    response?: {
        /**
         * Response headers.
         */
        headers?: SharedV3Headers;
    };
};

/**
 * Specification for a language model that implements the language model interface version 3.
 */
type LanguageModelV3 = {
    /**
     * The language model must specify which language model interface version it implements.
     */
    readonly specificationVersion: 'v3';
    /**
     * Provider ID.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID.
     */
    readonly modelId: string;
    /**
     * Supported URL patterns by media type for the provider.
     *
     * The keys are media type patterns or full media types (e.g. `*\/*` for everything, `audio/*`, `video/*`, or `application/pdf`).
     * and the values are arrays of regular expressions that match the URL paths.
     *
     * The matching should be against lower-case URLs.
     *
     * Matched URLs are supported natively by the model and are not downloaded.
     *
     * @returns A map of supported URL patterns by media type (as a promise or a plain object).
     */
    supportedUrls: PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;
    /**
     * Generates a language model output (non-streaming).
  
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     */
    doGenerate(options: LanguageModelV3CallOptions): PromiseLike<LanguageModelV3GenerateResult>;
    /**
     * Generates a language model output (streaming).
     *
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     *
     * @return A stream of higher-level language model output parts.
     */
    doStream(options: LanguageModelV3CallOptions): PromiseLike<LanguageModelV3StreamResult>;
};

/**
 * Experimental middleware for LanguageModelV3.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of LanguageModelV3 operations.
 */
type LanguageModelV3Middleware = {
    /**
     * Middleware specification version. Use `v3` for the current version.
     */
    readonly specificationVersion: 'v3';
    /**
     * Override the provider name if desired.
     * @param options.model - The language model instance.
     */
    overrideProvider?: (options: {
        model: LanguageModelV3;
    }) => string;
    /**
     * Override the model ID if desired.
     * @param options.model - The language model instance.
     */
    overrideModelId?: (options: {
        model: LanguageModelV3;
    }) => string;
    /**
     * Override the supported URLs if desired.
     * @param options.model - The language model instance.
     */
    overrideSupportedUrls?: (options: {
        model: LanguageModelV3;
    }) => PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;
    /**
     * Transforms the parameters before they are passed to the language model.
     * @param options - Object containing the type of operation and the parameters.
     * @param options.type - The type of operation ('generate' or 'stream').
     * @param options.params - The original parameters for the language model call.
     * @returns A promise that resolves to the transformed parameters.
     */
    transformParams?: (options: {
        type: 'generate' | 'stream';
        params: LanguageModelV3CallOptions;
        model: LanguageModelV3;
    }) => PromiseLike<LanguageModelV3CallOptions>;
    /**
     * Wraps the generate operation of the language model.
     * @param options - Object containing the generate function, parameters, and model.
     * @param options.doGenerate - The original generate function.
     * @param options.doStream - The original stream function.
     * @param options.params - The parameters for the generate call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The language model instance.
     * @returns A promise that resolves to the result of the generate operation.
     */
    wrapGenerate?: (options: {
        doGenerate: () => PromiseLike<LanguageModelV3GenerateResult>;
        doStream: () => PromiseLike<LanguageModelV3StreamResult>;
        params: LanguageModelV3CallOptions;
        model: LanguageModelV3;
    }) => PromiseLike<LanguageModelV3GenerateResult>;
    /**
     * Wraps the stream operation of the language model.
     *
     * @param options - Object containing the stream function, parameters, and model.
     * @param options.doGenerate - The original generate function.
     * @param options.doStream - The original stream function.
     * @param options.params - The parameters for the stream call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The language model instance.
     * @returns A promise that resolves to the result of the stream operation.
     */
    wrapStream?: (options: {
        doGenerate: () => PromiseLike<LanguageModelV3GenerateResult>;
        doStream: () => PromiseLike<LanguageModelV3StreamResult>;
        params: LanguageModelV3CallOptions;
        model: LanguageModelV3;
    }) => PromiseLike<LanguageModelV3StreamResult>;
};

/**
 * A tool has a name, a description, and a set of parameters.
 *
 * Note: this is **not** the user-facing tool definition. The AI SDK methods will
 * map the user-facing tool definitions to this format.
 */
type LanguageModelV2FunctionTool = {
    /**
     * The type of the tool (always 'function').
     */
    type: 'function';
    /**
     * The name of the tool. Unique within this model call.
     */
    name: string;
    /**
     * A description of the tool. The language model uses this to understand the
     * tool's purpose and to provide better completion suggestions.
     */
    description?: string;
    /**
     * The parameters that the tool expects. The language model uses this to
     * understand the tool's input requirements and to provide matching suggestions.
     */
    inputSchema: JSONSchema7;
    /**
     * The provider-specific options for the tool.
     */
    providerOptions?: SharedV2ProviderOptions;
};

/**
 * Data content. Can be a Uint8Array, base64 encoded data as a string or a URL.
 */
type LanguageModelV2DataContent = Uint8Array | string | URL;

/**
 * A prompt is a list of messages.
 *
 * Note: Not all models and prompt formats support multi-modal inputs and
 * tool calls. The validation happens at runtime.
 *
 * Note: This is not a user-facing prompt. The AI SDK methods will map the
 * user-facing prompt types such as chat or instruction prompts to this format.
 */
type LanguageModelV2Prompt = Array<LanguageModelV2Message>;
type LanguageModelV2Message = ({
    role: 'system';
    content: string;
} | {
    role: 'user';
    content: Array<LanguageModelV2TextPart | LanguageModelV2FilePart>;
} | {
    role: 'assistant';
    content: Array<LanguageModelV2TextPart | LanguageModelV2FilePart | LanguageModelV2ReasoningPart | LanguageModelV2ToolCallPart | LanguageModelV2ToolResultPart>;
} | {
    role: 'tool';
    content: Array<LanguageModelV2ToolResultPart>;
}) & {
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
};
/**
 * Text content part of a prompt. It contains a string of text.
 */
interface LanguageModelV2TextPart {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
}
/**
 * Reasoning content part of a prompt. It contains a string of reasoning text.
 */
interface LanguageModelV2ReasoningPart {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
}
/**
 * File content part of a prompt. It contains a file.
 */
interface LanguageModelV2FilePart {
    type: 'file';
    /**
     * Optional filename of the file.
     */
    filename?: string;
    /**
     * File data. Can be a Uint8Array, base64 encoded data as a string or a URL.
     */
    data: LanguageModelV2DataContent;
    /**
     * IANA media type of the file.
     *
     * Can support wildcards, e.g. `image/*` (in which case the provider needs to take appropriate action).
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
}
/**
 * Tool call content part of a prompt. It contains a tool call (usually generated by the AI model).
 */
interface LanguageModelV2ToolCallPart {
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
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
}
/**
 * Tool result content part of a prompt. It contains the result of the tool call with the matching ID.
 */
interface LanguageModelV2ToolResultPart {
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
     * Result of the tool call.
     */
    output: LanguageModelV2ToolResultOutput;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
}
type LanguageModelV2ToolResultOutput = {
    type: 'text';
    value: string;
} | {
    type: 'json';
    value: JSONValue;
} | {
    type: 'error-text';
    value: string;
} | {
    type: 'error-json';
    value: JSONValue;
} | {
    type: 'content';
    value: Array<{
        type: 'text';
        /**
         * Text content.
         */
        text: string;
    } | {
        type: 'media';
        /**
         * Base-64 encoded media data.
         */
        data: string;
        /**
         * IANA media type.
         * @see https://www.iana.org/assignments/media-types/media-types.xhtml
         */
        mediaType: string;
    }>;
};

/**
 * The configuration of a tool that is defined by the provider.
 */
type LanguageModelV2ProviderDefinedTool = {
    /**
     * The type of the tool (always 'provider-defined').
     */
    type: 'provider-defined';
    /**
     * The ID of the tool. Should follow the format `<provider-name>.<unique-tool-name>`.
     */
    id: `${string}.${string}`;
    /**
     * The name of the tool that the user must use in the tool set.
     */
    name: string;
    /**
     * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
     */
    args: Record<string, unknown>;
};

type LanguageModelV2ToolChoice = {
    type: 'auto';
} | {
    type: 'none';
} | {
    type: 'required';
} | {
    type: 'tool';
    toolName: string;
};

type LanguageModelV2CallOptions = {
    /**
     * A language mode prompt is a standardized prompt type.
     *
     * Note: This is **not** the user-facing prompt. The AI SDK methods will map the
     * user-facing prompt types such as chat or instruction prompts to this format.
     * That approach allows us to evolve the user  facing prompts without breaking
     * the language model interface.
     */
    prompt: LanguageModelV2Prompt;
    /**
     * Maximum number of tokens to generate.
     */
    maxOutputTokens?: number;
    /**
     * Temperature setting. The range depends on the provider and model.
     */
    temperature?: number;
    /**
     * Stop sequences.
     * If set, the model will stop generating text when one of the stop sequences is generated.
     * Providers may have limits on the number of stop sequences.
     */
    stopSequences?: string[];
    /**
     * Nucleus sampling.
     */
    topP?: number;
    /**
     * Only sample from the top K options for each subsequent token.
     *
     * Used to remove "long tail" low probability responses.
     * Recommended for advanced use cases only. You usually only need to use temperature.
     */
    topK?: number;
    /**
     * Presence penalty setting. It affects the likelihood of the model to
     * repeat information that is already in the prompt.
     */
    presencePenalty?: number;
    /**
     * Frequency penalty setting. It affects the likelihood of the model
     * to repeatedly use the same words or phrases.
     */
    frequencyPenalty?: number;
    /**
     * Response format. The output can either be text or JSON. Default is text.
     *
     * If JSON is selected, a schema can optionally be provided to guide the LLM.
     */
    responseFormat?: {
        type: 'text';
    } | {
        type: 'json';
        /**
         * JSON schema that the generated output should conform to.
         */
        schema?: JSONSchema7;
        /**
         * Name of output that should be generated. Used by some providers for additional LLM guidance.
         */
        name?: string;
        /**
         * Description of the output that should be generated. Used by some providers for additional LLM guidance.
         */
        description?: string;
    };
    /**
     * The seed (integer) to use for random sampling. If set and supported
     * by the model, calls will generate deterministic results.
     */
    seed?: number;
    /**
     * The tools that are available for the model.
     */
    tools?: Array<LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool>;
    /**
     * Specifies how the tool should be selected. Defaults to 'auto'.
     */
    toolChoice?: LanguageModelV2ToolChoice;
    /**
     * Include raw chunks in the stream. Only applicable for streaming calls.
     */
    includeRawChunks?: boolean;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV2ProviderOptions;
};

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type LanguageModelV2CallWarning = {
    type: 'unsupported-setting';
    setting: Omit<keyof LanguageModelV2CallOptions, 'prompt'>;
    details?: string;
} | {
    type: 'unsupported-tool';
    tool: LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool;
    details?: string;
} | {
    type: 'other';
    message: string;
};

/**
 * A file that has been generated by the model.
 * Generated files as base64 encoded strings or binary data.
 * The files should be returned without any unnecessary conversion.
 */
type LanguageModelV2File = {
    type: 'file';
    /**
     * The IANA media type of the file, e.g. `image/png` or `audio/mp3`.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Generated file data as base64 encoded strings or binary data.
     *
     * The file data should be returned without any unnecessary conversion.
     * If the API returns base64 encoded strings, the file data should be returned
     * as base64 encoded strings. If the API returns binary data, the file data should
     * be returned as binary data.
     */
    data: string | Uint8Array;
};

/**
 * Reasoning that the model has generated.
 */
type LanguageModelV2Reasoning = {
    type: 'reasoning';
    text: string;
    /**
     * Optional provider-specific metadata for the reasoning part.
     */
    providerMetadata?: SharedV2ProviderMetadata;
};

/**
 * A source that has been used as input to generate the response.
 */
type LanguageModelV2Source = {
    type: 'source';
    /**
     * The type of source - URL sources reference web content.
     */
    sourceType: 'url';
    /**
     * The ID of the source.
     */
    id: string;
    /**
     * The URL of the source.
     */
    url: string;
    /**
     * The title of the source.
     */
    title?: string;
    /**
     * Additional provider metadata for the source.
     */
    providerMetadata?: SharedV2ProviderMetadata;
} | {
    type: 'source';
    /**
     * The type of source - document sources reference files/documents.
     */
    sourceType: 'document';
    /**
     * The ID of the source.
     */
    id: string;
    /**
     * IANA media type of the document (e.g., 'application/pdf').
     */
    mediaType: string;
    /**
     * The title of the document.
     */
    title: string;
    /**
     * Optional filename of the document.
     */
    filename?: string;
    /**
     * Additional provider metadata for the source.
     */
    providerMetadata?: SharedV2ProviderMetadata;
};

/**
 * Text that the model has generated.
 */
type LanguageModelV2Text = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    providerMetadata?: SharedV2ProviderMetadata;
};

/**
 * Tool calls that the model has generated.
 */
type LanguageModelV2ToolCall = {
    type: 'tool-call';
    /**
     * The identifier of the tool call. It must be unique across all tool calls.
     */
    toolCallId: string;
    /**
     * The name of the tool that should be called.
     */
    toolName: string;
    /**
     * Stringified JSON object with the tool call arguments. Must match the
     * parameters schema of the tool.
     */
    input: string;
    /**
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Additional provider-specific metadata for the tool call.
     */
    providerMetadata?: SharedV2ProviderMetadata;
};

/**
 * Result of a tool call that has been executed by the provider.
 */
type LanguageModelV2ToolResult = {
    type: 'tool-result';
    /**
     * The ID of the tool call that this result is associated with.
     */
    toolCallId: string;
    /**
     * Name of the tool that generated this result.
     */
    toolName: string;
    /**
     * Result of the tool call. This is a JSON-serializable object.
     */
    result: unknown;
    /**
     * Optional flag if the result is an error or an error message.
     */
    isError?: boolean;
    /**
     * Whether the tool result was generated by the provider.
     * If this flag is set to true, the tool result was generated by the provider.
     * If this flag is not set or is false, the tool result was generated by the client.
     */
    providerExecuted?: boolean;
    /**
     * Additional provider-specific metadata for the tool result.
     */
    providerMetadata?: SharedV2ProviderMetadata;
};

type LanguageModelV2Content = LanguageModelV2Text | LanguageModelV2Reasoning | LanguageModelV2File | LanguageModelV2Source | LanguageModelV2ToolCall | LanguageModelV2ToolResult;

/**
 * Reason why a language model finished generating a response.
 *
 * Can be one of the following:
 * - `stop`: model generated stop sequence
 * - `length`: model generated maximum number of tokens
 * - `content-filter`: content filter violation stopped the model
 * - `tool-calls`: model triggered tool calls
 * - `error`: model stopped because of an error
 * - `other`: model stopped for other reasons
 * - `unknown`: the model has not transmitted a finish reason
 */
type LanguageModelV2FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';

interface LanguageModelV2ResponseMetadata {
    /**
     * ID for the generated response, if the provider sends one.
     */
    id?: string;
    /**
     * Timestamp for the start of the generated response, if the provider sends one.
     */
    timestamp?: Date;
    /**
     * The ID of the response model that was used to generate the response, if the provider sends one.
     */
    modelId?: string;
}

/**
 * Usage information for a language model call.
 *
 * If your API return additional usage information, you can add it to the
 * provider metadata under your provider's key.
 */
type LanguageModelV2Usage = {
    /**
     * The number of input (prompt) tokens used.
     */
    inputTokens: number | undefined;
    /**
     * The number of output (completion) tokens used.
     */
    outputTokens: number | undefined;
    /**
     * The total number of tokens as reported by the provider.
     * This number might be different from the sum of `inputTokens` and `outputTokens`
     * and e.g. include reasoning tokens or other overhead.
     */
    totalTokens: number | undefined;
    /**
     * The number of reasoning tokens used.
     */
    reasoningTokens?: number | undefined;
    /**
     * The number of cached input tokens.
     */
    cachedInputTokens?: number | undefined;
};

type LanguageModelV2StreamPart = {
    type: 'text-start';
    providerMetadata?: SharedV2ProviderMetadata;
    id: string;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: SharedV2ProviderMetadata;
    delta: string;
} | {
    type: 'text-end';
    providerMetadata?: SharedV2ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-start';
    providerMetadata?: SharedV2ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-delta';
    id: string;
    providerMetadata?: SharedV2ProviderMetadata;
    delta: string;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: SharedV2ProviderMetadata;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: SharedV2ProviderMetadata;
    providerExecuted?: boolean;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: SharedV2ProviderMetadata;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: SharedV2ProviderMetadata;
} | LanguageModelV2ToolCall | LanguageModelV2ToolResult | LanguageModelV2File | LanguageModelV2Source | {
    type: 'stream-start';
    warnings: Array<LanguageModelV2CallWarning>;
} | ({
    type: 'response-metadata';
} & LanguageModelV2ResponseMetadata) | {
    type: 'finish';
    usage: LanguageModelV2Usage;
    finishReason: LanguageModelV2FinishReason;
    providerMetadata?: SharedV2ProviderMetadata;
} | {
    type: 'raw';
    rawValue: unknown;
} | {
    type: 'error';
    error: unknown;
};

/**
 * Specification for a language model that implements the language model interface version 2.
 */
type LanguageModelV2 = {
    /**
     * The language model must specify which language model interface version it implements.
     */
    readonly specificationVersion: 'v2';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Supported URL patterns by media type for the provider.
     *
     * The keys are media type patterns or full media types (e.g. `*\/*` for everything, `audio/*`, `video/*`, or `application/pdf`).
     * and the values are arrays of regular expressions that match the URL paths.
     *
     * The matching should be against lower-case URLs.
     *
     * Matched URLs are supported natively by the model and are not downloaded.
     *
     * @returns A map of supported URL patterns by media type (as a promise or a plain object).
     */
    supportedUrls: PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;
    /**
     * Generates a language model output (non-streaming).
     *
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     */
    doGenerate(options: LanguageModelV2CallOptions): PromiseLike<{
        /**
         * Ordered content that the model has generated.
         */
        content: Array<LanguageModelV2Content>;
        /**
         * Finish reason.
         */
        finishReason: LanguageModelV2FinishReason;
        /**
         * Usage information.
         */
        usage: LanguageModelV2Usage;
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: SharedV2ProviderMetadata;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Request HTTP body that was sent to the provider API.
             */
            body?: unknown;
        };
        /**
         * Optional response information for telemetry and debugging purposes.
         */
        response?: LanguageModelV2ResponseMetadata & {
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
            /**
             * Response HTTP body.
             */
            body?: unknown;
        };
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<LanguageModelV2CallWarning>;
    }>;
    /**
     * Generates a language model output (streaming).
     *
     * Naming: "do" prefix to prevent accidental direct usage of the method
     * by the user.
     *
     * @return A stream of higher-level language model output parts.
     */
    doStream(options: LanguageModelV2CallOptions): PromiseLike<{
        stream: ReadableStream<LanguageModelV2StreamPart>;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Request HTTP body that was sent to the provider API.
             */
            body?: unknown;
        };
        /**
         * Optional response data.
         */
        response?: {
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
        };
    }>;
};

/**
 * Experimental middleware for LanguageModelV2.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of LanguageModelV2 operations.
 */
type LanguageModelV2Middleware = {
    /**
     * Middleware specification version. Use `v2` for the current version.
     */
    middlewareVersion?: 'v2' | undefined;
    /**
     * Override the provider name if desired.
     * @param options.model - The language model instance.
     */
    overrideProvider?: (options: {
        model: LanguageModelV2;
    }) => string;
    /**
     * Override the model ID if desired.
     * @param options.model - The language model instance.
     */
    overrideModelId?: (options: {
        model: LanguageModelV2;
    }) => string;
    /**
     * Override the supported URLs if desired.
     * @param options.model - The language model instance.
     */
    overrideSupportedUrls?: (options: {
        model: LanguageModelV2;
    }) => PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;
    /**
     * Transforms the parameters before they are passed to the language model.
     * @param options - Object containing the type of operation and the parameters.
     * @param options.type - The type of operation ('generate' or 'stream').
     * @param options.params - The original parameters for the language model call.
     * @returns A promise that resolves to the transformed parameters.
     */
    transformParams?: (options: {
        type: 'generate' | 'stream';
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => PromiseLike<LanguageModelV2CallOptions>;
    /**
     * Wraps the generate operation of the language model.
     * @param options - Object containing the generate function, parameters, and model.
     * @param options.doGenerate - The original generate function.
     * @param options.doStream - The original stream function.
     * @param options.params - The parameters for the generate call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The language model instance.
     * @returns A promise that resolves to the result of the generate operation.
     */
    wrapGenerate?: (options: {
        doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
        doStream: () => ReturnType<LanguageModelV2['doStream']>;
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>>;
    /**
     * Wraps the stream operation of the language model.
     *
     * @param options - Object containing the stream function, parameters, and model.
     * @param options.doGenerate - The original generate function.
     * @param options.doStream - The original stream function.
     * @param options.params - The parameters for the stream call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The language model instance.
     * @returns A promise that resolves to the result of the stream operation.
     */
    wrapStream?: (options: {
        doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
        doStream: () => ReturnType<LanguageModelV2['doStream']>;
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => PromiseLike<Awaited<ReturnType<LanguageModelV2['doStream']>>>;
};

/**
 * Middleware for EmbeddingModelV3.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of EmbeddingModelV3 operations.
 */
type EmbeddingModelV3Middleware = {
    /**
     * Middleware specification version. Use `v3` for the current version.
     */
    readonly specificationVersion: 'v3';
    /**
     * Override the provider name if desired.
     * @param options.model - The embedding model instance.
     */
    overrideProvider?: (options: {
        model: EmbeddingModelV3;
    }) => string;
    /**
     * Override the model ID if desired.
     * @param options.model - The embedding model instance.
     */
    overrideModelId?: (options: {
        model: EmbeddingModelV3;
    }) => string;
    /**
     * Override the limit of how many embeddings can be generated in a single API call if desired.
     * @param options.model - The embedding model instance.
     */
    overrideMaxEmbeddingsPerCall?: (options: {
        model: EmbeddingModelV3;
    }) => PromiseLike<number | undefined> | number | undefined;
    /**
     * Override support for handling multiple embedding calls in parallel, if desired..
     * @param options.model - The embedding model instance.
     */
    overrideSupportsParallelCalls?: (options: {
        model: EmbeddingModelV3;
    }) => PromiseLike<boolean> | boolean;
    /**
     * Transforms the parameters before they are passed to the embed model.
     * @param options - Object containing the type of operation and the parameters.
     * @param options.params - The original parameters for the embedding model call.
     * @returns A promise that resolves to the transformed parameters.
     */
    transformParams?: (options: {
        params: EmbeddingModelV3CallOptions;
        model: EmbeddingModelV3;
    }) => PromiseLike<EmbeddingModelV3CallOptions>;
    /**
     * Wraps the embed operation of the embedding model.
     *
     * @param options - Object containing the embed function, parameters, and model.
     * @param options.doEmbed - The original embed function.
     * @param options.params - The parameters for the embed call. If the
     * `transformParams` middleware is used, this will be the transformed parameters.
     * @param options.model - The embedding model instance.
     * @returns A promise that resolves to the result of the generate operation.
     */
    wrapEmbed?: (options: {
        doEmbed: () => ReturnType<EmbeddingModelV3['doEmbed']>;
        params: EmbeddingModelV3CallOptions;
        model: EmbeddingModelV3;
    }) => Promise<Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>>;
};

type RerankingModelV3CallOptions = {
    /**
     * Documents to rerank.
     * Either a list of texts or a list of JSON objects.
     */
    documents: {
        type: 'text';
        values: string[];
    } | {
        type: 'object';
        values: JSONObject[];
    };
    /**
     * The query is a string that represents the query to rerank the documents against.
     */
    query: string;
    /**
     * Optional limit returned documents to the top n documents.
     */
    topN?: number;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: SharedV3ProviderOptions;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: SharedV3Headers;
};

/**
 * Specification for a reranking model that implements the reranking model interface version 3.
 */
type RerankingModelV3 = {
    /**
     * The reranking model must specify which reranking model interface version it implements.
     */
    readonly specificationVersion: 'v3';
    /**
     * Provider ID.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID.
     */
    readonly modelId: string;
    /**
     * Reranking a list of documents using the query.
     */
    doRerank(options: RerankingModelV3CallOptions): PromiseLike<{
        /**
         * Ordered list of reranked documents (via index before reranking).
         * The documents are sorted by the descending order of relevance scores.
         */
        ranking: Array<{
            /**
             * The index of the document in the original list of documents before reranking.
             */
            index: number;
            /**
             * The relevance score of the document after reranking.
             */
            relevanceScore: number;
        }>;
        /**
         * Additional provider-specific metadata. They are passed through
         * to the provider from the AI SDK and enable provider-specific
         * functionality that can be fully encapsulated in the provider.
         */
        providerMetadata?: SharedV3ProviderMetadata;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings?: Array<SharedV3Warning>;
        /**
         * Optional response information for debugging purposes.
         */
        response?: {
            /**
             * ID for the generated response, if the provider sends one.
             */
            id?: string;
            /**
             * Timestamp for the start of the generated response, if the provider sends one.
             */
            timestamp?: Date;
            /**
             * The ID of the response model that was used to generate the response, if the provider sends one.
             */
            modelId?: string;
            /**
             * Response headers.
             */
            headers?: SharedV3Headers;
            /**
             * Response body.
             */
            body?: unknown;
        };
    }>;
};

type SpeechModelV3ProviderOptions = Record<string, JSONObject>;
type SpeechModelV3CallOptions = {
    /**
     * Text to convert to speech.
     */
    text: string;
    /**
     * The voice to use for speech synthesis.
     * This is provider-specific and may be a voice ID, name, or other identifier.
     */
    voice?: string;
    /**
     * The desired output format for the audio e.g. "mp3", "wav", etc.
     */
    outputFormat?: string;
    /**
     * Instructions for the speech generation e.g. "Speak in a slow and steady tone".
     */
    instructions?: string;
    /**
     * The speed of the speech generation.
     */
    speed?: number;
    /**
     * The language for speech generation. This should be an ISO 639-1 language code (e.g. "en", "es", "fr")
     * or "auto" for automatic language detection. Provider support varies.
     */
    language?: string;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     *   "openai": {}
     * }
     * ```
     */
    providerOptions?: SpeechModelV3ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
 * Speech model specification version 3.
 */
type SpeechModelV3 = {
    /**
     * The speech model must specify which speech model interface
     * version it implements. This will allow us to evolve the speech
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v3';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Generates speech audio from text.
     */
    doGenerate(options: SpeechModelV3CallOptions): PromiseLike<{
        /**
         * Generated audio as an ArrayBuffer.
         * The audio should be returned without any unnecessary conversion.
         * If the API returns base64 encoded strings, the audio should be returned
         * as base64 encoded strings. If the API returns binary data, the audio
         * should be returned as binary data.
         */
        audio: string | Uint8Array;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<SharedV3Warning>;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Response body (available only for providers that use HTTP requests).
             */
            body?: unknown;
        };
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
            /**
             * Response body.
             */
            body?: unknown;
        };
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: Record<string, JSONObject>;
    }>;
};

type TranscriptionModelV3ProviderOptions = Record<string, JSONObject>;
type TranscriptionModelV3CallOptions = {
    /**
     * Audio data to transcribe.
     * Accepts a `Uint8Array` or `string`, where `string` is a base64 encoded audio file.
     */
    audio: Uint8Array | string;
    /**
     * The IANA media type of the audio data.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     * "openai": {
     * "timestampGranularities": ["word"]
     * }
     * }
     * ```
     */
    providerOptions?: TranscriptionModelV3ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
 * Transcription model specification version 3.
 */
type TranscriptionModelV3 = {
    /**
     * The transcription model must specify which transcription model interface
     * version it implements. This will allow us to evolve the transcription
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v3';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Generates a transcript.
     */
    doGenerate(options: TranscriptionModelV3CallOptions): PromiseLike<{
        /**
         * The complete transcribed text from the audio.
         */
        text: string;
        /**
         * Array of transcript segments with timing information.
         * Each segment represents a portion of the transcribed text with start and end times.
         */
        segments: Array<{
            /**
             * The text content of this segment.
             */
            text: string;
            /**
             * The start time of this segment in seconds.
             */
            startSecond: number;
            /**
             * The end time of this segment in seconds.
             */
            endSecond: number;
        }>;
        /**
         * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
         * May be undefined if the language couldn't be detected.
         */
        language: string | undefined;
        /**
         * The total duration of the audio file in seconds.
         * May be undefined if the duration couldn't be determined.
         */
        durationInSeconds: number | undefined;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<SharedV3Warning>;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Raw request HTTP body that was sent to the provider API as a string (JSON should be stringified).
             * Non-HTTP(s) providers should not set this.
             */
            body?: string;
        };
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers?: SharedV3Headers;
            /**
             * Response body.
             */
            body?: unknown;
        };
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: Record<string, JSONObject>;
    }>;
};

/**
 * Provider for language, text embedding, and image generation models.
 */
interface ProviderV3 {
    readonly specificationVersion: 'v3';
    /**
     * Returns the language model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {LanguageModel} The language model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    languageModel(modelId: string): LanguageModelV3;
    /**
     * Returns the text embedding model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {LanguageModel} The language model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    embeddingModel(modelId: string): EmbeddingModelV3;
    /**
     * Returns the text embedding model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {EmbeddingModel} The embedding model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     *
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel?(modelId: string): EmbeddingModelV3;
    /**
     * Returns the image model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {ImageModel} The image model associated with the id
     */
    imageModel(modelId: string): ImageModelV3;
    /**
     * Returns the transcription model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {TranscriptionModel} The transcription model associated with the id
     */
    transcriptionModel?(modelId: string): TranscriptionModelV3;
    /**
     * Returns the speech model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {SpeechModel} The speech model associated with the id
     */
    speechModel?(modelId: string): SpeechModelV3;
    /**
     * Returns the reranking model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {RerankingModel} The reranking model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    rerankingModel?(modelId: string): RerankingModelV3;
}

type SpeechModelV2ProviderOptions = Record<string, Record<string, JSONValue>>;
type SpeechModelV2CallOptions = {
    /**
     * Text to convert to speech.
     */
    text: string;
    /**
     * The voice to use for speech synthesis.
     * This is provider-specific and may be a voice ID, name, or other identifier.
     */
    voice?: string;
    /**
     * The desired output format for the audio e.g. "mp3", "wav", etc.
     */
    outputFormat?: string;
    /**
     * Instructions for the speech generation e.g. "Speak in a slow and steady tone".
     */
    instructions?: string;
    /**
     * The speed of the speech generation.
     */
    speed?: number;
    /**
     * The language for speech generation. This should be an ISO 639-1 language code (e.g. "en", "es", "fr")
     * or "auto" for automatic language detection. Provider support varies.
     */
    language?: string;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     *   "openai": {}
     * }
     * ```
     */
    providerOptions?: SpeechModelV2ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type SpeechModelV2CallWarning = {
    type: 'unsupported-setting';
    setting: keyof SpeechModelV2CallOptions;
    details?: string;
} | {
    type: 'other';
    message: string;
};

/**
 * Speech model specification version 2.
 */
type SpeechModelV2 = {
    /**
     * The speech model must specify which speech model interface
     * version it implements. This will allow us to evolve the speech
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v2';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Generates speech audio from text.
     */
    doGenerate(options: SpeechModelV2CallOptions): PromiseLike<{
        /**
         * Generated audio as an ArrayBuffer.
         * The audio should be returned without any unnecessary conversion.
         * If the API returns base64 encoded strings, the audio should be returned
         * as base64 encoded strings. If the API returns binary data, the audio
         * should be returned as binary data.
         */
        audio: string | Uint8Array;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<SpeechModelV2CallWarning>;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Response body (available only for providers that use HTTP requests).
             */
            body?: unknown;
        };
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
            /**
             * Response body.
             */
            body?: unknown;
        };
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: Record<string, Record<string, JSONValue>>;
    }>;
};

type TranscriptionModelV2ProviderOptions = Record<string, Record<string, JSONValue>>;
type TranscriptionModelV2CallOptions = {
    /**
     * Audio data to transcribe.
     * Accepts a `Uint8Array` or `string`, where `string` is a base64 encoded audio file.
     */
    audio: Uint8Array | string;
    /**
     * The IANA media type of the audio data.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     * "openai": {
     * "timestampGranularities": ["word"]
     * }
     * }
     * ```
     */
    providerOptions?: TranscriptionModelV2ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type TranscriptionModelV2CallWarning = {
    type: 'unsupported-setting';
    setting: keyof TranscriptionModelV2CallOptions;
    details?: string;
} | {
    type: 'other';
    message: string;
};

/**
 * Transcription model specification version 2.
 */
type TranscriptionModelV2 = {
    /**
     * The transcription model must specify which transcription model interface
     * version it implements. This will allow us to evolve the transcription
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v2';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Generates a transcript.
     */
    doGenerate(options: TranscriptionModelV2CallOptions): PromiseLike<{
        /**
         * The complete transcribed text from the audio.
         */
        text: string;
        /**
         * Array of transcript segments with timing information.
         * Each segment represents a portion of the transcribed text with start and end times.
         */
        segments: Array<{
            /**
             * The text content of this segment.
             */
            text: string;
            /**
             * The start time of this segment in seconds.
             */
            startSecond: number;
            /**
             * The end time of this segment in seconds.
             */
            endSecond: number;
        }>;
        /**
         * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
         * May be undefined if the language couldn't be detected.
         */
        language: string | undefined;
        /**
         * The total duration of the audio file in seconds.
         * May be undefined if the duration couldn't be determined.
         */
        durationInSeconds: number | undefined;
        /**
         * Warnings for the call, e.g. unsupported settings.
         */
        warnings: Array<TranscriptionModelV2CallWarning>;
        /**
         * Optional request information for telemetry and debugging purposes.
         */
        request?: {
            /**
             * Raw request HTTP body that was sent to the provider API as a string (JSON should be stringified).
             * Non-HTTP(s) providers should not set this.
             */
            body?: string;
        };
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers?: SharedV2Headers;
            /**
             * Response body.
             */
            body?: unknown;
        };
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         */
        providerMetadata?: Record<string, Record<string, JSONValue>>;
    }>;
};

/**
 * Provider for language, text embedding, and image generation models.
 */
interface ProviderV2 {
    /**
     * Returns the language model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {LanguageModel} The language model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    languageModel(modelId: string): LanguageModelV2;
    /**
     * Returns the text embedding model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {LanguageModel} The language model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    textEmbeddingModel(modelId: string): EmbeddingModelV2<string>;
    /**
     * Returns the image model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {ImageModel} The image model associated with the id
     */
    imageModel(modelId: string): ImageModelV2;
    /**
     * Returns the transcription model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {TranscriptionModel} The transcription model associated with the id
     */
    transcriptionModel?(modelId: string): TranscriptionModelV2;
    /**
     * Returns the speech model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {SpeechModel} The speech model associated with the id
     */
    speechModel?(modelId: string): SpeechModelV2;
}

/**
 * A video or image file that can be used for video editing or image-to-video generation.
 * Supports both image inputs (for image-to-video) and video inputs (for editing).
 */
type VideoModelV3File = {
    type: 'file';
    /**
     * The IANA media type of the file.
     * Video types: 'video/mp4', 'video/webm', 'video/quicktime'
     * Image types: 'image/png', 'image/jpeg', 'image/webp'
     */
    mediaType: string;
    /**
     * File data as base64 encoded string or binary data.
     */
    data: string | Uint8Array;
    /**
     * Optional provider-specific metadata for the file part.
     */
    providerOptions?: SharedV3ProviderMetadata;
} | {
    type: 'url';
    /**
     * The URL of the video or image file.
     */
    url: string;
    /**
     * Optional provider-specific metadata for the file part.
     */
    providerOptions?: SharedV3ProviderMetadata;
};

type VideoModelV3CallOptions = {
    /**
     * Text prompt for the video generation.
     */
    prompt: string | undefined;
    /**
     * Number of videos to generate. Default: 1.
     * Most video models only support n=1 due to computational cost.
     */
    n: number;
    /**
     * Aspect ratio of the videos to generate.
     * Must have the format `{width}:{height}`.
     * `undefined` will use the provider's default aspect ratio.
     * Common values: '16:9', '9:16', '1:1', '21:9', '4:3'
     */
    aspectRatio: `${number}:${number}` | undefined;
    /**
     * Resolution of the video to generate.
     * Format: `{width}x{height}` (e.g., '1280x720', '1920x1080')
     * `undefined` will use the provider's default resolution.
     */
    resolution: `${number}x${number}` | undefined;
    /**
     * Duration of the video in seconds.
     * `undefined` will use the provider's default duration.
     * Typically 3-10 seconds for most models.
     */
    duration: number | undefined;
    /**
     * Frames per second (FPS) for the video.
     * `undefined` will use the provider's default FPS.
     * Common values: 24, 30, 60
     */
    fps: number | undefined;
    /**
     * Seed for deterministic video generation.
     * `undefined` will use a random seed.
     */
    seed: number | undefined;
    /**
     * Input image for image-to-video generation.
     * The image serves as the starting frame that the model will animate.
     */
    image: VideoModelV3File | undefined;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * Example:
     * {
     *   "fal": {
     *     "loop": true,
     *     "motionStrength": 0.8
     *   }
     * }
     */
    providerOptions: SharedV3ProviderOptions;
    /**
     * Abort signal for cancelling the operation.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

type GetMaxVideosPerCallFunction = (options: {
    modelId: string;
}) => PromiseLike<number | undefined> | number | undefined;
/**
 * Generated video data. Can be a URL, base64-encoded string, or binary data.
 */
type VideoModelV3VideoData = {
    /**
     * Video available as a URL (most common for video providers).
     */
    type: 'url';
    url: string;
    mediaType: string;
} | {
    /**
     * Video as base64-encoded string.
     */
    type: 'base64';
    data: string;
    mediaType: string;
} | {
    /**
     * Video as binary data.
     */
    type: 'binary';
    data: Uint8Array;
    mediaType: string;
};
/**
 * Video generation model specification version 3.
 */
type VideoModelV3 = {
    /**
     * The video model must specify which video model interface
     * version it implements. This will allow us to evolve the video
     * model interface and retain backwards compatibility. The different
     * implementation versions can be handled as a discriminated union
     * on our side.
     */
    readonly specificationVersion: 'v3';
    /**
     * Name of the provider for logging purposes.
     */
    readonly provider: string;
    /**
     * Provider-specific model ID for logging purposes.
     */
    readonly modelId: string;
    /**
     * Limit of how many videos can be generated in a single API call.
     * Can be set to a number for a fixed limit, to undefined to use
     * the global limit, or a function that returns a number or undefined,
     * optionally as a promise.
     *
     * Most video models only support generating 1 video at a time due to
     * computational cost. Default is typically 1.
     */
    readonly maxVideosPerCall: number | undefined | GetMaxVideosPerCallFunction;
    /**
     * Generates an array of videos.
     */
    doGenerate(options: VideoModelV3CallOptions): PromiseLike<{
        /**
         * Generated videos as URLs, base64 strings, or binary data.
         *
         * Most providers return URLs to video files (MP4, WebM) due to large file sizes.
         * Use the discriminated union to indicate the type of video data being returned.
         */
        videos: Array<VideoModelV3VideoData>;
        /**
         * Warnings for the call, e.g. unsupported features.
         */
        warnings: Array<SharedV3Warning>;
        /**
         * Additional provider-specific metadata. They are passed through
         * from the provider to the AI SDK and enable provider-specific
         * results that can be fully encapsulated in the provider.
         *
         * The outer record is keyed by the provider name, and the inner
         * record is provider-specific metadata.
         *
         * ```ts
         * {
         *   "fal": {
         *     "videos": [{
         *       "duration": 5.0,
         *       "fps": 24,
         *       "width": 1280,
         *       "height": 720
         *     }]
         *   }
         * }
         * ```
         */
        providerMetadata?: SharedV3ProviderMetadata;
        /**
         * Response information for telemetry and debugging purposes.
         */
        response: {
            /**
             * Timestamp for the start of the generated response.
             */
            timestamp: Date;
            /**
             * The ID of the response model that was used to generate the response.
             */
            modelId: string;
            /**
             * Response headers.
             */
            headers: Record<string, string> | undefined;
        };
    }>;
};

export { AISDKError, APICallError, type EmbeddingModelV2, type EmbeddingModelV2Embedding, type EmbeddingModelV3, type EmbeddingModelV3CallOptions, type EmbeddingModelV3Embedding, type EmbeddingModelV3Middleware, type EmbeddingModelV3Result, EmptyResponseBodyError, type VideoModelV3 as Experimental_VideoModelV3, type VideoModelV3CallOptions as Experimental_VideoModelV3CallOptions, type VideoModelV3File as Experimental_VideoModelV3File, type VideoModelV3VideoData as Experimental_VideoModelV3VideoData, type ImageModelV2, type ImageModelV2CallOptions, type ImageModelV2CallWarning, type ImageModelV2ProviderMetadata, type ImageModelV3, type ImageModelV3CallOptions, type ImageModelV3File, type ImageModelV3Middleware, type ImageModelV3ProviderMetadata, type ImageModelV3Usage, InvalidArgumentError, InvalidPromptError, InvalidResponseDataError, type JSONArray, type JSONObject, JSONParseError, type JSONValue, type LanguageModelV2, type LanguageModelV2CallOptions, type LanguageModelV2CallWarning, type LanguageModelV2Content, type LanguageModelV2DataContent, type LanguageModelV2File, type LanguageModelV2FilePart, type LanguageModelV2FinishReason, type LanguageModelV2FunctionTool, type LanguageModelV2Message, type LanguageModelV2Middleware, type LanguageModelV2Prompt, type LanguageModelV2ProviderDefinedTool, type LanguageModelV2Reasoning, type LanguageModelV2ReasoningPart, type LanguageModelV2ResponseMetadata, type LanguageModelV2Source, type LanguageModelV2StreamPart, type LanguageModelV2Text, type LanguageModelV2TextPart, type LanguageModelV2ToolCall, type LanguageModelV2ToolCallPart, type LanguageModelV2ToolChoice, type LanguageModelV2ToolResultOutput, type LanguageModelV2ToolResultPart, type LanguageModelV2Usage, type LanguageModelV3, type LanguageModelV3CallOptions, type LanguageModelV3Content, type LanguageModelV3DataContent, type LanguageModelV3File, type LanguageModelV3FilePart, type LanguageModelV3FinishReason, type LanguageModelV3FunctionTool, type LanguageModelV3GenerateResult, type LanguageModelV3Message, type LanguageModelV3Middleware, type LanguageModelV3Prompt, type LanguageModelV3ProviderTool, type LanguageModelV3Reasoning, type LanguageModelV3ReasoningPart, type LanguageModelV3ResponseMetadata, type LanguageModelV3Source, type LanguageModelV3StreamPart, type LanguageModelV3StreamResult, type LanguageModelV3Text, type LanguageModelV3TextPart, type LanguageModelV3ToolApprovalRequest, type LanguageModelV3ToolApprovalResponsePart, type LanguageModelV3ToolCall, type LanguageModelV3ToolCallPart, type LanguageModelV3ToolChoice, type LanguageModelV3ToolResult, type LanguageModelV3ToolResultOutput, type LanguageModelV3ToolResultPart, type LanguageModelV3Usage, LoadAPIKeyError, LoadSettingError, NoContentGeneratedError, NoSuchModelError, type ProviderV2, type ProviderV3, type RerankingModelV3, type RerankingModelV3CallOptions, type SharedV2Headers, type SharedV2ProviderMetadata, type SharedV2ProviderOptions, type SharedV3Headers, type SharedV3ProviderMetadata, type SharedV3ProviderOptions, type SharedV3Warning, type SpeechModelV2, type SpeechModelV2CallOptions, type SpeechModelV2CallWarning, type SpeechModelV3, type SpeechModelV3CallOptions, TooManyEmbeddingValuesForCallError, type TranscriptionModelV2, type TranscriptionModelV2CallOptions, type TranscriptionModelV2CallWarning, type TranscriptionModelV3, type TranscriptionModelV3CallOptions, type TypeValidationContext, TypeValidationError, UnsupportedFunctionalityError, getErrorMessage, isJSONArray, isJSONObject, isJSONValue };
