import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Pool, PoolConfig } from "mariadb";

//#region src/vectorstores/mariadb.d.ts
type Metadata = Record<string, unknown>;
type DistanceStrategy = "COSINE" | "EUCLIDEAN";
/**
 * Interface that defines the arguments required to create a
 * `MariaDBStore` instance. It includes MariaDB connection options,
 * table name and verbosity level.
 */
interface MariaDBStoreArgs {
  connectionOptions?: PoolConfig;
  pool?: Pool;
  tableName?: string;
  collectionTableName?: string;
  collectionName?: string;
  collectionMetadata?: Metadata | null;
  schemaName?: string | null;
  columns?: {
    idColumnName?: string;
    vectorColumnName?: string;
    contentColumnName?: string;
    metadataColumnName?: string;
  };
  verbose?: boolean;
  /**
   * The amount of documents to chunk by when
   * adding vectors.
   * @default 500
   */
  chunkSize?: number;
  ids?: string[];
  distanceStrategy?: DistanceStrategy;
}
/**
 * MariaDB vector store integration.
 *
 * Setup:
 * Install `@langchain/community` and `mariadb`.
 *
 * If you wish to generate ids, you should also install the `uuid` package.
 *
 * ```bash
 * npm install @langchain/community mariadb uuid
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.vectorstores_mariadb.MariaDB.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import {
 *   MariaDBStore,
 *   DistanceStrategy,
 * } from "@langchain/community/vectorstores/mariadb";
 *
 * // Or other embeddings
 * import { OpenAIEmbeddings } from "@langchain/openai";
 * import { PoolConfig } from "mariadb";
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * });
 *
 * // Sample config
 * const config = {
 *   connectionOptions: {
 *     host: "127.0.0.1",
 *     port: 3306,
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
 *   // supported distance strategies: COSINE (default) or EUCLIDEAN
 *   distanceStrategy: "COSINE" as DistanceStrategy,
 * };
 *
 * const vectorStore = await MariaDBStore.initialize(embeddings, config);
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
 * const resultsWithFilter = await vectorStore.similaritySearch("thud", 1, {"country": "BG"});
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
declare class MariaDBStore extends VectorStore {
  tableName: string;
  collectionTableName?: string;
  collectionName: string;
  collectionId?: string;
  collectionMetadata: Metadata | null;
  schemaName: string | null;
  idColumnName: string;
  vectorColumnName: string;
  contentColumnName: string;
  metadataColumnName: string;
  _verbose?: boolean;
  pool: Pool;
  chunkSize: number;
  distanceStrategy: DistanceStrategy;
  constructor(embeddings: EmbeddingsInterface, config: MariaDBStoreArgs);
  get computedTableName(): string;
  get computedCollectionTableName(): string;
  /**
   * Escape identifier
   *
   * @param identifier identifier value
   * @param alwaysQuote must identifier be quoted if not required
   */
  private escapeId;
  private printable;
  /**
   * Static method to create a new `MariaDBStore` instance from a
   * connection. It creates a table if one does not exist, and calls
   * `connect` to return a new instance of `MariaDBStore`.
   *
   * @param embeddings - Embeddings instance.
   * @param fields - `MariaDBStoreArgs` instance
   * @param fields.dimensions Number of dimensions in your vector data type. default to 1536.
   * @returns A new instance of `MariaDBStore`.
   */
  static initialize(embeddings: EmbeddingsInterface, config: MariaDBStoreArgs & {
    dimensions?: number;
  }): Promise<MariaDBStore>;
  /**
   * Static method to create a new `MariaDBStore` instance from an
   * array of texts and their metadata. It converts the texts into
   * `Document` instances and adds them to the store.
   *
   * @param texts - Array of texts.
   * @param metadatas - Array of metadata objects or a single metadata object.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `MariaDBStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `MariaDBStore`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: MariaDBStoreArgs & {
    dimensions?: number;
  }): Promise<MariaDBStore>;
  /**
   * Static method to create a new `MariaDBStore` instance from an
   * array of `Document` instances. It adds the documents to the store.
   *
   * @param docs - Array of `Document` instances.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `MariaDBStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `MariaDBStore`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: MariaDBStoreArgs & {
    dimensions?: number;
  }): Promise<MariaDBStore>;
  _vectorstoreType(): string;
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
  private loadCollectionId;
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
  /**
   * Convert float array to binary value
   * @param vector embedding value
   * @private
   */
  private getFloat32Buffer;
  /**
   * Method to delete documents from the vector store. It deletes the
   * documents that match the provided ids
   *
   * @param ids - array of ids
   * @returns Promise that resolves when the documents have been deleted.
   * @example
   * await vectorStore.delete(["id1", "id2"]);
   */
  delete(params: {
    ids?: string[];
    filter?: Record<string, unknown>;
  }): Promise<void>;
  private filterConverter;
  private subFilterConverter;
  /**
   * Method to perform a similarity search in the vector store. It returns
   * the `k` most similar documents to the query vector, along with their
   * similarity scores.
   *
   * @param query - Query vector.
   * @param k - Number of most similar documents to return.
   * @param filter - Optional filter to apply to the search.
   * @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: Record<string, unknown>): Promise<[Document, number][]>;
  /**
   * Method to ensure the existence of the table in the database. It creates
   * the table if it does not already exist.
   * @param dimensions Number of dimensions in your vector data type. Default to 1536.
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
   * Close the pool.
   *
   * @returns Promise that resolves when the pool is terminated.
   */
  end(): Promise<void>;
}
//#endregion
export { DistanceStrategy, MariaDBStore, MariaDBStoreArgs };
//# sourceMappingURL=mariadb.d.cts.map