const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llama_cpp = require('../utils/llama_cpp.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const node_llama_cpp = require_rolldown_runtime.__toESM(require("node-llama-cpp"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/llama_cpp.ts
var llama_cpp_exports = {};
require_rolldown_runtime.__export(llama_cpp_exports, { LlamaCpp: () => LlamaCpp });
/**
*  To use this model you need to have the `node-llama-cpp` module installed.
*  This can be installed using `npm install -S node-llama-cpp` and the minimum
*  version supported in version 2.0.0.
*  This also requires that have a locally built version of Llama3 installed.
*/
var LlamaCpp = class LlamaCpp extends __langchain_core_language_models_llms.LLM {
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
		const llama = await (0, node_llama_cpp.getLlama)();
		instance._model = await require_llama_cpp.createLlamaModel(inputs, llama);
		instance._context = await require_llama_cpp.createLlamaContext(instance._model, inputs);
		instance._jsonSchema = await require_llama_cpp.createLlamaJsonSchemaGrammar(inputs?.jsonSchema, llama);
		instance._gbnf = await require_llama_cpp.createCustomGrammar(inputs?.gbnf, llama);
		instance._session = require_llama_cpp.createLlamaSession(instance._context);
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
		if (this._context.sequencesLeft === 0) this._context = await require_llama_cpp.createLlamaContext(this._model, LlamaCpp.inputs);
		const sequence = this._context.getSequence();
		const tokens = this._model.tokenize(prompt);
		const stream = await this.caller.call(async () => sequence.evaluate(tokens, promptOptions));
		for await (const chunk of stream) {
			yield new __langchain_core_outputs.GenerationChunk({
				text: this._model.detokenize([chunk]),
				generationInfo: {}
			});
			await runManager?.handleLLMNewToken(this._model.detokenize([chunk]) ?? "");
		}
	}
};

//#endregion
exports.LlamaCpp = LlamaCpp;
Object.defineProperty(exports, 'llama_cpp_exports', {
  enumerable: true,
  get: function () {
    return llama_cpp_exports;
  }
});
//# sourceMappingURL=llama_cpp.cjs.map