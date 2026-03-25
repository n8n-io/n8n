import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";
import { Gradient } from "@gradientai/nodejs-sdk";

//#region src/embeddings/gradient_ai.ts
var gradient_ai_exports = {};
__export(gradient_ai_exports, { GradientEmbeddings: () => GradientEmbeddings });
/**
* Class for generating embeddings using the Gradient AI's API. Extends the
* Embeddings class and implements GradientEmbeddingsParams and
*/
var GradientEmbeddings = class extends Embeddings {
	gradientAccessKey;
	workspaceId;
	batchSize = 128;
	model;
	constructor(fields) {
		super(fields);
		this.gradientAccessKey = fields?.gradientAccessKey ?? getEnvironmentVariable("GRADIENT_ACCESS_TOKEN");
		this.workspaceId = fields?.workspaceId ?? getEnvironmentVariable("GRADIENT_WORKSPACE_ID");
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
		const batches = chunkArray(mappedTexts, this.batchSize);
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
		const gradient = new Gradient({
			accessToken: this.gradientAccessKey,
			workspaceId: this.workspaceId
		});
		this.model = await gradient.getEmbeddingsModel({ slug: "bge-large" });
	}
};

//#endregion
export { GradientEmbeddings, gradient_ai_exports };
//# sourceMappingURL=gradient_ai.js.map