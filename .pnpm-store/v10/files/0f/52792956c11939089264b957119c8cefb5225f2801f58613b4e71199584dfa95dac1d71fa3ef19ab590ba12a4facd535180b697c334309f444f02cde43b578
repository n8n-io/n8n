import { LlamaBaseCppInputs } from "../utils/llama_cpp.cjs";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { BaseChatModelParams, SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { ChatHistoryItem, LlamaChatSession, LlamaContext, LlamaModel } from "node-llama-cpp";

//#region src/chat_models/llama_cpp.d.ts

/**
 * Note that the modelPath is the only required parameter. For testing you
 * can set this in the environment variable `LLAMA_PATH`.
 */
interface LlamaCppInputs extends LlamaBaseCppInputs, BaseChatModelParams {}
interface LlamaCppCallOptions extends BaseLanguageModelCallOptions {
  /** The maximum number of tokens the response should contain. */
  maxTokens?: number;
  /** A function called when matching the provided token array */
  onToken?: (tokens: number[]) => void;
}
/**
 *  To use this model you need to have the `node-llama-cpp` module installed.
 *  This can be installed using `npm install -S node-llama-cpp` and the minimum
 *  version supported in version 2.0.0.
 *  This also requires that have a locally built version of Llama3 installed.
 * @example
 * ```typescript
 * // Initialize the ChatLlamaCpp model with the path to the model binary file.
 * const model = await ChatLlamaCpp.initialize({
 *   modelPath: "/Replace/with/path/to/your/model/gguf-llama3-Q4_0.bin",
 *   temperature: 0.5,
 * });
 *
 * // Call the model with a message and await the response.
 * const response = await model.invoke([
 *   new HumanMessage({ content: "My name is John." }),
 * ]);
 *
 * // Log the response to the console.
 * console.log({ response });
 *
 * ```
 */
declare class ChatLlamaCpp extends SimpleChatModel<LlamaCppCallOptions> {
  static inputs: LlamaCppInputs;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  trimWhitespaceSuffix?: boolean;
  _model: LlamaModel;
  _context: LlamaContext;
  _session: LlamaChatSession | null;
  lc_serializable: boolean;
  static lc_name(): string;
  constructor(inputs: LlamaCppInputs);
  /**
   * Initializes the llama_cpp model for usage in the chat models wrapper.
   * @param inputs - the inputs passed onto the model.
   * @returns A Promise that resolves to the ChatLlamaCpp type class.
   */
  static initialize(inputs: LlamaBaseCppInputs): Promise<ChatLlamaCpp>;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): {};
  invocationParams(): {
    maxTokens: number | undefined;
    temperature: number | undefined;
    topK: number | undefined;
    topP: number | undefined;
    trimWhitespaceSuffix: boolean | undefined;
  };
  /** @ignore */
  _call(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
  _streamResponseChunks(input: BaseMessage[], _options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  protected _buildSession(messages: BaseMessage[]): string;
  protected _convertMessagesToInteractions(messages: BaseMessage[]): ChatHistoryItem[];
  protected _buildPrompt(input: BaseMessage[]): string;
}
//#endregion
export { ChatLlamaCpp, LlamaCppCallOptions, LlamaCppInputs };
//# sourceMappingURL=llama_cpp.d.cts.map