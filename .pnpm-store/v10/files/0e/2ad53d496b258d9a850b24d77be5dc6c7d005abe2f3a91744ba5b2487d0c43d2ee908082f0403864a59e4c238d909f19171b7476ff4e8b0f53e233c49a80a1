import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, ChatMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/chat_models/alibaba_tongyi.ts
var alibaba_tongyi_exports = {};
__export(alibaba_tongyi_exports, { ChatAlibabaTongyi: () => ChatAlibabaTongyi });
/**
* Function that extracts the custom role of a generic chat message.
* @param message Chat message from which to extract the custom role.
* @returns The custom role of the chat message.
*/
function extractGenericMessageCustomRole(message) {
	if ([
		"system",
		"assistant",
		"user"
	].includes(message.role) === false) console.warn(`Unknown message role: ${message.role}`);
	return message.role;
}
/**
* Function that converts a base message to a Tongyi message role.
* @param message Base message to convert.
* @returns The Tongyi message role.
*/
function messageToTongyiRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": return "system";
		case "function": throw new Error("Function messages not supported");
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			return extractGenericMessageCustomRole(message);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
/**
* Wrapper around Ali Tongyi large language models that use the Chat endpoint.
*
* To use you should have the `ALIBABA_API_KEY`
* environment variable set.
*
* @augments BaseLLM
* @augments AlibabaTongyiInput
* @example
* ```typescript
* // Default - uses China region
* const qwen = new ChatAlibabaTongyi({
*   alibabaApiKey: "YOUR-API-KEY",
* });
*
* // Specify region explicitly
* const qwen = new ChatAlibabaTongyi({
*   model: "qwen-turbo",
*   temperature: 1,
*   region: "singapore", // or "us" or "china"
*   alibabaApiKey: "YOUR-API-KEY",
* });
*
* const messages = [new HumanMessage("Hello")];
*
* await qwen.call(messages);
* ```
*/
var ChatAlibabaTongyi = class extends BaseChatModel {
	static lc_name() {
		return "ChatAlibabaTongyi";
	}
	get callKeys() {
		return [
			"stop",
			"signal",
			"options"
		];
	}
	get lc_secrets() {
		return { alibabaApiKey: "ALIBABA_API_KEY" };
	}
	get lc_aliases() {
		return void 0;
	}
	lc_serializable;
	alibabaApiKey;
	streaming;
	prefixMessages;
	modelName;
	model;
	apiUrl;
	maxTokens;
	temperature;
	topP;
	topK;
	repetitionPenalty;
	seed;
	enableSearch;
	region;
	/**
	* Get the API URL based on the specified region.
	*
	* @param region - The region to get the URL for ('china', 'singapore', or 'us')
	* @returns The base URL for the specified region
	*/
	getRegionBaseUrl(region) {
		const regionUrls = {
			china: "https://dashscope.aliyuncs.com/",
			singapore: "https://dashscope-intl.aliyuncs.com/",
			us: "https://dashscope-us.aliyuncs.com/"
		};
		return regionUrls[region];
	}
	constructor(fields = {}) {
		super(fields);
		this.alibabaApiKey = fields?.alibabaApiKey ?? getEnvironmentVariable("ALIBABA_API_KEY");
		if (!this.alibabaApiKey) throw new Error("Ali API key not found");
		this.region = fields.region ?? "china";
		this.apiUrl = `${this.getRegionBaseUrl(this.region)}api/v1/services/aigc/text-generation/generation`;
		this.lc_serializable = true;
		this.streaming = fields.streaming ?? false;
		this.prefixMessages = fields.prefixMessages ?? [];
		this.temperature = fields.temperature;
		this.topP = fields.topP;
		this.topK = fields.topK;
		this.seed = fields.seed;
		this.maxTokens = fields.maxTokens;
		this.repetitionPenalty = fields.repetitionPenalty;
		this.enableSearch = fields.enableSearch;
		this.modelName = fields?.model ?? fields.modelName ?? "qwen-turbo";
		this.model = this.modelName;
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams() {
		const parameters = {
			stream: this.streaming,
			temperature: this.temperature,
			top_p: this.topP,
			top_k: this.topK,
			seed: this.seed,
			max_tokens: this.maxTokens,
			result_format: "text",
			enable_search: this.enableSearch
		};
		if (this.streaming) parameters.incremental_output = true;
		else parameters.repetition_penalty = this.repetitionPenalty;
		return parameters;
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return {
			model: this.model,
			...this.invocationParams()
		};
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		const parameters = this.invocationParams();
		const messagesMapped = messages.map((message) => ({
			role: messageToTongyiRole(message),
			content: message.content
		}));
		const data = parameters.stream ? await new Promise((resolve, reject) => {
			let response;
			let rejected = false;
			let resolved = false;
			this.completionWithRetry({
				model: this.model,
				parameters,
				input: { messages: messagesMapped }
			}, true, options?.signal, (event) => {
				const data$1 = JSON.parse(event.data);
				if (data$1?.code) {
					if (rejected) return;
					rejected = true;
					reject(new Error(data$1?.message));
					return;
				}
				const { text: text$1, finish_reason } = data$1.output;
				if (!response) response = data$1;
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
			model: this.model,
			parameters,
			input: { messages: messagesMapped }
		}, false, options?.signal).then((data$1) => {
			if (data$1?.code) throw new Error(data$1?.message);
			return data$1;
		});
		const { input_tokens = 0, output_tokens = 0, total_tokens = 0 } = data.usage;
		const { text } = data.output;
		return {
			generations: [{
				text,
				message: new AIMessage(text)
			}],
			llmOutput: { tokenUsage: {
				promptTokens: input_tokens,
				completionTokens: output_tokens,
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
					Authorization: `Bearer ${this.alibabaApiKey}`,
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
							const event = new MessageEvent("message", { data: line.slice(5).trim() });
							onmessage?.(event);
						}
					}
				}
			}
		};
		return this.caller.call(makeCompletionRequest);
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const parameters = {
			...this.invocationParams(),
			stream: true,
			incremental_output: true
		};
		const messagesMapped = messages.map((message) => ({
			role: messageToTongyiRole(message),
			content: message.content
		}));
		const stream = await this.caller.call(async () => this.createTongyiStream({
			model: this.model,
			parameters,
			input: { messages: messagesMapped }
		}, options?.signal));
		for await (const chunk of stream) {
			if (!chunk.output && chunk.code) throw new Error(JSON.stringify(chunk));
			const { text, finish_reason } = chunk.output;
			yield new ChatGenerationChunk({
				text,
				message: new AIMessageChunk({ content: text }),
				generationInfo: finish_reason === "stop" ? {
					finish_reason,
					request_id: chunk.request_id,
					usage: chunk.usage
				} : void 0
			});
			await runManager?.handleLLMNewToken(text);
		}
	}
	async *createTongyiStream(request, signal) {
		const response = await fetch(this.apiUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.alibabaApiKey}`,
				Accept: "text/event-stream",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(request),
			signal
		});
		if (!response.ok) {
			let error;
			const responseText = await response.text();
			try {
				const json = JSON.parse(responseText);
				error = /* @__PURE__ */ new Error(`Tongyi call failed with status code ${response.status}: ${json.error}`);
			} catch {
				error = /* @__PURE__ */ new Error(`Tongyi call failed with status code ${response.status}: ${responseText}`);
			}
			error.response = response;
			throw error;
		}
		if (!response.body) throw new Error("Could not begin Tongyi stream. Please check the given URL and try again.");
		const stream = IterableReadableStream.fromReadableStream(response.body);
		const decoder = new TextDecoder();
		let extra = "";
		for await (const chunk of stream) {
			const decoded = extra + decoder.decode(chunk);
			const lines = decoded.split("\n");
			extra = lines.pop() || "";
			for (const line of lines) {
				if (!line.startsWith("data:")) continue;
				try {
					yield JSON.parse(line.slice(5).trim());
				} catch {
					console.warn(`Received a non-JSON parseable chunk: ${line}`);
				}
			}
		}
	}
	_llmType() {
		return "alibaba_tongyi";
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
};

//#endregion
export { ChatAlibabaTongyi, alibaba_tongyi_exports };
//# sourceMappingURL=alibaba_tongyi.js.map