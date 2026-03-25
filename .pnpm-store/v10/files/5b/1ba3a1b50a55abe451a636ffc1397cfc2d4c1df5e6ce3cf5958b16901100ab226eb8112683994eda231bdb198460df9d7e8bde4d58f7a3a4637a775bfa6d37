import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { PoolConfig } from "pg";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/analyticdb.d.ts

/**
 * Interface defining the arguments required to create an instance of
 * `AnalyticDBVectorStore`.
 */
interface AnalyticDBArgs {
  connectionOptions: PoolConfig;
  embeddingDimension?: number;
  collectionName?: string;
  preDeleteCollection?: boolean;
}
/**
 * Class that provides methods for creating and managing a collection of
 * documents in an AnalyticDB, adding documents or vectors to the
 * collection, performing similarity search on vectors, and creating an
 * instance of `AnalyticDBVectorStore` from texts or documents.
 */
declare class AnalyticDBVectorStore extends VectorStore {
  FilterType: Record<string, any>;
  private pool;
  private embeddingDimension?;
  private collectionName;
  private preDeleteCollection;
  private isCreateCollection;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: AnalyticDBArgs);
  /**
   * Closes all the clients in the pool and terminates the pool.
   * @returns Promise that resolves when all clients are closed and the pool is terminated.
   */
  end(): Promise<void>;
  /**
   * Creates a new table in the database if it does not already exist. The
   * table is created with columns for id, embedding, document, and
   * metadata. An index is also created on the embedding column if it does
   * not already exist.
   * @returns Promise that resolves when the table and index are created.
   */
  createTableIfNotExists(): Promise<void>;
  /**
   * Deletes the collection from the database if it exists.
   * @returns Promise that resolves when the collection is deleted.
   */
  deleteCollection(): Promise<void>;
  /**
   * Creates a new collection in the database. If `preDeleteCollection` is
   * true, any existing collection with the same name is deleted before the
   * new collection is created.
   * @returns Promise that resolves when the collection is created.
   */
  createCollection(): Promise<void>;
  /**
   * Adds an array of documents to the collection. The documents are first
   * converted to vectors using the `embedDocuments` method of the
   * `embeddings` instance.
   * @param documents Array of Document instances to be added to the collection.
   * @returns Promise that resolves when the documents are added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds an array of vectors and corresponding documents to the collection.
   * The vectors and documents are batch inserted into the database.
   * @param vectors Array of vectors to be added to the collection.
   * @param documents Array of Document instances corresponding to the vectors.
   * @returns Promise that resolves when the vectors and documents are added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Performs a similarity search on the vectors in the collection. The
   * search is performed using the given query vector and returns the top k
   * most similar vectors along with their corresponding documents and
   * similarity scores.
   * @param query Query vector for the similarity search.
   * @param k Number of top similar vectors to return.
   * @param filter Optional. Filter to apply on the metadata of the documents.
   * @returns Promise that resolves to an array of tuples, each containing a Document instance and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Creates an instance of `AnalyticDBVectorStore` from an array of texts
   * and corresponding metadata. The texts are first converted to Document
   * instances before being added to the collection.
   * @param texts Array of texts to be added to the collection.
   * @param metadatas Array or object of metadata corresponding to the texts.
   * @param embeddings Embeddings instance used to convert the texts to vectors.
   * @param dbConfig Configuration for the AnalyticDB.
   * @returns Promise that resolves to an instance of `AnalyticDBVectorStore`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: AnalyticDBArgs): Promise<AnalyticDBVectorStore>;
  /**
   * Creates an instance of `AnalyticDBVectorStore` from an array of
   * Document instances. The documents are added to the collection.
   * @param docs Array of Document instances to be added to the collection.
   * @param embeddings Embeddings instance used to convert the documents to vectors.
   * @param dbConfig Configuration for the AnalyticDB.
   * @returns Promise that resolves to an instance of `AnalyticDBVectorStore`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: AnalyticDBArgs): Promise<AnalyticDBVectorStore>;
  /**
   * Creates an instance of `AnalyticDBVectorStore` from an existing index
   * in the database. A new collection is created in the database.
   * @param embeddings Embeddings instance used to convert the documents to vectors.
   * @param dbConfig Configuration for the AnalyticDB.
   * @returns Promise that resolves to an instance of `AnalyticDBVectorStore`.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: AnalyticDBArgs): Promise<AnalyticDBVectorStore>;
}
//#endregion
export { AnalyticDBArgs, AnalyticDBVectorStore };
//# sourceMappingURL=analyticdb.d.ts.map