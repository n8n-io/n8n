import { SharedV3ProviderMetadata, LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3StreamResult, EmbeddingModelV3, ImageModelV3, ProviderV3 } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';
import { ZodType, z } from 'zod/v4';

declare const openaiCompatibleErrorDataSchema: z.ZodObject<{
    error: z.ZodObject<{
        message: z.ZodString;
        type: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        param: z.ZodOptional<z.ZodNullable<z.ZodAny>>;
        code: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
type OpenAICompatibleErrorData = z.infer<typeof openaiCompatibleErrorDataSchema>;
type ProviderErrorStructure<T> = {
    errorSchema: ZodType<T>;
    errorToMessage: (error: T) => string;
    isRetryable?: (response: Response, error?: T) => boolean;
};

type OpenAICompatibleChatModelId = string;
declare const openaiCompatibleLanguageModelChatOptions: z.ZodObject<{
    user: z.ZodOptional<z.ZodString>;
    reasoningEffort: z.ZodOptional<z.ZodString>;
    textVerbosity: z.ZodOptional<z.ZodString>;
    strictJsonSchema: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
type OpenAICompatibleLanguageModelChatOptions = z.infer<typeof openaiCompatibleLanguageModelChatOptions>;

/**
 * Extracts provider-specific metadata from API responses.
 * Used to standardize metadata handling across different LLM providers while allowing
 * provider-specific metadata to be captured.
 */
type MetadataExtractor = {
    /**
     * Extracts provider metadata from a complete, non-streaming response.
     *
     * @param parsedBody - The parsed response JSON body from the provider's API.
     *
     * @returns Provider-specific metadata or undefined if no metadata is available.
     *          The metadata should be under a key indicating the provider id.
     */
    extractMetadata: ({ parsedBody, }: {
        parsedBody: unknown;
    }) => Promise<SharedV3ProviderMetadata | undefined>;
    /**
     * Creates an extractor for handling streaming responses. The returned object provides
     * methods to process individual chunks and build the final metadata from the accumulated
     * stream data.
     *
     * @returns An object with methods to process chunks and build metadata from a stream
     */
    createStreamExtractor: () => {
        /**
         * Process an individual chunk from the stream. Called for each chunk in the response stream
         * to accumulate metadata throughout the streaming process.
         *
         * @param parsedChunk - The parsed JSON response chunk from the provider's API
         */
        processChunk(parsedChunk: unknown): void;
        /**
         * Builds the metadata object after all chunks have been processed.
         * Called at the end of the stream to generate the complete provider metadata.
         *
         * @returns Provider-specific metadata or undefined if no metadata is available.
         *          The metadata should be under a key indicating the provider id.
         */
        buildMetadata(): SharedV3ProviderMetadata | undefined;
    };
};

type OpenAICompatibleChatConfig = {
    provider: string;
    headers: () => Record<string, string | undefined>;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    fetch?: FetchFunction;
    includeUsage?: boolean;
    errorStructure?: ProviderErrorStructure<any>;
    metadataExtractor?: MetadataExtractor;
    /**
     * Whether the model supports structured outputs.
     */
    supportsStructuredOutputs?: boolean;
    /**
     * The supported URLs for the model.
     */
    supportedUrls?: () => LanguageModelV3['supportedUrls'];
    /**
     * Optional function to transform the request body before sending it to the API.
     * This is useful for proxy providers that may require a different request format
     * than the official OpenAI API.
     */
    transformRequestBody?: (args: Record<string, any>) => Record<string, any>;
};
declare class OpenAICompatibleChatLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly supportsStructuredOutputs: boolean;
    readonly modelId: OpenAICompatibleChatModelId;
    private readonly config;
    private readonly failedResponseHandler;
    private readonly chunkSchema;
    constructor(modelId: OpenAICompatibleChatModelId, config: OpenAICompatibleChatConfig);
    get provider(): string;
    private get providerOptionsName();
    get supportedUrls(): Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>;
    private transformRequestBody;
    private getArgs;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}

type OpenAICompatibleCompletionModelId = string;
declare const openaiCompatibleLanguageModelCompletionOptions: z.ZodObject<{
    echo: z.ZodOptional<z.ZodBoolean>;
    logitBias: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    suffix: z.ZodOptional<z.ZodString>;
    user: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type OpenAICompatibleLanguageModelCompletionOptions = z.infer<typeof openaiCompatibleLanguageModelCompletionOptions>;

type OpenAICompatibleCompletionConfig = {
    provider: string;
    includeUsage?: boolean;
    headers: () => Record<string, string | undefined>;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    fetch?: FetchFunction;
    errorStructure?: ProviderErrorStructure<any>;
    /**
     * The supported URLs for the model.
     */
    supportedUrls?: () => LanguageModelV3['supportedUrls'];
};
declare class OpenAICompatibleCompletionLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAICompatibleCompletionModelId;
    private readonly config;
    private readonly failedResponseHandler;
    private readonly chunkSchema;
    constructor(modelId: OpenAICompatibleCompletionModelId, config: OpenAICompatibleCompletionConfig);
    get provider(): string;
    private get providerOptionsName();
    get supportedUrls(): Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>;
    private getArgs;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}

type OpenAICompatibleEmbeddingModelId = string;
declare const openaiCompatibleEmbeddingModelOptions: z.ZodObject<{
    dimensions: z.ZodOptional<z.ZodNumber>;
    user: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type OpenAICompatibleEmbeddingModelOptions = z.infer<typeof openaiCompatibleEmbeddingModelOptions>;

type OpenAICompatibleEmbeddingConfig = {
    /**
     * Override the maximum number of embeddings per call.
     */
    maxEmbeddingsPerCall?: number;
    /**
     * Override the parallelism of embedding calls.
     */
    supportsParallelCalls?: boolean;
    provider: string;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    headers: () => Record<string, string | undefined>;
    fetch?: FetchFunction;
    errorStructure?: ProviderErrorStructure<any>;
};
declare class OpenAICompatibleEmbeddingModel implements EmbeddingModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAICompatibleEmbeddingModelId;
    private readonly config;
    get provider(): string;
    get maxEmbeddingsPerCall(): number;
    get supportsParallelCalls(): boolean;
    constructor(modelId: OpenAICompatibleEmbeddingModelId, config: OpenAICompatibleEmbeddingConfig);
    private get providerOptionsName();
    doEmbed({ values, headers, abortSignal, providerOptions, }: Parameters<EmbeddingModelV3['doEmbed']>[0]): Promise<Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>>;
}

type OpenAICompatibleImageModelId = string;

type OpenAICompatibleImageModelConfig = {
    provider: string;
    headers: () => Record<string, string | undefined>;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    fetch?: FetchFunction;
    errorStructure?: ProviderErrorStructure<any>;
    _internal?: {
        currentDate?: () => Date;
    };
};
declare class OpenAICompatibleImageModel implements ImageModelV3 {
    readonly modelId: OpenAICompatibleImageModelId;
    private readonly config;
    readonly specificationVersion = "v3";
    readonly maxImagesPerCall = 10;
    get provider(): string;
    /**
     * The provider options key used to extract provider-specific options.
     */
    private get providerOptionsKey();
    constructor(modelId: OpenAICompatibleImageModelId, config: OpenAICompatibleImageModelConfig);
    private getArgs;
    doGenerate({ prompt, n, size, aspectRatio, seed, providerOptions, headers, abortSignal, files, mask, }: Parameters<ImageModelV3['doGenerate']>[0]): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>>;
}

interface OpenAICompatibleProvider<CHAT_MODEL_IDS extends string = string, COMPLETION_MODEL_IDS extends string = string, EMBEDDING_MODEL_IDS extends string = string, IMAGE_MODEL_IDS extends string = string> extends Omit<ProviderV3, 'imageModel'> {
    (modelId: CHAT_MODEL_IDS): LanguageModelV3;
    languageModel(modelId: CHAT_MODEL_IDS, config?: Partial<OpenAICompatibleChatConfig>): LanguageModelV3;
    chatModel(modelId: CHAT_MODEL_IDS): LanguageModelV3;
    completionModel(modelId: COMPLETION_MODEL_IDS): LanguageModelV3;
    embeddingModel(modelId: EMBEDDING_MODEL_IDS): EmbeddingModelV3;
    /**
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel(modelId: EMBEDDING_MODEL_IDS): EmbeddingModelV3;
    imageModel(modelId: IMAGE_MODEL_IDS): ImageModelV3;
}
interface OpenAICompatibleProviderSettings {
    /**
     * Base URL for the API calls.
     */
    baseURL: string;
    /**
     * Provider name.
     */
    name: string;
    /**
     * API key for authenticating requests. If specified, adds an `Authorization`
     * header to request headers with the value `Bearer <apiKey>`. This will be added
     * before any headers potentially specified in the `headers` option.
     */
    apiKey?: string;
    /**
     * Optional custom headers to include in requests. These will be added to request headers
     * after any headers potentially added by use of the `apiKey` option.
     */
    headers?: Record<string, string>;
    /**
     * Optional custom url query parameters to include in request urls.
     */
    queryParams?: Record<string, string>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
    /**
     * Include usage information in streaming responses.
     */
    includeUsage?: boolean;
    /**
     * Whether the provider supports structured outputs in chat models.
     */
    supportsStructuredOutputs?: boolean;
    /**
     * Optional function to transform the request body before sending it to the API.
     * This is useful for proxy providers that may require a different request format
     * than the official OpenAI API.
     */
    transformRequestBody?: (args: Record<string, any>) => Record<string, any>;
    /**
     * Optional metadata extractor to capture provider-specific metadata from API responses.
     * This is useful for extracting non-standard fields, experimental features,
     * or provider-specific metrics from both streaming and non-streaming responses.
     */
    metadataExtractor?: MetadataExtractor;
}
/**
 * Create an OpenAICompatible provider instance.
 */
declare function createOpenAICompatible<CHAT_MODEL_IDS extends string, COMPLETION_MODEL_IDS extends string, EMBEDDING_MODEL_IDS extends string, IMAGE_MODEL_IDS extends string>(options: OpenAICompatibleProviderSettings): OpenAICompatibleProvider<CHAT_MODEL_IDS, COMPLETION_MODEL_IDS, EMBEDDING_MODEL_IDS, IMAGE_MODEL_IDS>;

declare const VERSION: string;

export { type MetadataExtractor, OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatModelId, OpenAICompatibleCompletionLanguageModel, type OpenAICompatibleCompletionModelId, type OpenAICompatibleLanguageModelCompletionOptions as OpenAICompatibleCompletionProviderOptions, OpenAICompatibleEmbeddingModel, type OpenAICompatibleEmbeddingModelId, type OpenAICompatibleEmbeddingModelOptions, type OpenAICompatibleEmbeddingModelOptions as OpenAICompatibleEmbeddingProviderOptions, type OpenAICompatibleErrorData, OpenAICompatibleImageModel, type OpenAICompatibleLanguageModelChatOptions, type OpenAICompatibleLanguageModelCompletionOptions, type OpenAICompatibleProvider, type OpenAICompatibleLanguageModelChatOptions as OpenAICompatibleProviderOptions, type OpenAICompatibleProviderSettings, type ProviderErrorStructure, VERSION, createOpenAICompatible };
