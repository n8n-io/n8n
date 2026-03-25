import { __export } from "../../_virtual/rolldown_runtime.js";
import { BaseChatIflytekXinghuo } from "./common.js";
import { BaseWebSocketStream } from "../../utils/iflytek_websocket_stream.js";

//#region src/chat_models/iflytek_xinghuo/web.ts
var web_exports = {};
__export(web_exports, { ChatIflytekXinghuo: () => ChatIflytekXinghuo });
var WebSocketStream = class extends BaseWebSocketStream {
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
var ChatIflytekXinghuo = class extends BaseChatIflytekXinghuo {
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
export { ChatIflytekXinghuo, web_exports };
//# sourceMappingURL=web.js.map