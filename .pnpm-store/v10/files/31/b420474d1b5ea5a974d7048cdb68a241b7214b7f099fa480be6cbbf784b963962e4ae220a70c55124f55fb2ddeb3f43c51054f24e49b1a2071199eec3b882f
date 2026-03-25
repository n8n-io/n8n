import { BaseChatModelParams, SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import * as webllm from "@mlc-ai/web-llm";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/webllm.d.ts
interface WebLLMInputs extends BaseChatModelParams {
  appConfig?: webllm.AppConfig;
  chatOptions?: webllm.ChatOptions;
  temperature?: number;
  model: string;
}
interface WebLLMCallOptions extends BaseLanguageModelCallOptions {}
/**
 * To use this model you need to have the `@mlc-ai/web-llm` module installed.
 * This can be installed using `npm install -S @mlc-ai/web-llm`.
 *
 * You can see a list of available model records here:
 * https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
 * @example
 * ```typescript
 * // Initialize the ChatWebLLM model with the model record.
 * const model = new ChatWebLLM({
 *   model: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
 *   chatOptions: {
 *     temperature: 0.5,
 *   },
 * });
 *
 * // Call the model with a message and await the response.
 * const response = await model.invoke([
 *   new HumanMessage({ content: "My name is John." }),
 * ]);
 * ```
 */
declare class ChatWebLLM extends SimpleChatModel<WebLLMCallOptions> {
  static inputs: WebLLMInputs;
  protected engine: webllm.MLCEngine;
  appConfig?: webllm.AppConfig;
  chatOptions?: webllm.ChatOptions;
  temperature?: number;
  model: string;
  static lc_name(): string;
  constructor(inputs: WebLLMInputs);
  _llmType(): string;
  initialize(progressCallback?: webllm.InitProgressCallback): Promise<void>;
  reload(modelId: string, newChatOpts?: webllm.ChatOptions): Promise<void>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _call(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
}
//#endregion
export { ChatWebLLM, WebLLMCallOptions, WebLLMInputs };
//# sourceMappingURL=webllm.d.ts.map