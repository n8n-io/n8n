const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __getzep_zep_js = require_rolldown_runtime.__toESM(require("@getzep/zep-js"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_testing = require_rolldown_runtime.__toESM(require("@langchain/core/utils/testing"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));

//#region src/vectorstores/zep.ts
var zep_exports = {};
require_rolldown_runtime.__export(zep_exports, { ZepVectorStore: () => ZepVectorStore });
/**
* ZepVectorStore is a VectorStore implementation that uses the Zep long-term memory store as a backend.
*
* If the collection does not exist, it will be created automatically.
*
* Requires `zep-js` to be installed:
* ```bash
* npm install @getzep/zep-js
* ```
*
* @property {ZepClient} client - The ZepClient instance used to interact with Zep's API.
* @property {Promise<void>} initPromise - A promise that resolves when the collection is initialized.
* @property {DocumentCollection} collection - The Zep document collection.
*/
var ZepVectorStore = class ZepVectorStore extends __langchain_core_vectorstores.VectorStore {
	client;
	collection;
	initPromise;
	autoEmbed = false;
	constructor(embeddings, args) {
		super(embeddings, args);
		this.embeddings = embeddings;
		if (this.embeddings instanceof __langchain_core_utils_testing.FakeEmbeddings) this.autoEmbed = true;
		this.initPromise = this.initCollection(args).catch((err) => {
			console.error("Error initializing collection:", err);
			throw err;
		});
	}
	/**
	* Initializes the document collection. If the collection does not exist, it creates a new one.
	*
	* @param {IZepConfig} args - The configuration object for the Zep API.
	*/
	async initCollection(args) {
		this.client = await __getzep_zep_js.ZepClient.init(args.apiUrl, args.apiKey);
		try {
			this.collection = await this.client.document.getCollection(args.collectionName);
			if (!this.collection.is_auto_embedded && this.autoEmbed) throw new Error(`You can't pass in FakeEmbeddings when collection ${args.collectionName} 
 is not set to auto-embed.`);
		} catch (err) {
			if (err instanceof Error) if (err instanceof __getzep_zep_js.NotFoundError || err.name === "NotFoundError") await this.createCollection(args);
			else throw err;
		}
	}
	/**
	* Creates a new document collection.
	*
	* @param {IZepConfig} args - The configuration object for the Zep API.
	*/
	async createCollection(args) {
		if (!args.embeddingDimensions) throw new Error(`Collection ${args.collectionName} not found. 
 You can create a new Collection by providing embeddingDimensions.`);
		this.collection = await this.client.document.addCollection({
			name: args.collectionName,
			description: args.description,
			metadata: args.metadata,
			embeddingDimensions: args.embeddingDimensions,
			isAutoEmbedded: this.autoEmbed
		});
		console.info("Created new collection:", args.collectionName);
	}
	/**
	* Adds vectors and corresponding documents to the collection.
	*
	* @param {number[][]} vectors - The vectors to add.
	* @param {Document[]} documents - The corresponding documents to add.
	* @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
	*/
	async addVectors(vectors, documents) {
		if (!this.autoEmbed && vectors.length === 0) throw new Error(`Vectors must be provided if autoEmbed is false`);
		if (!this.autoEmbed && vectors.length !== documents.length) throw new Error(`Vectors and documents must have the same length`);
		const docs = [];
		for (let i = 0; i < documents.length; i += 1) {
			const doc = {
				content: documents[i].pageContent,
				metadata: documents[i].metadata,
				embedding: vectors.length > 0 ? vectors[i] : void 0
			};
			docs.push(doc);
		}
		await this.initPromise;
		return await this.collection.addDocuments(docs);
	}
	/**
	* Adds documents to the collection. The documents are first embedded into vectors
	* using the provided embedding model.
	*
	* @param {Document[]} documents - The documents to add.
	* @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		let vectors = [];
		if (!this.autoEmbed) vectors = await this.embeddings.embedDocuments(texts);
		return this.addVectors(vectors, documents);
	}
	_vectorstoreType() {
		return "zep";
	}
	/**
	* Deletes documents from the collection.
	*
	* @param {IZepDeleteParams} params - The list of Zep document UUIDs to delete.
	* @returns {Promise<void>}
	*/
	async delete(params) {
		await this.initPromise;
		for (const uuid of params.uuids) await this.collection.deleteDocument(uuid);
	}
	/**
	* Performs a similarity search in the collection and returns the results with their scores.
	*
	* @param {number[]} query - The query vector.
	* @param {number} k - The number of results to return.
	* @param {Record<string, unknown>} filter - The filter to apply to the search. Zep only supports Record<string, unknown> as filter.
	* @returns {Promise<[Document, number][]>} - A promise that resolves with the search results and their scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		await this.initPromise;
		const results = await this.collection.search({
			embedding: new Float32Array(query),
			metadata: assignMetadata(filter)
		}, k);
		return zepDocsToDocumentsAndScore(results);
	}
	async _similaritySearchWithScore(query, k, filter) {
		await this.initPromise;
		const results = await this.collection.search({
			text: query,
			metadata: assignMetadata(filter)
		}, k);
		return zepDocsToDocumentsAndScore(results);
	}
	async similaritySearchWithScore(query, k = 4, filter = void 0, _callbacks = void 0) {
		if (this.autoEmbed) return this._similaritySearchWithScore(query, k, filter);
		else return this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, filter);
	}
	/**
	* Performs a similarity search on the Zep collection.
	*
	* @param {string} query - The query string to search for.
	* @param {number} [k=4] - The number of results to return. Defaults to 4.
	* @param {this["FilterType"] | undefined} [filter=undefined] - An optional set of JSONPath filters to apply to the search.
	* @param {Callbacks | undefined} [_callbacks=undefined] - Optional callbacks. Currently not implemented.
	* @returns {Promise<Document[]>} - A promise that resolves to an array of Documents that are similar to the query.
	*
	* @async
	*/
	async similaritySearch(query, k = 4, filter = void 0, _callbacks = void 0) {
		await this.initPromise;
		let results;
		if (this.autoEmbed) {
			const zepResults = await this.collection.search({
				text: query,
				metadata: assignMetadata(filter)
			}, k);
			results = zepDocsToDocumentsAndScore(zepResults);
		} else results = await this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, assignMetadata(filter));
		return results.map((result) => result[0]);
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND diversity
	* among selected documents.
	*
	* @param {string} query - Text to look up documents similar to.
	* @param options
	* @param {number} options.k - Number of documents to return.
	* @param {number} options.fetchK=20- Number of documents to fetch before passing to the MMR algorithm.
	* @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
	*                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
	* @param {Record<string, any>} options.filter - Optional Zep JSONPath query to pre-filter on document metadata field
	*
	* @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const { k, fetchK = 20, lambda = .5, filter } = options;
		let queryEmbedding;
		let zepResults;
		if (!this.autoEmbed) {
			queryEmbedding = await this.embeddings.embedQuery(query);
			zepResults = await this.collection.search({
				embedding: new Float32Array(queryEmbedding),
				metadata: assignMetadata(filter)
			}, fetchK);
		} else {
			let queryEmbeddingArray;
			[zepResults, queryEmbeddingArray] = await this.collection.searchReturnQueryVector({
				text: query,
				metadata: assignMetadata(filter)
			}, fetchK);
			queryEmbedding = Array.from(queryEmbeddingArray);
		}
		const results = zepDocsToDocumentsAndScore(zepResults);
		const embeddingList = zepResults.map((doc) => Array.from(doc.embedding ? doc.embedding : []));
		const mmrIndexes = (0, __langchain_core_utils_math.maximalMarginalRelevance)(queryEmbedding, embeddingList, lambda, k);
		return mmrIndexes.filter((idx) => idx !== -1).map((idx) => results[idx][0]);
	}
	/**
	* Creates a new ZepVectorStore instance from an array of texts. Each text is converted into a Document and added to the collection.
	*
	* @param {string[]} texts - The texts to convert into Documents.
	* @param {object[] | object} metadatas - The metadata to associate with each Document. If an array is provided, each element is associated with the corresponding Document. If an object is provided, it is associated with all Documents.
	* @param {Embeddings} embeddings - The embeddings to use for vectorizing the texts.
	* @param {IZepConfig} zepConfig - The configuration object for the Zep API.
	* @returns {Promise<ZepVectorStore>} - A promise that resolves with the new ZepVectorStore instance.
	*/
	static async fromTexts(texts, metadatas, embeddings, zepConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return ZepVectorStore.fromDocuments(docs, embeddings, zepConfig);
	}
	/**
	* Creates a new ZepVectorStore instance from an array of Documents. Each Document is added to a Zep collection.
	*
	* @param {Document[]} docs - The Documents to add.
	* @param {Embeddings} embeddings - The embeddings to use for vectorizing the Document contents.
	* @param {IZepConfig} zepConfig - The configuration object for the Zep API.
	* @returns {Promise<ZepVectorStore>} - A promise that resolves with the new ZepVectorStore instance.
	*/
	static async fromDocuments(docs, embeddings, zepConfig) {
		const instance = new this(embeddings, zepConfig);
		await instance.initPromise;
		await instance.addDocuments(docs);
		return instance;
	}
};
function zepDocsToDocumentsAndScore(results) {
	return results.map((d) => [new __langchain_core_documents.Document({
		pageContent: d.content,
		metadata: d.metadata
	}), d.score ? d.score : 0]);
}
function assignMetadata(value) {
	if (typeof value === "object" && value !== null) return value;
	if (value !== void 0) console.warn("Metadata filters must be an object, Record, or undefined.");
	return void 0;
}

//#endregion
exports.ZepVectorStore = ZepVectorStore;
Object.defineProperty(exports, 'zep_exports', {
  enumerable: true,
  get: function () {
    return zep_exports;
  }
});
//# sourceMappingURL=zep.cjs.map