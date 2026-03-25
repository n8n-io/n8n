const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_stores_doc_in_memory = require('../stores/doc/in_memory.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const usearch = require_rolldown_runtime.__toESM(require("usearch"));

//#region src/vectorstores/usearch.ts
var usearch_exports = {};
require_rolldown_runtime.__export(usearch_exports, { USearch: () => USearch });
/**
* Class that extends `SaveableVectorStore` and provides methods for
* adding documents and vectors to a `usearch` index, performing
* similarity searches, and saving the index.
*/
var USearch = class extends __langchain_core_vectorstores.SaveableVectorStore {
	_index;
	_mapping;
	docstore;
	args;
	_vectorstoreType() {
		return "usearch";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.args = args;
		this._index = args.index;
		this._mapping = args.mapping ?? {};
		this.embeddings = embeddings;
		this.docstore = args?.docstore ?? new require_stores_doc_in_memory.in_memory_exports.SynchronousInMemoryDocstore();
	}
	/**
	* Method that adds documents to the `usearch` index. It generates
	* embeddings for the documents and adds them to the index.
	* @param documents An array of `Document` instances to be added to the index.
	* @returns A promise that resolves with an array of document IDs.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	get index() {
		if (!this._index) throw new Error("Vector store not initialised yet. Try calling `fromTexts` or `fromDocuments` first.");
		return this._index;
	}
	set index(index) {
		this._index = index;
	}
	/**
	* Method that adds vectors to the `usearch` index. It also updates the
	* mapping between vector IDs and document IDs.
	* @param vectors An array of vectors to be added to the index.
	* @param documents An array of `Document` instances corresponding to the vectors.
	* @returns A promise that resolves with an array of document IDs.
	*/
	async addVectors(vectors, documents) {
		if (vectors.length === 0) return [];
		if (vectors.length !== documents.length) throw new Error(`Vectors and documents must have the same length`);
		const dv = vectors[0].length;
		if (!this._index) this._index = new usearch.Index(dv, usearch.MetricKind.L2sq, usearch.ScalarKind.F32, 16);
		const d = this.index.dimensions();
		if (dv !== d) throw new Error(`Vectors must have the same length as the number of dimensions (${d})`);
		const docstoreSize = this.index.size();
		const documentIds = [];
		for (let i = 0; i < vectors.length; i += 1) {
			const documentId = uuid.v4();
			documentIds.push(documentId);
			const id = Number(docstoreSize) + i;
			this.index.add(BigInt(id), new Float32Array(vectors[i]));
			this._mapping[id] = documentId;
			this.docstore.add({ [documentId]: documents[i] });
		}
		return documentIds;
	}
	/**
	* Method that performs a similarity search in the `usearch` index. It
	* returns the `k` most similar documents to a given query vector, along
	* with their similarity scores.
	* @param query The query vector.
	* @param k The number of most similar documents to return.
	* @returns A promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k) {
		const d = this.index.dimensions();
		if (query.length !== d) throw new Error(`Query vector must have the same length as the number of dimensions (${d})`);
		if (k > this.index.size()) {
			const total = this.index.size();
			console.warn(`k (${k}) is greater than the number of elements in the index (${total}), setting k to ${total}`);
			k = Number(total);
		}
		const result = this.index.search(new Float32Array(query), k);
		const return_list = [];
		for (let i = 0; i < result.keys.length && i < result.distances.length; i += 1) {
			const uuid$1 = this._mapping[Number(result.keys[i])];
			return_list.push([this.docstore.search(uuid$1), result.distances[i]]);
		}
		return return_list;
	}
	/**
	* Method that saves the `usearch` index and the document store to disk.
	* @param directory The directory where the index and document store should be saved.
	* @returns A promise that resolves when the save operation is complete.
	*/
	async save(directory) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		await fs.mkdir(directory, { recursive: true });
		await Promise.all([this.index.save(path.join(directory, "usearch.index")), await fs.writeFile(path.join(directory, "docstore.json"), JSON.stringify([Array.from(this.docstore._docs.entries()), this._mapping]))]);
	}
	/**
	* Static method that creates a new `USearch` instance from a list of
	* texts. It generates embeddings for the texts and adds them to the
	* `usearch` index.
	* @param texts An array of texts to be added to the index.
	* @param metadatas Metadata associated with the texts.
	* @param embeddings An instance of `Embeddings` used to generate embeddings for the texts.
	* @param dbConfig Optional configuration for the document store.
	* @returns A promise that resolves with a new `USearch` instance.
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
	* Static method that creates a new `USearch` instance from a list of
	* documents. It generates embeddings for the documents and adds them to
	* the `usearch` index.
	* @param docs An array of `Document` instances to be added to the index.
	* @param embeddings An instance of `Embeddings` used to generate embeddings for the documents.
	* @param dbConfig Optional configuration for the document store.
	* @returns A promise that resolves with a new `USearch` instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const args = { docstore: dbConfig?.docstore };
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
exports.USearch = USearch;
Object.defineProperty(exports, 'usearch_exports', {
  enumerable: true,
  get: function () {
    return usearch_exports;
  }
});
//# sourceMappingURL=usearch.cjs.map