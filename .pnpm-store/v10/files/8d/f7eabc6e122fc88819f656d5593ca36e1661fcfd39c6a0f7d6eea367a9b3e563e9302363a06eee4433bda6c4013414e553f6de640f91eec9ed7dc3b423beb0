import { getCohereClient } from "./client.js";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/embeddings.ts
/**
* A class for generating embeddings using the Cohere API.
*/
var CohereEmbeddings = class extends Embeddings {
	model;
	batchSize = 48;
	embeddingTypes = ["float"];
	client;
	/**
	* Constructor for the CohereEmbeddings class.
	* @param fields - An optional object with properties to configure the instance.
	*/
	constructor(fields) {
		const fieldsWithDefaults = {
			maxConcurrency: 2,
			...fields
		};
		super(fieldsWithDefaults);
		this.client = getCohereClient(fieldsWithDefaults);
		this.model = fieldsWithDefaults?.model ?? this.model;
		if (!this.model) throw new Error("Model not specified for CohereEmbeddings instance. Please provide a model name from the options here: https://docs.cohere.com/reference/embed");
		this.batchSize = fieldsWithDefaults?.batchSize ?? this.batchSize;
		this.embeddingTypes = fieldsWithDefaults?.embeddingTypes ?? this.embeddingTypes;
	}
	/**
	* Generates embeddings for an array of texts.
	* @param texts - An array of strings to generate embeddings for.
	* @returns A Promise that resolves to an array of embeddings.
	*/
	async embedDocuments(texts) {
		const batches = chunkArray(texts, this.batchSize);
		const batchRequests = batches.map((batch) => this.embeddingWithRetry({
			model: this.model,
			texts: batch,
			inputType: "search_document",
			embeddingTypes: this.embeddingTypes
		}));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const { embeddings: batchResponse } = batchResponses[i];
			for (let j = 0; j < batch.length; j += 1) if ("float" in batchResponse && batchResponse.float) embeddings.push(batchResponse.float[j]);
			else if (Array.isArray(batchResponse)) embeddings.push(batchResponse[j]);
		}
		return embeddings;
	}
	/**
	* Generates an embedding for a single text.
	* @param text - A string to generate an embedding for.
	* @returns A Promise that resolves to an array of numbers representing the embedding.
	*/
	async embedQuery(text) {
		const { embeddings } = await this.embeddingWithRetry({
			model: this.model,
			texts: [text],
			inputType: "search_query",
			embeddingTypes: this.embeddingTypes
		});
		if ("float" in embeddings && embeddings.float) return embeddings.float[0];
		else if (Array.isArray(embeddings)) return embeddings[0];
		else throw new Error(`Invalid response from Cohere API. Received: ${JSON.stringify(embeddings, null, 2)}`);
	}
	async embed(request) {
		const { embeddings } = await this.embeddingWithRetry(request);
		if ("float" in embeddings && embeddings.float) return embeddings.float[0];
		else if (Array.isArray(embeddings)) return embeddings[0];
		else throw new Error(`Invalid response from Cohere API. Received: ${JSON.stringify(embeddings, null, 2)}`);
	}
	/**
	* Generates embeddings with retry capabilities.
	* @param request - An object containing the request parameters for generating embeddings.
	* @returns A Promise that resolves to the API response.
	*/
	async embeddingWithRetry(request) {
		return this.caller.call(async () => {
			let response;
			try {
				response = await this.client.embed(request);
			} catch (e) {
				e.status = e.status ?? e.statusCode;
				throw e;
			}
			return response;
		});
	}
	get lc_secrets() {
		return {
			apiKey: "COHERE_API_KEY",
			api_key: "COHERE_API_KEY"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "cohere_api_key",
			api_key: "cohere_api_key"
		};
	}
};

//#endregion
export { CohereEmbeddings };
//# sourceMappingURL=embeddings.js.map