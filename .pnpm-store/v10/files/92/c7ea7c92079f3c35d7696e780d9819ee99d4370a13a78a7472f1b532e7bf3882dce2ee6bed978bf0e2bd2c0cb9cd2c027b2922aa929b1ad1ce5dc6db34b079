import { ChatTencentHunyuan, TencentHunyuanChatInput } from "./base.js";
import { BaseChatModelParams } from "@langchain/core/language_models/chat_models";

//#region src/chat_models/tencent_hunyuan/index.d.ts

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
declare class ChatTencentHunyuan$1 extends ChatTencentHunyuan {
  constructor(fields?: Partial<TencentHunyuanChatInput> & BaseChatModelParams);
}
//#endregion
export { ChatTencentHunyuan$1 as ChatTencentHunyuan, type TencentHunyuanChatInput };
//# sourceMappingURL=index.d.ts.map