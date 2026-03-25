import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { Runnable } from "@langchain/core/runnables";
import { BaseLanguageModelInput, ToolDefinition } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/zhipuai.d.ts
type ZhipuMessageRole = "system" | "assistant" | "user";
interface ZhipuMessage {
  role: ZhipuMessageRole;
  content: string;
}
/**
 * Interface representing a request for a chat completion.
 *
 * See https://open.bigmodel.cn/dev/howuse/model
 */
type ModelName = (string & NonNullable<unknown>) | "chatglm_pro" | "chatglm_std" | "chatglm_lite" | "glm-4" | "glm-4v" | "glm-3-turbo" | "chatglm_turbo";
interface ChatZhipuAICallOptions extends BaseChatModelCallOptions {
  tools?: BindToolsInput[];
}
interface ChatCompletionRequest {
  model: ModelName;
  messages?: ZhipuMessage[];
  tools?: ToolDefinition[];
  do_sample?: boolean;
  stream?: boolean;
  request_id?: string;
  max_tokens?: number | null;
  top_p?: number | null;
  top_k?: number | null;
  temperature?: number | null;
  stop?: string[];
}
/**
 * Interface defining the input to the ZhipuAIChatInput class.
 */
interface ChatZhipuAIParams {
  /**
   * @default "glm-3-turbo"
   * Alias for `model`
   */
  modelName: ModelName;
  /**
   * @default "glm-3-turbo"
   */
  model: ModelName;
  /** Whether to stream the results or not. Defaults to false. */
  streaming?: boolean;
  /** Messages to pass as a prefix to the prompt */
  messages?: ZhipuMessage[];
  /**
   * API key to use when making requests. Defaults to the value of
   * `ZHIPUAI_API_KEY` environment variable.
   * Alias for `apiKey`
   */
  zhipuAIApiKey?: string;
  /**
   * API key to use when making requests. Defaults to the value of
   * `ZHIPUAI_API_KEY` environment variable.
   */
  apiKey?: string;
  /** Amount of randomness injected into the response. Ranges
   * from 0 to 1 (0 is not included). Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative
   * and generative tasks. Defaults to 0.95
   */
  temperature?: number;
  /** Total probability mass of tokens to consider at each step. Range
   * from 0 to 1 Defaults to 0.7
   */
  topP?: number;
  /**
   * Unique identifier for the request. Defaults to a random UUID.
   */
  requestId?: string;
  /**
   * turn on sampling strategy when do_sample is true,
   * do_sample is false, temperature、top_p will not take effect
   */
  doSample?: boolean;
  /**
   * max value is 8192，defaults to 1024
   */
  maxTokens?: number;
  stop?: string[];
}
declare class ChatZhipuAI extends BaseChatModel<ChatZhipuAICallOptions> implements ChatZhipuAIParams {
  static lc_name(): string;
  get callKeys(): string[];
  get lc_secrets(): {
    zhipuAIApiKey: string;
    apiKey: string;
  };
  get lc_aliases(): undefined;
  zhipuAIApiKey?: string;
  apiKey?: string;
  streaming: boolean;
  doSample?: boolean;
  messages?: ZhipuMessage[];
  requestId?: string;
  modelName: ChatCompletionRequest["model"];
  model: ChatCompletionRequest["model"];
  apiUrl: string;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  topP?: number | undefined;
  stop?: string[];
  constructor(fields?: Partial<ChatZhipuAIParams> & BaseChatModelParams);
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): Omit<ChatCompletionRequest, "messages">;
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): Omit<ChatCompletionRequest, "messages">;
  /** @ignore */
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  bindTools(tools: BindToolsInput[], kwargs?: Partial<this["ParsedCallOptions"]>): Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions>;
  /** @ignore */
  completionWithRetry(request: ChatCompletionRequest, stream: boolean, signal?: AbortSignal, onmessage?: (event: MessageEvent) => void): Promise<any>;
  private createZhipuStream;
  private _deserialize;
  _streamResponseChunks(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): never[];
}
//#endregion
export { ChatZhipuAI, ChatZhipuAICallOptions, ChatZhipuAIParams, ZhipuMessageRole };
//# sourceMappingURL=zhipuai.d.ts.map