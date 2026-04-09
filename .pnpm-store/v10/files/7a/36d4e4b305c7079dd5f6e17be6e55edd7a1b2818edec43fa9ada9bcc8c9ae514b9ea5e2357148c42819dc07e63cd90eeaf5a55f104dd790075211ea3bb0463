import { LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3StreamResult, EmbeddingModelV3, ImageModelV3, TranscriptionModelV3CallOptions, TranscriptionModelV3, SpeechModelV3, JSONValue } from '@ai-sdk/provider';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { InferSchema, FetchFunction } from '@ai-sdk/provider-utils';

type OpenAIChatModelId = 'o1' | 'o1-2024-12-17' | 'o3-mini' | 'o3-mini-2025-01-31' | 'o3' | 'o3-2025-04-16' | 'o4-mini' | 'o4-mini-2025-04-16' | 'gpt-4.1' | 'gpt-4.1-2025-04-14' | 'gpt-4.1-mini' | 'gpt-4.1-mini-2025-04-14' | 'gpt-4.1-nano' | 'gpt-4.1-nano-2025-04-14' | 'gpt-4o' | 'gpt-4o-2024-05-13' | 'gpt-4o-2024-08-06' | 'gpt-4o-2024-11-20' | 'gpt-4o-audio-preview' | 'gpt-4o-audio-preview-2024-12-17' | 'gpt-4o-audio-preview-2025-06-03' | 'gpt-4o-mini' | 'gpt-4o-mini-2024-07-18' | 'gpt-4o-mini-audio-preview' | 'gpt-4o-mini-audio-preview-2024-12-17' | 'gpt-4o-search-preview' | 'gpt-4o-search-preview-2025-03-11' | 'gpt-4o-mini-search-preview' | 'gpt-4o-mini-search-preview-2025-03-11' | 'gpt-3.5-turbo-0125' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-1106' | 'gpt-3.5-turbo-16k' | 'gpt-5' | 'gpt-5-2025-08-07' | 'gpt-5-mini' | 'gpt-5-mini-2025-08-07' | 'gpt-5-nano' | 'gpt-5-nano-2025-08-07' | 'gpt-5-chat-latest' | 'gpt-5.1' | 'gpt-5.1-2025-11-13' | 'gpt-5.1-chat-latest' | 'gpt-5.2' | 'gpt-5.2-2025-12-11' | 'gpt-5.2-chat-latest' | 'gpt-5.2-pro' | 'gpt-5.2-pro-2025-12-11' | 'gpt-5.3-chat-latest' | 'gpt-5.4' | 'gpt-5.4-2026-03-05' | 'gpt-5.4-mini' | 'gpt-5.4-mini-2026-03-17' | 'gpt-5.4-nano' | 'gpt-5.4-nano-2026-03-17' | 'gpt-5.4-pro' | 'gpt-5.4-pro-2026-03-05' | (string & {});
declare const openaiLanguageModelChatOptions: _ai_sdk_provider_utils.LazySchema<{
    logitBias?: Record<number, number> | undefined;
    logprobs?: number | boolean | undefined;
    parallelToolCalls?: boolean | undefined;
    user?: string | undefined;
    reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | undefined;
    maxCompletionTokens?: number | undefined;
    store?: boolean | undefined;
    metadata?: Record<string, string> | undefined;
    prediction?: Record<string, any> | undefined;
    serviceTier?: "default" | "auto" | "flex" | "priority" | undefined;
    strictJsonSchema?: boolean | undefined;
    textVerbosity?: "low" | "medium" | "high" | undefined;
    promptCacheKey?: string | undefined;
    promptCacheRetention?: "in_memory" | "24h" | undefined;
    safetyIdentifier?: string | undefined;
    systemMessageMode?: "remove" | "system" | "developer" | undefined;
    forceReasoning?: boolean | undefined;
}>;
type OpenAILanguageModelChatOptions = InferSchema<typeof openaiLanguageModelChatOptions>;

type OpenAIChatConfig = {
    provider: string;
    headers: () => Record<string, string | undefined>;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    fetch?: FetchFunction;
};
declare class OpenAIChatLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAIChatModelId;
    readonly supportedUrls: {
        'image/*': RegExp[];
    };
    private readonly config;
    constructor(modelId: OpenAIChatModelId, config: OpenAIChatConfig);
    get provider(): string;
    private getArgs;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}

type OpenAICompletionModelId = 'gpt-3.5-turbo-instruct' | 'gpt-3.5-turbo-instruct-0914' | (string & {});
declare const openaiLanguageModelCompletionOptions: _ai_sdk_provider_utils.LazySchema<{
    echo?: boolean | undefined;
    logitBias?: Record<string, number> | undefined;
    suffix?: string | undefined;
    user?: string | undefined;
    logprobs?: number | boolean | undefined;
}>;
type OpenAILanguageModelCompletionOptions = InferSchema<typeof openaiLanguageModelCompletionOptions>;

type OpenAICompletionConfig = {
    provider: string;
    headers: () => Record<string, string | undefined>;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    fetch?: FetchFunction;
};
declare class OpenAICompletionLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAICompletionModelId;
    private readonly config;
    private get providerOptionsName();
    constructor(modelId: OpenAICompletionModelId, config: OpenAICompletionConfig);
    get provider(): string;
    readonly supportedUrls: Record<string, RegExp[]>;
    private getArgs;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}

type OpenAIConfig = {
    provider: string;
    url: (options: {
        modelId: string;
        path: string;
    }) => string;
    headers: () => Record<string, string | undefined>;
    fetch?: FetchFunction;
    generateId?: () => string;
    /**
     * File ID prefixes used to identify file IDs in Responses API.
     * When undefined, all file data is treated as base64 content.
     *
     * Examples:
     * - OpenAI: ['file-'] for IDs like 'file-abc123'
     * - Azure OpenAI: ['assistant-'] for IDs like 'assistant-abc123'
     */
    fileIdPrefixes?: readonly string[];
};

type OpenAIEmbeddingModelId = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002' | (string & {});
declare const openaiEmbeddingModelOptions: _ai_sdk_provider_utils.LazySchema<{
    dimensions?: number | undefined;
    user?: string | undefined;
}>;
type OpenAIEmbeddingModelOptions = InferSchema<typeof openaiEmbeddingModelOptions>;

declare class OpenAIEmbeddingModel implements EmbeddingModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAIEmbeddingModelId;
    readonly maxEmbeddingsPerCall = 2048;
    readonly supportsParallelCalls = true;
    private readonly config;
    get provider(): string;
    constructor(modelId: OpenAIEmbeddingModelId, config: OpenAIConfig);
    doEmbed({ values, headers, abortSignal, providerOptions, }: Parameters<EmbeddingModelV3['doEmbed']>[0]): Promise<Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>>;
}

type OpenAIImageModelId = 'dall-e-3' | 'dall-e-2' | 'gpt-image-1' | 'gpt-image-1-mini' | 'gpt-image-1.5' | 'chatgpt-image-latest' | (string & {});
declare const modelMaxImagesPerCall: Record<OpenAIImageModelId, number>;
declare function hasDefaultResponseFormat(modelId: string): boolean;

interface OpenAIImageModelConfig extends OpenAIConfig {
    _internal?: {
        currentDate?: () => Date;
    };
}
declare class OpenAIImageModel implements ImageModelV3 {
    readonly modelId: OpenAIImageModelId;
    private readonly config;
    readonly specificationVersion = "v3";
    get maxImagesPerCall(): number;
    get provider(): string;
    constructor(modelId: OpenAIImageModelId, config: OpenAIImageModelConfig);
    doGenerate({ prompt, files, mask, n, size, aspectRatio, seed, providerOptions, headers, abortSignal, }: Parameters<ImageModelV3['doGenerate']>[0]): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>>;
}

type OpenAITranscriptionModelId = 'whisper-1' | 'gpt-4o-mini-transcribe' | 'gpt-4o-mini-transcribe-2025-03-20' | 'gpt-4o-mini-transcribe-2025-12-15' | 'gpt-4o-transcribe' | 'gpt-4o-transcribe-diarize' | (string & {});
declare const openAITranscriptionModelOptions: _ai_sdk_provider_utils.LazySchema<{
    include?: string[] | undefined;
    language?: string | undefined;
    prompt?: string | undefined;
    temperature?: number | undefined;
    timestampGranularities?: ("word" | "segment")[] | undefined;
}>;
type OpenAITranscriptionModelOptions = InferSchema<typeof openAITranscriptionModelOptions>;

type OpenAITranscriptionCallOptions = Omit<TranscriptionModelV3CallOptions, 'providerOptions'> & {
    providerOptions?: {
        openai?: OpenAITranscriptionModelOptions;
    };
};
interface OpenAITranscriptionModelConfig extends OpenAIConfig {
    _internal?: {
        currentDate?: () => Date;
    };
}
declare class OpenAITranscriptionModel implements TranscriptionModelV3 {
    readonly modelId: OpenAITranscriptionModelId;
    private readonly config;
    readonly specificationVersion = "v3";
    get provider(): string;
    constructor(modelId: OpenAITranscriptionModelId, config: OpenAITranscriptionModelConfig);
    private getArgs;
    doGenerate(options: OpenAITranscriptionCallOptions): Promise<Awaited<ReturnType<TranscriptionModelV3['doGenerate']>>>;
}

type OpenAISpeechModelId = 'tts-1' | 'tts-1-1106' | 'tts-1-hd' | 'tts-1-hd-1106' | 'gpt-4o-mini-tts' | 'gpt-4o-mini-tts-2025-03-20' | 'gpt-4o-mini-tts-2025-12-15' | (string & {});
declare const openaiSpeechModelOptionsSchema: _ai_sdk_provider_utils.LazySchema<{
    instructions?: string | null | undefined;
    speed?: number | null | undefined;
}>;
type OpenAISpeechModelOptions = InferSchema<typeof openaiSpeechModelOptionsSchema>;

interface OpenAISpeechModelConfig extends OpenAIConfig {
    _internal?: {
        currentDate?: () => Date;
    };
}
declare class OpenAISpeechModel implements SpeechModelV3 {
    readonly modelId: OpenAISpeechModelId;
    private readonly config;
    readonly specificationVersion = "v3";
    get provider(): string;
    constructor(modelId: OpenAISpeechModelId, config: OpenAISpeechModelConfig);
    private getArgs;
    doGenerate(options: Parameters<SpeechModelV3['doGenerate']>[0]): Promise<Awaited<ReturnType<SpeechModelV3['doGenerate']>>>;
}

type OpenAIResponsesModelId = 'gpt-3.5-turbo-0125' | 'gpt-3.5-turbo-1106' | 'gpt-3.5-turbo' | 'gpt-4.1-2025-04-14' | 'gpt-4.1-mini-2025-04-14' | 'gpt-4.1-mini' | 'gpt-4.1-nano-2025-04-14' | 'gpt-4.1-nano' | 'gpt-4.1' | 'gpt-4o-2024-05-13' | 'gpt-4o-2024-08-06' | 'gpt-4o-2024-11-20' | 'gpt-4o-mini-2024-07-18' | 'gpt-4o-mini' | 'gpt-4o' | 'gpt-5.1' | 'gpt-5.1-2025-11-13' | 'gpt-5.1-chat-latest' | 'gpt-5.1-codex-mini' | 'gpt-5.1-codex' | 'gpt-5.1-codex-max' | 'gpt-5.2' | 'gpt-5.2-2025-12-11' | 'gpt-5.2-chat-latest' | 'gpt-5.2-pro' | 'gpt-5.2-pro-2025-12-11' | 'gpt-5.2-codex' | 'gpt-5.3-chat-latest' | 'gpt-5.3-codex' | 'gpt-5.4' | 'gpt-5.4-2026-03-05' | 'gpt-5.4-mini' | 'gpt-5.4-mini-2026-03-17' | 'gpt-5.4-nano' | 'gpt-5.4-nano-2026-03-17' | 'gpt-5.4-pro' | 'gpt-5.4-pro-2026-03-05' | 'gpt-5-2025-08-07' | 'gpt-5-chat-latest' | 'gpt-5-codex' | 'gpt-5-mini-2025-08-07' | 'gpt-5-mini' | 'gpt-5-nano-2025-08-07' | 'gpt-5-nano' | 'gpt-5-pro-2025-10-06' | 'gpt-5-pro' | 'gpt-5' | 'o1-2024-12-17' | 'o1' | 'o3-2025-04-16' | 'o3-mini-2025-01-31' | 'o3-mini' | 'o3' | 'o4-mini' | 'o4-mini-2025-04-16' | (string & {});

declare class OpenAIResponsesLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: OpenAIResponsesModelId;
    private readonly config;
    constructor(modelId: OpenAIResponsesModelId, config: OpenAIConfig);
    readonly supportedUrls: Record<string, RegExp[]>;
    get provider(): string;
    private getArgs;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}

/**
 * A filter used to compare a specified attribute key to a given value using a defined comparison operation.
 */
type OpenAIResponsesFileSearchToolComparisonFilter = {
    /**
     * The key to compare against the value.
     */
    key: string;
    /**
     * Specifies the comparison operator: eq, ne, gt, gte, lt, lte, in, nin.
     */
    type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
    /**
     * The value to compare against the attribute key; supports string, number, boolean, or array of string types.
     */
    value: string | number | boolean | string[];
};
/**
 * Combine multiple filters using and or or.
 */
type OpenAIResponsesFileSearchToolCompoundFilter = {
    /**
     * Type of operation: and or or.
     */
    type: 'and' | 'or';
    /**
     * Array of filters to combine. Items can be ComparisonFilter or CompoundFilter.
     */
    filters: Array<OpenAIResponsesFileSearchToolComparisonFilter | OpenAIResponsesFileSearchToolCompoundFilter>;
};
declare const openaiResponsesChunkSchema: _ai_sdk_provider_utils.LazySchema<{
    type: "unknown_chunk";
    message: string;
} | {
    type: "response.output_text.delta";
    item_id: string;
    delta: string;
    logprobs?: {
        token: string;
        logprob: number;
        top_logprobs: {
            token: string;
            logprob: number;
        }[];
    }[] | null | undefined;
} | {
    type: "response.completed" | "response.incomplete";
    response: {
        usage: {
            input_tokens: number;
            output_tokens: number;
            input_tokens_details?: {
                cached_tokens?: number | null | undefined;
            } | null | undefined;
            output_tokens_details?: {
                reasoning_tokens?: number | null | undefined;
            } | null | undefined;
        };
        incomplete_details?: {
            reason: string;
        } | null | undefined;
        service_tier?: string | null | undefined;
    };
} | {
    type: "response.failed";
    response: {
        error?: {
            message: string;
            code?: string | null | undefined;
        } | null | undefined;
        incomplete_details?: {
            reason: string;
        } | null | undefined;
        usage?: {
            input_tokens: number;
            output_tokens: number;
            input_tokens_details?: {
                cached_tokens?: number | null | undefined;
            } | null | undefined;
            output_tokens_details?: {
                reasoning_tokens?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        service_tier?: string | null | undefined;
    };
} | {
    type: "response.created";
    response: {
        id: string;
        created_at: number;
        model: string;
        service_tier?: string | null | undefined;
    };
} | {
    type: "response.output_item.added";
    output_index: number;
    item: {
        type: "message";
        id: string;
        phase?: "commentary" | "final_answer" | null | undefined;
    } | {
        type: "reasoning";
        id: string;
        encrypted_content?: string | null | undefined;
    } | {
        type: "function_call";
        id: string;
        call_id: string;
        name: string;
        arguments: string;
    } | {
        type: "web_search_call";
        id: string;
        status: string;
    } | {
        type: "computer_call";
        id: string;
        status: string;
    } | {
        type: "file_search_call";
        id: string;
    } | {
        type: "image_generation_call";
        id: string;
    } | {
        type: "code_interpreter_call";
        id: string;
        container_id: string;
        code: string | null;
        outputs: ({
            type: "logs";
            logs: string;
        } | {
            type: "image";
            url: string;
        })[] | null;
        status: string;
    } | {
        type: "mcp_call";
        id: string;
        status: string;
        approval_request_id?: string | null | undefined;
    } | {
        type: "mcp_list_tools";
        id: string;
    } | {
        type: "mcp_approval_request";
        id: string;
    } | {
        type: "apply_patch_call";
        id: string;
        call_id: string;
        status: "completed" | "in_progress";
        operation: {
            type: "create_file";
            path: string;
            diff: string;
        } | {
            type: "delete_file";
            path: string;
        } | {
            type: "update_file";
            path: string;
            diff: string;
        };
    } | {
        type: "custom_tool_call";
        id: string;
        call_id: string;
        name: string;
        input: string;
    } | {
        type: "shell_call";
        id: string;
        call_id: string;
        status: "completed" | "in_progress" | "incomplete";
        action: {
            commands: string[];
        };
    } | {
        type: "shell_call_output";
        id: string;
        call_id: string;
        status: "completed" | "in_progress" | "incomplete";
        output: {
            stdout: string;
            stderr: string;
            outcome: {
                type: "timeout";
            } | {
                type: "exit";
                exit_code: number;
            };
        }[];
    } | {
        type: "tool_search_call";
        id: string;
        execution: "server" | "client";
        call_id: string | null;
        status: "completed" | "in_progress" | "incomplete";
        arguments: unknown;
    } | {
        type: "tool_search_output";
        id: string;
        execution: "server" | "client";
        call_id: string | null;
        status: "completed" | "in_progress" | "incomplete";
        tools: Record<string, JSONValue | undefined>[];
    };
} | {
    type: "response.output_item.done";
    output_index: number;
    item: {
        type: "message";
        id: string;
        phase?: "commentary" | "final_answer" | null | undefined;
    } | {
        type: "reasoning";
        id: string;
        encrypted_content?: string | null | undefined;
    } | {
        type: "function_call";
        id: string;
        call_id: string;
        name: string;
        arguments: string;
        status: "completed";
    } | {
        type: "custom_tool_call";
        id: string;
        call_id: string;
        name: string;
        input: string;
        status: "completed";
    } | {
        type: "code_interpreter_call";
        id: string;
        code: string | null;
        container_id: string;
        outputs: ({
            type: "logs";
            logs: string;
        } | {
            type: "image";
            url: string;
        })[] | null;
    } | {
        type: "image_generation_call";
        id: string;
        result: string;
    } | {
        type: "web_search_call";
        id: string;
        status: string;
        action?: {
            type: "search";
            query?: string | null | undefined;
            sources?: ({
                type: "url";
                url: string;
            } | {
                type: "api";
                name: string;
            })[] | null | undefined;
        } | {
            type: "open_page";
            url?: string | null | undefined;
        } | {
            type: "find_in_page";
            url?: string | null | undefined;
            pattern?: string | null | undefined;
        } | null | undefined;
    } | {
        type: "file_search_call";
        id: string;
        queries: string[];
        results?: {
            attributes: Record<string, string | number | boolean>;
            file_id: string;
            filename: string;
            score: number;
            text: string;
        }[] | null | undefined;
    } | {
        type: "local_shell_call";
        id: string;
        call_id: string;
        action: {
            type: "exec";
            command: string[];
            timeout_ms?: number | undefined;
            user?: string | undefined;
            working_directory?: string | undefined;
            env?: Record<string, string> | undefined;
        };
    } | {
        type: "computer_call";
        id: string;
        status: "completed";
    } | {
        type: "mcp_call";
        id: string;
        status: string;
        arguments: string;
        name: string;
        server_label: string;
        output?: string | null | undefined;
        error?: string | {
            [x: string]: unknown;
            type?: string | undefined;
            code?: string | number | undefined;
            message?: string | undefined;
        } | null | undefined;
        approval_request_id?: string | null | undefined;
    } | {
        type: "mcp_list_tools";
        id: string;
        server_label: string;
        tools: {
            name: string;
            input_schema: any;
            description?: string | undefined;
            annotations?: Record<string, unknown> | undefined;
        }[];
        error?: string | {
            [x: string]: unknown;
            type?: string | undefined;
            code?: string | number | undefined;
            message?: string | undefined;
        } | undefined;
    } | {
        type: "mcp_approval_request";
        id: string;
        server_label: string;
        name: string;
        arguments: string;
        approval_request_id?: string | undefined;
    } | {
        type: "apply_patch_call";
        id: string;
        call_id: string;
        status: "completed" | "in_progress";
        operation: {
            type: "create_file";
            path: string;
            diff: string;
        } | {
            type: "delete_file";
            path: string;
        } | {
            type: "update_file";
            path: string;
            diff: string;
        };
    } | {
        type: "shell_call";
        id: string;
        call_id: string;
        status: "completed" | "in_progress" | "incomplete";
        action: {
            commands: string[];
        };
    } | {
        type: "shell_call_output";
        id: string;
        call_id: string;
        status: "completed" | "in_progress" | "incomplete";
        output: {
            stdout: string;
            stderr: string;
            outcome: {
                type: "timeout";
            } | {
                type: "exit";
                exit_code: number;
            };
        }[];
    } | {
        type: "tool_search_call";
        id: string;
        execution: "server" | "client";
        call_id: string | null;
        status: "completed" | "in_progress" | "incomplete";
        arguments: unknown;
    } | {
        type: "tool_search_output";
        id: string;
        execution: "server" | "client";
        call_id: string | null;
        status: "completed" | "in_progress" | "incomplete";
        tools: Record<string, JSONValue | undefined>[];
    };
} | {
    type: "response.function_call_arguments.delta";
    item_id: string;
    output_index: number;
    delta: string;
} | {
    type: "response.custom_tool_call_input.delta";
    item_id: string;
    output_index: number;
    delta: string;
} | {
    type: "response.image_generation_call.partial_image";
    item_id: string;
    output_index: number;
    partial_image_b64: string;
} | {
    type: "response.code_interpreter_call_code.delta";
    item_id: string;
    output_index: number;
    delta: string;
} | {
    type: "response.code_interpreter_call_code.done";
    item_id: string;
    output_index: number;
    code: string;
} | {
    type: "response.output_text.annotation.added";
    annotation: {
        type: "url_citation";
        start_index: number;
        end_index: number;
        url: string;
        title: string;
    } | {
        type: "file_citation";
        file_id: string;
        filename: string;
        index: number;
    } | {
        type: "container_file_citation";
        container_id: string;
        file_id: string;
        filename: string;
        start_index: number;
        end_index: number;
    } | {
        type: "file_path";
        file_id: string;
        index: number;
    };
} | {
    type: "response.reasoning_summary_part.added";
    item_id: string;
    summary_index: number;
} | {
    type: "response.reasoning_summary_text.delta";
    item_id: string;
    summary_index: number;
    delta: string;
} | {
    type: "response.reasoning_summary_part.done";
    item_id: string;
    summary_index: number;
} | {
    type: "response.apply_patch_call_operation_diff.delta";
    item_id: string;
    output_index: number;
    delta: string;
    obfuscation?: string | null | undefined;
} | {
    type: "response.apply_patch_call_operation_diff.done";
    item_id: string;
    output_index: number;
    diff: string;
} | {
    type: "error";
    sequence_number: number;
    error: {
        type: string;
        code: string;
        message: string;
        param?: string | null | undefined;
    };
}>;
type OpenAIResponsesChunk = InferSchema<typeof openaiResponsesChunkSchema>;
type OpenAIResponsesLogprobs = NonNullable<(OpenAIResponsesChunk & {
    type: 'response.output_text.delta';
})['logprobs']> | null;

type OpenaiResponsesChunk = InferSchema<typeof openaiResponsesChunkSchema>;
type ResponsesOutputTextAnnotationProviderMetadata = Extract<OpenaiResponsesChunk, {
    type: 'response.output_text.annotation.added';
}>['annotation'];
type ResponsesProviderMetadata = {
    responseId: string | null | undefined;
    logprobs?: Array<OpenAIResponsesLogprobs>;
    serviceTier?: string;
};
type ResponsesReasoningProviderMetadata = {
    itemId: string;
    reasoningEncryptedContent?: string | null;
};
type OpenaiResponsesReasoningProviderMetadata = {
    openai: ResponsesReasoningProviderMetadata;
};
type OpenaiResponsesProviderMetadata = {
    openai: ResponsesProviderMetadata;
};
type ResponsesTextProviderMetadata = {
    itemId: string;
    phase?: 'commentary' | 'final_answer' | null;
    annotations?: Array<ResponsesOutputTextAnnotationProviderMetadata>;
};
type OpenaiResponsesTextProviderMetadata = {
    openai: ResponsesTextProviderMetadata;
};
type ResponsesSourceDocumentProviderMetadata = {
    type: 'file_citation';
    fileId: string;
    index: number;
} | {
    type: 'container_file_citation';
    fileId: string;
    containerId: string;
} | {
    type: 'file_path';
    fileId: string;
    index: number;
};
type OpenaiResponsesSourceDocumentProviderMetadata = {
    openai: ResponsesSourceDocumentProviderMetadata;
};

/**
 * Schema for the apply_patch input - what the model sends.
 *
 * Refer the official spec here: https://platform.openai.com/docs/api-reference/responses/create#responses_create-input-input_item_list-item-apply_patch_tool_call
 *
 */
declare const applyPatchInputSchema: _ai_sdk_provider_utils.LazySchema<{
    callId: string;
    operation: {
        type: "create_file";
        path: string;
        diff: string;
    } | {
        type: "delete_file";
        path: string;
    } | {
        type: "update_file";
        path: string;
        diff: string;
    };
}>;
/**
 * Schema for the apply_patch output - what we send back.
 */
declare const applyPatchOutputSchema: _ai_sdk_provider_utils.LazySchema<{
    status: "completed" | "failed";
    output?: string | undefined;
}>;
/**
 * Schema for tool arguments (configuration options).
 * The apply_patch tool doesn't require any configuration options.
 */
declare const applyPatchArgsSchema: _ai_sdk_provider_utils.LazySchema<Record<string, never>>;
/**
 * Type definitions for the apply_patch operations.
 */
type ApplyPatchOperation = {
    type: 'create_file';
    /**
     * Path of the file to create relative to the workspace root.
     */
    path: string;
    /**
     * Unified diff content to apply when creating the file.
     */
    diff: string;
} | {
    type: 'delete_file';
    /**
     * Path of the file to delete relative to the workspace root.
     */
    path: string;
} | {
    type: 'update_file';
    /**
     * Path of the file to update relative to the workspace root.
     */
    path: string;
    /**
     * Unified diff content to apply to the existing file.
     */
    diff: string;
};
/**
 * The apply_patch tool lets GPT-5.1 create, update, and delete files in your
 * codebase using structured diffs. Instead of just suggesting edits, the model
 * emits patch operations that your application applies and then reports back on,
 * enabling iterative, multi-step code editing workflows.
 *
 * The tool factory creates a provider-defined tool that:
 * - Receives patch operations from the model (create_file, update_file, delete_file)
 * - Returns the status of applying those patches (completed or failed)
 *
 */
declare const applyPatchToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
    /**
     * The unique ID of the apply patch tool call generated by the model.
     */
    callId: string;
    /**
     * The specific create, delete, or update instruction for the apply_patch tool call.
     */
    operation: ApplyPatchOperation;
}, {
    /**
     * The status of the apply patch tool call output.
     * - 'completed': The patch was applied successfully.
     * - 'failed': The patch failed to apply.
     */
    status: "completed" | "failed";
    /**
     * Optional human-readable log text from the apply patch tool
     * (e.g., patch results or errors).
     */
    output?: string;
}, {}>;
/**
 * The apply_patch tool lets GPT-5.1 create, update, and delete files in your
 * codebase using structured diffs. Instead of just suggesting edits, the model
 * emits patch operations that your application applies and then reports back on,
 * enabling iterative, multi-step code editing workflows.
 */
declare const applyPatch: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
    /**
     * The unique ID of the apply patch tool call generated by the model.
     */
    callId: string;
    /**
     * The specific create, delete, or update instruction for the apply_patch tool call.
     */
    operation: ApplyPatchOperation;
}, {
    /**
     * The status of the apply patch tool call output.
     * - 'completed': The patch was applied successfully.
     * - 'failed': The patch failed to apply.
     */
    status: "completed" | "failed";
    /**
     * Optional human-readable log text from the apply patch tool
     * (e.g., patch results or errors).
     */
    output?: string;
}, {}>;

declare const codeInterpreterInputSchema: _ai_sdk_provider_utils.LazySchema<{
    containerId: string;
    code?: string | null | undefined;
}>;
declare const codeInterpreterOutputSchema: _ai_sdk_provider_utils.LazySchema<{
    outputs?: ({
        type: "logs";
        logs: string;
    } | {
        type: "image";
        url: string;
    })[] | null | undefined;
}>;
declare const codeInterpreterArgsSchema: _ai_sdk_provider_utils.LazySchema<{
    container?: string | {
        fileIds?: string[] | undefined;
    } | undefined;
}>;
type CodeInterpreterArgs = {
    /**
     * The code interpreter container.
     * Can be a container ID
     * or an object that specifies uploaded file IDs to make available to your code.
     */
    container?: string | {
        fileIds?: string[];
    };
};
declare const codeInterpreterToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
    /**
     * The code to run, or null if not available.
     */
    code?: string | null;
    /**
     * The ID of the container used to run the code.
     */
    containerId: string;
}, {
    /**
     * The outputs generated by the code interpreter, such as logs or images.
     * Can be null if no outputs are available.
     */
    outputs?: Array<{
        type: "logs";
        /**
         * The logs output from the code interpreter.
         */
        logs: string;
    } | {
        type: "image";
        /**
         * The URL of the image output from the code interpreter.
         */
        url: string;
    }> | null;
}, CodeInterpreterArgs>;
declare const codeInterpreter: (args?: CodeInterpreterArgs) => _ai_sdk_provider_utils.Tool<{
    /**
     * The code to run, or null if not available.
     */
    code?: string | null;
    /**
     * The ID of the container used to run the code.
     */
    containerId: string;
}, {
    /**
     * The outputs generated by the code interpreter, such as logs or images.
     * Can be null if no outputs are available.
     */
    outputs?: Array<{
        type: "logs";
        /**
         * The logs output from the code interpreter.
         */
        logs: string;
    } | {
        type: "image";
        /**
         * The URL of the image output from the code interpreter.
         */
        url: string;
    }> | null;
}>;

declare const fileSearchArgsSchema: _ai_sdk_provider_utils.LazySchema<{
    vectorStoreIds: string[];
    maxNumResults?: number | undefined;
    ranking?: {
        ranker?: string | undefined;
        scoreThreshold?: number | undefined;
    } | undefined;
    filters?: any;
}>;
declare const fileSearchOutputSchema: _ai_sdk_provider_utils.LazySchema<{
    queries: string[];
    results: {
        attributes: Record<string, unknown>;
        fileId: string;
        filename: string;
        score: number;
        text: string;
    }[] | null;
}>;
declare const fileSearch: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
    /**
     * The search query to execute.
     */
    queries: string[];
    /**
     * The results of the file search tool call.
     */
    results: null | {
        /**
         * Set of 16 key-value pairs that can be attached to an object.
         * This can be useful for storing additional information about the object
         * in a structured format, and querying for objects via API or the dashboard.
         * Keys are strings with a maximum length of 64 characters.
         * Values are strings with a maximum length of 512 characters, booleans, or numbers.
         */
        attributes: Record<string, unknown>;
        /**
         * The unique ID of the file.
         */
        fileId: string;
        /**
         * The name of the file.
         */
        filename: string;
        /**
         * The relevance score of the file - a value between 0 and 1.
         */
        score: number;
        /**
         * The text that was retrieved from the file.
         */
        text: string;
    }[];
}, {
    /**
     * List of vector store IDs to search through.
     */
    vectorStoreIds: string[];
    /**
     * Maximum number of search results to return. Defaults to 10.
     */
    maxNumResults?: number;
    /**
     * Ranking options for the search.
     */
    ranking?: {
        /**
         * The ranker to use for the file search.
         */
        ranker?: string;
        /**
         * The score threshold for the file search, a number between 0 and 1.
         * Numbers closer to 1 will attempt to return only the most relevant results,
         * but may return fewer results.
         */
        scoreThreshold?: number;
    };
    /**
     * A filter to apply.
     */
    filters?: OpenAIResponsesFileSearchToolComparisonFilter | OpenAIResponsesFileSearchToolCompoundFilter;
}>;

declare const imageGenerationArgsSchema: _ai_sdk_provider_utils.LazySchema<{
    background?: "auto" | "transparent" | "opaque" | undefined;
    inputFidelity?: "low" | "high" | undefined;
    inputImageMask?: {
        fileId?: string | undefined;
        imageUrl?: string | undefined;
    } | undefined;
    model?: string | undefined;
    moderation?: "auto" | undefined;
    outputCompression?: number | undefined;
    outputFormat?: "png" | "jpeg" | "webp" | undefined;
    partialImages?: number | undefined;
    quality?: "auto" | "low" | "medium" | "high" | undefined;
    size?: "auto" | "1024x1024" | "1024x1536" | "1536x1024" | undefined;
}>;
declare const imageGenerationOutputSchema: _ai_sdk_provider_utils.LazySchema<{
    result: string;
}>;
type ImageGenerationArgs = {
    /**
     * Background type for the generated image. Default is 'auto'.
     */
    background?: 'auto' | 'opaque' | 'transparent';
    /**
     * Input fidelity for the generated image. Default is 'low'.
     */
    inputFidelity?: 'low' | 'high';
    /**
     * Optional mask for inpainting.
     * Contains image_url (string, optional) and file_id (string, optional).
     */
    inputImageMask?: {
        /**
         * File ID for the mask image.
         */
        fileId?: string;
        /**
         * Base64-encoded mask image.
         */
        imageUrl?: string;
    };
    /**
     * The image generation model to use. Default: gpt-image-1.
     */
    model?: string;
    /**
     * Moderation level for the generated image. Default: auto.
     */
    moderation?: 'auto';
    /**
     * Compression level for the output image. Default: 100.
     */
    outputCompression?: number;
    /**
     * The output format of the generated image. One of png, webp, or jpeg.
     * Default: png
     */
    outputFormat?: 'png' | 'jpeg' | 'webp';
    /**
     * Number of partial images to generate in streaming mode, from 0 (default value) to 3.
     */
    partialImages?: number;
    /**
     * The quality of the generated image.
     * One of low, medium, high, or auto. Default: auto.
     */
    quality?: 'auto' | 'low' | 'medium' | 'high';
    /**
     * The size of the generated image.
     * One of 1024x1024, 1024x1536, 1536x1024, or auto.
     * Default: auto.
     */
    size?: 'auto' | '1024x1024' | '1024x1536' | '1536x1024';
};
declare const imageGeneration: (args?: ImageGenerationArgs) => _ai_sdk_provider_utils.Tool<{}, {
    /**
     * The generated image encoded in base64.
     */
    result: string;
}>;

declare const webSearchPreviewArgsSchema: _ai_sdk_provider_utils.LazySchema<{
    searchContextSize?: "low" | "medium" | "high" | undefined;
    userLocation?: {
        type: "approximate";
        country?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        timezone?: string | undefined;
    } | undefined;
}>;
declare const webSearchPreviewInputSchema: _ai_sdk_provider_utils.LazySchema<Record<string, never>>;
declare const webSearchPreview: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{}, {
    /**
     * An object describing the specific action taken in this web search call.
     * Includes details on how the model used the web (search, open_page, find_in_page).
     */
    action?: {
        /**
         * Action type "search" - Performs a web search query.
         */
        type: "search";
        /**
         * The search query.
         */
        query?: string;
    } | {
        /**
         * Action type "openPage" - Opens a specific URL from search results.
         */
        type: "openPage";
        /**
         * The URL opened by the model.
         */
        url?: string | null;
    } | {
        /**
         * Action type "findInPage": Searches for a pattern within a loaded page.
         */
        type: "findInPage";
        /**
         * The URL of the page searched for the pattern.
         */
        url?: string | null;
        /**
         * The pattern or text to search for within the page.
         */
        pattern?: string | null;
    };
}, {
    /**
     * Search context size to use for the web search.
     * - high: Most comprehensive context, highest cost, slower response
     * - medium: Balanced context, cost, and latency (default)
     * - low: Least context, lowest cost, fastest response
     */
    searchContextSize?: "low" | "medium" | "high";
    /**
     * User location information to provide geographically relevant search results.
     */
    userLocation?: {
        /**
         * Type of location (always 'approximate')
         */
        type: "approximate";
        /**
         * Two-letter ISO country code (e.g., 'US', 'GB')
         */
        country?: string;
        /**
         * City name (free text, e.g., 'Minneapolis')
         */
        city?: string;
        /**
         * Region name (free text, e.g., 'Minnesota')
         */
        region?: string;
        /**
         * IANA timezone (e.g., 'America/Chicago')
         */
        timezone?: string;
    };
}>;

export { type ApplyPatchOperation, OpenAIChatLanguageModel, type OpenAIChatModelId, OpenAICompletionLanguageModel, type OpenAICompletionModelId, OpenAIEmbeddingModel, type OpenAIEmbeddingModelId, type OpenAIEmbeddingModelOptions, OpenAIImageModel, type OpenAIImageModelId, type OpenAILanguageModelChatOptions, type OpenAILanguageModelCompletionOptions, OpenAIResponsesLanguageModel, OpenAISpeechModel, type OpenAISpeechModelId, type OpenAISpeechModelOptions, type OpenAITranscriptionCallOptions, OpenAITranscriptionModel, type OpenAITranscriptionModelId, type OpenAITranscriptionModelOptions, type OpenaiResponsesProviderMetadata, type OpenaiResponsesReasoningProviderMetadata, type OpenaiResponsesSourceDocumentProviderMetadata, type OpenaiResponsesTextProviderMetadata, type ResponsesProviderMetadata, type ResponsesReasoningProviderMetadata, type ResponsesSourceDocumentProviderMetadata, type ResponsesTextProviderMetadata, applyPatch, applyPatchArgsSchema, applyPatchInputSchema, applyPatchOutputSchema, applyPatchToolFactory, codeInterpreter, codeInterpreterArgsSchema, codeInterpreterInputSchema, codeInterpreterOutputSchema, codeInterpreterToolFactory, fileSearch, fileSearchArgsSchema, fileSearchOutputSchema, hasDefaultResponseFormat, imageGeneration, imageGenerationArgsSchema, imageGenerationOutputSchema, modelMaxImagesPerCall, openAITranscriptionModelOptions, openaiEmbeddingModelOptions, openaiLanguageModelChatOptions, openaiLanguageModelCompletionOptions, openaiSpeechModelOptionsSchema, webSearchPreview, webSearchPreviewArgsSchema, webSearchPreviewInputSchema };
