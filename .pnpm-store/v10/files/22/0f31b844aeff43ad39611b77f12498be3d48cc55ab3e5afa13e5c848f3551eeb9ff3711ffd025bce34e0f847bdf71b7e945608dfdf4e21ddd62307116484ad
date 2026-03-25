import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/embeddings/bytedance_doubao.ts
var bytedance_doubao_exports = {};
__export(bytedance_doubao_exports, { ByteDanceDoubaoEmbeddings: () => ByteDanceDoubaoEmbeddings });
var ByteDanceDoubaoEmbeddings = class extends Embeddings {
	model;
	batchSize = 24;
	stripNewLines = true;
	apiKey;
	constructor(fields) {
		const fieldsWithDefaults = {
			maxConcurrency: 2,
			...fields
		};
		super(fieldsWithDefaults);
		const apiKey = fieldsWithDefaults?.apiKey ?? getEnvironmentVariable("ARK_API_KEY");
		if (!apiKey) throw new Error("ByteDanceDoubao API key not found");
		this.apiKey = apiKey;
		this.model = fieldsWithDefaults?.model ?? this.model;
		this.batchSize = fieldsWithDefaults?.batchSize ?? this.batchSize;
		this.stripNewLines = fieldsWithDefaults?.stripNewLines ?? this.stripNewLines;
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the ByteDanceDoubao API to generate
	* embeddings.
	* @param texts Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
		const batchRequests = batches.map((batch) => {
			const params = this.getParams(batch);
			return this.embeddingWithRetry(params);
		});
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const batchResponse = batchResponses[i] || [];
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
		const params = this.getParams([this.stripNewLines ? text.replace(/\n/g, " ") : text]);
		const embeddings = await this.embeddingWithRetry(params) || [[]];
		return embeddings[0];
	}
	/**
	* Method to generate an embedding params.
	* @param texts Array of documents to generate embeddings for.
	* @returns an embedding params.
	*/
	getParams(texts) {
		return {
			model: this.model,
			input: texts
		};
	}
	/**
	* Private method to make a request to the OpenAI API to generate
	* embeddings. Handles the retry logic and returns the response from the
	* API.
	* @param request Request to send to the OpenAI API.
	* @returns Promise that resolves to the response from the API.
	*/
	async embeddingWithRetry(body) {
		return fetch("https://ark.cn-beijing.volces.com/api/v3/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`
			},
			body: JSON.stringify(body)
		}).then(async (response) => {
			const embeddingData = await response.json();
			if ("code" in embeddingData && embeddingData.code) throw new Error(`${embeddingData.code}: ${embeddingData.message}`);
			return embeddingData.data.map(({ embedding }) => embedding);
		});
	}
};

//#endregion
export { ByteDanceDoubaoEmbeddings, bytedance_doubao_exports };
//# sourceMappingURL=bytedance_doubao.js.map