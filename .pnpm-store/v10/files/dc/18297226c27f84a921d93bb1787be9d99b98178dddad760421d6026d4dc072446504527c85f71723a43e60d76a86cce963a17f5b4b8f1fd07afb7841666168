import { GeminiContent, GoogleAIBaseLLMInput, GoogleAIModelParams, GoogleAIResponseMimeType, GoogleAISafetyHandler, GoogleAISafetySetting, GoogleBaseLLMInput, GooglePlatformType } from "./types.js";
import { GoogleAbstractedClient } from "./auth.js";
import { AbstractGoogleLLMConnection } from "./connection.js";
import { ChatGoogleBase } from "./chat_models.js";
import { BaseMessage, MessageContent } from "@langchain/core/messages";
import { BaseLanguageModelCallOptions, BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { Callbacks } from "@langchain/core/callbacks/manager";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms.d.ts
declare class GoogleLLMConnection<AuthOptions> extends AbstractGoogleLLMConnection<MessageContent, AuthOptions> {
  formatContents(input: MessageContent, _parameters: GoogleAIModelParams): Promise<GeminiContent[]>;
}
/**
 * Integration with an LLM.
 */
declare abstract class GoogleBaseLLM<AuthOptions> extends LLM<BaseLanguageModelCallOptions> implements GoogleBaseLLMInput<AuthOptions> {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  originalFields?: GoogleBaseLLMInput<AuthOptions>;
  lc_serializable: boolean;
  modelName: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  stopSequences: string[];
  safetySettings: GoogleAISafetySetting[];
  safetyHandler: GoogleAISafetyHandler;
  responseMimeType: GoogleAIResponseMimeType;
  protected connection: GoogleLLMConnection<AuthOptions>;
  protected streamedConnection: GoogleLLMConnection<AuthOptions>;
  constructor(fields?: GoogleBaseLLMInput<AuthOptions>);
  abstract buildAbstractedClient(fields?: GoogleAIBaseLLMInput<AuthOptions>): GoogleAbstractedClient;
  buildApiKeyClient(apiKey: string): GoogleAbstractedClient;
  buildApiKey(fields?: GoogleAIBaseLLMInput<AuthOptions>): string | undefined;
  buildClient(fields?: GoogleAIBaseLLMInput<AuthOptions>): GoogleAbstractedClient;
  buildConnection(fields: GoogleBaseLLMInput<AuthOptions>, client: GoogleAbstractedClient): void;
  get platform(): GooglePlatformType;
  _llmType(): string;
  formatPrompt(prompt: string): MessageContent;
  /**
   * For some given input string and options, return a string output.
   *
   * Despite the fact that `invoke` is overridden below, we still need this
   * in order to handle public APi calls to `generate()`.
   */
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
  _streamIterator(input: BaseLanguageModelInput, options?: BaseLanguageModelCallOptions): AsyncGenerator<string>;
  predictMessages(messages: BaseMessage[], options?: string[] | BaseLanguageModelCallOptions, _callbacks?: Callbacks): Promise<BaseMessage>;
  /**
   * Internal implementation detail to allow Google LLMs to support
   * multimodal input by delegating to the chat model implementation.
   *
   * TODO: Replace with something less hacky.
   */
  protected createProxyChat(): ChatGoogleBase<AuthOptions>;
  invoke(input: BaseLanguageModelInput, options?: BaseLanguageModelCallOptions): Promise<string>;
}
//#endregion
export { GoogleBaseLLM };
//# sourceMappingURL=llms.d.ts.map