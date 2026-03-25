import { HTTPClient } from "@mistralai/mistralai/lib/http.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Embeddings } from "@langchain/core/embeddings";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/embeddings.ts
/**
* Class for generating embeddings using the MistralAI API.
*/
var MistralAIEmbeddings = class extends Embeddings {
	modelName = "mistral-embed";
	model = "mistral-embed";
	encodingFormat = "float";
	batchSize = 512;
	stripNewLines = true;
	apiKey;
	/**
	* @deprecated use serverURL instead
	*/
	endpoint;
	serverURL;
	beforeRequestHooks;
	requestErrorHooks;
	responseHooks;
	httpClient;
	constructor(fields) {
		super(fields ?? {});
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("MISTRAL_API_KEY");
		if (!apiKey) throw new Error("API key missing for MistralAI, but it is required.");
		this.apiKey = apiKey;
		this.serverURL = fields?.serverURL ?? this.serverURL;
		this.modelName = fields?.model ?? fields?.modelName ?? this.model;
		this.model = this.modelName;
		this.encodingFormat = fields?.encodingFormat ?? this.encodingFormat;
		this.batchSize = fields?.batchSize ?? this.batchSize;
		this.stripNewLines = fields?.stripNewLines ?? this.stripNewLines;
		this.beforeRequestHooks = fields?.beforeRequestHooks ?? this.beforeRequestHooks;
		this.requestErrorHooks = fields?.requestErrorHooks ?? this.requestErrorHooks;
		this.responseHooks = fields?.responseHooks ?? this.responseHooks;
		this.httpClient = fields?.httpClient ?? this.httpClient;
		this.addAllHooksToHttpClient();
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the MistralAI API to generate
	* embeddings.
	* @param {Array<string>} texts Array of documents to generate embeddings for.
	* @returns {Promise<number[][]>} Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
		const batchRequests = batches.map((batch) => this.embeddingWithRetry(batch));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batch = batches[i];
			const { data: batchResponse } = batchResponses[i];
			for (let j = 0; j < batch.length; j += 1) embeddings.push(batchResponse[j].embedding ?? []);
		}
		return embeddings;
	}
	/**
	* Method to generate an embedding for a single document. Calls the
	* embeddingWithRetry method with the document as the input.
	* @param {string} text Document to generate an embedding for.
	* @returns {Promise<number[]>} Promise that resolves to an embedding for the document.
	*/
	async embedQuery(text) {
		const { data } = await this.embeddingWithRetry(this.stripNewLines ? text.replace(/\n/g, " ") : text);
		return data[0].embedding ?? [];
	}
	/**
	* Private method to make a request to the MistralAI API to generate
	* embeddings. Handles the retry logic and returns the response from the
	* API.
	* @param {string | Array<string>} inputs Text to send to the MistralAI API.
	* @returns {Promise<MistralAIEmbeddingsResponse>} Promise that resolves to the response from the API.
	*/
	async embeddingWithRetry(inputs) {
		const { Mistral } = await this.imports();
		const client = new Mistral({
			apiKey: this.apiKey,
			serverURL: this.serverURL,
			...this.httpClient ? { httpClient: this.httpClient } : {}
		});
		const embeddingsRequest = {
			model: this.model,
			inputs,
			encodingFormat: this.encodingFormat
		};
		return this.caller.call(async () => {
			const res = await client.embeddings.create(embeddingsRequest);
			return res;
		});
	}
	addAllHooksToHttpClient() {
		try {
			this.removeAllHooksFromHttpClient();
			const hasHooks = [
				this.beforeRequestHooks,
				this.requestErrorHooks,
				this.responseHooks
			].some((hook) => hook && hook.length > 0);
			if (hasHooks && !this.httpClient) this.httpClient = new HTTPClient();
			if (this.beforeRequestHooks) for (const hook of this.beforeRequestHooks) this.httpClient?.addHook("beforeRequest", hook);
			if (this.requestErrorHooks) for (const hook of this.requestErrorHooks) this.httpClient?.addHook("requestError", hook);
			if (this.responseHooks) for (const hook of this.responseHooks) this.httpClient?.addHook("response", hook);
		} catch {
			throw new Error("Error in adding all hooks");
		}
	}
	removeAllHooksFromHttpClient() {
		try {
			if (this.beforeRequestHooks) for (const hook of this.beforeRequestHooks) this.httpClient?.removeHook("beforeRequest", hook);
			if (this.requestErrorHooks) for (const hook of this.requestErrorHooks) this.httpClient?.removeHook("requestError", hook);
			if (this.responseHooks) for (const hook of this.responseHooks) this.httpClient?.removeHook("response", hook);
		} catch {
			throw new Error("Error in removing hooks");
		}
	}
	removeHookFromHttpClient(hook) {
		try {
			this.httpClient?.removeHook("beforeRequest", hook);
			this.httpClient?.removeHook("requestError", hook);
			this.httpClient?.removeHook("response", hook);
		} catch {
			throw new Error("Error in removing hook");
		}
	}
	/** @ignore */
	async imports() {
		const { Mistral } = await import("@mistralai/mistralai");
		return { Mistral };
	}
};

//#endregion
export { MistralAIEmbeddings };
//# sourceMappingURL=embeddings.js.map