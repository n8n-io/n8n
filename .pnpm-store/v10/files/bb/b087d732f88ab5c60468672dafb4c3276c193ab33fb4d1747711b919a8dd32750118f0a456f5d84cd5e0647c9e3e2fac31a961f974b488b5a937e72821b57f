const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));
const __huggingface_inference = require_rolldown_runtime.__toESM(require("@huggingface/inference"));

//#region src/embeddings/hf.ts
var hf_exports = {};
require_rolldown_runtime.__export(hf_exports, { HuggingFaceInferenceEmbeddings: () => HuggingFaceInferenceEmbeddings });
/**
* Class that extends the Embeddings class and provides methods for
* generating embeddings using Hugging Face models through the
* HuggingFaceInference API.
*/
var HuggingFaceInferenceEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	apiKey;
	model;
	endpointUrl;
	provider;
	client;
	constructor(fields) {
		super(fields ?? {});
		if (fields?.model) this.model = fields.model;
		else {
			console.warn("[HuggingFaceInferenceEmbeddings] No \"model\" provided. Using default: \"BAAI/bge-base-en-v1.5\".");
			this.model = "BAAI/bge-base-en-v1.5";
		}
		this.apiKey = fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("HUGGINGFACEHUB_API_KEY");
		this.endpointUrl = fields?.endpointUrl;
		this.provider = fields?.provider;
		this.client = this.endpointUrl ? new __huggingface_inference.InferenceClient(this.apiKey).endpoint(this.endpointUrl) : new __huggingface_inference.InferenceClient(this.apiKey);
	}
	async _embed(texts) {
		const clean = texts.map((text) => text.replace(/\n/g, " "));
		return this.caller.call(() => this.client.featureExtraction({
			model: this.model,
			inputs: clean,
			provider: this.provider
		}));
	}
	/**
	* Method that takes a document as input and returns a promise that
	* resolves to an embedding for the document. It calls the _embed method
	* with the document as the input and returns the first embedding in the
	* resulting array.
	* @param document Document to generate an embedding for.
	* @returns Promise that resolves to an embedding for the document.
	*/
	embedQuery(document) {
		return this._embed([document]).then((embeddings) => embeddings[0]);
	}
	/**
	* Method that takes an array of documents as input and returns a promise
	* that resolves to a 2D array of embeddings for each document. It calls
	* the _embed method with the documents as the input.
	* @param documents Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	embedDocuments(documents) {
		return this._embed(documents);
	}
};

//#endregion
exports.HuggingFaceInferenceEmbeddings = HuggingFaceInferenceEmbeddings;
Object.defineProperty(exports, 'hf_exports', {
  enumerable: true,
  get: function () {
    return hf_exports;
  }
});
//# sourceMappingURL=hf.cjs.map