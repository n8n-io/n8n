import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/moonshot.d.ts
type MoonshotMessageRole = "system" | "assistant" | "user";
interface MoonshotMessage {
  role: MoonshotMessageRole;
  content: string;
}
/**
 * Interface representing a request for a chat completion.
 *
 * See https://platform.moonshot.cn/docs/intro#%E6%A8%A1%E5%9E%8B%E5%88%97%E8%A1%A8
 */
type ModelName = (string & NonNullable<unknown>) | "moonshot-v1-8k" | "moonshot-v1-32k" | "moonshot-v1-128k";
interface ChatCompletionRequest {
  model: ModelName;
  messages?: MoonshotMessage[];
  stream?: boolean;
  max_tokens?: number | null;
  top_p?: number | null;
  temperature?: number | null;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  n?: number;
}
/**
 * Interface defining the input to the MoonshotChatInput class.
 */
interface ChatMoonshotParams {
  /**
   * @default "moonshot-v1-8k"
   * Alias for `model`
   */
  modelName: ModelName;
  /**
   * @default "moonshot-v1-8k"
   */
  model: ModelName;
  /** Whether to stream the results or not. Defaults to false. */
  streaming?: boolean;
  /** Messages to pass as a prefix to the prompt */
  messages?: MoonshotMessage[];
  /**
   * API key to use when making requests. Defaults to the value of
   * `MOONSHOT_API_KEY` environment variable.
   */
  apiKey?: string;
  /**
   * Amount of randomness injected into the response. Ranges
   * from 0 to 1 (0 is not included). Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative and generative tasks.
   * Defaults to 0, recommended 0.3
   */
  temperature?: number;
  /**
   * Total probability mass of tokens to consider at each step. Range
   * from 0 to 1. Defaults to 1
   */
  topP?: number;
  /**
   * Different models have different maximum values. For example, the maximum
   * value of moonshot-v1-8k is 8192. Defaults to 1024
   */
  maxTokens?: number;
  stop?: string[];
  /**
   * There is a penalty, a number between -2.0 and 2.0. Positive values
   * penalize the newly generated words based on whether they appear in the
   * text, increasing the likelihood that the model will discuss new topics.
   * The default value is 0
   */
  presencePenalty?: number;
  /**
   * Frequency penalty, a number between -2.0 and 2.0. Positive values
   * penalize the newly generated words based on their existing frequency in the
   * text, making the model less likely to repeat the same words verbatim.
   * The default value is 0
   */
  frequencyPenalty?: number;
  /**
   * The default value is 1 and cannot be greater than 5. In particular,
   * when temperature is very small and close to 0, we can only return 1 result.
   * If n is already set and > 1, Moonshot will return an invalid input parameter
   * (invalid_request_error).
   */
  n?: number;
}
declare class ChatMoonshot extends BaseChatModel implements ChatMoonshotParams {
  static lc_name(): string;
  get callKeys(): string[];
  get lc_secrets(): {
    apiKey: string;
  };
  get lc_aliases(): undefined;
  apiKey?: string;
  streaming: boolean;
  messages?: MoonshotMessage[];
  modelName: ChatCompletionRequest["model"];
  model: ChatCompletionRequest["model"];
  apiUrl: string;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  topP?: number | undefined;
  stop?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  n?: number;
  constructor(fields?: Partial<ChatMoonshotParams> & BaseChatModelParams);
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(): Omit<ChatCompletionRequest, "messages">;
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): Omit<ChatCompletionRequest, "messages">;
  /** @ignore */
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  /** @ignore */
  completionWithRetry(request: ChatCompletionRequest, stream: boolean, signal?: AbortSignal, onmessage?: (event: MessageEvent) => void): Promise<any>;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): never[];
}
//#endregion
export { ChatMoonshot, ChatMoonshotParams, MoonshotMessageRole };
//# sourceMappingURL=moonshot.d.ts.map