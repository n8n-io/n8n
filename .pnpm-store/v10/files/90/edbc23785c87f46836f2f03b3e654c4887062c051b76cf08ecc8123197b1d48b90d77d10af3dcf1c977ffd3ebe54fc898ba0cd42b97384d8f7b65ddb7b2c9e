const require_ai = require("../../messages/ai.cjs");
const require_outputs = require("../../outputs.cjs");
const require_utils_json_schema = require("../json_schema.cjs");
const require_base = require("../../runnables/base.cjs");
require("../../messages/index.cjs");
const require_language_models_chat_models = require("../../language_models/chat_models.cjs");
//#region src/utils/testing/chat_models.ts
var FakeChatModel = class extends require_language_models_chat_models.BaseChatModel {
	_combineLLMOutput() {
		return [];
	}
	_llmType() {
		return "fake";
	}
	async _generate(messages, options, runManager) {
		if (options?.stop?.length) return { generations: [{
			message: new require_ai.AIMessage(options.stop[0]),
			text: options.stop[0]
		}] };
		const text = messages.map((m) => {
			if (typeof m.content === "string") return m.content;
			return JSON.stringify(m.content, null, 2);
		}).join("\n");
		await runManager?.handleLLMNewToken(text);
		return {
			generations: [{
				message: new require_ai.AIMessage(text),
				text
			}],
			llmOutput: {}
		};
	}
};
var FakeStreamingChatModel = class FakeStreamingChatModel extends require_language_models_chat_models.BaseChatModel {
	sleep = 50;
	responses = [];
	chunks = [];
	toolStyle = "openai";
	thrownErrorString;
	tools = [];
	constructor({ sleep = 50, responses = [], chunks = [], toolStyle = "openai", thrownErrorString, ...rest }) {
		super(rest);
		this.sleep = sleep;
		this.responses = responses;
		this.chunks = chunks;
		this.toolStyle = toolStyle;
		this.thrownErrorString = thrownErrorString;
	}
	_llmType() {
		return "fake";
	}
	bindTools(tools) {
		const merged = [...this.tools, ...tools];
		const toolDicts = merged.map((t) => {
			switch (this.toolStyle) {
				case "openai": return {
					type: "function",
					function: {
						name: t.name,
						description: t.description,
						parameters: require_utils_json_schema.toJsonSchema(t.schema)
					}
				};
				case "anthropic": return {
					name: t.name,
					description: t.description,
					input_schema: require_utils_json_schema.toJsonSchema(t.schema)
				};
				case "bedrock": return { toolSpec: {
					name: t.name,
					description: t.description,
					inputSchema: require_utils_json_schema.toJsonSchema(t.schema)
				} };
				case "google": return {
					name: t.name,
					description: t.description,
					parameters: require_utils_json_schema.toJsonSchema(t.schema)
				};
				default: throw new Error(`Unsupported tool style: ${this.toolStyle}`);
			}
		});
		const wrapped = this.toolStyle === "google" ? [{ functionDeclarations: toolDicts }] : toolDicts;
		const next = new FakeStreamingChatModel({
			sleep: this.sleep,
			responses: this.responses,
			chunks: this.chunks,
			toolStyle: this.toolStyle,
			thrownErrorString: this.thrownErrorString
		});
		next.tools = merged;
		return next.withConfig({ tools: wrapped });
	}
	async _generate(messages, _options, _runManager) {
		if (this.thrownErrorString) throw new Error(this.thrownErrorString);
		return { generations: [{
			text: "",
			message: new require_ai.AIMessage({
				content: this.responses?.[0]?.content ?? messages[0].content ?? "",
				tool_calls: this.chunks?.[0]?.tool_calls
			})
		}] };
	}
	async *_streamResponseChunks(_messages, options, runManager) {
		if (this.thrownErrorString) throw new Error(this.thrownErrorString);
		if (this.chunks?.length) {
			for (const msgChunk of this.chunks) {
				const cg = new require_outputs.ChatGenerationChunk({
					message: new require_ai.AIMessageChunk({
						content: msgChunk.content,
						tool_calls: msgChunk.tool_calls,
						additional_kwargs: msgChunk.additional_kwargs ?? {}
					}),
					text: msgChunk.content?.toString() ?? ""
				});
				if (options.signal?.aborted) break;
				yield cg;
				await runManager?.handleLLMNewToken(msgChunk.content, void 0, void 0, void 0, void 0, { chunk: cg });
			}
			return;
		}
		const fallback = this.responses?.[0] ?? new require_ai.AIMessage(typeof _messages[0].content === "string" ? _messages[0].content : "");
		const text = typeof fallback.content === "string" ? fallback.content : "";
		for (const ch of text) {
			await new Promise((r) => setTimeout(r, this.sleep));
			const cg = new require_outputs.ChatGenerationChunk({
				message: new require_ai.AIMessageChunk({ content: ch }),
				text: ch
			});
			if (options.signal?.aborted) break;
			yield cg;
			await runManager?.handleLLMNewToken(ch, void 0, void 0, void 0, void 0, { chunk: cg });
		}
	}
};
/**
* A fake Chat Model that returns a predefined list of responses. It can be used
* for testing purposes.
* @example
* ```typescript
* const chat = new FakeListChatModel({
*   responses: ["I'll callback later.", "You 'console' them!"]
* });
*
* const firstMessage = new HumanMessage("You want to hear a JavaScript joke?");
* const secondMessage = new HumanMessage("How do you cheer up a JavaScript developer?");
*
* // Call the chat model with a message and log the response
* const firstResponse = await chat.call([firstMessage]);
* console.log({ firstResponse });
*
* const secondResponse = await chat.call([secondMessage]);
* console.log({ secondResponse });
* ```
*/
var FakeListChatModel = class FakeListChatModel extends require_language_models_chat_models.BaseChatModel {
	static lc_name() {
		return "FakeListChatModel";
	}
	lc_serializable = true;
	responses;
	i = 0;
	sleep;
	emitCustomEvent = false;
	generationInfo;
	tools = [];
	toolStyle = "openai";
	constructor(params) {
		super(params);
		const { responses, sleep, emitCustomEvent, generationInfo } = params;
		this.responses = responses;
		this.sleep = sleep;
		this.emitCustomEvent = emitCustomEvent ?? this.emitCustomEvent;
		this.generationInfo = generationInfo;
	}
	_combineLLMOutput() {
		return [];
	}
	_llmType() {
		return "fake-list";
	}
	async _generate(_messages, options, runManager) {
		await this._sleepIfRequested();
		if (options?.thrownErrorString) throw new Error(options.thrownErrorString);
		if (this.emitCustomEvent) await runManager?.handleCustomEvent("some_test_event", { someval: true });
		if (options?.stop?.length) return { generations: [this._formatGeneration(options.stop[0])] };
		else {
			const response = this._currentResponse();
			this._incrementResponse();
			return {
				generations: [this._formatGeneration(response)],
				llmOutput: {}
			};
		}
	}
	_formatGeneration(text) {
		return {
			message: new require_ai.AIMessage(text),
			text
		};
	}
	async *_streamResponseChunks(_messages, options, runManager) {
		const response = this._currentResponse();
		this._incrementResponse();
		if (this.emitCustomEvent) await runManager?.handleCustomEvent("some_test_event", { someval: true });
		const responseChars = [...response];
		for (let i = 0; i < responseChars.length; i++) {
			const text = responseChars[i];
			const isLastChunk = i === responseChars.length - 1;
			await this._sleepIfRequested();
			if (options?.thrownErrorString) throw new Error(options.thrownErrorString);
			const chunk = this._createResponseChunk(text, isLastChunk ? this.generationInfo : void 0);
			if (options.signal?.aborted) break;
			yield chunk;
			runManager?.handleLLMNewToken(text);
		}
	}
	async _sleepIfRequested() {
		if (this.sleep !== void 0) await this._sleep();
	}
	async _sleep() {
		return new Promise((resolve) => {
			setTimeout(() => resolve(), this.sleep);
		});
	}
	_createResponseChunk(text, generationInfo) {
		return new require_outputs.ChatGenerationChunk({
			message: new require_ai.AIMessageChunk({ content: text }),
			text,
			generationInfo
		});
	}
	_currentResponse() {
		return this.responses[this.i];
	}
	_incrementResponse() {
		if (this.i < this.responses.length - 1) this.i += 1;
		else this.i = 0;
	}
	bindTools(tools) {
		const merged = [...this.tools, ...tools];
		const toolDicts = merged.map((t) => {
			switch (this.toolStyle) {
				case "openai": return {
					type: "function",
					function: {
						name: t.name,
						description: t.description,
						parameters: require_utils_json_schema.toJsonSchema(t.schema)
					}
				};
				case "anthropic": return {
					name: t.name,
					description: t.description,
					input_schema: require_utils_json_schema.toJsonSchema(t.schema)
				};
				case "bedrock": return { toolSpec: {
					name: t.name,
					description: t.description,
					inputSchema: require_utils_json_schema.toJsonSchema(t.schema)
				} };
				case "google": return {
					name: t.name,
					description: t.description,
					parameters: require_utils_json_schema.toJsonSchema(t.schema)
				};
				default: throw new Error(`Unsupported tool style: ${this.toolStyle}`);
			}
		});
		const wrapped = this.toolStyle === "google" ? [{ functionDeclarations: toolDicts }] : toolDicts;
		const next = new FakeListChatModel({
			responses: this.responses,
			sleep: this.sleep,
			emitCustomEvent: this.emitCustomEvent,
			generationInfo: this.generationInfo
		});
		next.tools = merged;
		next.toolStyle = this.toolStyle;
		next.i = this.i;
		return next.withConfig({ tools: wrapped });
	}
	withStructuredOutput(_params, _config) {
		return require_base.RunnableLambda.from(async (input) => {
			const message = await this.invoke(input);
			if (message.tool_calls?.[0]?.args) return message.tool_calls[0].args;
			if (typeof message.content === "string") return JSON.parse(message.content);
			throw new Error("No structured output found");
		});
	}
};
//#endregion
exports.FakeChatModel = FakeChatModel;
exports.FakeListChatModel = FakeListChatModel;
exports.FakeStreamingChatModel = FakeStreamingChatModel;

//# sourceMappingURL=chat_models.cjs.map