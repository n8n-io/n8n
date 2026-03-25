import { ChatOpenAIToolType, ResponsesTool } from "../utils/tools.cjs";
import { OpenAIVerbosityParam } from "../types.cjs";
import { BaseChatOpenAI, BaseChatOpenAICallOptions } from "./base.cjs";
import { OpenAI as OpenAI$1 } from "openai";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";

//#region src/chat_models/responses.d.ts
interface ChatOpenAIResponsesCallOptions extends BaseChatOpenAICallOptions {
  /**
   * Configuration options for a text response from the model. Can be plain text or
   * structured JSON data.
   */
  text?: OpenAI$1.Responses.ResponseCreateParams["text"];
  /**
   * The truncation strategy to use for the model response.
   */
  truncation?: OpenAI$1.Responses.ResponseCreateParams["truncation"];
  /**
   * Specify additional output data to include in the model response.
   */
  include?: OpenAI$1.Responses.ResponseCreateParams["include"];
  /**
   * The unique ID of the previous response to the model. Use this to create multi-turn
   * conversations.
   */
  previous_response_id?: OpenAI$1.Responses.ResponseCreateParams["previous_response_id"];
  /**
   * The verbosity of the model's response.
   */
  verbosity?: OpenAIVerbosityParam;
}
type ChatResponsesInvocationParams = Omit<OpenAI$1.Responses.ResponseCreateParams, "input">;
/**
 * OpenAI Responses API implementation.
 *
 * Will be exported in a later version of @langchain/openai.
 *
 * @internal
 */
declare class ChatOpenAIResponses<CallOptions extends ChatOpenAIResponsesCallOptions = ChatOpenAIResponsesCallOptions> extends BaseChatOpenAI<CallOptions> {
  invocationParams(options?: this["ParsedCallOptions"]): ChatResponsesInvocationParams;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  /**
   * Calls the Responses API with retry logic in case of failures.
   * @param request The request to send to the OpenAI API.
   * @param options Optional configuration for the API call.
   * @returns The response from the OpenAI API.
   */
  completionWithRetry(request: OpenAI$1.Responses.ResponseCreateParamsStreaming, requestOptions?: OpenAI$1.RequestOptions): Promise<AsyncIterable<OpenAI$1.Responses.ResponseStreamEvent>>;
  completionWithRetry(request: OpenAI$1.Responses.ResponseCreateParamsNonStreaming, requestOptions?: OpenAI$1.RequestOptions): Promise<OpenAI$1.Responses.Response>;
  /** @internal */
  protected _reduceChatOpenAITools(tools: ChatOpenAIToolType[], fields: {
    stream?: boolean;
    strict?: boolean;
  }): ResponsesTool[];
}
//#endregion
export { ChatOpenAIResponses, ChatOpenAIResponsesCallOptions, ChatResponsesInvocationParams };
//# sourceMappingURL=responses.d.cts.map