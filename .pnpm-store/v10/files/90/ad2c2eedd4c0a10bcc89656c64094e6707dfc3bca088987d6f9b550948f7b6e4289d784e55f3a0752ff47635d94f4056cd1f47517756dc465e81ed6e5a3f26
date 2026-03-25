const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores/elasticsearch.ts
var elasticsearch_exports = {};
require_rolldown_runtime.__export(elasticsearch_exports, {
	ElasticVectorSearch: () => ElasticVectorSearch,
	HybridRetrievalStrategy: () => HybridRetrievalStrategy
});
/**
* Hybrid search strategy combining vector and BM25 search using RRF.
*/
var HybridRetrievalStrategy = class {
	rankWindowSize;
	rankConstant;
	textField;
	constructor(config = {}) {
		this.rankWindowSize = config.rankWindowSize ?? 100;
		this.rankConstant = config.rankConstant ?? 60;
		this.textField = config.textField ?? "text";
	}
};
/**
* Elasticsearch vector store supporting vector and hybrid search.
*
* Hybrid search combines kNN vector search with BM25 full-text search
* using RRF. Enable by passing a `HybridRetrievalStrategy` to the constructor.
*
* @example
* ```typescript
* // Vector search (default)
* const vectorStore = new ElasticVectorSearch(embeddings, { client, indexName });
*
* // Hybrid search
* const hybridStore = new ElasticVectorSearch(embeddings, {
*   client,
*   indexName,
*   strategy: new HybridRetrievalStrategy()
* });
* ```
*/
var ElasticVectorSearch = class ElasticVectorSearch extends __langchain_core_vectorstores.VectorStore {
	client;
	indexName;
	engine;
	similarity;
	efConstruction;
	m;
	candidates;
	strategy;
	lastQueryText;
	_vectorstoreType() {
		return "elasticsearch";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.engine = args.vectorSearchOptions?.engine ?? "hnsw";
		this.similarity = args.vectorSearchOptions?.similarity ?? "l2_norm";
		this.m = args.vectorSearchOptions?.m ?? 16;
		this.efConstruction = args.vectorSearchOptions?.efConstruction ?? 100;
		this.candidates = args.vectorSearchOptions?.candidates ?? 200;
		this.strategy = args.strategy;
		const userAgent = this.strategy ? "langchain-js-vs-hybrid/0.0.1" : "langchain-js-vs/0.0.1";
		this.client = args.client.child({ headers: { "user-agent": userAgent } });
		this.indexName = args.indexName ?? "documents";
	}
	/**
	* Method to add documents to the Elasticsearch database. It first
	* converts the documents to vectors using the embeddings, then adds the
	* vectors to the database.
	* @param documents The documents to add to the database.
	* @param options Optional parameter that can contain the IDs for the documents.
	* @returns A promise that resolves with the IDs of the added documents.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method to add vectors to the Elasticsearch database. It ensures the
	* index exists, then adds the vectors and their corresponding documents
	* to the database.
	* @param vectors The vectors to add to the database.
	* @param documents The documents corresponding to the vectors.
	* @param options Optional parameter that can contain the IDs for the documents.
	* @returns A promise that resolves with the IDs of the added documents.
	*/
	async addVectors(vectors, documents, options) {
		await this.ensureIndexExists(vectors[0].length, this.engine, this.similarity, this.efConstruction, this.m);
		const documentIds = options?.ids ?? Array.from({ length: vectors.length }, () => uuid.v4());
		const operations = vectors.flatMap((embedding, idx) => [{ index: {
			_id: documentIds[idx],
			_index: this.indexName
		} }, {
			embedding,
			metadata: documents[idx].metadata,
			text: documents[idx].pageContent
		}]);
		const results = await this.client.bulk({
			refresh: true,
			operations
		});
		if (results.errors) {
			const reasons = results.items.map((result) => result.index?.error?.reason);
			throw new Error(`Failed to insert documents:\n${reasons.join("\n")}`);
		}
		return documentIds;
	}
	async similaritySearch(query, k = 4, filter, _callbacks) {
		this.lastQueryText = query;
		return super.similaritySearch(query, k, filter, _callbacks);
	}
	/**
	* Method to perform a similarity search in the Elasticsearch database
	* using a vector. It returns the k most similar documents along with
	* their similarity scores.
	* @param query The query vector.
	* @param k The number of most similar documents to return.
	* @param filter Optional filter to apply to the search.
	* @returns A promise that resolves with an array of tuples, where each tuple contains a Document and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		if (this.strategy && this.lastQueryText) return this.hybridSearchVectorWithScore(this.lastQueryText, query, k, filter);
		const result = await this.client.search({
			index: this.indexName,
			size: k,
			knn: {
				field: "embedding",
				query_vector: query,
				filter: { bool: this.buildMetadataTerms(filter) },
				k,
				num_candidates: this.candidates
			}
		});
		return result.hits.hits.map((hit) => [new __langchain_core_documents.Document({
			pageContent: hit._source.text,
			metadata: hit._source.metadata
		}), hit._score]);
	}
	async hybridSearchVectorWithScore(queryText, queryVector, k, filter) {
		const metadataTerms = this.buildMetadataTerms(filter);
		const filterClauses = metadataTerms.must.length > 0 || metadataTerms.must_not.length > 0 ? { bool: metadataTerms } : void 0;
		const result = await this.client.search({
			index: this.indexName,
			size: k,
			retriever: { rrf: {
				retrievers: [{ standard: { query: { match: { [this.strategy.textField]: queryText } } } }, { knn: {
					field: "embedding",
					query_vector: queryVector,
					k,
					num_candidates: this.candidates
				} }],
				rank_window_size: this.strategy.rankWindowSize,
				rank_constant: this.strategy.rankConstant
			} },
			...filterClauses && { query: filterClauses }
		});
		return result.hits.hits.map((hit) => [new __langchain_core_documents.Document({
			pageContent: hit._source.text,
			metadata: hit._source.metadata
		}), hit._score]);
	}
	/**
	* Method to delete documents from the Elasticsearch database.
	* @param params Object containing the IDs of the documents to delete.
	* @returns A promise that resolves when the deletion is complete.
	*/
	async delete(params) {
		const operations = params.ids.map((id) => ({ delete: {
			_id: id,
			_index: this.indexName
		} }));
		if (operations.length > 0) await this.client.bulk({
			refresh: true,
			operations
		});
	}
	/**
	* Static method to create an ElasticVectorSearch instance from texts. It
	* creates Document instances from the texts and their corresponding
	* metadata, then calls the fromDocuments method to create the
	* ElasticVectorSearch instance.
	* @param texts The texts to create the ElasticVectorSearch instance from.
	* @param metadatas The metadata corresponding to the texts.
	* @param embeddings The embeddings to use for the documents.
	* @param args The arguments to create the Elasticsearch client.
	* @returns A promise that resolves with the created ElasticVectorSearch instance.
	*/
	static fromTexts(texts, metadatas, embeddings, args) {
		const documents = texts.map((text, idx) => {
			const metadata = Array.isArray(metadatas) ? metadatas[idx] : metadatas;
			return new __langchain_core_documents.Document({
				pageContent: text,
				metadata
			});
		});
		return ElasticVectorSearch.fromDocuments(documents, embeddings, args);
	}
	/**
	* Static method to create an ElasticVectorSearch instance from Document
	* instances. It adds the documents to the Elasticsearch database, then
	* returns the ElasticVectorSearch instance.
	* @param docs The Document instances to create the ElasticVectorSearch instance from.
	* @param embeddings The embeddings to use for the documents.
	* @param dbConfig The configuration for the Elasticsearch database.
	* @returns A promise that resolves with the created ElasticVectorSearch instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const store = new ElasticVectorSearch(embeddings, dbConfig);
		await store.addDocuments(docs).then(() => store);
		return store;
	}
	/**
	* Static method to create an ElasticVectorSearch instance from an
	* existing index in the Elasticsearch database. It checks if the index
	* exists, then returns the ElasticVectorSearch instance if it does.
	* @param embeddings The embeddings to use for the documents.
	* @param dbConfig The configuration for the Elasticsearch database.
	* @returns A promise that resolves with the created ElasticVectorSearch instance if the index exists, otherwise it throws an error.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const store = new ElasticVectorSearch(embeddings, dbConfig);
		const exists = await store.doesIndexExist();
		if (exists) return store;
		throw new Error(`The index ${store.indexName} does not exist.`);
	}
	async ensureIndexExists(dimension, engine = "hnsw", similarity = "l2_norm", efConstruction = 100, m = 16) {
		const request = {
			index: this.indexName,
			mappings: {
				dynamic_templates: [{ metadata_except_loc: {
					match_mapping_type: "*",
					match: "metadata.*",
					unmatch: "metadata.loc",
					mapping: { type: "keyword" }
				} }],
				properties: {
					text: { type: "text" },
					metadata: {
						type: "object",
						properties: { loc: { type: "object" } }
					},
					embedding: {
						type: "dense_vector",
						dims: dimension,
						index: true,
						similarity,
						index_options: {
							type: engine,
							m,
							ef_construction: efConstruction
						}
					}
				}
			}
		};
		const indexExists = await this.doesIndexExist();
		if (indexExists) return;
		await this.client.indices.create(request);
	}
	buildMetadataTerms(filter) {
		if (filter == null) return {
			must: [],
			must_not: []
		};
		const filters = Array.isArray(filter) ? filter : Object.entries(filter).map(([key, value]) => ({
			operator: "term",
			field: key,
			value
		}));
		const must = [];
		const must_not = [];
		const should = [];
		for (const condition of filters) {
			const metadataField = `metadata.${condition.field}`;
			if (condition.operator === "exists") must.push({ [condition.operator]: { field: metadataField } });
			else if (condition.operator === "not_exists") must_not.push({ exists: { field: metadataField } });
			else if (condition.operator === "exclude") {
				const toExclude = { [metadataField]: condition.value };
				must_not.push({ ...Array.isArray(condition.value) ? { terms: toExclude } : { term: toExclude } });
			} else if (condition.operator === "or") should.push({ term: { [metadataField]: condition.value } });
			else must.push({ [condition.operator]: { [metadataField]: condition.value } });
		}
		const result = {
			must,
			must_not
		};
		if (should.length > 0) {
			result.should = should;
			result.minimum_should_match = 1;
		}
		return result;
	}
	/**
	* Method to check if an index exists in the Elasticsearch database.
	* @returns A promise that resolves with a boolean indicating whether the index exists.
	*/
	async doesIndexExist() {
		return await this.client.indices.exists({ index: this.indexName });
	}
	/**
	* Method to delete an index from the Elasticsearch database if it exists.
	* @returns A promise that resolves when the deletion is complete.
	*/
	async deleteIfExists() {
		const indexExists = await this.doesIndexExist();
		if (!indexExists) return;
		await this.client.indices.delete({ index: this.indexName });
	}
};

//#endregion
exports.ElasticVectorSearch = ElasticVectorSearch;
exports.HybridRetrievalStrategy = HybridRetrievalStrategy;
Object.defineProperty(exports, 'elasticsearch_exports', {
  enumerable: true,
  get: function () {
    return elasticsearch_exports;
  }
});
//# sourceMappingURL=elasticsearch.cjs.map