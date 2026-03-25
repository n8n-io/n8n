import { BaseWebSocketStream, WebSocketStreamOptions } from "../../utils/iflytek_websocket_stream.cjs";
import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/chat_models/iflytek_xinghuo/common.d.ts

/**
 * Type representing the role of a message in the Xinghuo chat model.
 */
type XinghuoMessageRole = "assistant" | "user";
/**
 * Interface representing a message in the Xinghuo chat model.
 */
interface XinghuoMessage {
  role: XinghuoMessageRole;
  content: string;
}
/**
 * Interface representing a request for a chat completion.
 */
interface ChatCompletionRequest {
  messages: XinghuoMessage[];
  temperature?: number;
  max_tokens?: number;
  top_k?: number;
  chat_id?: string;
}
/**
 * Interface representing a response from a chat completion.
 */
interface ChatCompletionResponse {
  result: string;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}
declare interface IflytekXinghuoChatInput {
  /** Model version to use. Available options are: v1.1, v2.1, v3.1, v3.5, v4.0
   * @default "v3.1"
   */
  version: string;
  /**
   * ID of the end-user who made requests.
   */
  userId?: string;
  /**
   * APPID to use when making requests. Defaults to the value of
   * `IFLYTEK_APPID` environment variable.
   */
  iflytekAppid?: string;
  /**
   * API key to use when making requests. Defaults to the value of
   * `IFLYTEK_API_KEY` environment variable.
   */
  iflytekApiKey?: string;
  /**
   * API Secret to use when making requests. Defaults to the value of
   * `IFLYTEK_API_SECRET` environment variable.
   */
  iflytekApiSecret?: string;
  /** Amount of randomness injected into the response. Ranges
   * from 0 to 1 (0 is not included). Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative
   * and generative tasks. Defaults to 0.5.
   */
  temperature?: number;
  max_tokens?: number;
  top_k?: number;
  streaming?: boolean;
}
/**
 * Wrapper around IflytekXingHuo large language models that use the Chat endpoint.
 *
 * To use you should have the `IFLYTEK_API_KEY` and `IFLYTEK_API_SECRET` and `IFLYTEK_APPID`
 * environment variable set.
 *
 * @augments BaseChatModel
 * @augments IflytekXinghuoChatInput
 */
declare abstract class BaseChatIflytekXinghuo extends BaseChatModel implements IflytekXinghuoChatInput {
  static lc_name(): string;
  get callKeys(): string[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  version: string;
  iflytekAppid: string;
  iflytekApiKey: string;
  iflytekApiSecret: string;
  userId?: string;
  apiUrl: string;
  domain: string;
  temperature: number;
  max_tokens: number;
  top_k: number;
  streaming: boolean;
  constructor(fields?: Partial<IflytekXinghuoChatInput> & BaseChatModelParams);
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): {
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    top_k?: number | undefined;
    chat_id?: string | undefined;
    version: string;
    streaming: boolean;
  };
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(): Omit<ChatCompletionRequest, "messages"> & {
    streaming: boolean;
  };
  /**
   * Method that retrieves the auth websocketStream for making requests to the Iflytek Xinghuo API.
   * @returns The auth websocketStream for making requests to the Iflytek Xinghuo API.
   */
  abstract openWebSocketStream<T extends BaseWebSocketStream<string>>(options: WebSocketStreamOptions): Promise<T>;
  /**
   * Calls the Xinghuo API completion.
   * @param request The request to send to the Xinghuo API.
   * @param signal The signal for the API call.
   * @returns The response from the Xinghuo API.
   */
  completion(request: ChatCompletionRequest, stream: true, signal?: AbortSignal): Promise<IterableReadableStream<string>>;
  completion(request: ChatCompletionRequest, stream: false, signal?: AbortSignal): Promise<ChatCompletionResponse>;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun | undefined): Promise<ChatResult>;
  /** @ignore */
  _combineLLMOutput(): Record<string, any> | undefined;
  _llmType(): string;
}
//#endregion
export { BaseChatIflytekXinghuo };
//# sourceMappingURL=common.d.cts.map