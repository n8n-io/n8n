const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llama_cpp = require('../utils/llama_cpp.cjs');
const node_llama_cpp = require_rolldown_runtime.__toESM(require("node-llama-cpp"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));

//#region src/embeddings/llama_cpp.ts
var llama_cpp_exports = {};
require_rolldown_runtime.__export(llama_cpp_exports, { LlamaCppEmbeddings: () => LlamaCppEmbeddings });
/**
* @example
* ```typescript
* // Initialize LlamaCppEmbeddings with the path to the model file
* const embeddings = await LlamaCppEmbeddings.initialize({
*   modelPath: llamaPath,
* });
*
* // Embed a query string using the Llama embeddings
* const res = embeddings.embedQuery("Hello Llama!");
*
* // Output the resulting embeddings
* console.log(res);
*
* ```
*/
var LlamaCppEmbeddings = class LlamaCppEmbeddings extends __langchain_core_embeddings.Embeddings {
	_model;
	_embeddingContext;
	constructor(inputs) {
		super(inputs);
		const _inputs = inputs;
		_inputs.embedding = true;
	}
	/**
	* Initializes the llama_cpp model for usage in the embeddings wrapper.
	* @param inputs - the inputs passed onto the model.
	* @returns A Promise that resolves to the LlamaCppEmbeddings type class.
	*/
	static async initialize(inputs) {
		const instance = new LlamaCppEmbeddings(inputs);
		const llama = await (0, node_llama_cpp.getLlama)();
		instance._model = await require_llama_cpp.createLlamaModel(inputs, llama);
		instance._embeddingContext = await require_llama_cpp.createLlamaEmbeddingContext(instance._model, inputs);
		return instance;
	}
	/**
	* Generates embeddings for an array of texts.
	* @param texts - An array of strings to generate embeddings for.
	* @returns A Promise that resolves to an array of embeddings.
	*/
	async embedDocuments(texts) {
		const embeddings = [];
		for (const text of texts) {
			const embedding = await this.caller.call(() => this._embeddingContext.getEmbeddingFor(text));
			embeddings.push(Array.from(embedding.vector));
		}
		return embeddings;
	}
	/**
	* Generates an embedding for a single text.
	* @param text - A string to generate an embedding for.
	* @returns A Promise that resolves to an array of numbers representing the embedding.
	*/
	async embedQuery(text) {
		const embedding = await this.caller.call(() => this._embeddingContext.getEmbeddingFor(text));
		return Array.from(embedding.vector);
	}
};

//#endregion
exports.LlamaCppEmbeddings = LlamaCppEmbeddings;
Object.defineProperty(exports, 'llama_cpp_exports', {
  enumerable: true,
  get: function () {
    return llama_cpp_exports;
  }
});
//# sourceMappingURL=llama_cpp.cjs.map