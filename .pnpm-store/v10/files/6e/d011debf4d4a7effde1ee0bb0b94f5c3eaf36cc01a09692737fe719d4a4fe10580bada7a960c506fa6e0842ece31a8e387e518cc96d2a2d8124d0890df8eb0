const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));

//#region src/embeddings/fireworks.ts
var fireworks_exports = {};
require_rolldown_runtime.__export(fireworks_exports, { FireworksEmbeddings: () => FireworksEmbeddings });
/**
* A class for generating embeddings using the Fireworks AI API.
*/
var FireworksEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	model = "nomic-ai/nomic-embed-text-v1.5";
	batchSize = 8;
	apiKey;
	basePath = "https://api.fireworks.ai/inference/v1";
	apiUrl;
	headers;
	/**
	* Constructor for the FireworksEmbeddings class.
	* @param fields - An optional object with properties to configure the instance.
	*/
	constructor(fields) {
		const fieldsWithDefaults = { ...fields };
		super(fieldsWithDefaults);
		const apiKey = fieldsWithDefaults?.apiKey || (0, __langchain_core_utils_env.getEnvironmentVariable)("FIREWORKS_API_KEY");
		if (!apiKey) throw new Error("Fireworks AI API key not found");
		this.model = fieldsWithDefaults?.model ?? this.model;
		this.batchSize = fieldsWithDefaults?.batchSize ?? this.batchSize;
		this.apiKey = apiKey;
		this.apiUrl = `${this.basePath}/embeddings`;
	}
	/**
	* Generates embeddings for an array of texts.
	* @param texts - An array of strings to generate embeddings for.
	* @returns A Promise that resolves to an array of embeddings.
	*/
	async embedDocuments(texts) {
		const batches = (0, __langchain_core_utils_chunk_array.chunkArray)(texts, this.batchSize);
		const batchRequests = batches.map((batch) => this.embeddingWithRetry({
			model: this.model,
			input: batch
		}));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const { data: batchResponse } = batchResponses[i];
			for (let j = 0; j < batch.length; j += 1) embeddings.push(batchResponse[j].embedding);
		}
		return embeddings;
	}
	/**
	* Generates an embedding for a single text.
	* @param text - A string to generate an embedding for.
	* @returns A Promise that resolves to an array of numbers representing the embedding.
	*/
	async embedQuery(text) {
		const { data } = await this.embeddingWithRetry({
			model: this.model,
			input: text
		});
		return data[0].embedding;
	}
	/**
	* Makes a request to the Fireworks AI API to generate embeddings for an array of texts.
	* @param request - An object with properties to configure the request.
	* @returns A Promise that resolves to the response from the Fireworks AI API.
	*/
	async embeddingWithRetry(request) {
		const makeCompletionRequest = async () => {
			const url = `${this.apiUrl}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
					...this.headers
				},
				body: JSON.stringify(request)
			});
			if (!response.ok) {
				const { error: message } = await response.json();
				const error = /* @__PURE__ */ new Error(`Error ${response.status}: ${message ?? "Unspecified error"}`);
				error.response = response;
				throw error;
			}
			const json = await response.json();
			return json;
		};
		return this.caller.call(makeCompletionRequest);
	}
};

//#endregion
exports.FireworksEmbeddings = FireworksEmbeddings;
Object.defineProperty(exports, 'fireworks_exports', {
  enumerable: true,
  get: function () {
    return fireworks_exports;
  }
});
//# sourceMappingURL=fireworks.cjs.map