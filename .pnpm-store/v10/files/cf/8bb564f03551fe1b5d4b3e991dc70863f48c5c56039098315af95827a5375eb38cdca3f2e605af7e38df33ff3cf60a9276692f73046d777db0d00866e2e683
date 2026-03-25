import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { makeFunctionReference } from "convex/server";

//#region src/vectorstores/convex.ts
var convex_exports = {};
__export(convex_exports, { ConvexVectorStore: () => ConvexVectorStore });
/**
* Class that is a wrapper around Convex storage and vector search. It is used
* to insert embeddings in Convex documents with a vector search index,
* and perform a vector search on them.
*
* ConvexVectorStore does NOT implement maxMarginalRelevanceSearch.
*/
var ConvexVectorStore = class ConvexVectorStore extends VectorStore {
	ctx;
	table;
	index;
	textField;
	embeddingField;
	metadataField;
	insert;
	get;
	_vectorstoreType() {
		return "convex";
	}
	constructor(embeddings, config) {
		super(embeddings, config);
		this.ctx = config.ctx;
		this.table = config.table ?? "documents";
		this.index = config.index ?? "byEmbedding";
		this.textField = config.textField ?? "text";
		this.embeddingField = config.embeddingField ?? "embedding";
		this.metadataField = config.metadataField ?? "metadata";
		this.insert = config.insert ?? makeFunctionReference("langchain/db:insert");
		this.get = config.get ?? makeFunctionReference("langchain/db:get");
	}
	/**
	* Add vectors and their corresponding documents to the Convex table.
	* @param vectors Vectors to be added.
	* @param documents Corresponding documents to be added.
	* @returns Promise that resolves when the vectors and documents have been added.
	*/
	async addVectors(vectors, documents) {
		const convexDocuments = vectors.map((embedding, idx) => ({
			[this.textField]: documents[idx].pageContent,
			[this.embeddingField]: embedding,
			[this.metadataField]: documents[idx].metadata
		}));
		const PAGE_SIZE = 16;
		for (let i = 0; i < convexDocuments.length; i += PAGE_SIZE) await Promise.all(convexDocuments.slice(i, i + PAGE_SIZE).map((document) => this.ctx.runMutation(this.insert, {
			table: this.table,
			document
		})));
	}
	/**
	* Add documents to the Convex table. It first converts
	* the documents to vectors using the embeddings and then calls the
	* addVectors method.
	* @param documents Documents to be added.
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Similarity search on the vectors stored in the
	* Convex table. It returns a list of documents and their
	* corresponding similarity scores.
	* @param query Query vector for the similarity search.
	* @param k Number of nearest neighbors to return.
	* @param filter Optional filter to be applied.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const idsAndScores = await this.ctx.vectorSearch(this.table, this.index, {
			vector: query,
			limit: k,
			filter: filter?.filter
		});
		const documents = await Promise.all(idsAndScores.map(({ _id }) => this.ctx.runQuery(this.get, { id: _id })));
		return documents.map(({ [this.textField]: text, [this.embeddingField]: embedding, [this.metadataField]: metadata }, idx) => [new Document({
			pageContent: text,
			metadata: {
				...metadata,
				...filter?.includeEmbeddings ? { embedding } : null
			}
		}), idsAndScores[idx]._score]);
	}
	/**
	* Static method to create an instance of ConvexVectorStore from a
	* list of texts. It first converts the texts to vectors and then adds
	* them to the Convex table.
	* @param texts List of texts to be converted to vectors.
	* @param metadatas Metadata for the texts.
	* @param embeddings Embeddings to be used for conversion.
	* @param dbConfig Database configuration for Convex.
	* @returns Promise that resolves to a new instance of ConvexVectorStore.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = texts.map((text, i) => new Document({
			pageContent: text,
			metadata: Array.isArray(metadatas) ? metadatas[i] : metadatas
		}));
		return ConvexVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create an instance of ConvexVectorStore from a
	* list of documents. It first converts the documents to vectors and then
	* adds them to the Convex table.
	* @param docs List of documents to be converted to vectors.
	* @param embeddings Embeddings to be used for conversion.
	* @param dbConfig Database configuration for Convex.
	* @returns Promise that resolves to a new instance of ConvexVectorStore.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
export { ConvexVectorStore, convex_exports };
//# sourceMappingURL=convex.js.map