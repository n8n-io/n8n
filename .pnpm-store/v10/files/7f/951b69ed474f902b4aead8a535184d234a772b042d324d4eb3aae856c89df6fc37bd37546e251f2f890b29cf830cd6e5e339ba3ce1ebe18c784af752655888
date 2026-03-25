import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, ChatMessage } from "@langchain/core/messages";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/chat_models/iflytek_xinghuo/common.ts
/**
* Function that extracts the custom role of a generic chat message.
* @param message Chat message from which to extract the custom role.
* @returns The custom role of the chat message.
*/
function extractGenericMessageCustomRole(message) {
	if (message.role !== "assistant" && message.role !== "user") console.warn(`Unknown message role: ${message.role}`);
	return message.role;
}
/**
* Function that converts a base message to a Xinghuo message role.
* @param message Base message to convert.
* @returns The Xinghuo message role.
*/
function messageToXinghuoRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": throw new Error("System messages should not be here");
		case "function": throw new Error("Function messages not supported");
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			return extractGenericMessageCustomRole(message);
		default: throw new Error(`Unknown message type: ${type}`);
	}
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
var BaseChatIflytekXinghuo = class extends BaseChatModel {
	static lc_name() {
		return "ChatIflytekXinghuo";
	}
	get callKeys() {
		return [
			"stop",
			"signal",
			"options"
		];
	}
	get lc_secrets() {
		return {
			iflytekApiKey: "IFLYTEK_API_KEY",
			iflytekApiSecret: "IFLYTEK_API_SECRET"
		};
	}
	get lc_aliases() {
		return void 0;
	}
	lc_serializable = true;
	version = "v3.1";
	iflytekAppid;
	iflytekApiKey;
	iflytekApiSecret;
	userId;
	apiUrl;
	domain;
	temperature = .5;
	max_tokens = 2048;
	top_k = 4;
	streaming = false;
	constructor(fields) {
		super(fields ?? {});
		const iflytekAppid = fields?.iflytekAppid ?? getEnvironmentVariable("IFLYTEK_APPID");
		if (!iflytekAppid) throw new Error("Iflytek APPID not found");
		else this.iflytekAppid = iflytekAppid;
		const iflytekApiKey = fields?.iflytekApiKey ?? getEnvironmentVariable("IFLYTEK_API_KEY");
		if (!iflytekApiKey) throw new Error("Iflytek API key not found");
		else this.iflytekApiKey = iflytekApiKey;
		const iflytekApiSecret = fields?.iflytekApiSecret ?? getEnvironmentVariable("IFLYTEK_API_SECRET");
		if (!iflytekApiSecret) throw new Error("Iflytek API secret not found");
		else this.iflytekApiSecret = iflytekApiSecret;
		this.userId = fields?.userId ?? this.userId;
		this.streaming = fields?.streaming ?? this.streaming;
		this.temperature = fields?.temperature ?? this.temperature;
		this.max_tokens = fields?.max_tokens ?? this.max_tokens;
		this.top_k = fields?.top_k ?? this.top_k;
		this.version = fields?.version ?? this.version;
		if ([
			"v1.1",
			"v2.1",
			"v3.1",
			"v3.5",
			"v4.0",
			"pro-128k"
		].includes(this.version)) {
			this.apiUrl = `wss://spark-api.xf-yun.com/${this.version}/chat`;
			switch (this.version) {
				case "v1.1":
					this.domain = "general";
					break;
				case "v2.1":
					this.domain = "generalv2";
					break;
				case "v3.1":
					this.domain = "generalv3";
					break;
				case "v3.5":
					this.domain = "generalv3.5";
					break;
				case "v4.0":
					this.domain = "4.0Ultra";
					break;
				case "pro-128k":
					this.domain = "pro-128k";
					this.apiUrl = `wss://spark-api.xf-yun.com/chat/${this.version}`;
					break;
				default: this.domain = "generalv3";
			}
		} else throw new Error(`Invalid model version: ${this.version}`);
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return {
			version: this.version,
			...this.invocationParams()
		};
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams() {
		return {
			streaming: this.streaming,
			temperature: this.temperature,
			top_k: this.top_k
		};
	}
	async completion(request, stream, signal) {
		const webSocketStream = await this.openWebSocketStream({ signal });
		const connection = await webSocketStream.connection;
		const header = {
			app_id: this.iflytekAppid,
			uid: this.userId
		};
		const parameter = { chat: {
			domain: this.domain,
			temperature: request.temperature ?? this.temperature,
			max_tokens: request.max_tokens ?? this.max_tokens,
			top_k: request.top_k ?? this.top_k
		} };
		const payload = { message: { text: request.messages } };
		const message = JSON.stringify({
			header,
			parameter,
			payload
		});
		const { writable, readable } = connection;
		const writer = writable.getWriter();
		await writer.write(message);
		const streams = IterableReadableStream.fromReadableStream(readable);
		if (stream) return streams;
		else {
			let response = { result: "" };
			for await (const chunk of streams) {
				const data = JSON.parse(chunk);
				const { header: header$1, payload: payload$1 } = data;
				if (header$1.code === 0) {
					if (header$1.status === 0) response.result = payload$1.choices?.text[0]?.content ?? "";
					else if (header$1.status === 1) response.result += payload$1.choices?.text[0]?.content ?? "";
					else if (header$1.status === 2) {
						response = {
							...response,
							usage: payload$1.usage?.text
						};
						break;
					}
				} else break;
			}
			streams.cancel();
			webSocketStream.close();
			return response;
		}
	}
	async _generate(messages, options, runManager) {
		const tokenUsage = {};
		const params = this.invocationParams();
		const messagesMapped = messages.map((message) => {
			if (typeof message.content !== "string") throw new Error("ChatIflytekXinghuo does not support non-string message content.");
			return {
				role: messageToXinghuoRole(message),
				content: message.content
			};
		});
		const data = params.streaming ? await (async () => {
			const streams = await this.completion({
				messages: messagesMapped,
				...params
			}, true, options.signal);
			let response = { result: "" };
			for await (const chunk of streams) {
				const data$1 = JSON.parse(chunk);
				const { header, payload } = data$1;
				if (header.code === 0) {
					if (header.status === 0) response.result = payload.choices?.text[0]?.content ?? "";
					else if (header.status === 1) response.result += payload.choices?.text[0]?.content ?? "";
					else if (header.status === 2) {
						response = {
							...response,
							usage: payload.usage?.text
						};
						break;
					}
					runManager?.handleLLMNewToken(payload.choices?.text[0]?.content);
				} else break;
			}
			streams.cancel();
			return response;
		})() : await this.completion({
			messages: messagesMapped,
			...params
		}, false, options.signal);
		const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens } = data.usage ?? {};
		if (completionTokens) tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + completionTokens;
		if (promptTokens) tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + promptTokens;
		if (totalTokens) tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + totalTokens;
		const generations = [];
		const text = data.result ?? "";
		generations.push({
			text,
			message: new AIMessage(text)
		});
		return {
			generations,
			llmOutput: { tokenUsage }
		};
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
	_llmType() {
		return "iflytek_xinghuo";
	}
};

//#endregion
export { BaseChatIflytekXinghuo };
//# sourceMappingURL=common.js.map