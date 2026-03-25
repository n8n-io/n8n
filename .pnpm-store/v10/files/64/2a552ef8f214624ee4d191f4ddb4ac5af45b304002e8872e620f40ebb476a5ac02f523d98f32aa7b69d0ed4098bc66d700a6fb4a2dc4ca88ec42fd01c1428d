import { SchemaFieldTypes, SearchOptions, VectorAlgorithms, createClient, createCluster } from "redis";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { EmbeddingsInterface } from "@langchain/core/embeddings";

//#region src/vectorstores.d.ts

// Adapated from internal redis types which aren't exported
/**
 * Type for creating a schema vector field. It includes the algorithm,
 * distance metric, and initial capacity.
 */
type CreateSchemaVectorField<T extends VectorAlgorithms, A extends Record<string, unknown>> = {
  ALGORITHM: T;
  DISTANCE_METRIC: "L2" | "IP" | "COSINE";
  INITIAL_CAP?: number;
} & A;
/**
 * Type for creating a flat schema vector field. It extends
 * CreateSchemaVectorField with a block size property.
 */
type CreateSchemaFlatVectorField = CreateSchemaVectorField<VectorAlgorithms.FLAT, {
  BLOCK_SIZE?: number;
}>;
/**
 * Type for creating a HNSW schema vector field. It extends
 * CreateSchemaVectorField with M, EF_CONSTRUCTION, and EF_RUNTIME
 * properties.
 */
type CreateSchemaHNSWVectorField = CreateSchemaVectorField<VectorAlgorithms.HNSW, {
  M?: number;
  EF_CONSTRUCTION?: number;
  EF_RUNTIME?: number;
}>;
type CreateIndexOptions = NonNullable<Parameters<ReturnType<typeof createClient>["ft"]["create"]>[3]>;
type RedisSearchLanguages = `${NonNullable<CreateIndexOptions["LANGUAGE"]>}`;
type RedisVectorStoreIndexOptions = Omit<CreateIndexOptions, "LANGUAGE"> & {
  LANGUAGE?: RedisSearchLanguages;
};
/**
 * Interface for custom schema field definitions
 */
interface CustomSchemaField {
  type: SchemaFieldTypes;
  required?: boolean;
  SORTABLE?: boolean | "UNF";
  NOINDEX?: boolean;
  SEPARATOR?: string; // For TAG fields
  CASESENSITIVE?: true; // For TAG fields (Redis expects true, not boolean)
  NOSTEM?: true; // For TEXT fields (Redis expects true, not boolean)
  WEIGHT?: number; // For TEXT fields
}
/**
 * Interface for the configuration of the RedisVectorStore. It includes
 * the Redis client, index name, index options, key prefix, content key,
 * metadata key, vector key, filter and ttl.
 */
interface RedisVectorStoreConfig {
  redisClient: ReturnType<typeof createClient> | ReturnType<typeof createCluster>;
  indexName: string;
  indexOptions?: CreateSchemaFlatVectorField | CreateSchemaHNSWVectorField;
  createIndexOptions?: Omit<RedisVectorStoreIndexOptions, "PREFIX">; // PREFIX must be set with keyPrefix
  keyPrefix?: string;
  contentKey?: string;
  metadataKey?: string;
  vectorKey?: string;
  filter?: RedisVectorStoreFilterType;
  ttl?: number; // ttl in second
  customSchema?: Record<string, CustomSchemaField>; // Custom schema fields for metadata
}
/**
 * Interface for the options when adding documents to the
 * RedisVectorStore. It includes keys and batch size.
 */
interface RedisAddOptions {
  keys?: string[];
  batchSize?: number;
}
/**
 * Type for the filter used in the RedisVectorStore. It is an array of
 * strings.
 * If a string is passed instead of an array the value is used directly, this
 * allows custom filters to be passed.
 */
type RedisVectorStoreFilterType = string[] | string;
/**
 * Class representing a RedisVectorStore. It extends the VectorStore class
 * and includes methods for adding documents and vectors, performing
 * similarity searches, managing the index, and more.
 */
declare class RedisVectorStore extends VectorStore {
  FilterType: RedisVectorStoreFilterType;
  private redisClient;
  indexName: string;
  indexOptions: CreateSchemaFlatVectorField | CreateSchemaHNSWVectorField;
  createIndexOptions: CreateIndexOptions;
  keyPrefix: string;
  contentKey: string;
  metadataKey: string;
  vectorKey: string;
  filter?: RedisVectorStoreFilterType;
  ttl?: number;
  customSchema?: Record<string, CustomSchemaField>;
  _vectorstoreType(): string;
  /**
   * Validates metadata against the custom schema if defined
   * @param metadata The metadata object to validate
   * @throws Error if validation fails
   */
  private validateMetadata;
  constructor(embeddings: EmbeddingsInterface, _dbConfig: RedisVectorStoreConfig);
  /**
   * Method for adding documents to the RedisVectorStore. It first converts
   * the documents to texts and then adds them as vectors.
   * @param documents The documents to add.
   * @param options Optional parameters for adding the documents.
   * @returns A promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[], options?: RedisAddOptions): Promise<void>;
  /**
   * Method for adding vectors to the RedisVectorStore. It checks if the
   * index exists and creates it if it doesn't, then adds the vectors in
   * batches.
   * @param vectors The vectors to add.
   * @param documents The documents associated with the vectors.
   * @param keys Optional keys for the vectors.
   * @param batchSize The size of the batches in which to add the vectors. Defaults to 1000.
   * @returns A promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[], {
    keys,
    batchSize
  }?: RedisAddOptions): Promise<void>;
  /**
   * Method for performing a similarity search in the RedisVectorStore. It
   * returns the documents and their scores.
   * @param query The query vector.
   * @param k The number of nearest neighbors to return.
   * @param filter Optional filter to apply to the search.
   * @returns A promise that resolves to an array of documents and their scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: RedisVectorStoreFilterType): Promise<[Document, number][]>;
  /**
   * Method for performing a similarity search with custom metadata filtering.
   * Uses the custom schema fields for efficient filtering.
   * @param query The query vector.
   * @param k The number of nearest neighbors to return.
   * @param metadataFilter Object with metadata field filters using custom schema.
   * @returns A promise that resolves to an array of documents and their scores.
   */
  similaritySearchVectorWithScoreAndMetadata(query: number[], k: number, metadataFilter?: Record<string, unknown>): Promise<[Document, number][]>;
  /**
   * Static method for creating a new instance of RedisVectorStore from
   * texts. It creates documents from the texts and metadata, then adds them
   * to the RedisVectorStore.
   * @param texts The texts to add.
   * @param metadatas The metadata associated with the texts.
   * @param embeddings The embeddings to use.
   * @param dbConfig The configuration for the RedisVectorStore.
   * @param docsOptions The document options to use.
   * @returns A promise that resolves to a new instance of RedisVectorStore.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: RedisVectorStoreConfig, docsOptions?: RedisAddOptions): Promise<RedisVectorStore>;
  /**
   * Static method for creating a new instance of RedisVectorStore from
   * documents. It adds the documents to the RedisVectorStore.
   * @param docs The documents to add.
   * @param embeddings The embeddings to use.
   * @param dbConfig The configuration for the RedisVectorStore.
   * @param docsOptions The document options to use.
   * @returns A promise that resolves to a new instance of RedisVectorStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: RedisVectorStoreConfig, docsOptions?: RedisAddOptions): Promise<RedisVectorStore>;
  /**
   * Method for checking if an index exists in the RedisVectorStore.
   * @returns A promise that resolves to a boolean indicating whether the index exists.
   */
  checkIndexExists(): Promise<boolean>;
  /**
   * Method for creating an index in the RedisVectorStore. If the index
   * already exists, it does nothing.
   * @param dimensions The dimensions of the index
   * @returns A promise that resolves when the index has been created.
   */
  createIndex(dimensions?: number): Promise<void>;
  /**
   * Method for dropping an index from the RedisVectorStore.
   * @param deleteDocuments Optional boolean indicating whether to drop the associated documents.
   * @returns A promise that resolves to a boolean indicating whether the index was dropped.
   */
  dropIndex(deleteDocuments?: boolean): Promise<boolean>;
  /**
   * Deletes vectors from the vector store.
   *
   * Supports two deletion modes:
   * - Delete all documents by dropping the entire index and recreating it
   * - Delete specific documents by their IDs using Redis DEL operation
   *
   * @param params - The deletion parameters. Must be one of:
   *   - `{ deleteAll: boolean }` - If true, drops the entire index and all associated documents
   *   - `{ ids: string[] }` - Array of document IDs to delete. IDs will be automatically prefixed with the configured keyPrefix
   * @returns A promise that resolves when the deletion operation is complete
   * @throws {Error} Throws an error if invalid parameters are provided (neither deleteAll nor ids specified)
   *
   * @example
   * Delete all documents:
   * ```typescript
   * await vectorStore.delete({ deleteAll: true });
   * ```
   *
   * @example
   * Delete specific documents by ID:
   * ```typescript
   * await vectorStore.delete({ ids: ['doc1', 'doc2', 'doc3'] });
   * ```
   */
  delete(params: {
    deleteAll: boolean;
  } | {
    ids: string[];
  }): Promise<void>;
  private buildQuery;
  /**
   * Builds a query with custom metadata field filtering
   * @param query The query vector
   * @param k Number of results to return
   * @param metadataFilter Object with metadata field filters
   * @returns Query string and search options
   */
  buildCustomQuery(query: number[], k: number, metadataFilter?: Record<string, unknown>): [string, SearchOptions];
  private prepareFilter;
  /**
   * Escapes all '-', ':', and '"' characters.
   * RediSearch considers these all as special characters, so we need
   * to escape them
   * @see https://redis.io/docs/stack/search/reference/query_syntax
   *
   * @param str
   * @returns
   */
  private escapeSpecialChars;
  /**
   * Unescapes all '-', ':', and '"' characters, returning the original string
   *
   * @param str
   * @returns
   */
  private unEscapeSpecialChars;
  /**
   * Converts the vector to the buffer Redis needs to
   * correctly store an embedding
   *
   * @param vector
   * @returns Buffer
   */
  private getFloat32Buffer;
}
//#endregion
export { CreateSchemaFlatVectorField, CreateSchemaHNSWVectorField, CreateSchemaVectorField, CustomSchemaField, RedisAddOptions, RedisSearchLanguages, RedisVectorStore, RedisVectorStoreConfig, RedisVectorStoreFilterType, RedisVectorStoreIndexOptions };
//# sourceMappingURL=vectorstores.d.ts.map