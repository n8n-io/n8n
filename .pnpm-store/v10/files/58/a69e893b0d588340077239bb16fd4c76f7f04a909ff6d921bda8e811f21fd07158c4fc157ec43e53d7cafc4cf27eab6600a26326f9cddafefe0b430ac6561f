const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));

//#region src/vectorstores.ts
/**
* Class that is a wrapper around MongoDB Atlas Vector Search. It is used
* to store embeddings in MongoDB documents, create a vector search index,
* and perform K-Nearest Neighbors (KNN) search with an approximate
* nearest neighbor algorithm.
*/
var MongoDBAtlasVectorSearch = class MongoDBAtlasVectorSearch extends __langchain_core_vectorstores.VectorStore {
	collection;
	indexName;
	textKey;
	embeddingKey;
	primaryKey;
	caller;
	_vectorstoreType() {
		return "mongodb_atlas";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.collection = args.collection;
		this.indexName = args.indexName ?? "default";
		this.textKey = args.textKey ?? "text";
		this.embeddingKey = args.embeddingKey ?? "embedding";
		this.primaryKey = args.primaryKey ?? "_id";
		this.caller = new __langchain_core_utils_async_caller.AsyncCaller(args);
		this.collection.db.client.appendMetadata({ name: "langchainjs_vector" });
	}
	/**
	* Method to add vectors and their corresponding documents to the MongoDB
	* collection.
	* @param vectors Vectors to be added.
	* @param documents Corresponding documents to be added.
	* @returns Promise that resolves when the vectors and documents have been added.
	*/
	async addVectors(vectors, documents, options) {
		const docs = vectors.map((embedding, idx) => ({
			[this.textKey]: documents[idx].pageContent,
			[this.embeddingKey]: embedding,
			...documents[idx].metadata
		}));
		if (options?.ids === void 0) await this.collection.insertMany(docs);
		else {
			if (options.ids.length !== vectors.length) throw new Error(`If provided, "options.ids" must be an array with the same length as "vectors".`);
			const { ids } = options;
			for (let i = 0; i < docs.length; i += 1) await this.caller.call(async () => {
				await this.collection.updateOne({ [this.primaryKey]: ids[i] }, { $set: {
					[this.primaryKey]: ids[i],
					...docs[i]
				} }, { upsert: true });
			});
		}
		return options?.ids ?? docs.map((doc) => doc[this.primaryKey]);
	}
	/**
	* Method to add documents to the MongoDB collection. It first converts
	* the documents to vectors using the embeddings and then calls the
	* addVectors method.
	* @param documents Documents to be added.
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method that performs a similarity search on the vectors stored in the
	* MongoDB collection. It returns a list of documents and their
	* corresponding similarity scores.
	* @param query Query vector for the similarity search.
	* @param k Number of nearest neighbors to return.
	* @param filter Optional filter to be applied.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const postFilterPipeline = filter?.postFilterPipeline ?? [];
		const preFilter = filter?.preFilter || filter?.postFilterPipeline || filter?.includeEmbeddings ? filter.preFilter : filter;
		const removeEmbeddingsPipeline = !filter?.includeEmbeddings ? [{ $project: { [this.embeddingKey]: 0 } }] : [];
		const pipeline = [
			{ $vectorSearch: {
				queryVector: MongoDBAtlasVectorSearch.fixArrayPrecision(query),
				index: this.indexName,
				path: this.embeddingKey,
				limit: k,
				numCandidates: 10 * k,
				...preFilter && { filter: preFilter }
			} },
			{ $set: { score: { $meta: "vectorSearchScore" } } },
			...removeEmbeddingsPipeline,
			...postFilterPipeline
		];
		const results = this.collection.aggregate(pipeline).map((result) => {
			const { score, [this.textKey]: text,...metadata } = result;
			return [new __langchain_core_documents.Document({
				pageContent: text,
				metadata
			}), score];
		});
		return results.toArray();
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND diversity
	* among selected documents.
	*
	* @param {string} query - Text to look up documents similar to.
	* @param {number} options.k - Number of documents to return.
	* @param {number} options.fetchK=20- Number of documents to fetch before passing to the MMR algorithm.
	* @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
	*                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
	* @param {MongoDBAtlasFilter} options.filter - Optional Atlas Search operator to pre-filter on document fields
	*                                      or post-filter following the knnBeta search.
	*
	* @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const { k, fetchK = 20, lambda = .5, filter } = options;
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const includeEmbeddingsFlag = options.filter?.includeEmbeddings || false;
		const includeEmbeddingsFilter = {
			...filter,
			includeEmbeddings: true
		};
		const resultDocs = await this.similaritySearchVectorWithScore(MongoDBAtlasVectorSearch.fixArrayPrecision(queryEmbedding), fetchK, includeEmbeddingsFilter);
		const embeddingList = resultDocs.map((doc) => doc[0].metadata[this.embeddingKey]);
		const mmrIndexes = (0, __langchain_core_utils_math.maximalMarginalRelevance)(queryEmbedding, embeddingList, lambda, k);
		return mmrIndexes.map((idx) => {
			const doc = resultDocs[idx][0];
			if (!includeEmbeddingsFlag) delete doc.metadata[this.embeddingKey];
			return doc;
		});
	}
	/**
	* Delete documents from the collection
	* @param ids - An array of document IDs to be deleted from the collection.
	*
	* @returns - A promise that resolves when all documents deleted
	*/
	async delete(params) {
		const CHUNK_SIZE = 50;
		const chunkIds = (0, __langchain_core_utils_chunk_array.chunkArray)(params.ids, CHUNK_SIZE);
		for (const chunk of chunkIds) await this.collection.deleteMany({ _id: { $in: chunk } });
	}
	/**
	* Static method to create an instance of MongoDBAtlasVectorSearch from a
	* list of texts. It first converts the texts to vectors and then adds
	* them to the MongoDB collection.
	* @param texts List of texts to be converted to vectors.
	* @param metadatas Metadata for the texts.
	* @param embeddings Embeddings to be used for conversion.
	* @param dbConfig Database configuration for MongoDB Atlas.
	* @returns Promise that resolves to a new instance of MongoDBAtlasVectorSearch.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return this.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create an instance of MongoDBAtlasVectorSearch from a
	* list of documents. It first converts the documents to vectors and then
	* adds them to the MongoDB collection.
	* @param docs List of documents to be converted to vectors.
	* @param embeddings Embeddings to be used for conversion.
	* @param dbConfig Database configuration for MongoDB Atlas.
	* @returns Promise that resolves to a new instance of MongoDBAtlasVectorSearch.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs, { ids: dbConfig.ids });
		return instance;
	}
	/**
	* Static method to fix the precision of the array that ensures that
	* every number in this array is always float when casted to other types.
	* This is needed since MongoDB Atlas Vector Search does not cast integer
	* inside vector search to float automatically.
	* This method shall introduce a hint of error but should be safe to use
	* since introduced error is very small, only applies to integer numbers
	* returned by embeddings, and most embeddings shall not have precision
	* as high as 15 decimal places.
	* @param array Array of number to be fixed.
	* @returns
	*/
	static fixArrayPrecision(array) {
		return array.map((value) => {
			if (Number.isInteger(value)) return value + 1e-15;
			return value;
		});
	}
};

//#endregion
exports.MongoDBAtlasVectorSearch = MongoDBAtlasVectorSearch;
//# sourceMappingURL=vectorstores.cjs.map