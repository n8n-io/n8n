import { AIMessageChunk, BaseMessage, MessageStructure } from "@langchain/core/messages";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput } from "@langchain/core/language_models/chat_models";
import { RunnableBatchOptions, RunnableBinding, RunnableConfig, RunnableToolLike } from "@langchain/core/runnables";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { StructuredToolInterface } from "@langchain/core/tools";
import { BaseLanguageModelInput, ToolDefinition } from "@langchain/core/language_models/base";
import { ChatResult } from "@langchain/core/outputs";
import { LogStreamCallbackHandlerInput, RunLogPatch, StreamEvent } from "@langchain/core/tracers/log_stream";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ModelProfile } from "@langchain/core/language_models/profile";

//#region src/chat_models/universal.d.ts
interface EventStreamCallbackHandlerInput extends Omit<LogStreamCallbackHandlerInput, "_schemaFormat"> {}
interface ConfigurableChatModelCallOptions extends BaseChatModelCallOptions {
  tools?: (StructuredToolInterface | Record<string, unknown> | ToolDefinition | RunnableToolLike)[];
}
declare const MODEL_PROVIDER_CONFIG: {
  readonly openai: {
    readonly package: "@langchain/openai";
    readonly className: "ChatOpenAI";
  };
  readonly anthropic: {
    readonly package: "@langchain/anthropic";
    readonly className: "ChatAnthropic";
  };
  readonly azure_openai: {
    readonly package: "@langchain/openai";
    readonly className: "AzureChatOpenAI";
  };
  readonly cohere: {
    readonly package: "@langchain/cohere";
    readonly className: "ChatCohere";
  };
  readonly "google-vertexai": {
    readonly package: "@langchain/google-vertexai";
    readonly className: "ChatVertexAI";
  };
  readonly "google-vertexai-web": {
    readonly package: "@langchain/google-vertexai-web";
    readonly className: "ChatVertexAI";
  };
  readonly "google-genai": {
    readonly package: "@langchain/google-genai";
    readonly className: "ChatGoogleGenerativeAI";
  };
  readonly ollama: {
    readonly package: "@langchain/ollama";
    readonly className: "ChatOllama";
  };
  readonly mistralai: {
    readonly package: "@langchain/mistralai";
    readonly className: "ChatMistralAI";
  };
  readonly mistral: {
    readonly package: "@langchain/mistralai";
    readonly className: "ChatMistralAI";
  };
  readonly groq: {
    readonly package: "@langchain/groq";
    readonly className: "ChatGroq";
  };
  readonly cerebras: {
    readonly package: "@langchain/cerebras";
    readonly className: "ChatCerebras";
  };
  readonly bedrock: {
    readonly package: "@langchain/aws";
    readonly className: "ChatBedrockConverse";
  };
  readonly deepseek: {
    readonly package: "@langchain/deepseek";
    readonly className: "ChatDeepSeek";
  };
  readonly xai: {
    readonly package: "@langchain/xai";
    readonly className: "ChatXAI";
  };
  readonly fireworks: {
    readonly package: "@langchain/community/chat_models/fireworks";
    readonly className: "ChatFireworks";
    readonly hasCircularDependency: true;
  };
  readonly together: {
    readonly package: "@langchain/community/chat_models/togetherai";
    readonly className: "ChatTogetherAI";
    readonly hasCircularDependency: true;
  };
  readonly perplexity: {
    readonly package: "@langchain/community/chat_models/perplexity";
    readonly className: "ChatPerplexity";
    readonly hasCircularDependency: true;
  };
};
type ChatModelProvider = keyof typeof MODEL_PROVIDER_CONFIG;
/**
 * Helper function to get a chat model class by its class name or model provider.
 * @param className The class name (e.g., "ChatOpenAI", "ChatAnthropic")
 * @param modelProvider Optional model provider key for direct lookup (e.g., "google-vertexai-web").
 *                      When provided, uses direct lookup to avoid className collision issues.
 * @returns The imported model class or undefined if not found
 */
declare function getChatModelByClassName(className: string, modelProvider?: string): Promise<any>;
/**
 * Attempts to infer the model provider based on the given model name.
 *
 * @param {string} modelName - The name of the model to infer the provider for.
 * @returns {string | undefined} The inferred model provider name, or undefined if unable to infer.
 *
 * @example
 * _inferModelProvider("gpt-4"); // returns "openai"
 * _inferModelProvider("claude-2"); // returns "anthropic"
 * _inferModelProvider("unknown-model"); // returns undefined
 */
declare function _inferModelProvider(modelName: string): string | undefined;
interface ConfigurableModelFields extends BaseChatModelParams {
  defaultConfig?: Record<string, any>;
  /**
   * @default "any"
   */
  configurableFields?: string[] | "any";
  /**
   * @default ""
   */
  configPrefix?: string;
  /**
   * Methods which should be called after the model is initialized.
   * The key will be the method name, and the value will be the arguments.
   */
  queuedMethodOperations?: Record<string, any>;
  /**
   * Overrides the profiling information for the model. If not provided,
   * the profile will be inferred from the inner model instance.
   */
  profile?: ModelProfile;
}
/**
 * Internal class used to create chat models.
 *
 * @internal
 */
declare class ConfigurableModel<RunInput extends BaseLanguageModelInput = BaseLanguageModelInput, CallOptions extends ConfigurableChatModelCallOptions = ConfigurableChatModelCallOptions> extends BaseChatModel<CallOptions, AIMessageChunk> {
  _llmType(): string;
  lc_namespace: string[];
  _defaultConfig?: Record<string, any>;
  /**
   * @default "any"
   */
  _configurableFields: string[] | "any";
  /**
   * @default ""
   */
  _configPrefix: string;
  /**
   * Methods which should be called after the model is initialized.
   * The key will be the method name, and the value will be the arguments.
   */
  _queuedMethodOperations: Record<string, any>;
  /** @internal */
  private _modelInstanceCache;
  /** @internal */
  private _profile?;
  constructor(fields: ConfigurableModelFields);
  _getModelInstance(config?: RunnableConfig): Promise<BaseChatModel<BaseChatModelCallOptions, AIMessageChunk<MessageStructure>>>;
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  bindTools(tools: BindToolsInput[], params?: Record<string, any>): ConfigurableModel<RunInput, CallOptions>;
  withStructuredOutput: BaseChatModel["withStructuredOutput"];
  _modelParams(config?: RunnableConfig): Record<string, any>;
  _removePrefix(str: string, prefix: string): string;
  /**
   * Bind config to a Runnable, returning a new Runnable.
   * @param {RunnableConfig | undefined} [config] - The config to bind.
   * @returns {RunnableBinding<RunInput, RunOutput, CallOptions>} A new RunnableBinding with the bound config.
   */
  withConfig(config?: RunnableConfig): RunnableBinding<RunInput, AIMessageChunk, CallOptions>;
  invoke(input: RunInput, options?: CallOptions): Promise<AIMessageChunk>;
  stream(input: RunInput, options?: CallOptions): Promise<IterableReadableStream<AIMessageChunk>>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<AIMessageChunk[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(AIMessageChunk | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(AIMessageChunk | Error)[]>;
  transform(generator: AsyncGenerator<RunInput>, options: CallOptions): AsyncGenerator<AIMessageChunk>;
  streamLog(input: RunInput, options?: Partial<CallOptions>, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): AsyncGenerator<RunLogPatch>;
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
  }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<StreamEvent>;
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
    encoding: "text/event-stream";
  }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<Uint8Array>;
  /**
   * Return profiling information for the model.
   *
   * @returns {ModelProfile} An object describing the model's capabilities and constraints
   */
  get profile(): ModelProfile;
  /** @internal */
  _getCacheKey(config?: RunnableConfig): string;
}
interface InitChatModelFields extends Partial<Record<string, any>> {
  modelProvider?: string;
  configurableFields?: string[] | "any";
  configPrefix?: string;
}
type ConfigurableFields = "any" | string[];
declare function initChatModel<RunInput extends BaseLanguageModelInput = BaseLanguageModelInput, CallOptions extends ConfigurableChatModelCallOptions = ConfigurableChatModelCallOptions>(model: string, fields?: Partial<Record<string, any>> & {
  modelProvider?: string;
  configurableFields?: never;
  configPrefix?: string;
}): Promise<ConfigurableModel<RunInput, CallOptions>>;
declare function initChatModel<RunInput extends BaseLanguageModelInput = BaseLanguageModelInput, CallOptions extends ConfigurableChatModelCallOptions = ConfigurableChatModelCallOptions>(model: never, options?: Partial<Record<string, any>> & {
  modelProvider?: string;
  configurableFields?: never;
  configPrefix?: string;
  profile?: ModelProfile;
}): Promise<ConfigurableModel<RunInput, CallOptions>>;
declare function initChatModel<RunInput extends BaseLanguageModelInput = BaseLanguageModelInput, CallOptions extends ConfigurableChatModelCallOptions = ConfigurableChatModelCallOptions>(model?: string, options?: Partial<Record<string, any>> & {
  modelProvider?: string;
  configurableFields?: ConfigurableFields;
  configPrefix?: string;
  profile?: ModelProfile;
}): Promise<ConfigurableModel<RunInput, CallOptions>>;
//#endregion
export { ChatModelProvider, ConfigurableChatModelCallOptions, ConfigurableFields, ConfigurableModel, InitChatModelFields, MODEL_PROVIDER_CONFIG, _inferModelProvider, getChatModelByClassName, initChatModel };
//# sourceMappingURL=universal.d.ts.map