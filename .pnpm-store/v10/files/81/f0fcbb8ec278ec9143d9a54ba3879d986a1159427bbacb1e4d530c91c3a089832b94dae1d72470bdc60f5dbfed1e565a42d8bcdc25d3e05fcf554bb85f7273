import { __export } from "../_virtual/rolldown_runtime.js";
import { createCustomGrammar, createLlamaContext, createLlamaJsonSchemaGrammar, createLlamaModel, createLlamaSession } from "../utils/llama_cpp.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { getLlama } from "node-llama-cpp";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms/llama_cpp.ts
var llama_cpp_exports = {};
__export(llama_cpp_exports, { LlamaCpp: () => LlamaCpp });
/**
*  To use this model you need to have the `node-llama-cpp` module installed.
*  This can be installed using `npm install -S node-llama-cpp` and the minimum
*  version supported in version 2.0.0.
*  This also requires that have a locally built version of Llama3 installed.
*/
var LlamaCpp = class LlamaCpp extends LLM {
	lc_serializable = true;
	static inputs;
	maxTokens;
	temperature;
	topK;
	topP;
	trimWhitespaceSuffix;
	_model;
	_context;
	_session;
	_jsonSchema;
	_gbnf;
	static lc_name() {
		return "LlamaCpp";
	}
	constructor(inputs) {
		super(inputs);
		this.maxTokens = inputs?.maxTokens;
		this.temperature = inputs?.temperature;
		this.topK = inputs?.topK;
		this.topP = inputs?.topP;
		this.trimWhitespaceSuffix = inputs?.trimWhitespaceSuffix;
	}
	/**
	* Initializes the llama_cpp model for usage.
	* @param inputs - the inputs passed onto the model.
	* @returns A Promise that resolves to the LlamaCpp type class.
	*/
	static async initialize(inputs) {
		const instance = new LlamaCpp(inputs);
		const llama = await getLlama();
		instance._model = await createLlamaModel(inputs, llama);
		instance._context = await createLlamaContext(instance._model, inputs);
		instance._jsonSchema = await createLlamaJsonSchemaGrammar(inputs?.jsonSchema, llama);
		instance._gbnf = await createCustomGrammar(inputs?.gbnf, llama);
		instance._session = createLlamaSession(instance._context);
		return instance;
	}
	_llmType() {
		return "llama_cpp";
	}
	/** @ignore */
	async _call(prompt, options) {
		try {
			let promptGrammer;
			if (this._jsonSchema !== void 0) promptGrammer = this._jsonSchema;
			else if (this._gbnf !== void 0) promptGrammer = this._gbnf;
			else promptGrammer = void 0;
			const promptOptions = {
				grammar: promptGrammer,
				onToken: options?.onToken,
				maxTokens: this?.maxTokens,
				temperature: this?.temperature,
				topK: this?.topK,
				topP: this?.topP,
				trimWhitespaceSuffix: this?.trimWhitespaceSuffix
			};
			const completion = await this._session.prompt(prompt, promptOptions);
			if (this._jsonSchema !== void 0 && completion !== void 0) return this._jsonSchema.parse(completion);
			return completion;
		} catch {
			throw new Error("Error getting prompt completion.");
		}
	}
	async *_streamResponseChunks(prompt, _options, runManager) {
		const promptOptions = {
			temperature: this?.temperature,
			maxTokens: this?.maxTokens,
			topK: this?.topK,
			topP: this?.topP
		};
		if (this._context.sequencesLeft === 0) this._context = await createLlamaContext(this._model, LlamaCpp.inputs);
		const sequence = this._context.getSequence();
		const tokens = this._model.tokenize(prompt);
		const stream = await this.caller.call(async () => sequence.evaluate(tokens, promptOptions));
		for await (const chunk of stream) {
			yield new GenerationChunk({
				text: this._model.detokenize([chunk]),
				generationInfo: {}
			});
			await runManager?.handleLLMNewToken(this._model.detokenize([chunk]) ?? "");
		}
	}
};

//#endregion
export { LlamaCpp, llama_cpp_exports };
//# sourceMappingURL=llama_cpp.js.map