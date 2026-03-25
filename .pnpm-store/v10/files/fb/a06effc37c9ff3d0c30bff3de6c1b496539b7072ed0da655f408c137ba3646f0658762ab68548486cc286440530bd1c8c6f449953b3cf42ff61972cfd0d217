import { __export } from "../_virtual/rolldown_runtime.js";
import { createLlamaEmbeddingContext, createLlamaModel } from "../utils/llama_cpp.js";
import { getLlama } from "node-llama-cpp";
import { Embeddings } from "@langchain/core/embeddings";

//#region src/embeddings/llama_cpp.ts
var llama_cpp_exports = {};
__export(llama_cpp_exports, { LlamaCppEmbeddings: () => LlamaCppEmbeddings });
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
var LlamaCppEmbeddings = class LlamaCppEmbeddings extends Embeddings {
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
		const llama = await getLlama();
		instance._model = await createLlamaModel(inputs, llama);
		instance._embeddingContext = await createLlamaEmbeddingContext(instance._model, inputs);
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
export { LlamaCppEmbeddings, llama_cpp_exports };
//# sourceMappingURL=llama_cpp.js.map