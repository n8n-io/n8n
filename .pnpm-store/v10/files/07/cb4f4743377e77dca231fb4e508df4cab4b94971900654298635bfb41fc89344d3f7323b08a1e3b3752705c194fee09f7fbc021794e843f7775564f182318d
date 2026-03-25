import { sign } from "../../utils/tencent_hunyuan/common.js";
import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/tencent_hunyuan/base.d.ts

/**
 * Type representing the role of a message in the Hunyuan chat model.
 */
type HunyuanMessageRole = "system" | "assistant" | "user";
/**
 * Interface representing a message in the Hunyuan chat model.
 */
interface HunyuanMessage {
  Role: HunyuanMessageRole;
  Content: string;
}
/**
 * Models available, see https://cloud.tencent.com/document/product/1729/104753.
 */
type ModelName = (string & NonNullable<unknown>) | "hunyuan-lite" | "hunyuan-standard" | "hunyuan-standard-32K" | "hunyuan-standard-256K" | "hunyuan-pro";
/**
 * Interface representing a request for a chat completion.
 * See https://cloud.tencent.com/document/api/1729/105701.
 */
interface ChatCompletionRequest {
  Model: ModelName;
  Messages: HunyuanMessage[];
  Stream?: boolean;
  StreamModeration?: boolean;
  EnableEnhancement?: boolean;
  Temperature?: number;
  TopP?: number;
}
/**
 * Interface defining the input to the ChatTencentHunyuan class.
 */
interface TencentHunyuanChatInput {
  /**
   * Tencent Cloud API Host.
   * @default "hunyuan.tencentcloudapi.com"
   */
  host?: string;
  /**
   * Model name to use.
   * @default "hunyuan-pro"
   */
  model: ModelName;
  /**
   * Whether to stream the results or not. Defaults to false.
   * @default false
   */
  streaming?: boolean;
  /**
   * SecretID to use when making requests, can be obtained from https://console.cloud.tencent.com/cam/capi.
   * Defaults to the value of `TENCENT_SECRET_ID` environment variable.
   */
  tencentSecretId?: string;
  /**
   * Secret key to use when making requests, can be obtained from https://console.cloud.tencent.com/cam/capi.
   * Defaults to the value of `TENCENT_SECRET_KEY` environment variable.
   */
  tencentSecretKey?: string;
  /**
   * Amount of randomness injected into the response. Ranges
   * from 0.0 to 2.0. Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative
   * and generative tasks. Defaults to 1.0.95.
   */
  temperature?: number;
  /**
   * Total probability mass of tokens to consider at each step. Range
   * from 0 to 1.0. Defaults to 1.0.
   */
  topP?: number;
}
/**
 * Interface defining the input to the ChatTencentHunyuan class.
 */
interface TencentHunyuanChatInputWithSign extends TencentHunyuanChatInput {
  /**
   * Tencent Cloud API v3 sign method.
   */
  sign: sign;
}
/**
 * Wrapper around Tencent Hunyuan large language models that use the Chat endpoint.
 *
 * To use you should have the `TENCENT_SECRET_ID` and `TENCENT_SECRET_KEY`
 * environment variable set.
 *
 * @augments BaseLLM
 * @augments TencentHunyuanInput
 * @example
 * ```typescript
 * const messages = [new HumanMessage("Hello")];
 *
 * const hunyuanLite = new ChatTencentHunyuan({
 *   model: "hunyuan-lite",
 *   tencentSecretId: "YOUR-SECRET-ID",
 *   tencentSecretKey: "YOUR-SECRET-KEY",
 * });
 *
 * let res = await hunyuanLite.call(messages);
 *
 * const hunyuanPro = new ChatTencentHunyuan({
 *   model: "hunyuan-pro",
 *   temperature: 1,
 *   tencentSecretId: "YOUR-SECRET-ID",
 *   tencentSecretKey: "YOUR-SECRET-KEY",
 * });
 *
 * res = await hunyuanPro.call(messages);
 * ```
 */
declare class ChatTencentHunyuan extends BaseChatModel implements TencentHunyuanChatInputWithSign {
  static lc_name(): string;
  get callKeys(): string[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  tencentSecretId?: string;
  tencentSecretKey?: string;
  streaming: boolean;
  host: string;
  model: string;
  temperature?: number | undefined;
  topP?: number | undefined;
  sign: sign;
  constructor(fields?: Partial<TencentHunyuanChatInputWithSign> & BaseChatModelParams);
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(): Omit<ChatCompletionRequest, "Messages">;
  /**
   * Get the HTTP headers used to invoke the model
   */
  invocationHeaders(request: object, timestamp: number): HeadersInit;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  private createStream;
  /** @ignore */
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  /** @ignore */
  completionWithRetry(request: ChatCompletionRequest, signal?: AbortSignal): Promise<any>;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): never[];
}
//#endregion
export { ChatTencentHunyuan, TencentHunyuanChatInput };
//# sourceMappingURL=base.d.ts.map