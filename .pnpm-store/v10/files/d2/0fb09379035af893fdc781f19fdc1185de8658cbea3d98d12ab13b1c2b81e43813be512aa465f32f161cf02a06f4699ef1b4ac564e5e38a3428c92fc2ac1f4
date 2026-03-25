const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __getzep_zep_cloud = require_rolldown_runtime.__toESM(require("@getzep/zep-cloud"));
const __getzep_zep_cloud_api = require_rolldown_runtime.__toESM(require("@getzep/zep-cloud/api"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_testing = require_rolldown_runtime.__toESM(require("@langchain/core/utils/testing"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));

//#region src/vectorstores/zep_cloud.ts
var zep_cloud_exports = {};
require_rolldown_runtime.__export(zep_cloud_exports, { ZepCloudVectorStore: () => ZepCloudVectorStore });
function zepDocsToDocumentsAndScore(results) {
	return results.map((d) => [new __langchain_core_documents.Document({
		pageContent: d.content ?? "",
		metadata: d.metadata
	}), d.score ? d.score : 0]);
}
function assignMetadata(value) {
	if (typeof value === "object" && value !== null) return value;
	if (value !== void 0) console.warn("Metadata filters must be an object, Record, or undefined.");
	return void 0;
}
/**
* ZepCloudVectorStore is a VectorStore implementation
* that uses the Zep long-term memory store as a backend.
*
* If the collection does not exist, it will be created automatically.
*
* Requires `@getzep/zep-cloud` to be installed:
*
*
* @property {ZepClient} client - The ZepClient instance used to interact with Zep's API.
* @property {Promise<void>} initPromise - A promise that resolves
* when the collection is initialized.
*/
var ZepCloudVectorStore = class ZepCloudVectorStore extends __langchain_core_vectorstores.VectorStore {
	client;
	collectionName;
	initPromise;
	constructor(embeddings, args) {
		super(embeddings, args);
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
		if (args.client) this.client = args.client;
		else this.client = new __getzep_zep_cloud.ZepClient({ apiKey: args.apiKey });
		try {
			this.collectionName = args.collectionName;
			await this.client.document.getCollection(this.collectionName);
		} catch (err) {
			if (err instanceof Error) if (err instanceof __getzep_zep_cloud_api.NotFoundError || err.name === "NotFoundError") await this.createCollection(args);
			else throw err;
		}
	}
	/**
	* Creates a new document collection.
	*
	* @param {IZepConfig} args - The configuration object for the Zep API.
	*/
	async createCollection(args) {
		await this.client.document.addCollection(args.collectionName, {
			description: args.description,
			metadata: args.metadata
		});
	}
	async addVectors() {
		throw new Error("Adding vectors is not supported in Zep Cloud.");
	}
	/**
	* Adds documents to the collection. The documents are first embedded into vectors
	* using the provided embedding model.
	*
	* @param {Document[]} documents - The documents to add.
	* @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
	*/
	async addDocuments(documents) {
		const docs = [];
		for (let i = 0; i < documents.length; i += 1) {
			const doc = {
				content: documents[i].pageContent,
				metadata: documents[i].metadata
			};
			docs.push(doc);
		}
		await this.initPromise;
		return this.client.document.addDocuments(this.collectionName, docs);
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
		for await (const uuid of params.uuids) await this.client.document.deleteDocument(this.collectionName, uuid);
	}
	async similaritySearchVectorWithScore() {
		throw new Error("Unsupported in Zep Cloud.");
	}
	async _similaritySearchWithScore(query, k, filter) {
		await this.initPromise;
		const { results } = await this.client.document.search(this.collectionName, {
			text: query,
			metadata: assignMetadata(filter),
			limit: k
		});
		return zepDocsToDocumentsAndScore(results);
	}
	async similaritySearchWithScore(query, k = 4, filter = void 0, _callbacks = void 0) {
		return this._similaritySearchWithScore(query, k, filter);
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
		const { results: zepResults } = await this.client.document.search(this.collectionName, {
			text: query,
			metadata: assignMetadata(filter),
			limit: k
		});
		const results = zepDocsToDocumentsAndScore(zepResults);
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
		const r = await this.client.document.search(this.collectionName, {
			text: query,
			metadata: assignMetadata(filter),
			limit: fetchK
		});
		const queryEmbedding = Array.from(r.queryVector);
		const results = zepDocsToDocumentsAndScore(r.results);
		const embeddingList = r.results.map((doc) => Array.from(doc.embedding ? doc.embedding : []));
		const mmrIndexes = (0, __langchain_core_utils_math.maximalMarginalRelevance)(queryEmbedding, embeddingList, lambda, k);
		return mmrIndexes.filter((idx) => idx !== -1).map((idx) => results[idx][0]);
	}
	static async init(zepConfig) {
		const instance = new this(new __langchain_core_utils_testing.FakeEmbeddings(), zepConfig);
		await instance.initPromise;
		return instance;
	}
	/**
	* Creates a new ZepVectorStore instance from an array of texts. Each text is converted into a Document and added to the collection.
	*
	* @param {string[]} texts - The texts to convert into Documents.
	* @param {object[] | object} metadatas - The metadata to associate with each Document.
	* If an array is provided, each element is associated with the corresponding Document.
	* If an object is provided, it is associated with all Documents.
	* @param {Embeddings} embeddings - Pass FakeEmbeddings, Zep Cloud will handle text embedding for you.
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
		return ZepCloudVectorStore.fromDocuments(docs, embeddings, zepConfig);
	}
	/**
	* Creates a new ZepVectorStore instance from an array of Documents. Each Document is added to a Zep collection.
	*
	* @param {Document[]} docs - The Documents to add.
	* @param {Embeddings} embeddings - Pass FakeEmbeddings, Zep Cloud will handle text embedding for you.
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

//#endregion
exports.ZepCloudVectorStore = ZepCloudVectorStore;
Object.defineProperty(exports, 'zep_cloud_exports', {
  enumerable: true,
  get: function () {
    return zep_cloud_exports;
  }
});
//# sourceMappingURL=zep_cloud.cjs.map