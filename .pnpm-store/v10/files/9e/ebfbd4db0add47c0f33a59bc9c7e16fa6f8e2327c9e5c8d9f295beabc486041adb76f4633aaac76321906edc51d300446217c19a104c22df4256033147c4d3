const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores/xata.ts
var xata_exports = {};
require_rolldown_runtime.__export(xata_exports, { XataVectorSearch: () => XataVectorSearch });
/**
* Class for interacting with a Xata database as a VectorStore. Provides
* methods to add documents and vectors to the database, delete entries,
* and perform similarity searches.
*/
var XataVectorSearch = class extends __langchain_core_vectorstores.VectorStore {
	client;
	table;
	_vectorstoreType() {
		return "xata";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.client = args.client;
		this.table = args.table;
	}
	/**
	* Method to add documents to the Xata database. Maps the page content of
	* each document, embeds the documents using the embeddings, and adds the
	* vectors to the database.
	* @param documents Array of documents to be added.
	* @param options Optional object containing an array of ids.
	* @returns Promise resolving to an array of ids of the added documents.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method to add vectors to the Xata database. Maps each vector to a row
	* with the document's content, embedding, and metadata. Creates or
	* replaces these rows in the Xata database.
	* @param vectors Array of vectors to be added.
	* @param documents Array of documents corresponding to the vectors.
	* @param options Optional object containing an array of ids.
	* @returns Promise resolving to an array of ids of the added vectors.
	*/
	async addVectors(vectors, documents, options) {
		const rows = vectors.map((embedding, idx) => ({
			content: documents[idx].pageContent,
			embedding,
			...documents[idx].metadata
		})).map((row, idx) => {
			if (options?.ids) return {
				id: options.ids[idx],
				...row
			};
			return row;
		});
		const res = await this.client.db[this.table].createOrReplace(rows);
		const results = res;
		const returnedIds = results.map((row) => row.id);
		return returnedIds;
	}
	/**
	* Method to delete entries from the Xata database. Deletes the entries
	* with the provided ids.
	* @param params Object containing an array of ids of the entries to be deleted.
	* @returns Promise resolving to void.
	*/
	async delete(params) {
		const { ids } = params;
		await this.client.db[this.table].delete(ids);
	}
	/**
	* Method to perform a similarity search in the Xata database. Returns the
	* k most similar documents along with their scores.
	* @param query Query vector for the similarity search.
	* @param k Number of most similar documents to return.
	* @param filter Optional filter for the search.
	* @returns Promise resolving to an array of tuples, each containing a Document and its score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const { records } = await this.client.db[this.table].vectorSearch("embedding", query, {
			size: k,
			filter
		});
		return records?.map((record) => [new __langchain_core_documents.Document({
			pageContent: record.content,
			metadata: Object.fromEntries(Object.entries(record).filter(([key]) => key !== "content" && key !== "embedding" && key !== "xata" && key !== "id"))
		}), record.xata ? record.xata.score : record.xata_score]) ?? [];
	}
};

//#endregion
exports.XataVectorSearch = XataVectorSearch;
Object.defineProperty(exports, 'xata_exports', {
  enumerable: true,
  get: function () {
    return xata_exports;
  }
});
//# sourceMappingURL=xata.cjs.map