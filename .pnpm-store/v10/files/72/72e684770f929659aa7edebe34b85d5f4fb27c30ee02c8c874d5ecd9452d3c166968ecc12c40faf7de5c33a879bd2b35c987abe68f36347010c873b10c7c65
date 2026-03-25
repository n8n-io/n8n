const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));
const __gradientai_nodejs_sdk = require_rolldown_runtime.__toESM(require("@gradientai/nodejs-sdk"));

//#region src/embeddings/gradient_ai.ts
var gradient_ai_exports = {};
require_rolldown_runtime.__export(gradient_ai_exports, { GradientEmbeddings: () => GradientEmbeddings });
/**
* Class for generating embeddings using the Gradient AI's API. Extends the
* Embeddings class and implements GradientEmbeddingsParams and
*/
var GradientEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	gradientAccessKey;
	workspaceId;
	batchSize = 128;
	model;
	constructor(fields) {
		super(fields);
		this.gradientAccessKey = fields?.gradientAccessKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GRADIENT_ACCESS_TOKEN");
		this.workspaceId = fields?.workspaceId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GRADIENT_WORKSPACE_ID");
		if (!this.gradientAccessKey) throw new Error("Missing Gradient AI Access Token");
		if (!this.workspaceId) throw new Error("Missing Gradient AI Workspace ID");
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the Gradient API to generate
	* embeddings.
	* @param texts Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		await this.setModel();
		const mappedTexts = texts.map((text) => ({ input: text }));
		const batches = (0, __langchain_core_utils_chunk_array.chunkArray)(mappedTexts, this.batchSize);
		const batchRequests = batches.map((batch) => this.caller.call(async () => this.model.generateEmbeddings({ inputs: batch })));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const { embeddings: batchResponse } = batchResponses[i];
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
	/**
	* Method to set the model to use for generating embeddings.
	* @sets the class' `model` value to that of the retrieved Embeddings Model.
	*/
	async setModel() {
		if (this.model) return;
		const gradient = new __gradientai_nodejs_sdk.Gradient({
			accessToken: this.gradientAccessKey,
			workspaceId: this.workspaceId
		});
		this.model = await gradient.getEmbeddingsModel({ slug: "bge-large" });
	}
};

//#endregion
exports.GradientEmbeddings = GradientEmbeddings;
Object.defineProperty(exports, 'gradient_ai_exports', {
  enumerable: true,
  get: function () {
    return gradient_ai_exports;
  }
});
//# sourceMappingURL=gradient_ai.cjs.map