import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/clickhouse.d.ts

/**
 * Arguments for the ClickHouseStore class, which include the host, port,
 * protocol, username, password, index type, index parameters,
 * index query params, column map, database, table.
 */
interface ClickHouseLibArgs {
  host: string;
  port: string | number;
  protocol?: string;
  username: string;
  password: string;
  indexType?: string;
  indexParam?: string | Record<string, number>;
  indexQueryParams?: Record<string, string>;
  columnMap?: ColumnMap;
  database?: string;
  table?: string;
}
/**
 * Mapping of columns in the ClickHouse database.
 */
interface ColumnMap {
  id: string;
  uuid: string;
  document: string;
  embedding: string;
  metadata: string;
}
/**
 * Type for filtering search results in the ClickHouse database.
 */
interface ClickHouseFilter {
  whereStr: string;
}
/**
 * Class for interacting with the ClickHouse database. It extends the
 * VectorStore class and provides methods for adding vectors and
 * documents, searching for similar vectors, and creating instances from
 * texts or documents.
 */
declare class ClickHouseStore extends VectorStore {
  FilterType: ClickHouseFilter;
  private client;
  private indexType;
  private indexParam;
  private indexQueryParams;
  private columnMap;
  private database;
  private table;
  private isInitialized;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: ClickHouseLibArgs);
  /**
   * Method to add vectors to the ClickHouse database.
   * @param vectors The vectors to add.
   * @param documents The documents associated with the vectors.
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Method to add documents to the ClickHouse database.
   * @param documents The documents to add.
   * @returns Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Method to search for vectors that are similar to a given query vector.
   * @param query The query vector.
   * @param k The number of similar vectors to return.
   * @param filter Optional filter for the search results.
   * @returns Promise that resolves with an array of tuples, each containing a Document and a score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Static method to create an instance of ClickHouseStore from texts.
   * @param texts The texts to use.
   * @param metadatas The metadata associated with the texts.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the ClickHouseStore.
   * @returns Promise that resolves with a new instance of ClickHouseStore.
   */
  static fromTexts(texts: string[], metadatas: object | object[], embeddings: EmbeddingsInterface, args: ClickHouseLibArgs): Promise<ClickHouseStore>;
  /**
   * Static method to create an instance of ClickHouseStore from documents.
   * @param docs The documents to use.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the ClickHouseStore.
   * @returns Promise that resolves with a new instance of ClickHouseStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, args: ClickHouseLibArgs): Promise<ClickHouseStore>;
  /**
   * Static method to create an instance of ClickHouseStore from an existing
   * index.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the ClickHouseStore.
   * @returns Promise that resolves with a new instance of ClickHouseStore.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, args: ClickHouseLibArgs): Promise<ClickHouseStore>;
  private initialize;
  /**
   * Method to build an SQL query for inserting vectors and documents into
   * the ClickHouse database.
   * @param vectors The vectors to insert.
   * @param documents The documents to insert.
   * @returns The SQL query string.
   */
  private buildInsertQuery;
  private escapeString;
  /**
   * Method to build an SQL query for searching for similar vectors in the
   * ClickHouse database.
   * @param query The query vector.
   * @param k The number of similar vectors to return.
   * @param filter Optional filter for the search results.
   * @returns The SQL query string.
   */
  private buildSearchQuery;
}
//#endregion
export { ClickHouseFilter, ClickHouseLibArgs, ClickHouseStore, ColumnMap };
//# sourceMappingURL=clickhouse.d.ts.map