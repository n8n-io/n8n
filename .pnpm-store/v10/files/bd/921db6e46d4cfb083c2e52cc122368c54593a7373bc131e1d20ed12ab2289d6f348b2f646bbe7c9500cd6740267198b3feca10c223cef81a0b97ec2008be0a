const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_common = require('./common.cjs');
const require_iflytek_websocket_stream = require('../../utils/iflytek_websocket_stream.cjs');
const ws = require_rolldown_runtime.__toESM(require("ws"));

//#region src/chat_models/iflytek_xinghuo/index.ts
var iflytek_xinghuo_exports = {};
require_rolldown_runtime.__export(iflytek_xinghuo_exports, { ChatIflytekXinghuo: () => ChatIflytekXinghuo });
var WebSocketStream = class extends require_iflytek_websocket_stream.BaseWebSocketStream {
	openWebSocket(url, options) {
		return new ws.default(url, options.protocols ?? []);
	}
};
/**
* @example
* ```typescript
* const model = new ChatIflytekXinghuo();
* const response = await model.invoke([new HumanMessage("Nice to meet you!")]);
* console.log(response);
* ```
*/
var ChatIflytekXinghuo = class extends require_common.BaseChatIflytekXinghuo {
	async openWebSocketStream(options) {
		const host = "spark-api.xf-yun.com";
		const date = (/* @__PURE__ */ new Date()).toUTCString();
		const url = `GET /${this.version}/chat HTTP/1.1`;
		const { createHmac } = await import("node:crypto");
		const hash = createHmac("sha256", this.iflytekApiSecret).update(`host: ${host}\ndate: ${date}\n${url}`).digest("base64");
		const authorization_origin = `api_key="${this.iflytekApiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${hash}"`;
		const authorization = Buffer.from(authorization_origin).toString("base64");
		let authWebSocketUrl = this.apiUrl;
		authWebSocketUrl += `?authorization=${authorization}`;
		authWebSocketUrl += `&host=${encodeURIComponent(host)}`;
		authWebSocketUrl += `&date=${encodeURIComponent(date)}`;
		return new WebSocketStream(authWebSocketUrl, options);
	}
};

//#endregion
exports.ChatIflytekXinghuo = ChatIflytekXinghuo;
Object.defineProperty(exports, 'iflytek_xinghuo_exports', {
  enumerable: true,
  get: function () {
    return iflytek_xinghuo_exports;
  }
});
//# sourceMappingURL=index.cjs.map