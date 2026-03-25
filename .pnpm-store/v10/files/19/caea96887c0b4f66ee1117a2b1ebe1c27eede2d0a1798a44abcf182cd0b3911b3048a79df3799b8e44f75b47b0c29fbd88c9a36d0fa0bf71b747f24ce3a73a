import { __export } from "../_virtual/rolldown_runtime.js";
import { Embeddings } from "@langchain/core/embeddings";
import { load } from "@tensorflow-models/universal-sentence-encoder";
import * as tf from "@tensorflow/tfjs-core";

//#region src/embeddings/tensorflow.ts
var tensorflow_exports = {};
__export(tensorflow_exports, { TensorFlowEmbeddings: () => TensorFlowEmbeddings });
/**
* Class that extends the Embeddings class and provides methods for
* generating embeddings using the Universal Sentence Encoder model from
* TensorFlow.js.
* @example
* ```typescript
* const embeddings = new TensorFlowEmbeddings();
* const store = new MemoryVectorStore(embeddings);
*
* const documents = [
*   "A document",
*   "Some other piece of text",
*   "One more",
*   "And another",
* ];
*
* await store.addDocuments(
*   documents.map((pageContent) => new Document({ pageContent }))
* );
* ```
*/
var TensorFlowEmbeddings = class extends Embeddings {
	constructor(fields) {
		super(fields ?? {});
		try {
			tf.backend();
		} catch {
			throw new Error("No TensorFlow backend found, see instructions at ...");
		}
	}
	_cached;
	/**
	* Private method that loads the Universal Sentence Encoder model if it
	* hasn't been loaded already. It returns a promise that resolves to the
	* loaded model.
	* @returns Promise that resolves to the loaded Universal Sentence Encoder model.
	*/
	async load() {
		if (this._cached === void 0) this._cached = load();
		return this._cached;
	}
	_embed(texts) {
		return this.caller.call(async () => {
			const model = await this.load();
			return model.embed(texts);
		});
	}
	/**
	* Method that takes a document as input and returns a promise that
	* resolves to an embedding for the document. It calls the _embed method
	* with the document as the input and processes the result to return a
	* single embedding.
	* @param document Document to generate an embedding for.
	* @returns Promise that resolves to an embedding for the input document.
	*/
	embedQuery(document) {
		return this._embed([document]).then((embeddings) => embeddings.array()).then((embeddings) => embeddings[0]);
	}
	/**
	* Method that takes an array of documents as input and returns a promise
	* that resolves to a 2D array of embeddings for each document. It calls
	* the _embed method with the documents as the input and processes the
	* result to return the embeddings.
	* @param documents Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each input document.
	*/
	embedDocuments(documents) {
		return this._embed(documents).then((embeddings) => embeddings.array());
	}
};

//#endregion
export { TensorFlowEmbeddings, tensorflow_exports };
//# sourceMappingURL=tensorflow.js.map