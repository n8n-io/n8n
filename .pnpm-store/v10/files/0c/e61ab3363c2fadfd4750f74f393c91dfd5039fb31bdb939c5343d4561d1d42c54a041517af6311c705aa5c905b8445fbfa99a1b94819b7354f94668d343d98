import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Callbacks } from "@langchain/core/callbacks/manager";
import { Client } from "@elastic/elasticsearch";

//#region src/vectorstores/elasticsearch.d.ts

/**
 * Type representing the k-nearest neighbors (k-NN) engine used in
 * Elasticsearch.
 */
type ElasticKnnEngine = "hnsw";
/**
 * Type representing the similarity measure used in Elasticsearch.
 */
type ElasticSimilarity = "l2_norm" | "dot_product" | "cosine";
/**
 * Interface defining the options for vector search in Elasticsearch.
 */
interface VectorSearchOptions {
  readonly engine?: ElasticKnnEngine;
  readonly similarity?: ElasticSimilarity;
  readonly m?: number;
  readonly efConstruction?: number;
  readonly candidates?: number;
}
/**
 * Configuration options for hybrid retrieval strategy.
 */
interface HybridRetrievalStrategyConfig {
  rankWindowSize?: number;
  rankConstant?: number;
  textField?: string;
}
/**
 * Hybrid search strategy combining vector and BM25 search using RRF.
 */
declare class HybridRetrievalStrategy {
  readonly rankWindowSize: number;
  readonly rankConstant: number;
  readonly textField: string;
  constructor(config?: HybridRetrievalStrategyConfig);
}
/**
 * Interface defining the arguments required to create an Elasticsearch
 * client.
 */
interface ElasticClientArgs {
  readonly client: Client;
  readonly indexName?: string;
  readonly vectorSearchOptions?: VectorSearchOptions;
  readonly strategy?: HybridRetrievalStrategy;
}
/**
 * Type representing a filter object in Elasticsearch.
 */
type ElasticFilter = object | {
  field: string;
  operator: string;
  value: any;
}[];
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
declare class ElasticVectorSearch extends VectorStore {
  FilterType: ElasticFilter;
  private readonly client;
  private readonly indexName;
  private readonly engine;
  private readonly similarity;
  private readonly efConstruction;
  private readonly m;
  private readonly candidates;
  private readonly strategy?;
  private lastQueryText?;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: ElasticClientArgs);
  /**
   * Method to add documents to the Elasticsearch database. It first
   * converts the documents to vectors using the embeddings, then adds the
   * vectors to the database.
   * @param documents The documents to add to the database.
   * @param options Optional parameter that can contain the IDs for the documents.
   * @returns A promise that resolves with the IDs of the added documents.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Method to add vectors to the Elasticsearch database. It ensures the
   * index exists, then adds the vectors and their corresponding documents
   * to the database.
   * @param vectors The vectors to add to the database.
   * @param documents The documents corresponding to the vectors.
   * @param options Optional parameter that can contain the IDs for the documents.
   * @returns A promise that resolves with the IDs of the added documents.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  similaritySearch(query: string, k?: number, filter?: ElasticFilter, _callbacks?: Callbacks): Promise<Document[]>;
  /**
   * Method to perform a similarity search in the Elasticsearch database
   * using a vector. It returns the k most similar documents along with
   * their similarity scores.
   * @param query The query vector.
   * @param k The number of most similar documents to return.
   * @param filter Optional filter to apply to the search.
   * @returns A promise that resolves with an array of tuples, where each tuple contains a Document and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: ElasticFilter): Promise<[Document, number][]>;
  private hybridSearchVectorWithScore;
  /**
   * Method to delete documents from the Elasticsearch database.
   * @param params Object containing the IDs of the documents to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete(params: {
    ids: string[];
  }): Promise<void>;
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
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, args: ElasticClientArgs): Promise<ElasticVectorSearch>;
  /**
   * Static method to create an ElasticVectorSearch instance from Document
   * instances. It adds the documents to the Elasticsearch database, then
   * returns the ElasticVectorSearch instance.
   * @param docs The Document instances to create the ElasticVectorSearch instance from.
   * @param embeddings The embeddings to use for the documents.
   * @param dbConfig The configuration for the Elasticsearch database.
   * @returns A promise that resolves with the created ElasticVectorSearch instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: ElasticClientArgs): Promise<ElasticVectorSearch>;
  /**
   * Static method to create an ElasticVectorSearch instance from an
   * existing index in the Elasticsearch database. It checks if the index
   * exists, then returns the ElasticVectorSearch instance if it does.
   * @param embeddings The embeddings to use for the documents.
   * @param dbConfig The configuration for the Elasticsearch database.
   * @returns A promise that resolves with the created ElasticVectorSearch instance if the index exists, otherwise it throws an error.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: ElasticClientArgs): Promise<ElasticVectorSearch>;
  private ensureIndexExists;
  private buildMetadataTerms;
  /**
   * Method to check if an index exists in the Elasticsearch database.
   * @returns A promise that resolves with a boolean indicating whether the index exists.
   */
  doesIndexExist(): Promise<boolean>;
  /**
   * Method to delete an index from the Elasticsearch database if it exists.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteIfExists(): Promise<void>;
}
//#endregion
export { ElasticClientArgs, ElasticVectorSearch, HybridRetrievalStrategy, HybridRetrievalStrategyConfig };
//# sourceMappingURL=elasticsearch.d.ts.map