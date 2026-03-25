import { __export } from "../_virtual/rolldown_runtime.js";
import { SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import * as webllm from "@mlc-ai/web-llm";

//#region src/chat_models/webllm.ts
var webllm_exports = {};
__export(webllm_exports, { ChatWebLLM: () => ChatWebLLM });
/**
* To use this model you need to have the `@mlc-ai/web-llm` module installed.
* This can be installed using `npm install -S @mlc-ai/web-llm`.
*
* You can see a list of available model records here:
* https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
* @example
* ```typescript
* // Initialize the ChatWebLLM model with the model record.
* const model = new ChatWebLLM({
*   model: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
*   chatOptions: {
*     temperature: 0.5,
*   },
* });
*
* // Call the model with a message and await the response.
* const response = await model.invoke([
*   new HumanMessage({ content: "My name is John." }),
* ]);
* ```
*/
var ChatWebLLM = class extends SimpleChatModel {
	static inputs;
	engine;
	appConfig;
	chatOptions;
	temperature;
	model;
	static lc_name() {
		return "ChatWebLLM";
	}
	constructor(inputs) {
		super(inputs);
		this.appConfig = inputs.appConfig;
		this.chatOptions = inputs.chatOptions;
		this.model = inputs.model;
		this.temperature = inputs.temperature;
		this.engine = new webllm.MLCEngine({ appConfig: this.appConfig });
	}
	_llmType() {
		return "web-llm";
	}
	async initialize(progressCallback) {
		if (progressCallback !== void 0) this.engine.setInitProgressCallback(progressCallback);
		await this.reload(this.model, this.chatOptions);
	}
	async reload(modelId, newChatOpts) {
		await this.engine.reload(modelId, newChatOpts);
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const messagesInput = messages.map((message) => {
			if (typeof message.content !== "string") throw new Error("ChatWebLLM does not support non-string message content in sessions.");
			const langChainType = message._getType();
			let role;
			if (langChainType === "ai") role = "assistant";
			else if (langChainType === "human") role = "user";
			else if (langChainType === "system") role = "system";
			else throw new Error("Function, tool, and generic messages are not supported.");
			return {
				role,
				content: message.content
			};
		});
		const stream = await this.engine.chat.completions.create({
			stream: true,
			messages: messagesInput,
			stop: options.stop,
			logprobs: true
		});
		for await (const chunk of stream) {
			const text = chunk.choices[0].delta.content ?? "";
			yield new ChatGenerationChunk({
				text,
				message: new AIMessageChunk({
					content: text,
					additional_kwargs: {
						logprobs: chunk.choices[0].logprobs,
						finish_reason: chunk.choices[0].finish_reason
					}
				})
			});
			await runManager?.handleLLMNewToken(text);
		}
	}
	async _call(messages, options, runManager) {
		const chunks = [];
		for await (const chunk of this._streamResponseChunks(messages, options, runManager)) chunks.push(chunk.text);
		return chunks.join("");
	}
};

//#endregion
export { ChatWebLLM, webllm_exports };
//# sourceMappingURL=webllm.js.map