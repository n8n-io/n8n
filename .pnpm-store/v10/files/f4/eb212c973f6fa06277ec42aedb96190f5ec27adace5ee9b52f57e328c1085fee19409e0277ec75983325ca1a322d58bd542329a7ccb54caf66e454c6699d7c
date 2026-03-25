import { BaseMessage, BaseMessageChunk, BaseMessageLike } from "../messages/base.cjs";
import { AIMessageChunk } from "../messages/ai.cjs";
import { MessageOutputVersion } from "../messages/message.cjs";
import { ChatGenerationChunk, ChatResult, Generation, LLMResult } from "../outputs.cjs";
import { BaseCache } from "../caches/index.cjs";
import { SerializableSchema } from "../utils/standard_schema.cjs";
import { CallbackManagerForLLMRun, Callbacks } from "../callbacks/manager.cjs";
import { RunnableConfig } from "../runnables/types.cjs";
import { Runnable, RunnableToolLike } from "../runnables/base.cjs";
import { BasePromptValueInterface } from "../prompt_values.cjs";
import { BaseLanguageModel, BaseLanguageModelCallOptions, BaseLanguageModelInput, BaseLanguageModelParams, StructuredOutputMethodOptions, ToolDefinition } from "./base.cjs";
import { StructuredToolInterface, StructuredToolParams } from "../tools/types.cjs";
import { ZodType } from "zod/v3";
import { $ZodType } from "zod/v4/core";

//#region src/language_models/chat_models.d.ts
type ToolChoice = string | Record<string, any> | "auto" | "any";
/**
 * Represents a serialized chat model.
 */
type SerializedChatModel = {
  _model: string;
  _type: string;
} & Record<string, any>;
/**
 * Represents a serialized large language model.
 */
type SerializedLLM = {
  _model: string;
  _type: string;
} & Record<string, any>;
/**
 * Represents the parameters for a base chat model.
 */
type BaseChatModelParams = BaseLanguageModelParams & {
  /**
   * Whether to disable streaming.
   *
   * If streaming is bypassed, then `stream()` will defer to
   * `invoke()`.
   *
   * - If true, will always bypass streaming case.
   * - If false (default), will always use streaming case if available.
   */
  disableStreaming?: boolean;
  /**
   * Version of `AIMessage` output format to store in message content.
   *
   * `AIMessage.contentBlocks` will lazily parse the contents of `content` into a
   * standard format. This flag can be used to additionally store the standard format
   * as the message content, e.g., for serialization purposes.
   *
   * - "v0": provider-specific format in content (can lazily parse with `.contentBlocks`)
   * - "v1": standardized format in content (consistent with `.contentBlocks`)
   *
   * You can also set `LC_OUTPUT_VERSION` as an environment variable to "v1" to
   * enable this by default.
   *
   * @default "v0"
   */
  outputVersion?: MessageOutputVersion;
};
/**
 * Represents the call options for a base chat model.
 */
type BaseChatModelCallOptions = BaseLanguageModelCallOptions & {
  /**
   * Specifies how the chat model should use tools.
   * @default undefined
   *
   * Possible values:
   * - "auto": The model may choose to use any of the provided tools, or none.
   * - "any": The model must use one of the provided tools.
   * - "none": The model must not use any tools.
   * - A string (not "auto", "any", or "none"): The name of a specific tool the model must use.
   * - An object: A custom schema specifying tool choice parameters. Specific to the provider.
   *
   * Note: Not all providers support tool_choice. An error will be thrown
   * if used with an unsupported model.
   */
  tool_choice?: ToolChoice;
  /**
   * Version of `AIMessage` output format to store in message content.
   *
   * `AIMessage.contentBlocks` will lazily parse the contents of `content` into a
   * standard format. This flag can be used to additionally store the standard format
   * as the message content, e.g., for serialization purposes.
   *
   * - "v0": provider-specific format in content (can lazily parse with `.contentBlocks`)
   * - "v1": standardized format in content (consistent with `.contentBlocks`)
   *
   * You can also set `LC_OUTPUT_VERSION` as an environment variable to "v1" to
   * enable this by default.
   *
   * @default "v0"
   */
  outputVersion?: MessageOutputVersion;
};
type LangSmithParams = {
  ls_provider?: string;
  ls_model_name?: string;
  ls_model_type: "chat";
  ls_temperature?: number;
  ls_max_tokens?: number;
  ls_stop?: Array<string>;
};
type BindToolsInput = StructuredToolInterface | Record<string, any> | ToolDefinition | RunnableToolLike | StructuredToolParams;
/**
 * Base class for chat models. It extends the BaseLanguageModel class and
 * provides methods for generating chat based on input messages.
 */
declare abstract class BaseChatModel<CallOptions extends BaseChatModelCallOptions = BaseChatModelCallOptions, OutputMessageType extends BaseMessageChunk = AIMessageChunk> extends BaseLanguageModel<OutputMessageType, CallOptions> {
  ParsedCallOptions: Omit<CallOptions, Exclude<keyof RunnableConfig, "signal" | "timeout" | "maxConcurrency">>;
  lc_namespace: string[];
  disableStreaming: boolean;
  outputVersion?: MessageOutputVersion;
  get callKeys(): string[];
  constructor(fields: BaseChatModelParams);
  _combineLLMOutput?(...llmOutputs: LLMResult["llmOutput"][]): LLMResult["llmOutput"];
  protected _separateRunnableConfigFromCallOptionsCompat(options?: Partial<CallOptions>): [RunnableConfig, this["ParsedCallOptions"]];
  /**
   * Bind tool-like objects to this chat model.
   *
   * @param tools A list of tool definitions to bind to this chat model.
   * Can be a structured tool, an OpenAI formatted tool, or an object
   * matching the provider's specific tool schema.
   * @param kwargs Any additional parameters to bind.
   */
  bindTools?(tools: BindToolsInput[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, OutputMessageType, CallOptions>;
  /**
   * Invokes the chat model with a single input.
   * @param input The input for the language model.
   * @param options The call options.
   * @returns A Promise that resolves to a BaseMessageChunk.
   */
  invoke(input: BaseLanguageModelInput, options?: Partial<CallOptions>): Promise<OutputMessageType>;
  _streamResponseChunks(_messages: BaseMessage[], _options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _streamIterator(input: BaseLanguageModelInput, options?: Partial<CallOptions>): AsyncGenerator<OutputMessageType>;
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  /** @ignore */
  _generateUncached(messages: BaseMessageLike[][], parsedOptions: this["ParsedCallOptions"], handledOptions: RunnableConfig, startedRunManagers?: CallbackManagerForLLMRun[]): Promise<LLMResult>;
  _generateCached({
    messages,
    cache,
    llmStringKey,
    parsedOptions,
    handledOptions
  }: {
    messages: BaseMessageLike[][];
    cache: BaseCache<Generation[]>;
    llmStringKey: string;
    parsedOptions: any;
    handledOptions: RunnableConfig;
  }): Promise<LLMResult & {
    missingPromptIndices: number[];
    startedRunManagers?: CallbackManagerForLLMRun[];
  }>;
  /**
   * Generates chat based on the input messages.
   * @param messages An array of arrays of BaseMessage instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to an LLMResult.
   */
  generate(messages: BaseMessageLike[][], options?: string[] | Partial<CallOptions>, callbacks?: Callbacks): Promise<LLMResult>;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(_options?: this["ParsedCallOptions"]): any;
  _modelType(): string;
  abstract _llmType(): string;
  /**
   * Generates a prompt based on the input prompt values.
   * @param promptValues An array of BasePromptValue instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to an LLMResult.
   */
  generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | Partial<CallOptions>, callbacks?: Callbacks): Promise<LLMResult>;
  abstract _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: SerializableSchema<RunOutput>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: SerializableSchema<RunOutput>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: $ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: $ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
/**
 * An abstract class that extends BaseChatModel and provides a simple
 * implementation of _generate.
 */
declare abstract class SimpleChatModel<CallOptions extends BaseChatModelCallOptions = BaseChatModelCallOptions> extends BaseChatModel<CallOptions> {
  abstract _call(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
}
//#endregion
export { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput, LangSmithParams, SerializedChatModel, SerializedLLM, SimpleChatModel, ToolChoice };
//# sourceMappingURL=chat_models.d.cts.map