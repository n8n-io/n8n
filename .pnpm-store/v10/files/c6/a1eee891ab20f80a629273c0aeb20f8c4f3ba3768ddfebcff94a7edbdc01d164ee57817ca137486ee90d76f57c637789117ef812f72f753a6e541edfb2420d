const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_index = require('../../utils/tencent_hunyuan/index.cjs');
const require_base = require('./base.cjs');

//#region src/chat_models/tencent_hunyuan/index.ts
var tencent_hunyuan_exports = {};
require_rolldown_runtime.__export(tencent_hunyuan_exports, { ChatTencentHunyuan: () => ChatTencentHunyuan$1 });
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
var ChatTencentHunyuan$1 = class extends require_base.ChatTencentHunyuan {
	constructor(fields) {
		super({
			...fields,
			sign: require_index.sign
		});
	}
};

//#endregion
exports.ChatTencentHunyuan = ChatTencentHunyuan$1;
Object.defineProperty(exports, 'tencent_hunyuan_exports', {
  enumerable: true,
  get: function () {
    return tencent_hunyuan_exports;
  }
});
//# sourceMappingURL=index.cjs.map