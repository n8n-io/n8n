import { __export } from "../../_virtual/rolldown_runtime.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/experimental/llms/chrome_ai.ts
var chrome_ai_exports = {};
__export(chrome_ai_exports, { ChromeAI: () => ChromeAI });
/**
* To use this model you need to have the `Built-in AI Early Preview Program`
* for Chrome. You can find more information about the program here:
* @link https://developer.chrome.com/docs/ai/built-in
*
* @example
* ```typescript
* // Initialize the ChromeAI model.
* const model = new ChromeAI({
*   temperature: 0.5, // Optional. Default is 0.5.
*   topK: 40, // Optional. Default is 40.
* });
*
* // Call the model with a message and await the response.
* const response = await model.invoke([
*   new HumanMessage({ content: "My name is John." }),
* ]);
* ```
*/
var ChromeAI = class extends LLM {
	temperature;
	topK;
	systemPrompt;
	static lc_name() {
		return "ChromeAI";
	}
	constructor(inputs) {
		super({ ...inputs });
		this.temperature = inputs?.temperature ?? this.temperature;
		this.topK = inputs?.topK ?? this.topK;
		this.systemPrompt = inputs?.systemPrompt;
	}
	_llmType() {
		return "chrome_ai";
	}
	/**
	* Initialize the model. This method may be called before invoking the model
	* to set up a chat session in advance.
	*/
	async createSession() {
		let aiInstance;
		try {
			aiInstance = LanguageModel;
		} catch (e) {
			throw new Error(`Could not initialize ChromeAI instance. Make sure you are running a version of Chrome with the proper experimental flags enabled.\n\nError message: ${e.message}`);
		}
		const availability = await aiInstance.availability();
		if (availability === "no") throw new Error("The AI model is not available.");
		else if (availability === "after-download") throw new Error("The AI model is not yet downloaded.");
		const session = await aiInstance.create({
			systemPrompt: this.systemPrompt,
			topK: this.topK,
			temperature: this.temperature
		});
		return session;
	}
	async *_streamResponseChunks(prompt, _options, runManager) {
		let session;
		try {
			session = await this.createSession();
			const stream = session.promptStreaming(prompt);
			const iterableStream = IterableReadableStream.fromReadableStream(stream);
			for await (const chunk of iterableStream) {
				const newContent = chunk;
				yield new GenerationChunk({ text: newContent });
				await runManager?.handleLLMNewToken(newContent);
			}
		} finally {
			session?.destroy();
		}
	}
	async _call(prompt, options, runManager) {
		const chunks = [];
		for await (const chunk of this._streamResponseChunks(prompt, options, runManager)) chunks.push(chunk.text);
		return chunks.join("");
	}
};

//#endregion
export { ChromeAI, chrome_ai_exports };
//# sourceMappingURL=chrome_ai.js.map