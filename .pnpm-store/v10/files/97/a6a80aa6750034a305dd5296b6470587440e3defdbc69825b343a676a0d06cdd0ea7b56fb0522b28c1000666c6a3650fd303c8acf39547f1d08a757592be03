let _google_generative_ai = require("@google/generative-ai");
let _langchain_core_utils_env = require("@langchain/core/utils/env");
let _langchain_core_embeddings = require("@langchain/core/embeddings");
let _langchain_core_utils_chunk_array = require("@langchain/core/utils/chunk_array");

//#region src/embeddings.ts
/**
* Class that extends the Embeddings class and provides methods for
* generating embeddings using the Google Palm API.
* @example
* ```typescript
* const model = new GoogleGenerativeAIEmbeddings({
*   apiKey: "<YOUR API KEY>",
*   modelName: "embedding-001",
* });
*
* // Embed a single query
* const res = await model.embedQuery(
*   "What would be a good company name for a company that makes colorful socks?"
* );
* console.log({ res });
*
* // Embed multiple documents
* const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
* console.log({ documentRes });
* ```
*/
var GoogleGenerativeAIEmbeddings = class extends _langchain_core_embeddings.Embeddings {
	apiKey;
	modelName = "embedding-001";
	model = "embedding-001";
	taskType;
	title;
	stripNewLines = true;
	maxBatchSize = 100;
	client;
	constructor(fields) {
		super(fields ?? {});
		this.modelName = fields?.model?.replace(/^models\//, "") ?? fields?.modelName?.replace(/^models\//, "") ?? this.modelName;
		this.model = this.modelName;
		this.taskType = fields?.taskType ?? this.taskType;
		this.title = fields?.title ?? this.title;
		if (this.title && this.taskType !== "RETRIEVAL_DOCUMENT") throw new Error("title can only be sepcified with TaskType.RETRIEVAL_DOCUMENT");
		this.apiKey = fields?.apiKey ?? (0, _langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_API_KEY");
		if (!this.apiKey) throw new Error("Please set an API key for Google GenerativeAI in the environmentb variable GOOGLE_API_KEY or in the `apiKey` field of the GoogleGenerativeAIEmbeddings constructor");
		this.client = new _google_generative_ai.GoogleGenerativeAI(this.apiKey).getGenerativeModel({ model: this.model }, { baseUrl: fields?.baseUrl });
	}
	_convertToContent(text) {
		return {
			content: {
				role: "user",
				parts: [{ text: this.stripNewLines ? text.replace(/\n/g, " ") : text }]
			},
			taskType: this.taskType,
			title: this.title
		};
	}
	async _embedQueryContent(text) {
		const req = this._convertToContent(text);
		return (await this.client.embedContent(req)).embedding.values ?? [];
	}
	async _embedDocumentsContent(documents) {
		const batchEmbedChunks = (0, _langchain_core_utils_chunk_array.chunkArray)(documents, this.maxBatchSize);
		const batchEmbedRequests = batchEmbedChunks.map((chunk) => ({ requests: chunk.map((doc) => this._convertToContent(doc)) }));
		return (await Promise.allSettled(batchEmbedRequests.map((req) => this.client.batchEmbedContents(req)))).flatMap((res, idx) => {
			if (res.status === "fulfilled") return res.value.embeddings.map((e) => e.values || []);
			else return Array(batchEmbedChunks[idx].length).fill([]);
		});
	}
	/**
	* Method that takes a document as input and returns a promise that
	* resolves to an embedding for the document. It calls the _embedText
	* method with the document as the input.
	* @param document Document for which to generate an embedding.
	* @returns Promise that resolves to an embedding for the input document.
	*/
	embedQuery(document) {
		return this.caller.call(this._embedQueryContent.bind(this), document);
	}
	/**
	* Method that takes an array of documents as input and returns a promise
	* that resolves to a 2D array of embeddings for each document. It calls
	* the _embedText method for each document in the array.
	* @param documents Array of documents for which to generate embeddings.
	* @returns Promise that resolves to a 2D array of embeddings for each input document.
	*/
	embedDocuments(documents) {
		return this.caller.call(this._embedDocumentsContent.bind(this), documents);
	}
};

//#endregion
exports.GoogleGenerativeAIEmbeddings = GoogleGenerativeAIEmbeddings;
//# sourceMappingURL=embeddings.cjs.map