import { __export } from "../../_virtual/rolldown_runtime.js";
import { sign } from "../../utils/tencent_hunyuan/index.js";
import { ChatTencentHunyuan } from "./base.js";

//#region src/chat_models/tencent_hunyuan/index.ts
var tencent_hunyuan_exports = {};
__export(tencent_hunyuan_exports, { ChatTencentHunyuan: () => ChatTencentHunyuan$1 });
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
var ChatTencentHunyuan$1 = class extends ChatTencentHunyuan {
	constructor(fields) {
		super({
			...fields,
			sign
		});
	}
};

//#endregion
export { ChatTencentHunyuan$1 as ChatTencentHunyuan, tencent_hunyuan_exports };
//# sourceMappingURL=index.js.map