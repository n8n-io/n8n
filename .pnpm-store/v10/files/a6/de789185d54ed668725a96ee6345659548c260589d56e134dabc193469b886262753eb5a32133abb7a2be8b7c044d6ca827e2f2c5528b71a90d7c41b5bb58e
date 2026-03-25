import { IterableReadableStream } from "../langchain-core/dist/utils/stream.cjs";
import { ChatOpenAIResponseFormat, OpenAIApiKey, OpenAICallOptions, OpenAIChatInput, OpenAICoreRequestOptions, OpenAIVerbosityParam, ResponseFormatConfiguration } from "../types.cjs";
import { ChatOpenAIToolType, OpenAIToolChoice, ResponsesToolChoice } from "../utils/tools.cjs";
import { ClientOptions, OpenAI as OpenAI$1 } from "openai";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGeneration } from "@langchain/core/outputs";
import { BaseFunctionCallOptions, BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ModelProfile } from "@langchain/core/language_models/profile";

//#region src/chat_models/base.d.ts
interface OpenAILLMOutput {
  tokenUsage: {
    completionTokens?: number;
    promptTokens?: number;
    totalTokens?: number;
  };
}
interface BaseChatOpenAICallOptions extends BaseChatModelCallOptions, BaseFunctionCallOptions {
  /**
   * Additional options to pass to the underlying axios request.
   */
  options?: OpenAICoreRequestOptions;
  /**
   * A list of tools that the model may use to generate responses.
   * Each tool can be a function, a built-in tool, or a custom tool definition.
   * If not provided, the model will not use any tools.
   */
  tools?: ChatOpenAIToolType[];
  /**
   * Specifies which tool the model should use to respond.
   * Can be an {@link OpenAIToolChoice} or a {@link ResponsesToolChoice}.
   * If not set, the model will decide which tool to use automatically.
   */
  // TODO: break OpenAIToolChoice and ResponsesToolChoice into options sub classes
  tool_choice?: OpenAIToolChoice | ResponsesToolChoice;
  /**
   * Adds a prompt index to prompts passed to the model to track
   * what prompt is being used for a given generation.
   */
  promptIndex?: number;
  /**
   * An object specifying the format that the model must output.
   */
  response_format?: ChatOpenAIResponseFormat;
  /**
   * When provided, the completions API will make a best effort to sample
   * deterministically, such that repeated requests with the same `seed`
   * and parameters should return the same result.
   */
  seed?: number;
  /**
   * Additional options to pass to streamed completions.
   * If provided, this takes precedence over "streamUsage" set at
   * initialization time.
   */
  stream_options?: OpenAI$1.Chat.ChatCompletionStreamOptions;
  /**
   * The model may choose to call multiple functions in a single turn. You can
   * set parallel_tool_calls to false which ensures only one tool is called at most.
   * [Learn more](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling)
   */
  parallel_tool_calls?: boolean;
  /**
   * If `true`, model output is guaranteed to exactly match the JSON Schema
   * provided in the tool definition. If `true`, the input schema will also be
   * validated according to
   * https://platform.openai.com/docs/guides/structured-outputs/supported-schemas.
   *
   * If `false`, input schema will not be validated and model output will not
   * be validated.
   *
   * If `undefined`, `strict` argument will not be passed to the model.
   */
  strict?: boolean;
  /**
   * Output types that you would like the model to generate for this request. Most
   * models are capable of generating text, which is the default:
   *
   * `["text"]`
   *
   * The `gpt-4o-audio-preview` model can also be used to
   * [generate audio](https://platform.openai.com/docs/guides/audio). To request that
   * this model generate both text and audio responses, you can use:
   *
   * `["text", "audio"]`
   */
  modalities?: Array<OpenAI$1.Chat.ChatCompletionModality>;
  /**
   * Parameters for audio output. Required when audio output is requested with
   * `modalities: ["audio"]`.
   * [Learn more](https://platform.openai.com/docs/guides/audio).
   */
  audio?: OpenAI$1.Chat.ChatCompletionAudioParam;
  /**
   * Static predicted output content, such as the content of a text file that is being regenerated.
   * [Learn more](https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs).
   */
  prediction?: OpenAI$1.ChatCompletionPredictionContent;
  /**
   * Options for reasoning models.
   *
   * Note that some options, like reasoning summaries, are only available when using the responses
   * API. If these options are set, the responses API will be used to fulfill the request.
   *
   * These options will be ignored when not using a reasoning model.
   */
  reasoning?: OpenAI$1.Reasoning;
  /**
   * Service tier to use for this request. Can be "auto", "default", or "flex"
   * Specifies the service tier for prioritization and latency optimization.
   */
  service_tier?: OpenAI$1.Chat.ChatCompletionCreateParams["service_tier"];
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache
   * hit rates. Replaces the `user` field.
   * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  promptCacheKey?: string;
  /**
   * The verbosity of the model's response.
   */
  verbosity?: OpenAIVerbosityParam;
}
interface BaseChatOpenAIFields extends Partial<OpenAIChatInput>, BaseChatModelParams {
  /**
   * Optional configuration options for the OpenAI client.
   */
  configuration?: ClientOptions;
}
/** @internal */
declare abstract class BaseChatOpenAI<CallOptions extends BaseChatOpenAICallOptions> extends BaseChatModel<CallOptions, AIMessageChunk> implements Partial<OpenAIChatInput> {
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  n?: number;
  logitBias?: Record<string, number>;
  model: string;
  modelKwargs?: OpenAIChatInput["modelKwargs"];
  stop?: string[];
  stopSequences?: string[];
  user?: string;
  timeout?: number;
  streaming: boolean;
  streamUsage: boolean;
  maxTokens?: number;
  logprobs?: boolean;
  topLogprobs?: number;
  apiKey?: OpenAIApiKey;
  organization?: string;
  __includeRawResponse?: boolean;
  /** @internal */
  client: OpenAI$1;
  /** @internal */
  clientConfig: ClientOptions;
  /**
   * Whether the model supports the `strict` argument when passing in tools.
   * If `undefined` the `strict` argument will not be passed to OpenAI.
   */
  supportsStrictToolCalling?: boolean;
  audio?: OpenAI$1.Chat.ChatCompletionAudioParam;
  modalities?: Array<OpenAI$1.Chat.ChatCompletionModality>;
  reasoning?: OpenAI$1.Reasoning;
  /**
   * Must be set to `true` in tenancies with Zero Data Retention. Setting to `true` will disable
   * output storage in the Responses API, but this DOES NOT enable Zero Data Retention in your
   * OpenAI organization or project. This must be configured directly with OpenAI.
   *
   * See:
   * https://platform.openai.com/docs/guides/your-data
   * https://platform.openai.com/docs/api-reference/responses/create#responses-create-store
   *
   * @default false
   */
  zdrEnabled?: boolean | undefined;
  /**
   * Service tier to use for this request. Can be "auto", "default", or "flex" or "priority".
   * Specifies the service tier for prioritization and latency optimization.
   */
  service_tier?: OpenAI$1.Chat.ChatCompletionCreateParams["service_tier"];
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache
   * hit rates.
   * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  promptCacheKey: string;
  /**
   * The verbosity of the model's response.
   */
  verbosity?: OpenAIVerbosityParam;
  protected defaultOptions: CallOptions;
  _llmType(): string;
  static lc_name(): string;
  get callKeys(): string[];
  lc_serializable: boolean;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): Record<string, string>;
  get lc_serializable_keys(): string[];
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  /** @ignore */
  _identifyingParams(): Omit<OpenAI$1.Chat.ChatCompletionCreateParams, "messages"> & {
    model_name: string;
  } & ClientOptions;
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): Omit<OpenAI$1.ChatCompletionCreateParams, "messages"> & {
    model_name: string;
  } & ClientOptions;
  constructor(fields?: BaseChatOpenAIFields);
  /**
   * Returns backwards compatible reasoning parameters from constructor params and call options
   * @internal
   */
  protected _getReasoningParams(options?: this["ParsedCallOptions"]): OpenAI$1.Reasoning | undefined;
  /**
   * Returns an openai compatible response format from a set of options
   * @internal
   */
  protected _getResponseFormat(resFormat?: CallOptions["response_format"]): ResponseFormatConfiguration | undefined;
  protected _combineCallOptions(additionalOptions?: this["ParsedCallOptions"]): this["ParsedCallOptions"];
  /** @internal */
  _getClientOptions(options: OpenAICoreRequestOptions | undefined): OpenAICoreRequestOptions;
  // TODO: move to completions class
  protected _convertChatOpenAIToolToCompletionsTool(tool: ChatOpenAIToolType, fields?: {
    strict?: boolean;
  }): OpenAI$1.ChatCompletionTool;
  bindTools(tools: ChatOpenAIToolType[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
  stream(input: BaseLanguageModelInput, options?: CallOptions): Promise<IterableReadableStream<AIMessageChunk<_langchain_core_messages0.MessageStructure>>>;
  invoke(input: BaseLanguageModelInput, options?: CallOptions): Promise<AIMessageChunk<_langchain_core_messages0.MessageStructure>>;
  /** @ignore */
  _combineLLMOutput(...llmOutputs: OpenAILLMOutput[]): OpenAILLMOutput;
  getNumTokensFromMessages(messages: BaseMessage[]): Promise<{
    totalCount: number;
    countPerMessage: number[];
  }>;
  /** @internal */
  protected _getNumTokensFromGenerations(generations: ChatGeneration[]): Promise<number>;
  /** @internal */
  protected _getEstimatedTokenCountFromPrompt(messages: BaseMessage[], functions?: OpenAI$1.Chat.ChatCompletionCreateParams.Function[], function_call?: "none" | "auto" | OpenAI$1.Chat.ChatCompletionFunctionCallOption): Promise<number>;
  /**
   * Return profiling information for the model.
   *
   * Provides information about the model's capabilities and constraints,
   * including token limits, multimodal support, and advanced features like
   * tool calling and structured output.
   *
   * @returns {ModelProfile} An object describing the model's capabilities and constraints
   *
   * @example
   * ```typescript
   * const model = new ChatOpenAI({ model: "gpt-4o" });
   * const profile = model.profile;
   * console.log(profile.maxInputTokens); // 128000
   * console.log(profile.imageInputs); // true
   * ```
   */
  get profile(): ModelProfile;
  /** @internal */
  protected _getStructuredOutputMethod(config: StructuredOutputMethodOptions<boolean>): string | undefined;
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { BaseChatOpenAI, BaseChatOpenAICallOptions, BaseChatOpenAIFields };
//# sourceMappingURL=base.d.cts.map