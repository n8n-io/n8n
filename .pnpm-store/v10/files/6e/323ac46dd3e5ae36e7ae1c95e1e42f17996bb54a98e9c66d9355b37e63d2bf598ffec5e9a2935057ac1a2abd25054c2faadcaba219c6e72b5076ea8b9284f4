import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { InferSchema, FetchFunction } from '@ai-sdk/provider-utils';
import { ProviderV3, LanguageModelV3, ImageModelV3, EmbeddingModelV3, Experimental_VideoModelV3 } from '@ai-sdk/provider';

declare const googleErrorDataSchema: _ai_sdk_provider_utils.LazySchema<{
    error: {
        code: number | null;
        message: string;
        status: string;
    };
}>;
type GoogleErrorData = InferSchema<typeof googleErrorDataSchema>;

type GoogleGenerativeAIModelId = 'gemini-2.0-flash' | 'gemini-2.0-flash-001' | 'gemini-2.0-flash-lite' | 'gemini-2.0-flash-lite-001' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-image' | 'gemini-2.5-flash-lite' | 'gemini-2.5-flash-lite-preview-09-2025' | 'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts' | 'gemini-2.5-flash-native-audio-latest' | 'gemini-2.5-flash-native-audio-preview-09-2025' | 'gemini-2.5-flash-native-audio-preview-12-2025' | 'gemini-2.5-computer-use-preview-10-2025' | 'gemini-3-pro-preview' | 'gemini-3-pro-image-preview' | 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview' | 'gemini-3.1-pro-preview-customtools' | 'gemini-3.1-flash-image-preview' | 'gemini-3.1-flash-lite-preview' | 'gemini-pro-latest' | 'gemini-flash-latest' | 'gemini-flash-lite-latest' | 'deep-research-pro-preview-12-2025' | 'nano-banana-pro-preview' | 'aqa' | 'gemini-robotics-er-1.5-preview' | 'gemma-3-1b-it' | 'gemma-3-4b-it' | 'gemma-3n-e4b-it' | 'gemma-3n-e2b-it' | 'gemma-3-12b-it' | 'gemma-3-27b-it' | (string & {});
declare const googleLanguageModelOptions: _ai_sdk_provider_utils.LazySchema<{
    responseModalities?: ("TEXT" | "IMAGE")[] | undefined;
    thinkingConfig?: {
        thinkingBudget?: number | undefined;
        includeThoughts?: boolean | undefined;
        thinkingLevel?: "minimal" | "low" | "medium" | "high" | undefined;
    } | undefined;
    cachedContent?: string | undefined;
    structuredOutputs?: boolean | undefined;
    safetySettings?: {
        category: "HARM_CATEGORY_UNSPECIFIED" | "HARM_CATEGORY_HATE_SPEECH" | "HARM_CATEGORY_DANGEROUS_CONTENT" | "HARM_CATEGORY_HARASSMENT" | "HARM_CATEGORY_SEXUALLY_EXPLICIT" | "HARM_CATEGORY_CIVIC_INTEGRITY";
        threshold: "HARM_BLOCK_THRESHOLD_UNSPECIFIED" | "BLOCK_LOW_AND_ABOVE" | "BLOCK_MEDIUM_AND_ABOVE" | "BLOCK_ONLY_HIGH" | "BLOCK_NONE" | "OFF";
    }[] | undefined;
    threshold?: "HARM_BLOCK_THRESHOLD_UNSPECIFIED" | "BLOCK_LOW_AND_ABOVE" | "BLOCK_MEDIUM_AND_ABOVE" | "BLOCK_ONLY_HIGH" | "BLOCK_NONE" | "OFF" | undefined;
    audioTimestamp?: boolean | undefined;
    labels?: Record<string, string> | undefined;
    mediaResolution?: "MEDIA_RESOLUTION_UNSPECIFIED" | "MEDIA_RESOLUTION_LOW" | "MEDIA_RESOLUTION_MEDIUM" | "MEDIA_RESOLUTION_HIGH" | undefined;
    imageConfig?: {
        aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9" | "1:8" | "8:1" | "1:4" | "4:1" | undefined;
        imageSize?: "1K" | "2K" | "4K" | "512" | undefined;
    } | undefined;
    retrievalConfig?: {
        latLng?: {
            latitude: number;
            longitude: number;
        } | undefined;
    } | undefined;
}>;
type GoogleLanguageModelOptions = InferSchema<typeof googleLanguageModelOptions>;

declare const responseSchema: _ai_sdk_provider_utils.LazySchema<{
    candidates: {
        content?: Record<string, never> | {
            parts?: ({
                functionCall: {
                    name: string;
                    args: unknown;
                };
                thoughtSignature?: string | null | undefined;
            } | {
                inlineData: {
                    mimeType: string;
                    data: string;
                };
                thought?: boolean | null | undefined;
                thoughtSignature?: string | null | undefined;
            } | {
                executableCode?: {
                    language: string;
                    code: string;
                } | null | undefined;
                codeExecutionResult?: {
                    outcome: string;
                    output?: string | null | undefined;
                } | null | undefined;
                text?: string | null | undefined;
                thought?: boolean | null | undefined;
                thoughtSignature?: string | null | undefined;
            })[] | null | undefined;
        } | null | undefined;
        finishReason?: string | null | undefined;
        finishMessage?: string | null | undefined;
        safetyRatings?: {
            category?: string | null | undefined;
            probability?: string | null | undefined;
            probabilityScore?: number | null | undefined;
            severity?: string | null | undefined;
            severityScore?: number | null | undefined;
            blocked?: boolean | null | undefined;
        }[] | null | undefined;
        groundingMetadata?: {
            webSearchQueries?: string[] | null | undefined;
            imageSearchQueries?: string[] | null | undefined;
            retrievalQueries?: string[] | null | undefined;
            searchEntryPoint?: {
                renderedContent: string;
            } | null | undefined;
            groundingChunks?: {
                web?: {
                    uri: string;
                    title?: string | null | undefined;
                } | null | undefined;
                image?: {
                    sourceUri: string;
                    imageUri: string;
                    title?: string | null | undefined;
                    domain?: string | null | undefined;
                } | null | undefined;
                retrievedContext?: {
                    uri?: string | null | undefined;
                    title?: string | null | undefined;
                    text?: string | null | undefined;
                    fileSearchStore?: string | null | undefined;
                } | null | undefined;
                maps?: {
                    uri?: string | null | undefined;
                    title?: string | null | undefined;
                    text?: string | null | undefined;
                    placeId?: string | null | undefined;
                } | null | undefined;
            }[] | null | undefined;
            groundingSupports?: {
                segment?: {
                    startIndex?: number | null | undefined;
                    endIndex?: number | null | undefined;
                    text?: string | null | undefined;
                } | null | undefined;
                segment_text?: string | null | undefined;
                groundingChunkIndices?: number[] | null | undefined;
                supportChunkIndices?: number[] | null | undefined;
                confidenceScores?: number[] | null | undefined;
                confidenceScore?: number[] | null | undefined;
            }[] | null | undefined;
            retrievalMetadata?: Record<string, never> | {
                webDynamicRetrievalScore: number;
            } | null | undefined;
        } | null | undefined;
        urlContextMetadata?: {
            urlMetadata?: {
                retrievedUrl: string;
                urlRetrievalStatus: string;
            }[] | null | undefined;
        } | null | undefined;
    }[];
    usageMetadata?: {
        cachedContentTokenCount?: number | null | undefined;
        thoughtsTokenCount?: number | null | undefined;
        promptTokenCount?: number | null | undefined;
        candidatesTokenCount?: number | null | undefined;
        totalTokenCount?: number | null | undefined;
        trafficType?: string | null | undefined;
    } | null | undefined;
    promptFeedback?: {
        blockReason?: string | null | undefined;
        safetyRatings?: {
            category?: string | null | undefined;
            probability?: string | null | undefined;
            probabilityScore?: number | null | undefined;
            severity?: string | null | undefined;
            severityScore?: number | null | undefined;
            blocked?: boolean | null | undefined;
        }[] | null | undefined;
    } | null | undefined;
}>;
type GroundingMetadataSchema = NonNullable<InferSchema<typeof responseSchema>['candidates'][number]['groundingMetadata']>;
type UrlContextMetadataSchema = NonNullable<InferSchema<typeof responseSchema>['candidates'][number]['urlContextMetadata']>;
type SafetyRatingSchema = NonNullable<InferSchema<typeof responseSchema>['candidates'][number]['safetyRatings']>[number];
type PromptFeedbackSchema = NonNullable<InferSchema<typeof responseSchema>['promptFeedback']>;
type UsageMetadataSchema = NonNullable<InferSchema<typeof responseSchema>['usageMetadata']>;

type GoogleGenerativeAIGroundingMetadata = GroundingMetadataSchema;
type GoogleGenerativeAIUrlContextMetadata = UrlContextMetadataSchema;
type GoogleGenerativeAISafetyRating = SafetyRatingSchema;
type GoogleGenerativeAIPromptFeedback = PromptFeedbackSchema;
type GoogleGenerativeAIUsageMetadata = UsageMetadataSchema;
interface GoogleGenerativeAIProviderMetadata {
    promptFeedback: GoogleGenerativeAIPromptFeedback | null;
    groundingMetadata: GoogleGenerativeAIGroundingMetadata | null;
    urlContextMetadata: GoogleGenerativeAIUrlContextMetadata | null;
    safetyRatings: GoogleGenerativeAISafetyRating[] | null;
    usageMetadata: GoogleGenerativeAIUsageMetadata | null;
    finishMessage: string | null;
}

type GoogleGenerativeAIImageModelId = 'imagen-4.0-generate-001' | 'imagen-4.0-ultra-generate-001' | 'imagen-4.0-fast-generate-001' | 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview' | (string & {});
interface GoogleGenerativeAIImageSettings {
    /**
     * Override the maximum number of images per call (default 4)
     */
    maxImagesPerCall?: number;
}

declare const googleImageModelOptionsSchema: _ai_sdk_provider_utils.LazySchema<{
    personGeneration?: "dont_allow" | "allow_adult" | "allow_all" | null | undefined;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | null | undefined;
}>;
type GoogleImageModelOptions = InferSchema<typeof googleImageModelOptionsSchema>;

type GoogleGenerativeAIEmbeddingModelId = 'gemini-embedding-001' | 'gemini-embedding-2-preview' | (string & {});
declare const googleEmbeddingModelOptions: _ai_sdk_provider_utils.LazySchema<{
    outputDimensionality?: number | undefined;
    taskType?: "SEMANTIC_SIMILARITY" | "CLASSIFICATION" | "CLUSTERING" | "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "QUESTION_ANSWERING" | "FACT_VERIFICATION" | "CODE_RETRIEVAL_QUERY" | undefined;
    content?: (({
        text: string;
    } | {
        inlineData: {
            mimeType: string;
            data: string;
        };
    })[] | null)[] | undefined;
}>;
type GoogleEmbeddingModelOptions = InferSchema<typeof googleEmbeddingModelOptions>;

type GoogleGenerativeAIVideoModelId = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview' | 'veo-3.1-generate' | 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001' | 'veo-2.0-generate-001' | (string & {});

type GoogleVideoModelOptions = {
    pollIntervalMs?: number | null;
    pollTimeoutMs?: number | null;
    personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all' | null;
    negativePrompt?: string | null;
    referenceImages?: Array<{
        bytesBase64Encoded?: string;
        gcsUri?: string;
    }> | null;
    [key: string]: unknown;
};

declare const googleTools: {
    /**
     * Creates a Google search tool that gives Google direct access to real-time web content.
     * Must have name "google_search".
     */
    googleSearch: _ai_sdk_provider_utils.ProviderToolFactory<{}, {
        [x: string]: unknown;
        searchTypes?: {
            webSearch?: Record<string, never> | undefined;
            imageSearch?: Record<string, never> | undefined;
        } | undefined;
        timeRangeFilter?: {
            startTime: string;
            endTime: string;
        } | undefined;
    }>;
    /**
     * Creates an Enterprise Web Search tool for grounding responses using a compliance-focused web index.
     * Designed for highly-regulated industries (finance, healthcare, public sector).
     * Does not log customer data and supports VPC service controls.
     * Must have name "enterprise_web_search".
     *
     * @note Only available on Vertex AI. Requires Gemini 2.0 or newer.
     *
     * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/web-grounding-enterprise
     */
    enterpriseWebSearch: _ai_sdk_provider_utils.ProviderToolFactory<{}, {}>;
    /**
     * Creates a Google Maps grounding tool that gives the model access to Google Maps data.
     * Must have name "google_maps".
     *
     * @see https://ai.google.dev/gemini-api/docs/maps-grounding
     * @see https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
     */
    googleMaps: _ai_sdk_provider_utils.ProviderToolFactory<{}, {}>;
    /**
     * Creates a URL context tool that gives Google direct access to real-time web content.
     * Must have name "url_context".
     */
    urlContext: _ai_sdk_provider_utils.ProviderToolFactory<{}, {}>;
    /**
     * Enables Retrieval Augmented Generation (RAG) via the Gemini File Search tool.
     * Must have name "file_search".
     *
     * @param fileSearchStoreNames - Fully-qualified File Search store resource names.
     * @param metadataFilter - Optional filter expression to restrict the files that can be retrieved.
     * @param topK - Optional result limit for the number of chunks returned from File Search.
     *
     * @see https://ai.google.dev/gemini-api/docs/file-search
     */
    fileSearch: _ai_sdk_provider_utils.ProviderToolFactory<{}, {
        [x: string]: unknown;
        fileSearchStoreNames: string[];
        topK?: number | undefined;
        metadataFilter?: string | undefined;
    }>;
    /**
     * A tool that enables the model to generate and run Python code.
     * Must have name "code_execution".
     *
     * @note Ensure the selected model supports Code Execution.
     * Multi-tool usage with the code execution tool is typically compatible with Gemini >=2 models.
     *
     * @see https://ai.google.dev/gemini-api/docs/code-execution (Google AI)
     * @see https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/code-execution-api (Vertex AI)
     */
    codeExecution: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        language: string;
        code: string;
    }, {
        outcome: string;
        output: string;
    }, {}>;
    /**
     * Creates a Vertex RAG Store tool that enables the model to perform RAG searches against a Vertex RAG Store.
     * Must have name "vertex_rag_store".
     */
    vertexRagStore: _ai_sdk_provider_utils.ProviderToolFactory<{}, {
        ragCorpus: string;
        topK?: number;
    }>;
};

interface GoogleGenerativeAIProvider extends ProviderV3 {
    (modelId: GoogleGenerativeAIModelId): LanguageModelV3;
    languageModel(modelId: GoogleGenerativeAIModelId): LanguageModelV3;
    chat(modelId: GoogleGenerativeAIModelId): LanguageModelV3;
    /**
     * Creates a model for image generation.
     */
    image(modelId: GoogleGenerativeAIImageModelId, settings?: GoogleGenerativeAIImageSettings): ImageModelV3;
    /**
     * @deprecated Use `chat()` instead.
     */
    generativeAI(modelId: GoogleGenerativeAIModelId): LanguageModelV3;
    /**
     * Creates a model for text embeddings.
     */
    embedding(modelId: GoogleGenerativeAIEmbeddingModelId): EmbeddingModelV3;
    /**
     * Creates a model for text embeddings.
     */
    embeddingModel(modelId: GoogleGenerativeAIEmbeddingModelId): EmbeddingModelV3;
    /**
     * @deprecated Use `embedding` instead.
     */
    textEmbedding(modelId: GoogleGenerativeAIEmbeddingModelId): EmbeddingModelV3;
    /**
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel(modelId: GoogleGenerativeAIEmbeddingModelId): EmbeddingModelV3;
    /**
     * Creates a model for video generation.
     */
    video(modelId: GoogleGenerativeAIVideoModelId): Experimental_VideoModelV3;
    /**
     * Creates a model for video generation.
     */
    videoModel(modelId: GoogleGenerativeAIVideoModelId): Experimental_VideoModelV3;
    tools: typeof googleTools;
}
interface GoogleGenerativeAIProviderSettings {
    /**
     * Use a different URL prefix for API calls, e.g. to use proxy servers.
     * The default prefix is `https://generativelanguage.googleapis.com/v1beta`.
     */
    baseURL?: string;
    /**
     * API key that is being send using the `x-goog-api-key` header.
     * It defaults to the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable.
     */
    apiKey?: string;
    /**
     * Custom headers to include in the requests.
     */
    headers?: Record<string, string | undefined>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
    /**
     * Optional function to generate a unique ID for each request.
     */
    generateId?: () => string;
    /**
     * Custom provider name
     * Defaults to 'google.generative-ai'.
     */
    name?: string;
}
/**
 * Create a Google Generative AI provider instance.
 */
declare function createGoogleGenerativeAI(options?: GoogleGenerativeAIProviderSettings): GoogleGenerativeAIProvider;
/**
 * Default Google Generative AI provider instance.
 */
declare const google: GoogleGenerativeAIProvider;

declare const VERSION: string;

export { type GoogleEmbeddingModelOptions, type GoogleErrorData, type GoogleEmbeddingModelOptions as GoogleGenerativeAIEmbeddingProviderOptions, type GoogleImageModelOptions as GoogleGenerativeAIImageProviderOptions, type GoogleGenerativeAIProvider, type GoogleGenerativeAIProviderMetadata, type GoogleLanguageModelOptions as GoogleGenerativeAIProviderOptions, type GoogleGenerativeAIProviderSettings, type GoogleGenerativeAIVideoModelId, type GoogleVideoModelOptions as GoogleGenerativeAIVideoProviderOptions, type GoogleImageModelOptions, type GoogleLanguageModelOptions, type GoogleVideoModelOptions, VERSION, createGoogleGenerativeAI, google };
