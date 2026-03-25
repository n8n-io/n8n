const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_utils_event_source_parse = require('../utils/event_source_parse.cjs');
const require_zhipuai = require('../utils/zhipuai.cjs');
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_output_parsers_openai_tools = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers/openai_tools"));
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));

//#region src/chat_models/zhipuai.ts
var zhipuai_exports = {};
require_rolldown_runtime.__export(zhipuai_exports, { ChatZhipuAI: () => ChatZhipuAI });
function messageToRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": return "system";
		case "function": throw new Error("Function messages not supported yet");
		case "generic":
			if (!__langchain_core_messages.ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			if ([
				"system",
				"assistant",
				"user"
			].includes(message.role)) return message.role;
			throw new Error(`Unknown message type: ${type}`);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
function parseRawToolCalls(rawToolCalls) {
	const toolCalls = [];
	const invalidToolCalls = [];
	for (const rawToolCall of rawToolCalls) try {
		toolCalls.push((0, __langchain_core_output_parsers_openai_tools.parseToolCall)(rawToolCall, { returnId: true }));
	} catch (e) {
		invalidToolCalls.push((0, __langchain_core_output_parsers_openai_tools.makeInvalidToolCall)(rawToolCall, e.message));
	}
	return {
		toolCalls,
		invalidToolCalls
	};
}
var ChatZhipuAI = class extends __langchain_core_language_models_chat_models.BaseChatModel {
	static lc_name() {
		return "ChatZhipuAI";
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
			zhipuAIApiKey: "ZHIPUAI_API_KEY",
			apiKey: "ZHIPUAI_API_KEY"
		};
	}
	get lc_aliases() {
		return void 0;
	}
	zhipuAIApiKey;
	apiKey;
	streaming;
	doSample;
	messages;
	requestId;
	modelName;
	model;
	apiUrl;
	maxTokens;
	temperature;
	topP;
	stop;
	constructor(fields = {}) {
		super(fields);
		this.zhipuAIApiKey = fields?.apiKey ?? fields?.zhipuAIApiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("ZHIPUAI_API_KEY");
		if (!this.zhipuAIApiKey) throw new Error("ZhipuAI API key not found");
		this.apiUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
		this.streaming = fields.streaming ?? false;
		this.messages = fields.messages ?? [];
		this.temperature = fields.temperature ?? .95;
		this.topP = fields.topP ?? .7;
		this.stop = fields.stop;
		this.maxTokens = fields.maxTokens;
		this.modelName = fields?.model ?? fields.modelName ?? "glm-3-turbo";
		this.model = this.modelName;
		this.doSample = fields.doSample;
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams(options) {
		return {
			model: this.model,
			request_id: this.requestId,
			do_sample: this.doSample,
			stream: this.streaming,
			temperature: this.temperature,
			top_p: this.topP,
			max_tokens: this.maxTokens,
			stop: this.stop,
			tools: options?.tools?.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAITool)(tool)) ?? []
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
		const parameters = this.invocationParams(options);
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
				if (data$1?.error?.code) {
					if (rejected) return;
					rejected = true;
					reject(new Error(data$1?.error?.message));
					return;
				}
				const { delta, finish_reason } = data$1.choices[0];
				const text$1 = delta.content ?? "";
				const tool_calls = delta.tool_calls ?? [];
				if (!response) response = {
					...data$1,
					output: {
						text: text$1,
						finish_reason,
						tool_calls
					}
				};
				else {
					response.output.text += text$1;
					response.output.finish_reason = finish_reason;
					response.output.tool_calls = response.output.tool_calls?.concat(tool_calls) ?? tool_calls;
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
			if (data$1?.error?.code) throw new Error(data$1?.error?.message);
			const { finish_reason, message } = data$1.choices[0];
			const text$1 = message.content ?? "";
			return {
				...data$1,
				output: {
					text: text$1,
					finish_reason,
					tool_calls: message.tool_calls
				}
			};
		});
		const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = data.usage;
		const { text, tool_calls: rawToolCalls } = data.output;
		const { toolCalls, invalidToolCalls } = parseRawToolCalls(rawToolCalls ?? []);
		return {
			generations: [{
				text,
				message: new __langchain_core_messages.AIMessage({
					content: text,
					tool_calls: toolCalls,
					invalid_tool_calls: invalidToolCalls
				})
			}],
			llmOutput: { tokenUsage: {
				promptTokens: prompt_tokens,
				completionTokens: completion_tokens,
				totalTokens: total_tokens
			} }
		};
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: tools.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAITool)(tool)),
			...kwargs
		});
	}
	/** @ignore */
	async completionWithRetry(request, stream, signal, onmessage) {
		const makeCompletionRequest = async () => {
			const response = await fetch(this.apiUrl, {
				method: "POST",
				headers: {
					...stream ? { Accept: "text/event-stream" } : {},
					Authorization: `Bearer ${require_zhipuai.encodeApiKey(this.zhipuAIApiKey)}`,
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
	async createZhipuStream(request, signal) {
		const response = await fetch(this.apiUrl, {
			method: "POST",
			headers: {
				Accept: "text/event-stream",
				Authorization: `Bearer ${require_zhipuai.encodeApiKey(this.zhipuAIApiKey)}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(request),
			signal
		});
		if (!response.body) throw new Error("Could not begin Zhipu stream. Please check the given URL and try again.");
		return require_utils_event_source_parse.convertEventStreamToIterableReadableDataStream(response.body);
	}
	_deserialize(json) {
		try {
			return JSON.parse(json);
		} catch {
			console.warn(`Received a non-JSON parseable chunk: ${json}`);
		}
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const parameters = {
			...this.invocationParams(options),
			stream: true
		};
		const messagesMapped = messages.map((message) => ({
			role: messageToRole(message),
			content: message.content
		}));
		const stream = await this.caller.call(async () => this.createZhipuStream({
			...parameters,
			messages: messagesMapped
		}, options?.signal));
		for await (const chunk of stream) if (chunk !== "[DONE]") {
			const deserializedChunk = this._deserialize(chunk);
			const { choices, usage, id } = deserializedChunk;
			const text = choices[0]?.delta?.content ?? "";
			const rawToolCalls = choices[0]?.delta?.tool_calls ?? [];
			const { toolCalls, invalidToolCalls } = parseRawToolCalls(rawToolCalls);
			const finished = !!choices[0]?.finish_reason;
			const isToolCall = rawToolCalls.length > 0;
			yield new __langchain_core_outputs.ChatGenerationChunk({
				text,
				message: isToolCall ? new __langchain_core_messages.AIMessageChunk({
					tool_calls: toolCalls,
					invalid_tool_calls: invalidToolCalls
				}) : new __langchain_core_messages.AIMessageChunk({ content: text }),
				generationInfo: finished ? {
					finished,
					request_id: id,
					usage
				} : void 0
			});
			await runManager?.handleLLMNewToken(text);
		} else continue;
	}
	_llmType() {
		return "zhipuai";
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
};

//#endregion
exports.ChatZhipuAI = ChatZhipuAI;
Object.defineProperty(exports, 'zhipuai_exports', {
  enumerable: true,
  get: function () {
    return zhipuai_exports;
  }
});
//# sourceMappingURL=zhipuai.cjs.map