const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));

//#region src/vectorstores/supabase.ts
var supabase_exports = {};
require_rolldown_runtime.__export(supabase_exports, { SupabaseVectorStore: () => SupabaseVectorStore });
/**
* Supabase vector store integration.
*
* Setup:
* Install `@langchain/community` and `@supabase/supabase-js`.
*
* ```bash
* npm install @langchain/community @supabase/supabase-js
* ```
*
* See https://js.langchain.com/docs/integrations/vectorstores/supabase for
* instructions on how to set up your Supabase instance.
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.vectorstores_supabase.SupabaseVectorStore.html#constructor)
*
* <details open>
* <summary><strong>Instantiate</strong></summary>
*
* ```typescript
* import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
* import { OpenAIEmbeddings } from "@langchain/openai";
*
* import { createClient } from "@supabase/supabase-js";
*
* const embeddings = new OpenAIEmbeddings({
*   model: "text-embedding-3-small",
* });
*
* const supabaseClient = createClient(
*   process.env.SUPABASE_URL,
*   process.env.SUPABASE_PRIVATE_KEY
* );
*
* const vectorStore = new SupabaseVectorStore(embeddings, {
*   client: supabaseClient,
*   tableName: "documents",
*   queryName: "match_documents",
* });
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
* const ids = ["1", "2", "3"];
* await vectorStore.addDocuments(documents, { ids });
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Delete documents</strong></summary>
*
* ```typescript
* await vectorStore.delete({ ids: ["3"] });
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
var SupabaseVectorStore = class SupabaseVectorStore extends __langchain_core_vectorstores.VectorStore {
	client;
	tableName;
	queryName;
	filter;
	upsertBatchSize = 500;
	_vectorstoreType() {
		return "supabase";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.client = args.client;
		this.tableName = args.tableName || "documents";
		this.queryName = args.queryName || "match_documents";
		this.filter = args.filter;
		this.upsertBatchSize = args.upsertBatchSize ?? this.upsertBatchSize;
	}
	/**
	* Adds documents to the vector store.
	* @param documents The documents to add.
	* @param options Optional parameters for adding the documents.
	* @returns A promise that resolves when the documents have been added.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Adds vectors to the vector store.
	* @param vectors The vectors to add.
	* @param documents The documents associated with the vectors.
	* @param options Optional parameters for adding the vectors.
	* @returns A promise that resolves with the IDs of the added vectors when the vectors have been added.
	*/
	async addVectors(vectors, documents, options) {
		const rows = vectors.map((embedding, idx) => ({
			content: documents[idx].pageContent,
			embedding,
			metadata: documents[idx].metadata
		}));
		let returnedIds = [];
		for (let i = 0; i < rows.length; i += this.upsertBatchSize) {
			const chunk = rows.slice(i, i + this.upsertBatchSize).map((row, j) => {
				if (options?.ids) return {
					id: options.ids[i + j],
					...row
				};
				return row;
			});
			const res = await this.client.from(this.tableName).upsert(chunk).select();
			if (res.error) throw new Error(`Error inserting: ${res.error.message} ${res.status} ${res.statusText}`);
			if (res.data) returnedIds = returnedIds.concat(res.data.map((row) => row.id));
		}
		return returnedIds;
	}
	/**
	* Deletes vectors from the vector store.
	* @param params The parameters for deleting vectors.
	* @returns A promise that resolves when the vectors have been deleted.
	*/
	async delete(params) {
		const { ids } = params;
		for (const id of ids) await this.client.from(this.tableName).delete().eq("id", id);
	}
	async _searchSupabase(query, k, filter) {
		if (filter && this.filter) throw new Error("cannot provide both `filter` and `this.filter`");
		const _filter = filter ?? this.filter ?? {};
		const matchDocumentsParams = { query_embedding: query };
		let filterFunction;
		if (typeof _filter === "function") filterFunction = (rpcCall$1) => _filter(rpcCall$1).limit(k);
		else if (typeof _filter === "object") {
			matchDocumentsParams.filter = _filter;
			matchDocumentsParams.match_count = k;
			filterFunction = (rpcCall$1) => rpcCall$1;
		} else throw new Error("invalid filter type");
		const rpcCall = this.client.rpc(this.queryName, matchDocumentsParams);
		const { data: searches, error } = await filterFunction(rpcCall);
		if (error) throw new Error(`Error searching for documents: ${error.code} ${error.message} ${error.details}`);
		return searches;
	}
	/**
	* Performs a similarity search on the vector store.
	* @param query The query vector.
	* @param k The number of results to return.
	* @param filter Optional filter to apply to the search.
	* @returns A promise that resolves with the search results when the search is complete.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const searches = await this._searchSupabase(query, k, filter);
		const result = searches.map((resp) => [new __langchain_core_documents.Document({
			metadata: resp.metadata,
			pageContent: resp.content
		}), resp.similarity]);
		return result;
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND diversity
	* among selected documents.
	*
	* @param {string} query - Text to look up documents similar to.
	* @param {number} options.k - Number of documents to return.
	* @param {number} options.fetchK=20- Number of documents to fetch before passing to the MMR algorithm.
	* @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
	*                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
	* @param {SupabaseLibArgs} options.filter - Optional filter to apply to the search.
	*
	* @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const searches = await this._searchSupabase(queryEmbedding, options.fetchK ?? 20, options.filter);
		const embeddingList = searches.map((searchResp) => searchResp.embedding);
		const mmrIndexes = (0, __langchain_core_utils_math.maximalMarginalRelevance)(queryEmbedding, embeddingList, options.lambda, options.k);
		return mmrIndexes.map((idx) => new __langchain_core_documents.Document({
			metadata: searches[idx].metadata,
			pageContent: searches[idx].content
		}));
	}
	/**
	* Creates a new SupabaseVectorStore instance from an array of texts.
	* @param texts The texts to create documents from.
	* @param metadatas The metadata for the documents.
	* @param embeddings The embeddings to use.
	* @param dbConfig The configuration for the Supabase database.
	* @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
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
		return SupabaseVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Creates a new SupabaseVectorStore instance from an array of documents.
	* @param docs The documents to create the instance from.
	* @param embeddings The embeddings to use.
	* @param dbConfig The configuration for the Supabase database.
	* @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Creates a new SupabaseVectorStore instance from an existing index.
	* @param embeddings The embeddings to use.
	* @param dbConfig The configuration for the Supabase database.
	* @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		return instance;
	}
};

//#endregion
exports.SupabaseVectorStore = SupabaseVectorStore;
Object.defineProperty(exports, 'supabase_exports', {
  enumerable: true,
  get: function () {
    return supabase_exports;
  }
});
//# sourceMappingURL=supabase.cjs.map