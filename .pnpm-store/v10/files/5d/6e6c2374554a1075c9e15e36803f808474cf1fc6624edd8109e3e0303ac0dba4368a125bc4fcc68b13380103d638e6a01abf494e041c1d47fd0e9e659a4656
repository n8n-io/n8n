import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";

//#region src/chat_models/alibaba_tongyi.d.ts

/**
 * Type representing the role of a message in the Tongyi chat model.
 */
type TongyiMessageRole = "system" | "assistant" | "user";
/**
 * Interface representing a message in the Tongyi chat model.
 */
interface TongyiMessage {
  role: TongyiMessageRole;
  content: string;
}
/**
 * Interface representing a request for a chat completion.
 *
 * See https://help.aliyun.com/zh/dashscope/developer-reference/model-square/
 */
interface ChatCompletionRequest {
  model: (string & NonNullable<unknown>) | "qwen-turbo" | "qwen-plus" | "qwen-max" | "qwen-max-1201" | "qwen-max-longcontext" | "qwen-7b-chat" | "qwen-14b-chat" | "qwen-72b-chat" | "llama2-7b-chat-v2" | "llama2-13b-chat-v2" | "baichuan-7b-v1" | "baichuan2-13b-chat-v1" | "baichuan2-7b-chat-v1" | "chatglm3-6b" | "chatglm-6b-v2";
  input: {
    messages: TongyiMessage[];
  };
  parameters: {
    stream?: boolean;
    result_format?: "text" | "message";
    seed?: number | null;
    max_tokens?: number | null;
    top_p?: number | null;
    top_k?: number | null;
    repetition_penalty?: number | null;
    temperature?: number | null;
    enable_search?: boolean | null;
    incremental_output?: boolean | null;
  };
}
/**
 * Interface defining the input to the ChatAlibabaTongyi class.
 */
interface AlibabaTongyiChatInput {
  /**
   * Model name to use. Available options are: qwen-turbo, qwen-plus, qwen-max, or Other compatible models.
   * Alias for `model`
   * @default "qwen-turbo"
   */
  modelName: string;
  /** Model name to use. Available options are: qwen-turbo, qwen-plus, qwen-max, or Other compatible models.
   * @default "qwen-turbo"
   */
  model: string;
  /** Whether to stream the results or not. Defaults to false. */
  streaming?: boolean;
  /** Messages to pass as a prefix to the prompt */
  prefixMessages?: TongyiMessage[];
  /**
   * API key to use when making requests. Defaults to the value of
   * `ALIBABA_API_KEY` environment variable.
   */
  alibabaApiKey?: string;
  /**
   * Region for the Alibaba Tongyi API endpoint.
   *
   * Available regions:
   * - 'china' (default): https://dashscope.aliyuncs.com/compatible-mode/v1
   * - 'singapore': https://dashscope-intl.aliyuncs.com/compatible-mode/v1
   * - 'us': https://dashscope-us.aliyuncs.com/compatible-mode/v1
   *
   * @default "china"
   */
  region?: "china" | "singapore" | "us";
  /** Amount of randomness injected into the response. Ranges
   * from 0 to 1 (0 is not included). Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative
   * and generative tasks. Defaults to 0.95.
   */
  temperature?: number;
  /** Total probability mass of tokens to consider at each step. Range
   * from 0 to 1.0. Defaults to 0.8.
   */
  topP?: number;
  topK?: number;
  enableSearch?: boolean;
  maxTokens?: number;
  seed?: number;
  /** Penalizes repeated tokens according to frequency. Range
   * from 1.0 to 2.0. Defaults to 1.0.
   */
  repetitionPenalty?: number;
}
/**
 * Wrapper around Ali Tongyi large language models that use the Chat endpoint.
 *
 * To use you should have the `ALIBABA_API_KEY`
 * environment variable set.
 *
 * @augments BaseLLM
 * @augments AlibabaTongyiInput
 * @example
 * ```typescript
 * // Default - uses China region
 * const qwen = new ChatAlibabaTongyi({
 *   alibabaApiKey: "YOUR-API-KEY",
 * });
 *
 * // Specify region explicitly
 * const qwen = new ChatAlibabaTongyi({
 *   model: "qwen-turbo",
 *   temperature: 1,
 *   region: "singapore", // or "us" or "china"
 *   alibabaApiKey: "YOUR-API-KEY",
 * });
 *
 * const messages = [new HumanMessage("Hello")];
 *
 * await qwen.call(messages);
 * ```
 */
declare class ChatAlibabaTongyi extends BaseChatModel implements AlibabaTongyiChatInput {
  static lc_name(): string;
  get callKeys(): string[];
  get lc_secrets(): {
    alibabaApiKey: string;
  };
  get lc_aliases(): undefined;
  lc_serializable: boolean;
  alibabaApiKey?: string;
  streaming: boolean;
  prefixMessages?: TongyiMessage[];
  modelName: ChatCompletionRequest["model"];
  model: ChatCompletionRequest["model"];
  apiUrl: string;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  topP?: number | undefined;
  topK?: number | undefined;
  repetitionPenalty?: number | undefined;
  seed?: number | undefined;
  enableSearch?: boolean | undefined;
  region: "china" | "singapore" | "us";
  /**
   * Get the API URL based on the specified region.
   *
   * @param region - The region to get the URL for ('china', 'singapore', or 'us')
   * @returns The base URL for the specified region
   */
  private getRegionBaseUrl;
  constructor(fields?: Partial<AlibabaTongyiChatInput> & BaseChatModelParams);
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(): ChatCompletionRequest["parameters"];
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): ChatCompletionRequest["parameters"] & Pick<ChatCompletionRequest, "model">;
  /** @ignore */
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  /** @ignore */
  completionWithRetry(request: ChatCompletionRequest, stream: boolean, signal?: AbortSignal, onmessage?: (event: MessageEvent) => void): Promise<any>;
  _streamResponseChunks(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  private createTongyiStream;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): never[];
}
//#endregion
export { ChatAlibabaTongyi, TongyiMessageRole };
//# sourceMappingURL=alibaba_tongyi.d.cts.map