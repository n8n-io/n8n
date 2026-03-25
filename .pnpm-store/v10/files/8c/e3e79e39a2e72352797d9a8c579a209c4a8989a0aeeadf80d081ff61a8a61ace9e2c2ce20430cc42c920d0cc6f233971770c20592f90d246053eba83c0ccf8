import { __export } from "../_virtual/rolldown_runtime.js";
import { cosine } from "../util/ml-distance/similarities.js";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";

//#region src/vectorstores/memory.ts
var memory_exports = {};
__export(memory_exports, { MemoryVectorStore: () => MemoryVectorStore });
/**
* In-memory, ephemeral vector store.
*
* Setup:
* Install `langchain`:
*
* ```bash
* npm install langchain
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain.vectorstores_memory.MemoryVectorStore.html#constructor)
*
* <details open>
* <summary><strong>Instantiate</strong></summary>
*
* ```typescript
* import { MemoryVectorStore } from 'langchain/vectorstores/memory';
* // Or other embeddings
* import { OpenAIEmbeddings } from '@langchain/openai';
*
* const embeddings = new OpenAIEmbeddings({
*   model: "text-embedding-3-small",
* });
*
* const vectorStore = new MemoryVectorStore(embeddings);
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Add documents</strong></summary>
*
* ```typescript
* import type { Document } from '@langchain/core/documents';
*
* const document1 = { pageContent: "foo", metadata: { baz: "bar" } };
* const document2 = { pageContent: "thud", metadata: { bar: "baz" } };
* const document3 = { pageContent: "i will be deleted :(", metadata: {} };
*
* const documents: Document[] = [document1, document2, document3];
*
* await vectorStore.addDocuments(documents);
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Similarity search</strong></summary>
*
* ```typescript
* const results = await vectorStore.similaritySearch("thud", 1);
* for (const doc of results) {
*   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * thud [{"baz":"bar"}]
* ```
* </details>
*
* <br />
*
*
* <details>
* <summary><strong>Similarity search with filter</strong></summary>
*
* ```typescript
* const resultsWithFilter = await vectorStore.similaritySearch("thud", 1, { baz: "bar" });
*
* for (const doc of resultsWithFilter) {
*   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * foo [{"baz":"bar"}]
* ```
* </details>
*
* <br />
*
*
* <details>
* <summary><strong>Similarity search with score</strong></summary>
*
* ```typescript
* const resultsWithScore = await vectorStore.similaritySearchWithScore("qux", 1);
* for (const [doc, score] of resultsWithScore) {
*   console.log(`* [SIM=${score.toFixed(6)}] ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * [SIM=0.000000] qux [{"bar":"baz","baz":"bar"}]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>As a retriever</strong></summary>
*
* ```typescript
* const retriever = vectorStore.asRetriever({
*   searchType: "mmr", // Leave blank for standard similarity search
*   k: 1,
* });
* const resultAsRetriever = await retriever.invoke("thud");
* console.log(resultAsRetriever);
*
* // Output: [Document({ metadata: { "baz":"bar" }, pageContent: "thud" })]
* ```
* </details>
*
* <br />
*/
var MemoryVectorStore = class MemoryVectorStore extends VectorStore {
	memoryVectors = [];
	similarity;
	_vectorstoreType() {
		return "memory";
	}
	constructor(embeddings, { similarity,...rest } = {}) {
		super(embeddings, rest);
		this.similarity = similarity ?? cosine;
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
			metadata: documents[idx].metadata,
			id: documents[idx].id
		}));
		this.memoryVectors = this.memoryVectors.concat(memoryVectors);
	}
	async _queryVectors(query, k, filter) {
		const filterFunction = (memoryVector) => {
			if (!filter) return true;
			const doc = new Document({
				metadata: memoryVector.metadata,
				pageContent: memoryVector.content,
				id: memoryVector.id
			});
			return filter(doc);
		};
		const filteredMemoryVectors = this.memoryVectors.filter(filterFunction);
		return filteredMemoryVectors.map((vector, index) => ({
			similarity: this.similarity(query, vector.embedding),
			index,
			metadata: vector.metadata,
			content: vector.content,
			embedding: vector.embedding,
			id: vector.id
		})).sort((a, b) => a.similarity > b.similarity ? -1 : 0).slice(0, k);
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
		const searches = await this._queryVectors(query, k, filter);
		const result = searches.map((search) => [new Document({
			metadata: search.metadata,
			pageContent: search.content,
			id: search.id
		}), search.similarity]);
		return result;
	}
	async maxMarginalRelevanceSearch(query, options) {
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const searches = await this._queryVectors(queryEmbedding, options.fetchK ?? 20, options.filter);
		const embeddingList = searches.map((searchResp) => searchResp.embedding);
		const mmrIndexes = maximalMarginalRelevance(queryEmbedding, embeddingList, options.lambda, options.k);
		return mmrIndexes.map((idx) => new Document({
			metadata: searches[idx].metadata,
			pageContent: searches[idx].content,
			id: searches[idx].id
		}));
	}
	/**
	* Static method to create a `MemoryVectorStore` instance from an array of
	* texts. It creates a `Document` for each text and metadata pair, and
	* adds them to the store.
	* @param texts Array of texts to be added to the store.
	* @param metadatas Array or single object of metadata corresponding to the texts.
	* @param embeddings `Embeddings` instance used to generate embeddings for the texts.
	* @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
	* @returns Promise that resolves with a new `MemoryVectorStore` instance.
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
		return MemoryVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a `MemoryVectorStore` instance from an array of
	* `Document` instances. It adds the documents to the store.
	* @param docs Array of `Document` instances to be added to the store.
	* @param embeddings `Embeddings` instance used to generate embeddings for the documents.
	* @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
	* @returns Promise that resolves with a new `MemoryVectorStore` instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create a `MemoryVectorStore` instance from an existing
	* index. It creates a new `MemoryVectorStore` instance without adding any
	* documents or vectors.
	* @param embeddings `Embeddings` instance used to generate embeddings for the documents.
	* @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
	* @returns Promise that resolves with a new `MemoryVectorStore` instance.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		return instance;
	}
};

//#endregion
export { MemoryVectorStore, memory_exports };
//# sourceMappingURL=memory.js.map