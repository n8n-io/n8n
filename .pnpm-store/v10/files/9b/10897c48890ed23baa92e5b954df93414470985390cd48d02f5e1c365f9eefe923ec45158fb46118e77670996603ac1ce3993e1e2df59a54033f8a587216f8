import { Document, DocumentInterface } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Pool, PoolOptions } from "mysql2/promise";
import { Callbacks } from "@langchain/core/callbacks/manager";

//#region src/vectorstores/singlestore.d.ts
type Metadata = Record<string, any>;
type DistanceMetrics = "DOT_PRODUCT" | "EUCLIDEAN_DISTANCE";
type SearchStrategy = "VECTOR_ONLY" | "TEXT_ONLY" | "FILTER_BY_TEXT" | "FILTER_BY_VECTOR" | "WEIGHTED_SUM";
interface ConnectionOptions extends PoolOptions {}
type ConnectionWithUri = {
  connectionOptions?: never;
  connectionURI: string;
};
type ConnectionWithOptions = {
  connectionURI?: never;
  connectionOptions: ConnectionOptions;
};
type ConnectionConfig = ConnectionWithUri | ConnectionWithOptions;
type SearchConfig = {
  searchStrategy?: SearchStrategy;
  filterThreshold?: number;
  textWeight?: number;
  vectorWeight?: number;
  vectorselectCountMultiplier?: number;
};
type SingleStoreVectorStoreConfig = ConnectionConfig & {
  tableName?: string;
  idColumnName?: string;
  contentColumnName?: string;
  vectorColumnName?: string;
  metadataColumnName?: string;
  distanceMetric?: DistanceMetrics;
  useVectorIndex?: boolean;
  vectorIndexName?: string;
  vectorIndexOptions?: Metadata;
  vectorSize?: number;
  useFullTextIndex?: boolean;
  searchConfig?: SearchConfig;
};
/**
 * Class for interacting with SingleStoreDB, a high-performance
 * distributed SQL database. It provides vector storage and vector
 * functions.
 */
declare class SingleStoreVectorStore extends VectorStore {
  connectionPool: Pool;
  tableName: string;
  idColumnName: string;
  contentColumnName: string;
  vectorColumnName: string;
  metadataColumnName: string;
  distanceMetric: DistanceMetrics;
  useVectorIndex: boolean;
  vectorIndexName: string;
  vectorIndexOptions: Metadata;
  vectorSize: number;
  useFullTextIndex: boolean;
  searchConfig: SearchConfig;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, config: SingleStoreVectorStoreConfig);
  /**
   * Creates a new table in the SingleStoreDB database if it does not
   * already exist.
   */
  createTableIfNotExists(): Promise<void>;
  /**
   * Ends the connection to the SingleStoreDB database.
   */
  end(): Promise<void>;
  /**
   * Sets the search configuration for the SingleStoreVectorStore instance.
   * @param config A SearchConfig object.
   */
  setSearchConfig(config: SearchConfig): Promise<void>;
  /**
   * Adds new documents to the SingleStoreDB database.
   * @param documents An array of Document objects.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds new vectors to the SingleStoreDB database.
   * @param vectors An array of vectors.
   * @param documents An array of Document objects.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   *
   * Performs a similarity search on the texts stored in the SingleStoreDB
   * using the specified search strategy and distance metric.
   * @param query A string representing the query text.
   * @param vector An array of numbers representing the query vector.
   * @param k The number of nearest neighbors to return.
   * @param filter Optional metadata to filter the texts by.
   * @returns Top matching documents with score
   */
  similaritySearchTextAndVectorWithScore(query: string, vector: number[], k: number, filter?: Metadata): Promise<[Document, number][]>;
  /**
   * Performs a similarity search on the texts stored in the SingleStoreDB
   * @param query A string representing the query text.
   * @param k The number of nearest neighbors to return. By default, it is 4.
   * @param filter Optional metadata to filter the texts by.
   * @param _callbacks - Callbacks object, not used in this implementation.
   * @returns Top matching documents
   */
  similaritySearch(query: string, k?: number, filter?: Metadata, _callbacks?: Callbacks | undefined): Promise<DocumentInterface<Metadata>[]>;
  /**
   * Performs a similarity search on the texts stored in the SingleStoreDB
   * @param query A string representing the query text.
   * @param k The number of nearest neighbors to return. By default, it is 4.
   * @param filter Optional metadata to filter the texts by.
   * @param _callbacks
   * @returns Top matching documents with score
   */
  similaritySearchWithScore(query: string, k?: number, filter?: Metadata, _callbacks?: Callbacks | undefined): Promise<[DocumentInterface<Metadata>, number][]>;
  /**
   * Performs a similarity search on the vectors stored in the SingleStoreDB
   * database.
   * @param query An array of numbers representing the query vector.
   * @param k The number of nearest neighbors to return.
   * @param filter Optional metadata to filter the vectors by.
   * @returns Top matching vectors with score
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: Metadata): Promise<[Document, number][]>;
  /**
   * Creates a new instance of the SingleStoreVectorStore class from a list
   * of texts.
   * @param texts An array of strings.
   * @param metadatas An array of metadata objects.
   * @param embeddings An Embeddings object.
   * @param dbConfig A SingleStoreVectorStoreConfig object.
   * @returns A new SingleStoreVectorStore instance
   */
  static fromTexts(texts: string[], metadatas: object[], embeddings: EmbeddingsInterface, dbConfig: SingleStoreVectorStoreConfig): Promise<SingleStoreVectorStore>;
  /**
   * Creates a new instance of the SingleStoreVectorStore class from a list
   * of Document objects.
   * @param docs An array of Document objects.
   * @param embeddings An Embeddings object.
   * @param dbConfig A SingleStoreVectorStoreConfig object.
   * @returns A new SingleStoreVectorStore instance
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: SingleStoreVectorStoreConfig): Promise<SingleStoreVectorStore>;
}
//#endregion
export { ConnectionOptions, DistanceMetrics, Metadata, SearchStrategy, SingleStoreVectorStore, SingleStoreVectorStoreConfig };
//# sourceMappingURL=singlestore.d.ts.map