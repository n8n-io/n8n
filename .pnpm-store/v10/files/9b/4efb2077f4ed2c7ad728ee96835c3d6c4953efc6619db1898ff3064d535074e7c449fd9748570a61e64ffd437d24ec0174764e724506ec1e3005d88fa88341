import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/myscale.d.ts

/**
 * Arguments for the MyScaleStore class, which include the host, port,
 * protocol, username, password, index type, index parameters, column map,
 * database, table, and metric.
 */
interface MyScaleLibArgs {
  host: string;
  port: string | number;
  protocol?: string;
  username: string;
  password: string;
  indexType?: string;
  indexParam?: Record<string, string>;
  columnMap?: ColumnMap;
  database?: string;
  table?: string;
  metric?: metric;
}
/**
 * Mapping of columns in the MyScale database.
 */
interface ColumnMap {
  id: string;
  text: string;
  vector: string;
  metadata: string;
}
/**
 * Type of metric used in the MyScale database.
 */
type metric = "L2" | "Cosine" | "IP";
/**
 * Type for filtering search results in the MyScale database.
 */
interface MyScaleFilter {
  whereStr: string;
}
/**
 * Class for interacting with the MyScale database. It extends the
 * VectorStore class and provides methods for adding vectors and
 * documents, searching for similar vectors, and creating instances from
 * texts or documents.
 */
declare class MyScaleStore extends VectorStore {
  FilterType: MyScaleFilter;
  private client;
  private indexType;
  private indexParam;
  private columnMap;
  private database;
  private table;
  private metric;
  private isInitialized;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: MyScaleLibArgs);
  /**
   * Method to add vectors to the MyScale database.
   * @param vectors The vectors to add.
   * @param documents The documents associated with the vectors.
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Method to add documents to the MyScale database.
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
   * Static method to create an instance of MyScaleStore from texts.
   * @param texts The texts to use.
   * @param metadatas The metadata associated with the texts.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the MyScaleStore.
   * @returns Promise that resolves with a new instance of MyScaleStore.
   */
  static fromTexts(texts: string[], metadatas: object | object[], embeddings: EmbeddingsInterface, args: MyScaleLibArgs): Promise<MyScaleStore>;
  /**
   * Static method to create an instance of MyScaleStore from documents.
   * @param docs The documents to use.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the MyScaleStore.
   * @returns Promise that resolves with a new instance of MyScaleStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, args: MyScaleLibArgs): Promise<MyScaleStore>;
  /**
   * Static method to create an instance of MyScaleStore from an existing
   * index.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the MyScaleStore.
   * @returns Promise that resolves with a new instance of MyScaleStore.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, args: MyScaleLibArgs): Promise<MyScaleStore>;
  private initialize;
  /**
   * Method to build an SQL query for inserting vectors and documents into
   * the MyScale database.
   * @param vectors The vectors to insert.
   * @param documents The documents to insert.
   * @returns The SQL query string.
   */
  private buildInsertQuery;
  private escapeString;
  /**
   * Method to build an SQL query for searching for similar vectors in the
   * MyScale database.
   * @param query The query vector.
   * @param k The number of similar vectors to return.
   * @param filter Optional filter for the search results.
   * @returns The SQL query string.
   */
  private buildSearchQuery;
}
//#endregion
export { ColumnMap, MyScaleFilter, MyScaleLibArgs, MyScaleStore, metric };
//# sourceMappingURL=myscale.d.ts.map