import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/embeddings/minimax.ts
var minimax_exports = {};
__export(minimax_exports, { MinimaxEmbeddings: () => MinimaxEmbeddings });
/**
* Class for generating embeddings using the Minimax API. Extends the
* Embeddings class and implements MinimaxEmbeddingsParams
* @example
* ```typescript
* const embeddings = new MinimaxEmbeddings();
*
* // Embed a single query
* const queryEmbedding = await embeddings.embedQuery("Hello world");
* console.log(queryEmbedding);
*
* // Embed multiple documents
* const documentsEmbedding = await embeddings.embedDocuments([
*   "Hello world",
*   "Bye bye",
* ]);
* console.log(documentsEmbedding);
* ```
*/
var MinimaxEmbeddings = class extends Embeddings {
	modelName = "embo-01";
	model = "embo-01";
	batchSize = 512;
	stripNewLines = true;
	minimaxGroupId;
	minimaxApiKey;
	apiKey;
	type = "db";
	apiUrl;
	basePath = "https://api.minimax.chat/v1";
	headers;
	constructor(fields) {
		const fieldsWithDefaults = {
			maxConcurrency: 2,
			...fields
		};
		super(fieldsWithDefaults);
		this.minimaxGroupId = fields?.minimaxGroupId ?? getEnvironmentVariable("MINIMAX_GROUP_ID");
		if (!this.minimaxGroupId) throw new Error("Minimax GroupID  not found");
		this.minimaxApiKey = fields?.apiKey ?? fields?.minimaxApiKey ?? getEnvironmentVariable("MINIMAX_API_KEY");
		this.apiKey = this.minimaxApiKey;
		if (!this.apiKey) throw new Error("Minimax ApiKey not found");
		this.modelName = fieldsWithDefaults?.model ?? fieldsWithDefaults?.modelName ?? this.model;
		this.model = this.modelName;
		this.batchSize = fieldsWithDefaults?.batchSize ?? this.batchSize;
		this.type = fieldsWithDefaults?.type ?? this.type;
		this.stripNewLines = fieldsWithDefaults?.stripNewLines ?? this.stripNewLines;
		this.basePath = fields?.configuration?.basePath ?? this.basePath;
		this.apiUrl = `${this.basePath}/embeddings`;
		this.headers = fields?.configuration?.headers ?? this.headers;
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the Minimax API to generate
	* embeddings.
	* @param texts Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
		const batchRequests = batches.map((batch) => this.embeddingWithRetry({
			model: this.model,
			texts: batch,
			type: this.type
		}));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const { vectors: batchResponse } = batchResponses[i];
			for (let j = 0; j < batch.length; j += 1) embeddings.push(batchResponse[j]);
		}
		return embeddings;
	}
	/**
	* Method to generate an embedding for a single document. Calls the
	* embeddingWithRetry method with the document as the input.
	* @param text Document to generate an embedding for.
	* @returns Promise that resolves to an embedding for the document.
	*/
	async embedQuery(text) {
		const { vectors } = await this.embeddingWithRetry({
			model: this.model,
			texts: [this.stripNewLines ? text.replace(/\n/g, " ") : text],
			type: this.type
		});
		return vectors[0];
	}
	/**
	* Private method to make a request to the Minimax API to generate
	* embeddings. Handles the retry logic and returns the response from the
	* API.
	* @param request Request to send to the Minimax API.
	* @returns Promise that resolves to the response from the API.
	*/
	async embeddingWithRetry(request) {
		const makeCompletionRequest = async () => {
			const url = `${this.apiUrl}?GroupId=${this.minimaxGroupId}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
					...this.headers
				},
				body: JSON.stringify(request)
			});
			const json = await response.json();
			return json;
		};
		return this.caller.call(makeCompletionRequest);
	}
};

//#endregion
export { MinimaxEmbeddings, minimax_exports };
//# sourceMappingURL=minimax.js.map