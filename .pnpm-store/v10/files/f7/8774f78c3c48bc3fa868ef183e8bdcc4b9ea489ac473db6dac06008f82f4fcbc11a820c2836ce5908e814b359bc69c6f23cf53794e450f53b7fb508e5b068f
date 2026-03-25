const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_client = require('./utils/client.cjs');
const require_azure = require('./utils/azure.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));

//#region src/embeddings.ts
/**
* Class for generating embeddings using the OpenAI API.
*
* To use with Azure, import the `AzureOpenAIEmbeddings` class.
*
* @example
* ```typescript
* // Embed a query using OpenAIEmbeddings to generate embeddings for a given text
* const model = new OpenAIEmbeddings();
* const res = await model.embedQuery(
*   "What would be a good company name for a company that makes colorful socks?",
* );
* console.log({ res });
*
* ```
*/
var OpenAIEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	model = "text-embedding-ada-002";
	/** @deprecated Use "model" instead */
	modelName;
	batchSize = 512;
	stripNewLines = true;
	/**
	* The number of dimensions the resulting output embeddings should have.
	* Only supported in `text-embedding-3` and later models.
	*/
	dimensions;
	timeout;
	organization;
	encodingFormat;
	client;
	clientConfig;
	apiKey;
	constructor(fields) {
		const fieldsWithDefaults = {
			maxConcurrency: 2,
			...fields
		};
		super(fieldsWithDefaults);
		const apiKey = fieldsWithDefaults?.apiKey ?? fieldsWithDefaults?.openAIApiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("OPENAI_API_KEY");
		this.organization = fieldsWithDefaults?.configuration?.organization ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("OPENAI_ORGANIZATION");
		this.model = fieldsWithDefaults?.model ?? fieldsWithDefaults?.modelName ?? this.model;
		this.modelName = this.model;
		this.batchSize = fieldsWithDefaults?.batchSize ?? this.batchSize;
		this.stripNewLines = fieldsWithDefaults?.stripNewLines ?? this.stripNewLines;
		this.timeout = fieldsWithDefaults?.timeout;
		this.dimensions = fieldsWithDefaults?.dimensions;
		this.encodingFormat = fieldsWithDefaults?.encodingFormat;
		this.clientConfig = {
			apiKey,
			organization: this.organization,
			dangerouslyAllowBrowser: true,
			...fields?.configuration
		};
	}
	/**
	* Method to generate embeddings for an array of documents. Splits the
	* documents into batches and makes requests to the OpenAI API to generate
	* embeddings.
	* @param texts Array of documents to generate embeddings for.
	* @returns Promise that resolves to a 2D array of embeddings for each document.
	*/
	async embedDocuments(texts) {
		const batches = (0, __langchain_core_utils_chunk_array.chunkArray)(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
		const batchRequests = batches.map((batch) => {
			const params = {
				model: this.model,
				input: batch
			};
			if (this.dimensions) params.dimensions = this.dimensions;
			if (this.encodingFormat) params.encoding_format = this.encodingFormat;
			return this.embeddingWithRetry(params);
		});
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
	* embeddingWithRetry method with the document as the input.
	* @param text Document to generate an embedding for.
	* @returns Promise that resolves to an embedding for the document.
	*/
	async embedQuery(text) {
		const params = {
			model: this.model,
			input: this.stripNewLines ? text.replace(/\n/g, " ") : text
		};
		if (this.dimensions) params.dimensions = this.dimensions;
		if (this.encodingFormat) params.encoding_format = this.encodingFormat;
		const { data } = await this.embeddingWithRetry(params);
		return data[0].embedding;
	}
	/**
	* Private method to make a request to the OpenAI API to generate
	* embeddings. Handles the retry logic and returns the response from the
	* API.
	* @param request Request to send to the OpenAI API.
	* @returns Promise that resolves to the response from the API.
	*/
	async embeddingWithRetry(request) {
		if (!this.client) {
			const openAIEndpointConfig = { baseURL: this.clientConfig.baseURL };
			const endpoint = require_azure.getEndpoint(openAIEndpointConfig);
			const params = {
				...this.clientConfig,
				baseURL: endpoint,
				timeout: this.timeout,
				maxRetries: 0
			};
			if (!params.baseURL) delete params.baseURL;
			params.defaultHeaders = require_azure.getHeadersWithUserAgent(params.defaultHeaders);
			this.client = new openai.OpenAI(params);
		}
		const requestOptions = {};
		return this.caller.call(async () => {
			try {
				const res = await this.client.embeddings.create(request, requestOptions);
				return res;
			} catch (e) {
				const error = require_client.wrapOpenAIClientError(e);
				throw error;
			}
		});
	}
};

//#endregion
exports.OpenAIEmbeddings = OpenAIEmbeddings;
//# sourceMappingURL=embeddings.cjs.map