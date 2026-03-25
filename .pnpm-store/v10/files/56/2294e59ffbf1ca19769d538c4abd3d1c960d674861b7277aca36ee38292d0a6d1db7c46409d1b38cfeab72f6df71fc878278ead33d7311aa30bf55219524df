import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, ChatMessage } from "@langchain/core/messages";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/chat_models/moonshot.ts
var moonshot_exports = {};
__export(moonshot_exports, { ChatMoonshot: () => ChatMoonshot });
function messageToRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": return "system";
		case "function": throw new Error("Function messages not supported yet");
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			if ([
				"system",
				"assistant",
				"user"
			].includes(message.role)) return message.role;
			throw new Error(`Unknown message type: ${type}`);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
var ChatMoonshot = class extends BaseChatModel {
	static lc_name() {
		return "ChatMoonshot";
	}
	get callKeys() {
		return [
			"stop",
			"signal",
			"options"
		];
	}
	get lc_secrets() {
		return { apiKey: "MOONSHOT_API_KEY" };
	}
	get lc_aliases() {
		return void 0;
	}
	apiKey;
	streaming;
	messages;
	modelName;
	model;
	apiUrl;
	maxTokens;
	temperature;
	topP;
	stop;
	presencePenalty;
	frequencyPenalty;
	n;
	constructor(fields = {}) {
		super(fields);
		this.apiKey = fields?.apiKey ?? getEnvironmentVariable("MOONSHOT_API_KEY");
		if (!this.apiKey) throw new Error("Moonshot API key not found");
		this.apiUrl = "https://api.moonshot.cn/v1/chat/completions";
		this.streaming = fields.streaming ?? false;
		this.messages = fields.messages ?? [];
		this.temperature = fields.temperature ?? 0;
		this.topP = fields.topP ?? 1;
		this.stop = fields.stop;
		this.maxTokens = fields.maxTokens;
		this.modelName = fields?.model ?? fields.modelName ?? "moonshot-v1-8k";
		this.model = this.modelName;
		this.presencePenalty = fields.presencePenalty ?? 0;
		this.frequencyPenalty = fields.frequencyPenalty ?? 0;
		this.n = fields.n ?? 1;
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams() {
		return {
			model: this.model,
			stream: this.streaming,
			temperature: this.temperature,
			top_p: this.topP,
			max_tokens: this.maxTokens,
			stop: this.stop,
			presence_penalty: this.presencePenalty,
			frequency_penalty: this.frequencyPenalty,
			n: this.n
		};
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return this.invocationParams();
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		const parameters = this.invocationParams();
		const messagesMapped = messages.map((message) => ({
			role: messageToRole(message),
			content: message.content
		}));
		const data = parameters.stream ? await new Promise((resolve, reject) => {
			let response;
			let rejected = false;
			let resolved = false;
			this.completionWithRetry({
				...parameters,
				messages: messagesMapped
			}, true, options?.signal, (event) => {
				const data$1 = JSON.parse(event.data);
				if (data$1?.code) {
					if (rejected) return;
					rejected = true;
					reject(new Error(data$1?.message));
					return;
				}
				const { delta, finish_reason } = data$1.choices[0];
				const text$1 = delta.content;
				if (!response) response = {
					...data$1,
					output: {
						text: text$1,
						finish_reason
					}
				};
				else {
					response.output.text += text$1;
					response.output.finish_reason = finish_reason;
					response.usage = data$1.usage;
				}
				runManager?.handleLLMNewToken(text$1 ?? "");
				if (finish_reason && finish_reason !== "null") {
					if (resolved || rejected) return;
					resolved = true;
					resolve(response);
				}
			}).catch((error) => {
				if (!rejected) {
					rejected = true;
					reject(error);
				}
			});
		}) : await this.completionWithRetry({
			...parameters,
			messages: messagesMapped
		}, false, options?.signal).then((data$1) => {
			if (data$1?.code) throw new Error(data$1?.message);
			const { finish_reason, message } = data$1.choices[0];
			const text$1 = message.content;
			return {
				...data$1,
				output: {
					text: text$1,
					finish_reason
				}
			};
		});
		const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = data.usage ?? {};
		const { text } = data.output;
		return {
			generations: [{
				text,
				message: new AIMessage(text)
			}],
			llmOutput: { tokenUsage: {
				promptTokens: prompt_tokens,
				completionTokens: completion_tokens,
				totalTokens: total_tokens
			} }
		};
	}
	/** @ignore */
	async completionWithRetry(request, stream, signal, onmessage) {
		const makeCompletionRequest = async () => {
			const response = await fetch(this.apiUrl, {
				method: "POST",
				headers: {
					...stream ? { Accept: "text/event-stream" } : {},
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(request),
				signal
			});
			if (!stream) return response.json();
			if (response.body) {
				if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
					onmessage?.(new MessageEvent("message", { data: await response.text() }));
					return;
				}
				const reader = response.body.getReader();
				const decoder = new TextDecoder("utf-8");
				let data = "";
				let continueReading = true;
				while (continueReading) {
					const { done, value } = await reader.read();
					if (done) {
						continueReading = false;
						break;
					}
					data += decoder.decode(value);
					let continueProcessing = true;
					while (continueProcessing) {
						const newlineIndex = data.indexOf("\n");
						if (newlineIndex === -1) {
							continueProcessing = false;
							break;
						}
						const line = data.slice(0, newlineIndex);
						data = data.slice(newlineIndex + 1);
						if (line.startsWith("data:")) {
							const value$1 = line.slice(5).trim();
							if (value$1 === "[DONE]") {
								continueReading = false;
								break;
							}
							const event = new MessageEvent("message", { data: value$1 });
							onmessage?.(event);
						}
					}
				}
			}
		};
		return this.caller.call(makeCompletionRequest);
	}
	_llmType() {
		return "moonshot";
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
};

//#endregion
export { ChatMoonshot, moonshot_exports };
//# sourceMappingURL=moonshot.js.map