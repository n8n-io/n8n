import { GeminiAPIConfig, GoogleAIAPI, GoogleAIAPIParams, GoogleAIBaseLLMInput, GoogleAIBaseLanguageModelCallOptions, GoogleAIModelModality, GoogleAIModelParams, GoogleAIModelRequestParams, GoogleAISafetyHandler, GoogleAISafetyParams, GoogleAISafetySetting, GoogleAIToolType, GoogleBaseLLMInput, GoogleConnectionParams, GooglePlatformType, GoogleSearchToolSetting, GoogleSpeechConfig } from "./types.cjs";
import { GoogleAbstractedClient } from "./auth.cjs";
import { AbstractGoogleLLMConnection } from "./connection.cjs";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { BaseChatModel, BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ModelProfile } from "@langchain/core/language_models/profile";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { SerializableSchema } from "@langchain/core/utils/standard_schema";

//#region src/chat_models.d.ts
declare class ChatConnection<AuthOptions> extends AbstractGoogleLLMConnection<BaseMessage[], AuthOptions> {
  convertSystemMessageToHumanContent: boolean | undefined;
  constructor(fields: GoogleAIBaseLLMInput<AuthOptions> | undefined, caller: AsyncCaller, client: GoogleAbstractedClient, streaming: boolean);
  get useSystemInstruction(): boolean;
  get computeUseSystemInstruction(): boolean;
  computeGoogleSearchToolAdjustmentFromModel(): Exclude<GoogleSearchToolSetting, boolean>;
  computeGoogleSearchToolAdjustment(apiConfig: GeminiAPIConfig): Exclude<GoogleSearchToolSetting, true>;
  buildGeminiAPI(): GoogleAIAPI;
  get api(): GoogleAIAPI;
}
/**
 * Input to chat model class.
 */
interface ChatGoogleBaseInput<AuthOptions> extends BaseChatModelParams, GoogleConnectionParams<AuthOptions>, GoogleAIModelParams, GoogleAISafetyParams, GoogleAIAPIParams, Pick<GoogleAIBaseLanguageModelCallOptions, "streamUsage"> {}
/**
 * Integration with a Google chat model.
 */
declare abstract class ChatGoogleBase<AuthOptions> extends BaseChatModel<GoogleAIBaseLanguageModelCallOptions, AIMessageChunk> implements ChatGoogleBaseInput<AuthOptions> {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  model: string;
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  maxReasoningTokens: number;
  topP: number;
  topK: number;
  seed: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences: string[];
  logprobs: boolean;
  topLogprobs: number;
  safetySettings: GoogleAISafetySetting[];
  responseModalities?: GoogleAIModelModality[];
  convertSystemMessageToHumanContent: boolean | undefined;
  safetyHandler: GoogleAISafetyHandler;
  speechConfig: GoogleSpeechConfig;
  streamUsage: boolean;
  streaming: boolean;
  labels?: Record<string, string>;
  protected connection: ChatConnection<AuthOptions>;
  protected streamedConnection: ChatConnection<AuthOptions>;
  constructor(fields?: ChatGoogleBaseInput<AuthOptions>);
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  abstract buildAbstractedClient(fields?: GoogleAIBaseLLMInput<AuthOptions>): GoogleAbstractedClient;
  buildApiKeyClient(apiKey: string): GoogleAbstractedClient;
  buildApiKey(fields?: GoogleAIBaseLLMInput<AuthOptions>): string | undefined;
  buildClient(fields?: GoogleAIBaseLLMInput<AuthOptions>): GoogleAbstractedClient;
  buildConnection(fields: GoogleBaseLLMInput<AuthOptions>, client: GoogleAbstractedClient): void;
  get platform(): GooglePlatformType;
  bindTools(tools: GoogleAIToolType[], kwargs?: Partial<GoogleAIBaseLanguageModelCallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, GoogleAIBaseLanguageModelCallOptions>;
  _llmType(): string;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): GoogleAIModelRequestParams;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager: CallbackManagerForLLMRun | undefined): Promise<ChatResult>;
  _streamResponseChunks(_messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  /** @ignore */
  _combineLLMOutput(): never[];
  /**
   * Return profiling information for the model.
   *
   * Provides information about the model's capabilities and constraints,
   * including token limits, multimodal support, and advanced features like
   * tool calling and structured output.
   *
   * @returns {ModelProfile} An object describing the model's capabilities and constraints
   */
  get profile(): ModelProfile;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { ChatConnection, ChatGoogleBase, ChatGoogleBaseInput };
//# sourceMappingURL=chat_models.d.cts.map