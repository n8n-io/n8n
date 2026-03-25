import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import Prem, { ChatCompletionStreamingCompletionData, CreateChatCompletionRequest, CreateChatCompletionResponse } from "@premai/prem-sdk";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/premai.d.ts
type RoleEnum = "user" | "assistant";
/**
 * Input to chat model class.
 */
interface ChatPremInput extends BaseChatModelParams {
  project_id?: number | string;
  session_id?: string;
  messages?: {
    role: "user" | "assistant";
    content: string;
    [k: string]: unknown;
  }[];
  model?: string;
  system_prompt?: string;
  frequency_penalty?: number;
  logit_bias?: {
    [k: string]: unknown;
  };
  max_tokens?: number;
  n?: number;
  presence_penalty?: number;
  response_format?: {
    [k: string]: unknown;
  };
  seed?: number;
  stop?: string;
  temperature?: number;
  top_p?: number;
  tools?: {
    [k: string]: unknown;
  }[];
  user?: string;
  /**
   * The Prem API key to use for requests.
   * @default process.env.PREM_API_KEY
   */
  apiKey?: string;
  streaming?: boolean;
}
interface ChatCompletionCreateParamsNonStreaming extends CreateChatCompletionRequest {
  stream?: false;
}
interface ChatCompletionCreateParamsStreaming extends CreateChatCompletionRequest {
  stream: true;
}
type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;
declare function messageToPremRole(message: BaseMessage): RoleEnum;
/**
 * Integration with a chat model.
 */
declare class ChatPrem<CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions> extends BaseChatModel<CallOptions> implements ChatPremInput {
  client: Prem;
  apiKey?: string;
  project_id: number;
  session_id?: string;
  messages: {
    [k: string]: unknown;
    role: "user" | "assistant";
    content: string;
  }[];
  model?: string;
  system_prompt?: string;
  frequency_penalty?: number;
  logit_bias?: {
    [k: string]: unknown;
  };
  max_tokens?: number;
  n?: number;
  presence_penalty?: number;
  response_format?: {
    [k: string]: unknown;
  };
  seed?: number;
  stop?: string;
  temperature?: number;
  top_p?: number;
  tools?: {
    [k: string]: unknown;
  }[];
  user?: string;
  streaming: boolean;
  [k: string]: unknown;
  static lc_name(): string;
  lc_serializable: boolean;
  /**
   * Replace with any secrets this class passes to `super`.
   * See {@link ../../langchain-cohere/src/chat_model.ts} for
   * an example.
   */
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  constructor(fields?: ChatPremInput);
  _llmType(): string;
  completionWithRetry(request: ChatCompletionCreateParamsStreaming, options?: any): Promise<AsyncIterable<ChatCompletionStreamingCompletionData>>;
  completionWithRetry(request: ChatCompletionCreateParams, options?: any): Promise<CreateChatCompletionResponse>;
  invocationParams(options: this["ParsedCallOptions"]): any;
  /**
   * Implement to support streaming.
   * Should yield chunks iteratively.
   */
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  /** @ignore */
  _combineLLMOutput(): never[];
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
}
//#endregion
export { ChatCompletionCreateParams, ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming, ChatPrem, ChatPremInput, RoleEnum, messageToPremRole };
//# sourceMappingURL=premai.d.ts.map