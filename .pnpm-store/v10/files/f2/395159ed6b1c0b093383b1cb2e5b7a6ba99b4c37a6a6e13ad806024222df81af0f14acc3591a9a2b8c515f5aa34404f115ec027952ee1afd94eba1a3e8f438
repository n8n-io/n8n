import { __export } from "../../_virtual/rolldown_runtime.js";
import { BaseChatIflytekXinghuo } from "./common.js";
import { BaseWebSocketStream } from "../../utils/iflytek_websocket_stream.js";
import WebSocket from "ws";

//#region src/chat_models/iflytek_xinghuo/index.ts
var iflytek_xinghuo_exports = {};
__export(iflytek_xinghuo_exports, { ChatIflytekXinghuo: () => ChatIflytekXinghuo });
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
export { ChatIflytekXinghuo, iflytek_xinghuo_exports };
//# sourceMappingURL=index.js.map