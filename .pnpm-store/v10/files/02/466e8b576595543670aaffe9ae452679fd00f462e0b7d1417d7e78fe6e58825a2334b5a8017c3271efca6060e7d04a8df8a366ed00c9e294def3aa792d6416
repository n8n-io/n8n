import { SystemModelMessage, ModelMessage, Tool } from '@ai-sdk/provider-utils';
export { convertAsyncIteratorToReadableStream } from '@ai-sdk/provider-utils';
import { LanguageModelV3Prompt, LanguageModelV3Usage, JSONObject, LanguageModelV3FunctionTool, LanguageModelV3ProviderTool, LanguageModelV3ToolChoice } from '@ai-sdk/provider';

/**
 * Experimental. Can change in patch versions without warning.
 *
 * Download function. Called with the array of URLs and a boolean indicating
 * whether the URL is supported by the model.
 *
 * The download function can decide for each URL:
 * - to return null (which means that the URL should be passed to the model)
 * - to download the asset and return the data (incl. retries, authentication, etc.)
 *
 * Should throw DownloadError if the download fails.
 *
 * Should return an array of objects sorted by the order of the requested downloads.
 * For each object, the data should be a Uint8Array if the URL was downloaded.
 * For each object, the mediaType should be the media type of the downloaded asset.
 * For each object, the data should be null if the URL should be passed through as is.
 */
type DownloadFunction = (options: Array<{
    url: URL;
    isUrlSupportedByModel: boolean;
}>) => PromiseLike<Array<{
    data: Uint8Array;
    mediaType: string | undefined;
} | null>>;

/**
 * Prompt part of the AI function options.
 * It contains a system message, a simple text prompt, or a list of messages.
 */
type Prompt = {
    /**
     * System message to include in the prompt. Can be used with `prompt` or `messages`.
     */
    system?: string | SystemModelMessage | Array<SystemModelMessage>;
} & ({
    /**
     * A prompt. It can be either a text prompt or a list of messages.
     *
     * You can either use `prompt` or `messages` but not both.
     */
    prompt: string | Array<ModelMessage>;
    /**
     * A list of messages.
     *
     * You can either use `prompt` or `messages` but not both.
     */
    messages?: never;
} | {
    /**
     * A list of messages.
     *
     * You can either use `prompt` or `messages` but not both.
     */
    messages: Array<ModelMessage>;
    /**
     * A prompt. It can be either a text prompt or a list of messages.
     *
     * You can either use `prompt` or `messages` but not both.
     */
    prompt?: never;
});

type StandardizedPrompt = {
    /**
     * System message.
     */
    system?: string | SystemModelMessage | Array<SystemModelMessage>;
    /**
     * Messages.
     */
    messages: ModelMessage[];
};
declare function standardizePrompt(prompt: Prompt): Promise<StandardizedPrompt>;

declare function convertToLanguageModelPrompt({ prompt, supportedUrls, download, }: {
    prompt: StandardizedPrompt;
    supportedUrls: Record<string, RegExp[]>;
    download: DownloadFunction | undefined;
}): Promise<LanguageModelV3Prompt>;

/**
 * Timeout configuration for API calls. Can be specified as:
 * - A number representing milliseconds
 * - An object with `totalMs` property for the total timeout in milliseconds
 * - An object with `stepMs` property for the timeout of each step in milliseconds
 * - An object with `chunkMs` property for the timeout between stream chunks (streaming only)
 */
type TimeoutConfiguration = number | {
    totalMs?: number;
    stepMs?: number;
    chunkMs?: number;
};
type CallSettings = {
    /**
     * Maximum number of tokens to generate.
     */
    maxOutputTokens?: number;
    /**
     * Temperature setting. The range depends on the provider and model.
     *
     * It is recommended to set either `temperature` or `topP`, but not both.
     */
    temperature?: number;
    /**
     * Nucleus sampling. This is a number between 0 and 1.
     *
     * E.g. 0.1 would mean that only tokens with the top 10% probability mass
     * are considered.
     *
     * It is recommended to set either `temperature` or `topP`, but not both.
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
     *
     * The presence penalty is a number between -1 (increase repetition)
     * and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    presencePenalty?: number;
    /**
     * Frequency penalty setting. It affects the likelihood of the model
     * to repeatedly use the same words or phrases.
     *
     * The frequency penalty is a number between -1 (increase repetition)
     * and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    frequencyPenalty?: number;
    /**
     * Stop sequences.
     * If set, the model will stop generating text when one of the stop sequences is generated.
     * Providers may have limits on the number of stop sequences.
     */
    stopSequences?: string[];
    /**
     * The seed (integer) to use for random sampling. If set and supported
     * by the model, calls will generate deterministic results.
     */
    seed?: number;
    /**
     * Maximum number of retries. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Timeout in milliseconds. The call will be aborted if it takes longer
     * than the specified timeout. Can be used alongside abortSignal.
     *
     * Can be specified as a number (milliseconds) or as an object with `totalMs`.
     */
    timeout?: TimeoutConfiguration;
    /**
     * Additional HTTP headers to be sent with the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

declare global {
    /**
     * Global interface that can be augmented by third-party packages to register custom model IDs.
     *
     * You can register model IDs in two ways:
     *
     * 1. Register based on Model IDs from a provider package:
     * @example
     * ```typescript
     * import { openai } from '@ai-sdk/openai';
     * type OpenAIResponsesModelId = Parameters<typeof openai>[0];
     *
     * declare global {
     *   interface RegisteredProviderModels {
     *     openai: OpenAIResponsesModelId;
     *   }
     * }
     * ```
     *
     * 2. Register individual model IDs directly as keys:
     * @example
     * ```typescript
     * declare global {
     *   interface RegisteredProviderModels {
     *     'my-provider:my-model': any;
     *     'my-provider:another-model': any;
     *   }
     * }
     * ```
     */
    interface RegisteredProviderModels {
    }
}
/**
 * Tool choice for the generation. It supports the following settings:
 *
 * - `auto` (default): the model can choose whether and which tools to call.
 * - `required`: the model must call a tool. It can choose which tool to call.
 * - `none`: the model must not call tools
 * - `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool
 */
type ToolChoice<TOOLS extends Record<string, unknown>> = 'auto' | 'none' | 'required' | {
    type: 'tool';
    toolName: Extract<keyof TOOLS, string>;
};

/**
 * Represents the number of tokens used in a prompt and completion.
 */
type LanguageModelUsage = {
    /**
     * The total number of input (prompt) tokens used.
     */
    inputTokens: number | undefined;
    /**
     * Detailed information about the input tokens.
     */
    inputTokenDetails: {
        /**
         * The number of non-cached input (prompt) tokens used.
         */
        noCacheTokens: number | undefined;
        /**
         * The number of cached input (prompt) tokens read.
         */
        cacheReadTokens: number | undefined;
        /**
         * The number of cached input (prompt) tokens written.
         */
        cacheWriteTokens: number | undefined;
    };
    /**
     * The number of total output (completion) tokens used.
     */
    outputTokens: number | undefined;
    /**
     * Detailed information about the output tokens.
     */
    outputTokenDetails: {
        /**
         * The number of text tokens used.
         */
        textTokens: number | undefined;
        /**
         * The number of reasoning tokens used.
         */
        reasoningTokens: number | undefined;
    };
    /**
     * The total number of tokens used.
     */
    totalTokens: number | undefined;
    /**
     * @deprecated Use outputTokenDetails.reasoningTokens instead.
     */
    reasoningTokens?: number | undefined;
    /**
     * @deprecated Use inputTokenDetails.cacheReadTokens instead.
     */
    cachedInputTokens?: number | undefined;
    /**
     * Raw usage information from the provider.
     *
     * This is the usage information in the shape that the provider returns.
     * It can include additional information that is not part of the standard usage information.
     */
    raw?: JSONObject;
};
declare function asLanguageModelUsage(usage: LanguageModelV3Usage): LanguageModelUsage;

type ToolSet = Record<string, (Tool<never, never> | Tool<any, any> | Tool<any, never> | Tool<never, any>) & Pick<Tool<any, any>, 'execute' | 'onInputAvailable' | 'onInputStart' | 'onInputDelta' | 'needsApproval'>>;

declare function prepareToolsAndToolChoice<TOOLS extends ToolSet>({ tools, toolChoice, activeTools, }: {
    tools: TOOLS | undefined;
    toolChoice: ToolChoice<TOOLS> | undefined;
    activeTools: Array<keyof TOOLS> | undefined;
}): Promise<{
    tools: Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool> | undefined;
    toolChoice: LanguageModelV3ToolChoice | undefined;
}>;

/**
 * Validates call settings and returns a new object with limited values.
 */
declare function prepareCallSettings({ maxOutputTokens, temperature, topP, topK, presencePenalty, frequencyPenalty, seed, stopSequences, }: Omit<CallSettings, 'abortSignal' | 'headers' | 'maxRetries'>): Omit<CallSettings, 'abortSignal' | 'headers' | 'maxRetries'>;

type RetryFunction = <OUTPUT>(fn: () => PromiseLike<OUTPUT>) => PromiseLike<OUTPUT>;

/**
 * Validate and prepare retries.
 */
declare function prepareRetries({ maxRetries, abortSignal, }: {
    maxRetries: number | undefined;
    abortSignal: AbortSignal | undefined;
}): {
    maxRetries: number;
    retry: RetryFunction;
};

export { asLanguageModelUsage, convertToLanguageModelPrompt, prepareCallSettings, prepareRetries, prepareToolsAndToolChoice, standardizePrompt };
