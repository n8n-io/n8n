import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import * as _vercel_postgres0 from "@vercel/postgres";
import { VercelPool, VercelPoolClient, VercelPostgresPoolConfig } from "@vercel/postgres";

//#region src/vectorstores/vercel_postgres.d.ts
type Metadata = Record<string, string | number | Record<"in", string[]>>;
/**
 * Interface that defines the arguments required to create a
 * `VercelPostgres` instance. It includes Postgres connection options,
 * table name, filter, and verbosity level.
 */
interface VercelPostgresFields {
  pool: VercelPool;
  client: VercelPoolClient;
  tableName?: string;
  columns?: {
    idColumnName?: string;
    vectorColumnName?: string;
    contentColumnName?: string;
    metadataColumnName?: string;
  };
  filter?: Metadata;
  verbose?: boolean;
}
/**
 * Class that provides an interface to a Vercel Postgres vector database. It
 * extends the `VectorStore` base class and implements methods for adding
 * documents and vectors and performing similarity searches.
 */
declare class VercelPostgres extends VectorStore {
  FilterType: Metadata;
  tableName: string;
  idColumnName: string;
  vectorColumnName: string;
  contentColumnName: string;
  metadataColumnName: string;
  filter?: Metadata;
  _verbose?: boolean;
  pool: VercelPool;
  client: VercelPoolClient;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, config: VercelPostgresFields);
  /**
   * Static method to create a new `VercelPostgres` instance from a
   * connection. It creates a table if one does not exist, and calls
   * `connect` to return a new instance of `VercelPostgres`.
   *
   * @param embeddings - Embeddings instance.
   * @param fields - `VercelPostgres` configuration options.
   * @returns A new instance of `VercelPostgres`.
   */
  static initialize(embeddings: EmbeddingsInterface, config?: Partial<VercelPostgresFields> & {
    postgresConnectionOptions?: VercelPostgresPoolConfig;
  }): Promise<VercelPostgres>;
  /**
   * Method to add documents to the vector store. It converts the documents into
   * vectors, and adds them to the store.
   *
   * @param documents - Array of `Document` instances.
   * @returns Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Generates the SQL placeholders for a specific row at the provided index.
   *
   * @param index - The index of the row for which placeholders need to be generated.
   * @returns The SQL placeholders for the row values.
   */
  protected generatePlaceholderForRowAt(row: (string | Record<string, any>)[], index: number): string;
  /**
   * Constructs the SQL query for inserting rows into the specified table.
   *
   * @param rows - The rows of data to be inserted, consisting of values and records.
   * @param chunkIndex - The starting index for generating query placeholders based on chunk positioning.
   * @returns The complete SQL INSERT INTO query string.
   */
  protected runInsertQuery(rows: (string | Record<string, any>)[][], useIdColumn: boolean): Promise<_vercel_postgres0.QueryResult<any>>;
  /**
   * Method to add vectors to the vector store. It converts the vectors into
   * rows and inserts them into the database.
   *
   * @param vectors - Array of vectors.
   * @param documents - Array of `Document` instances.
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
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
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  delete(params: {
    ids?: string[];
    deleteAll?: boolean;
  }): Promise<void>;
  /**
   * Method to ensure the existence of the table in the database. It creates
   * the table if it does not already exist.
   *
   * @returns Promise that resolves when the table has been ensured.
   */
  ensureTableInDatabase(): Promise<void>;
  /**
   * Static method to create a new `VercelPostgres` instance from an
   * array of texts and their metadata. It converts the texts into
   * `Document` instances and adds them to the store.
   *
   * @param texts - Array of texts.
   * @param metadatas - Array of metadata objects or a single metadata object.
   * @param embeddings - Embeddings instance.
   * @param fields - `VercelPostgres` configuration options.
   * @returns Promise that resolves with a new instance of `VercelPostgres`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig?: Partial<VercelPostgresFields> & {
    postgresConnectionOptions?: VercelPostgresPoolConfig;
  }): Promise<VercelPostgres>;
  /**
   * Static method to create a new `VercelPostgres` instance from an
   * array of `Document` instances. It adds the documents to the store.
   *
   * @param docs - Array of `Document` instances.
   * @param embeddings - Embeddings instance.
   * @param fields - `VercelPostgres` configuration options.
   * @returns Promise that resolves with a new instance of `VercelPostgres`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig?: Partial<VercelPostgresFields> & {
    postgresConnectionOptions?: VercelPostgresPoolConfig;
  }): Promise<VercelPostgres>;
  /**
   * Closes all the clients in the pool and terminates the pool.
   *
   * @returns Promise that resolves when all clients are closed and the pool is terminated.
   */
  end(): Promise<void>;
}
//#endregion
export { VercelPostgres, VercelPostgresFields };
//# sourceMappingURL=vercel_postgres.d.cts.map