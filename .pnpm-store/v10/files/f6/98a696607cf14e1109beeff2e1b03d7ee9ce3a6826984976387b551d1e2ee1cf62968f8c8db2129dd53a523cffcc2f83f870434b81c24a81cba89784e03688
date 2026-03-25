import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/neon.d.ts
type Metadata = Record<string, string | number | Record<"in", string[]>>;
/**
 * Interface that defines the arguments required to create a
 * `NeonPostgres` instance. It includes Postgres connection options,
 * table name, filter, and verbosity level.
 */
interface NeonPostgresArgs {
  connectionString: string;
  tableName?: string;
  schemaName?: string;
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
 * Class that provides an interface to a Neon Postgres database. It
 * extends the `VectorStore` base class and implements methods for adding
 * documents and vectors, performing similarity searches, and ensuring the
 * existence of a table in the database.
 */
declare class NeonPostgres extends VectorStore {
  FilterType: Metadata;
  tableName: string;
  schemaName?: string;
  idColumnName: string;
  vectorColumnName: string;
  contentColumnName: string;
  metadataColumnName: string;
  filter?: Metadata;
  _verbose?: boolean;
  neonConnectionString: string;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, config: NeonPostgresArgs);
  get computedTableName(): string;
  /**
   * Static method to create a new `NeonPostgres` instance from a
   * connection. It creates a table if one does not exist.
   *
   * @param embeddings - Embeddings instance.
   * @param fields - `NeonPostgresArgs` instance.
   * @returns A new instance of `NeonPostgres`.
   */
  static initialize(embeddings: EmbeddingsInterface, config: NeonPostgresArgs): Promise<NeonPostgres>;
  /**
   * Constructs the SQL query for inserting rows into the specified table.
   *
   * @param rows - The rows of data to be inserted, consisting of values and records.
   * @param chunkIndex - The starting index for generating query placeholders based on chunk positioning.
   * @returns The complete SQL INSERT INTO query string.
   */
  protected runInsertQuery(rows: (string | Record<string, any>)[][], useIdColumn: boolean): Promise<Record<string, any>[]>;
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
  }): Promise<string[]>;
  /**
   * Method to delete documents from the vector store. It deletes the
   * documents that match the provided ids.
   *
   * @param ids - Array of document ids.
   * @param deleteAll - Boolean to delete all documents.
   * @returns Promise that resolves when the documents have been deleted.
   */
  delete(params: {
    ids?: string[];
    deleteAll?: boolean;
  }): Promise<void>;
  /**
   * Method to ensure the existence of the table to store vectors in
   * the database. It creates the table if it does not already exist.
   *
   * @returns Promise that resolves when the table has been ensured.
   */
  ensureTableInDatabase(): Promise<void>;
  /**
   * Static method to create a new `NeonPostgres` instance from an
   * array of texts and their metadata. It converts the texts into
   * `Document` instances and adds them to the store.
   *
   * @param texts - Array of texts.
   * @param metadatas - Array of metadata objects or a single metadata object.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `NeonPostgresArgs` instance.
   * @returns Promise that resolves with a new instance of `NeonPostgresArgs`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: NeonPostgresArgs): Promise<NeonPostgres>;
  /**
   * Static method to create a new `NeonPostgres` instance from an
   * array of `Document` instances. It adds the documents to the store.
   *
   * @param docs - Array of `Document` instances.
   * @param embeddings - Embeddings instance.
   * @param dbConfig - `NeonPostgreseArgs` instance.
   * @returns Promise that resolves with a new instance of `NeonPostgres`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: NeonPostgresArgs): Promise<NeonPostgres>;
}
//#endregion
export { NeonPostgres, NeonPostgresArgs };
//# sourceMappingURL=neon.d.ts.map