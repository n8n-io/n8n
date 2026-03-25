const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const couchbase = require_rolldown_runtime.__toESM(require("couchbase"));

//#region src/vectorstores/couchbase_search.ts
var couchbase_search_exports = {};
require_rolldown_runtime.__export(couchbase_search_exports, { CouchbaseSearchVectorStore: () => CouchbaseSearchVectorStore });
/**
* Class for interacting with the Couchbase database. It extends the
* VectorStore class and provides methods for adding vectors and
* documents, and searching for similar vectors.
* Initiate the class using initialize() method.
*/
var CouchbaseSearchVectorStore = class CouchbaseSearchVectorStore extends __langchain_core_vectorstores.VectorStore {
	metadataKey = "metadata";
	defaultTextKey = "text";
	defaultScopedIndex = true;
	defaultEmbeddingKey = "embedding";
	cluster;
	_bucket;
	_scope;
	_collection;
	bucketName;
	scopeName;
	collectionName;
	indexName;
	textKey = this.defaultTextKey;
	embeddingKey = this.defaultEmbeddingKey;
	scopedIndex;
	/**
	* The private constructor used to provide embedding to parent class.
	* Initialize the class using static initialize() method
	* @param embedding - object to generate embedding
	* @param config -  the fields required to initialize a vector store
	*/
	constructor(embedding, config) {
		super(embedding, config);
	}
	/**
	* initialize class for interacting with the Couchbase database.
	* It extends the VectorStore class and provides methods
	* for adding vectors and documents, and searching for similar vectors.
	* This also verifies the params
	*
	* @param embeddings - object to generate embedding
	* @param config - the fields required to initialize a vector store
	*/
	static async initialize(embeddings, config) {
		const store = new CouchbaseSearchVectorStore(embeddings, config);
		const { cluster, bucketName, scopeName, collectionName, indexName, textKey, embeddingKey, scopedIndex } = config;
		store.cluster = cluster;
		store.bucketName = bucketName;
		store.scopeName = scopeName;
		store.collectionName = collectionName;
		store.indexName = indexName;
		if (textKey) store.textKey = textKey;
		else store.textKey = store.defaultTextKey;
		if (embeddingKey) store.embeddingKey = embeddingKey;
		else store.embeddingKey = store.defaultEmbeddingKey;
		if (scopedIndex !== void 0) store.scopedIndex = scopedIndex;
		else store.scopedIndex = store.defaultScopedIndex;
		try {
			store._bucket = store.cluster.bucket(store.bucketName);
			store._scope = store._bucket.scope(store.scopeName);
			store._collection = store._scope.collection(store.collectionName);
		} catch {
			throw new Error("Error connecting to couchbase, Please check connection and credentials");
		}
		try {
			if (!await store.checkBucketExists() || !await store.checkIndexExists() || !await store.checkScopeAndCollectionExists()) throw new Error("Error while initializing vector store");
		} catch (err) {
			throw new Error(`Error while initializing vector store: ${err}`);
		}
		return store;
	}
	/**
	* An asynchrononous method to verify the search indexes.
	* It retrieves all indexes and checks if specified index is present.
	*
	* @throws - If the specified index does not exist in the database.
	*
	* @returns - returns promise true if no error is found
	*/
	async checkIndexExists() {
		if (this.scopedIndex) {
			const allIndexes = await this._scope.searchIndexes().getAllIndexes();
			const indexNames = allIndexes.map((index) => index.name);
			if (!indexNames.includes(this.indexName)) throw new Error(`Index ${this.indexName} does not exist. Please create the index before searching.`);
		} else {
			const allIndexes = await this.cluster.searchIndexes().getAllIndexes();
			const indexNames = allIndexes.map((index) => index.name);
			if (!indexNames.includes(this.indexName)) throw new Error(`Index ${this.indexName} does not exist. Please create the index before searching.`);
		}
		return true;
	}
	/**
	* An asynchronous method to verify the existence of a bucket.
	* It retrieves the bucket using the bucket manager and checks if the specified bucket is present.
	*
	* @throws - If the specified bucket does not exist in the database.
	*
	* @returns - Returns a promise that resolves to true if no error is found, indicating the bucket exists.
	*/
	async checkBucketExists() {
		const bucketManager = this.cluster.buckets();
		try {
			await bucketManager.getBucket(this.bucketName);
			return true;
		} catch {
			throw new Error(`Bucket ${this.bucketName} does not exist. Please create the bucket before searching.`);
		}
	}
	/**
	* An asynchronous method to verify the existence of a scope and a collection within that scope.
	* It retrieves all scopes and collections in the bucket, and checks if the specified scope and collection are present.
	*
	* @throws - If the specified scope does not exist in the bucket, or if the specified collection does not exist in the scope.
	*
	* @returns - Returns a promise that resolves to true if no error is found, indicating the scope and collection exist.
	*/
	async checkScopeAndCollectionExists() {
		const scopeCollectionMap = {};
		const scopes = await this._bucket.collections().getAllScopes();
		for (const scope of scopes) {
			scopeCollectionMap[scope.name] = [];
			for (const collection of scope.collections) scopeCollectionMap[scope.name].push(collection.name);
		}
		if (!Object.keys(scopeCollectionMap).includes(this.scopeName)) throw new Error(`Scope ${this.scopeName} not found in Couchbase bucket ${this.bucketName}`);
		if (!scopeCollectionMap[this.scopeName].includes(this.collectionName)) throw new Error(`Collection ${this.collectionName} not found in scope ${this.scopeName} in Couchbase bucket ${this.bucketName}`);
		return true;
	}
	_vectorstoreType() {
		return "couchbase-search";
	}
	/**
	* Formats couchbase metadata by removing `metadata.` from initials
	* @param fields - all the fields of row
	* @returns - formatted metadata fields
	*/
	formatMetadata = (fields) => {
		const fieldsCopy = { ...fields };
		delete fieldsCopy[this.textKey];
		const metadataFields = {};
		for (const key in fieldsCopy) if (Object.prototype.hasOwnProperty.call(fieldsCopy, key)) {
			const newKey = key.replace(`${this.metadataKey}.`, "");
			metadataFields[newKey] = fieldsCopy[key];
		}
		return metadataFields;
	};
	/**
	* Performs a similarity search on the vectors in the Couchbase database and returns the documents and their corresponding scores.
	*
	* @param queryEmbeddings - Embedding vector to look up documents similar to.
	* @param k - Number of documents to return. Defaults to 4.
	* @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
	* - `fields`: Optional list of fields to include in the
	* metadata of results. Note that these need to be stored in the index.
	* If nothing is specified, defaults to all the fields stored in the index.
	* - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
	*
	* @returns - Promise of list of [document, score] that are the most similar to the query vector.
	*
	* @throws If the search operation fails.
	*/
	async similaritySearchVectorWithScore(queryEmbeddings, k = 4, filter = {}) {
		let { fields } = filter;
		const { searchOptions } = filter;
		if (!fields) fields = ["*"];
		if (!(fields.length === 1 && fields[0] === "*") && !fields.includes(this.textKey)) fields.push(this.textKey);
		const searchRequest = new couchbase.SearchRequest(couchbase.VectorSearch.fromVectorQuery(new couchbase.VectorQuery(this.embeddingKey, queryEmbeddings).numCandidates(k)));
		let searchIterator;
		const docsWithScore = [];
		try {
			if (this.scopedIndex) searchIterator = this._scope.search(this.indexName, searchRequest, {
				limit: k,
				fields,
				raw: searchOptions
			});
			else searchIterator = this.cluster.search(this.indexName, searchRequest, {
				limit: k,
				fields,
				raw: searchOptions
			});
			const searchRows = (await searchIterator).rows;
			for (const row of searchRows) {
				const text = row.fields[this.textKey];
				const metadataFields = this.formatMetadata(row.fields);
				const searchScore = row.score;
				const doc = new __langchain_core_documents.Document({
					pageContent: text,
					metadata: metadataFields
				});
				docsWithScore.push([doc, searchScore]);
			}
		} catch (err) {
			console.log("error received");
			throw new Error(`Search failed with error: ${err}`);
		}
		return docsWithScore;
	}
	/**
	* Return documents that are most similar to the vector embedding.
	*
	* @param queryEmbeddings - Embedding to look up documents similar to.
	* @param k - The number of similar documents to return. Defaults to 4.
	* @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
	* - `fields`: Optional list of fields to include in the
	* metadata of results. Note that these need to be stored in the index.
	* If nothing is specified, defaults to all the fields stored in the index.
	* - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
	*
	* @returns - A promise that resolves to an array of documents that match the similarity search.
	*/
	async similaritySearchByVector(queryEmbeddings, k = 4, filter = {}) {
		const docsWithScore = await this.similaritySearchVectorWithScore(queryEmbeddings, k, filter);
		const docs = [];
		for (const doc of docsWithScore) docs.push(doc[0]);
		return docs;
	}
	/**
	* Return documents that are most similar to the query.
	*
	* @param query - Query to look up for similar documents
	* @param k - The number of similar documents to return. Defaults to 4.
	* @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
	* - `fields`: Optional list of fields to include in the
	* metadata of results. Note that these need to be stored in the index.
	* If nothing is specified, defaults to all the fields stored in the index.
	* - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
	*
	* @returns - Promise of list of documents that are most similar to the query.
	*/
	async similaritySearch(query, k = 4, filter = {}) {
		const queryEmbeddings = await this.embeddings.embedQuery(query);
		const docsWithScore = await this.similaritySearchVectorWithScore(queryEmbeddings, k, filter);
		const docs = [];
		for (const doc of docsWithScore) docs.push(doc[0]);
		return docs;
	}
	/**
	* Return documents that are most similar to the query with their scores.
	*
	* @param query - Query to look up for similar documents
	* @param k - The number of similar documents to return. Defaults to 4.
	* @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
	* - `fields`: Optional list of fields to include in the
	* metadata of results. Note that these need to be stored in the index.
	* If nothing is specified, defaults to all the fields stored in the index.
	* - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
	*
	* @returns - Promise of list of documents that are most similar to the query.
	*/
	async similaritySearchWithScore(query, k = 4, filter = {}) {
		const queryEmbeddings = await this.embeddings.embedQuery(query);
		const docsWithScore = await this.similaritySearchVectorWithScore(queryEmbeddings, k, filter);
		return docsWithScore;
	}
	/**
	* upsert documents asynchronously into a couchbase collection
	* @param documentsToInsert Documents to be inserted into couchbase collection with embeddings, original text and metadata
	* @returns DocIds of the inserted documents
	*/
	async upsertDocuments(documentsToInsert) {
		const upsertDocumentsPromises = documentsToInsert.map((document) => {
			const currentDocumentKey = Object.keys(document)[0];
			return this._collection.upsert(currentDocumentKey, document[currentDocumentKey]).then(() => currentDocumentKey).catch((e) => {
				console.error("error received while upserting document", e);
				throw new Error(`Upsert failed with error: ${e}`);
			});
		});
		try {
			const docIds = await Promise.all(upsertDocumentsPromises);
			const successfulDocIds = [];
			for (const id of docIds) if (id) successfulDocIds.push(id);
			return successfulDocIds;
		} catch (e) {
			console.error("An error occurred with Promise.all at upserting all documents", e);
			throw e;
		}
	}
	/**
	* Add vectors and corresponding documents to a couchbase collection
	* If the document IDs are passed, the existing documents (if any) will be
	* overwritten with the new ones.
	* @param vectors - The vectors to be added to the collection.
	* @param documents - The corresponding documents to be added to the collection.
	* @param options - Optional parameters for adding vectors.
	* This may include the IDs and metadata of the documents to be added. Defaults to an empty object.
	*
	* @returns - A promise that resolves to an array of document IDs that were added to the collection.
	*/
	async addVectors(vectors, documents, options = {}) {
		let ids = options ? options.ids : void 0;
		if (ids === void 0) ids = Array.from({ length: documents.length }, () => (0, uuid.v4)());
		let metadata = options ? options.metadata : void 0;
		if (metadata === void 0) metadata = Array.from({ length: documents.length }, () => ({}));
		const documentsToInsert = ids.map((id, index) => ({ [id]: {
			[this.textKey]: documents[index].pageContent,
			[this.embeddingKey]: vectors[index],
			[this.metadataKey]: metadata[index]
		} }));
		let docIds = [];
		try {
			docIds = await this.upsertDocuments(documentsToInsert);
		} catch (err) {
			console.error("Error while adding vectors", err);
			throw err;
		}
		return docIds;
	}
	/**
	* Run texts through the embeddings and persist in vectorstore.
	* If the document IDs are passed, the existing documents (if any) will be
	* overwritten with the new ones.
	* @param documents - The corresponding documents to be added to the collection.
	* @param options - Optional parameters for adding documents.
	* This may include the IDs and metadata of the documents to be added. Defaults to an empty object.
	*
	* @returns - A promise that resolves to an array of document IDs that were added to the collection.
	*/
	async addDocuments(documents, options = {}) {
		const texts = documents.map(({ pageContent }) => pageContent);
		const metadatas = documents.map((doc) => doc.metadata);
		const optionsWithMetadata = {
			...options,
			metadata: options.metadata ?? metadatas
		};
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, optionsWithMetadata);
	}
	/**
	* Create a new CouchbaseVectorStore from a set of documents.
	* This function will initialize a new store, add the documents to it, and then return the store.
	* @param documents - The documents to be added to the new store.
	* @param embeddings - The embeddings to be used for the documents.
	* @param config - The configuration for the new CouchbaseVectorStore. This includes the options for adding vectors.
	*
	* @returns - A promise that resolves to the new CouchbaseVectorStore that contains the added documents.
	*/
	static async fromDocuments(documents, embeddings, config) {
		const store = await this.initialize(embeddings, config);
		await store.addDocuments(documents, config.addVectorOptions);
		return store;
	}
	/**
	* Create a new CouchbaseVectorStore from a set of texts.
	* This function will convert each text and its corresponding metadata into a Document,
	* initialize a new store, add the documents to it, and then return the store.
	* @param texts - The texts to be converted into Documents and added to the new store.
	* @param metadatas - The metadata for each text. If an array is passed, each text will have its corresponding metadata.
	* If not, all texts will have the same metadata.
	* @param embeddings - The embeddings to be used for the documents.
	* @param config - The configuration for the new CouchbaseVectorStore. This includes the options for adding vectors.
	*
	* @returns - A promise that resolves to the new CouchbaseVectorStore that contains the added documents.
	*/
	static async fromTexts(texts, metadatas, embeddings, config) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return await this.fromDocuments(docs, embeddings, config);
	}
	/**
	* Delete documents asynchronously from the collection.
	* This function will attempt to remove each document in the provided list of IDs from the collection.
	* If an error occurs during the deletion of a document, an error will be thrown with the ID of the document and the error message.
	* @param ids - An array of document IDs to be deleted from the collection.
	*
	* @returns - A promise that resolves when all documents have been attempted to be deleted. If a document could not be deleted, an error is thrown.
	*/
	async delete(ids) {
		const deleteDocumentsPromises = ids.map((id) => this._collection.remove(id).catch((err) => {
			throw new Error(`Error while deleting document - Document Id: ${id}, Error: ${err}`);
		}));
		try {
			await Promise.all(deleteDocumentsPromises);
		} catch (err) {
			throw new Error(`Error while deleting documents, Error: ${err}`);
		}
	}
};

//#endregion
exports.CouchbaseSearchVectorStore = CouchbaseSearchVectorStore;
Object.defineProperty(exports, 'couchbase_search_exports', {
  enumerable: true,
  get: function () {
    return couchbase_search_exports;
  }
});
//# sourceMappingURL=couchbase_search.cjs.map