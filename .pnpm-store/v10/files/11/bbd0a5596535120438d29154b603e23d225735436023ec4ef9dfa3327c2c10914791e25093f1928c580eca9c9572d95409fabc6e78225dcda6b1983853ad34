const require_document = require("../../documents/document.cjs");
const require_similarities = require("../ml-distance/similarities.cjs");
const require_vectorstores = require("../../vectorstores.cjs");
//#region src/utils/testing/vectorstores.ts
/**
* Class that extends `VectorStore` to store vectors in memory. Provides
* methods for adding documents, performing similarity searches, and
* creating instances from texts, documents, or an existing index.
*/
var FakeVectorStore = class FakeVectorStore extends require_vectorstores.VectorStore {
	memoryVectors = [];
	similarity;
	_vectorstoreType() {
		return "memory";
	}
	constructor(embeddings, { similarity, ...rest } = {}) {
		super(embeddings, rest);
		this.similarity = similarity ?? require_similarities.cosine;
	}
	/**
	* Method to add documents to the memory vector store. It extracts the
	* text from each document, generates embeddings for them, and adds the
	* resulting vectors to the store.
	* @param documents Array of `Document` instances to be added to the store.
	* @returns Promise that resolves when all documents have been added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Method to add vectors to the memory vector store. It creates
	* `MemoryVector` instances for each vector and document pair and adds
	* them to the store.
	* @param vectors Array of vectors to be added to the store.
	* @param documents Array of `Document` instances corresponding to the vectors.
	* @returns Promise that resolves when all vectors have been added.
	*/
	async addVectors(vectors, documents) {
		const memoryVectors = vectors.map((embedding, idx) => ({
			content: documents[idx].pageContent,
			embedding,
			metadata: documents[idx].metadata
		}));
		this.memoryVectors = this.memoryVectors.concat(memoryVectors);
	}
	/**
	* Method to perform a similarity search in the memory vector store. It
	* calculates the similarity between the query vector and each vector in
	* the store, sorts the results by similarity, and returns the top `k`
	* results along with their scores.
	* @param query Query vector to compare against the vectors in the store.
	* @param k Number of top results to return.
	* @param filter Optional filter function to apply to the vectors before performing the search.
	* @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const filterFunction = (memoryVector) => {
			if (!filter) return true;
			return filter(new require_document.Document({
				metadata: memoryVector.metadata,
				pageContent: memoryVector.content
			}));
		};
		const filteredMemoryVectors = this.memoryVectors.filter(filterFunction);
		return filteredMemoryVectors.map((vector, index) => ({
			similarity: this.similarity(query, vector.embedding),
			index
		})).sort((a, b) => a.similarity > b.similarity ? -1 : 0).slice(0, k).map((search) => [new require_document.Document({
			metadata: filteredMemoryVectors[search.index].metadata,
			pageContent: filteredMemoryVectors[search.index].content
		}), search.similarity]);
	}
	/**
	* Static method to create a `FakeVectorStore` instance from an array of
	* texts. It creates a `Document` for each text and metadata pair, and
	* adds them to the store.
	* @param texts Array of texts to be added to the store.
	* @param metadatas Array or single object of metadata corresponding to the texts.
	* @param embeddings `Embeddings` instance used to generate embeddings for the texts.
	* @param dbConfig Optional `FakeVectorStoreArgs` to configure the `FakeVectorStore` instance.
	* @returns Promise that resolves with a new `FakeVectorStore` instance.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new require_document.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return FakeVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a `FakeVectorStore` instance from an array of
	* `Document` instances. It adds the documents to the store.
	* @param docs Array of `Document` instances to be added to the store.
	* @param embeddings `Embeddings` instance used to generate embeddings for the documents.
	* @param dbConfig Optional `FakeVectorStoreArgs` to configure the `FakeVectorStore` instance.
	* @returns Promise that resolves with a new `FakeVectorStore` instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create a `FakeVectorStore` instance from an existing
	* index. It creates a new `FakeVectorStore` instance without adding any
	* documents or vectors.
	* @param embeddings `Embeddings` instance used to generate embeddings for the documents.
	* @param dbConfig Optional `FakeVectorStoreArgs` to configure the `FakeVectorStore` instance.
	* @returns Promise that resolves with a new `FakeVectorStore` instance.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		return new this(embeddings, dbConfig);
	}
};
//#endregion
exports.FakeVectorStore = FakeVectorStore;

//# sourceMappingURL=vectorstores.cjs.map