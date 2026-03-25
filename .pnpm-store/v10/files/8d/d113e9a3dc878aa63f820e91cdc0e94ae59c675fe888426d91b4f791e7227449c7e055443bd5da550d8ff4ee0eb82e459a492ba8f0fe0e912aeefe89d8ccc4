import { __export } from "../_virtual/rolldown_runtime.js";
import { createLlamaContext, createLlamaModel } from "../utils/llama_cpp.js";
import { SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, ChatMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { LlamaChatSession, getLlama } from "node-llama-cpp";

//#region src/chat_models/llama_cpp.ts
var llama_cpp_exports = {};
__export(llama_cpp_exports, { ChatLlamaCpp: () => ChatLlamaCpp });
/**
*  To use this model you need to have the `node-llama-cpp` module installed.
*  This can be installed using `npm install -S node-llama-cpp` and the minimum
*  version supported in version 2.0.0.
*  This also requires that have a locally built version of Llama3 installed.
* @example
* ```typescript
* // Initialize the ChatLlamaCpp model with the path to the model binary file.
* const model = await ChatLlamaCpp.initialize({
*   modelPath: "/Replace/with/path/to/your/model/gguf-llama3-Q4_0.bin",
*   temperature: 0.5,
* });
*
* // Call the model with a message and await the response.
* const response = await model.invoke([
*   new HumanMessage({ content: "My name is John." }),
* ]);
*
* // Log the response to the console.
* console.log({ response });
*
* ```
*/
var ChatLlamaCpp = class ChatLlamaCpp extends SimpleChatModel {
	static inputs;
	maxTokens;
	temperature;
	topK;
	topP;
	trimWhitespaceSuffix;
	_model;
	_context;
	_session;
	lc_serializable = true;
	static lc_name() {
		return "ChatLlamaCpp";
	}
	constructor(inputs) {
		super(inputs);
		this.maxTokens = inputs?.maxTokens;
		this.temperature = inputs?.temperature;
		this.topK = inputs?.topK;
		this.topP = inputs?.topP;
		this.trimWhitespaceSuffix = inputs?.trimWhitespaceSuffix;
		this._session = null;
	}
	/**
	* Initializes the llama_cpp model for usage in the chat models wrapper.
	* @param inputs - the inputs passed onto the model.
	* @returns A Promise that resolves to the ChatLlamaCpp type class.
	*/
	static async initialize(inputs) {
		const instance = new ChatLlamaCpp(inputs);
		const llama = await getLlama();
		instance._model = await createLlamaModel(inputs, llama);
		instance._context = await createLlamaContext(instance._model, inputs);
		return instance;
	}
	_llmType() {
		return "llama_cpp";
	}
	/** @ignore */
	_combineLLMOutput() {
		return {};
	}
	invocationParams() {
		return {
			maxTokens: this.maxTokens,
			temperature: this.temperature,
			topK: this.topK,
			topP: this.topP,
			trimWhitespaceSuffix: this.trimWhitespaceSuffix
		};
	}
	/** @ignore */
	async _call(messages, options, runManager) {
		let prompt = "";
		if (messages.length > 1) prompt = this._buildSession(messages);
		else if (!this._session) prompt = this._buildSession(messages);
		else {
			if (typeof messages[0].content !== "string") throw new Error("ChatLlamaCpp does not support non-string message content in sessions.");
			prompt = messages[0].content;
		}
		try {
			const promptOptions = {
				signal: options.signal,
				onToken: async (tokens) => {
					options.onToken?.(tokens);
					await runManager?.handleLLMNewToken(this._model.detokenize(tokens.map((num) => num)));
				},
				maxTokens: this?.maxTokens,
				temperature: this?.temperature,
				topK: this?.topK,
				topP: this?.topP,
				trimWhitespaceSuffix: this?.trimWhitespaceSuffix
			};
			const completion = await this._session.prompt(prompt, promptOptions);
			return completion;
		} catch (e) {
			if (typeof e === "object") {
				const error = e;
				if (error.message === "AbortError") throw error;
			}
			throw new Error("Error getting prompt completion.");
		}
	}
	async *_streamResponseChunks(input, _options, runManager) {
		const promptOptions = {
			temperature: this?.temperature,
			topK: this?.topK,
			topP: this?.topP
		};
		const prompt = this._buildPrompt(input);
		const sequence = this._context.getSequence();
		const stream = await this.caller.call(async () => sequence.evaluate(this._model.tokenize(prompt), promptOptions));
		for await (const chunk of stream) {
			yield new ChatGenerationChunk({
				text: this._model.detokenize([chunk]),
				message: new AIMessageChunk({ content: this._model.detokenize([chunk]) }),
				generationInfo: {}
			});
			await runManager?.handleLLMNewToken(this._model.detokenize([chunk]) ?? "");
		}
	}
	_buildSession(messages) {
		let prompt = "";
		let sysMessage = "";
		let noSystemMessages = [];
		let interactions = [];
		if (messages.findIndex((msg) => msg.getType() === "system") !== -1) {
			const sysMessages = messages.filter((message) => message.getType() === "system");
			const systemMessageContent = sysMessages[sysMessages.length - 1].content;
			if (typeof systemMessageContent !== "string") throw new Error("ChatLlamaCpp does not support non-string message content in sessions.");
			sysMessage = systemMessageContent;
			noSystemMessages = messages.filter((message) => message.getType() !== "system");
		} else noSystemMessages = messages;
		if (noSystemMessages.length > 1) if (noSystemMessages[noSystemMessages.length - 1].getType() === "human") {
			const finalMessageContent = noSystemMessages[noSystemMessages.length - 1].content;
			if (typeof finalMessageContent !== "string") throw new Error("ChatLlamaCpp does not support non-string message content in sessions.");
			prompt = finalMessageContent;
			interactions = this._convertMessagesToInteractions(noSystemMessages.slice(0, noSystemMessages.length - 1));
		} else interactions = this._convertMessagesToInteractions(noSystemMessages);
		else {
			if (typeof noSystemMessages[0].content !== "string") throw new Error("ChatLlamaCpp does not support non-string message content in sessions.");
			prompt = noSystemMessages[0].content;
		}
		if (sysMessage !== "" && interactions.length > 0) {
			this._session = new LlamaChatSession({
				contextSequence: this._context.getSequence(),
				systemPrompt: sysMessage
			});
			this._session.setChatHistory(interactions);
		} else if (sysMessage !== "" && interactions.length === 0) this._session = new LlamaChatSession({
			contextSequence: this._context.getSequence(),
			systemPrompt: sysMessage
		});
		else if (sysMessage === "" && interactions.length > 0) {
			this._session = new LlamaChatSession({ contextSequence: this._context.getSequence() });
			this._session.setChatHistory(interactions);
		} else this._session = new LlamaChatSession({ contextSequence: this._context.getSequence() });
		return prompt;
	}
	_convertMessagesToInteractions(messages) {
		const result = [];
		for (let i = 0; i < messages.length; i += 2) if (i + 1 < messages.length) {
			const prompt = messages[i].content;
			const response = messages[i + 1].content;
			if (typeof prompt !== "string" || typeof response !== "string") throw new Error("ChatLlamaCpp does not support non-string message content.");
			const llamaPrompt = {
				type: "user",
				text: prompt
			};
			const llamaResponse = {
				type: "model",
				response: [response]
			};
			result.push(llamaPrompt);
			result.push(llamaResponse);
		}
		return result;
	}
	_buildPrompt(input) {
		const prompt = input.map((message) => {
			let messageText;
			if (message.getType() === "human") messageText = `[INST] ${message.content} [/INST]`;
			else if (message.getType() === "ai") messageText = message.content;
			else if (message.getType() === "system") messageText = `<<SYS>> ${message.content} <</SYS>>`;
			else if (ChatMessage.isInstance(message)) messageText = `\n\n${message.role[0].toUpperCase()}${message.role.slice(1)}: ${message.content}`;
			else {
				console.warn(`Unsupported message type passed to llama_cpp: "${message.getType()}"`);
				messageText = "";
			}
			return messageText;
		}).join("\n");
		return prompt;
	}
};

//#endregion
export { ChatLlamaCpp, llama_cpp_exports };
//# sourceMappingURL=llama_cpp.js.map