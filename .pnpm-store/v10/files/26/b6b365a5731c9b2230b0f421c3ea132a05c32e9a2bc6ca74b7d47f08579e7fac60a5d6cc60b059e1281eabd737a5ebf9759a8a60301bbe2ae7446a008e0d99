const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llms_portkey = require('../llms/portkey.cjs');
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));

//#region src/chat_models/portkey.ts
var portkey_exports = {};
require_rolldown_runtime.__export(portkey_exports, { PortkeyChat: () => PortkeyChat });
function portkeyResponseToChatMessage(message) {
	switch (message.role) {
		case "user": return new __langchain_core_messages.HumanMessage(message.content || "");
		case "assistant": return new __langchain_core_messages.AIMessage(message.content || "");
		case "system": return new __langchain_core_messages.SystemMessage(message.content || "");
		default: return new __langchain_core_messages.ChatMessage(message.content || "", message.role ?? "unknown");
	}
}
function _convertDeltaToMessageChunk(delta) {
	const { role } = delta;
	const content = delta.content ?? "";
	let additional_kwargs;
	if (delta.function_call) additional_kwargs = { function_call: delta.function_call };
	else additional_kwargs = {};
	if (role === "user") return new __langchain_core_messages.HumanMessageChunk({ content });
	else if (role === "assistant") return new __langchain_core_messages.AIMessageChunk({
		content,
		additional_kwargs
	});
	else if (role === "system") return new __langchain_core_messages.SystemMessageChunk({ content });
	else if (role === "function") return new __langchain_core_messages.FunctionMessageChunk({
		content,
		additional_kwargs,
		name: delta.name
	});
	else return new __langchain_core_messages.ChatMessageChunk({
		content,
		role
	});
}
var PortkeyChat = class extends __langchain_core_language_models_chat_models.BaseChatModel {
	apiKey = void 0;
	baseURL = void 0;
	mode = void 0;
	llms = void 0;
	session;
	constructor(init) {
		super(init ?? {});
		this.apiKey = init?.apiKey;
		this.baseURL = init?.baseURL;
		this.mode = init?.mode;
		this.llms = init?.llms;
		this.session = require_llms_portkey.getPortkeySession({
			apiKey: this.apiKey,
			baseURL: this.baseURL,
			llms: this.llms,
			mode: this.mode
		});
	}
	_llmType() {
		return "portkey";
	}
	async _generate(messages, options, _) {
		const messagesList = messages.map((message) => {
			if (typeof message.content !== "string") throw new Error("PortkeyChat does not support non-string message content.");
			return {
				role: message._getType(),
				content: message.content
			};
		});
		const response = await this.session.portkey.chatCompletions.create({
			messages: messagesList,
			...options,
			stream: false
		});
		const generations = [];
		for (const data of response.choices ?? []) {
			const text = data.message?.content ?? "";
			const generation = {
				text,
				message: portkeyResponseToChatMessage(data.message ?? {})
			};
			if (data.finish_reason) generation.generationInfo = { finish_reason: data.finish_reason };
			generations.push(generation);
		}
		return { generations };
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const messagesList = messages.map((message) => {
			if (typeof message.content !== "string") throw new Error("PortkeyChat does not support non-string message content.");
			return {
				role: message._getType(),
				content: message.content
			};
		});
		const response = await this.session.portkey.chatCompletions.create({
			messages: messagesList,
			...options,
			stream: true
		});
		for await (const data of response) {
			const choice = data?.choices[0];
			if (!choice) continue;
			const chunk = new __langchain_core_outputs.ChatGenerationChunk({
				message: _convertDeltaToMessageChunk(choice.delta ?? {}),
				text: choice.message?.content ?? "",
				generationInfo: { finishReason: choice.finish_reason }
			});
			yield chunk;
			runManager?.handleLLMNewToken(chunk.text ?? "");
		}
		if (options.signal?.aborted) throw new Error("AbortError");
	}
	_combineLLMOutput() {
		return {};
	}
};

//#endregion
exports.PortkeyChat = PortkeyChat;
Object.defineProperty(exports, 'portkey_exports', {
  enumerable: true,
  get: function () {
    return portkey_exports;
  }
});
//# sourceMappingURL=portkey.cjs.map