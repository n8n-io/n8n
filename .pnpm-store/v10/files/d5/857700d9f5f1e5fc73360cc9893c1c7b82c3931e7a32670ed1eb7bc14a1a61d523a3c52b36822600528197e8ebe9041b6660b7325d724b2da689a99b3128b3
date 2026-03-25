const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores/tigris.ts
var tigris_exports = {};
require_rolldown_runtime.__export(tigris_exports, { TigrisVectorStore: () => TigrisVectorStore });
/**
* Class for managing and operating vector search applications with
* Tigris, an open-source Serverless NoSQL Database and Search Platform.
*/
var TigrisVectorStore = class TigrisVectorStore extends __langchain_core_vectorstores.VectorStore {
	index;
	_vectorstoreType() {
		return "tigris";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.embeddings = embeddings;
		this.index = args.index;
	}
	/**
	* Method to add an array of documents to the Tigris database.
	* @param documents An array of Document instances to be added to the Tigris database.
	* @param options Optional parameter that can either be an array of string IDs or an object with a property 'ids' that is an array of string IDs.
	* @returns A Promise that resolves when the documents have been added to the Tigris database.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		await this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method to add vectors to the Tigris database.
	* @param vectors An array of vectors to be added to the Tigris database.
	* @param documents An array of Document instances corresponding to the vectors.
	* @param options Optional parameter that can either be an array of string IDs or an object with a property 'ids' that is an array of string IDs.
	* @returns A Promise that resolves when the vectors have been added to the Tigris database.
	*/
	async addVectors(vectors, documents, options) {
		if (vectors.length === 0) return;
		if (vectors.length !== documents.length) throw new Error(`Vectors and metadatas must have the same length`);
		const ids = Array.isArray(options) ? options : options?.ids;
		const documentIds = ids == null ? documents.map(() => uuid.v4()) : ids;
		await this.index?.addDocumentsWithVectors({
			ids: documentIds,
			embeddings: vectors,
			documents: documents.map(({ metadata, pageContent }) => ({
				content: pageContent,
				metadata
			}))
		});
	}
	/**
	* Method to perform a similarity search in the Tigris database and return
	* the k most similar vectors along with their similarity scores.
	* @param query The query vector.
	* @param k The number of most similar vectors to return.
	* @param filter Optional filter object to apply during the search.
	* @returns A Promise that resolves to an array of tuples, each containing a Document and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const result = await this.index?.similaritySearchVectorWithScore({
			query,
			k,
			filter
		});
		if (!result) return [];
		return result.map(([document, score]) => [new __langchain_core_documents.Document({
			pageContent: document.content,
			metadata: document.metadata
		}), score]);
	}
	/**
	* Static method to create a new instance of TigrisVectorStore from an
	* array of texts.
	* @param texts An array of texts to be converted into Document instances and added to the Tigris database.
	* @param metadatas Either an array of metadata objects or a single metadata object to be associated with the texts.
	* @param embeddings An instance of Embeddings to be used for embedding the texts.
	* @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
	* @returns A Promise that resolves to a new instance of TigrisVectorStore.
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
		return TigrisVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new instance of TigrisVectorStore from an
	* array of Document instances.
	* @param docs An array of Document instances to be added to the Tigris database.
	* @param embeddings An instance of Embeddings to be used for embedding the documents.
	* @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
	* @returns A Promise that resolves to a new instance of TigrisVectorStore.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create a new instance of TigrisVectorStore from an
	* existing index.
	* @param embeddings An instance of Embeddings to be used for embedding the documents.
	* @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
	* @returns A Promise that resolves to a new instance of TigrisVectorStore.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		return instance;
	}
};

//#endregion
exports.TigrisVectorStore = TigrisVectorStore;
Object.defineProperty(exports, 'tigris_exports', {
  enumerable: true,
  get: function () {
    return tigris_exports;
  }
});
//# sourceMappingURL=tigris.cjs.map