const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __premai_prem_sdk = require_rolldown_runtime.__toESM(require("@premai/prem-sdk"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));

//#region src/embeddings/premai.ts
var premai_exports = {};
require_rolldown_runtime.__export(premai_exports, { PremEmbeddings: () => PremEmbeddings });
/**
* Class for generating embeddings using the Prem AI's API. Extends the
* Embeddings class and implements PremEmbeddingsParams and
*/
var PremEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	client;
	batchSize = 128;
	apiKey;
	project_id;
	model;
	encoding_format;
	constructor(fields) {
		super(fields);
		const apiKey = fields?.apiKey || (0, __langchain_core_utils_env.getEnvironmentVariable)("PREM_API_KEY");
		if (!apiKey) throw new Error(`Prem API key not found. Please set the PREM_API_KEY environment variable or provide the key into "apiKey"`);
		const projectId = fields?.project_id ?? parseInt((0, __langchain_core_utils_env.getEnvironmentVariable)("PREM_PROJECT_ID") ?? "-1", 10);
		if (!projectId || projectId === -1 || typeof projectId !== "number") throw new Error(`Prem project ID not found. Please set the PREM_PROJECT_ID environment variable or provide the key into "project_id"`);
		this.client = new __premai_prem_sdk.default({ apiKey });
		this.project_id = projectId;
		this.model = fields.model ?? this.model;
		this.encoding_format = fields.encoding_format ?? this.encoding_format;
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the Prem API to generate
	* embeddings.
	* @param texts Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		const mappedTexts = texts.map((text) => text);
		const batches = (0, __langchain_core_utils_chunk_array.chunkArray)(mappedTexts, this.batchSize);
		const batchRequests = batches.map((batch) => this.caller.call(async () => this.client.embeddings.create({
			input: batch,
			model: this.model,
			encoding_format: this.encoding_format,
			project_id: this.project_id
		})));
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
	* Method to generate an embedding for a single document. Calls the
	* embedDocuments method with the document as the input.
	* @param text Document to generate an embedding for.
	* @returns Promise that resolves to an embedding for the document.
	*/
	async embedQuery(text) {
		const data = await this.embedDocuments([text]);
		return data[0];
	}
};

//#endregion
exports.PremEmbeddings = PremEmbeddings;
Object.defineProperty(exports, 'premai_exports', {
  enumerable: true,
  get: function () {
    return premai_exports;
  }
});
//# sourceMappingURL=premai.cjs.map