import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Client } from "@opensearch-project/opensearch";

//#region src/vectorstores/opensearch.d.ts
type OpenSearchEngine = "nmslib" | "hnsw";
type OpenSearchSpaceType = "l2" | "cosinesimil" | "ip";
/**
 * Interface defining the options for vector search in OpenSearch. It
 * includes the engine type, space type, and parameters for the HNSW
 * algorithm.
 */
interface VectorSearchOptions {
  readonly engine?: OpenSearchEngine;
  readonly spaceType?: OpenSearchSpaceType;
  readonly m?: number;
  readonly efConstruction?: number;
  readonly efSearch?: number;
  readonly numberOfShards?: number;
  readonly numberOfReplicas?: number;
}
/**
 * Interface defining the arguments required to create an instance of the
 * OpenSearchVectorStore class. It includes the OpenSearch client, index
 * name, and vector search options.
 */
interface OpenSearchClientArgs {
  readonly client: Client;
  readonly vectorFieldName?: string;
  readonly textFieldName?: string;
  readonly metadataFieldName?: string;
  readonly service?: "es" | "aoss";
  readonly indexName?: string;
  readonly vectorSearchOptions?: VectorSearchOptions;
}
/**
 * Type alias for an object. It's used to define filters for OpenSearch
 * queries.
 */
type OpenSearchFilter = {
  [key: string]: FilterTypeValue | (string | number)[] | string | number;
};
/**
 * FilterTypeValue for OpenSearch queries.
 */
interface FilterTypeValue {
  exists?: boolean;
  fuzzy?: string;
  ids?: string[];
  prefix?: string;
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
  regexp?: string;
  terms_set?: Record<string, any>;
  wildcard?: string;
}
/**
 * Class that provides a wrapper around the OpenSearch service for vector
 * search. It provides methods for adding documents and vectors to the
 * OpenSearch index, searching for similar vectors, and managing the
 * OpenSearch index.
 */
declare class OpenSearchVectorStore extends VectorStore {
  FilterType: OpenSearchFilter;
  private readonly client;
  private readonly indexName;
  private readonly isAoss;
  private readonly engine;
  private readonly spaceType;
  private readonly efConstruction;
  private readonly efSearch;
  private readonly numberOfShards;
  private readonly numberOfReplicas;
  private readonly m;
  private readonly vectorFieldName;
  private readonly textFieldName;
  private readonly metadataFieldName;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: OpenSearchClientArgs);
  /**
   * Method to add documents to the OpenSearch index. It first converts the
   * documents to vectors using the embeddings, then adds the vectors to the
   * index.
   * @param documents The documents to be added to the OpenSearch index.
   * @returns Promise resolving to void.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Method to add vectors to the OpenSearch index. It ensures the index
   * exists, then adds the vectors and associated documents to the index.
   * @param vectors The vectors to be added to the OpenSearch index.
   * @param documents The documents associated with the vectors.
   * @param options Optional parameter that can contain the IDs for the documents.
   * @returns Promise resolving to void.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<void>;
  /**
   * Method to perform a similarity search on the OpenSearch index using a
   * query vector. It returns the k most similar documents and their scores.
   * @param query The query vector.
   * @param k The number of similar documents to return.
   * @param filter Optional filter for the OpenSearch query.
   * @returns Promise resolving to an array of tuples, each containing a Document and its score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: OpenSearchFilter | undefined): Promise<[Document, number][]>;
  /**
   * Static method to create a new OpenSearchVectorStore from an array of
   * texts, their metadata, embeddings, and OpenSearch client arguments.
   * @param texts The texts to be converted into documents and added to the OpenSearch index.
   * @param metadatas The metadata associated with the texts. Can be an array of objects or a single object.
   * @param embeddings The embeddings used to convert the texts into vectors.
   * @param args The OpenSearch client arguments.
   * @returns Promise resolving to a new instance of OpenSearchVectorStore.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, args: OpenSearchClientArgs): Promise<OpenSearchVectorStore>;
  /**
   * Static method to create a new OpenSearchVectorStore from an array of
   * Documents, embeddings, and OpenSearch client arguments.
   * @param docs The documents to be added to the OpenSearch index.
   * @param embeddings The embeddings used to convert the documents into vectors.
   * @param dbConfig The OpenSearch client arguments.
   * @returns Promise resolving to a new instance of OpenSearchVectorStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: OpenSearchClientArgs): Promise<OpenSearchVectorStore>;
  /**
   * Static method to create a new OpenSearchVectorStore from an existing
   * OpenSearch index, embeddings, and OpenSearch client arguments.
   * @param embeddings The embeddings used to convert the documents into vectors.
   * @param dbConfig The OpenSearch client arguments.
   * @returns Promise resolving to a new instance of OpenSearchVectorStore.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: OpenSearchClientArgs): Promise<OpenSearchVectorStore>;
  private ensureIndexExists;
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
  buildMetadataTerms(filter: OpenSearchFilter | undefined): object;
  /**
   * Method to check if the OpenSearch index exists.
   * @returns Promise resolving to a boolean indicating whether the index exists.
   */
  doesIndexExist(): Promise<boolean>;
  /**
   * Method to delete the OpenSearch index if it exists.
   * @returns Promise resolving to void.
   */
  deleteIfExists(): Promise<void>;
}
//#endregion
export { OpenSearchClientArgs, OpenSearchVectorStore };
//# sourceMappingURL=opensearch.d.cts.map