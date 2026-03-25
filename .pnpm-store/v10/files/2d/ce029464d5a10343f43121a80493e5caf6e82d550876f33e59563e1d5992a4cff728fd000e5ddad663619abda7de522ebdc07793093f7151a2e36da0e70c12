import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Pool, PoolClient, PoolConfig } from "pg";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/pgvector.d.ts

/**
 * Strict metadata filter type that supports various filtering operations.
 *
 * For simple equality filters, use:
 * ```typescript
 * { key: "value" }
 * ```
 *
 * For advanced filters, use operators:
 * ```typescript
 * {
 *   key: {
 *     in: ["value1", "value2"],           // Match any of these values
 *     notIn: ["value3", "value4"],        // Exclude these values
 *     gt: 10,                             // Greater than (numeric)
 *     gte: 10,                            // Greater than or equal (numeric)
 *     lt: 100,                            // Less than (numeric)
 *     lte: 100,                           // Less than or equal (numeric)
 *     neq: "unwanted",                    // prop doesn't exist or not equal to value)
 *     arrayContains: ["item1", "item2"]   // Array contains any of these values
 *   }
 * }
 * ```
 *
 * You can also mix simple equality and operator filters:
 * ```typescript
 * {
 *   category: "test",                     // Simple equality
 *   score: { gte: 80 },                  // Operator filter
 *   tags: { in: ["test1", "test2"] }           // Another operator filter
 * }
 * ```
 */
type MetadataFilter = Record<string, string | number | boolean | {
  /** Match any of the provided values */
  in?: (string | number | boolean)[];
  /** Exclude any of the provided values */
  notIn?: (string | number | boolean)[];
  /** Array contains any of the provided values */
  arrayContains?: (string | number | boolean)[];
  /** Greater than (for numeric values) */
  gt?: number;
  /** Greater than or equal (for numeric values) */
  gte?: number;
  /** Less than (for numeric values) */
  lt?: number;
  /** Less than or equal (for numeric values) */
  lte?: number;
  /** Not equal to */
  neq?: string | number | boolean;
}>;
type Metadata = Record<string, unknown>;
type DistanceStrategy = "cosine" | "innerProduct" | "euclidean";
/**
 * Interface that defines the arguments required to create a
 * `PGVectorStore` instance. It includes Postgres connection options,
 * table name, filter, and verbosity level.
 */
interface PGVectorStoreArgs {
  postgresConnectionOptions?: PoolConfig;
  pool?: Pool;
  tableName: string;
  collectionTableName?: string;
  collectionName?: string;
  collectionMetadata?: Metadata | null;
  schemaName?: string | null;
  extensionSchemaName?: string | null;
  skipInitializationCheck?: boolean;
  columns?: {
    idColumnName?: string;
    vectorColumnName?: string;
    contentColumnName?: string;
    metadataColumnName?: string;
  };
  filter?: MetadataFilter;
  verbose?: boolean;
  /**
   * The amount of documents to chunk by when
   * adding vectors.
   * @default 500
   */
  chunkSize?: number;
  ids?: string[];
  distanceStrategy?: DistanceStrategy;
  /**
   * Configure how similarity scores are calculated.
   * "distance" returns raw distance values (lower = more similar, default behavior for backward compatibility)
   * "similarity" returns normalized similarity scores (higher = more similar)
   * @default "distance"
   */
  scoreNormalization?: "distance" | "similarity";
}
/**
 * PGVector vector store integration.
 *
 * Setup:
 * Install `@langchain/community` and `pg`.
 *
 * If you wish to generate ids, you should also install the `uuid` package.
 *
 * ```bash
 * npm install @langchain/community pg uuid
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.vectorstores_pgvector.PGVectorStore.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import {
 *   PGVectorStore,
 *   DistanceStrategy,
 * } from "@langchain/community/vectorstores/pgvector";
 *
 * // Or other embeddings
 * import { OpenAIEmbeddings } from "@langchain/openai";
 * import { PoolConfig } from "pg";
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * });
 *
 * // Sample config
 * const config = {
 *   postgresConnectionOptions: {
 *     type: "postgres",
 *     host: "127.0.0.1",
 *     port: 5433,
 *     user: "myuser",
 *     password: "ChangeMe",
 *     database: "api",
 *   } as PoolConfig,
 *   tableName: "testlangchainjs",
 *   columns: {
 *     idColumnName: "id",
 *     vectorColumnName: "vector",
 *     contentColumnName: "content",
 *     metadataColumnName: "metadata",
 *   },
 *   // supported distance strategies: cosine (default), innerProduct, or euclidean
 *   distanceStrategy: "cosine" as DistanceStrategy,
 * };
 *
 * const vectorStore = await PGVectorStore.initialize(embeddings, config);
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
 * const document1 = { pageContent: "foo", metadata: { baz: "bar", num: 4 } };
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
 * <details>
 * <summary><strong>Similarity search with filter operators</strong></summary>
 *
 * Available filter operators: in, notIn, lte, lt, gte, gt, neq
 *
 * ```typescript
 * const resultsWithFilters = await vectorStore.similaritySearch("thud", 1, {
 *   baz: {
 *     in: ["bar", "car"],
 *   },
 *   num: {
 *     lte: 10
 *   }
 * });
 *
 * for (const doc of resultsWithFilters) {
 *   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
 * }
 * // Output: * foo [{"baz":"bar"}]
 * ```
 * </details>
 *
 * <br />
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
declare class PGVectorStore extends VectorStore {
  FilterType: MetadataFilter;
  tableName: string;
  collectionTableName?: string;
  collectionName: string;
  collectionMetadata: Metadata | null;
  schemaName: string | null;
  idColumnName: string;
  vectorColumnName: string;
  contentColumnName: string;
  extensionSchemaName: string | null;
  skipInitializationCheck: boolean;
  metadataColumnName: string;
  filter?: MetadataFilter;
  _verbose?: boolean;
  pool: Pool;
  client?: PoolClient;
  chunkSize: number;
  distanceStrategy?: DistanceStrategy;
  scoreNormalization: "distance" | "similarity";
  _vectorstoreType(): string;
  /**
   * Performs similarity search with both distance and similarity scores returned.
   * This method returns both the raw distance and the normalized similarity score for each result.
   * @param query - Query vector.
   * @param k - Number of most similar documents to return.
   * @param filter - Optional filter to apply to the search.
   * @returns Promise that resolves with an array of tuples, each containing a `Document` and an object with both distance and similarity scores.
   */
  similaritySearchVectorWithScores(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, {
    distance: number;
    similarity: number;
  }][]>;
  /**
   * Converts distance to similarity score based on the distance strategy.
   * @param distance Raw distance value from the database
   * @returns Similarity score (higher = more similar)
   *
   * For cosine distance: similarity = (2 - distance) / 2, keeping values in [0, 1] range
   * For euclidean distance: similarity = 1 / (1 + distance)
   * For innerProduct: similarity = -distance (pgvector returns negative inner product)
   */
  private convertDistanceToSimilarity;
  /**
   * Converts distance to score based on the normalization setting.
   * @param distance Raw distance value from the database
   * @returns Raw distance if scoreNormalization is "distance", otherwise similarity score
   */
  private convertDistanceToScore;
  /**
   * Converts distance to both distance and similarity score, useful when users want access to both values.
   * @param distance Raw distance value from the database
   * @returns Object containing both the raw distance and the similarity score
   */
  private convertDistanceToBoth;
  constructor(embeddings: EmbeddingsInterface, config: PGVectorStoreArgs);
  get computedTableName(): string;
  get computedCollectionTableName(): string;
  get computedOperatorString(): string;
  /**
   * Static method to create a new `PGVectorStore` instance from a
   * connection. It creates a table if one does not exist, and calls
   * `connect` to return a new instance of `PGVectorStore`.
   *
   * @param embeddings - Embeddings instance.
   * @param fields - `PGVectorStoreArgs` instance
   * @param fields.dimensions Number of dimensions in your vector data type. For example, use 1536 for OpenAI's `text-embedding-3-small`. If not set, indexes like HNSW might not be used during query time.
   * @returns A new instance of `PGVectorStore`.
   */
  static initialize(embeddings: EmbeddingsInterface, config: PGVectorStoreArgs & {
    dimensions?: number;
  }): Promise<PGVectorStore>;
  protected _initializeClient(): Promise<void>;
  /**
   * Method to add documents to the vector store. It converts the documents into
   * vectors, and adds them to the store.
   *
   * @param documents - Array of `Document` instances.
   * @param options - Optional arguments for adding documents
   * @returns Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<void>;
  /**
   * Inserts a row for the collectionName provided at initialization if it does not
   * exist and returns the collectionId.
   *
   * @returns The collectionId for the given collectionName.
   */
  getOrCreateCollection(): Promise<string>;
  /**
   * Generates the SQL placeholders for a specific row at the provided index.
   *
   * @param index - The index of the row for which placeholders need to be generated.
   * @param numOfColumns - The number of columns we are inserting data into.
   * @returns The SQL placeholders for the row values.
   */
  private generatePlaceholderForRowAt;
  private buildInsertQuery;
  /**
   * Method to add vectors to the vector store. It converts the vectors into
   * rows and inserts them into the database.
   *
   * @param vectors - Array of vectors.
   * @param documents - Array of `Document` instances.
   * @param options - Optional arguments for adding documents
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<void>;
  private deleteById;
  /**
   * Builds WHERE clause conditions and parameters for metadata filtering.
   *
   * @param filter - The metadata filter object.
   * @param paramOffset - Starting parameter index offset.
   * @returns Object containing whereClauses array and parameters array.
   */
  private buildFilterClauses;
  private deleteByFilter;
  /**
   * Method to delete documents from the vector store. It deletes the
   * documents that match the provided ids or metadata filter. Matches ids
   * exactly and metadata filter according to postgres jsonb containment. Ids and filter
   * are mutually exclusive.
   *
   * @param params - Object containing either an array of ids or a metadata filter object.
   * @returns Promise that resolves when the documents have been deleted.
   * @throws Error if neither ids nor filter are provided, or if both are provided.
   * @example <caption>Delete by ids</caption>
   * await vectorStore.delete({ ids: ["id1", "id2"] });
   * @example <caption>Delete by filter</caption>
   * await vectorStore.delete({ filter: { a: 1, b: 2 } });
   */
  delete(params: {
    ids?: string[];
    filter?: MetadataFilter;
  }): Promise<void>;
  private searchPostgres;
  /**
   * Method to perform a similarity search in the vector store. It returns
   * the `k` most similar documents to the query vector, along with their
   * similarity scores.
   * @param query - Query vector.
   * @param k - Number of most similar documents to return.
   * @param filter - Optional filter to apply to the search.
   * @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Method to ensure the existence of the table in the database. It creates
   * the table if it does not already exist.
   * @param dimensions Number of dimensions in your vector data type. For example, use 1536 for OpenAI's `text-embedding-3-small`. If not set, indexes like HNSW might not be used during query time.
   * @returns Promise that resolves when the table has been ensured.
   */
  ensureTableInDatabase(dimensions?: number): Promise<void>;
  /**
   * Method to ensure the existence of the collection table in the database.
   * It creates the table if it does not already exist.
   *
   * @returns Promise that resolves when the collection table has been ensured.
   */
  ensureCollectionTableInDatabase(): Promise<void>;
  /**
   * Static method to create a new `PGVectorStore` instance from an
   * array of texts and their metadata. It converts the texts into
   * `Document` instances and adds them to the store.
   *
   * @param texts - Array of texts.
   * @param metadatas - Array of metadata objects or a single metadata object.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `PGVectorStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `PGVectorStore`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: PGVectorStoreArgs & {
    dimensions?: number;
  }): Promise<PGVectorStore>;
  /**
   * Static method to create a new `PGVectorStore` instance from an
   * array of `Document` instances. It adds the documents to the store.
   *
   * @param docs - Array of `Document` instances.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `PGVectorStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `PGVectorStore`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: PGVectorStoreArgs & {
    dimensions?: number;
  }): Promise<PGVectorStore>;
  /**
   * Closes all the clients in the pool and terminates the pool.
   *
   * @returns Promise that resolves when all clients are closed and the pool is terminated.
   */
  end(): Promise<void>;
  /**
   * Method to create the HNSW index on the vector column.
   *
   * @param dimensions - Defines the number of dimensions in your vector data type, up to 2000. For example, use 1536 for OpenAI's text-embedding-ada-002 and Amazon's amazon.titan-embed-text-v1 models.
   * @param m - The max number of connections per layer (16 by default). Index build time improves with smaller values, while higher values can speed up search queries.
   * @param efConstruction -  The size of the dynamic candidate list for constructing the graph (64 by default). A higher value can potentially improve the index quality at the cost of index build time.
   * @param distanceFunction -  The distance function name you want to use, is automatically selected based on the distanceStrategy.
   * @param namespace -  The namespace is used to create the index with a specific name. This is useful when you want to create multiple indexes on the same database schema (within the same schema in PostgreSQL, the index name must be unique across all tables).
   * @returns Promise that resolves with the query response of creating the index.
   */
  createHnswIndex(config: {
    dimensions: number;
    m?: number;
    efConstruction?: number;
    distanceFunction?: string;
    namespace?: string;
  }): Promise<void>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND
   * diversity among selected documents.
   * @param query Text to look up documents similar to.
   * @param options.k=4 Number of documents to return.
   * @param options.fetchK=20 Number of documents to fetch before passing to
   *     the MMR algorithm.
   * @param options.lambda=0.5 Number between 0 and 1 that determines the
   *     degree of diversity among the results, where 0 corresponds to maximum
   *     diversity and 1 to minimum diversity.
   * @returns List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
}
//#endregion
export { DistanceStrategy, PGVectorStore, PGVectorStoreArgs };
//# sourceMappingURL=pgvector.d.ts.map