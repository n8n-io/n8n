import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import * as uuid from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";
import { errors } from "@opensearch-project/opensearch";

//#region src/vectorstores/opensearch.ts
var opensearch_exports = {};
__export(opensearch_exports, { OpenSearchVectorStore: () => OpenSearchVectorStore });
/**
* Class that provides a wrapper around the OpenSearch service for vector
* search. It provides methods for adding documents and vectors to the
* OpenSearch index, searching for similar vectors, and managing the
* OpenSearch index.
*/
var OpenSearchVectorStore = class OpenSearchVectorStore extends VectorStore {
	client;
	indexName;
	isAoss;
	engine;
	spaceType;
	efConstruction;
	efSearch;
	numberOfShards;
	numberOfReplicas;
	m;
	vectorFieldName;
	textFieldName;
	metadataFieldName;
	_vectorstoreType() {
		return "opensearch";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.spaceType = args.vectorSearchOptions?.spaceType ?? "l2";
		this.engine = args.vectorSearchOptions?.engine ?? "nmslib";
		this.m = args.vectorSearchOptions?.m ?? 16;
		this.efConstruction = args.vectorSearchOptions?.efConstruction ?? 512;
		this.efSearch = args.vectorSearchOptions?.efSearch ?? 512;
		this.numberOfShards = args.vectorSearchOptions?.numberOfShards ?? 5;
		this.numberOfReplicas = args.vectorSearchOptions?.numberOfReplicas ?? 1;
		this.vectorFieldName = args.vectorFieldName ?? "embedding";
		this.textFieldName = args.textFieldName ?? "text";
		this.metadataFieldName = args.metadataFieldName ?? "metadata";
		this.client = args.client;
		this.indexName = args.indexName ?? "documents";
		this.isAoss = (args.service ?? "es") === "aoss";
	}
	/**
	* Method to add documents to the OpenSearch index. It first converts the
	* documents to vectors using the embeddings, then adds the vectors to the
	* index.
	* @param documents The documents to be added to the OpenSearch index.
	* @returns Promise resolving to void.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Method to add vectors to the OpenSearch index. It ensures the index
	* exists, then adds the vectors and associated documents to the index.
	* @param vectors The vectors to be added to the OpenSearch index.
	* @param documents The documents associated with the vectors.
	* @param options Optional parameter that can contain the IDs for the documents.
	* @returns Promise resolving to void.
	*/
	async addVectors(vectors, documents, options) {
		await this.ensureIndexExists(vectors[0].length, this.engine, this.spaceType, this.efSearch, this.efConstruction, this.numberOfShards, this.numberOfReplicas, this.m);
		const documentIds = options?.ids ?? Array.from({ length: vectors.length }, () => uuid.v4());
		const operations = vectors.flatMap((embedding, idx) => {
			const document = [{ index: {
				_index: this.indexName,
				_id: documentIds[idx]
			} }, {
				[this.vectorFieldName]: embedding,
				[this.textFieldName]: documents[idx].pageContent,
				[this.metadataFieldName]: documents[idx].metadata
			}];
			if (this.isAoss) delete document[0].index?._id;
			return document;
		});
		await this.client.bulk({ body: operations });
		if (!this.isAoss) await this.client.indices.refresh({ index: this.indexName });
	}
	/**
	* Method to perform a similarity search on the OpenSearch index using a
	* query vector. It returns the k most similar documents and their scores.
	* @param query The query vector.
	* @param k The number of similar documents to return.
	* @param filter Optional filter for the OpenSearch query.
	* @returns Promise resolving to an array of tuples, each containing a Document and its score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const search = {
			index: this.indexName,
			body: {
				query: { bool: {
					filter: { bool: this.buildMetadataTerms(filter) },
					must: [{ knn: { [this.vectorFieldName]: {
						vector: query,
						k
					} } }]
				} },
				size: k
			}
		};
		const { body } = await this.client.search(search);
		return body.hits.hits.map((hit) => [new Document({
			pageContent: hit._source[this.textFieldName],
			metadata: hit._source[this.metadataFieldName],
			id: hit._id
		}), hit._score]);
	}
	/**
	* Static method to create a new OpenSearchVectorStore from an array of
	* texts, their metadata, embeddings, and OpenSearch client arguments.
	* @param texts The texts to be converted into documents and added to the OpenSearch index.
	* @param metadatas The metadata associated with the texts. Can be an array of objects or a single object.
	* @param embeddings The embeddings used to convert the texts into vectors.
	* @param args The OpenSearch client arguments.
	* @returns Promise resolving to a new instance of OpenSearchVectorStore.
	*/
	static fromTexts(texts, metadatas, embeddings, args) {
		const documents = texts.map((text, idx) => {
			const metadata = Array.isArray(metadatas) ? metadatas[idx] : metadatas;
			return new Document({
				pageContent: text,
				metadata
			});
		});
		return OpenSearchVectorStore.fromDocuments(documents, embeddings, args);
	}
	/**
	* Static method to create a new OpenSearchVectorStore from an array of
	* Documents, embeddings, and OpenSearch client arguments.
	* @param docs The documents to be added to the OpenSearch index.
	* @param embeddings The embeddings used to convert the documents into vectors.
	* @param dbConfig The OpenSearch client arguments.
	* @returns Promise resolving to a new instance of OpenSearchVectorStore.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const store = new OpenSearchVectorStore(embeddings, dbConfig);
		await store.addDocuments(docs).then(() => store);
		return store;
	}
	/**
	* Static method to create a new OpenSearchVectorStore from an existing
	* OpenSearch index, embeddings, and OpenSearch client arguments.
	* @param embeddings The embeddings used to convert the documents into vectors.
	* @param dbConfig The OpenSearch client arguments.
	* @returns Promise resolving to a new instance of OpenSearchVectorStore.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const store = new OpenSearchVectorStore(embeddings, dbConfig);
		await store.client.cat.indices({ index: store.indexName });
		return store;
	}
	async ensureIndexExists(dimension, engine = "nmslib", spaceType = "l2", efSearch = 512, efConstruction = 512, numberOfShards = 5, numberOfReplicas = 1, m = 16) {
		const body = {
			settings: { index: {
				number_of_shards: numberOfShards,
				number_of_replicas: numberOfReplicas,
				knn: true,
				"knn.algo_param.ef_search": efSearch
			} },
			mappings: {
				dynamic_templates: [{ [`${this.metadataFieldName}.*`]: {
					match_mapping_type: "string",
					mapping: { type: "keyword" }
				} }, { [`${this.metadataFieldName}.loc`]: {
					match_mapping_type: "object",
					mapping: { type: "object" }
				} }],
				properties: {
					[this.textFieldName]: { type: "text" },
					[this.metadataFieldName]: { type: "object" },
					[this.vectorFieldName]: {
						type: "knn_vector",
						dimension,
						method: {
							name: "hnsw",
							engine,
							space_type: spaceType,
							parameters: {
								ef_construction: efConstruction,
								m
							}
						}
					}
				}
			}
		};
		const indexExists = await this.doesIndexExist();
		if (indexExists) return;
		await this.client.indices.create({
			index: this.indexName,
			body
		});
	}
	/**
	* Builds metadata terms for OpenSearch queries.
	*
	* This function takes a filter object and constructs an array of query terms
	* compatible with OpenSearch 2.x. It supports a variety of query types including
	* term, terms, terms_set, ids, range, prefix, exists, fuzzy, wildcard, and regexp.
	* Reference: https://opensearch.org/docs/latest/query-dsl/term/index/
	*
	* @param {Filter | null} filter - The filter object used to construct query terms.
	* Each key represents a field, and the value specifies the type of query and its parameters.
	*
	* @returns {Array<Record<string, any>>} An array of OpenSearch query terms.
	*
	* @example
	* // Example filter:
	* const filter = {
	*   status: { "exists": true },
	*   age: { "gte": 30, "lte": 40 },
	*   tags: ["tag1", "tag2"],
	*   description: { "wildcard": "*test*" },
	*
	* };
	*
	* // Resulting query terms:
	* const queryTerms = buildMetadataTerms(filter);
	* // queryTerms would be an array of OpenSearch query objects.
	*/
	buildMetadataTerms(filter) {
		if (!filter) return {};
		const must = [];
		const must_not = [];
		for (const [key, value] of Object.entries(filter)) {
			const metadataKey = `${this.metadataFieldName}.${key}`;
			if (value) if (typeof value === "object" && !Array.isArray(value)) {
				if ("exists" in value) if (value.exists) must.push({ exists: { field: metadataKey } });
				else must_not.push({ exists: { field: metadataKey } });
				else if ("fuzzy" in value) must.push({ fuzzy: { [metadataKey]: value.fuzzy } });
				else if ("ids" in value) must.push({ ids: { values: value.ids } });
				else if ("prefix" in value) must.push({ prefix: { [metadataKey]: value.prefix } });
				else if ("gte" in value || "gt" in value || "lte" in value || "lt" in value) must.push({ range: { [metadataKey]: value } });
				else if ("regexp" in value) must.push({ regexp: { [metadataKey]: value.regexp } });
				else if ("terms_set" in value) must.push({ terms_set: { [metadataKey]: value.terms_set } });
				else if ("wildcard" in value) must.push({ wildcard: { [metadataKey]: value.wildcard } });
			} else {
				const aggregatorKey = Array.isArray(value) ? "terms" : "term";
				must.push({ [aggregatorKey]: { [metadataKey]: value } });
			}
		}
		return {
			must,
			must_not
		};
	}
	/**
	* Method to check if the OpenSearch index exists.
	* @returns Promise resolving to a boolean indicating whether the index exists.
	*/
	async doesIndexExist() {
		try {
			await this.client.cat.indices({ index: this.indexName });
			return true;
		} catch (err) {
			if (err instanceof errors.ResponseError && err.statusCode === 404) return false;
			throw err;
		}
	}
	/**
	* Method to delete the OpenSearch index if it exists.
	* @returns Promise resolving to void.
	*/
	async deleteIfExists() {
		const indexExists = await this.doesIndexExist();
		if (!indexExists) return;
		await this.client.indices.delete({ index: this.indexName });
	}
};

//#endregion
export { OpenSearchVectorStore, opensearch_exports };
//# sourceMappingURL=opensearch.js.map