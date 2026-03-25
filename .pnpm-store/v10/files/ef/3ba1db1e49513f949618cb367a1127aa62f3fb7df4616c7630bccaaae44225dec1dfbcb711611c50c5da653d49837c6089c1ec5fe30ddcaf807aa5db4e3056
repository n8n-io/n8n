import { BaseChatOpenAI, BaseChatOpenAICallOptions } from "./base.js";
import { OpenAI as OpenAI$1 } from "openai";
import { BaseMessage, BaseMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/completions.d.ts
interface ChatOpenAICompletionsCallOptions extends BaseChatOpenAICallOptions {}
type ChatCompletionsInvocationParams = Omit<OpenAI$1.Chat.Completions.ChatCompletionCreateParams, "messages">;
/**
 * OpenAI Completions API implementation.
 * @internal
 */
declare class ChatOpenAICompletions<CallOptions extends ChatOpenAICompletionsCallOptions = ChatOpenAICompletionsCallOptions> extends BaseChatOpenAI<CallOptions> {
  /** @internal */
  invocationParams(options?: this["ParsedCallOptions"], extra?: {
    streaming?: boolean;
  }): ChatCompletionsInvocationParams;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  completionWithRetry(request: OpenAI$1.Chat.ChatCompletionCreateParamsStreaming, requestOptions?: OpenAI$1.RequestOptions): Promise<AsyncIterable<OpenAI$1.Chat.Completions.ChatCompletionChunk>>;
  completionWithRetry(request: OpenAI$1.Chat.ChatCompletionCreateParamsNonStreaming, requestOptions?: OpenAI$1.RequestOptions): Promise<OpenAI$1.Chat.Completions.ChatCompletion>;
  /**
   * @deprecated
   * This function was hoisted into a publicly accessible function from a
   * different export, but to maintain backwards compatibility with chat models
   * that depend on ChatOpenAICompletions, we'll keep it here as an overridable
   * method. This will be removed in a future release
   */
  protected _convertCompletionsDeltaToBaseMessageChunk(delta: Record<string, any>, rawResponse: OpenAI$1.Chat.Completions.ChatCompletionChunk, defaultRole?: OpenAI$1.Chat.ChatCompletionRole): BaseMessageChunk;
  /**
   * @deprecated
   * This function was hoisted into a publicly accessible function from a
   * different export, but to maintain backwards compatibility with chat models
   * that depend on ChatOpenAICompletions, we'll keep it here as an overridable
   * method. This will be removed in a future release
   */
  protected _convertCompletionsMessageToBaseMessage(message: OpenAI$1.ChatCompletionMessage, rawResponse: OpenAI$1.ChatCompletion): BaseMessage;
}
//#endregion
export { ChatOpenAICompletions, ChatOpenAICompletionsCallOptions };
//# sourceMappingURL=completions.d.ts.map