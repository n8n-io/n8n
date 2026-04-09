import { GatewayModelId } from '@ai-sdk/gateway';
export { GatewayModelId, createGateway, gateway } from '@ai-sdk/gateway';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { Tool, InferToolInput, InferToolOutput, FlexibleSchema, InferSchema, SystemModelMessage, ModelMessage, AssistantModelMessage, ToolModelMessage, ReasoningPart, ProviderOptions, UserModelMessage, IdGenerator, ToolCall, MaybePromiseLike, TextPart, FilePart, Resolvable, FetchFunction, DataContent } from '@ai-sdk/provider-utils';
export { AssistantContent, AssistantModelMessage, DataContent, DownloadError, FilePart, FlexibleSchema, IdGenerator, ImagePart, InferSchema, InferToolInput, InferToolOutput, ModelMessage, Schema, SystemModelMessage, TextPart, Tool, ToolApprovalRequest, ToolApprovalResponse, ToolCallOptions, ToolCallPart, ToolContent, ToolExecuteFunction, ToolExecutionOptions, ToolModelMessage, ToolResultPart, UserContent, UserModelMessage, asSchema, createIdGenerator, dynamicTool, generateId, jsonSchema, parseJsonEventStream, tool, zodSchema } from '@ai-sdk/provider-utils';
import * as _ai_sdk_provider from '@ai-sdk/provider';
import { EmbeddingModelV3, EmbeddingModelV2, EmbeddingModelV3Embedding, EmbeddingModelV3Middleware, ImageModelV3, ImageModelV2, ImageModelV3ProviderMetadata, ImageModelV2ProviderMetadata, ImageModelV3Middleware, JSONValue as JSONValue$1, LanguageModelV3, LanguageModelV2, SharedV3Warning, LanguageModelV3Source, LanguageModelV3Middleware, RerankingModelV3, SharedV3ProviderMetadata, SpeechModelV3, SpeechModelV2, TranscriptionModelV3, TranscriptionModelV2, JSONObject, ImageModelV3Usage, LanguageModelV3ToolChoice, AISDKError, LanguageModelV3ToolCall, JSONSchema7, LanguageModelV3CallOptions, JSONParseError, TypeValidationError, Experimental_VideoModelV3, EmbeddingModelV3CallOptions, ProviderV3, ProviderV2, NoSuchModelError } from '@ai-sdk/provider';
export { AISDKError, APICallError, EmptyResponseBodyError, InvalidPromptError, InvalidResponseDataError, JSONParseError, JSONSchema7, LoadAPIKeyError, LoadSettingError, NoContentGeneratedError, NoSuchModelError, TooManyEmbeddingValuesForCallError, TypeValidationError, UnsupportedFunctionalityError } from '@ai-sdk/provider';
import { AttributeValue, Tracer } from '@opentelemetry/api';
import { ServerResponse } from 'node:http';
import { ServerResponse as ServerResponse$1 } from 'http';
import { z } from 'zod/v4';

/**
 * Embedding model that is used by the AI SDK.
 */
type EmbeddingModel = string | EmbeddingModelV3 | EmbeddingModelV2<string>;
/**
 * Embedding.
 */
type Embedding = EmbeddingModelV3Embedding;

type EmbeddingModelMiddleware = EmbeddingModelV3Middleware;

/**
 * Image model that is used by the AI SDK.
 */
type ImageModel = string | ImageModelV3 | ImageModelV2;
/**
 * Metadata from the model provider for this call.
 */
type ImageModelProviderMetadata = ImageModelV3ProviderMetadata | ImageModelV2ProviderMetadata;

type ImageModelMiddleware = ImageModelV3Middleware;

type ImageModelResponseMetadata = {
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
    headers?: Record<string, string>;
};

type JSONValue = JSONValue$1;

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
 * Global provider model ID type that defaults to GatewayModelId but can be augmented
 * by third-party packages via declaration merging.
 */
type GlobalProviderModelId = [keyof RegisteredProviderModels] extends [
    never
] ? GatewayModelId : keyof RegisteredProviderModels | RegisteredProviderModels[keyof RegisteredProviderModels];
/**
 * Language model that is used by the AI SDK.
 */
type LanguageModel = GlobalProviderModelId | LanguageModelV3 | LanguageModelV2;
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
 */
type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';
/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type CallWarning = SharedV3Warning;
/**
 * A source that has been used as input to generate the response.
 */
type Source = LanguageModelV3Source;
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

type LanguageModelMiddleware = LanguageModelV3Middleware;

type LanguageModelRequestMetadata = {
    /**
     * Request HTTP body that was sent to the provider API.
     */
    body?: unknown;
};

type LanguageModelResponseMetadata = {
    /**
     * ID for the generated response.
     */
    id: string;
    /**
     * Timestamp for the start of the generated response.
     */
    timestamp: Date;
    /**
     * The ID of the response model that was used to generate the response.
     */
    modelId: string;
    /**
     * Response headers (available only for providers that use HTTP requests).
     */
    headers?: Record<string, string>;
};

/**
 * Reranking model that is used by the AI SDK.
 */
type RerankingModel = RerankingModelV3;

/**
 * Provider for language, text embedding, and image models.
 */
type Provider = {
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
    languageModel(modelId: string): LanguageModel;
    /**
     * Returns the text embedding model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {EmbeddingModel} The embedding model associated with the id
     *
     * @throws {NoSuchModelError} If no such model exists.
     */
    embeddingModel(modelId: string): EmbeddingModel;
    /**
     * Returns the image model with the given id.
     * The model id is then passed to the provider function to get the model.
     *
     * @param {string} modelId - The id of the model to return.
     *
     * @returns {ImageModel} The image model associated with the id
     */
    imageModel(modelId: string): ImageModel;
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
    rerankingModel(modelId: string): RerankingModel;
};

/**
 * Additional provider-specific metadata that is returned from the provider.
 *
 * This is needed to enable provider-specific functionality that can be
 * fully encapsulated in the provider.
 */
type ProviderMetadata = SharedV3ProviderMetadata;

/**
 * Speech model that is used by the AI SDK.
 */
type SpeechModel = string | SpeechModelV3 | SpeechModelV2;

type SpeechModelResponseMetadata = {
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
    headers?: Record<string, string>;
    /**
     * Response body.
     */
    body?: unknown;
};

/**
 * Transcription model that is used by the AI SDK.
 */
type TranscriptionModel = string | TranscriptionModelV3 | TranscriptionModelV2;

type TranscriptionModelResponseMetadata = {
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
    headers?: Record<string, string>;
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
/**
 * Represents the number of tokens used in an embedding.
 */
type EmbeddingModelUsage = {
    /**
     * The number of tokens used in the embedding.
     */
    tokens: number;
};
/**
 * Usage information for an image model call.
 */
type ImageModelUsage = ImageModelV3Usage;

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
type Warning = SharedV3Warning;

/**
 * A generated file.
 */
interface GeneratedFile {
    /**
     * File as a base64 encoded string.
     */
    readonly base64: string;
    /**
     * File as a Uint8Array.
     */
    readonly uint8Array: Uint8Array;
    /**
     * The IANA media type of the file.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    readonly mediaType: string;
}
declare class DefaultGeneratedFile implements GeneratedFile {
    private base64Data;
    private uint8ArrayData;
    readonly mediaType: string;
    constructor({ data, mediaType, }: {
        data: string | Uint8Array;
        mediaType: string;
    });
    get base64(): string;
    get uint8Array(): Uint8Array<ArrayBufferLike>;
}

/**
 * Create a union of the given object's values, and optionally specify which keys to get the values from.
 *
 * Please upvote [this issue](https://github.com/microsoft/TypeScript/issues/31438) if you want to have this type as a built-in in TypeScript.
 *
 * @example
 * ```
 * // data.json
 * {
 * 	'foo': 1,
 * 	'bar': 2,
 * 	'biz': 3
 * }
 *
 * // main.ts
 * import type {ValueOf} from 'type-fest';
 * import data = require('./data.json');
 *
 * export function getData(name: string): ValueOf<typeof data> {
 * 	return data[name];
 * }
 *
 * export function onlyBar(name: string): ValueOf<typeof data, 'bar'> {
 * 	return data[name];
 * }
 *
 * // file.ts
 * import {getData, onlyBar} from './main';
 *
 * getData('foo');
 * //=> 1
 *
 * onlyBar('foo');
 * //=> TypeError ...
 *
 * onlyBar('bar');
 * //=> 2
 * ```
 * @see https://github.com/sindresorhus/type-fest/blob/main/source/value-of.d.ts
 */
type ValueOf<ObjectType, ValueType extends keyof ObjectType = keyof ObjectType> = ObjectType[ValueType];

type ToolSet = Record<string, (Tool<never, never> | Tool<any, any> | Tool<any, never> | Tool<never, any>) & Pick<Tool<any, any>, 'execute' | 'onInputAvailable' | 'onInputStart' | 'onInputDelta' | 'needsApproval'>>;

type BaseToolCall = {
    type: 'tool-call';
    toolCallId: string;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
};
type StaticToolCall<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: BaseToolCall & {
        toolName: NAME & string;
        input: TOOLS[NAME] extends Tool<infer PARAMETERS> ? PARAMETERS : never;
        dynamic?: false | undefined;
        invalid?: false | undefined;
        error?: never;
        title?: string;
    };
}>;
type DynamicToolCall = BaseToolCall & {
    toolName: string;
    input: unknown;
    dynamic: true;
    title?: string;
    /**
     * True if this is caused by an unparsable tool call or
     * a tool that does not exist.
     */
    invalid?: boolean;
    /**
     * The error that caused the tool call to be invalid.
     */
    error?: unknown;
};
type TypedToolCall<TOOLS extends ToolSet> = StaticToolCall<TOOLS> | DynamicToolCall;

/**
 * Output part that indicates that a tool approval request has been made.
 *
 * The tool approval request can be approved or denied in the next tool message.
 */
type ToolApprovalRequestOutput<TOOLS extends ToolSet> = {
    type: 'tool-approval-request';
    /**
     * ID of the tool approval request.
     */
    approvalId: string;
    /**
     * Tool call that the approval request is for.
     */
    toolCall: TypedToolCall<TOOLS>;
};

/**
 * Reasoning output of a text generation. It contains a reasoning.
 */
interface ReasoningOutput {
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
    providerMetadata?: ProviderMetadata;
}

type StaticToolError<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-error';
        toolCallId: string;
        toolName: NAME & string;
        input: InferToolInput<TOOLS[NAME]>;
        error: unknown;
        providerExecuted?: boolean;
        providerMetadata?: ProviderMetadata;
        dynamic?: false | undefined;
        title?: string;
    };
}>;
type DynamicToolError = {
    type: 'tool-error';
    toolCallId: string;
    toolName: string;
    input: unknown;
    error: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic: true;
    title?: string;
};
type TypedToolError<TOOLS extends ToolSet> = StaticToolError<TOOLS> | DynamicToolError;

type StaticToolResult<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-result';
        toolCallId: string;
        toolName: NAME & string;
        input: InferToolInput<TOOLS[NAME]>;
        output: InferToolOutput<TOOLS[NAME]>;
        providerExecuted?: boolean;
        providerMetadata?: ProviderMetadata;
        dynamic?: false | undefined;
        preliminary?: boolean;
        title?: string;
    };
}>;
type DynamicToolResult = {
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    input: unknown;
    output: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic: true;
    preliminary?: boolean;
    title?: string;
};
type TypedToolResult<TOOLS extends ToolSet> = StaticToolResult<TOOLS> | DynamicToolResult;

type ContentPart<TOOLS extends ToolSet> = {
    type: 'text';
    text: string;
    providerMetadata?: ProviderMetadata;
} | ReasoningOutput | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS> & {
    providerMetadata?: ProviderMetadata;
}) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS> & {
    providerMetadata?: ProviderMetadata;
}) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS> & {
    providerMetadata?: ProviderMetadata;
}) | ToolApprovalRequestOutput<TOOLS>;

/**
 * Create a type from an object with all keys and nested keys set to optional.
 * The helper supports normal objects and schemas (which are resolved automatically).
 * It always recurses into arrays.
 *
 * Adopted from [type-fest](https://github.com/sindresorhus/type-fest/tree/main) PartialDeep.
 */
type DeepPartial<T> = T extends FlexibleSchema ? DeepPartialInternal<InferSchema<T>> : DeepPartialInternal<T>;
type DeepPartialInternal<T> = T extends null | undefined | string | number | boolean | symbol | bigint | void | Date | RegExp | ((...arguments_: any[]) => unknown) | (new (...arguments_: any[]) => unknown) ? T : T extends Map<infer KeyType, infer ValueType> ? PartialMap<KeyType, ValueType> : T extends Set<infer ItemType> ? PartialSet<ItemType> : T extends ReadonlyMap<infer KeyType, infer ValueType> ? PartialReadonlyMap<KeyType, ValueType> : T extends ReadonlySet<infer ItemType> ? PartialReadonlySet<ItemType> : T extends object ? T extends ReadonlyArray<infer ItemType> ? ItemType[] extends T ? readonly ItemType[] extends T ? ReadonlyArray<DeepPartialInternal<ItemType | undefined>> : Array<DeepPartialInternal<ItemType | undefined>> : PartialObject<T> : PartialObject<T> : unknown;
type PartialMap<KeyType, ValueType> = {} & Map<DeepPartialInternal<KeyType>, DeepPartialInternal<ValueType>>;
type PartialSet<T> = {} & Set<DeepPartialInternal<T>>;
type PartialReadonlyMap<KeyType, ValueType> = {} & ReadonlyMap<DeepPartialInternal<KeyType>, DeepPartialInternal<ValueType>>;
type PartialReadonlySet<T> = {} & ReadonlySet<DeepPartialInternal<T>>;
type PartialObject<ObjectType extends object> = {
    [KeyType in keyof ObjectType]?: DeepPartialInternal<ObjectType[KeyType]>;
};

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

/**
 * A message that was generated during the generation process.
 * It can be either an assistant message or a tool message.
 */
type ResponseMessage = AssistantModelMessage | ToolModelMessage;

/**
 * The result of a single step in the generation process.
 */
type StepResult<TOOLS extends ToolSet> = {
    /**
     * Zero-based index of this step.
     */
    readonly stepNumber: number;
    /**
     * Information about the model that produced this step.
     */
    readonly model: {
        /** The provider of the model. */
        readonly provider: string;
        /** The ID of the model. */
        readonly modelId: string;
    };
    /**
     * Identifier from telemetry settings for grouping related operations.
     */
    readonly functionId: string | undefined;
    /**
     * Additional metadata from telemetry settings.
     */
    readonly metadata: Record<string, unknown> | undefined;
    /**
     * User-defined context object flowing through the generation.
     *
     * Experimental (can break in patch releases).
     */
    readonly experimental_context: unknown;
    /**
     * The content that was generated in the last step.
     */
    readonly content: Array<ContentPart<TOOLS>>;
    /**
     * The generated text.
     */
    readonly text: string;
    /**
     * The reasoning that was generated during the generation.
     */
    readonly reasoning: Array<ReasoningPart>;
    /**
     * The reasoning text that was generated during the generation.
     */
    readonly reasoningText: string | undefined;
    /**
     * The files that were generated during the generation.
     */
    readonly files: Array<GeneratedFile>;
    /**
     * The sources that were used to generate the text.
     */
    readonly sources: Array<Source>;
    /**
     * The tool calls that were made during the generation.
     */
    readonly toolCalls: Array<TypedToolCall<TOOLS>>;
    /**
     * The static tool calls that were made in the last step.
     */
    readonly staticToolCalls: Array<StaticToolCall<TOOLS>>;
    /**
     * The dynamic tool calls that were made in the last step.
     */
    readonly dynamicToolCalls: Array<DynamicToolCall>;
    /**
     * The results of the tool calls.
     */
    readonly toolResults: Array<TypedToolResult<TOOLS>>;
    /**
     * The static tool results that were made in the last step.
     */
    readonly staticToolResults: Array<StaticToolResult<TOOLS>>;
    /**
     * The dynamic tool results that were made in the last step.
     */
    readonly dynamicToolResults: Array<DynamicToolResult>;
    /**
     * The unified reason why the generation finished.
     */
    readonly finishReason: FinishReason;
    /**
     * The raw reason why the generation finished (from the provider).
     */
    readonly rawFinishReason: string | undefined;
    /**
     * The token usage of the generated text.
     */
    readonly usage: LanguageModelUsage;
    /**
     * Warnings from the model provider (e.g. unsupported settings).
     */
    readonly warnings: CallWarning[] | undefined;
    /**
     * Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
     * Additional response information.
     */
    readonly response: LanguageModelResponseMetadata & {
        /**
         * The response messages that were generated during the call.
         * Response messages can be either assistant messages or tool messages.
         * They contain a generated id.
         */
        readonly messages: Array<ResponseMessage>;
        /**
         * Response body (available only for providers that use HTTP requests).
         */
        body?: unknown;
    };
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
};

type StopCondition<TOOLS extends ToolSet> = (options: {
    steps: Array<StepResult<TOOLS>>;
}) => PromiseLike<boolean> | boolean;
declare function stepCountIs(stepCount: number): StopCondition<any>;
declare function hasToolCall(toolName: string): StopCondition<any>;

/**
 * Common model information used across callback events.
 */
interface CallbackModelInfo {
    /** The provider identifier (e.g., 'openai', 'anthropic'). */
    readonly provider: string;
    /** The specific model identifier (e.g., 'gpt-4o'). */
    readonly modelId: string;
}
/**
 * Event passed to the `onStart` callback.
 *
 * Called when the generation operation begins, before any LLM calls.
 */
interface OnStartEvent<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output, INCLUDE = {
    requestBody?: boolean;
    responseBody?: boolean;
}> {
    /** The model being used for generation. */
    readonly model: CallbackModelInfo;
    /** The system message(s) provided to the model. */
    readonly system: string | SystemModelMessage | Array<SystemModelMessage> | undefined;
    /** The prompt string or array of messages if using the prompt option. */
    readonly prompt: string | Array<ModelMessage> | undefined;
    /** The messages array if using the messages option. */
    readonly messages: Array<ModelMessage> | undefined;
    /** The tools available for this generation. */
    readonly tools: TOOLS | undefined;
    /** The tool choice strategy for this generation. */
    readonly toolChoice: ToolChoice<NoInfer<TOOLS>> | undefined;
    /** Limits which tools are available for the model to call. */
    readonly activeTools: Array<keyof TOOLS> | undefined;
    /** Maximum number of tokens to generate. */
    readonly maxOutputTokens: number | undefined;
    /** Sampling temperature for generation. */
    readonly temperature: number | undefined;
    /** Top-p (nucleus) sampling parameter. */
    readonly topP: number | undefined;
    /** Top-k sampling parameter. */
    readonly topK: number | undefined;
    /** Presence penalty for generation. */
    readonly presencePenalty: number | undefined;
    /** Frequency penalty for generation. */
    readonly frequencyPenalty: number | undefined;
    /** Sequences that will stop generation. */
    readonly stopSequences: string[] | undefined;
    /** Random seed for reproducible generation. */
    readonly seed: number | undefined;
    /** Maximum number of retries for failed requests. */
    readonly maxRetries: number;
    /**
     * Timeout configuration for the generation.
     * Can be a number (milliseconds) or an object with totalMs, stepMs, chunkMs.
     */
    readonly timeout: TimeoutConfiguration | undefined;
    /** Additional HTTP headers sent with the request. */
    readonly headers: Record<string, string | undefined> | undefined;
    /** Additional provider-specific options. */
    readonly providerOptions: ProviderOptions | undefined;
    /**
     * Condition(s) for stopping the generation.
     * When the condition is an array, any of the conditions can be met to stop.
     */
    readonly stopWhen: StopCondition<TOOLS> | Array<StopCondition<TOOLS>> | undefined;
    /** The output specification for structured outputs, if configured. */
    readonly output: OUTPUT | undefined;
    /** Abort signal for cancelling the operation. */
    readonly abortSignal: AbortSignal | undefined;
    /**
     * Settings for controlling what data is included in step results.
     */
    readonly include: INCLUDE | undefined;
    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;
    /** Additional metadata passed to the generation. */
    readonly metadata: Record<string, unknown> | undefined;
    /**
     * User-defined context object that flows through the entire generation lifecycle.
     * Can be accessed and modified in `prepareStep` and tool `execute` functions.
     */
    readonly experimental_context: unknown;
}
/**
 * Event passed to the `onStepStart` callback.
 *
 * Called when a step (LLM call) begins, before the provider is called.
 * Each step represents a single LLM invocation.
 */
interface OnStepStartEvent<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output, INCLUDE = {
    requestBody?: boolean;
    responseBody?: boolean;
}> {
    /** Zero-based index of the current step. */
    readonly stepNumber: number;
    /** The model being used for this step. */
    readonly model: CallbackModelInfo;
    /**
     * The system message for this step.
     */
    readonly system: string | SystemModelMessage | Array<SystemModelMessage> | undefined;
    /**
     * The messages that will be sent to the model for this step.
     * Uses the user-facing `ModelMessage` format.
     * May be overridden by prepareStep.
     */
    readonly messages: Array<ModelMessage>;
    /** The tools available for this generation. */
    readonly tools: TOOLS | undefined;
    /** The tool choice configuration for this step. */
    readonly toolChoice: LanguageModelV3ToolChoice | undefined;
    /** Limits which tools are available for this step. */
    readonly activeTools: Array<keyof TOOLS> | undefined;
    /** Array of results from previous steps (empty for first step). */
    readonly steps: ReadonlyArray<StepResult<TOOLS>>;
    /** Additional provider-specific options for this step. */
    readonly providerOptions: ProviderOptions | undefined;
    /**
     * Timeout configuration for the generation.
     * Can be a number (milliseconds) or an object with totalMs, stepMs, chunkMs.
     */
    readonly timeout: TimeoutConfiguration | undefined;
    /** Additional HTTP headers sent with the request. */
    readonly headers: Record<string, string | undefined> | undefined;
    /**
     * Condition(s) for stopping the generation.
     * When the condition is an array, any of the conditions can be met to stop.
     */
    readonly stopWhen: StopCondition<TOOLS> | Array<StopCondition<TOOLS>> | undefined;
    /** The output specification for structured outputs, if configured. */
    readonly output: OUTPUT | undefined;
    /** Abort signal for cancelling the operation. */
    readonly abortSignal: AbortSignal | undefined;
    /**
     * Settings for controlling what data is included in step results.
     */
    readonly include: INCLUDE | undefined;
    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;
    /** Additional metadata from telemetry settings. */
    readonly metadata: Record<string, unknown> | undefined;
    /**
     * User-defined context object. May be updated from `prepareStep` between steps.
     */
    readonly experimental_context: unknown;
}
/**
 * Event passed to the `onToolCallStart` callback.
 *
 * Called when a tool execution begins, before the tool's `execute` function is invoked.
 */
interface OnToolCallStartEvent<TOOLS extends ToolSet = ToolSet> {
    /** Zero-based index of the current step where this tool call occurs. */
    readonly stepNumber: number | undefined;
    /** The model being used for this step. */
    readonly model: CallbackModelInfo | undefined;
    /** The full tool call object. */
    readonly toolCall: TypedToolCall<TOOLS>;
    /** The conversation messages available at tool execution time. */
    readonly messages: Array<ModelMessage>;
    /** Signal for cancelling the operation. */
    readonly abortSignal: AbortSignal | undefined;
    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;
    /** Additional metadata from telemetry settings. */
    readonly metadata: Record<string, unknown> | undefined;
    /** User-defined context object flowing through the generation. */
    readonly experimental_context: unknown;
}
/**
 * Event passed to the `onToolCallFinish` callback.
 *
 * Called when a tool execution completes, either successfully or with an error.
 * Uses a discriminated union on the `success` field.
 */
type OnToolCallFinishEvent<TOOLS extends ToolSet = ToolSet> = {
    /** Zero-based index of the current step where this tool call occurred. */
    readonly stepNumber: number | undefined;
    /** The model being used for this step. */
    readonly model: CallbackModelInfo | undefined;
    /** The full tool call object. */
    readonly toolCall: TypedToolCall<TOOLS>;
    /** The conversation messages available at tool execution time. */
    readonly messages: Array<ModelMessage>;
    /** Signal for cancelling the operation. */
    readonly abortSignal: AbortSignal | undefined;
    /** Execution time of the tool call in milliseconds. */
    readonly durationMs: number;
    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;
    /** Additional metadata from telemetry settings. */
    readonly metadata: Record<string, unknown> | undefined;
    /** User-defined context object flowing through the generation. */
    readonly experimental_context: unknown;
} & ({
    /** Indicates the tool call succeeded. */
    readonly success: true;
    /** The tool's return value. */
    readonly output: unknown;
    readonly error?: never;
} | {
    /** Indicates the tool call failed. */
    readonly success: false;
    readonly output?: never;
    /** The error that occurred during tool execution. */
    readonly error: unknown;
});
/**
 * Event passed to the `onStepFinish` callback.
 *
 * Called when a step (LLM call) completes.
 * This is simply the StepResult for that step.
 */
type OnStepFinishEvent<TOOLS extends ToolSet = ToolSet> = StepResult<TOOLS>;
/**
 * Event passed to the `onFinish` callback.
 *
 * Called when the entire generation completes (all steps finished).
 * Includes the final step's result along with aggregated data from all steps.
 */
type OnFinishEvent<TOOLS extends ToolSet = ToolSet> = StepResult<TOOLS> & {
    /** Array containing results from all steps in the generation. */
    readonly steps: StepResult<TOOLS>[];
    /** Aggregated token usage across all steps. */
    readonly totalUsage: LanguageModelUsage;
    /**
     * The final state of the user-defined context object.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context: unknown;
    /** Identifier from telemetry settings for grouping related operations. */
    readonly functionId: string | undefined;
    /** Additional metadata from telemetry settings. */
    readonly metadata: Record<string, unknown> | undefined;
};

/**
 * A callback function that can be used to notify listeners.
 */
type Listener<EVENT> = (event: EVENT) => PromiseLike<void> | void;

/**
 * Implement this interface to create custom telemetry integrations.
 * Methods can be sync or return a PromiseLike.
 */
interface TelemetryIntegration {
    onStart?: Listener<OnStartEvent<ToolSet, Output>>;
    onStepStart?: Listener<OnStepStartEvent<ToolSet, Output>>;
    onToolCallStart?: Listener<OnToolCallStartEvent<ToolSet>>;
    onToolCallFinish?: Listener<OnToolCallFinishEvent<ToolSet>>;
    onStepFinish?: Listener<OnStepFinishEvent<ToolSet>>;
    onFinish?: Listener<OnFinishEvent<ToolSet>>;
}

/**
 * Telemetry configuration.
 */
type TelemetrySettings = {
    /**
     * Enable or disable telemetry. Disabled by default while experimental.
     */
    isEnabled?: boolean;
    /**
     * Enable or disable input recording. Enabled by default.
     *
     * You might want to disable input recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordInputs?: boolean;
    /**
     * Enable or disable output recording. Enabled by default.
     *
     * You might want to disable output recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordOutputs?: boolean;
    /**
     * Identifier for this function. Used to group telemetry data by function.
     */
    functionId?: string;
    /**
     * Additional information to include in the telemetry data.
     */
    metadata?: Record<string, AttributeValue>;
    /**
     * A custom tracer to use for the telemetry data.
     */
    tracer?: Tracer;
    /**
     * Per-call telemetry integrations that receive lifecycle events during generation.
     *
     * These integrations run after any globally registered integrations
     * (see `registerTelemetryIntegration`).
     */
    integrations?: TelemetryIntegration | TelemetryIntegration[];
};

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
 * Function that you can use to provide different settings for a step.
 *
 * @param options - The options for the step.
 * @param options.steps - The steps that have been executed so far.
 * @param options.stepNumber - The number of the step that is being executed.
 * @param options.model - The model that is being used.
 * @param options.messages - The messages that will be sent to the model for the current step.
 * @param options.experimental_context - The context passed via the experimental_context setting (experimental).
 *
 * @returns An object that contains the settings for the step.
 * If you return undefined (or for undefined settings), the settings from the outer level will be used.
 */
type PrepareStepFunction<TOOLS extends Record<string, Tool> = Record<string, Tool>> = (options: {
    /**
     * The steps that have been executed so far.
     */
    steps: Array<StepResult<NoInfer<TOOLS>>>;
    /**
     * The number of the step that is being executed.
     */
    stepNumber: number;
    /**
     * The model instance that is being used for this step.
     */
    model: LanguageModel;
    /**
     * The messages that will be sent to the model for the current step.
     */
    messages: Array<ModelMessage>;
    /**
     * The context passed via the experimental_context setting (experimental).
     */
    experimental_context: unknown;
}) => PromiseLike<PrepareStepResult<TOOLS>> | PrepareStepResult<TOOLS>;
/**
 * The result type returned by a {@link PrepareStepFunction},
 * allowing per-step overrides of model, tools, or messages.
 */
type PrepareStepResult<TOOLS extends Record<string, Tool> = Record<string, Tool>> = {
    /**
     * Optionally override which LanguageModel instance is used for this step.
     */
    model?: LanguageModel;
    /**
     * Optionally set which tool the model must call, or provide tool call configuration
     * for this step.
     */
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    /**
     * If provided, only these tools are enabled/available for this step.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Optionally override the system message(s) sent to the model for this step.
     */
    system?: string | SystemModelMessage | Array<SystemModelMessage>;
    /**
     * Optionally override the full set of messages sent to the model
     * for this step.
     */
    messages?: Array<ModelMessage>;
    /**
     * Context that is passed into tool execution. Experimental.
     *
     * Changing the context will affect the context in this step
     * and all subsequent steps.
     */
    experimental_context?: unknown;
    /**
     * Additional provider-specific options for this step.
     *
     * Can be used to pass provider-specific configuration such as
     * container IDs for Anthropic's code execution.
     */
    providerOptions?: ProviderOptions;
} | undefined;

declare const symbol$j: unique symbol;
declare class InvalidToolInputError extends AISDKError {
    private readonly [symbol$j];
    readonly toolName: string;
    readonly toolInput: string;
    constructor({ toolInput, toolName, cause, message, }: {
        message?: string;
        toolInput: string;
        toolName: string;
        cause: unknown;
    });
    static isInstance(error: unknown): error is InvalidToolInputError;
}

declare const symbol$i: unique symbol;
declare class NoSuchToolError extends AISDKError {
    private readonly [symbol$i];
    readonly toolName: string;
    readonly availableTools: string[] | undefined;
    constructor({ toolName, availableTools, message, }: {
        toolName: string;
        availableTools?: string[] | undefined;
        message?: string;
    });
    static isInstance(error: unknown): error is NoSuchToolError;
}

declare const systemModelMessageSchema: z.ZodType<SystemModelMessage>;
declare const userModelMessageSchema: z.ZodType<UserModelMessage>;
declare const assistantModelMessageSchema: z.ZodType<AssistantModelMessage>;
declare const toolModelMessageSchema: z.ZodType<ToolModelMessage>;
declare const modelMessageSchema: z.ZodType<ModelMessage>;

/**
 * A function that attempts to repair a tool call that failed to parse.
 *
 * It receives the error and the context as arguments and returns the repair
 * tool call JSON as text.
 *
 * @param options.system - The system prompt.
 * @param options.messages - The messages in the current generation step.
 * @param options.toolCall - The tool call that failed to parse.
 * @param options.tools - The tools that are available.
 * @param options.inputSchema - A function that returns the JSON Schema for a tool.
 * @param options.error - The error that occurred while parsing the tool call.
 */
type ToolCallRepairFunction<TOOLS extends ToolSet> = (options: {
    system: string | SystemModelMessage | Array<SystemModelMessage> | undefined;
    messages: ModelMessage[];
    toolCall: LanguageModelV3ToolCall;
    tools: TOOLS;
    inputSchema: (options: {
        toolName: string;
    }) => PromiseLike<JSONSchema7>;
    error: NoSuchToolError | InvalidToolInputError;
}) => Promise<LanguageModelV3ToolCall | null>;

/**
 * Include settings for generateText (requestBody and responseBody).
 */
type GenerateTextIncludeSettings = {
    requestBody?: boolean;
    responseBody?: boolean;
};
/**
 * Callback that is set using the `experimental_onStart` option.
 *
 * Called when the generateText operation begins, before any LLM calls.
 * Use this callback for logging, analytics, or initializing state at the
 * start of a generation.
 *
 * @param event - The event object containing generation configuration.
 */
type GenerateTextOnStartCallback<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output> = (event: OnStartEvent<TOOLS, OUTPUT, GenerateTextIncludeSettings>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `experimental_onStepStart` option.
 *
 * Called when a step (LLM call) begins, before the provider is called.
 * Each step represents a single LLM invocation. Multiple steps occur when
 * using tool calls (the model may be called multiple times in a loop).
 *
 * @param event - The event object containing step configuration.
 */
type GenerateTextOnStepStartCallback<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output> = (event: OnStepStartEvent<TOOLS, OUTPUT, GenerateTextIncludeSettings>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `experimental_onToolCallStart` option.
 *
 * Called when a tool execution begins, before the tool's `execute` function is invoked.
 * Use this for logging tool invocations, tracking tool usage, or pre-execution validation.
 *
 * @param event - The event object containing tool call information.
 */
type GenerateTextOnToolCallStartCallback<TOOLS extends ToolSet = ToolSet> = (event: OnToolCallStartEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `experimental_onToolCallFinish` option.
 *
 * Called when a tool execution completes, either successfully or with an error.
 * Use this for logging tool results, tracking execution time, or error handling.
 *
 * The event uses a discriminated union on the `success` field:
 * - When `success: true`: `output` contains the tool result, `error` is never present.
 * - When `success: false`: `error` contains the error, `output` is never present.
 *
 * @param event - The event object containing tool call result information.
 */
type GenerateTextOnToolCallFinishCallback<TOOLS extends ToolSet = ToolSet> = (event: OnToolCallFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `onStepFinish` option.
 *
 * Called when a step (LLM call) completes. The event includes all step result
 * properties (text, tool calls, usage, etc.) along with additional metadata.
 *
 * @param stepResult - The result of the step.
 */
type GenerateTextOnStepFinishCallback<TOOLS extends ToolSet> = (event: OnStepFinishEvent<TOOLS>) => Promise<void> | void;
/**
 * Callback that is set using the `onFinish` option.
 *
 * Called when the entire generation completes (all steps finished).
 * The event includes the final step's result properties along with
 * aggregated data from all steps.
 *
 * @param event - The final result along with aggregated step data.
 */
type GenerateTextOnFinishCallback<TOOLS extends ToolSet> = (event: OnFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Generate a text and call tools for a given prompt using a language model.
 *
 * This function does not stream the output. If you want to stream the output, use `streamText` instead.
 *
 * @param model - The language model to use.
 *
 * @param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.
 * @param toolChoice - The tool choice strategy. Default: 'auto'.
 *
 * @param system - A system message that will be part of the prompt.
 * @param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
 * @param messages - A list of messages. You can either use `prompt` or `messages` but not both.
 *
 * @param maxOutputTokens - Maximum number of tokens to generate.
 * @param temperature - Temperature setting.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topP - Nucleus sampling.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topK - Only sample from the top K options for each subsequent token.
 * Used to remove "long tail" low probability responses.
 * Recommended for advanced use cases only. You usually only need to use temperature.
 * @param presencePenalty - Presence penalty setting.
 * It affects the likelihood of the model to repeat information that is already in the prompt.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param frequencyPenalty - Frequency penalty setting.
 * It affects the likelihood of the model to repeatedly use the same words or phrases.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param stopSequences - Stop sequences.
 * If set, the model will stop generating text when one of the stop sequences is generated.
 * @param seed - The seed (integer) to use for random sampling.
 * If set and supported by the model, calls will generate deterministic results.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param timeout - An optional timeout in milliseconds. The call will be aborted if it takes longer than the specified timeout.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param experimental_context - User-defined context object that flows through the entire generation lifecycle.
 * @param experimental_onStart - Callback invoked when generation begins, before any LLM calls.
 * @param experimental_onStepStart - Callback invoked when each step begins, before the provider is called.
 * Receives step number, messages (in ModelMessage format), tools, and context.
 * @param experimental_onToolCallStart - Callback invoked before each tool execution begins.
 * Receives tool name, call ID, input, and context.
 * @param experimental_onToolCallFinish - Callback invoked after each tool execution completes.
 * Uses a discriminated union: check `success` to determine if `output` or `error` is present.
 * @param onStepFinish - Callback that is called when each step (LLM call) is finished, including intermediate steps.
 * @param onFinish - Callback that is called when all steps are finished and the response is complete.
 *
 * @returns
 * A result object that contains the generated text, the results of the tool calls, and additional information.
 */
declare function generateText<TOOLS extends ToolSet, OUTPUT extends Output = Output<string, string>>({ model: modelArg, tools, toolChoice, system, prompt, messages, maxRetries: maxRetriesArg, abortSignal, timeout, headers, stopWhen, experimental_output, output, experimental_telemetry: telemetry, providerOptions, experimental_activeTools, activeTools, experimental_prepareStep, prepareStep, experimental_repairToolCall: repairToolCall, experimental_download: download, experimental_context, experimental_include: include, _internal: { generateId }, experimental_onStart: onStart, experimental_onStepStart: onStepStart, experimental_onToolCallStart: onToolCallStart, experimental_onToolCallFinish: onToolCallFinish, onStepFinish, onFinish, ...settings }: CallSettings & Prompt & {
    /**
     * The language model to use.
     */
    model: LanguageModel;
    /**
     * The tools that the model can call. The model needs to support calling tools.
     */
    tools?: TOOLS;
    /**
     * The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    /**
     * Condition for stopping the generation when there are tool results in the last step.
     * When the condition is an array, any of the conditions can be met to stop the generation.
     *
     * @default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Limits the tools that are available for the model to call without
     * changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Optional specification for parsing structured outputs from the LLM response.
     */
    output?: OUTPUT;
    /**
     * Optional specification for parsing structured outputs from the LLM response.
     *
     * @deprecated Use `output` instead.
     */
    experimental_output?: OUTPUT;
    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * @deprecated Use `prepareStep` instead.
     */
    experimental_prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
     * Optional function that you can use to provide different settings for a step.
     */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
     * A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<TOOLS>>;
    /**
     * Callback that is called when the generateText operation begins,
     * before any LLM calls are made.
     */
    experimental_onStart?: GenerateTextOnStartCallback<NoInfer<TOOLS>, OUTPUT>;
    /**
     * Callback that is called when a step (LLM call) begins,
     * before the provider is called.
     */
    experimental_onStepStart?: GenerateTextOnStepStartCallback<NoInfer<TOOLS>, OUTPUT>;
    /**
     * Callback that is called right before a tool's execute function runs.
     */
    experimental_onToolCallStart?: GenerateTextOnToolCallStartCallback<NoInfer<TOOLS>>;
    /**
     * Callback that is called right after a tool's execute function completes (or errors).
     */
    experimental_onToolCallFinish?: GenerateTextOnToolCallFinishCallback<NoInfer<TOOLS>>;
    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: GenerateTextOnStepFinishCallback<NoInfer<TOOLS>>;
    /**
     * Callback that is called when all steps are finished and the response is complete.
     */
    onFinish?: GenerateTextOnFinishCallback<NoInfer<TOOLS>>;
    /**
     * Context that is passed into tool execution.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
     * Settings for controlling what data is included in step results.
     * Disabling inclusion can help reduce memory usage when processing
     * large payloads like images.
     *
     * By default, all data is included for backwards compatibility.
     */
    experimental_include?: {
        /**
         * Whether to retain the request body in step results.
         * The request body can be large when sending images or files.
         * @default true
         */
        requestBody?: boolean;
        /**
         * Whether to retain the response body in step results.
         * @default true
         */
        responseBody?: boolean;
    };
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: IdGenerator;
    };
}): Promise<GenerateTextResult<TOOLS, OUTPUT>>;

/**
 * Infers the complete output type from the output specification.
 */
type InferCompleteOutput<OUTPUT extends Output> = OUTPUT extends Output<infer COMPLETE_OUTPUT, any, any> ? COMPLETE_OUTPUT : never;
/**
 * Infers the partial output type from the output specification.
 */
type InferPartialOutput<OUTPUT extends Output> = OUTPUT extends Output<any, infer PARTIAL_OUTPUT, any> ? PARTIAL_OUTPUT : never;
/**
 * Infers the element type from an array output specification.
 */
type InferElementOutput<OUTPUT extends Output> = OUTPUT extends Output<any, any, infer ELEMENT> ? ELEMENT : never;

/**
 * Prunes model messages from a list of model messages.
 *
 * @param messages - The list of model messages to prune.
 * @param reasoning - How to remove reasoning content from assistant messages. Default is `'none'`.
 * @param toolCalls - How to prune tool call/results/approval content. Default is `[]`.
 * @param emptyMessages - Whether to keep or remove messages whose content is empty after pruning. Default is `'remove'`.
 *
 * @returns The pruned list of model messages.
 */
declare function pruneMessages({ messages, reasoning, toolCalls, emptyMessages, }: {
    messages: ModelMessage[];
    reasoning?: 'all' | 'before-last-message' | 'none';
    toolCalls?: 'all' | 'before-last-message' | `before-last-${number}-messages` | 'none' | Array<{
        type: 'all' | 'before-last-message' | `before-last-${number}-messages`;
        tools?: string[];
    }>;
    emptyMessages?: 'keep' | 'remove';
}): ModelMessage[];

/**
 * Detects the first chunk in a buffer.
 *
 * @param buffer - The buffer to detect the first chunk in.
 *
 * @returns The first detected chunk, or `undefined` if no chunk was detected.
 */
type ChunkDetector = (buffer: string) => string | undefined | null;
/**
 * Smooths text and reasoning streaming output.
 *
 * @param delayInMs - The delay in milliseconds between each chunk. Defaults to 10ms. Can be set to `null` to skip the delay.
 * @param chunking - Controls how the text is chunked for streaming. Use "word" to stream word by word (default), "line" to stream line by line, provide a custom RegExp pattern for custom chunking, provide an Intl.Segmenter for locale-aware word segmentation (recommended for CJK languages), or provide a custom ChunkDetector function.
 *
 * @returns A transform stream that smooths text streaming output.
 */
declare function smoothStream<TOOLS extends ToolSet>({ delayInMs, chunking, _internal: { delay }, }?: {
    delayInMs?: number | null;
    chunking?: 'word' | 'line' | RegExp | ChunkDetector | Intl.Segmenter;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        delay?: (delayInMs: number | null) => Promise<void>;
    };
}): (options: {
    tools: TOOLS;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>;

/**
 * Tool output when the tool execution has been denied (for static tools).
 */
type StaticToolOutputDenied<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-output-denied';
        toolCallId: string;
        toolName: NAME & string;
        providerExecuted?: boolean;
        dynamic?: false | undefined;
    };
}>;
/**
 * Tool output when the tool execution has been denied.
 */
type TypedToolOutputDenied<TOOLS extends ToolSet> = StaticToolOutputDenied<TOOLS>;

/**
 * The data types that can be used in the UI message for the UI message data parts.
 */
type UIDataTypes = Record<string, unknown>;
type UITool = {
    input: unknown;
    output: unknown | undefined;
};
/**
 * Infer the input and output types of a tool so it can be used as a UI tool.
 */
type InferUITool<TOOL extends Tool> = {
    input: InferToolInput<TOOL>;
    output: InferToolOutput<TOOL>;
};
/**
 * Infer the input and output types of a tool set so it can be used as a UI tool set.
 */
type InferUITools<TOOLS extends ToolSet> = {
    [NAME in keyof TOOLS & string]: InferUITool<TOOLS[NAME]>;
};
type UITools = Record<string, UITool>;
/**
 * AI SDK UI Messages. They are used in the client and to communicate between the frontend and the API routes.
 */
interface UIMessage<METADATA = unknown, DATA_PARTS extends UIDataTypes = UIDataTypes, TOOLS extends UITools = UITools> {
    /**
     * A unique identifier for the message.
     */
    id: string;
    /**
     * The role of the message.
     */
    role: 'system' | 'user' | 'assistant';
    /**
     * The metadata of the message.
     */
    metadata?: METADATA;
    /**
     * The parts of the message. Use this for rendering the message in the UI.
     *
     * System messages should be avoided (set the system prompt on the server instead).
     * They can have text parts.
     *
     * User messages can have text parts and file parts.
     *
     * Assistant messages can have text, reasoning, tool invocation, and file parts.
     */
    parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}
type UIMessagePart<DATA_TYPES extends UIDataTypes, TOOLS extends UITools> = TextUIPart | ReasoningUIPart | ToolUIPart<TOOLS> | DynamicToolUIPart | SourceUrlUIPart | SourceDocumentUIPart | FileUIPart | DataUIPart<DATA_TYPES> | StepStartUIPart;
/**
 * A text part of a message.
 */
type TextUIPart = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    /**
     * The state of the text part.
     */
    state?: 'streaming' | 'done';
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A reasoning part of a message.
 */
type ReasoningUIPart = {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * The state of the reasoning part.
     */
    state?: 'streaming' | 'done';
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A source part of a message.
 */
type SourceUrlUIPart = {
    type: 'source-url';
    sourceId: string;
    url: string;
    title?: string;
    providerMetadata?: ProviderMetadata;
};
/**
 * A document source part of a message.
 */
type SourceDocumentUIPart = {
    type: 'source-document';
    sourceId: string;
    mediaType: string;
    title: string;
    filename?: string;
    providerMetadata?: ProviderMetadata;
};
/**
 * A file part of a message.
 */
type FileUIPart = {
    type: 'file';
    /**
     * IANA media type of the file.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Optional filename of the file.
     */
    filename?: string;
    /**
     * The URL of the file.
     * It can either be a URL to a hosted file or a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
     */
    url: string;
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A step boundary part of a message.
 */
type StepStartUIPart = {
    type: 'step-start';
};
type DataUIPart<DATA_TYPES extends UIDataTypes> = ValueOf<{
    [NAME in keyof DATA_TYPES & string]: {
        type: `data-${NAME}`;
        id?: string;
        data: DATA_TYPES[NAME];
    };
}>;
type asUITool<TOOL extends UITool | Tool> = TOOL extends Tool ? InferUITool<TOOL> : TOOL;
/**
 * Check if a message part is a data part.
 */
declare function isDataUIPart<DATA_TYPES extends UIDataTypes>(part: UIMessagePart<DATA_TYPES, UITools>): part is DataUIPart<DATA_TYPES>;
/**
 * A UI tool invocation contains all the information needed to render a tool invocation in the UI.
 * It can be derived from a tool without knowing the tool name, and can be used to define
 * UI components for the tool.
 */
type UIToolInvocation<TOOL extends UITool | Tool> = {
    /**
     * ID of the tool call.
     */
    toolCallId: string;
    title?: string;
    /**
     * Whether the tool call was executed by the provider.
     */
    providerExecuted?: boolean;
} & ({
    state: 'input-streaming';
    input: DeepPartial<asUITool<TOOL>['input']> | undefined;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval?: never;
} | {
    state: 'input-available';
    input: asUITool<TOOL>['input'];
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval?: never;
} | {
    state: 'approval-requested';
    input: asUITool<TOOL>['input'];
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved?: never;
        reason?: never;
    };
} | {
    state: 'approval-responded';
    input: asUITool<TOOL>['input'];
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved: boolean;
        reason?: string;
    };
} | {
    state: 'output-available';
    input: asUITool<TOOL>['input'];
    output: asUITool<TOOL>['output'];
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    resultProviderMetadata?: ProviderMetadata;
    preliminary?: boolean;
    approval?: {
        id: string;
        approved: true;
        reason?: string;
    };
} | {
    state: 'output-error';
    input: asUITool<TOOL>['input'] | undefined;
    rawInput?: unknown;
    output?: never;
    errorText: string;
    callProviderMetadata?: ProviderMetadata;
    resultProviderMetadata?: ProviderMetadata;
    approval?: {
        id: string;
        approved: true;
        reason?: string;
    };
} | {
    state: 'output-denied';
    input: asUITool<TOOL>['input'];
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved: false;
        reason?: string;
    };
});
type ToolUIPart<TOOLS extends UITools = UITools> = ValueOf<{
    [NAME in keyof TOOLS & string]: {
        type: `tool-${NAME}`;
    } & UIToolInvocation<TOOLS[NAME]>;
}>;
type DynamicToolUIPart = {
    type: 'dynamic-tool';
    /**
     * Name of the tool that is being called.
     */
    toolName: string;
    /**
     * ID of the tool call.
     */
    toolCallId: string;
    title?: string;
    /**
     * Whether the tool call was executed by the provider.
     */
    providerExecuted?: boolean;
} & ({
    state: 'input-streaming';
    input: unknown | undefined;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval?: never;
} | {
    state: 'input-available';
    input: unknown;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval?: never;
} | {
    state: 'approval-requested';
    input: unknown;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved?: never;
        reason?: never;
    };
} | {
    state: 'approval-responded';
    input: unknown;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved: boolean;
        reason?: string;
    };
} | {
    state: 'output-available';
    input: unknown;
    output: unknown;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    resultProviderMetadata?: ProviderMetadata;
    preliminary?: boolean;
    approval?: {
        id: string;
        approved: true;
        reason?: string;
    };
} | {
    state: 'output-error';
    input: unknown;
    output?: never;
    errorText: string;
    callProviderMetadata?: ProviderMetadata;
    resultProviderMetadata?: ProviderMetadata;
    approval?: {
        id: string;
        approved: true;
        reason?: string;
    };
} | {
    state: 'output-denied';
    input: unknown;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    approval: {
        id: string;
        approved: false;
        reason?: string;
    };
});
/**
 * Type guard to check if a message part is a text part.
 */
declare function isTextUIPart(part: UIMessagePart<UIDataTypes, UITools>): part is TextUIPart;
/**
 * Type guard to check if a message part is a file part.
 */
declare function isFileUIPart(part: UIMessagePart<UIDataTypes, UITools>): part is FileUIPart;
/**
 * Type guard to check if a message part is a reasoning part.
 */
declare function isReasoningUIPart(part: UIMessagePart<UIDataTypes, UITools>): part is ReasoningUIPart;
/**
 * Check if a message part is a static tool part.
 *
 * Static tools are tools for which the types are known at development time.
 */
declare function isStaticToolUIPart<TOOLS extends UITools>(part: UIMessagePart<UIDataTypes, TOOLS>): part is ToolUIPart<TOOLS>;
/**
 * Check if a message part is a tool part.
 *
 * Tool parts are either static or dynamic tools.
 *
 * Use `isStaticToolUIPart` or `isDynamicToolUIPart` to check the type of the tool.
 */
declare function isToolUIPart<TOOLS extends UITools>(part: UIMessagePart<UIDataTypes, TOOLS>): part is ToolUIPart<TOOLS> | DynamicToolUIPart;
/**
 * @deprecated Use isToolUIPart instead.
 */
declare const isToolOrDynamicToolUIPart: typeof isToolUIPart;
/**
 * Returns the name of the static tool.
 *
 * The possible values are the keys of the tool set.
 */
declare function getStaticToolName<TOOLS extends UITools>(part: ToolUIPart<TOOLS>): keyof TOOLS;
/**
 * Returns the name of the tool (static or dynamic).
 *
 * This function will not restrict the name to the keys of the tool set.
 * If you need to restrict the name to the keys of the tool set, use `getStaticToolName` instead.
 */
declare function getToolName(part: ToolUIPart<UITools> | DynamicToolUIPart): string;
/**
 * @deprecated Use getToolName instead.
 */
declare const getToolOrDynamicToolName: typeof getToolName;
type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<infer METADATA> ? METADATA : unknown;
type InferUIMessageData<T extends UIMessage> = T extends UIMessage<unknown, infer DATA_TYPES> ? DATA_TYPES : UIDataTypes;
type InferUIMessageTools<T extends UIMessage> = T extends UIMessage<unknown, UIDataTypes, infer TOOLS> ? TOOLS : UITools;
type InferUIMessageToolCall<UI_MESSAGE extends UIMessage> = ValueOf<{
    [NAME in keyof InferUIMessageTools<UI_MESSAGE>]: ToolCall<NAME & string, InferUIMessageTools<UI_MESSAGE>[NAME] extends {
        input: infer INPUT;
    } ? INPUT : never> & {
        dynamic?: false;
    };
}> | (ToolCall<string, unknown> & {
    dynamic: true;
});

declare const uiMessageChunkSchema: _ai_sdk_provider_utils.LazySchema<{
    type: "text-start";
    id: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "text-delta";
    id: string;
    delta: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "text-end";
    id: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "error";
    errorText: string;
} | {
    type: "tool-input-start";
    toolCallId: string;
    toolName: string;
    providerExecuted?: boolean | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
    dynamic?: boolean | undefined;
    title?: string | undefined;
} | {
    type: "tool-input-delta";
    toolCallId: string;
    inputTextDelta: string;
} | {
    type: "tool-input-available";
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
    dynamic?: boolean | undefined;
    title?: string | undefined;
} | {
    type: "tool-input-error";
    toolCallId: string;
    toolName: string;
    input: unknown;
    errorText: string;
    providerExecuted?: boolean | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
    dynamic?: boolean | undefined;
    title?: string | undefined;
} | {
    type: "tool-approval-request";
    approvalId: string;
    toolCallId: string;
} | {
    type: "tool-output-available";
    toolCallId: string;
    output: unknown;
    providerExecuted?: boolean | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
    dynamic?: boolean | undefined;
    preliminary?: boolean | undefined;
} | {
    type: "tool-output-error";
    toolCallId: string;
    errorText: string;
    providerExecuted?: boolean | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
    dynamic?: boolean | undefined;
} | {
    type: "tool-output-denied";
    toolCallId: string;
} | {
    type: "reasoning-start";
    id: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "reasoning-delta";
    id: string;
    delta: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "reasoning-end";
    id: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "source-url";
    sourceId: string;
    url: string;
    title?: string | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "source-document";
    sourceId: string;
    mediaType: string;
    title: string;
    filename?: string | undefined;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: "file";
    url: string;
    mediaType: string;
    providerMetadata?: _ai_sdk_provider.SharedV3ProviderMetadata | undefined;
} | {
    type: `data-${string}`;
    data: unknown;
    id?: string | undefined;
    transient?: boolean | undefined;
} | {
    type: "start-step";
} | {
    type: "finish-step";
} | {
    type: "start";
    messageId?: string | undefined;
    messageMetadata?: unknown;
} | {
    type: "finish";
    finishReason?: "length" | "error" | "stop" | "content-filter" | "tool-calls" | "other" | undefined;
    messageMetadata?: unknown;
} | {
    type: "abort";
    reason?: string | undefined;
} | {
    type: "message-metadata";
    messageMetadata: unknown;
}>;
type DataUIMessageChunk<DATA_TYPES extends UIDataTypes> = ValueOf<{
    [NAME in keyof DATA_TYPES & string]: {
        type: `data-${NAME}`;
        id?: string;
        data: DATA_TYPES[NAME];
        transient?: boolean;
    };
}>;
type UIMessageChunk<METADATA = unknown, DATA_TYPES extends UIDataTypes = UIDataTypes> = {
    type: 'text-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-delta';
    delta: string;
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'error';
    errorText: string;
} | {
    type: 'tool-input-available';
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    title?: string;
} | {
    type: 'tool-input-error';
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    errorText: string;
    title?: string;
} | {
    type: 'tool-approval-request';
    approvalId: string;
    toolCallId: string;
} | {
    type: 'tool-output-available';
    toolCallId: string;
    output: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    preliminary?: boolean;
} | {
    type: 'tool-output-error';
    toolCallId: string;
    errorText: string;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
} | {
    type: 'tool-output-denied';
    toolCallId: string;
} | {
    type: 'tool-input-start';
    toolCallId: string;
    toolName: string;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    title?: string;
} | {
    type: 'tool-input-delta';
    toolCallId: string;
    inputTextDelta: string;
} | {
    type: 'source-url';
    sourceId: string;
    url: string;
    title?: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'source-document';
    sourceId: string;
    mediaType: string;
    title: string;
    filename?: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'file';
    url: string;
    mediaType: string;
    providerMetadata?: ProviderMetadata;
} | DataUIMessageChunk<DATA_TYPES> | {
    type: 'start-step';
} | {
    type: 'finish-step';
} | {
    type: 'start';
    messageId?: string;
    messageMetadata?: METADATA;
} | {
    type: 'finish';
    finishReason?: FinishReason;
    messageMetadata?: METADATA;
} | {
    type: 'abort';
    reason?: string;
} | {
    type: 'message-metadata';
    messageMetadata: METADATA;
};
type InferUIMessageChunk<T extends UIMessage> = UIMessageChunk<InferUIMessageMetadata<T>, InferUIMessageData<T>>;

type UIMessageStreamOnFinishCallback<UI_MESSAGE extends UIMessage> = (event: {
    /**
     * The updated list of UI messages.
     */
    messages: UI_MESSAGE[];
    /**
     * Indicates whether the response message is a continuation of the last original message,
     * or if a new message was created.
     */
    isContinuation: boolean;
    /**
     * Indicates whether the stream was aborted.
     */
    isAborted: boolean;
    /**
     * The message that was sent to the client as a response
     * (including the original message if it was extended).
     */
    responseMessage: UI_MESSAGE;
    /**
     * The reason why the generation finished.
     */
    finishReason?: FinishReason;
}) => PromiseLike<void> | void;

/**
 * Options for creating a UI message stream response.
 * Extends the standard `ResponseInit` with additional streaming options.
 */
type UIMessageStreamResponseInit = ResponseInit & {
    /**
     * Optional callback to consume a copy of the SSE stream independently.
     * This is useful for logging, debugging, or processing the stream in parallel.
     * The callback receives a tee'd copy of the stream and does not block the response.
     */
    consumeSseStream?: (options: {
        stream: ReadableStream<string>;
    }) => PromiseLike<void> | void;
};

/**
 * A type that combines AsyncIterable and ReadableStream.
 * This allows a ReadableStream to be consumed using for-await-of syntax.
 */
type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type ErrorHandler = (error: unknown) => void;

type UIMessageStreamOptions<UI_MESSAGE extends UIMessage> = {
    /**
     * The original messages. If they are provided, persistence mode is assumed,
     * and a message ID is provided for the response message.
     */
    originalMessages?: UI_MESSAGE[];
    /**
     * Generate a message ID for the response message.
     *
     * If not provided, no message ID will be set for the response message (unless
     * the original messages are provided and the last message is an assistant message).
     */
    generateMessageId?: IdGenerator;
    onFinish?: UIMessageStreamOnFinishCallback<UI_MESSAGE>;
    /**
     * Extracts message metadata that will be send to the client.
     *
     * Called on `start` and `finish` events.
     */
    messageMetadata?: (options: {
        part: TextStreamPart<ToolSet>;
    }) => InferUIMessageMetadata<UI_MESSAGE> | undefined;
    /**
     * Send reasoning parts to the client.
     * Default to true.
     */
    sendReasoning?: boolean;
    /**
     * Send source parts to the client.
     * Default to false.
     */
    sendSources?: boolean;
    /**
     * Send the finish event to the client.
     * Set to false if you are using additional streamText calls
     * that send additional data.
     * Default to true.
     */
    sendFinish?: boolean;
    /**
     * Send the message start event to the client.
     * Set to false if you are using additional streamText calls
     * and the message start event has already been sent.
     * Default to true.
     */
    sendStart?: boolean;
    /**
     * Process an error, e.g. to log it. Default to `() => 'An error occurred.'`.
     *
     * @returns error message to include in the data stream.
     */
    onError?: (error: unknown) => string;
};
type ConsumeStreamOptions = {
    onError?: ErrorHandler;
};
/**
 * A result object for accessing different stream types and additional information.
 */
interface StreamTextResult<TOOLS extends ToolSet, OUTPUT extends Output> {
    /**
     * The content that was generated in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly content: PromiseLike<Array<ContentPart<TOOLS>>>;
    /**
     * The full text that has been generated by the last step.
     *
     * Automatically consumes the stream.
     */
    readonly text: PromiseLike<string>;
    /**
     * The full reasoning that the model has generated.
     *
     * Automatically consumes the stream.
     */
    readonly reasoning: PromiseLike<Array<ReasoningOutput>>;
    /**
     * The reasoning that has been generated by the last step.
     *
     * Automatically consumes the stream.
     */
    readonly reasoningText: PromiseLike<string | undefined>;
    /**
     * Files that have been generated by the model in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly files: PromiseLike<GeneratedFile[]>;
    /**
     * Sources that have been used as references in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly sources: PromiseLike<Source[]>;
    /**
     * The tool calls that have been executed in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly toolCalls: PromiseLike<TypedToolCall<TOOLS>[]>;
    /**
     * The static tool calls that have been executed in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly staticToolCalls: PromiseLike<StaticToolCall<TOOLS>[]>;
    /**
     * The dynamic tool calls that have been executed in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly dynamicToolCalls: PromiseLike<DynamicToolCall[]>;
    /**
     * The static tool results that have been generated in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly staticToolResults: PromiseLike<StaticToolResult<TOOLS>[]>;
    /**
     * The dynamic tool results that have been generated in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly dynamicToolResults: PromiseLike<DynamicToolResult[]>;
    /**
     * The tool results that have been generated in the last step.
     *
     * Automatically consumes the stream.
     */
    readonly toolResults: PromiseLike<TypedToolResult<TOOLS>[]>;
    /**
     * The unified finish reason why the generation finished. Taken from the last step.
     *
     * Automatically consumes the stream.
     */
    readonly finishReason: PromiseLike<FinishReason>;
    /**
     * The raw reason why the generation finished (from the provider). Taken from the last step.
     *
     * Automatically consumes the stream.
     */
    readonly rawFinishReason: PromiseLike<string | undefined>;
    /**
     * The token usage of the last step.
     *
     * Automatically consumes the stream.
     */
    readonly usage: PromiseLike<LanguageModelUsage>;
    /**
     * The total token usage of the generated response.
     * When there are multiple steps, the usage is the sum of all step usages.
     *
     * Automatically consumes the stream.
     */
    readonly totalUsage: PromiseLike<LanguageModelUsage>;
    /**
     * Warnings from the model provider (e.g. unsupported settings) for the first step.
     *
     * Automatically consumes the stream.
     */
    readonly warnings: PromiseLike<CallWarning[] | undefined>;
    /**
     * Details for all steps.
     * You can use this to get information about intermediate steps,
     * such as the tool calls or the response headers.
     *
     * Automatically consumes the stream.
     */
    readonly steps: PromiseLike<Array<StepResult<TOOLS>>>;
    /**
     * Additional request information from the last step.
     *
     * Automatically consumes the stream.
     */
    readonly request: PromiseLike<LanguageModelRequestMetadata>;
    /**
     * Additional response information from the last step.
     *
     * Automatically consumes the stream.
     */
    readonly response: PromiseLike<LanguageModelResponseMetadata & {
        /**
         * The response messages that were generated during the call. It consists of an assistant message,
         * potentially containing tool calls.
         *
         * When there are tool results, there is an additional tool message with the tool results that are available.
         * If there are tools that do not have execute functions, they are not included in the tool results and
         * need to be added separately.
         */
        messages: Array<ResponseMessage>;
    }>;
    /**
     * Additional provider-specific metadata from the last step.
     * Metadata is passed through from the provider to the AI SDK and
     * enables provider-specific results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: PromiseLike<ProviderMetadata | undefined>;
    /**
     * A text stream that returns only the generated text deltas. You can use it
     * as either an AsyncIterable or a ReadableStream. When an error occurs, the
     * stream will throw the error.
     */
    readonly textStream: AsyncIterableStream<string>;
    /**
     * A stream with all events, including text deltas, tool calls, tool results, and
     * errors.
     * You can use it as either an AsyncIterable or a ReadableStream.
     * Only errors that stop the stream, such as network errors, are thrown.
     */
    readonly fullStream: AsyncIterableStream<TextStreamPart<TOOLS>>;
    /**
     * A stream of partial outputs. It uses the `output` specification.
     *
     * @deprecated Use `partialOutputStream` instead.
     */
    readonly experimental_partialOutputStream: AsyncIterableStream<InferPartialOutput<OUTPUT>>;
    /**
     * A stream of partial parsed outputs. It uses the `output` specification.
     */
    readonly partialOutputStream: AsyncIterableStream<InferPartialOutput<OUTPUT>>;
    /**
     * A stream of individual array elements as they complete.
     * Only available when using `output: Output.array()`.
     */
    readonly elementStream: AsyncIterableStream<InferElementOutput<OUTPUT>>;
    /**
     * The complete parsed output. It uses the `output` specification.
     */
    readonly output: PromiseLike<InferCompleteOutput<OUTPUT>>;
    /**
     * Consumes the stream without processing the parts.
     * This is useful to force the stream to finish.
     * It effectively removes the backpressure and allows the stream to finish,
     * triggering the `onFinish` callback and the promise resolution.
     *
     * If an error occurs, it is passed to the optional `onError` callback.
     */
    consumeStream(options?: ConsumeStreamOptions): PromiseLike<void>;
    /**
     * Converts the result to a UI message stream.
     *
     * @returns A UI message stream.
     */
    toUIMessageStream<UI_MESSAGE extends UIMessage>(options?: UIMessageStreamOptions<UI_MESSAGE>): AsyncIterableStream<InferUIMessageChunk<UI_MESSAGE>>;
    /**
     * Writes UI message stream output to a Node.js response-like object.
     */
    pipeUIMessageStreamToResponse<UI_MESSAGE extends UIMessage>(response: ServerResponse, options?: UIMessageStreamResponseInit & UIMessageStreamOptions<UI_MESSAGE>): void;
    /**
     * Writes text delta output to a Node.js response-like object.
     * It sets a `Content-Type` header to `text/plain; charset=utf-8` and
     * writes each text delta as a separate chunk.
     *
     * @param response A Node.js response-like object (ServerResponse).
     * @param init Optional headers, status code, and status text.
     */
    pipeTextStreamToResponse(response: ServerResponse, init?: ResponseInit): void;
    /**
     * Converts the result to a streamed response object with a stream data part stream.
     *
     * @returns A response object.
     */
    toUIMessageStreamResponse<UI_MESSAGE extends UIMessage>(options?: UIMessageStreamResponseInit & UIMessageStreamOptions<UI_MESSAGE>): Response;
    /**
     * Creates a simple text stream response.
     * Each text delta is encoded as UTF-8 and sent as a separate chunk.
     * Non-text-delta events are ignored.
     * @param init Optional headers, status code, and status text.
     */
    toTextStreamResponse(init?: ResponseInit): Response;
}
type TextStreamPart<TOOLS extends ToolSet> = {
    type: 'text-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    text: string;
} | {
    type: 'reasoning-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-delta';
    providerMetadata?: ProviderMetadata;
    id: string;
    text: string;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: ProviderMetadata;
    providerExecuted?: boolean;
    dynamic?: boolean;
    title?: string;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS>) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS>) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS>) | ({
    type: 'tool-output-denied';
} & StaticToolOutputDenied<TOOLS>) | ToolApprovalRequestOutput<TOOLS> | {
    type: 'start-step';
    request: LanguageModelRequestMetadata;
    warnings: CallWarning[];
} | {
    type: 'finish-step';
    response: LanguageModelResponseMetadata;
    usage: LanguageModelUsage;
    finishReason: FinishReason;
    rawFinishReason: string | undefined;
    providerMetadata: ProviderMetadata | undefined;
} | {
    type: 'start';
} | {
    type: 'finish';
    finishReason: FinishReason;
    rawFinishReason: string | undefined;
    totalUsage: LanguageModelUsage;
} | {
    type: 'abort';
    reason?: string;
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'raw';
    rawValue: unknown;
};

/**
 * A transformation that is applied to the stream.
 *
 * @param stopStream - A function that stops the source stream.
 * @param tools - The tools that are accessible to and can be called by the model. The model needs to support calling tools.
 */
type StreamTextTransform<TOOLS extends ToolSet> = (options: {
    tools: TOOLS;
    stopStream: () => void;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>;
/**
 * Callback that is set using the `onError` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamTextOnErrorCallback = (event: {
    error: unknown;
}) => PromiseLike<void> | void;
/**
 * Callback that is set using the `onStepFinish` option.
 *
 * @param stepResult - The result of the step.
 */
type StreamTextOnStepFinishCallback<TOOLS extends ToolSet> = (event: OnStepFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `onChunk` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamTextOnChunkCallback<TOOLS extends ToolSet> = (event: {
    chunk: Extract<TextStreamPart<TOOLS>, {
        type: 'text-delta' | 'reasoning-delta' | 'source' | 'tool-call' | 'tool-input-start' | 'tool-input-delta' | 'tool-result' | 'raw';
    }>;
}) => PromiseLike<void> | void;
/**
 * Callback that is set using the `onFinish` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamTextOnFinishCallback<TOOLS extends ToolSet> = (event: OnFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `onAbort` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamTextOnAbortCallback<TOOLS extends ToolSet> = (event: {
    /**
     * Details for all previously finished steps.
     */
    readonly steps: StepResult<TOOLS>[];
}) => PromiseLike<void> | void;
/**
 * Include settings for streamText (requestBody only).
 */
type StreamTextIncludeSettings = {
    requestBody?: boolean;
};
/**
 * Callback that is set using the `experimental_onStart` option.
 *
 * Called when the streamText operation begins, before any LLM calls.
 * Use this callback for logging, analytics, or initializing state at the
 * start of a generation.
 *
 * @param event - The event object containing generation configuration.
 */
type StreamTextOnStartCallback<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output> = (event: OnStartEvent<TOOLS, OUTPUT, StreamTextIncludeSettings>) => PromiseLike<void> | void;
/**
 * Callback that is set using the `experimental_onStepStart` option.
 *
 * Called when a step (LLM call) begins, before the provider is called.
 * Each step represents a single LLM invocation. Multiple steps occur when
 * using tool calls (the model may be called multiple times in a loop).
 *
 * @param event - The event object containing step configuration.
 */
type StreamTextOnStepStartCallback<TOOLS extends ToolSet = ToolSet, OUTPUT extends Output = Output> = (event: OnStepStartEvent<TOOLS, OUTPUT, StreamTextIncludeSettings>) => PromiseLike<void> | void;
type StreamTextOnToolCallStartCallback<TOOLS extends ToolSet = ToolSet> = (event: OnToolCallStartEvent<TOOLS>) => PromiseLike<void> | void;
type StreamTextOnToolCallFinishCallback<TOOLS extends ToolSet = ToolSet> = (event: OnToolCallFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Generate a text and call tools for a given prompt using a language model.
 *
 * This function streams the output. If you do not want to stream the output, use `generateText` instead.
 *
 * @param model - The language model to use.
 * @param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.
 *
 * @param system - A system message that will be part of the prompt.
 * @param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
 * @param messages - A list of messages. You can either use `prompt` or `messages` but not both.
 *
 * @param maxOutputTokens - Maximum number of tokens to generate.
 * @param temperature - Temperature setting.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topP - Nucleus sampling.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topK - Only sample from the top K options for each subsequent token.
 * Used to remove "long tail" low probability responses.
 * Recommended for advanced use cases only. You usually only need to use temperature.
 * @param presencePenalty - Presence penalty setting.
 * It affects the likelihood of the model to repeat information that is already in the prompt.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param frequencyPenalty - Frequency penalty setting.
 * It affects the likelihood of the model to repeatedly use the same words or phrases.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param stopSequences - Stop sequences.
 * If set, the model will stop generating text when one of the stop sequences is generated.
 * @param seed - The seed (integer) to use for random sampling.
 * If set and supported by the model, calls will generate deterministic results.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param timeout - An optional timeout in milliseconds. The call will be aborted if it takes longer than the specified timeout.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param onChunk - Callback that is called for each chunk of the stream. The stream processing will pause until the callback promise is resolved.
 * @param onError - Callback that is called when an error occurs during streaming. You can use it to log errors.
 * @param onStepFinish - Callback that is called when each step (LLM call) is finished, including intermediate steps.
 * @param onFinish - Callback that is called when all steps are finished and the response is complete.
 *
 * @returns
 * A result object for accessing different stream types and additional information.
 */
declare function streamText<TOOLS extends ToolSet, OUTPUT extends Output = Output<string, string, never>>({ model, tools, toolChoice, system, prompt, messages, maxRetries, abortSignal, timeout, headers, stopWhen, experimental_output, output, experimental_telemetry: telemetry, prepareStep, providerOptions, experimental_activeTools, activeTools, experimental_repairToolCall: repairToolCall, experimental_transform: transform, experimental_download: download, includeRawChunks, onChunk, onError, onFinish, onAbort, onStepFinish, experimental_onStart: onStart, experimental_onStepStart: onStepStart, experimental_onToolCallStart: onToolCallStart, experimental_onToolCallFinish: onToolCallFinish, experimental_context, experimental_include: include, _internal: { now, generateId }, ...settings }: CallSettings & Prompt & {
    /**
     * The language model to use.
     */
    model: LanguageModel;
    /**
     * The tools that the model can call. The model needs to support calling tools.
     */
    tools?: TOOLS;
    /**
     * The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<TOOLS>;
    /**
     * Condition for stopping the generation when there are tool results in the last step.
     * When the condition is an array, any of the conditions can be met to stop the generation.
     *
     * @default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Limits the tools that are available for the model to call without
     * changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Optional specification for parsing structured outputs from the LLM response.
     */
    output?: OUTPUT;
    /**
     * Optional specification for parsing structured outputs from the LLM response.
     *
     * @deprecated Use `output` instead.
     */
    experimental_output?: OUTPUT;
    /**
     * Optional function that you can use to provide different settings for a step.
     *
     * @param options - The options for the step.
     * @param options.steps - The steps that have been executed so far.
     * @param options.stepNumber - The number of the step that is being executed.
     * @param options.model - The model that is being used.
     *
     * @returns An object that contains the settings for the step.
     * If you return undefined (or for undefined settings), the settings from the outer level will be used.
     */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
     * A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;
    /**
     * Optional stream transformations.
     * They are applied in the order they are provided.
     * The stream transformations must maintain the stream structure for streamText to work correctly.
     */
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * Whether to include raw chunks from the provider in the stream.
     * When enabled, you will receive raw chunks with type 'raw' that contain the unprocessed data from the provider.
     * This allows access to cutting-edge provider features not yet wrapped by the AI SDK.
     * Defaults to false.
     */
    includeRawChunks?: boolean;
    /**
     * Callback that is called for each chunk of the stream.
     * The stream processing will pause until the callback promise is resolved.
     */
    onChunk?: StreamTextOnChunkCallback<TOOLS>;
    /**
     * Callback that is invoked when an error occurs during streaming.
     * You can use it to log errors.
     * The stream processing will pause until the callback promise is resolved.
     */
    onError?: StreamTextOnErrorCallback;
    /**
     * Callback that is called when the LLM response and all request tool executions
     * (for tools that have an `execute` function) are finished.
     *
     * The usage is the combined usage of all steps.
     */
    onFinish?: StreamTextOnFinishCallback<TOOLS>;
    onAbort?: StreamTextOnAbortCallback<TOOLS>;
    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: StreamTextOnStepFinishCallback<TOOLS>;
    /**
     * Callback that is called when the streamText operation begins,
     * before any LLM calls are made.
     */
    experimental_onStart?: StreamTextOnStartCallback<NoInfer<TOOLS>, OUTPUT>;
    /**
     * Callback that is called when a step (LLM call) begins,
     * before the provider is called.
     */
    experimental_onStepStart?: StreamTextOnStepStartCallback<NoInfer<TOOLS>, OUTPUT>;
    /**
     * Callback that is called right before a tool's execute function runs.
     */
    experimental_onToolCallStart?: StreamTextOnToolCallStartCallback<NoInfer<TOOLS>>;
    /**
     * Callback that is called right after a tool's execute function completes (or errors).
     */
    experimental_onToolCallFinish?: StreamTextOnToolCallFinishCallback<NoInfer<TOOLS>>;
    /**
     * Context that is passed into tool execution.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
     * Settings for controlling what data is included in step results.
     * Disabling inclusion can help reduce memory usage when processing
     * large payloads like images.
     *
     * By default, all data is included for backwards compatibility.
     */
    experimental_include?: {
        /**
         * Whether to retain the request body in step results.
         * The request body can be large when sending images or files.
         * @default true
         */
        requestBody?: boolean;
    };
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        now?: () => number;
        generateId?: IdGenerator;
    };
}): StreamTextResult<TOOLS, OUTPUT>;
type EnrichedStreamPart<TOOLS extends ToolSet, PARTIAL_OUTPUT> = {
    part: TextStreamPart<TOOLS>;
    partialOutput: PARTIAL_OUTPUT | undefined;
};

interface Output<OUTPUT = any, PARTIAL = any, ELEMENT = any> {
    /**
     * The name of the output mode.
     */
    name: string;
    /**
     * The response format to use for the model.
     */
    responseFormat: PromiseLike<LanguageModelV3CallOptions['responseFormat']>;
    /**
     * Parses the complete output of the model.
     */
    parseCompleteOutput(options: {
        text: string;
    }, context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
    }): Promise<OUTPUT>;
    /**
     * Parses the partial output of the model.
     */
    parsePartialOutput(options: {
        text: string;
    }): Promise<{
        partial: PARTIAL;
    } | undefined>;
    /**
     * Creates a stream transform that emits individual elements as they complete.
     */
    createElementStreamTransform(): TransformStream<EnrichedStreamPart<any, PARTIAL>, ELEMENT> | undefined;
}
/**
 * Output specification for text generation.
 * This is the default output mode that generates plain text.
 *
 * @returns An output specification for generating text.
 */
declare const text: () => Output<string, string, never>;
/**
 * Output specification for typed object generation using schemas.
 * When the model generates a text response, it will return an object that matches the schema.
 *
 * @param schema - The schema of the object to generate.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating objects with the specified schema.
 */
declare const object: <OBJECT>({ schema: inputSchema, name, description, }: {
    schema: FlexibleSchema<OBJECT>;
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
     */
    name?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
     */
    description?: string;
}) => Output<OBJECT, DeepPartial<OBJECT>, never>;
/**
 * Output specification for array generation.
 * When the model generates a text response, it will return an array of elements.
 *
 * @param element - The schema of the array elements to generate.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating an array of elements.
 */
declare const array: <ELEMENT>({ element: inputElementSchema, name, description, }: {
    element: FlexibleSchema<ELEMENT>;
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
     */
    name?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
     */
    description?: string;
}) => Output<Array<ELEMENT>, Array<ELEMENT>, ELEMENT>;
/**
 * Output specification for choice generation.
 * When the model generates a text response, it will return a one of the choice options.
 *
 * @param options - The available choices.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating a choice.
 */
declare const choice: <CHOICE extends string>({ options: choiceOptions, name, description, }: {
    options: Array<CHOICE>;
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
     */
    name?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
     */
    description?: string;
}) => Output<CHOICE, CHOICE, never>;
/**
 * Output specification for unstructured JSON generation.
 * When the model generates a text response, it will return a JSON object.
 *
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating JSON.
 */
declare const json: ({ name, description, }?: {
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
     */
    name?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
     */
    description?: string;
}) => Output<JSONValue$1, JSONValue$1, never>;

type output_Output<OUTPUT = any, PARTIAL = any, ELEMENT = any> = Output<OUTPUT, PARTIAL, ELEMENT>;
declare const output_array: typeof array;
declare const output_choice: typeof choice;
declare const output_json: typeof json;
declare const output_object: typeof object;
declare const output_text: typeof text;
declare namespace output {
  export {
    output_Output as Output,
    output_array as array,
    output_choice as choice,
    output_json as json,
    output_object as object,
    output_text as text,
  };
}

/**
 * The result of a `generateText` call.
 * It contains the generated text, the tool calls that were made during the generation, and the results of the tool calls.
 */
interface GenerateTextResult<TOOLS extends ToolSet, OUTPUT extends Output> {
    /**
     * The content that was generated in the last step.
     */
    readonly content: Array<ContentPart<TOOLS>>;
    /**
     * The text that was generated in the last step.
     */
    readonly text: string;
    /**
     * The full reasoning that the model has generated in the last step.
     */
    readonly reasoning: Array<ReasoningOutput>;
    /**
     * The reasoning text that the model has generated in the last step. Can be undefined if the model
     * has only generated text.
     */
    readonly reasoningText: string | undefined;
    /**
     * The files that were generated in the last step.
     * Empty array if no files were generated.
     */
    readonly files: Array<GeneratedFile>;
    /**
     * Sources that have been used as references in the last step.
     */
    readonly sources: Array<Source>;
    /**
     * The tool calls that were made in the last step.
     */
    readonly toolCalls: Array<TypedToolCall<TOOLS>>;
    /**
     * The static tool calls that were made in the last step.
     */
    readonly staticToolCalls: Array<StaticToolCall<TOOLS>>;
    /**
     * The dynamic tool calls that were made in the last step.
     */
    readonly dynamicToolCalls: Array<DynamicToolCall>;
    /**
     * The results of the tool calls from the last step.
     */
    readonly toolResults: Array<TypedToolResult<TOOLS>>;
    /**
     * The static tool results that were made in the last step.
     */
    readonly staticToolResults: Array<StaticToolResult<TOOLS>>;
    /**
     * The dynamic tool results that were made in the last step.
     */
    readonly dynamicToolResults: Array<DynamicToolResult>;
    /**
     * The unified reason why the generation finished.
     */
    readonly finishReason: FinishReason;
    /**
     * The raw reason why the generation finished (from the provider).
     */
    readonly rawFinishReason: string | undefined;
    /**
     * The token usage of the last step.
     */
    readonly usage: LanguageModelUsage;
    /**
     * The total token usage of all steps.
     * When there are multiple steps, the usage is the sum of all step usages.
     */
    readonly totalUsage: LanguageModelUsage;
    /**
     * Warnings from the model provider (e.g. unsupported settings)
     */
    readonly warnings: CallWarning[] | undefined;
    /**
     * Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
     * Additional response information.
     */
    readonly response: LanguageModelResponseMetadata & {
        /**
         * The response messages that were generated during the call. It consists of an assistant message,
         * potentially containing tool calls.
         *
         * When there are tool results, there is an additional tool message with the tool results that are available.
         * If there are tools that do not have execute functions, they are not included in the tool results and
         * need to be added separately.
         */
        messages: Array<ResponseMessage>;
        /**
         * Response body (available only for providers that use HTTP requests).
         */
        body?: unknown;
    };
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
    /**
     * Details for all steps.
     * You can use this to get information about intermediate steps,
     * such as the tool calls or the response headers.
     */
    readonly steps: Array<StepResult<TOOLS>>;
    /**
     * The generated structured output. It uses the `output` specification.
     *
     * @deprecated Use `output` instead.
     */
    readonly experimental_output: InferCompleteOutput<OUTPUT>;
    /**
     * The generated structured output. It uses the `output` specification.
     *
     */
    readonly output: InferCompleteOutput<OUTPUT>;
}

type ToolLoopAgentOnStepFinishCallback<TOOLS extends ToolSet = {}> = (stepResult: OnStepFinishEvent<TOOLS>) => Promise<void> | void;
type ToolLoopAgentOnFinishCallback<TOOLS extends ToolSet = {}> = (event: OnFinishEvent<TOOLS>) => PromiseLike<void> | void;
/**
 * Configuration options for an agent.
 */
type ToolLoopAgentSettings<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never> = Omit<CallSettings, 'abortSignal'> & {
    /**
     * The id of the agent.
     */
    id?: string;
    /**
     * The instructions for the agent.
     *
     * It can be a string, or, if you need to pass additional provider options (e.g. for caching), a `SystemModelMessage`.
     */
    instructions?: string | SystemModelMessage | Array<SystemModelMessage>;
    /**
     * The language model to use.
     */
    model: LanguageModel;
    /**
     * The tools that the model can call. The model needs to support calling tools.
     */
    tools?: TOOLS;
    /**
     * The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    /**
     * Condition for stopping the generation when there are tool results in the last step.
     * When the condition is an array, any of the conditions can be met to stop the generation.
     *
     * @default stepCountIs(20)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Limits the tools that are available for the model to call without
     * changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
     * Optional specification for generating structured outputs.
     */
    output?: OUTPUT;
    /**
     * Optional function that you can use to provide different settings for a step.
     */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
     * A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<TOOLS>>;
    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<NoInfer<TOOLS>>;
    /**
     * Callback that is called when all steps are finished and the response is complete.
     */
    onFinish?: ToolLoopAgentOnFinishCallback<NoInfer<TOOLS>>;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Context that is passed into tool calls.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * The schema for the call options.
     */
    callOptionsSchema?: FlexibleSchema<CALL_OPTIONS>;
    /**
     * Prepare the parameters for the generateText or streamText call.
     *
     * You can use this to have templates based on call options.
     */
    prepareCall?: (options: Omit<AgentCallParameters<CALL_OPTIONS, NoInfer<TOOLS>>, 'onStepFinish'> & Pick<ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>, 'model' | 'tools' | 'maxOutputTokens' | 'temperature' | 'topP' | 'topK' | 'presencePenalty' | 'frequencyPenalty' | 'stopSequences' | 'seed' | 'headers' | 'instructions' | 'stopWhen' | 'experimental_telemetry' | 'activeTools' | 'providerOptions' | 'experimental_context' | 'experimental_download'>) => MaybePromiseLike<Pick<ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>, 'model' | 'tools' | 'maxOutputTokens' | 'temperature' | 'topP' | 'topK' | 'presencePenalty' | 'frequencyPenalty' | 'stopSequences' | 'seed' | 'headers' | 'instructions' | 'stopWhen' | 'experimental_telemetry' | 'activeTools' | 'providerOptions' | 'experimental_context' | 'experimental_download'> & Omit<Prompt, 'system'>>;
};

/**
 * Parameters for calling an agent.
 */
type AgentCallParameters<CALL_OPTIONS, TOOLS extends ToolSet = {}> = ([
    CALL_OPTIONS
] extends [never] ? {
    options?: never;
} : {
    options: CALL_OPTIONS;
}) & ({
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
}) & {
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Timeout in milliseconds. Can be specified as a number or as an object with `totalMs`.
     */
    timeout?: TimeoutConfiguration;
    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
};
/**
 * Parameters for streaming an output from an agent.
 */
type AgentStreamParameters<CALL_OPTIONS, TOOLS extends ToolSet> = AgentCallParameters<CALL_OPTIONS, TOOLS> & {
    /**
     * Optional stream transformations.
     * They are applied in the order they are provided.
     * The stream transformations must maintain the stream structure for streamText to work correctly.
     */
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
};
/**
 * An Agent receives a prompt (text or messages) and generates or streams an output
 * that consists of steps, tool calls, data parts, etc.
 *
 * You can implement your own Agent by implementing the `Agent` interface,
 * or use the `ToolLoopAgent` class.
 */
interface Agent<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never> {
    /**
     * The specification version of the agent interface. This will enable
     * us to evolve the agent interface and retain backwards compatibility.
     */
    readonly version: 'agent-v1';
    /**
     * The id of the agent.
     */
    readonly id: string | undefined;
    /**
     * The tools that the agent can use.
     */
    readonly tools: TOOLS;
    /**
     * Generates an output from the agent (non-streaming).
     */
    generate(options: AgentCallParameters<CALL_OPTIONS, TOOLS>): PromiseLike<GenerateTextResult<TOOLS, OUTPUT>>;
    /**
     * Streams an output from the agent (streaming).
     */
    stream(options: AgentStreamParameters<CALL_OPTIONS, TOOLS>): PromiseLike<StreamTextResult<TOOLS, OUTPUT>>;
}

/**
 * A tool loop agent is an agent that runs tools in a loop. In each step,
 * it calls the LLM, and if there are tool calls, it executes the tools
 * and calls the LLM again in a new step with the tool results.
 *
 * The loop continues until:
 * - A finish reasoning other than tool-calls is returned, or
 * - A tool that is invoked does not have an execute function, or
 * - A tool call needs approval, or
 * - A stop condition is met (default stop condition is stepCountIs(20))
 */
declare class ToolLoopAgent<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never> implements Agent<CALL_OPTIONS, TOOLS, OUTPUT> {
    readonly version = "agent-v1";
    private readonly settings;
    constructor(settings: ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>);
    /**
     * The id of the agent.
     */
    get id(): string | undefined;
    /**
     * The tools that the agent can use.
     */
    get tools(): TOOLS;
    private prepareCall;
    private mergeOnStepFinishCallbacks;
    /**
     * Generates an output from the agent (non-streaming).
     */
    generate({ abortSignal, timeout, onStepFinish, ...options }: AgentCallParameters<CALL_OPTIONS, TOOLS>): Promise<GenerateTextResult<TOOLS, OUTPUT>>;
    /**
     * Streams an output from the agent (streaming).
     */
    stream({ abortSignal, timeout, experimental_transform, onStepFinish, ...options }: AgentStreamParameters<CALL_OPTIONS, TOOLS>): Promise<StreamTextResult<TOOLS, OUTPUT>>;
}

/**
 * Infer the type of the tools of an agent.
 */
type InferAgentTools<AGENT> = AGENT extends Agent<any, infer TOOLS, any> ? TOOLS : never;

/**
 * Infer the UI message type of an agent.
 */
type InferAgentUIMessage<AGENT, MESSAGE_METADATA = unknown> = UIMessage<MESSAGE_METADATA, never, InferUITools<InferAgentTools<AGENT>>>;

/**
 * Runs the agent and returns a response object with a UI message stream.
 *
 * @param agent - The agent to run.
 * @param uiMessages - The input UI messages.
 * @param abortSignal - Abort signal. Optional.
 * @param timeout - Timeout in milliseconds. Optional.
 * @param options - The options for the agent. Optional.
 * @param experimental_transform - Stream transformations. Optional.
 * @param onStepFinish - Callback that is called when each step is finished. Optional.
 * @param headers - Additional headers for the response. Optional.
 * @param status - The status code for the response. Optional.
 * @param statusText - The status text for the response. Optional.
 * @param consumeSseStream - Whether to consume the SSE stream. Optional.
 *
 * @returns The response object.
 */
declare function createAgentUIStreamResponse<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never, MESSAGE_METADATA = unknown>({ headers, status, statusText, consumeSseStream, ...options }: {
    agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
    uiMessages: unknown[];
    abortSignal?: AbortSignal;
    timeout?: TimeoutConfiguration;
    options?: CALL_OPTIONS;
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
} & UIMessageStreamResponseInit & UIMessageStreamOptions<UIMessage<MESSAGE_METADATA, never, InferUITools<TOOLS>>>): Promise<Response>;

/**
 * Callback that is called when a step finishes during streaming.
 * This is useful for persisting intermediate UI messages during multi-step agent runs.
 */
type UIMessageStreamOnStepFinishCallback<UI_MESSAGE extends UIMessage> = (event: {
    /**
     * The updated list of UI messages at the end of this step.
     */
    messages: UI_MESSAGE[];
    /**
     * Indicates whether the response message is a continuation of the last original message,
     * or if a new message was created.
     */
    isContinuation: boolean;
    /**
     * The message that was sent to the client as a response
     * (including the original message if it was extended).
     */
    responseMessage: UI_MESSAGE;
}) => PromiseLike<void> | void;

declare const getOriginalFetch: () => typeof fetch;
declare function callCompletionApi({ api, prompt, credentials, headers, body, streamProtocol, setCompletion, setLoading, setError, setAbortController, onFinish, onError, fetch, }: {
    api: string;
    prompt: string;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    body: Record<string, any>;
    streamProtocol: 'data' | 'text' | undefined;
    setCompletion: (completion: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: Error | undefined) => void;
    setAbortController: (abortController: AbortController | null) => void;
    onFinish: ((prompt: string, completion: string) => void) | undefined;
    onError: ((error: Error) => void) | undefined;
    fetch: ReturnType<typeof getOriginalFetch> | undefined;
}): Promise<string | null | undefined>;

/**
 * Transport interface for handling chat message communication and streaming.
 *
 * The `ChatTransport` interface provides fine-grained control over how messages
 * are sent to API endpoints and how responses are processed. This enables
 * alternative communication protocols like WebSockets, custom authentication
 * patterns, or specialized backend integrations.
 *
 * @template UI_MESSAGE - The UI message type extending UIMessage
 */
interface ChatTransport<UI_MESSAGE extends UIMessage> {
    /**
     * Sends messages to the chat API endpoint and returns a streaming response.
     *
     * This method handles both new message submission and message regeneration.
     * It supports real-time streaming of responses through UIMessageChunk events.
     *
     * @param options - Configuration object containing:
     * @param options.trigger - The type of message submission:
     *   - `'submit-message'`: Submitting a new user message
     *   - `'regenerate-message'`: Regenerating an assistant response
     * @param options.chatId - Unique identifier for the chat session
     * @param options.messageId - ID of the message to regenerate (for regenerate-message trigger) or undefined for new messages
     * @param options.messages - Array of UI messages representing the conversation history
     * @param options.abortSignal - Signal to abort the request if needed
     * @param options.headers - Additional HTTP headers to include in the request
     * @param options.body - Additional JSON properties to include in the request body
     * @param options.metadata - Custom metadata to attach to the request
     *
     * @returns Promise resolving to a ReadableStream of UIMessageChunk objects.
     *   The stream emits various chunk types like:
     *   - `text-start`, `text-delta`, `text-end`: For streaming text content
     *   - `tool-input-start`, `tool-input-delta`, `tool-input-available`: For tool calls
     *   - `data-part-start`, `data-part-delta`, `data-part-available`: For data parts
     *   - `error`: For error handling
     *
     * @throws Error when the API request fails or response is invalid
     */
    sendMessages: (options: {
        /** The type of message submission - either new message or regeneration */
        trigger: 'submit-message' | 'regenerate-message';
        /** Unique identifier for the chat session */
        chatId: string;
        /** ID of the message to regenerate, or undefined for new messages */
        messageId: string | undefined;
        /** Array of UI messages representing the conversation history */
        messages: UI_MESSAGE[];
        /** Signal to abort the request if needed */
        abortSignal: AbortSignal | undefined;
    } & ChatRequestOptions) => Promise<ReadableStream<UIMessageChunk>>;
    /**
     * Reconnects to an existing streaming response for the specified chat session.
     *
     * This method is used to resume streaming when a connection is interrupted
     * or when resuming a chat session. It's particularly useful for maintaining
     * continuity in long-running conversations or recovering from network issues.
     *
     * @param options - Configuration object containing:
     * @param options.chatId - Unique identifier for the chat session to reconnect to
     * @param options.headers - Additional HTTP headers to include in the reconnection request
     * @param options.body - Additional JSON properties to include in the request body
     * @param options.metadata - Custom metadata to attach to the request
     *
     * @returns Promise resolving to:
     *   - `ReadableStream<UIMessageChunk>`: If an active stream is found and can be resumed
     *   - `null`: If no active stream exists for the specified chat session (e.g., response already completed)
     *
     * @throws Error when the reconnection request fails or response is invalid
     */
    reconnectToStream: (options: {
        /** Unique identifier for the chat session to reconnect to */
        chatId: string;
    } & ChatRequestOptions) => Promise<ReadableStream<UIMessageChunk> | null>;
}

type CreateUIMessage<UI_MESSAGE extends UIMessage> = Omit<UI_MESSAGE, 'id' | 'role'> & {
    id?: UI_MESSAGE['id'];
    role?: UI_MESSAGE['role'];
};
type UIDataPartSchemas = Record<string, FlexibleSchema>;
type UIDataTypesToSchemas<T extends UIDataTypes> = {
    [K in keyof T]: FlexibleSchema<T[K]>;
};
type InferUIDataParts<T extends UIDataPartSchemas> = {
    [K in keyof T]: InferSchema<T[K]>;
};
type ChatRequestOptions = {
    /**
     * Additional headers that should be to be passed to the API endpoint.
     */
    headers?: Record<string, string> | Headers;
    /**
     * Additional body JSON properties that should be sent to the API endpoint.
     */
    body?: object;
    metadata?: unknown;
};
/**
 * Function that can be called to add a tool approval response to the chat.
 */
type ChatAddToolApproveResponseFunction = ({ id, approved, reason, options, }: {
    id: string;
    /**
     * Flag indicating whether the approval was granted or denied.
     */
    approved: boolean;
    /**
     * Optional reason for the approval or denial.
     */
    reason?: string;
    /**
     * Optional request options to be used if `sendAutomaticallyWhen` callback returns true.
     */
    options?: ChatRequestOptions;
}) => void | PromiseLike<void>;
/**
 * Function that can be called to add a tool output to the chat.
 */
type ChatAddToolOutputFunction<UI_MESSAGE extends UIMessage> = <TOOL extends keyof InferUIMessageTools<UI_MESSAGE>>({ state, tool, toolCallId, output, errorText, options, }: {
    /**
     * Name of the tool that was called.
     */
    tool: TOOL;
    /**
     * Identifier of the tool call to add output for.
     */
    toolCallId: string;
    /**
     * Optional request options to be used if `sendAutomaticallyWhen` callback returns true.
     */
    options?: ChatRequestOptions;
} & ({
    state?: 'output-available';
    output: InferUIMessageTools<UI_MESSAGE>[TOOL]['output'];
    errorText?: never;
} | {
    state: 'output-error';
    output?: never;
    errorText: string;
})) => void | PromiseLike<void>;
type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';
interface ChatState<UI_MESSAGE extends UIMessage> {
    status: ChatStatus;
    error: Error | undefined;
    messages: UI_MESSAGE[];
    pushMessage: (message: UI_MESSAGE) => void;
    popMessage: () => void;
    replaceMessage: (index: number, message: UI_MESSAGE) => void;
    snapshot: <T>(thing: T) => T;
}
type ChatOnErrorCallback = (error: Error) => void;
type ChatOnToolCallCallback<UI_MESSAGE extends UIMessage = UIMessage> = (options: {
    toolCall: InferUIMessageToolCall<UI_MESSAGE>;
}) => void | PromiseLike<void>;
type ChatOnDataCallback<UI_MESSAGE extends UIMessage> = (dataPart: DataUIPart<InferUIMessageData<UI_MESSAGE>>) => void;
/**
 * Function that is called when the assistant response has finished streaming.
 *
 * @param message The assistant message that was streamed.
 * @param messages The full chat history, including the assistant message.
 *
 * @param isAbort Indicates whether the request has been aborted.
 * @param isDisconnect Indicates whether the request has been ended by a network error.
 * @param isError Indicates whether the request has been ended by an error.
 * @param finishReason The reason why the generation finished.
 */
type ChatOnFinishCallback<UI_MESSAGE extends UIMessage> = (options: {
    message: UI_MESSAGE;
    messages: UI_MESSAGE[];
    isAbort: boolean;
    isDisconnect: boolean;
    isError: boolean;
    finishReason?: FinishReason;
}) => void;
interface ChatInit<UI_MESSAGE extends UIMessage> {
    /**
     * A unique identifier for the chat. If not provided, a random one will be
     * generated.
     */
    id?: string;
    messageMetadataSchema?: FlexibleSchema<InferUIMessageMetadata<UI_MESSAGE>>;
    dataPartSchemas?: UIDataTypesToSchemas<InferUIMessageData<UI_MESSAGE>>;
    messages?: UI_MESSAGE[];
    /**
     * A way to provide a function that is going to be used for ids for messages and the chat.
     * If not provided the default AI SDK `generateId` is used.
     */
    generateId?: IdGenerator;
    transport?: ChatTransport<UI_MESSAGE>;
    /**
     * Callback function to be called when an error is encountered.
     */
    onError?: ChatOnErrorCallback;
    /**
     * Optional callback function that is invoked when a tool call is received.
     * Intended for automatic client-side tool execution.
     *
     * You can optionally return a result for the tool call,
     * either synchronously or asynchronously.
     */
    onToolCall?: ChatOnToolCallCallback<UI_MESSAGE>;
    /**
     * Function that is called when the assistant response has finished streaming.
     */
    onFinish?: ChatOnFinishCallback<UI_MESSAGE>;
    /**
     * Optional callback function that is called when a data part is received.
     *
     * @param data The data part that was received.
     */
    onData?: ChatOnDataCallback<UI_MESSAGE>;
    /**
     * When provided, this function will be called when the stream is finished or a tool call is added
     * to determine if the current messages should be resubmitted.
     */
    sendAutomaticallyWhen?: (options: {
        messages: UI_MESSAGE[];
    }) => boolean | PromiseLike<boolean>;
}
declare abstract class AbstractChat<UI_MESSAGE extends UIMessage> {
    readonly id: string;
    readonly generateId: IdGenerator;
    protected state: ChatState<UI_MESSAGE>;
    private messageMetadataSchema;
    private dataPartSchemas;
    private readonly transport;
    private onError?;
    private onToolCall?;
    private onFinish?;
    private onData?;
    private sendAutomaticallyWhen?;
    private activeResponse;
    private jobExecutor;
    constructor({ generateId, id, transport, messageMetadataSchema, dataPartSchemas, state, onError, onToolCall, onFinish, onData, sendAutomaticallyWhen, }: Omit<ChatInit<UI_MESSAGE>, 'messages'> & {
        state: ChatState<UI_MESSAGE>;
    });
    /**
     * Hook status:
     *
     * - `submitted`: The message has been sent to the API and we're awaiting the start of the response stream.
     * - `streaming`: The response is actively streaming in from the API, receiving chunks of data.
     * - `ready`: The full response has been received and processed; a new user message can be submitted.
     * - `error`: An error occurred during the API request, preventing successful completion.
     */
    get status(): ChatStatus;
    protected setStatus({ status, error, }: {
        status: ChatStatus;
        error?: Error;
    }): void;
    get error(): Error | undefined;
    get messages(): UI_MESSAGE[];
    get lastMessage(): UI_MESSAGE | undefined;
    set messages(messages: UI_MESSAGE[]);
    /**
     * Appends or replaces a user message to the chat list. This triggers the API call to fetch
     * the assistant's response.
     *
     * If a messageId is provided, the message will be replaced.
     */
    sendMessage: (message?: (CreateUIMessage<UI_MESSAGE> & {
        text?: never;
        files?: never;
        messageId?: string;
    }) | {
        text: string;
        files?: FileList | FileUIPart[];
        metadata?: InferUIMessageMetadata<UI_MESSAGE>;
        parts?: never;
        messageId?: string;
    } | {
        files: FileList | FileUIPart[];
        metadata?: InferUIMessageMetadata<UI_MESSAGE>;
        parts?: never;
        messageId?: string;
    }, options?: ChatRequestOptions) => Promise<void>;
    /**
     * Regenerate the assistant message with the provided message id.
     * If no message id is provided, the last assistant message will be regenerated.
     */
    regenerate: ({ messageId, ...options }?: {
        messageId?: string;
    } & ChatRequestOptions) => Promise<void>;
    /**
     * Attempt to resume an ongoing streaming response.
     */
    resumeStream: (options?: ChatRequestOptions) => Promise<void>;
    /**
     * Clear the error state and set the status to ready if the chat is in an error state.
     */
    clearError: () => void;
    addToolApprovalResponse: ChatAddToolApproveResponseFunction;
    addToolOutput: ChatAddToolOutputFunction<UI_MESSAGE>;
    /** @deprecated Use addToolOutput */
    addToolResult: ChatAddToolOutputFunction<UI_MESSAGE>;
    /**
     * Abort the current request immediately, keep the generated tokens if any.
     */
    stop: () => Promise<void>;
    private shouldSendAutomatically;
    private makeRequest;
}

declare function convertFileListToFileUIParts(files: FileList | undefined): Promise<Array<FileUIPart>>;

/**
 * Converts an array of UI messages from useChat into an array of ModelMessages that can be used
 * with the AI functions (e.g. `streamText`, `generateText`).
 *
 * @param messages - The UI messages to convert.
 * @param options.tools - The tools to use.
 * @param options.ignoreIncompleteToolCalls - Whether to ignore incomplete tool calls. Default is `false`.
 * @param options.convertDataPart - Optional function to convert data parts to text or file model message parts. Returns `undefined` if the part should be ignored.
 *
 * @returns An array of ModelMessages.
 */
declare function convertToModelMessages<UI_MESSAGE extends UIMessage>(messages: Array<Omit<UI_MESSAGE, 'id'>>, options?: {
    tools?: ToolSet;
    ignoreIncompleteToolCalls?: boolean;
    convertDataPart?: (part: DataUIPart<InferUIMessageData<UI_MESSAGE>>) => TextPart | FilePart | undefined;
}): Promise<ModelMessage[]>;

type PrepareSendMessagesRequest<UI_MESSAGE extends UIMessage> = (options: {
    id: string;
    messages: UI_MESSAGE[];
    requestMetadata: unknown;
    body: Record<string, any> | undefined;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    api: string;
} & {
    trigger: 'submit-message' | 'regenerate-message';
    messageId: string | undefined;
}) => {
    body: object;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
} | PromiseLike<{
    body: object;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
}>;
type PrepareReconnectToStreamRequest = (options: {
    id: string;
    requestMetadata: unknown;
    body: Record<string, any> | undefined;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    api: string;
}) => {
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
} | PromiseLike<{
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
}>;
/**
 * Options for the `HttpChatTransport` class.
 *
 * @param UI_MESSAGE - The type of message to be used in the chat.
 */
type HttpChatTransportInitOptions<UI_MESSAGE extends UIMessage> = {
    /**
     * The API URL to be used for the chat transport.
     * Defaults to '/api/chat'.
     */
    api?: string;
    /**
     * The credentials mode to be used for the fetch request.
     * Possible values are: 'omit', 'same-origin', 'include'.
     * Defaults to 'same-origin'.
     */
    credentials?: Resolvable<RequestCredentials>;
    /**
     * HTTP headers to be sent with the API request.
     */
    headers?: Resolvable<Record<string, string> | Headers>;
    /**
     * Extra body object to be sent with the API request.
     * @example
     * Send a `sessionId` to the API along with the messages.
     * ```js
     * useChat({
     *   body: {
     *     sessionId: '123',
     *   }
     * })
     * ```
     */
    body?: Resolvable<object>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
    /**
     * When a function is provided, it will be used
     * to prepare the request body for the chat API. This can be useful for
     * customizing the request body based on the messages and data in the chat.
     */
    prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
    /**
     * When a function is provided, it will be used
     * to prepare the reconnect request for the chat API. This can be useful for
     * customizing the request based on the chat session.
     */
    prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;
};
declare abstract class HttpChatTransport<UI_MESSAGE extends UIMessage> implements ChatTransport<UI_MESSAGE> {
    protected api: string;
    protected credentials: HttpChatTransportInitOptions<UI_MESSAGE>['credentials'];
    protected headers: HttpChatTransportInitOptions<UI_MESSAGE>['headers'];
    protected body: HttpChatTransportInitOptions<UI_MESSAGE>['body'];
    protected fetch?: FetchFunction;
    protected prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
    protected prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;
    constructor({ api, credentials, headers, body, fetch, prepareSendMessagesRequest, prepareReconnectToStreamRequest, }: HttpChatTransportInitOptions<UI_MESSAGE>);
    sendMessages({ abortSignal, ...options }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>>;
    reconnectToStream(options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0]): Promise<ReadableStream<UIMessageChunk> | null>;
    protected abstract processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

declare class DefaultChatTransport<UI_MESSAGE extends UIMessage> extends HttpChatTransport<UI_MESSAGE> {
    constructor(options?: HttpChatTransportInitOptions<UI_MESSAGE>);
    protected processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

/**
 * Options for the `DirectChatTransport` class.
 */
type DirectChatTransportOptions<CALL_OPTIONS, TOOLS extends ToolSet, OUTPUT extends Output, UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>>> = {
    /**
     * The agent to use for generating responses.
     */
    agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
    /**
     * Options to pass to the agent when calling it.
     */
    options?: CALL_OPTIONS;
} & Omit<UIMessageStreamOptions<UI_MESSAGE>, 'onFinish'>;
/**
 * A transport that directly communicates with an Agent in-process,
 * without going through HTTP. This is useful for:
 * - Server-side rendering scenarios
 * - Testing without network
 * - Single-process applications
 *
 * @example
 * ```tsx
 * import { useChat } from '@ai-sdk/react';
 * import { DirectChatTransport } from 'ai';
 * import { myAgent } from './my-agent';
 *
 * const { messages, sendMessage } = useChat({
 *   transport: new DirectChatTransport({ agent: myAgent }),
 * });
 * ```
 */
declare class DirectChatTransport<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never, UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>> = UIMessage<unknown, never, InferUITools<TOOLS>>> implements ChatTransport<UI_MESSAGE> {
    private readonly agent;
    private readonly agentOptions;
    private readonly uiMessageStreamOptions;
    constructor({ agent, options, ...uiMessageStreamOptions }: DirectChatTransportOptions<CALL_OPTIONS, TOOLS, OUTPUT, UI_MESSAGE>);
    sendMessages({ messages, abortSignal, }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>>;
    /**
     * Direct transport does not support reconnection since there is no
     * persistent server-side stream to reconnect to.
     *
     * @returns Always returns `null`
     */
    reconnectToStream(_options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0]): Promise<ReadableStream<UIMessageChunk> | null>;
}

/**
 * Check if the last message is an assistant message with completed tool call approvals.
 * The last step of the message must have at least one tool approval response and
 * all tool approvals must have a response.
 */
declare function lastAssistantMessageIsCompleteWithApprovalResponses({ messages, }: {
    messages: UIMessage[];
}): boolean;

/**
 * Check if the last message is an assistant message with completed tool calls.
 * The last step of the message must have at least one tool invocation and
 * all tool invocations must have a result.
 */
declare function lastAssistantMessageIsCompleteWithToolCalls({ messages, }: {
    messages: UIMessage[];
}): boolean;

declare class TextStreamChatTransport<UI_MESSAGE extends UIMessage> extends HttpChatTransport<UI_MESSAGE> {
    constructor(options?: HttpChatTransportInitOptions<UI_MESSAGE>);
    protected processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

type CompletionRequestOptions = {
    /**
     * An optional object of headers to be passed to the API endpoint.
     */
    headers?: Record<string, string> | Headers;
    /**
     * An optional object to be passed to the API endpoint.
     */
    body?: object;
};
type UseCompletionOptions = {
    /**
     * The API endpoint that accepts a `{ prompt: string }` object and returns
     * a stream of tokens of the AI completion response. Defaults to `/api/completion`.
     */
    api?: string;
    /**
     * A unique identifier for the completion. If not provided, a random one will be
     * generated. When provided, the `useCompletion` hook with the same `id` will
     * have shared states across components.
     */
    id?: string;
    /**
     * Initial prompt input of the completion.
     */
    initialInput?: string;
    /**
     * Initial completion result. Useful to load an existing history.
     */
    initialCompletion?: string;
    /**
     * Callback function to be called when the completion is finished streaming.
     */
    onFinish?: (prompt: string, completion: string) => void;
    /**
     * Callback function to be called when an error is encountered.
     */
    onError?: (error: Error) => void;
    /**
     * The credentials mode to be used for the fetch request.
     * Possible values are: 'omit', 'same-origin', 'include'.
     * Defaults to 'same-origin'.
     */
    credentials?: RequestCredentials;
    /**
     * HTTP headers to be sent with the API request.
     */
    headers?: Record<string, string> | Headers;
    /**
     * Extra body object to be sent with the API request.
     * @example
     * Send a `sessionId` to the API along with the prompt.
     * ```js
     * useCompletion({
     *   body: {
     *     sessionId: '123',
     *   }
     * })
     * ```
     */
    body?: object;
    /**
     * Streaming protocol that is used. Defaults to `data`.
     */
    streamProtocol?: 'data' | 'text';
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
};

type SafeValidateUIMessagesResult<UI_MESSAGE extends UIMessage> = {
    success: true;
    data: Array<UI_MESSAGE>;
} | {
    success: false;
    error: Error;
};
/**
 * Validates a list of UI messages like `validateUIMessages`,
 * but instead of throwing it returns `{ success: true, data }`
 * or `{ success: false, error }`.
 */
declare function safeValidateUIMessages<UI_MESSAGE extends UIMessage>({ messages, metadataSchema, dataSchemas, tools, }: {
    messages: unknown;
    metadataSchema?: FlexibleSchema<UIMessage['metadata']>;
    dataSchemas?: {
        [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: FlexibleSchema<InferUIMessageData<UI_MESSAGE>[NAME]>;
    };
    tools?: {
        [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<InferUIMessageTools<UI_MESSAGE>[NAME]['input'], InferUIMessageTools<UI_MESSAGE>[NAME]['output']>;
    };
}): Promise<SafeValidateUIMessagesResult<UI_MESSAGE>>;
/**
 * Validates a list of UI messages.
 *
 * Metadata, data parts, and generic tool call structures are only validated if
 * the corresponding schemas are provided. Otherwise, they are assumed to be
 * valid.
 */
declare function validateUIMessages<UI_MESSAGE extends UIMessage>({ messages, metadataSchema, dataSchemas, tools, }: {
    messages: unknown;
    metadataSchema?: FlexibleSchema<UIMessage['metadata']>;
    dataSchemas?: {
        [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: FlexibleSchema<InferUIMessageData<UI_MESSAGE>[NAME]>;
    };
    tools?: {
        [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<InferUIMessageTools<UI_MESSAGE>[NAME]['input'], InferUIMessageTools<UI_MESSAGE>[NAME]['output']>;
    };
}): Promise<Array<UI_MESSAGE>>;

interface UIMessageStreamWriter<UI_MESSAGE extends UIMessage = UIMessage> {
    /**
     * Appends a data stream part to the stream.
     */
    write(part: InferUIMessageChunk<UI_MESSAGE>): void;
    /**
     * Merges the contents of another stream to this stream.
     */
    merge(stream: ReadableStream<InferUIMessageChunk<UI_MESSAGE>>): void;
    /**
     * Error handler that is used by the data stream writer.
     * This is intended for forwarding when merging streams
     * to prevent duplicated error masking.
     */
    onError: ErrorHandler | undefined;
}

/**
 * Creates a UI message stream that can be used to send messages to the client.
 *
 * @param options.execute - A function that is called with a writer to write UI message chunks to the stream.
 * @param options.onError - A function that extracts an error message from an error. Defaults to `getErrorMessage`.
 * @param options.originalMessages - The original messages. If provided, persistence mode is assumed
 *   and a message ID is provided for the response message.
 * @param options.onStepFinish - A callback that is called when each step finishes. Useful for persisting intermediate messages.
 * @param options.onFinish - A callback that is called when the stream finishes.
 * @param options.generateId - A function that generates a unique ID. Defaults to the built-in ID generator.
 *
 * @returns A `ReadableStream` of UI message chunks.
 */
declare function createUIMessageStream<UI_MESSAGE extends UIMessage>({ execute, onError, originalMessages, onStepFinish, onFinish, generateId, }: {
    execute: (options: {
        writer: UIMessageStreamWriter<UI_MESSAGE>;
    }) => Promise<void> | void;
    onError?: (error: unknown) => string;
    /**
     * The original messages. If they are provided, persistence mode is assumed,
     * and a message ID is provided for the response message.
     */
    originalMessages?: UI_MESSAGE[];
    /**
     * Callback that is called when each step finishes during multi-step agent runs.
     */
    onStepFinish?: UIMessageStreamOnStepFinishCallback<UI_MESSAGE>;
    onFinish?: UIMessageStreamOnFinishCallback<UI_MESSAGE>;
    generateId?: IdGenerator;
}): ReadableStream<InferUIMessageChunk<UI_MESSAGE>>;

/**
 * Creates a Response object from a UI message stream.
 * The stream is transformed to Server-Sent Events (SSE) format.
 *
 * @param options.status - The HTTP status code for the response.
 * @param options.statusText - The HTTP status text for the response.
 * @param options.headers - Additional HTTP headers to include in the response.
 * @param options.stream - The UI message chunk stream to send.
 * @param options.consumeSseStream - Optional callback to consume a copy of the SSE stream independently.
 *
 * @returns A `Response` object with the UI message stream as the body.
 */
declare function createUIMessageStreamResponse({ status, statusText, headers, stream, consumeSseStream, }: UIMessageStreamResponseInit & {
    stream: ReadableStream<UIMessageChunk>;
}): Response;

/**
 * A TransformStream that converts JSON objects to Server-Sent Events (SSE) format.
 * Each object is serialized to JSON and wrapped in `data: ...\n\n` format.
 * When the stream ends, a `data: [DONE]\n\n` message is sent.
 */
declare class JsonToSseTransformStream extends TransformStream<unknown, string> {
    constructor();
}

/**
 * Pipes a UI message stream to a Node.js ServerResponse object.
 * The stream is transformed to Server-Sent Events (SSE) format.
 *
 * @param options.response - The Node.js ServerResponse object to write to.
 * @param options.status - The HTTP status code for the response.
 * @param options.statusText - The HTTP status text for the response.
 * @param options.headers - Additional HTTP headers to include in the response.
 * @param options.stream - The UI message chunk stream to send.
 * @param options.consumeSseStream - Optional callback to consume a copy of the SSE stream independently.
 */
declare function pipeUIMessageStreamToResponse({ response, status, statusText, headers, stream, consumeSseStream, }: {
    response: ServerResponse;
    stream: ReadableStream<UIMessageChunk>;
} & UIMessageStreamResponseInit): void;

/**
 * Transforms a stream of `UIMessageChunk`s into an `AsyncIterableStream` of `UIMessage`s.
 *
 * @param options.message - The last assistant message to use as a starting point when the conversation is resumed. Otherwise undefined.
 * @param options.stream - The stream of `UIMessageChunk`s to read.
 * @param options.terminateOnError - Whether to terminate the stream if an error occurs.
 * @param options.onError - A function that is called when an error occurs.
 *
 * @returns An `AsyncIterableStream` of `UIMessage`s. Each stream part is a different state of the same message
 * as it is being completed.
 */
declare function readUIMessageStream<UI_MESSAGE extends UIMessage>({ message, stream, onError, terminateOnError, }: {
    message?: UI_MESSAGE;
    stream: ReadableStream<UIMessageChunk>;
    onError?: (error: unknown) => void;
    terminateOnError?: boolean;
}): AsyncIterableStream<UI_MESSAGE>;

declare const UI_MESSAGE_STREAM_HEADERS: {
    'content-type': string;
    'cache-control': string;
    connection: string;
    'x-vercel-ai-ui-message-stream': string;
    'x-accel-buffering': string;
};

/**
 * Runs the agent and stream the output as a UI message stream.
 *
 * @param agent - The agent to run.
 * @param uiMessages - The input UI messages.
 * @param abortSignal - The abort signal. Optional.
 * @param timeout - Timeout in milliseconds. Optional.
 * @param options - The options for the agent.
 * @param experimental_transform - The stream transformations. Optional.
 * @param onStepFinish - Callback that is called when each step is finished. Optional.
 *
 * @returns The UI message stream.
 */
declare function createAgentUIStream<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never, MESSAGE_METADATA = unknown>({ agent, uiMessages, options, abortSignal, timeout, experimental_transform, onStepFinish, ...uiMessageStreamOptions }: {
    agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
    uiMessages: unknown[];
    abortSignal?: AbortSignal;
    timeout?: TimeoutConfiguration;
    options?: CALL_OPTIONS;
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
} & UIMessageStreamOptions<UIMessage<MESSAGE_METADATA, never, InferUITools<TOOLS>>>): Promise<AsyncIterableStream<InferUIMessageChunk<UIMessage<MESSAGE_METADATA, never, InferUITools<TOOLS>>>>>;

/**
 * Pipes the agent UI message stream to a Node.js ServerResponse object.
 *
 * @param response - The Node.js ServerResponse object to pipe to.
 * @param agent - The agent to run.
 * @param uiMessages - The input UI messages.
 * @param abortSignal - Abort signal. Optional.
 * @param timeout - Timeout in milliseconds. Optional.
 * @param options - The options for the agent. Optional.
 * @param experimental_transform - Stream transformations. Optional.
 * @param onStepFinish - Callback that is called when each step is finished. Optional.
 * @param headers - Additional headers for the response. Optional.
 * @param status - The status code for the response. Optional.
 * @param statusText - The status text for the response. Optional.
 * @param consumeSseStream - Whether to consume the SSE stream. Optional.
 */
declare function pipeAgentUIStreamToResponse<CALL_OPTIONS = never, TOOLS extends ToolSet = {}, OUTPUT extends Output = never, MESSAGE_METADATA = unknown>({ response, headers, status, statusText, consumeSseStream, ...options }: {
    response: ServerResponse;
    agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
    uiMessages: unknown[];
    abortSignal?: AbortSignal;
    timeout?: TimeoutConfiguration;
    options?: CALL_OPTIONS;
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
} & UIMessageStreamResponseInit & UIMessageStreamOptions<UIMessage<MESSAGE_METADATA, never, InferUITools<TOOLS>>>): Promise<void>;

/**
 * The result of an `embed` call.
 * It contains the embedding, the value, and additional information.
 */
interface EmbedResult {
    /**
     * The value that was embedded.
     */
    readonly value: string;
    /**
     * The embedding of the value.
     */
    readonly embedding: Embedding;
    /**
     * The embedding token usage.
     */
    readonly usage: EmbeddingModelUsage;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Optional provider-specific metadata.
     */
    readonly providerMetadata?: ProviderMetadata;
    /**
     * Optional response data.
     */
    readonly response?: {
        /**
         * Response headers.
         */
        headers?: Record<string, string>;
        /**
         * The response body.
         */
        body?: unknown;
    };
}

/**
 * Embed a value using an embedding model. The type of the value is defined by the embedding model.
 *
 * @param model - The embedding model to use.
 * @param value - The value that should be embedded.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns A result object that contains the embedding, the value, and additional information.
 */
declare function embed({ model: modelArg, value, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, experimental_telemetry: telemetry, }: {
    /**
     * The embedding model to use.
     */
    model: EmbeddingModel;
    /**
     * The value that should be embedded.
     */
    value: string;
    /**
     * Maximum number of retries per embedding model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
}): Promise<EmbedResult>;

/**
 * The result of an `embedMany` call.
 * It contains the embeddings, the values, and additional information.
 */
interface EmbedManyResult {
    /**
     * The values that were embedded.
     */
    readonly values: Array<string>;
    /**
     * The embeddings. They are in the same order as the values.
     */
    readonly embeddings: Array<Embedding>;
    /**
     * The embedding token usage.
     */
    readonly usage: EmbeddingModelUsage;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Optional provider-specific metadata.
     */
    readonly providerMetadata?: ProviderMetadata;
    /**
     * Optional raw response data.
     */
    readonly responses?: Array<{
        /**
         * Response headers.
         */
        headers?: Record<string, string>;
        /**
         * The response body.
         */
        body?: unknown;
    } | undefined>;
}

/**
 * Embed several values using an embedding model. The type of the value is defined
 * by the embedding model.
 *
 * `embedMany` automatically splits large requests into smaller chunks if the model
 * has a limit on how many embeddings can be generated in a single call.
 *
 * @param model - The embedding model to use.
 * @param values - The values that should be embedded.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param maxParallelCalls - Maximum number of concurrent requests. Default: Infinity.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns A result object that contains the embeddings, the value, and additional information.
 */
declare function embedMany({ model: modelArg, values, maxParallelCalls, maxRetries: maxRetriesArg, abortSignal, headers, providerOptions, experimental_telemetry: telemetry, }: {
    /**
     * The embedding model to use.
     */
    model: EmbeddingModel;
    /**
     * The values that should be embedded.
     */
    values: Array<string>;
    /**
     * Maximum number of retries per embedding model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of concurrent requests.
     *
     * @default Infinity
     */
    maxParallelCalls?: number;
}): Promise<EmbedManyResult>;

declare const symbol$h: unique symbol;
declare class InvalidArgumentError extends AISDKError {
    private readonly [symbol$h];
    readonly parameter: string;
    readonly value: unknown;
    constructor({ parameter, value, message, }: {
        parameter: string;
        value: unknown;
        message: string;
    });
    static isInstance(error: unknown): error is InvalidArgumentError;
}

type SingleRequestTextStreamPart<TOOLS extends ToolSet> = {
    type: 'text-start';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    delta: string;
} | {
    type: 'text-end';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-start';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    delta: string;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    title?: string;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | ToolApprovalRequestOutput<TOOLS> | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS>) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS>) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS>) | {
    type: 'stream-start';
    warnings: SharedV3Warning[];
} | {
    type: 'response-metadata';
    id?: string;
    timestamp?: Date;
    modelId?: string;
} | {
    type: 'finish';
    finishReason: FinishReason;
    rawFinishReason: string | undefined;
    usage: LanguageModelUsage;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'raw';
    rawValue: unknown;
};

declare const symbol$g: unique symbol;
declare class InvalidStreamPartError extends AISDKError {
    private readonly [symbol$g];
    readonly chunk: SingleRequestTextStreamPart<any>;
    constructor({ chunk, message, }: {
        chunk: SingleRequestTextStreamPart<any>;
        message: string;
    });
    static isInstance(error: unknown): error is InvalidStreamPartError;
}

declare const symbol$f: unique symbol;
declare class InvalidToolApprovalError extends AISDKError {
    private readonly [symbol$f];
    readonly approvalId: string;
    constructor({ approvalId }: {
        approvalId: string;
    });
    static isInstance(error: unknown): error is InvalidToolApprovalError;
}

declare const symbol$e: unique symbol;
declare class ToolCallNotFoundForApprovalError extends AISDKError {
    private readonly [symbol$e];
    readonly toolCallId: string;
    readonly approvalId: string;
    constructor({ toolCallId, approvalId, }: {
        toolCallId: string;
        approvalId: string;
    });
    static isInstance(error: unknown): error is ToolCallNotFoundForApprovalError;
}

declare const symbol$d: unique symbol;
declare class MissingToolResultsError extends AISDKError {
    private readonly [symbol$d];
    readonly toolCallIds: string[];
    constructor({ toolCallIds }: {
        toolCallIds: string[];
    });
    static isInstance(error: unknown): error is MissingToolResultsError;
}

declare const symbol$c: unique symbol;
/**
 * Thrown when no image could be generated. This can have multiple causes:
 *
 * - The model failed to generate a response.
 * - The model generated a response that could not be parsed.
 */
declare class NoImageGeneratedError extends AISDKError {
    private readonly [symbol$c];
    /**
     * The response metadata for each call.
     */
    readonly responses: Array<ImageModelResponseMetadata> | undefined;
    constructor({ message, cause, responses, }: {
        message?: string;
        cause?: Error;
        responses?: Array<ImageModelResponseMetadata>;
    });
    static isInstance(error: unknown): error is NoImageGeneratedError;
}

declare const symbol$b: unique symbol;
/**
 * Thrown when no object could be generated. This can have several causes:
 *
 * - The model failed to generate a response.
 * - The model generated a response that could not be parsed.
 * - The model generated a response that could not be validated against the schema.
 *
 * The error contains the following properties:
 *
 * - `text`: The text that was generated by the model. This can be the raw text or the tool call text, depending on the model.
 */
declare class NoObjectGeneratedError extends AISDKError {
    private readonly [symbol$b];
    /**
     * The text that was generated by the model. This can be the raw text or the tool call text, depending on the model.
     */
    readonly text: string | undefined;
    /**
     * The response metadata.
     */
    readonly response: LanguageModelResponseMetadata | undefined;
    /**
     * The usage of the model.
     */
    readonly usage: LanguageModelUsage | undefined;
    /**
     * Reason why the model finished generating a response.
     */
    readonly finishReason: FinishReason | undefined;
    constructor({ message, cause, text, response, usage, finishReason, }: {
        message?: string;
        cause?: Error;
        text?: string;
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
    });
    static isInstance(error: unknown): error is NoObjectGeneratedError;
}

declare const symbol$a: unique symbol;
/**
 * Thrown when no LLM output was generated, e.g. because of errors.
 */
declare class NoOutputGeneratedError extends AISDKError {
    private readonly [symbol$a];
    constructor({ message, cause, }?: {
        message?: string;
        cause?: Error;
    });
    static isInstance(error: unknown): error is NoOutputGeneratedError;
}

declare const symbol$9: unique symbol;
/**
 * Error that is thrown when no speech audio was generated.
 */
declare class NoSpeechGeneratedError extends AISDKError {
    private readonly [symbol$9];
    readonly responses: Array<SpeechModelResponseMetadata>;
    constructor(options: {
        responses: Array<SpeechModelResponseMetadata>;
    });
    static isInstance(error: unknown): error is NoSpeechGeneratedError;
}

declare const symbol$8: unique symbol;
/**
 * Error that is thrown when no transcript was generated.
 */
declare class NoTranscriptGeneratedError extends AISDKError {
    private readonly [symbol$8];
    readonly responses: Array<TranscriptionModelResponseMetadata>;
    constructor(options: {
        responses: Array<TranscriptionModelResponseMetadata>;
    });
    static isInstance(error: unknown): error is NoTranscriptGeneratedError;
}

/**
 * Response metadata for a video model call.
 */
type VideoModelResponseMetadata = {
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
    headers?: Record<string, string>;
    /**
     * Provider-specific metadata for this call.
     * When multiple calls are made (n > maxVideosPerCall), each response
     * contains its own providerMetadata, allowing lossless per-call access.
     */
    providerMetadata?: SharedV3ProviderMetadata;
};

declare const symbol$7: unique symbol;
declare class NoVideoGeneratedError extends AISDKError {
    private readonly [symbol$7];
    readonly responses: Array<VideoModelResponseMetadata>;
    constructor({ message, cause, responses, }: {
        message?: string;
        cause?: unknown;
        responses: Array<VideoModelResponseMetadata>;
    });
    static isInstance(error: unknown): error is NoVideoGeneratedError;
    /**
     * @deprecated use `isInstance` instead
     */
    static isNoVideoGeneratedError(error: unknown): error is NoVideoGeneratedError;
    /**
     * @deprecated Do not use this method. It will be removed in the next major version.
     */
    toJSON(): {
        name: string;
        message: string;
        stack: string | undefined;
        cause: unknown;
        responses: VideoModelResponseMetadata[];
    };
}

declare const symbol$6: unique symbol;
declare class ToolCallRepairError extends AISDKError {
    private readonly [symbol$6];
    readonly originalError: NoSuchToolError | InvalidToolInputError;
    constructor({ cause, originalError, message, }: {
        message?: string;
        cause: unknown;
        originalError: NoSuchToolError | InvalidToolInputError;
    });
    static isInstance(error: unknown): error is ToolCallRepairError;
}

/**
 * Error that is thrown when a model with an unsupported version is used.
 */
declare class UnsupportedModelVersionError extends AISDKError {
    readonly version: string;
    readonly provider: string;
    readonly modelId: string;
    constructor(options: {
        version: string;
        provider: string;
        modelId: string;
    });
}

declare const symbol$5: unique symbol;
/**
 * Error thrown when a UI message stream contains invalid or out-of-sequence chunks.
 *
 * This typically occurs when:
 * - A delta chunk is received without a corresponding start chunk
 * - An end chunk is received without a corresponding start chunk
 * - A tool invocation is not found for the given toolCallId
 *
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-ui-message-stream-error
 */
declare class UIMessageStreamError extends AISDKError {
    private readonly [symbol$5];
    /**
     * The type of chunk that caused the error (e.g., 'text-delta', 'reasoning-end').
     */
    readonly chunkType: string;
    /**
     * The ID associated with the failing chunk (part ID or toolCallId).
     */
    readonly chunkId: string;
    constructor({ chunkType, chunkId, message, }: {
        chunkType: string;
        chunkId: string;
        message: string;
    });
    static isInstance(error: unknown): error is UIMessageStreamError;
}

declare const symbol$4: unique symbol;
declare class InvalidDataContentError extends AISDKError {
    private readonly [symbol$4];
    readonly content: unknown;
    constructor({ content, cause, message, }: {
        content: unknown;
        cause?: unknown;
        message?: string;
    });
    static isInstance(error: unknown): error is InvalidDataContentError;
}

declare const symbol$3: unique symbol;
declare class InvalidMessageRoleError extends AISDKError {
    private readonly [symbol$3];
    readonly role: string;
    constructor({ role, message, }: {
        role: string;
        message?: string;
    });
    static isInstance(error: unknown): error is InvalidMessageRoleError;
}

declare const symbol$2: unique symbol;
declare class MessageConversionError extends AISDKError {
    private readonly [symbol$2];
    readonly originalMessage: Omit<UIMessage, 'id'>;
    constructor({ originalMessage, message, }: {
        originalMessage: Omit<UIMessage, 'id'>;
        message: string;
    });
    static isInstance(error: unknown): error is MessageConversionError;
}

declare const symbol$1: unique symbol;
type RetryErrorReason = 'maxRetriesExceeded' | 'errorNotRetryable' | 'abort';
declare class RetryError extends AISDKError {
    private readonly [symbol$1];
    readonly reason: RetryErrorReason;
    readonly lastError: unknown;
    readonly errors: Array<unknown>;
    constructor({ message, reason, errors, }: {
        message: string;
        reason: RetryErrorReason;
        errors: Array<unknown>;
    });
    static isInstance(error: unknown): error is RetryError;
}

/**
 * The result of a `generateImage` call.
 * It contains the images and additional information.
 */
interface GenerateImageResult {
    /**
     * The first image that was generated.
     */
    readonly image: GeneratedFile;
    /**
     * The images that were generated.
     */
    readonly images: Array<GeneratedFile>;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<ImageModelResponseMetadata>;
    /**
     * Provider-specific metadata. They are passed through from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ImageModelProviderMetadata;
    /**
     * Combined token usage across all underlying provider calls for this image generation.
     */
    readonly usage: ImageModelUsage;
}

type GenerateImagePrompt = string | {
    images: Array<DataContent>;
    text?: string;
    mask?: DataContent;
};
/**
 * Generates images using an image model.
 *
 * @param model - The image model to use.
 * @param prompt - The prompt that should be used to generate the image.
 * @param n - Number of images to generate. Default: 1.
 * @param maxImagesPerCall - Maximum number of images to generate in a single API call.
 * @param size - Size of the images to generate. Must have the format `{width}x{height}`.
 * @param aspectRatio - Aspect ratio of the images to generate. Must have the format `{width}:{height}`.
 * @param seed - Seed for the image generation.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated images.
 */
declare function generateImage({ model: modelArg, prompt: promptArg, n, maxImagesPerCall, size, aspectRatio, seed, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, }: {
    /**
     * The image model to use.
     */
    model: ImageModel;
    /**
     * The prompt that should be used to generate the image.
     */
    prompt: GenerateImagePrompt;
    /**
     * Number of images to generate.
     */
    n?: number;
    /**
     * Maximum number of images to generate in a single API call. If not provided, the model's default will be used.
     */
    maxImagesPerCall?: number;
    /**
     * Size of the images to generate. Must have the format `{width}x{height}`. If not provided, the default size will be used.
     */
    size?: `${number}x${number}`;
    /**
     * Aspect ratio of the images to generate. Must have the format `{width}:{height}`. If not provided, the default aspect ratio will be used.
     */
    aspectRatio?: `${number}:${number}`;
    /**
     * Seed for the image generation. If not provided, the default seed will be used.
     */
    seed?: number;
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
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of retries per image model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
}): Promise<GenerateImageResult>;

/**
 * @deprecated Use `generateImage` instead.
 */
declare const experimental_generateImage: typeof generateImage;

/**
 * @deprecated Use `GenerateImageResult` instead.
 */
type Experimental_GenerateImageResult = GenerateImageResult;

/**
 * The result of a `generateObject` call.
 */
interface GenerateObjectResult<OBJECT> {
    /**
     * The generated object (typed according to the schema).
     */
    readonly object: OBJECT;
    /**
     * The reasoning that was used to generate the object.
     * Concatenated from all reasoning parts.
     */
    readonly reasoning: string | undefined;
    /**
     * The reason why the generation finished.
     */
    readonly finishReason: FinishReason;
    /**
     * The token usage of the generated response.
     */
    readonly usage: LanguageModelUsage;
    /**
     * Warnings from the model provider (e.g. unsupported settings).
     */
    readonly warnings: CallWarning[] | undefined;
    /**
     * Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
     * Additional response information.
     */
    readonly response: LanguageModelResponseMetadata & {
        /**
         * Response body (available only for providers that use HTTP requests).
         */
        body?: unknown;
    };
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
    /**
     * Converts the object to a JSON response.
     * The response will have a status code of 200 and a content type of `application/json; charset=utf-8`.
     */
    toJsonResponse(init?: ResponseInit): Response;
}

/**
 * A function that attempts to repair the raw output of the model
 * to enable JSON parsing.
 *
 * Should return the repaired text or null if the text cannot be repaired.
 */
type RepairTextFunction = (options: {
    text: string;
    error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;

/**
 * Generate a structured, typed object for a given prompt and schema using a language model.
 *
 * This function does not stream the output. If you want to stream the output, use `streamObject` instead.
 *
 * @param model - The language model to use.
 *
 * @param system - A system message that will be part of the prompt.
 * @param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
 * @param messages - A list of messages. You can either use `prompt` or `messages` but not both.
 *
 * @param maxOutputTokens - Maximum number of tokens to generate.
 * @param temperature - Temperature setting.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topP - Nucleus sampling.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topK - Only sample from the top K options for each subsequent token.
 * Used to remove "long tail" low probability responses.
 * Recommended for advanced use cases only. You usually only need to use temperature.
 * @param presencePenalty - Presence penalty setting.
 * It affects the likelihood of the model to repeat information that is already in the prompt.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param frequencyPenalty - Frequency penalty setting.
 * It affects the likelihood of the model to repeatedly use the same words or phrases.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param stopSequences - Stop sequences.
 * If set, the model will stop generating text when one of the stop sequences is generated.
 * @param seed - The seed (integer) to use for random sampling.
 * If set and supported by the model, calls will generate deterministic results.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param schema - The schema of the object that the model should generate.
 * @param schemaName - Optional name of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema name.
 * @param schemaDescription - Optional description of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema description.
 *
 * @param output - The type of the output.
 *
 * - 'object': The output is an object.
 * - 'array': The output is an array.
 * - 'enum': The output is an enum.
 * - 'no-schema': The output is not a schema.
 *
 * @param experimental_repairText - A function that attempts to repair the raw output of the model
 * to enable JSON parsing.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns
 * A result object that contains the generated object, the finish reason, the token usage, and additional information.
 *
 * @deprecated Use `generateText` with an `output` setting instead.
 */
declare function generateObject<SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue$1>, OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema' = InferSchema<SCHEMA> extends string ? 'enum' : 'object', RESULT = OUTPUT extends 'array' ? Array<InferSchema<SCHEMA>> : InferSchema<SCHEMA>>(options: Omit<CallSettings, 'stopSequences'> & Prompt & (OUTPUT extends 'enum' ? {
    /**
     * The enum values that the model should use.
     */
    enum: Array<RESULT>;
    output: 'enum';
} : OUTPUT extends 'no-schema' ? {} : {
    /**
     * The schema of the object that the model should generate.
     */
    schema: SCHEMA;
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g.
     * via tool or schema name.
     */
    schemaName?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g.
     * via tool or schema description.
     */
    schemaDescription?: string;
}) & {
    output?: OUTPUT;
    /**
     * The language model to use.
     */
    model: LanguageModel;
    /**
     * A function that attempts to repair the raw output of the model
     * to enable JSON parsing.
     */
    experimental_repairText?: RepairTextFunction;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
    };
}): Promise<GenerateObjectResult<RESULT>>;

/**
 * Consumes a ReadableStream until it's fully read.
 *
 * This function reads the stream chunk by chunk until the stream is exhausted.
 * It doesn't process or return the data from the stream; it simply ensures
 * that the entire stream is read.
 *
 * @param options - The options for consuming the stream.
 * @param options.stream - The ReadableStream to be consumed.
 * @param options.onError - Optional callback to handle errors that occur during consumption.
 * @returns A promise that resolves when the stream is fully consumed.
 */
declare function consumeStream({ stream, onError, }: {
    stream: ReadableStream;
    onError?: (error: unknown) => void;
}): Promise<void>;

/**
 * Calculates the cosine similarity between two vectors. This is a useful metric for
 * comparing the similarity of two vectors such as embeddings.
 *
 * @param vector1 - The first vector.
 * @param vector2 - The second vector.
 *
 * @returns The cosine similarity between vector1 and vector2, or 0 if either vector is the zero vector.
 *
 * @throws {InvalidArgumentError} If the vectors do not have the same length.
 */
declare function cosineSimilarity(vector1: number[], vector2: number[]): number;

/**
 * Creates a download function with configurable options.
 *
 * @param options - Configuration options for the download function.
 * @param options.maxBytes - Maximum allowed download size in bytes. Default: 2 GiB.
 * @returns A download function that can be passed to `transcribe()` or `experimental_generateVideo()`.
 */
declare function createDownload(options?: {
    maxBytes?: number;
}): ({ url, abortSignal }: {
    url: URL;
    abortSignal?: AbortSignal;
}) => Promise<{
    data: Uint8Array<ArrayBufferLike>;
    mediaType: string | undefined;
}>;

/**
 * Converts a data URL of type text/* to a text string.
 */
declare function getTextFromDataUrl(dataUrl: string): string;

/**
 * Performs a deep-equal comparison of two parsed JSON objects.
 *
 * @param {any} obj1 - The first object to compare.
 * @param {any} obj2 - The second object to compare.
 * @returns {boolean} - Returns true if the two objects are deeply equal, false otherwise.
 */
declare function isDeepEqualData(obj1: any, obj2: any): boolean;

declare function parsePartialJson(jsonText: string | undefined): Promise<{
    value: JSONValue$1 | undefined;
    state: 'undefined-input' | 'successful-parse' | 'repaired-parse' | 'failed-parse';
}>;

type Job = () => Promise<void>;

declare class SerialJobExecutor {
    private queue;
    private isProcessing;
    private processQueue;
    run(job: Job): Promise<void>;
}

/**
 * Creates a ReadableStream that emits the provided values with an optional delay between each value.
 *
 * @param options - The configuration options
 * @param options.chunks - Array of values to be emitted by the stream
 * @param options.initialDelayInMs - Optional initial delay in milliseconds before emitting the first value (default: 0). Can be set to `null` to skip the initial delay. The difference between `initialDelayInMs: null` and `initialDelayInMs: 0` is that `initialDelayInMs: null` will emit the values without any delay, while `initialDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @param options.chunkDelayInMs - Optional delay in milliseconds between emitting each value (default: 0). Can be set to `null` to skip the delay. The difference between `chunkDelayInMs: null` and `chunkDelayInMs: 0` is that `chunkDelayInMs: null` will emit the values without any delay, while `chunkDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @returns A ReadableStream that emits the provided values
 */
declare function simulateReadableStream<T>({ chunks, initialDelayInMs, chunkDelayInMs, _internal, }: {
    chunks: T[];
    initialDelayInMs?: number | null;
    chunkDelayInMs?: number | null;
    _internal?: {
        delay?: (ms: number | null) => Promise<void>;
    };
}): ReadableStream<T>;

/**
 * The result of a `streamObject` call that contains the partial object stream and additional information.
 */
interface StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM> {
    /**
     * Warnings from the model provider (e.g. unsupported settings)
     */
    readonly warnings: Promise<CallWarning[] | undefined>;
    /**
     * The token usage of the generated response. Resolved when the response is finished.
     */
    readonly usage: Promise<LanguageModelUsage>;
    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: Promise<ProviderMetadata | undefined>;
    /**
     * Additional request information from the last step.
     */
    readonly request: Promise<LanguageModelRequestMetadata>;
    /**
     * Additional response information.
     */
    readonly response: Promise<LanguageModelResponseMetadata>;
    /**
     * The reason why the generation finished. Taken from the last step.
     *
     * Resolved when the response is finished.
     */
    readonly finishReason: Promise<FinishReason>;
    /**
     * The generated object (typed according to the schema). Resolved when the response is finished.
     */
    readonly object: Promise<RESULT>;
    /**
     * Stream of partial objects. It gets more complete as the stream progresses.
     *
     * Note that the partial object is not validated.
     * If you want to be certain that the actual content matches your schema, you need to implement your own validation for partial results.
     */
    readonly partialObjectStream: AsyncIterableStream<PARTIAL>;
    /**
     * Stream over complete array elements. Only available if the output strategy is set to `array`.
     */
    readonly elementStream: ELEMENT_STREAM;
    /**
     * Text stream of the JSON representation of the generated object. It contains text chunks.
     * When the stream is finished, the object is valid JSON that can be parsed.
     */
    readonly textStream: AsyncIterableStream<string>;
    /**
     * Stream of different types of events, including partial objects, errors, and finish events.
     * Only errors that stop the stream, such as network errors, are thrown.
     */
    readonly fullStream: AsyncIterableStream<ObjectStreamPart<PARTIAL>>;
    /**
     * Writes text delta output to a Node.js response-like object.
     * It sets a `Content-Type` header to `text/plain; charset=utf-8` and
     * writes each text delta as a separate chunk.
     *
     * @param response A Node.js response-like object (ServerResponse).
     * @param init Optional headers, status code, and status text.
     */
    pipeTextStreamToResponse(response: ServerResponse$1, init?: ResponseInit): void;
    /**
     * Creates a simple text stream response.
     * The response has a `Content-Type` header set to `text/plain; charset=utf-8`.
     * Each text delta is encoded as UTF-8 and sent as a separate chunk.
     * Non-text-delta events are ignored.
     *
     * @param init Optional headers, status code, and status text.
     */
    toTextStreamResponse(init?: ResponseInit): Response;
}
type ObjectStreamPart<PARTIAL> = {
    type: 'object';
    object: PARTIAL;
} | {
    type: 'text-delta';
    textDelta: string;
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'finish';
    finishReason: FinishReason;
    usage: LanguageModelUsage;
    response: LanguageModelResponseMetadata;
    providerMetadata?: ProviderMetadata;
};

/**
 * Callback that is set using the `onError` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamObjectOnErrorCallback = (event: {
    error: unknown;
}) => Promise<void> | void;
/**
 * Callback that is set using the `onFinish` option.
 *
 * @param event - The event that is passed to the callback.
 */
type StreamObjectOnFinishCallback<RESULT> = (event: {
    /**
     * The token usage of the generated response.
     */
    usage: LanguageModelUsage;
    /**
     * The generated object. Can be undefined if the final object does not match the schema.
     */
    object: RESULT | undefined;
    /**
     * Optional error object. This is e.g. a TypeValidationError when the final object does not match the schema.
     */
    error: unknown | undefined;
    /**
     * Response metadata.
     */
    response: LanguageModelResponseMetadata;
    /**
     * Warnings from the model provider (e.g. unsupported settings).
     */
    warnings?: CallWarning[];
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerMetadata: ProviderMetadata | undefined;
}) => Promise<void> | void;
/**
 * Generate a structured, typed object for a given prompt and schema using a language model.
 *
 * This function streams the output. If you do not want to stream the output, use `generateObject` instead.
 *
 * @param model - The language model to use.
 *
 * @param system - A system message that will be part of the prompt.
 * @param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
 * @param messages - A list of messages. You can either use `prompt` or `messages` but not both.
 *
 * @param maxOutputTokens - Maximum number of tokens to generate.
 * @param temperature - Temperature setting.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topP - Nucleus sampling.
 * The value is passed through to the provider. The range depends on the provider and model.
 * It is recommended to set either `temperature` or `topP`, but not both.
 * @param topK - Only sample from the top K options for each subsequent token.
 * Used to remove "long tail" low probability responses.
 * Recommended for advanced use cases only. You usually only need to use temperature.
 * @param presencePenalty - Presence penalty setting.
 * It affects the likelihood of the model to repeat information that is already in the prompt.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param frequencyPenalty - Frequency penalty setting.
 * It affects the likelihood of the model to repeatedly use the same words or phrases.
 * The value is passed through to the provider. The range depends on the provider and model.
 * @param stopSequences - Stop sequences.
 * If set, the model will stop generating text when one of the stop sequences is generated.
 * @param seed - The seed (integer) to use for random sampling.
 * If set and supported by the model, calls will generate deterministic results.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @param schema - The schema of the object that the model should generate.
 * @param schemaName - Optional name of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema name.
 * @param schemaDescription - Optional description of the output that should be generated.
 * Used by some providers for additional LLM guidance, e.g.
 * via tool or schema description.
 *
 * @param output - The type of the output.
 *
 * - 'object': The output is an object.
 * - 'array': The output is an array.
 * - 'enum': The output is an enum.
 * - 'no-schema': The output is not a schema.
 *
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @param providerOptions - Additional provider-specific options. They are passed through
 * to the provider from the AI SDK and enable provider-specific
 * functionality that can be fully encapsulated in the provider.
 *
 * @returns
 * A result object for accessing the partial object stream and additional information.
 *
 * @deprecated Use `streamText` with an `output` setting instead.
 */
declare function streamObject<SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue$1>, OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema' = InferSchema<SCHEMA> extends string ? 'enum' : 'object', RESULT = OUTPUT extends 'array' ? Array<InferSchema<SCHEMA>> : InferSchema<SCHEMA>>(options: Omit<CallSettings, 'stopSequences'> & Prompt & (OUTPUT extends 'enum' ? {
    /**
     * The enum values that the model should use.
     */
    enum: Array<RESULT>;
    output: 'enum';
} : OUTPUT extends 'no-schema' ? {} : {
    /**
     * The schema of the object that the model should generate.
     */
    schema: SCHEMA;
    /**
     * Optional name of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g.
     * via tool or schema name.
     */
    schemaName?: string;
    /**
     * Optional description of the output that should be generated.
     * Used by some providers for additional LLM guidance, e.g.
     * via tool or schema description.
     */
    schemaDescription?: string;
}) & {
    output?: OUTPUT;
    /**
     * The language model to use.
     */
    model: LanguageModel;
    /**
     * A function that attempts to repair the raw output of the model
     * to enable JSON parsing.
     */
    experimental_repairText?: RepairTextFunction;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Custom download function to use for URLs.
     *
     * By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
     * Callback that is invoked when an error occurs during streaming.
     * You can use it to log errors.
     * The stream processing will pause until the callback promise is resolved.
     */
    onError?: StreamObjectOnErrorCallback;
    /**
     * Callback that is called when the LLM response and the final object validation are finished.
     */
    onFinish?: StreamObjectOnFinishCallback<RESULT>;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
        now?: () => number;
    };
}): StreamObjectResult<OUTPUT extends 'enum' ? string : OUTPUT extends 'array' ? RESULT : DeepPartial<RESULT>, OUTPUT extends 'array' ? RESULT : RESULT, OUTPUT extends 'array' ? RESULT extends Array<infer U> ? AsyncIterableStream<U> : never : never>;

/**
 * A generated audio file.
 */
interface GeneratedAudioFile extends GeneratedFile {
    /**
     * Audio format of the file (e.g., 'mp3', 'wav', etc.)
     */
    readonly format: string;
}

/**
 * The result of a `generateSpeech` call.
 * It contains the audio data and additional information.
 */
interface SpeechResult {
    /**
     * The generated audio file with the audio data.
     */
    readonly audio: GeneratedAudioFile;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<SpeechModelResponseMetadata>;
    /**
     * Provider metadata from the provider.
     */
    readonly providerMetadata: Record<string, JSONObject>;
}

/**
 * Generates speech audio using a speech model.
 *
 * @param model - The speech model to use.
 * @param text - The text to convert to speech.
 * @param voice - The voice to use for speech generation.
 * @param outputFormat - The output format to use for speech generation e.g. "mp3", "wav", etc.
 * @param instructions - Instructions for the speech generation e.g. "Speak in a slow and steady tone".
 * @param speed - The speed of the speech generation.
 * @param language - The language for speech generation (ISO 639-1 code e.g. "en", "es", "fr") or "auto" for automatic detection.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated audio data.
 */
declare function generateSpeech({ model, text, voice, outputFormat, instructions, speed, language, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, }: {
    /**
     * The speech model to use.
     */
    model: SpeechModel;
    /**
     * The text to convert to speech.
     */
    text: string;
    /**
     * The voice to use for speech generation.
     */
    voice?: string;
    /**
     * The desired output format for the audio e.g. "mp3", "wav", etc.
     */
    outputFormat?: 'mp3' | 'wav' | (string & {});
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
     * "openai": {}
     * }
     * ```
     */
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of retries per speech model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
}): Promise<SpeechResult>;

/**
 * A video model can be a string (model ID) or a Experimental_VideoModelV3 object.
 */
type VideoModel = string | Experimental_VideoModelV3;
type VideoModelProviderMetadata = SharedV3ProviderMetadata;

/**
 * The result of an `experimental_generateVideo` call.
 * Contains the generated video and additional information.
 */
interface GenerateVideoResult {
    /**
     * The first video that was generated.
     */
    readonly video: GeneratedFile;
    /**
     * All videos that were generated.
     */
    readonly videos: Array<GeneratedFile>;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Response metadata from the provider.
     * May contain multiple responses if multiple calls were made.
     */
    readonly responses: Array<VideoModelResponseMetadata>;
    /**
     * Provider-specific metadata passed through from the provider.
     */
    readonly providerMetadata: VideoModelProviderMetadata;
}

type GenerateVideoPrompt = string | {
    image: DataContent;
    text?: string;
};
declare function experimental_generateVideo({ model: modelArg, prompt: promptArg, n, maxVideosPerCall, aspectRatio, resolution, duration, fps, seed, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, download: downloadFn, }: {
    /**
     * The video model to use.
     */
    model: VideoModel;
    /**
     * The prompt that should be used to generate the video.
     */
    prompt: GenerateVideoPrompt;
    /**
     * Number of videos to generate.
     */
    n?: number;
    /**
     * Maximum number of videos per API call. If not provided, the model's default will be used.
     */
    maxVideosPerCall?: number;
    /**
     * Aspect ratio of the videos to generate. Must have the format `{width}:{height}`.
     */
    aspectRatio?: `${number}:${number}`;
    /**
     * Resolution of the videos to generate. Must have the format `{width}x{height}`.
     */
    resolution?: `${number}x${number}`;
    /**
     * Duration of the video in seconds.
     */
    duration?: number;
    /**
     * Frames per second for the video.
     */
    fps?: number;
    /**
     * Seed for the video generation.
     */
    seed?: number;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     */
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of retries per video model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
    /**
     * Custom download function for fetching videos from URLs.
     * Use `createDownload()` from `ai` to create a download function with custom size limits.
     *
     * @default createDownload() (2 GiB limit)
     */
    download?: (options: {
        url: URL;
        abortSignal?: AbortSignal;
    }) => Promise<{
        data: Uint8Array;
        mediaType: string | undefined;
    }>;
}): Promise<GenerateVideoResult>;

/**
 * A function for logging warnings.
 *
 * You can assign it to the `AI_SDK_LOG_WARNINGS` global variable to use it as the default warning logger.
 *
 * @example
 * ```ts
 * globalThis.AI_SDK_LOG_WARNINGS = (options) => {
 *   console.log('WARNINGS:', options.warnings, options.provider, options.model);
 * };
 * ```
 */
type LogWarningsFunction = (options: {
    /**
     * The warnings returned by the model provider.
     */
    warnings: Warning[];
    /**
     * The provider id used for the call.
     */
    provider: string;
    /**
     * The model id used for the call.
     */
    model: string;
}) => void;

/**
 * Applies default settings for an embedding model.
 */
declare function defaultEmbeddingSettingsMiddleware({ settings, }: {
    settings: Partial<{
        headers?: EmbeddingModelV3CallOptions['headers'];
        providerOptions?: EmbeddingModelV3CallOptions['providerOptions'];
    }>;
}): EmbeddingModelMiddleware;

/**
 * Applies default settings for a language model.
 */
declare function defaultSettingsMiddleware({ settings, }: {
    settings: Partial<{
        maxOutputTokens?: LanguageModelV3CallOptions['maxOutputTokens'];
        temperature?: LanguageModelV3CallOptions['temperature'];
        stopSequences?: LanguageModelV3CallOptions['stopSequences'];
        topP?: LanguageModelV3CallOptions['topP'];
        topK?: LanguageModelV3CallOptions['topK'];
        presencePenalty?: LanguageModelV3CallOptions['presencePenalty'];
        frequencyPenalty?: LanguageModelV3CallOptions['frequencyPenalty'];
        responseFormat?: LanguageModelV3CallOptions['responseFormat'];
        seed?: LanguageModelV3CallOptions['seed'];
        tools?: LanguageModelV3CallOptions['tools'];
        toolChoice?: LanguageModelV3CallOptions['toolChoice'];
        headers?: LanguageModelV3CallOptions['headers'];
        providerOptions?: LanguageModelV3CallOptions['providerOptions'];
    }>;
}): LanguageModelMiddleware;

/**
 * Middleware that extracts JSON from text content by stripping
 * markdown code fences and other formatting.
 *
 * This is useful when using Output.object() with models that wrap
 * JSON responses in markdown code blocks.
 *
 * @param options - Configuration options for the middleware.
 * @param options.transform - Custom transform function. If provided, this will be
 * used instead of the default markdown fence stripping.
 */
declare function extractJsonMiddleware(options?: {
    /**
     * Custom transform function to apply to text content.
     * Receives the raw text and should return the transformed text.
     * If not provided, the default transform strips markdown code fences.
     */
    transform?: (text: string) => string;
}): LanguageModelMiddleware;

/**
 * Extracts an XML-tagged reasoning section from the generated text and exposes it
 * as a `reasoning` property on the result.
 *
 * @param tagName - The name of the XML tag to extract reasoning from.
 * @param separator - The separator to use between reasoning and text sections.
 * @param startWithReasoning - Whether to start with reasoning tokens.
 */
declare function extractReasoningMiddleware({ tagName, separator, startWithReasoning, }: {
    tagName: string;
    separator?: string;
    startWithReasoning?: boolean;
}): LanguageModelMiddleware;

/**
 * Simulates streaming chunks with the response from a generate call.
 */
declare function simulateStreamingMiddleware(): LanguageModelMiddleware;

/**
 * Middleware that appends input examples to tool descriptions.
 *
 * This is useful for providers that don't natively support the `inputExamples`
 * property. The middleware serializes examples into the tool's description text.
 *
 * @param options - Configuration options for the middleware.
 * @param options.prefix - A prefix to prepend before the examples. Default: 'Input Examples:'
 * @param options.format - Optional custom formatter for each example.
 *   Receives the example object and its index. Default: JSON.stringify(example.input)
 * @param options.remove - Whether to remove the inputExamples property
 *   after adding them to the description. Default: true
 *
 * @example
 * ```ts
 * import { wrapLanguageModel, addToolInputExamplesMiddleware } from 'ai';
 *
 * const model = wrapLanguageModel({
 *   model: yourModel,
 *   middleware: addToolInputExamplesMiddleware(),
 * });
 * ```
 */
declare function addToolInputExamplesMiddleware({ prefix, format, remove, }?: {
    /**
     * A prefix to prepend before the examples.
     */
    prefix?: string;
    /**
     * Optional custom formatter for each example.
     * Receives the example object and its index.
     * Default: JSON.stringify(example.input)
     */
    format?: (example: {
        input: JSONObject;
    }, index: number) => string;
    /**
     * Whether to remove the inputExamples property after adding them to the description.
     * Default: true
     */
    remove?: boolean;
}): LanguageModelMiddleware;

/**
 * Wraps a LanguageModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters,
 * wrap generate operations, and wrap stream operations of a language model.
 *
 * @param options - Configuration options for wrapping the language model.
 * @param options.model - The original LanguageModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the language model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new LanguageModelV3 instance with middleware applied.
 */
declare const wrapLanguageModel: ({ model, middleware: middlewareArg, modelId, providerId, }: {
    model: LanguageModelV3;
    middleware: LanguageModelMiddleware | LanguageModelMiddleware[];
    modelId?: string;
    providerId?: string;
}) => LanguageModelV3;

/**
 * Wraps an EmbeddingModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters,
 * wrap embed operations of an embedding model.
 *
 * @param options - Configuration options for wrapping the embedding model.
 * @param options.model - The original EmbeddingModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the embedding model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new EmbeddingModelV3 instance with middleware applied.
 */
declare const wrapEmbeddingModel: ({ model, middleware: middlewareArg, modelId, providerId, }: {
    model: EmbeddingModelV3;
    middleware: EmbeddingModelMiddleware | EmbeddingModelMiddleware[];
    modelId?: string;
    providerId?: string;
}) => EmbeddingModelV3;

/**
 * Wraps an ImageModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters
 * and wrap generate operations of an image model.
 *
 * @param options - Configuration options for wrapping the image model.
 * @param options.model - The original ImageModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the image model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new ImageModelV3 instance with middleware applied.
 */
declare const wrapImageModel: ({ model, middleware: middlewareArg, modelId, providerId, }: {
    model: ImageModelV3;
    middleware: ImageModelMiddleware | ImageModelMiddleware[];
    modelId?: string;
    providerId?: string;
}) => ImageModelV3;

/**
 * Wraps a ProviderV3 instance with middleware functionality.
 * This function allows you to apply middleware to all language models
 * from the provider, enabling you to transform parameters, wrap generate
 * operations, and wrap stream operations for every language model.
 *
 * @param options - Configuration options for wrapping the provider.
 * @param options.provider - The original ProviderV3 instance to be wrapped.
 * @param options.languageModelMiddleware - The middleware to be applied to all language models from the provider. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.imageModelMiddleware - Optional middleware to be applied to all image models from the provider. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @returns A new ProviderV3 instance with middleware applied to all language models.
 */
declare function wrapProvider({ provider, languageModelMiddleware, imageModelMiddleware, }: {
    provider: ProviderV3 | ProviderV2;
    languageModelMiddleware: LanguageModelMiddleware | LanguageModelMiddleware[];
    imageModelMiddleware?: ImageModelMiddleware | ImageModelMiddleware[];
}): ProviderV3;

/**
 * Creates a custom provider with specified language models, text embedding models, image models, transcription models, speech models, and an optional fallback provider.
 *
 * @param {Object} options - The options for creating the custom provider.
 * @param {Record<string, LanguageModelV3>} [options.languageModels] - A record of language models, where keys are model IDs and values are LanguageModelV3 instances.
 * @param {Record<string, EmbeddingModelV3>} [options.embeddingModels] - A record of text embedding models, where keys are model IDs and values are EmbeddingModelV3 instances.
 * @param {Record<string, ImageModelV3>} [options.imageModels] - A record of image models, where keys are model IDs and values are ImageModelV3 instances.
 * @param {Record<string, TranscriptionModelV3>} [options.transcriptionModels] - A record of transcription models, where keys are model IDs and values are TranscriptionModelV3 instances.
 * @param {Record<string, SpeechModelV3>} [options.speechModels] - A record of speech models, where keys are model IDs and values are SpeechModelV3 instances.
 * @param {Record<string, RerankingModelV3>} [options.rerankingModels] - A record of reranking models, where keys are model IDs and values are RerankingModelV3 instances.
 * @param {ProviderV3} [options.fallbackProvider] - An optional fallback provider to use when a requested model is not found in the custom provider.
 * @returns {ProviderV3} A ProviderV3 object with languageModel, embeddingModel, imageModel, transcriptionModel, and speechModel methods.
 *
 * @throws {NoSuchModelError} Throws when a requested model is not found and no fallback provider is available.
 */
declare function customProvider<LANGUAGE_MODELS extends Record<string, LanguageModelV3>, EMBEDDING_MODELS extends Record<string, EmbeddingModelV3>, IMAGE_MODELS extends Record<string, ImageModelV3>, TRANSCRIPTION_MODELS extends Record<string, TranscriptionModelV3>, SPEECH_MODELS extends Record<string, SpeechModelV3>, RERANKING_MODELS extends Record<string, RerankingModelV3>, VIDEO_MODELS extends Record<string, Experimental_VideoModelV3>>({ languageModels, embeddingModels, imageModels, transcriptionModels, speechModels, rerankingModels, videoModels, fallbackProvider: fallbackProviderArg, }: {
    languageModels?: LANGUAGE_MODELS;
    embeddingModels?: EMBEDDING_MODELS;
    imageModels?: IMAGE_MODELS;
    transcriptionModels?: TRANSCRIPTION_MODELS;
    speechModels?: SPEECH_MODELS;
    rerankingModels?: RERANKING_MODELS;
    videoModels?: VIDEO_MODELS;
    fallbackProvider?: ProviderV3 | ProviderV2;
}): ProviderV3 & {
    languageModel(modelId: ExtractModelId<LANGUAGE_MODELS>): LanguageModelV3;
    embeddingModel(modelId: ExtractModelId<EMBEDDING_MODELS>): EmbeddingModelV3;
    imageModel(modelId: ExtractModelId<IMAGE_MODELS>): ImageModelV3;
    transcriptionModel(modelId: ExtractModelId<TRANSCRIPTION_MODELS>): TranscriptionModelV3;
    rerankingModel(modelId: ExtractModelId<RERANKING_MODELS>): RerankingModelV3;
    speechModel(modelId: ExtractModelId<SPEECH_MODELS>): SpeechModelV3;
    videoModel(modelId: ExtractModelId<VIDEO_MODELS>): Experimental_VideoModelV3;
};
/**
 * @deprecated Use `customProvider` instead.
 */
declare const experimental_customProvider: typeof customProvider;
type ExtractModelId<MODELS extends Record<string, unknown>> = Extract<keyof MODELS, string>;

declare const symbol: unique symbol;
declare class NoSuchProviderError extends NoSuchModelError {
    private readonly [symbol];
    readonly providerId: string;
    readonly availableProviders: string[];
    constructor({ modelId, modelType, providerId, availableProviders, message, }: {
        modelId: string;
        modelType: 'languageModel' | 'embeddingModel' | 'imageModel' | 'transcriptionModel' | 'speechModel' | 'rerankingModel';
        providerId: string;
        availableProviders: string[];
        message?: string;
    });
    static isInstance(error: unknown): error is NoSuchProviderError;
}

type ExtractLiteralUnion<T> = T extends string ? string extends T ? never : T : never;
interface ProviderRegistryProvider<PROVIDERS extends Record<string, ProviderV3> = Record<string, ProviderV3>, SEPARATOR extends string = ':'> {
    languageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['languageModel']>>[0]>}` : never): LanguageModelV3;
    languageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): LanguageModelV3;
    embeddingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['embeddingModel']>>[0]>}` : never): EmbeddingModelV3;
    embeddingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): EmbeddingModelV3;
    imageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['imageModel']>>[0]>}` : never): ImageModelV3;
    imageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): ImageModelV3;
    transcriptionModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['transcriptionModel']>>[0]>}` : never): TranscriptionModelV3;
    transcriptionModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): TranscriptionModelV3;
    speechModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['speechModel']>>[0]>}` : never): SpeechModelV3;
    speechModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): SpeechModelV3;
    rerankingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['rerankingModel']>>[0]>}` : never): RerankingModelV3;
    rerankingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): RerankingModelV3;
}
/**
 * Creates a registry for the given providers with optional middleware functionality.
 * This function allows you to register multiple providers and optionally apply middleware
 * to all language models from the registry, enabling you to transform parameters, wrap generate
 * operations, and wrap stream operations for every language model accessed through the registry.
 *
 * @param providers - A record of provider instances to be registered in the registry.
 * @param options - Configuration options for the provider registry.
 * @param options.separator - The separator used between provider ID and model ID in the combined identifier. Defaults to ':'.
 * @param options.languageModelMiddleware - Optional middleware to be applied to all language models from the registry. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.imageModelMiddleware - Optional middleware to be applied to all image models from the registry. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @returns A new ProviderRegistryProvider instance that provides access to all registered providers with optional middleware applied to language and image models.
 */
declare function createProviderRegistry<PROVIDERS extends Record<string, ProviderV3>, SEPARATOR extends string = ':'>(providers: PROVIDERS, { separator, languageModelMiddleware, imageModelMiddleware, }?: {
    separator?: SEPARATOR;
    languageModelMiddleware?: LanguageModelMiddleware | LanguageModelMiddleware[];
    imageModelMiddleware?: ImageModelMiddleware | ImageModelMiddleware[];
}): ProviderRegistryProvider<PROVIDERS, SEPARATOR>;
/**
 * @deprecated Use `createProviderRegistry` instead.
 */
declare const experimental_createProviderRegistry: typeof createProviderRegistry;

/**
 * The result of a `rerank` call.
 * It contains the original documents, the reranked documents, and additional information.
 */
interface RerankResult<VALUE> {
    /**
     * The original documents that were reranked.
     */
    readonly originalDocuments: Array<VALUE>;
    /**
     * Reranked documents.
     *
     * Sorted by relevance score in descending order.
     *
     * Can be less than the original documents if there was a topN limit.
     */
    readonly rerankedDocuments: Array<VALUE>;
    /**
     * The ranking is a list of objects with the original index,
     * relevance score, and the reranked document.
     *
     * Sorted by relevance score in descending order.
     *
     * Can be less than the original documents if there was a topN limit.
     */
    readonly ranking: Array<{
        originalIndex: number;
        score: number;
        document: VALUE;
    }>;
    /**
     * Optional provider-specific metadata.
     */
    readonly providerMetadata?: ProviderMetadata;
    /**
     * Optional raw response data.
     */
    readonly response: {
        /**
         * ID for the generated response if the provider sends one.
         */
        id?: string;
        /**
         * Timestamp of the generated response.
         */
        timestamp: Date;
        /**
         * The ID of the model that was used to generate the response.
         */
        modelId: string;
        /**
         * Response headers.
         */
        headers?: Record<string, string>;
        /**
         * The response body.
         */
        body?: unknown;
    };
}

/**
 * Rerank documents using a reranking model. The type of the value is defined by the reranking model.
 *
 * @param model - The reranking model to use.
 * @param documents - The documents that should be reranked.
 * @param query - The query to rerank the documents against.
 * @param topN - Number of top documents to return.
 *
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 * @param providerOptions - Additional provider-specific options.
 * @param experimental_telemetry - Optional telemetry configuration (experimental).
 *
 * @returns A result object that contains the reranked documents, the reranked indices, and additional information.
 */
declare function rerank<VALUE extends JSONObject | string>({ model, documents, query, topN, maxRetries: maxRetriesArg, abortSignal, headers, providerOptions, experimental_telemetry: telemetry, }: {
    /**
     * The reranking model to use.
     */
    model: RerankingModel;
    /**
     * The documents that should be reranked.
     */
    documents: Array<VALUE>;
    /**
     * The query to rerank the documents against.
     */
    query: string;
    /**
     * Number of top documents to return.
     */
    topN?: number;
    /**
     * Maximum number of retries per reranking model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
     * Additional provider-specific options. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
}): Promise<RerankResult<VALUE>>;

/**
 * Creates a Response object from a text stream.
 * Each text chunk is encoded as UTF-8 and sent as a separate chunk.
 * Sets a `Content-Type` header to `text/plain; charset=utf-8`.
 *
 * @param options - The options for creating the response.
 * @param options.status - Optional HTTP status code (default: 200).
 * @param options.statusText - Optional HTTP status text.
 * @param options.headers - Optional response headers.
 * @param options.textStream - The text stream to send.
 * @returns A Response object with the text stream body.
 */
declare function createTextStreamResponse({ status, statusText, headers, textStream, }: ResponseInit & {
    textStream: ReadableStream<string>;
}): Response;

/**
 * Writes a text stream to a Node.js ServerResponse object.
 * Each text chunk is encoded as UTF-8 and written as a separate chunk.
 * Sets a `Content-Type` header to `text/plain; charset=utf-8`.
 *
 * @param options - The options for piping the stream.
 * @param options.response - The Node.js ServerResponse to write to.
 * @param options.status - Optional HTTP status code.
 * @param options.statusText - Optional HTTP status text.
 * @param options.headers - Optional response headers.
 * @param options.textStream - The text stream to pipe.
 */
declare function pipeTextStreamToResponse({ response, status, statusText, headers, textStream, }: {
    response: ServerResponse;
    textStream: ReadableStream<string>;
} & ResponseInit): void;

/**
 * The result of a `transcribe` call.
 * It contains the transcript and additional information.
 */
interface TranscriptionResult {
    /**
     * The complete transcribed text from the audio.
     */
    readonly text: string;
    /**
     * Array of transcript segments with timing information.
     * Each segment represents a portion of the transcribed text with start and end times.
     */
    readonly segments: Array<{
        /**
         * The text content of this segment.
         */
        readonly text: string;
        /**
         * The start time of this segment in seconds.
         */
        readonly startSecond: number;
        /**
         * The end time of this segment in seconds.
         */
        readonly endSecond: number;
    }>;
    /**
     * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
     * May be undefined if the language couldn't be detected.
     */
    readonly language: string | undefined;
    /**
     * The total duration of the audio file in seconds.
     * May be undefined if the duration couldn't be determined.
     */
    readonly durationInSeconds: number | undefined;
    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    readonly warnings: Array<Warning>;
    /**
     * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<TranscriptionModelResponseMetadata>;
    /**
     * Provider metadata from the provider.
     */
    readonly providerMetadata: Record<string, JSONObject>;
}

declare function transcribe({ model, audio, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, download: downloadFn, }: {
    /**
     * The transcription model to use.
     */
    model: TranscriptionModel;
    /**
     * The audio data to transcribe.
     */
    audio: DataContent | URL;
    /**
     * Additional provider-specific options that are passed through to the provider
     * as body parameters.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is keyed by the provider-specific metadata key.
     * ```ts
     * {
     *   "openai": {
     *     "temperature": 0
     *   }
     * }
     * ```
     */
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of retries per transcript model call. Set to 0 to disable retries.
     *
     * @default 2
     */
    maxRetries?: number;
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional headers to include in the request.
     * Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string>;
    /**
     * Custom download function for fetching audio from URLs.
     * Use `createDownload()` from `ai` to create a download function with custom size limits.
     *
     * @default createDownload() (2 GiB limit)
     */
    download?: (options: {
        url: URL;
        abortSignal?: AbortSignal;
    }) => Promise<{
        data: Uint8Array;
        mediaType: string | undefined;
    }>;
}): Promise<TranscriptionResult>;

/**
 * Wraps a telemetry integration with bound methods.
 * Use this when creating class-based integrations to ensure methods
 * work correctly when passed as callbacks.
 */
declare function bindTelemetryIntegration(integration: TelemetryIntegration): TelemetryIntegration;

/**
 * Registers a telemetry integration globally.
 */
declare function registerTelemetryIntegration(integration: TelemetryIntegration): void;

declare global {
    /**
     * The default provider to use for the AI SDK.
     * String model ids are resolved to the default provider and model id.
     *
     * If not set, the default provider is the Vercel AI gateway provider.
     *
     * @see https://ai-sdk.dev/docs/ai-sdk-core/provider-management#global-provider-configuration
     */
    var AI_SDK_DEFAULT_PROVIDER: ProviderV3 | undefined;
    /**
     * The warning logger to use for the AI SDK.
     *
     * If not set, the default logger is the console.warn function.
     *
     * If set to false, no warnings are logged.
     */
    var AI_SDK_LOG_WARNINGS: LogWarningsFunction | undefined | false;
    /**
     * Globally registered telemetry integrations for the AI SDK.
     *
     * Integrations registered here receive lifecycle events (onStart, onStepStart,
     * etc.) from every `generateText`, `streamText`, and similar call.
     *
     * Prefer using `registerTelemetryIntegration()` from `'ai'` instead of
     * assigning this directly.
     */
    var AI_SDK_TELEMETRY_INTEGRATIONS: TelemetryIntegration[] | undefined;
}

export { AbstractChat, Agent, AgentCallParameters, AgentStreamParameters, AsyncIterableStream, CallSettings, CallWarning, ChatAddToolApproveResponseFunction, ChatAddToolOutputFunction, ChatInit, ChatOnDataCallback, ChatOnErrorCallback, ChatOnFinishCallback, ChatOnToolCallCallback, ChatRequestOptions, ChatState, ChatStatus, ChatTransport, ChunkDetector, CompletionRequestOptions, ContentPart, CreateUIMessage, DataUIPart, DeepPartial, DefaultChatTransport, DefaultGeneratedFile, DirectChatTransport, DirectChatTransportOptions, DynamicToolCall, DynamicToolError, DynamicToolResult, DynamicToolUIPart, EmbedManyResult, EmbedResult, Embedding, EmbeddingModel, EmbeddingModelMiddleware, EmbeddingModelUsage, ErrorHandler, ToolLoopAgent as Experimental_Agent, ToolLoopAgentSettings as Experimental_AgentSettings, DownloadFunction as Experimental_DownloadFunction, Experimental_GenerateImageResult, GeneratedFile as Experimental_GeneratedImage, InferAgentUIMessage as Experimental_InferAgentUIMessage, LogWarningsFunction as Experimental_LogWarningsFunction, SpeechResult as Experimental_SpeechResult, TranscriptionResult as Experimental_TranscriptionResult, FileUIPart, FinishReason, GenerateImageResult, GenerateObjectResult, GenerateTextOnFinishCallback, GenerateTextOnStartCallback, GenerateTextOnStepFinishCallback, GenerateTextOnStepStartCallback, GenerateTextOnToolCallFinishCallback, GenerateTextOnToolCallStartCallback, GenerateTextResult, GenerateVideoPrompt, GenerateVideoResult, GeneratedAudioFile, GeneratedFile, HttpChatTransport, HttpChatTransportInitOptions, ImageModel, ImageModelMiddleware, ImageModelProviderMetadata, ImageModelResponseMetadata, ImageModelUsage, InferAgentUIMessage, InferCompleteOutput as InferGenerateOutput, InferPartialOutput as InferStreamOutput, InferUIDataParts, InferUIMessageChunk, InferUITool, InferUITools, InvalidArgumentError, InvalidDataContentError, InvalidMessageRoleError, InvalidStreamPartError, InvalidToolApprovalError, InvalidToolInputError, JSONValue, JsonToSseTransformStream, LanguageModel, LanguageModelMiddleware, LanguageModelRequestMetadata, LanguageModelResponseMetadata, LanguageModelUsage, LogWarningsFunction, MessageConversionError, MissingToolResultsError, NoImageGeneratedError, NoObjectGeneratedError, NoOutputGeneratedError, NoSpeechGeneratedError, NoSuchProviderError, NoSuchToolError, NoTranscriptGeneratedError, NoVideoGeneratedError, ObjectStreamPart, OnFinishEvent, OnStartEvent, OnStepFinishEvent, OnStepStartEvent, OnToolCallFinishEvent, OnToolCallStartEvent, output as Output, PrepareReconnectToStreamRequest, PrepareSendMessagesRequest, PrepareStepFunction, PrepareStepResult, Prompt, Provider, ProviderMetadata, ProviderRegistryProvider, ReasoningOutput, ReasoningUIPart, RepairTextFunction, RerankResult, RerankingModel, RetryError, SafeValidateUIMessagesResult, SerialJobExecutor, SourceDocumentUIPart, SourceUrlUIPart, SpeechModel, SpeechModelResponseMetadata, StaticToolCall, StaticToolError, StaticToolOutputDenied, StaticToolResult, StepResult, StepStartUIPart, StopCondition, StreamObjectOnFinishCallback, StreamObjectResult, StreamTextOnChunkCallback, StreamTextOnErrorCallback, StreamTextOnFinishCallback, StreamTextOnStartCallback, StreamTextOnStepFinishCallback, StreamTextOnStepStartCallback, StreamTextOnToolCallFinishCallback, StreamTextOnToolCallStartCallback, StreamTextResult, StreamTextTransform, TelemetryIntegration, TelemetrySettings, TextStreamChatTransport, TextStreamPart, TextUIPart, TimeoutConfiguration, ToolApprovalRequestOutput, ToolCallNotFoundForApprovalError, ToolCallRepairError, ToolCallRepairFunction, ToolChoice, ToolLoopAgent, ToolLoopAgentOnFinishCallback, ToolLoopAgentOnStepFinishCallback, ToolLoopAgentSettings, ToolSet, ToolUIPart, TranscriptionModel, TranscriptionModelResponseMetadata, TypedToolCall, TypedToolError, TypedToolOutputDenied, TypedToolResult, UIDataPartSchemas, UIDataTypes, UIMessage, UIMessageChunk, UIMessagePart, UIMessageStreamError, UIMessageStreamOnFinishCallback, UIMessageStreamOnStepFinishCallback, UIMessageStreamOptions, UIMessageStreamWriter, UITool, UIToolInvocation, UITools, UI_MESSAGE_STREAM_HEADERS, UnsupportedModelVersionError, UseCompletionOptions, Warning, addToolInputExamplesMiddleware, assistantModelMessageSchema, bindTelemetryIntegration, callCompletionApi, consumeStream, convertFileListToFileUIParts, convertToModelMessages, cosineSimilarity, createAgentUIStream, createAgentUIStreamResponse, createDownload, createProviderRegistry, createTextStreamResponse, createUIMessageStream, createUIMessageStreamResponse, customProvider, defaultEmbeddingSettingsMiddleware, defaultSettingsMiddleware, embed, embedMany, experimental_createProviderRegistry, experimental_customProvider, experimental_generateImage, generateSpeech as experimental_generateSpeech, experimental_generateVideo, transcribe as experimental_transcribe, extractJsonMiddleware, extractReasoningMiddleware, generateImage, generateObject, generateText, getStaticToolName, getTextFromDataUrl, getToolName, getToolOrDynamicToolName, hasToolCall, isDataUIPart, isDeepEqualData, isFileUIPart, isReasoningUIPart, isStaticToolUIPart, isTextUIPart, isToolOrDynamicToolUIPart, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls, modelMessageSchema, parsePartialJson, pipeAgentUIStreamToResponse, pipeTextStreamToResponse, pipeUIMessageStreamToResponse, pruneMessages, readUIMessageStream, registerTelemetryIntegration, rerank, safeValidateUIMessages, simulateReadableStream, simulateStreamingMiddleware, smoothStream, stepCountIs, streamObject, streamText, systemModelMessageSchema, toolModelMessageSchema, uiMessageChunkSchema, userModelMessageSchema, validateUIMessages, wrapEmbeddingModel, wrapImageModel, wrapLanguageModel, wrapProvider };
