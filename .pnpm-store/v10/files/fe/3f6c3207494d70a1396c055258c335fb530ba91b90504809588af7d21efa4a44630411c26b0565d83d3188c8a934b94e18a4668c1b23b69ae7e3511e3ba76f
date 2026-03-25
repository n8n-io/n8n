import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";

//#region src/vectorstores.d.ts

/**
 * Interface for the arguments that can be passed to the
 * `QdrantVectorStore` constructor. It includes options for specifying a
 * `QdrantClient` instance, the URL and API key for a Qdrant database, and
 * the name and configuration for a collection.
 */
interface QdrantLibArgs {
  client?: QdrantClient;
  url?: string;
  apiKey?: string;
  collectionName?: string;
  collectionConfig?: Schemas["CreateCollection"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customPayload?: Record<string, any>[];
  contentPayloadKey?: string;
  metadataPayloadKey?: string;
}
type QdrantAddDocumentOptions = {
  ids?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customPayload?: Record<string, any>[];
};
/**
 * Type that defines the parameters for the delete operation in the
 * QdrantStore class. It includes ids, filter and shard key.
 */
type QdrantDeleteParams = {
  ids: string[];
  shardKey?: string;
  filter?: never;
} | {
  filter: object;
  shardKey?: string;
  ids?: never;
};
type QdrantFilter = Schemas["Filter"];
type QdrantCondition = Schemas["FieldCondition"];
/**
 * Class that extends the `VectorStore` base class to interact with a
 * Qdrant database. It includes methods for adding documents and vectors
 * to the Qdrant database, searching for similar vectors, and ensuring the
 * existence of a collection in the database.
 */
declare class QdrantVectorStore extends VectorStore {
  FilterType: QdrantFilter;
  get lc_secrets(): {
    [key: string]: string;
  };
  client: QdrantClient;
  collectionName: string;
  collectionConfig?: Schemas["CreateCollection"];
  contentPayloadKey: string;
  metadataPayloadKey: string;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: QdrantLibArgs);
  /**
   * Method to add documents to the Qdrant database. It generates vectors
   * from the documents using the `Embeddings` instance and then adds the
   * vectors to the database.
   * @param documents Array of `Document` instances to be added to the Qdrant database.
   * @param documentOptions Optional `QdrantAddDocumentOptions` which has a list of JSON objects for extra querying
   * @returns Promise that resolves when the documents have been added to the database.
   */
  addDocuments(documents: Document[], documentOptions?: QdrantAddDocumentOptions): Promise<void>;
  /**
   * Method to add vectors to the Qdrant database. Each vector is associated
   * with a document, which is stored as the payload for a point in the
   * database.
   * @param vectors Array of vectors to be added to the Qdrant database.
   * @param documents Array of `Document` instances associated with the vectors.
   * @param documentOptions Optional `QdrantAddDocumentOptions` which has a list of JSON objects for extra querying
   * @returns Promise that resolves when the vectors have been added to the database.
   */
  addVectors(vectors: number[][], documents: Document[], documentOptions?: QdrantAddDocumentOptions): Promise<void>;
  /**
   * Method that deletes points from the Qdrant database.
   * @param params Parameters for the delete operation.
   * @returns Promise that resolves when the delete operation is complete.
   */
  delete(params: QdrantDeleteParams): Promise<void>;
  /**
   * Method to search for vectors in the Qdrant database that are similar to
   * a given query vector. The search results include the score and payload
   * (metadata and content) for each similar vector.
   * @param query Query vector to search for similar vectors in the Qdrant database.
   * @param k Optional number of similar vectors to return. If not specified, all similar vectors are returned.
   * @param filter Optional filter to apply to the search results.
   * @returns Promise that resolves with an array of tuples, where each tuple includes a `Document` instance and a score for a similar vector.
   */
  similaritySearchVectorWithScore(query: number[], k?: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK - Number of documents to fetch before passing to the MMR algorithm. Defaults to 20.
   * @param {number} options.lambda - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {this["FilterType"]} options.filter - Optional filter to apply to the search results.
   *
   * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
  /**
   * Method to ensure the existence of a collection in the Qdrant database.
   * If the collection does not exist, it is created.
   * @returns Promise that resolves when the existence of the collection has been ensured.
   */
  ensureCollection(): Promise<void>;
  /**
   * Static method to create a `QdrantVectorStore` instance from texts. Each
   * text is associated with metadata and converted to a `Document`
   * instance, which is then added to the Qdrant database.
   * @param texts Array of texts to be converted to `Document` instances and added to the Qdrant database.
   * @param metadatas Array or single object of metadata to be associated with the texts.
   * @param embeddings `Embeddings` instance used to generate vectors from the texts.
   * @param dbConfig `QdrantLibArgs` instance specifying the configuration for the Qdrant database.
   * @returns Promise that resolves with a new `QdrantVectorStore` instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: QdrantLibArgs): Promise<QdrantVectorStore>;
  /**
   * Static method to create a `QdrantVectorStore` instance from `Document`
   * instances. The documents are added to the Qdrant database.
   * @param docs Array of `Document` instances to be added to the Qdrant database.
   * @param embeddings `Embeddings` instance used to generate vectors from the documents.
   * @param dbConfig `QdrantLibArgs` instance specifying the configuration for the Qdrant database.
   * @returns Promise that resolves with a new `QdrantVectorStore` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: QdrantLibArgs): Promise<QdrantVectorStore>;
  /**
   * Static method to create a `QdrantVectorStore` instance from an existing
   * collection in the Qdrant database.
   * @param embeddings `Embeddings` instance used to generate vectors from the documents in the collection.
   * @param dbConfig `QdrantLibArgs` instance specifying the configuration for the Qdrant database.
   * @returns Promise that resolves with a new `QdrantVectorStore` instance.
   */
  static fromExistingCollection(embeddings: EmbeddingsInterface, dbConfig: QdrantLibArgs): Promise<QdrantVectorStore>;
}
//#endregion
export { QdrantAddDocumentOptions, QdrantCondition, QdrantDeleteParams, QdrantFilter, QdrantLibArgs, QdrantVectorStore };
//# sourceMappingURL=vectorstores.d.cts.map