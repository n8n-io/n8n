import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import * as uuid from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";
import { AzureKeyCredential, SearchClient, SearchIndexClient, SearchIndexingBufferedSender } from "@azure/search-documents";

//#region src/vectorstores/azure_aisearch.ts
var azure_aisearch_exports = {};
__export(azure_aisearch_exports, {
	AzureAISearchQueryType: () => AzureAISearchQueryType,
	AzureAISearchVectorStore: () => AzureAISearchVectorStore
});
/**
* Azure AI Search query type.
*/
const AzureAISearchQueryType = {
	Similarity: "similarity",
	SimilarityHybrid: "similarity_hybrid",
	SemanticHybrid: "semantic_hybrid"
};
const USER_AGENT_PREFIX = "langchainjs-azure-aisearch";
const DEFAULT_FIELD_ID = "id";
const DEFAULT_FIELD_CONTENT = "content";
const DEFAULT_FIELD_CONTENT_VECTOR = "content_vector";
const DEFAULT_FIELD_METADATA = "metadata";
const DEFAULT_FIELD_METADATA_SOURCE = "source";
const DEFAULT_FIELD_METADATA_ATTRS = "attributes";
/**
* Azure AI Search vector store.
* To use this, you should have:
* - the `@azure/search-documents` NPM package installed
* - an endpoint and key to the Azure AI Search instance
*
* If you directly provide a `SearchClient` instance, you need to ensure that
* an index has been created. When using and endpoint and key, the index will
* be created automatically if it does not exist.
*/
var AzureAISearchVectorStore = class AzureAISearchVectorStore extends VectorStore {
	get lc_secrets() {
		return {
			endpoint: "AZURE_AISEARCH_ENDPOINT",
			key: "AZURE_AISEARCH_KEY"
		};
	}
	_vectorstoreType() {
		return "azure_aisearch";
	}
	initPromise;
	client;
	indexName;
	options;
	constructor(embeddings, config) {
		super(embeddings, config);
		const endpoint = config.endpoint ?? getEnvironmentVariable("AZURE_AISEARCH_ENDPOINT");
		const key = config.key ?? getEnvironmentVariable("AZURE_AISEARCH_KEY");
		let { credentials } = config;
		if (!config.client && (!endpoint || !key && !credentials)) throw new Error("Azure AI Search client or endpoint and key/credentials must be set.");
		this.indexName = config.indexName ?? "vectorsearch";
		if (!config.client) {
			credentials ??= new AzureKeyCredential(key);
			this.client = new SearchClient(endpoint, this.indexName, credentials, { userAgentOptions: { userAgentPrefix: USER_AGENT_PREFIX } });
			const indexClient = new SearchIndexClient(endpoint, credentials, { userAgentOptions: { userAgentPrefix: USER_AGENT_PREFIX } });
			this.initPromise = this.ensureIndexExists(indexClient).catch((error) => {
				console.error("Error during Azure AI Search index initialization:", error);
			});
		} else this.client = config.client;
		this.options = config.search ?? {};
		this.embeddings = embeddings;
	}
	/**
	* Removes specified documents from the AzureAISearchVectorStore using IDs or a filter.
	* @param params Object that includes either an array of IDs or a filter for the data to be deleted.
	* @returns A promise that resolves when the documents have been removed.
	*/
	async delete(params) {
		if (!params.ids && !params.filter) throw new Error(`Azure AI Search delete requires either "ids" or "filter" to be set in the params object`);
		await this.initPromise;
		if (params.ids) await this.deleteById(params.ids);
		if (params.filter) await this.deleteMany(params.filter);
	}
	/**
	* Removes specified documents from the AzureAISearchVectorStore using a filter.
	* @param filter Filter options to find documents to delete.
	* @returns A promise that resolves when the documents have been removed.
	*/
	async deleteMany(filter) {
		if (!filter.filterExpression) throw new Error(`Azure AI Search deleteMany requires "filterExpression" to be set in the filter object`);
		const { results } = await this.client.search("*", { filter: filter.filterExpression });
		const docs = [];
		for await (const item of results) docs.push(item.document);
		const deleteResults = [];
		const bufferedClient = new SearchIndexingBufferedSender(this.client, (entity) => entity.id);
		bufferedClient.on("batchSucceeded", (response) => {
			deleteResults.push(...response.results);
		});
		bufferedClient.on("batchFailed", (response) => {
			throw new Error(`Azure AI Search deleteDocuments batch failed: ${response}`);
		});
		await bufferedClient.deleteDocuments(docs);
		await bufferedClient.flush();
		await bufferedClient.dispose();
		return deleteResults;
	}
	/**
	* Removes specified documents from the AzureAISearchVectorStore.
	* @param ids IDs of the documents to be removed.
	* @returns A promise that resolves when the documents have been removed.
	*/
	async deleteById(ids) {
		const docsIds = Array.isArray(ids) ? ids : [ids];
		const docs = docsIds.map((id) => ({ id }));
		const deleteResults = [];
		const bufferedClient = new SearchIndexingBufferedSender(this.client, (entity) => entity.id);
		bufferedClient.on("batchSucceeded", (response) => {
			deleteResults.push(...response.results);
		});
		bufferedClient.on("batchFailed", (response) => {
			throw new Error(`Azure AI Search deleteDocuments batch failed: ${response}`);
		});
		await bufferedClient.deleteDocuments(docs);
		await bufferedClient.flush();
		await bufferedClient.dispose();
		return deleteResults;
	}
	/**
	* Adds documents to the AzureAISearchVectorStore.
	* @param documents The documents to add.
	* @param options Options for adding documents.
	* @returns A promise that resolves to the ids of the added documents.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		const embeddings = await this.embeddings.embedDocuments(texts);
		const results = await this.addVectors(embeddings, documents, options);
		return results;
	}
	/**
	* Adds vectors to the AzureAISearchVectorStore.
	* @param vectors Vectors to be added.
	* @param documents Corresponding documents to be added.
	* @param options Options for adding documents.
	* @returns A promise that resolves to the ids of the added documents.
	*/
	async addVectors(vectors, documents, options) {
		const ids = options?.ids ?? documents.map(() => uuid.v4());
		const entities = documents.map((doc, idx) => ({
			id: ids[idx],
			content: doc.pageContent,
			content_vector: vectors[idx],
			metadata: {
				source: doc.metadata?.source,
				attributes: doc.metadata?.attributes ?? []
			}
		}));
		await this.initPromise;
		const bufferedClient = new SearchIndexingBufferedSender(this.client, (entity) => entity.id);
		bufferedClient.on("batchFailed", (response) => {
			throw new Error(`Azure AI Search uploadDocuments batch failed: ${response}`);
		});
		await bufferedClient.uploadDocuments(entities);
		await bufferedClient.flush();
		await bufferedClient.dispose();
		return ids;
	}
	/**
	* Performs a similarity search using query type specified in configuration.
	* If the query type is not specified, it defaults to similarity search.
	* @param query Query text for the similarity search.
	* @param k=4 Number of nearest neighbors to return.
	* @param filter Optional filter options for the documents.
	* @returns Promise that resolves to a list of documents.
	*/
	async similaritySearch(query, k = 4, filter = void 0) {
		const results = await this.similaritySearchWithScore(query, k, filter);
		return results.map((result) => result[0]);
	}
	/**
	* Performs a similarity search using query type specified in configuration.
	* If the query type is not specified, it defaults to similarity hybrid search.
	* @param query Query text for the similarity search.
	* @param k=4 Number of nearest neighbors to return.
	* @param filter Optional filter options for the documents.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchWithScore(query, k = 4, filter = void 0) {
		const searchType = this.options.type ?? AzureAISearchQueryType.SimilarityHybrid;
		if (searchType === AzureAISearchQueryType.Similarity) return this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, filter);
		else if (searchType === AzureAISearchQueryType.SimilarityHybrid) return this.hybridSearchVectorWithScore(query, await this.embeddings.embedQuery(query), k, filter);
		else if (searchType === AzureAISearchQueryType.SemanticHybrid) return this.semanticHybridSearchVectorWithScore(query, await this.embeddings.embedQuery(query), k, filter);
		throw new Error(`Unrecognized search type '${searchType}'`);
	}
	/**
	* Performs a hybrid search using query text.
	* @param query Query text for the similarity search.
	* @param queryVector Query vector for the similarity search.
	*    If not provided, the query text will be embedded.
	* @param k=4 Number of nearest neighbors to return.
	* @param filter Optional filter options for the documents.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async hybridSearchVectorWithScore(query, queryVector, k = 4, filter = void 0) {
		const vector = queryVector ?? await this.embeddings.embedQuery(query);
		await this.initPromise;
		const { results } = await this.client.search(query, {
			vectorSearchOptions: {
				queries: [{
					kind: "vector",
					vector,
					kNearestNeighborsCount: k,
					fields: [DEFAULT_FIELD_CONTENT_VECTOR]
				}],
				filterMode: filter?.vectorFilterMode
			},
			filter: filter?.filterExpression,
			top: k
		});
		const docsWithScore = [];
		for await (const item of results) {
			const document = new Document({
				pageContent: item.document[DEFAULT_FIELD_CONTENT],
				metadata: { ...item.document[DEFAULT_FIELD_METADATA] }
			});
			if (filter?.includeEmbeddings) document.metadata.embedding = item.document[DEFAULT_FIELD_CONTENT_VECTOR];
			docsWithScore.push([document, item.score]);
		}
		return docsWithScore;
	}
	/**
	* Performs a hybrid search with semantic reranker using query text.
	* @param query Query text for the similarity search.
	* @param queryVector Query vector for the similarity search.
	*    If not provided, the query text will be embedded.
	* @param k=4 Number of nearest neighbors to return.
	* @param filter Optional filter options for the documents.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async semanticHybridSearchVectorWithScore(query, queryVector, k = 4, filter = void 0) {
		const vector = queryVector ?? await this.embeddings.embedQuery(query);
		await this.initPromise;
		const { results } = await this.client.search(query, {
			vectorSearchOptions: {
				queries: [{
					kind: "vector",
					vector,
					kNearestNeighborsCount: k,
					fields: [DEFAULT_FIELD_CONTENT_VECTOR]
				}],
				filterMode: filter?.vectorFilterMode
			},
			filter: filter?.filterExpression,
			top: k,
			queryType: "semantic",
			semanticSearchOptions: { configurationName: this.options.semanticConfigurationName ?? "semantic-search-config" }
		});
		const docsWithScore = [];
		for await (const item of results) {
			const document = new Document({
				pageContent: item.document[DEFAULT_FIELD_CONTENT],
				metadata: { ...item.document[DEFAULT_FIELD_METADATA] }
			});
			if (filter?.includeEmbeddings) document.metadata.embedding = item.document[DEFAULT_FIELD_CONTENT_VECTOR];
			docsWithScore.push([document, item.score]);
		}
		return docsWithScore;
	}
	/**
	* Performs a similarity search on the vectors stored in the collection.
	* @param queryVector Query vector for the similarity search.
	* @param k=4 Number of nearest neighbors to return.
	* @param filter Optional filter options for the documents.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		await this.initPromise;
		const { results } = await this.client.search("*", {
			vectorSearchOptions: {
				queries: [{
					kind: "vector",
					vector: query,
					kNearestNeighborsCount: k,
					fields: [DEFAULT_FIELD_CONTENT_VECTOR]
				}],
				filterMode: filter?.vectorFilterMode
			},
			filter: filter?.filterExpression
		});
		const docsWithScore = [];
		for await (const item of results) {
			const document = new Document({
				pageContent: item.document[DEFAULT_FIELD_CONTENT],
				metadata: { ...item.document[DEFAULT_FIELD_METADATA] }
			});
			if (filter?.includeEmbeddings) document.metadata.embedding = item.document[DEFAULT_FIELD_CONTENT_VECTOR];
			docsWithScore.push([document, item.score]);
		}
		return docsWithScore;
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND
	* diversity among selected documents.
	* @param query Text to look up documents similar to.
	* @param options.k Number of documents to return.
	* @param options.fetchK=20 Number of documents to fetch before passing to
	*     the MMR algorithm.
	* @param options.lambda=0.5 Number between 0 and 1 that determines the
	*     degree of diversity among the results, where 0 corresponds to maximum
	*     diversity and 1 to minimum diversity.
	* @returns List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const { k, fetchK = 20, lambda = .5 } = options;
		const includeEmbeddingsFlag = options.filter?.includeEmbeddings || false;
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const docs = await this.similaritySearchVectorWithScore(queryEmbedding, fetchK, {
			...options.filter,
			includeEmbeddings: true
		});
		const embeddingList = docs.map((doc) => doc[0].metadata.embedding);
		const mmrIndexes = maximalMarginalRelevance(queryEmbedding, embeddingList, lambda, k);
		return mmrIndexes.map((index) => {
			const doc = docs[index][0];
			if (!includeEmbeddingsFlag) delete doc.metadata.embedding;
			return doc;
		});
	}
	/**
	* Ensures that an index exists on the AzureAISearchVectorStore.
	* @param indexClient The Azure AI Search index client.
	* @returns A promise that resolves when the AzureAISearchVectorStore index has been initialized.
	* @protected
	*/
	async ensureIndexExists(indexClient) {
		try {
			await indexClient.getIndex(this.indexName);
		} catch {
			const searchIndex = await this.createSearchIndexDefinition(this.indexName);
			await indexClient.createIndex(searchIndex);
		}
	}
	/**
	* Prepares the search index definition for Azure AI Search.
	* @param indexName The name of the index.
	* @returns The SearchIndex object.
	* @protected
	*/
	async createSearchIndexDefinition(indexName) {
		const testEmbedding = await this.embeddings.embedQuery("test");
		const embeddingDimensions = testEmbedding.length;
		return {
			name: indexName,
			vectorSearch: {
				algorithms: [{
					name: "vector-search-algorithm",
					kind: "hnsw",
					parameters: {
						m: 4,
						efSearch: 500,
						metric: "cosine",
						efConstruction: 400
					}
				}],
				profiles: [{
					name: "vector-search-profile",
					algorithmConfigurationName: "vector-search-algorithm"
				}]
			},
			semanticSearch: {
				defaultConfigurationName: "semantic-search-config",
				configurations: [{
					name: "semantic-search-config",
					prioritizedFields: {
						contentFields: [{ name: DEFAULT_FIELD_CONTENT }],
						keywordsFields: [{ name: DEFAULT_FIELD_CONTENT }]
					}
				}]
			},
			fields: [
				{
					name: DEFAULT_FIELD_ID,
					filterable: true,
					key: true,
					type: "Edm.String"
				},
				{
					name: DEFAULT_FIELD_CONTENT,
					searchable: true,
					filterable: true,
					type: "Edm.String"
				},
				{
					name: DEFAULT_FIELD_CONTENT_VECTOR,
					searchable: true,
					type: "Collection(Edm.Single)",
					vectorSearchDimensions: embeddingDimensions,
					vectorSearchProfileName: "vector-search-profile"
				},
				{
					name: DEFAULT_FIELD_METADATA,
					type: "Edm.ComplexType",
					fields: [{
						name: DEFAULT_FIELD_METADATA_SOURCE,
						type: "Edm.String",
						filterable: true
					}, {
						name: DEFAULT_FIELD_METADATA_ATTRS,
						type: "Collection(Edm.ComplexType)",
						fields: [{
							name: "key",
							type: "Edm.String",
							filterable: true
						}, {
							name: "value",
							type: "Edm.String",
							filterable: true
						}]
					}]
				}
			]
		};
	}
	/**
	* Static method to create an instance of AzureAISearchVectorStore from a
	* list of texts. It first converts the texts to vectors and then adds
	* them to the collection.
	* @param texts List of texts to be converted to vectors.
	* @param metadatas Metadata for the texts.
	* @param embeddings Embeddings to be used for conversion.
	* @param config Database configuration for Azure AI Search.
	* @returns Promise that resolves to a new instance of AzureAISearchVectorStore.
	*/
	static async fromTexts(texts, metadatas, embeddings, config) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return AzureAISearchVectorStore.fromDocuments(docs, embeddings, config);
	}
	/**
	* Static method to create an instance of AzureAISearchVectorStore from a
	* list of documents. It first converts the documents to vectors and then
	* adds them to the database.
	* @param docs List of documents to be converted to vectors.
	* @param embeddings Embeddings to be used for conversion.
	* @param config Database configuration for Azure AI Search.
	* @returns Promise that resolves to a new instance of AzureAISearchVectorStore.
	*/
	static async fromDocuments(docs, embeddings, config, options) {
		const instance = new this(embeddings, config);
		await instance.addDocuments(docs, options);
		return instance;
	}
};

//#endregion
export { AzureAISearchQueryType, AzureAISearchVectorStore, azure_aisearch_exports };
//# sourceMappingURL=azure_aisearch.js.map