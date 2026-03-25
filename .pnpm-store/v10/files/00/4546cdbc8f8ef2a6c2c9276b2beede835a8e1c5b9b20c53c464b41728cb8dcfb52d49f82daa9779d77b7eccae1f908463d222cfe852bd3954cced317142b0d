import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Cluster } from "couchbase";

//#region src/vectorstores/couchbase_query.d.ts

/**
 * Enum for different distance strategies supported by Couchbase vector search
 */
declare enum DistanceStrategy {
  DOT = "dot",
  COSINE = "cosine",
  EUCLIDEAN = "euclidean",
  EUCLIDEAN_SQUARED = "euclidean_squared",
}
declare enum IndexType {
  COMPOSITE = "composite",
  HYPERSCALE = "hyperscale",
}
/**
 * Interface for create_index method parameters
 */
interface CreateIndexOptions {
  indexType: IndexType;
  indexDescription: string;
  distanceMetric?: DistanceStrategy;
  indexName?: string;
  vectorField?: string;
  vectorDimension?: number;
  fields?: string[];
  whereClause?: string;
  indexScanNprobes?: number;
  indexTrainlist?: number;
}
/**
 * This interface define the optional fields for adding vector
 * - `ids` - vector of ids for each document. If undefined, then uuid will be used
 * - `metadata` - vector of metadata object for each document
 */
interface AddVectorOptions {
  ids?: string[];
  metadata?: Record<string, any>[];
}
/**
 * This interface defines the fields required to initialize a query vector store
 * These are the fields part of config:
 * @property {Cluster} cluster - The Couchbase cluster that the store will interact with.
 * @property {string} bucketName - The name of the bucket in the Couchbase cluster.
 * @property {string} scopeName - The name of the scope within the bucket.
 * @property {string} collectionName - The name of the collection within the scope.
 * @property {string} textKey - The key to be used for text in the documents. Defaults to "text".
 * @property {string} embeddingKey - The key to be used for embeddings in the documents. Defaults to "embedding".
 * @property {DistanceStrategy} distanceStrategy - The distance strategy to use for vector similarity calculations. Defaults to DOT.
 * @property {AddVectorOptions} addVectorOptions - Options for adding vectors with specific id/metadata
 */
interface CouchbaseQueryVectorStoreArgs {
  cluster: Cluster;
  bucketName: string;
  scopeName: string;
  collectionName: string;
  textKey?: string;
  embeddingKey?: string;
  distanceStrategy?: DistanceStrategy;
  addVectorOptions?: AddVectorOptions;
}
/**
 * This type defines the search filters used in couchbase query vector search
 * - `where`: Optional WHERE clause conditions for the SQL++ query
 * - `fields`: Optional list of fields to include in the results
 */
type CouchbaseQueryVectorStoreFilter = {
  where?: string;
  fields?: string[];
};
/**
 * Class for interacting with the Couchbase database using Query service for vector search.
 * It extends the VectorStore class and provides methods for adding vectors and
 * documents, and searching for similar vectors using SQL++ queries.
 * Initiate the class using initialize() method.
 */
declare class CouchbaseQueryVectorStore extends VectorStore {
  FilterType: CouchbaseQueryVectorStoreFilter;
  private metadataKey;
  private readonly defaultTextKey;
  private readonly defaultEmbeddingKey;
  private readonly defaultDistanceStrategy;
  private cluster;
  private _bucket;
  private _scope;
  private _collection;
  private bucketName;
  private scopeName;
  private collectionName;
  private textKey;
  private embeddingKey;
  private distanceStrategy;
  /**
   * The private constructor used to provide embedding to parent class.
   * Initialize the class using static initialize() method
   * @param embedding - object to generate embedding
   * @param config -  the fields required to initialize a vector store
   */
  private constructor();
  _vectorstoreType(): string;
  /**
   * initialize class for interacting with the Couchbase database using Query service.
   * It extends the VectorStore class and provides methods
   * for adding vectors and documents, and searching for similar vectors.
   * This also verifies the params
   *
   * @param embeddings - object to generate embedding
   * @param config - the fields required to initialize a vector store
   */
  static initialize(embeddings: EmbeddingsInterface, config: CouchbaseQueryVectorStoreArgs): Promise<CouchbaseQueryVectorStore>;
  private checkBucketExists;
  private checkScopeAndCollectionExists;
  /**
   * Method to add vectors and documents to the vector store.
   *
   * @param vectors - Vectors to be added to the vector store.
   * @param documents - Documents to be added to the vector store.
   * @param options - Optional parameters for adding vectors.
   *
   * @returns - Promise that resolves to an array of document IDs.
   */
  addVectors(vectors: number[][], documents: Document[], options?: AddVectorOptions): Promise<string[]>;
  /**
   * Method to add documents to the vector store. It first converts
   * the documents to vectors using the embeddings and then adds them to the vector store.
   *
   * @param documents - Documents to be added to the vector store.
   * @param options - Optional parameters for adding documents.
   *
   * @returns - Promise that resolves to an array of document IDs.
   */
  addDocuments(documents: Document[], options?: AddVectorOptions): Promise<string[]>;
  /**
   * Method to delete documents from the vector store.
   *
   * @param ids - Array of document IDs to be deleted.
   *
   * @returns - Promise that resolves when the deletion is complete.
   */
  delete(options: {
    ids: string[];
  }): Promise<void>;
  /**
   * Return documents that are most similar to the vector embedding using SQL++ query.
   *
   * @param queryEmbeddings - Embedding vector to look up documents similar to.
   * @param k - Number of documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase query. Defaults to empty object.
   * - `where`: Optional WHERE clause conditions for the SQL++ query
   * - `fields`: Optional list of fields to include in the results
   *
   * @returns - Promise of list of [document, score] that are the most similar to the query vector.
   *
   * @throws If the search operation fails.
   */
  similaritySearchVectorWithScore(queryEmbeddings: number[], k?: number, filter?: CouchbaseQueryVectorStoreFilter): Promise<[Document, number][]>;
  /**
   * Return documents that are most similar to the vector embedding.
   *
   * @param queryEmbeddings - Embedding to look up documents similar to.
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase query. Defaults to empty object.
   * - `where`: Optional WHERE clause conditions for the SQL++ query
   * - `fields`: Optional list of fields to include in the results
   *
   * @returns - A promise that resolves to an array of documents that match the similarity search.
   */
  similaritySearchByVector(queryEmbeddings: number[], k?: number, filter?: CouchbaseQueryVectorStoreFilter): Promise<Document[]>;
  /**
   * Return documents that are most similar to the query.
   *
   * @param query - Query to look up for similar documents
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase query. Defaults to empty object.
   * - `where`: Optional WHERE clause conditions for the SQL++ query
   * - `fields`: Optional list of fields to include in the results
   *
   * @returns - Promise of list of documents that are most similar to the query.
   */
  similaritySearch(query: string, k?: number, filter?: CouchbaseQueryVectorStoreFilter): Promise<Document[]>;
  /**
   * Return documents that are most similar to the query with their scores.
   *
   * @param query - Query to look up for similar documents
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase query. Defaults to empty object.
   * - `where`: Optional WHERE clause conditions for the SQL++ query
   * - `fields`: Optional list of fields to include in the results
   *
   * @returns - Promise of list of documents that are most similar to the query.
   */
  similaritySearchWithScore(query: string, k?: number, filter?: CouchbaseQueryVectorStoreFilter): Promise<[Document, number][]>;
  private upsertDocuments;
  /**
   * Create a new vector index for the Query vector store.
   *
   * @param options - Configuration options for creating the index
   * @param options.indexType - Type of the index (HYPERSCALE or COMPOSITE) to create
   * @param options.indexDescription - Description of the index like "IVF,SQ8"
   * @param options.distanceMetric - Distance metric to use for the index. Defaults to the distance metric in the constructor
   * @param options.indexName - Name of the index to create. Defaults to "langchain_{indexType}_query_index"
   * @param options.vectorField - Name of the vector field to use for the index. Defaults to the embedding key in the constructor
   * @param options.vectorDimension - Dimension of the vector field. If not provided, it will be determined from the embedding object
   * @param options.fields - List of fields to include in the index. Defaults to the text field in the constructor
   * @param options.whereClause - Optional where clause to filter the documents to index
   * @param options.indexScanNprobes - Number of probes to use for the index
   * @param options.indexTrainlist - Number of training samples to use for the index
   *
   * @throws {Error} If index creation fails or invalid parameters are provided
   */
  createIndex(options: CreateIndexOptions): Promise<void>;
  /**
   * Static method to create a new CouchbaseQueryVectorStore from an array of texts.
   * It first converts the texts to vectors using the embeddings and then creates a new vector store.
   *
   * @param texts - Array of texts to be converted to vectors.
   * @param metadatas - Array of metadata objects corresponding to the texts.
   * @param embeddings - Embeddings to be used for converting texts to vectors.
   * @param config - Configuration for the vector store.
   *
   * @returns - Promise that resolves to a new CouchbaseQueryVectorStore instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, config: CouchbaseQueryVectorStoreArgs): Promise<CouchbaseQueryVectorStore>;
  /**
   * Static method to create a new CouchbaseQueryVectorStore from an array of documents.
   * It first converts the documents to vectors using the embeddings and then creates a new vector store.
   *
   * @param docs - Array of documents to be converted to vectors.
   * @param embeddings - Embeddings to be used for converting documents to vectors.
   * @param config - Configuration for the vector store.
   *
   * @returns - Promise that resolves to a new CouchbaseQueryVectorStore instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, config: CouchbaseQueryVectorStoreArgs): Promise<CouchbaseQueryVectorStore>;
}
//#endregion
export { AddVectorOptions, CouchbaseQueryVectorStore, CouchbaseQueryVectorStoreArgs, CreateIndexOptions, DistanceStrategy, IndexType };
//# sourceMappingURL=couchbase_query.d.ts.map