const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_common = require('./common.cjs');
const require_iflytek_websocket_stream = require('../../utils/iflytek_websocket_stream.cjs');

//#region src/chat_models/iflytek_xinghuo/web.ts
var web_exports = {};
require_rolldown_runtime.__export(web_exports, { ChatIflytekXinghuo: () => ChatIflytekXinghuo });
var WebSocketStream = class extends require_iflytek_websocket_stream.BaseWebSocketStream {
	openWebSocket(url, options) {
		return new WebSocket(url, options.protocols ?? []);
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
		const keyBuffer = new TextEncoder().encode(this.iflytekApiSecret);
		const dataBuffer = new TextEncoder().encode(`host: ${host}\ndate: ${date}\n${url}`);
		const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["sign"]);
		const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
		const hash = window.btoa(String.fromCharCode(...new Uint8Array(signature)));
		const authorization_origin = `api_key="${this.iflytekApiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${hash}"`;
		const authorization = window.btoa(authorization_origin);
		let authWebSocketUrl = this.apiUrl;
		authWebSocketUrl += `?authorization=${authorization}`;
		authWebSocketUrl += `&host=${encodeURIComponent(host)}`;
		authWebSocketUrl += `&date=${encodeURIComponent(date)}`;
		return new WebSocketStream(authWebSocketUrl, options);
	}
};

//#endregion
exports.ChatIflytekXinghuo = ChatIflytekXinghuo;
Object.defineProperty(exports, 'web_exports', {
  enumerable: true,
  get: function () {
    return web_exports;
  }
});
//# sourceMappingURL=web.cjs.map