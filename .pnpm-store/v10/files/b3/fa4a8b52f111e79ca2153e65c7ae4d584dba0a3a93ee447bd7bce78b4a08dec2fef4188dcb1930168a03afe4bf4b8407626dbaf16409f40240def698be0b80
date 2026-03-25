import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { SearchClient, SearchIndex, SearchIndexClient, VectorFilterMode } from "@azure/search-documents";
import { KeyCredential, TokenCredential } from "@azure/core-auth";

//#region src/vectorstores/azure_aisearch.d.ts

/**
 * Azure AI Search query type.
 */
declare const AzureAISearchQueryType: {
  /** Vector search. */
  readonly Similarity: "similarity";
  /** Hybrid full text and vector search. */
  readonly SimilarityHybrid: "similarity_hybrid";
  /** Hybrid full text and vector search with semantic ranking. */
  readonly SemanticHybrid: "semantic_hybrid";
};
/**
 * Azure AI Search query type.
 */
type AzureAISearchQueryType = (typeof AzureAISearchQueryType)[keyof typeof AzureAISearchQueryType];
/**
 * Azure AI Search settings.
 */
interface AzureAISearchQueryOptions {
  readonly type?: AzureAISearchQueryType;
  readonly semanticConfigurationName?: string;
}
/**
 * Configuration options for the `AzureAISearchStore` constructor.
 */
interface AzureAISearchConfig {
  readonly client?: SearchClient<AzureAISearchDocument>;
  readonly indexName?: string;
  readonly endpoint?: string;
  readonly key?: string;
  readonly credentials?: KeyCredential | TokenCredential;
  readonly search?: AzureAISearchQueryOptions;
}
/**
 * Azure AI Search options metadata schema.
 * If yout want to add custom data, use the attributes property.
 */
type AzureAISearchDocumentMetadata = {
  source: string;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  embedding?: number[];
};
/**
 * Azure AI Search indexed document.
 */
type AzureAISearchDocument = {
  id: string;
  content: string;
  content_vector: number[];
  metadata: AzureAISearchDocumentMetadata;
};
/**
 * Azure AI Search options for adding documents.
 */
type AzureAISearchAddDocumentsOptions = {
  ids?: string[];
};
/**
 * Azure AI Search filter type.
 */
type AzureAISearchFilterType = {
  /** OData filter. */
  filterExpression?: string;
  /** Determines whether or not filters are applied before or after the vector search is performed. */
  vectorFilterMode?: VectorFilterMode;
  /** Determines whether or not to include the embeddings in the search results. */
  includeEmbeddings?: boolean;
};
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
declare class AzureAISearchVectorStore extends VectorStore {
  FilterType: AzureAISearchFilterType;
  get lc_secrets(): {
    [key: string]: string;
  };
  _vectorstoreType(): string;
  private readonly initPromise;
  private readonly client;
  private readonly indexName;
  private readonly options;
  constructor(embeddings: EmbeddingsInterface, config: AzureAISearchConfig);
  /**
   * Removes specified documents from the AzureAISearchVectorStore using IDs or a filter.
   * @param params Object that includes either an array of IDs or a filter for the data to be deleted.
   * @returns A promise that resolves when the documents have been removed.
   */
  delete(params: {
    ids?: string | string[];
    filter?: AzureAISearchFilterType;
  }): Promise<void>;
  private deleteMany;
  private deleteById;
  /**
   * Adds documents to the AzureAISearchVectorStore.
   * @param documents The documents to add.
   * @param options Options for adding documents.
   * @returns A promise that resolves to the ids of the added documents.
   */
  addDocuments(documents: Document[], options?: AzureAISearchAddDocumentsOptions): Promise<string[]>;
  /**
   * Adds vectors to the AzureAISearchVectorStore.
   * @param vectors Vectors to be added.
   * @param documents Corresponding documents to be added.
   * @param options Options for adding documents.
   * @returns A promise that resolves to the ids of the added documents.
   */
  addVectors(vectors: number[][], documents: Document[], options?: AzureAISearchAddDocumentsOptions): Promise<string[]>;
  /**
   * Performs a similarity search using query type specified in configuration.
   * If the query type is not specified, it defaults to similarity search.
   * @param query Query text for the similarity search.
   * @param k=4 Number of nearest neighbors to return.
   * @param filter Optional filter options for the documents.
   * @returns Promise that resolves to a list of documents.
   */
  similaritySearch(query: string, k?: number, filter?: this["FilterType"] | undefined): Promise<Document[]>;
  /**
   * Performs a similarity search using query type specified in configuration.
   * If the query type is not specified, it defaults to similarity hybrid search.
   * @param query Query text for the similarity search.
   * @param k=4 Number of nearest neighbors to return.
   * @param filter Optional filter options for the documents.
   * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
   */
  similaritySearchWithScore(query: string, k?: number, filter?: this["FilterType"] | undefined): Promise<[Document, number][]>;
  /**
   * Performs a hybrid search using query text.
   * @param query Query text for the similarity search.
   * @param queryVector Query vector for the similarity search.
   *    If not provided, the query text will be embedded.
   * @param k=4 Number of nearest neighbors to return.
   * @param filter Optional filter options for the documents.
   * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
   */
  hybridSearchVectorWithScore(query: string, queryVector?: number[], k?: number, filter?: this["FilterType"] | undefined): Promise<[Document, number][]>;
  /**
   * Performs a hybrid search with semantic reranker using query text.
   * @param query Query text for the similarity search.
   * @param queryVector Query vector for the similarity search.
   *    If not provided, the query text will be embedded.
   * @param k=4 Number of nearest neighbors to return.
   * @param filter Optional filter options for the documents.
   * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
   */
  semanticHybridSearchVectorWithScore(query: string, queryVector?: number[], k?: number, filter?: this["FilterType"] | undefined): Promise<[Document, number][]>;
  /**
   * Performs a similarity search on the vectors stored in the collection.
   * @param queryVector Query vector for the similarity search.
   * @param k=4 Number of nearest neighbors to return.
   * @param filter Optional filter options for the documents.
   * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
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
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
  /**
   * Ensures that an index exists on the AzureAISearchVectorStore.
   * @param indexClient The Azure AI Search index client.
   * @returns A promise that resolves when the AzureAISearchVectorStore index has been initialized.
   * @protected
   */
  protected ensureIndexExists(indexClient: SearchIndexClient): Promise<void>;
  /**
   * Prepares the search index definition for Azure AI Search.
   * @param indexName The name of the index.
   * @returns The SearchIndex object.
   * @protected
   */
  protected createSearchIndexDefinition(indexName: string): Promise<SearchIndex>;
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
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, config: AzureAISearchConfig): Promise<AzureAISearchVectorStore>;
  /**
   * Static method to create an instance of AzureAISearchVectorStore from a
   * list of documents. It first converts the documents to vectors and then
   * adds them to the database.
   * @param docs List of documents to be converted to vectors.
   * @param embeddings Embeddings to be used for conversion.
   * @param config Database configuration for Azure AI Search.
   * @returns Promise that resolves to a new instance of AzureAISearchVectorStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, config: AzureAISearchConfig, options?: AzureAISearchAddDocumentsOptions): Promise<AzureAISearchVectorStore>;
}
//#endregion
export { AzureAISearchAddDocumentsOptions, AzureAISearchConfig, AzureAISearchDocument, AzureAISearchDocumentMetadata, AzureAISearchFilterType, AzureAISearchQueryOptions, AzureAISearchQueryType, AzureAISearchVectorStore };
//# sourceMappingURL=azure_aisearch.d.cts.map