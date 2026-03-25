import { Document } from "@langchain/core/documents";
import { SaveableVectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/closevector/common.ts
/**
* package closevector is largely based on hnswlib.ts in the current folder with the following exceptions:
* 1. It uses a modified version of hnswlib-node to ensure the generated index can be loaded by closevector_web.ts.
* 2. It adds features to upload and download the index to/from the CDN provided by CloseVector.
*
* For more information, check out https://closevector-docs.getmegaportal.com/
*/
/**
* Class that implements a vector store using Hierarchical Navigable Small
* World (HNSW) graphs. It extends the SaveableVectorStore class and
* provides methods for adding documents and vectors, performing
* similarity searches, and saving and loading the vector store.
*/
var CloseVector = class extends SaveableVectorStore {
	_instance;
	credentials;
	_vectorstoreType() {
		return "closevector";
	}
	constructor(embeddings, args, credentials) {
		super(embeddings, args);
		this.credentials = credentials;
	}
	get instance() {
		if (!this._instance) throw new Error("Vector store not initialised yet. Try calling `addTexts` first.");
		return this._instance;
	}
	set instance(instance) {
		this._instance = instance;
	}
	/**
	* Method to add documents to the vector store. It first converts the
	* documents to vectors using the embeddings, then adds the vectors to the
	* vector store.
	* @param documents The documents to be added to the vector store.
	* @returns A Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		await this.instance.addDocuments(documents);
	}
	/**
	* Method to save the vector store to a directory. It saves the HNSW
	* index, the arguments, and the document store to the directory.
	* @param directory The directory to which to save the vector store. In CloseVector, we use IndexedDB to mock the file system. Therefore, this parameter is can be treated as a key to the contents stored.
	* @returns A Promise that resolves when the vector store has been saved.
	*/
	async save(directory) {
		await this.instance.save(directory);
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
		await this.instance.addVectors(vectors, documents);
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
		const resp = await this.instance.similaritySearchVectorWithScore(query, k, filter ? (x) => filter?.({
			pageContent: x.pageContent,
			metadata: x.metadata || {}
		}) || false : void 0);
		const mapped = resp.map((x) => [new Document({
			pageContent: x[0].pageContent,
			metadata: x[0].metadata || {}
		}), 1 - x[1]]);
		return mapped;
	}
	/**
	* Method to delete the vector store from a directory. It deletes the
	* hnswlib.index file, the docstore.json file, and the args.json file from
	* the directory.
	* @param params An object with a directory property that specifies the directory from which to delete the vector store.
	* @returns A Promise that resolves when the vector store has been deleted.
	*/
	async delete(params) {
		return await this.instance.delete(params);
	}
	static textsToDocuments(texts, metadatas) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return docs;
	}
};

//#endregion
export { CloseVector };
//# sourceMappingURL=common.js.map