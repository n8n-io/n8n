const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_stores_doc_in_memory = require('../stores/doc/in_memory.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores/hnswlib.ts
var hnswlib_exports = {};
require_rolldown_runtime.__export(hnswlib_exports, { HNSWLib: () => HNSWLib });
/**
* Class that implements a vector store using Hierarchical Navigable Small
* World (HNSW) graphs. It extends the SaveableVectorStore class and
* provides methods for adding documents and vectors, performing
* similarity searches, and saving and loading the vector store.
*/
var HNSWLib = class HNSWLib extends __langchain_core_vectorstores.SaveableVectorStore {
	_index;
	docstore;
	args;
	_vectorstoreType() {
		return "hnswlib";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this._index = args.index;
		this.args = args;
		this.embeddings = embeddings;
		this.docstore = args?.docstore ?? new require_stores_doc_in_memory.in_memory_exports.SynchronousInMemoryDocstore();
	}
	/**
	* Method to add documents to the vector store. It first converts the
	* documents to vectors using the embeddings, then adds the vectors to the
	* vector store.
	* @param documents The documents to be added to the vector store.
	* @returns A Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	static async getHierarchicalNSW(args) {
		const { HierarchicalNSW } = await HNSWLib.imports();
		if (!args.space) throw new Error("hnswlib-node requires a space argument");
		if (args.numDimensions === void 0) throw new Error("hnswlib-node requires a numDimensions argument");
		return new HierarchicalNSW(args.space, args.numDimensions);
	}
	async initIndex(vectors) {
		if (!this._index) {
			if (this.args.numDimensions === void 0) this.args.numDimensions = vectors[0].length;
			this.index = await HNSWLib.getHierarchicalNSW(this.args);
		}
		if (!this.index.getCurrentCount()) this.index.initIndex(vectors.length);
	}
	get index() {
		if (!this._index) throw new Error("Vector store not initialised yet. Try calling `addTexts` first.");
		return this._index;
	}
	set index(index) {
		this._index = index;
	}
	/**
	* Method to add vectors to the vector store. It first initializes the
	* index if it hasn't been initialized yet, then adds the vectors to the
	* index and the documents to the document store.
	* @param vectors The vectors to be added to the vector store.
	* @param documents The documents corresponding to the vectors.
	* @returns A Promise that resolves when the vectors and documents have been added.
	*/
	async addVectors(vectors, documents) {
		if (vectors.length === 0) return;
		await this.initIndex(vectors);
		if (vectors.length !== documents.length) throw new Error(`Vectors and metadatas must have the same length`);
		if (vectors[0].length !== this.args.numDimensions) throw new Error(`Vectors must have the same length as the number of dimensions (${this.args.numDimensions})`);
		const capacity = this.index.getMaxElements();
		const needed = this.index.getCurrentCount() + vectors.length;
		if (needed > capacity) this.index.resizeIndex(needed);
		const docstoreSize = this.index.getCurrentCount();
		const toSave = {};
		for (let i = 0; i < vectors.length; i += 1) {
			this.index.addPoint(vectors[i], docstoreSize + i);
			toSave[docstoreSize + i] = documents[i];
		}
		this.docstore.add(toSave);
	}
	/**
	* Method to perform a similarity search in the vector store using a query
	* vector. It returns the k most similar documents along with their
	* similarity scores. An optional filter function can be provided to
	* filter the documents.
	* @param query The query vector.
	* @param k The number of most similar documents to return.
	* @param filter An optional filter function to filter the documents.
	* @returns A Promise that resolves to an array of tuples, where each tuple contains a document and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		if (this.args.numDimensions && !this._index) await this.initIndex([[]]);
		if (query.length !== this.args.numDimensions) throw new Error(`Query vector must have the same length as the number of dimensions (${this.args.numDimensions})`);
		if (k > this.index.getCurrentCount()) {
			const total = this.index.getCurrentCount();
			console.warn(`k (${k}) is greater than the number of elements in the index (${total}), setting k to ${total}`);
			k = total;
		}
		const filterFunction = (label) => {
			if (!filter) return true;
			const document = this.docstore.search(String(label));
			if (typeof document !== "string") return filter(document);
			return false;
		};
		const result = this.index.searchKnn(query, k, filter ? filterFunction : void 0);
		return result.neighbors.map((docIndex, resultIndex) => [this.docstore.search(String(docIndex)), result.distances[resultIndex]]);
	}
	/**
	* Method to delete the vector store from a directory. It deletes the
	* hnswlib.index file, the docstore.json file, and the args.json file from
	* the directory.
	* @param params An object with a directory property that specifies the directory from which to delete the vector store.
	* @returns A Promise that resolves when the vector store has been deleted.
	*/
	async delete(params) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		try {
			await fs.access(path.join(params.directory, "hnswlib.index"));
		} catch {
			throw new Error(`Directory ${params.directory} does not contain a hnswlib.index file.`);
		}
		await Promise.all([
			await fs.rm(path.join(params.directory, "hnswlib.index"), { force: true }),
			await fs.rm(path.join(params.directory, "docstore.json"), { force: true }),
			await fs.rm(path.join(params.directory, "args.json"), { force: true })
		]);
	}
	/**
	* Method to save the vector store to a directory. It saves the HNSW
	* index, the arguments, and the document store to the directory.
	* @param directory The directory to which to save the vector store.
	* @returns A Promise that resolves when the vector store has been saved.
	*/
	async save(directory) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		await fs.mkdir(directory, { recursive: true });
		await Promise.all([
			this.index.writeIndex(path.join(directory, "hnswlib.index")),
			await fs.writeFile(path.join(directory, "args.json"), JSON.stringify(this.args)),
			await fs.writeFile(path.join(directory, "docstore.json"), JSON.stringify(Array.from(this.docstore._docs.entries())))
		]);
	}
	/**
	* Static method to load a vector store from a directory. It reads the
	* HNSW index, the arguments, and the document store from the directory,
	* then creates a new HNSWLib instance with these values.
	* @param directory The directory from which to load the vector store.
	* @param embeddings The embeddings to be used by the HNSWLib instance.
	* @returns A Promise that resolves to a new HNSWLib instance.
	*/
	static async load(directory, embeddings) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const args = JSON.parse(await fs.readFile(path.join(directory, "args.json"), "utf8"));
		const index = await HNSWLib.getHierarchicalNSW(args);
		const [docstoreFiles] = await Promise.all([fs.readFile(path.join(directory, "docstore.json"), "utf8").then(JSON.parse), index.readIndex(path.join(directory, "hnswlib.index"))]);
		args.docstore = new require_stores_doc_in_memory.in_memory_exports.SynchronousInMemoryDocstore(new Map(docstoreFiles));
		args.index = index;
		return new HNSWLib(embeddings, args);
	}
	/**
	* Static method to create a new HNSWLib instance from texts and metadata.
	* It creates a new Document instance for each text and metadata, then
	* calls the fromDocuments method to create the HNSWLib instance.
	* @param texts The texts to be used to create the documents.
	* @param metadatas The metadata to be used to create the documents.
	* @param embeddings The embeddings to be used by the HNSWLib instance.
	* @param dbConfig An optional configuration object for the document store.
	* @returns A Promise that resolves to a new HNSWLib instance.
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
		return HNSWLib.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new HNSWLib instance from documents. It
	* creates a new HNSWLib instance, adds the documents to it, then returns
	* the instance.
	* @param docs The documents to be added to the HNSWLib instance.
	* @param embeddings The embeddings to be used by the HNSWLib instance.
	* @param dbConfig An optional configuration object for the document store.
	* @returns A Promise that resolves to a new HNSWLib instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const args = {
			docstore: dbConfig?.docstore,
			space: "cosine"
		};
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	static async imports() {
		try {
			const { default: { HierarchicalNSW } } = await import("hnswlib-node");
			return { HierarchicalNSW };
		} catch (err) {
			throw new Error(`Could not import hnswlib-node. Please install hnswlib-node as a dependency with, e.g. \`npm install -S hnswlib-node\`.\n\nError: ${err?.message}`);
		}
	}
};

//#endregion
exports.HNSWLib = HNSWLib;
Object.defineProperty(exports, 'hnswlib_exports', {
  enumerable: true,
  get: function () {
    return hnswlib_exports;
  }
});
//# sourceMappingURL=hnswlib.cjs.map