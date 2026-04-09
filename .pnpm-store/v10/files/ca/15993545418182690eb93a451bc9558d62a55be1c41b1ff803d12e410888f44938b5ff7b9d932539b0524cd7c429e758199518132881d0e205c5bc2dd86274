import { z } from 'zod/v4';
import { ProviderV3, LanguageModelV3, ImageModelV3, Experimental_VideoModelV3 } from '@ai-sdk/provider';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { FetchFunction } from '@ai-sdk/provider-utils';

type XaiChatModelId = 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning' | 'grok-4-fast-non-reasoning' | 'grok-4-fast-reasoning' | 'grok-4.20-0309-non-reasoning' | 'grok-4.20-0309-reasoning' | 'grok-4.20-multi-agent-0309' | 'grok-code-fast-1' | 'grok-4' | 'grok-4-0709' | 'grok-4-latest' | 'grok-3' | 'grok-3-latest' | 'grok-3-mini' | 'grok-3-mini-latest' | (string & {});
declare const xaiLanguageModelChatOptions: z.ZodObject<{
    reasoningEffort: z.ZodOptional<z.ZodEnum<{
        low: "low";
        high: "high";
    }>>;
    logprobs: z.ZodOptional<z.ZodBoolean>;
    topLogprobs: z.ZodOptional<z.ZodNumber>;
    parallel_function_calling: z.ZodOptional<z.ZodBoolean>;
    searchParameters: z.ZodOptional<z.ZodObject<{
        mode: z.ZodEnum<{
            off: "off";
            auto: "auto";
            on: "on";
        }>;
        returnCitations: z.ZodOptional<z.ZodBoolean>;
        fromDate: z.ZodOptional<z.ZodString>;
        toDate: z.ZodOptional<z.ZodString>;
        maxSearchResults: z.ZodOptional<z.ZodNumber>;
        sources: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"web">;
            country: z.ZodOptional<z.ZodString>;
            excludedWebsites: z.ZodOptional<z.ZodArray<z.ZodString>>;
            allowedWebsites: z.ZodOptional<z.ZodArray<z.ZodString>>;
            safeSearch: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"x">;
            excludedXHandles: z.ZodOptional<z.ZodArray<z.ZodString>>;
            includedXHandles: z.ZodOptional<z.ZodArray<z.ZodString>>;
            postFavoriteCount: z.ZodOptional<z.ZodNumber>;
            postViewCount: z.ZodOptional<z.ZodNumber>;
            xHandles: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"news">;
            country: z.ZodOptional<z.ZodString>;
            excludedWebsites: z.ZodOptional<z.ZodArray<z.ZodString>>;
            safeSearch: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"rss">;
            links: z.ZodArray<z.ZodString>;
        }, z.core.$strip>]>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type XaiLanguageModelChatOptions = z.infer<typeof xaiLanguageModelChatOptions>;

declare const xaiErrorDataSchema: z.ZodObject<{
    error: z.ZodObject<{
        message: z.ZodString;
        type: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        param: z.ZodOptional<z.ZodNullable<z.ZodAny>>;
        code: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
type XaiErrorData = z.infer<typeof xaiErrorDataSchema>;

type XaiResponsesModelId = 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning' | 'grok-4' | 'grok-4-fast-non-reasoning' | 'grok-4-fast-reasoning' | 'grok-4.20-0309-non-reasoning' | 'grok-4.20-0309-reasoning' | 'grok-4.20-multi-agent-0309' | (string & {});
/**
 * @see https://docs.x.ai/docs/api-reference#create-new-response
 */
declare const xaiLanguageModelResponsesOptions: z.ZodObject<{
    reasoningEffort: z.ZodOptional<z.ZodEnum<{
        low: "low";
        high: "high";
        medium: "medium";
    }>>;
    logprobs: z.ZodOptional<z.ZodBoolean>;
    topLogprobs: z.ZodOptional<z.ZodNumber>;
    store: z.ZodOptional<z.ZodBoolean>;
    previousResponseId: z.ZodOptional<z.ZodString>;
    include: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodEnum<{
        "file_search_call.results": "file_search_call.results";
    }>>>>;
}, z.core.$strip>;
type XaiLanguageModelResponsesOptions = z.infer<typeof xaiLanguageModelResponsesOptions>;

declare const xaiImageModelOptions: z.ZodObject<{
    aspect_ratio: z.ZodOptional<z.ZodString>;
    output_format: z.ZodOptional<z.ZodString>;
    sync_mode: z.ZodOptional<z.ZodBoolean>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1k": "1k";
        "2k": "2k";
    }>>;
    quality: z.ZodOptional<z.ZodEnum<{
        low: "low";
        high: "high";
        medium: "medium";
    }>>;
    user: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type XaiImageModelOptions = z.infer<typeof xaiImageModelOptions>;

type XaiVideoModelId = 'grok-imagine-video' | (string & {});

type XaiVideoModelOptions = {
    pollIntervalMs?: number | null;
    pollTimeoutMs?: number | null;
    resolution?: '480p' | '720p' | null;
    videoUrl?: string | null;
    [key: string]: unknown;
};

type XaiImageModelId = 'grok-imagine-image' | 'grok-imagine-image-pro' | (string & {});

declare const codeExecutionToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
    output: string;
    error?: string | undefined;
}, object>;
declare const codeExecution: (args?: Parameters<typeof codeExecutionToolFactory>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
    output: string;
    error?: string | undefined;
}>;

declare const mcpServerToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
    name: string;
    arguments: string;
    result: unknown;
}, {
    serverUrl: string;
    serverLabel?: string;
    serverDescription?: string;
    allowedTools?: string[];
    headers?: Record<string, string>;
    authorization?: string;
}>;
declare const mcpServer: (args: Parameters<typeof mcpServerToolFactory>[0]) => _ai_sdk_provider_utils.Tool<{}, {
    name: string;
    arguments: string;
    result: unknown;
}>;

declare const viewImageToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
    description: string;
    objects?: string[] | undefined;
}, object>;
declare const viewImage: (args?: Parameters<typeof viewImageToolFactory>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
    description: string;
    objects?: string[] | undefined;
}>;

declare const viewXVideoToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
    description: string;
    transcript?: string | undefined;
    duration?: number | undefined;
}, object>;
declare const viewXVideo: (args?: Parameters<typeof viewXVideoToolFactory>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
    description: string;
    transcript?: string | undefined;
    duration?: number | undefined;
}>;

declare const webSearchToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
    query: string;
    sources: Array<{
        title: string;
        url: string;
        snippet: string;
    }>;
}, {
    allowedDomains?: string[];
    excludedDomains?: string[];
    enableImageUnderstanding?: boolean;
}>;
declare const webSearch: (args?: Parameters<typeof webSearchToolFactory>[0]) => _ai_sdk_provider_utils.Tool<{}, {
    query: string;
    sources: Array<{
        title: string;
        url: string;
        snippet: string;
    }>;
}>;

declare const xSearchToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
    query: string;
    posts: Array<{
        author: string;
        text: string;
        url: string;
        likes: number;
    }>;
}, {
    allowedXHandles?: string[];
    excludedXHandles?: string[];
    fromDate?: string;
    toDate?: string;
    enableImageUnderstanding?: boolean;
    enableVideoUnderstanding?: boolean;
}>;
declare const xSearch: (args?: Parameters<typeof xSearchToolFactory>[0]) => _ai_sdk_provider_utils.Tool<{}, {
    query: string;
    posts: Array<{
        author: string;
        text: string;
        url: string;
        likes: number;
    }>;
}>;

declare const xaiTools: {
    codeExecution: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
        output: string;
        error?: string | undefined;
    }, object>>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
        output: string;
        error?: string | undefined;
    }>;
    fileSearch: (args: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
        queries: string[];
        results: null | {
            fileId: string;
            filename: string;
            score: number;
            text: string;
        }[];
    }, {
        vectorStoreIds: string[];
        maxNumResults?: number;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{}, {
        queries: string[];
        results: null | {
            fileId: string;
            filename: string;
            score: number;
            text: string;
        }[];
    }>;
    mcpServer: (args: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
        name: string;
        arguments: string;
        result: unknown;
    }, {
        serverUrl: string;
        serverLabel?: string;
        serverDescription?: string;
        allowedTools?: string[];
        headers?: Record<string, string>;
        authorization?: string;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{}, {
        name: string;
        arguments: string;
        result: unknown;
    }>;
    viewImage: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
        description: string;
        objects?: string[] | undefined;
    }, object>>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
        description: string;
        objects?: string[] | undefined;
    }>;
    viewXVideo: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<Record<string, never>, {
        description: string;
        transcript?: string | undefined;
        duration?: number | undefined;
    }, object>>[0]) => _ai_sdk_provider_utils.Tool<Record<string, never>, {
        description: string;
        transcript?: string | undefined;
        duration?: number | undefined;
    }>;
    webSearch: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
        query: string;
        sources: Array<{
            title: string;
            url: string;
            snippet: string;
        }>;
    }, {
        allowedDomains?: string[];
        excludedDomains?: string[];
        enableImageUnderstanding?: boolean;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{}, {
        query: string;
        sources: Array<{
            title: string;
            url: string;
            snippet: string;
        }>;
    }>;
    xSearch: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
        query: string;
        posts: Array<{
            author: string;
            text: string;
            url: string;
            likes: number;
        }>;
    }, {
        allowedXHandles?: string[];
        excludedXHandles?: string[];
        fromDate?: string;
        toDate?: string;
        enableImageUnderstanding?: boolean;
        enableVideoUnderstanding?: boolean;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{}, {
        query: string;
        posts: Array<{
            author: string;
            text: string;
            url: string;
            likes: number;
        }>;
    }>;
};

interface XaiProvider extends ProviderV3 {
    /**
     * Creates an Xai chat model for text generation.
     */
    (modelId: XaiChatModelId): LanguageModelV3;
    /**
     * Creates an Xai language model for text generation.
     */
    languageModel(modelId: XaiChatModelId): LanguageModelV3;
    /**
     * Creates an Xai chat model for text generation.
     */
    chat: (modelId: XaiChatModelId) => LanguageModelV3;
    /**
     * Creates an Xai responses model for agentic tool calling.
     */
    responses: (modelId: XaiResponsesModelId) => LanguageModelV3;
    /**
     * Creates an Xai image model for image generation.
     */
    image(modelId: XaiImageModelId): ImageModelV3;
    /**
     * Creates an Xai image model for image generation.
     */
    imageModel(modelId: XaiImageModelId): ImageModelV3;
    /**
     * Creates an Xai video model for video generation.
     */
    video(modelId: XaiVideoModelId): Experimental_VideoModelV3;
    /**
     * Creates an Xai video model for video generation.
     */
    videoModel(modelId: XaiVideoModelId): Experimental_VideoModelV3;
    /**
     * Server-side agentic tools for use with the responses API.
     */
    tools: typeof xaiTools;
    /**
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel(modelId: string): never;
}
interface XaiProviderSettings {
    /**
     * Base URL for the xAI API calls.
     */
    baseURL?: string;
    /**
     * API key for authenticating requests.
     */
    apiKey?: string;
    /**
     * Custom headers to include in the requests.
     */
    headers?: Record<string, string>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
}
declare function createXai(options?: XaiProviderSettings): XaiProvider;
declare const xai: XaiProvider;

declare const VERSION: string;

export { VERSION, type XaiErrorData, type XaiImageModelOptions, type XaiImageModelOptions as XaiImageProviderOptions, type XaiLanguageModelChatOptions, type XaiLanguageModelResponsesOptions, type XaiProvider, type XaiLanguageModelChatOptions as XaiProviderOptions, type XaiProviderSettings, type XaiLanguageModelResponsesOptions as XaiResponsesProviderOptions, type XaiVideoModelId, type XaiVideoModelOptions, type XaiVideoModelOptions as XaiVideoProviderOptions, codeExecution, createXai, mcpServer, viewImage, viewXVideo, webSearch, xSearch, xai, xaiTools };
