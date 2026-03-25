import { BaseMessage, BaseMessageLike, MessageContent } from "../messages/base.cjs";
import { LLMResult } from "../outputs.cjs";
import { BaseCache } from "../caches/index.cjs";
import { SerializableSchema } from "../utils/standard_schema.cjs";
import { InferInteropZodOutput, InteropZodObject, InteropZodType } from "../utils/types/zod.cjs";
import { CallbackManager, Callbacks } from "../callbacks/manager.cjs";
import { RunnableConfig, RunnableInterface } from "../runnables/types.cjs";
import { Runnable } from "../runnables/base.cjs";
import { BasePromptValueInterface } from "../prompt_values.cjs";
import { AsyncCaller, AsyncCallerParams } from "../utils/async_caller.cjs";
import { JsonSchema7Type } from "../utils/zod-to-json-schema/parseTypes.cjs";
import { ModelProfile } from "./profile.cjs";
import { ZodType } from "zod/v3";
import { $ZodType } from "zod/v4/core";
import { TiktokenModel } from "js-tiktoken/lite";

//#region src/language_models/base.d.ts
declare const getModelNameForTiktoken: (modelName: string) => TiktokenModel;
declare const getEmbeddingContextSize: (modelName?: string | undefined) => number;
/**
 * Get the context window size (max input tokens) for a given model.
 *
 * Context window sizes are sourced from official model documentation:
 * - OpenAI: https://platform.openai.com/docs/models
 * - Anthropic: https://docs.anthropic.com/claude/docs/models-overview
 * - Google: https://ai.google.dev/gemini/docs/models/gemini
 *
 * @param modelName - The name of the model
 * @returns The context window size in tokens
 */
declare const getModelContextSize: (modelName: string) => number;
/**
 * Whether or not the input matches the OpenAI tool definition.
 * @param {unknown} tool The input to check.
 * @returns {boolean} Whether the input is an OpenAI tool definition.
 */
declare function isOpenAITool(tool: unknown): tool is ToolDefinition;
interface CalculateMaxTokenProps {
  prompt: string;
  modelName: TiktokenModel;
}
declare const calculateMaxTokens: ({
  prompt,
  modelName
}: CalculateMaxTokenProps) => Promise<number>;
type SerializedLLM = {
  _model: string;
  _type: string;
} & Record<string, any>;
interface BaseLangChainParams {
  verbose?: boolean;
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
/**
 * Base class for language models, chains, tools.
 */
declare abstract class BaseLangChain<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput, CallOptions> implements BaseLangChainParams {
  /**
   * Whether to print out response text.
   */
  verbose: boolean;
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, unknown>;
  get lc_attributes(): {
    [key: string]: undefined;
  } | undefined;
  constructor(params: BaseLangChainParams);
  protected _addVersion(pkg: string, version: string): void;
}
/**
 * Base interface for language model parameters.
 * A subclass of {@link BaseLanguageModel} should have a constructor that
 * takes in a parameter that extends this interface.
 */
interface BaseLanguageModelParams extends AsyncCallerParams, BaseLangChainParams {
  /**
   * @deprecated Use `callbacks` instead
   */
  callbackManager?: CallbackManager;
  cache?: BaseCache | boolean;
}
interface BaseLanguageModelTracingCallOptions {
  /**
   * Describes the format of structured outputs.
   * This should be provided if an output is considered to be structured
   */
  ls_structured_output_format?: {
    /**
     * An object containing the method used for structured output (e.g., "jsonMode").
     */
    kwargs: {
      method: string;
    };
    /**
     * The JSON schema describing the expected output structure.
     */
    schema?: JsonSchema7Type;
  };
}
interface BaseLanguageModelCallOptions extends RunnableConfig, BaseLanguageModelTracingCallOptions {
  /**
   * Stop tokens to use for this call.
   * If not provided, the default stop tokens for the model will be used.
   */
  stop?: string[];
}
interface FunctionDefinition {
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
   * underscores and dashes, with a maximum length of 64.
   */
  name: string;
  /**
   * The parameters the functions accepts, described as a JSON Schema object. See the
   * [guide](https://platform.openai.com/docs/guides/gpt/function-calling) for
   * examples, and the
   * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
   * documentation about the format.
   *
   * To describe a function that accepts no parameters, provide the value
   * `{"type": "object", "properties": {}}`.
   */
  parameters: Record<string, unknown> | JsonSchema7Type;
  /**
   * A description of what the function does, used by the model to choose when and
   * how to call the function.
   */
  description?: string;
}
interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
}
type FunctionCallOption = {
  name: string;
};
interface BaseFunctionCallOptions extends BaseLanguageModelCallOptions {
  function_call?: FunctionCallOption;
  functions?: FunctionDefinition[];
}
type BaseLanguageModelInput = BasePromptValueInterface | string | BaseMessageLike[];
type StructuredOutputType = InferInteropZodOutput<InteropZodObject>;
type StructuredOutputMethodOptions<IncludeRaw extends boolean = false> = {
  name?: string;
  method?: "functionCalling" | "jsonMode" | "jsonSchema" | string;
  includeRaw?: IncludeRaw; /** Whether to use strict mode. Currently only supported by OpenAI models. */
  strict?: boolean;
};
/** @deprecated Use StructuredOutputMethodOptions instead */
type StructuredOutputMethodParams<RunOutput, IncludeRaw extends boolean = false> = {
  /** @deprecated Pass schema in as the first argument */schema: InteropZodType<RunOutput> | Record<string, any>;
  name?: string;
  method?: "functionCalling" | "jsonMode";
  includeRaw?: IncludeRaw;
};
interface BaseLanguageModelInterface<RunOutput = any, CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions> extends RunnableInterface<BaseLanguageModelInput, RunOutput, CallOptions> {
  get callKeys(): string[];
  generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | Partial<CallOptions>, callbacks?: Callbacks): Promise<LLMResult>;
  _modelType(): string;
  _llmType(): string;
  getNumTokens(content: MessageContent): Promise<number>;
  /**
   * Get the identifying parameters of the LLM.
   */
  _identifyingParams(): Record<string, any>;
  serialize(): SerializedLLM;
}
type LanguageModelOutput = BaseMessage | string;
type LanguageModelLike = Runnable<BaseLanguageModelInput, LanguageModelOutput>;
/**
 * Base class for language models.
 */
declare abstract class BaseLanguageModel<RunOutput = any, CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions> extends BaseLangChain<BaseLanguageModelInput, RunOutput, CallOptions> implements BaseLanguageModelParams, BaseLanguageModelInterface<RunOutput, CallOptions> {
  /**
   * Keys that the language model accepts as call options.
   */
  get callKeys(): string[];
  /**
   * The async caller should be used by subclasses to make any async calls,
   * which will thus benefit from the concurrency and retry logic.
   */
  caller: AsyncCaller;
  cache?: BaseCache;
  constructor({
    callbacks,
    callbackManager,
    ...params
  }: BaseLanguageModelParams);
  abstract generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<LLMResult>;
  abstract _modelType(): string;
  abstract _llmType(): string;
  private _encoding?;
  /**
   * Get the number of tokens in the content.
   * @param content The content to get the number of tokens for.
   * @returns The number of tokens in the content.
   */
  getNumTokens(content: MessageContent): Promise<number>;
  protected static _convertInputToPromptValue(input: BaseLanguageModelInput): BasePromptValueInterface;
  /**
   * Get the identifying parameters of the LLM.
   */
  _identifyingParams(): Record<string, any>;
  /**
   * Create a unique cache key for a specific call to a specific language model.
   * @param callOptions Call options for the model
   * @returns A unique cache key.
   */
  _getSerializedCacheKeyParametersForCall({
    config,
    ...callOptions
  }: CallOptions & {
    config?: RunnableConfig;
  }): string;
  /**
   * @deprecated
   * Return a json-like object representing this LLM.
   */
  serialize(): SerializedLLM;
  /**
   * @deprecated
   * Load an LLM from a json-like object describing it.
   */
  static deserialize(_data: SerializedLLM): Promise<BaseLanguageModel>;
  /**
   * Return profiling information for the model.
   *
   * @returns {ModelProfile} An object describing the model's capabilities and constraints
   */
  get profile(): ModelProfile;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: SerializableSchema<RunOutput>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: SerializableSchema<RunOutput>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: $ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: $ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  /**
   * Model wrapper that returns outputs formatted to match the given schema.
   *
   * @template {BaseLanguageModelInput} RunInput The input type for the Runnable, expected to be the same input for the LLM.
   * @template {Record<string, any>} RunOutput The output type for the Runnable, expected to be a Zod schema object for structured output validation.
   *
   * @param {InteropZodType<RunOutput>} schema The schema for the structured output. Either as a Zod schema or a valid JSON schema object.
   *   If a Zod schema is passed, the returned attributes will be validated, whereas with JSON schema they will not be.
   * @param {string} name The name of the function to call.
   * @param {"functionCalling" | "jsonMode"} [method=functionCalling] The method to use for getting the structured output. Defaults to "functionCalling".
   * @param {boolean | undefined} [includeRaw=false] Whether to include the raw output in the result. Defaults to false.
   * @returns {Runnable<RunInput, RunOutput> | Runnable<RunInput, { raw: BaseMessage; parsed: RunOutput }>} A new runnable that calls the LLM with structured output.
   */
  withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
/**
 * Shared interface for token usage
 * return type from LLM calls.
 */
interface TokenUsage {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
}
//#endregion
export { BaseFunctionCallOptions, BaseLangChain, BaseLangChainParams, BaseLanguageModel, BaseLanguageModelCallOptions, BaseLanguageModelInput, BaseLanguageModelInterface, BaseLanguageModelParams, BaseLanguageModelTracingCallOptions, FunctionCallOption, FunctionDefinition, LanguageModelLike, LanguageModelOutput, SerializedLLM, StructuredOutputMethodOptions, StructuredOutputMethodParams, StructuredOutputType, TokenUsage, ToolDefinition, calculateMaxTokens, getEmbeddingContextSize, getModelContextSize, getModelNameForTiktoken, isOpenAITool };
//# sourceMappingURL=base.d.cts.map