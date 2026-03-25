import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { Collection } from "@rockset/client/dist/codegen/api.js";

//#region src/vectorstores/rockset.ts
var rockset_exports = {};
__export(rockset_exports, {
	RocksetStore: () => RocksetStore,
	RocksetStoreDestroyedError: () => RocksetStoreDestroyedError,
	RocksetStoreError: () => RocksetStoreError,
	SimilarityMetric: () => SimilarityMetric
});
/**
* Generic Rockset vector storage error
*/
var RocksetStoreError = class extends Error {
	/**
	* Constructs a RocksetStoreError
	* @param message   The error message
	*/
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
	}
};
/**
* Error that is thrown when a RocksetStore function is called
* after `destroy()` is called (meaning the collection would be
* deleted).
*/
var RocksetStoreDestroyedError = class extends RocksetStoreError {
	constructor() {
		super("The Rockset store has been destroyed");
		this.name = this.constructor.name;
	}
};
/**
* Functions to measure vector distance/similarity by.
* See https://rockset.com/docs/vector-functions/#vector-distance-functions
* @enum SimilarityMetric
*/
const SimilarityMetric = {
	CosineSimilarity: "COSINE_SIM",
	EuclideanDistance: "EUCLIDEAN_DIST",
	DotProduct: "DOT_PRODUCT"
};
/**
* Exposes Rockset's vector store/search functionality
*/
var RocksetStore = class RocksetStore extends VectorStore {
	client;
	collectionName;
	workspaceName;
	textKey;
	embeddingKey;
	filter;
	_similarityMetric;
	similarityOrder;
	destroyed;
	/**
	* Gets a string representation of the type of this VectorStore
	* @returns {"rockset"}
	*/
	_vectorstoreType() {
		return "rockset";
	}
	/**
	* Constructs a new RocksetStore
	* @param {Embeddings} embeddings  Object used to embed queries and
	*                                 page content
	* @param {RocksetLibArgs} args
	*/
	constructor(embeddings, args) {
		super(embeddings, args);
		this.embeddings = embeddings;
		this.client = args.client;
		this.collectionName = args.collectionName;
		this.workspaceName = args.workspaceName ?? "commons";
		this.textKey = args.textKey ?? "text";
		this.embeddingKey = args.embeddingKey ?? "embedding";
		this.filter = args.filter;
		this.similarityMetric = args.similarityMetric ?? SimilarityMetric.CosineSimilarity;
		this.setSimilarityOrder();
	}
	/**
	* Sets the object's similarity order based on what
	* SimilarityMetric is being used
	*/
	setSimilarityOrder() {
		this.checkIfDestroyed();
		this.similarityOrder = this.similarityMetric === SimilarityMetric.EuclideanDistance ? "ASC" : "DESC";
	}
	/**
	* Embeds and adds Documents to the store.
	* @param {Documents[]} documents  The documents to store
	* @returns {Promise<string[]?>}   The _id's of the documents added
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return await this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Adds vectors to the store given their corresponding Documents
	* @param {number[][]} vectors   The vectors to store
	* @param {Document[]} documents The Documents they represent
	* @return {Promise<string[]?>}  The _id's of the added documents
	*/
	async addVectors(vectors, documents) {
		this.checkIfDestroyed();
		const rocksetDocs = [];
		for (let i = 0; i < documents.length; i += 1) {
			const currDoc = documents[i];
			const currVector = vectors[i];
			rocksetDocs.push({
				[this.textKey]: currDoc.pageContent,
				[this.embeddingKey]: currVector,
				...currDoc.metadata
			});
		}
		return (await this.client.documents.addDocuments(this.workspaceName, this.collectionName, { data: rocksetDocs })).data?.map((docStatus) => docStatus._id || "");
	}
	/**
	* Deletes Rockset documements given their _id's
	* @param {string[]} ids  The IDS to remove documents with
	*/
	async delete(ids) {
		this.checkIfDestroyed();
		await this.client.documents.deleteDocuments(this.workspaceName, this.collectionName, { data: ids.map((id) => ({ _id: id })) });
	}
	/**
	* Gets the most relevant documents to a query along
	* with their similarity score. The returned documents
	* are ordered by similarity (most similar at the first
	* index)
	* @param {number[]} query  The embedded query to search
	*                          the store by
	* @param {number} k        The number of documents to retreive
	* @param {string?} filter  The SQL `WHERE` clause to filter by
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		this.checkIfDestroyed();
		if (filter && this.filter) throw new RocksetStoreError("cannot provide both `filter` and `this.filter`");
		const similarityKey = "similarity";
		const _filter = filter ?? this.filter;
		return (await this.client.queries.query({ sql: {
			query: `
          SELECT
            * EXCEPT("${this.embeddingKey}"),
            "${this.textKey}",
            ${this.similarityMetric}(:query, "${this.embeddingKey}") AS "${similarityKey}"
          FROM 
            "${this.workspaceName}"."${this.collectionName}"
          ${_filter ? `WHERE ${_filter}` : ""}
          ORDER BY
            "${similarityKey}" ${this.similarityOrder}
          LIMIT
            ${k}
        `,
			parameters: [{
				name: "query",
				type: "",
				value: `[${query.toString()}]`
			}]
		} })).results?.map((rocksetDoc) => [new Document({
			pageContent: rocksetDoc[this.textKey],
			metadata: (({ [this.textKey]: t, [similarityKey]: s,...rocksetDoc$1 }) => rocksetDoc$1)(rocksetDoc)
		}), rocksetDoc[similarityKey]]) ?? [];
	}
	/**
	* Constructs and returns a RocksetStore object given texts to store.
	* @param {string[]} texts               The texts to store
	* @param {object[] | object} metadatas  The metadatas that correspond
	*                                       to @param texts
	* @param {Embeddings} embeddings        The object used to embed queries
	*                                       and page content
	* @param {RocksetLibArgs} dbConfig      The options to be passed into the
	*                                       RocksetStore constructor
	* @returns {RocksetStore}
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return RocksetStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Constructs, adds docs to, and returns a RocksetStore object
	* @param {Document[]} docs          The Documents to store
	* @param {Embeddings} embeddings    The object used to embed queries
	*                                   and page content
	* @param {RocksetLibArgs} dbConfig  The options to be passed into the
	*                                   RocksetStore constructor
	* @returns {RocksetStore}
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const args = {
			...dbConfig,
			textKey: dbConfig.textKey ?? "text"
		};
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Checks if a Rockset collection exists.
	* @param {RocksetLibArgs} dbConfig  The object containing the collection
	*                                   and workspace names
	* @return {boolean}                 whether the collection exists
	*/
	static async collectionExists(dbConfig) {
		try {
			await dbConfig.client.collections.getCollection(dbConfig.workspaceName ?? "commons", dbConfig.collectionName);
		} catch (err) {
			if (err.message_key === "COLLECTION_DOES_NOT_EXIST") return false;
			throw err;
		}
		return true;
	}
	/**
	* Checks whether a Rockset collection is ready to be queried.
	* @param {RocksetLibArgs} dbConfig  The object containing the collection
	*                                   name and workspace
	* @return {boolean}                 whether the collection is ready
	*/
	static async collectionReady(dbConfig) {
		return (await dbConfig.client.collections.getCollection(dbConfig.workspaceName ?? "commons", dbConfig.collectionName)).data?.status === Collection.StatusEnum.READY;
	}
	/**
	* Deletes the collection this RocksetStore uses
	* @param {boolean?} waitUntilDeletion  Whether to sleep until the
	*                                      collection is ready to be
	*                                      queried
	*/
	async destroy(waitUntilDeletion) {
		await this.client.collections.deleteCollection(this.workspaceName, this.collectionName);
		this.destroyed = true;
		if (waitUntilDeletion) while (await RocksetStore.collectionExists({
			collectionName: this.collectionName,
			client: this.client
		}));
	}
	/**
	* Checks if this RocksetStore has been destroyed.
	* @throws {RocksetStoreDestroyederror} if it has.
	*/
	checkIfDestroyed() {
		if (this.destroyed) throw new RocksetStoreDestroyedError();
	}
	/**
	* Creates a new Rockset collection and returns a RocksetStore that
	* uses it
	* @param {Embeddings} embeddings    Object used to embed queries and
	*                                   page content
	* @param {RocksetLibArgs} dbConfig  The options to be passed into the
	*                                   RocksetStore constructor
	* @param {CreateCollectionRequest?} collectionOptions  The arguments to sent with the
	*                                                      HTTP request when creating the
	*                                                      collection. Setting a field mapping
	*                                                      that `VECTOR_ENFORCE`s is recommended
	*                                                      when using this function. See
	*                                                      https://rockset.com/docs/vector-functions/#vector_enforce
	* @returns {RocsketStore}
	*/
	static async withNewCollection(embeddings, dbConfig, collectionOptions) {
		if (collectionOptions?.name && dbConfig.collectionName !== collectionOptions?.name) throw new RocksetStoreError("`dbConfig.name` and `collectionOptions.name` do not match");
		await dbConfig.client.collections.createCollection(dbConfig.workspaceName ?? "commons", collectionOptions || { name: dbConfig.collectionName });
		while (!await this.collectionExists(dbConfig) || !await this.collectionReady(dbConfig));
		return new this(embeddings, dbConfig);
	}
	get similarityMetric() {
		return this._similarityMetric;
	}
	set similarityMetric(metric) {
		this._similarityMetric = metric;
		this.setSimilarityOrder();
	}
};

//#endregion
export { RocksetStore, RocksetStoreDestroyedError, RocksetStoreError, SimilarityMetric, rockset_exports };
//# sourceMappingURL=rockset.js.map