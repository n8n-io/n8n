import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, ChatMessage, isAIMessage } from "@langchain/core/messages";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { convertLangChainToolCallToOpenAI, makeInvalidToolCall, parseToolCall } from "@langchain/core/output_parsers/openai_tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";

//#region src/chat_models/deepinfra.ts
var deepinfra_exports = {};
__export(deepinfra_exports, {
	API_BASE_URL: () => API_BASE_URL,
	ChatDeepInfra: () => ChatDeepInfra,
	DEFAULT_MODEL: () => DEFAULT_MODEL,
	ENV_VARIABLE_API_KEY: () => ENV_VARIABLE_API_KEY
});
const DEFAULT_MODEL = "meta-llama/Meta-Llama-3-70B-Instruct";
const API_BASE_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
const ENV_VARIABLE_API_KEY = "DEEPINFRA_API_TOKEN";
function messageToRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": return "system";
		case "tool": return "tool";
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
function convertMessagesToDeepInfraParams(messages) {
	return messages.map((message) => {
		if (typeof message.content !== "string") throw new Error("Non string message content not supported");
		const completionParam = {
			role: messageToRole(message),
			content: message.content
		};
		if (message.name != null) completionParam.name = message.name;
		if (isAIMessage(message) && !!message.tool_calls?.length) {
			completionParam.tool_calls = message.tool_calls.map(convertLangChainToolCallToOpenAI);
			completionParam.content = "";
		} else {
			if (message.additional_kwargs.tool_calls != null) completionParam.tool_calls = message.additional_kwargs.tool_calls;
			if (message.tool_call_id != null) completionParam.tool_call_id = message.tool_call_id;
		}
		return completionParam;
	});
}
function deepInfraResponseToChatMessage(message, usageMetadata) {
	switch (message.role) {
		case "assistant": {
			const toolCalls = [];
			const invalidToolCalls = [];
			for (const rawToolCall of message.tool_calls ?? []) try {
				toolCalls.push(parseToolCall(rawToolCall, { returnId: true }));
			} catch (e) {
				invalidToolCalls.push(makeInvalidToolCall(rawToolCall, e.message));
			}
			return new AIMessage({
				content: message.content || "",
				additional_kwargs: { tool_calls: message.tool_calls ?? [] },
				tool_calls: toolCalls,
				invalid_tool_calls: invalidToolCalls,
				usage_metadata: usageMetadata
			});
		}
		default: return new ChatMessage(message.content || "", message.role ?? "unknown");
	}
}
var ChatDeepInfra = class extends BaseChatModel {
	static lc_name() {
		return "ChatDeepInfra";
	}
	get callKeys() {
		return [
			"stop",
			"signal",
			"options",
			"tools"
		];
	}
	apiKey;
	model;
	apiUrl;
	maxTokens;
	temperature;
	constructor(fields = {}) {
		super(fields);
		this.apiKey = fields?.apiKey ?? getEnvironmentVariable(ENV_VARIABLE_API_KEY);
		if (!this.apiKey) throw new Error("API key is required, set `DEEPINFRA_API_TOKEN` environment variable or pass it as a parameter");
		this.apiUrl = API_BASE_URL;
		this.model = fields.model ?? DEFAULT_MODEL;
		this.temperature = fields.temperature ?? 0;
		this.maxTokens = fields.maxTokens;
	}
	invocationParams(options) {
		if (options?.tool_choice) throw new Error("Tool choice is not supported for ChatDeepInfra currently.");
		return {
			model: this.model,
			stream: false,
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			tools: options?.tools,
			stop: options?.stop
		};
	}
	identifyingParams() {
		return this.invocationParams();
	}
	async _generate(messages, options) {
		const parameters = this.invocationParams(options);
		const messagesMapped = convertMessagesToDeepInfraParams(messages);
		const data = await this.completionWithRetry({
			...parameters,
			messages: messagesMapped
		}, false, options?.signal);
		const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = data.usage ?? {};
		const usageMetadata = {
			input_tokens: prompt_tokens,
			output_tokens: completion_tokens,
			total_tokens
		};
		const generations = [];
		for (const part of data?.choices ?? []) {
			const text = part.message?.content ?? "";
			const generation = {
				text,
				message: deepInfraResponseToChatMessage(part.message, usageMetadata)
			};
			if (part.finish_reason) generation.generationInfo = { finish_reason: part.finish_reason };
			generations.push(generation);
		}
		return {
			generations,
			llmOutput: { tokenUsage: {
				promptTokens: prompt_tokens,
				completionTokens: completion_tokens,
				totalTokens: total_tokens
			} }
		};
	}
	async completionWithRetry(request, stream, signal) {
		const body = {
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			...request,
			model: this.model
		};
		const makeCompletionRequest = async () => {
			const response = await fetch(this.apiUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body),
				signal
			});
			if (!stream) return response.json();
		};
		return this.caller.call(makeCompletionRequest);
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: tools.map((tool) => convertToOpenAITool(tool)),
			...kwargs
		});
	}
	_llmType() {
		return "DeepInfra";
	}
};

//#endregion
export { API_BASE_URL, ChatDeepInfra, DEFAULT_MODEL, ENV_VARIABLE_API_KEY, deepinfra_exports };
//# sourceMappingURL=deepinfra.js.map