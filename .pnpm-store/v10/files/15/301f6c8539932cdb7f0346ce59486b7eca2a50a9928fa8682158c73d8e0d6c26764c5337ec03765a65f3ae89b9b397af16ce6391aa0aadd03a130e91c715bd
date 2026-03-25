import { Document } from "@langchain/core/documents";
import { Cluster } from "couchbase";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/couchbase_search.d.ts

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
 * This interface defines the fields required to initialize a vector store
 * These are the fields part of config:
 * @property {Cluster} cluster - The Couchbase cluster that the store will interact with.
 * @property {string} bucketName - The name of the bucket in the Couchbase cluster.
 * @property {string} scopeName - The name of the scope within the bucket.
 * @property {string} collectionName - The name of the collection within the scope.
 * @property {string} indexName - The name of the index to be used for vector search.
 * @property {string} textKey - The key to be used for text in the documents. Defaults to "text".
 * @property {string} embeddingKey - The key to be used for embeddings in the documents. Defaults to "embedding".
 * @property {boolean} scopedIndex - Whether to use a scoped index for vector search. Defaults to true.
 * @property {AddVectorOptions} addVectorOptions - Options for adding vectors with specific id/metadata
 */
interface CouchbaseSearchVectorStoreArgs {
  cluster: Cluster;
  bucketName: string;
  scopeName: string;
  collectionName: string;
  indexName: string;
  textKey?: string;
  embeddingKey?: string;
  scopedIndex?: boolean;
  addVectorOptions?: AddVectorOptions;
}
/**
 * This type defines the search filters used in couchbase vector search
 * - `fields`: Optional list of fields to include in the
 * metadata of results. Note that these need to be stored in the index.
 * If nothing is specified, defaults to all the fields stored in the index.
 * - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
 */
type CouchbaseSearchVectorStoreFilter = {
  fields?: any;
  searchOptions?: any;
};
/**
 * Class for interacting with the Couchbase database. It extends the
 * VectorStore class and provides methods for adding vectors and
 * documents, and searching for similar vectors.
 * Initiate the class using initialize() method.
 */
declare class CouchbaseSearchVectorStore extends VectorStore {
  FilterType: CouchbaseSearchVectorStoreFilter;
  private metadataKey;
  private readonly defaultTextKey;
  private readonly defaultScopedIndex;
  private readonly defaultEmbeddingKey;
  private cluster;
  private _bucket;
  private _scope;
  private _collection;
  private bucketName;
  private scopeName;
  private collectionName;
  private indexName;
  private textKey;
  private embeddingKey;
  private scopedIndex;
  /**
   * The private constructor used to provide embedding to parent class.
   * Initialize the class using static initialize() method
   * @param embedding - object to generate embedding
   * @param config -  the fields required to initialize a vector store
   */
  private constructor();
  /**
   * initialize class for interacting with the Couchbase database.
   * It extends the VectorStore class and provides methods
   * for adding vectors and documents, and searching for similar vectors.
   * This also verifies the params
   *
   * @param embeddings - object to generate embedding
   * @param config - the fields required to initialize a vector store
   */
  static initialize(embeddings: EmbeddingsInterface, config: CouchbaseSearchVectorStoreArgs): Promise<CouchbaseSearchVectorStore>;
  private checkIndexExists;
  private checkBucketExists;
  private checkScopeAndCollectionExists;
  _vectorstoreType(): string;
  /**
   * Formats couchbase metadata by removing `metadata.` from initials
   * @param fields - all the fields of row
   * @returns - formatted metadata fields
   */
  private formatMetadata;
  /**
   * Performs a similarity search on the vectors in the Couchbase database and returns the documents and their corresponding scores.
   *
   * @param queryEmbeddings - Embedding vector to look up documents similar to.
   * @param k - Number of documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
   * - `fields`: Optional list of fields to include in the
   * metadata of results. Note that these need to be stored in the index.
   * If nothing is specified, defaults to all the fields stored in the index.
   * - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
   *
   * @returns - Promise of list of [document, score] that are the most similar to the query vector.
   *
   * @throws If the search operation fails.
   */
  similaritySearchVectorWithScore(queryEmbeddings: number[], k?: number, filter?: CouchbaseSearchVectorStoreFilter): Promise<[Document, number][]>;
  /**
   * Return documents that are most similar to the vector embedding.
   *
   * @param queryEmbeddings - Embedding to look up documents similar to.
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
   * - `fields`: Optional list of fields to include in the
   * metadata of results. Note that these need to be stored in the index.
   * If nothing is specified, defaults to all the fields stored in the index.
   * - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
   *
   * @returns - A promise that resolves to an array of documents that match the similarity search.
   */
  similaritySearchByVector(queryEmbeddings: number[], k?: number, filter?: CouchbaseSearchVectorStoreFilter): Promise<Document[]>;
  /**
   * Return documents that are most similar to the query.
   *
   * @param query - Query to look up for similar documents
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
   * - `fields`: Optional list of fields to include in the
   * metadata of results. Note that these need to be stored in the index.
   * If nothing is specified, defaults to all the fields stored in the index.
   * - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
   *
   * @returns - Promise of list of documents that are most similar to the query.
   */
  similaritySearch(query: string, k?: number, filter?: CouchbaseSearchVectorStoreFilter): Promise<Document[]>;
  /**
   * Return documents that are most similar to the query with their scores.
   *
   * @param query - Query to look up for similar documents
   * @param k - The number of similar documents to return. Defaults to 4.
   * @param filter - Optional search filter that are passed to Couchbase search. Defaults to empty object.
   * - `fields`: Optional list of fields to include in the
   * metadata of results. Note that these need to be stored in the index.
   * If nothing is specified, defaults to all the fields stored in the index.
   * - `searchOptions`:  Optional search options that are passed to Couchbase search. Defaults to empty object.
   *
   * @returns - Promise of list of documents that are most similar to the query.
   */
  similaritySearchWithScore(query: string, k?: number, filter?: CouchbaseSearchVectorStoreFilter): Promise<[Document, number][]>;
  private upsertDocuments;
  /**
   * Add vectors and corresponding documents to a couchbase collection
   * If the document IDs are passed, the existing documents (if any) will be
   * overwritten with the new ones.
   * @param vectors - The vectors to be added to the collection.
   * @param documents - The corresponding documents to be added to the collection.
   * @param options - Optional parameters for adding vectors.
   * This may include the IDs and metadata of the documents to be added. Defaults to an empty object.
   *
   * @returns - A promise that resolves to an array of document IDs that were added to the collection.
   */
  addVectors(vectors: number[][], documents: Document[], options?: AddVectorOptions): Promise<string[]>;
  /**
   * Run texts through the embeddings and persist in vectorstore.
   * If the document IDs are passed, the existing documents (if any) will be
   * overwritten with the new ones.
   * @param documents - The corresponding documents to be added to the collection.
   * @param options - Optional parameters for adding documents.
   * This may include the IDs and metadata of the documents to be added. Defaults to an empty object.
   *
   * @returns - A promise that resolves to an array of document IDs that were added to the collection.
   */
  addDocuments(documents: Document[], options?: AddVectorOptions): Promise<string[]>;
  /**
   * Create a new CouchbaseVectorStore from a set of documents.
   * This function will initialize a new store, add the documents to it, and then return the store.
   * @param documents - The documents to be added to the new store.
   * @param embeddings - The embeddings to be used for the documents.
   * @param config - The configuration for the new CouchbaseVectorStore. This includes the options for adding vectors.
   *
   * @returns - A promise that resolves to the new CouchbaseVectorStore that contains the added documents.
   */
  static fromDocuments(documents: Document[], embeddings: EmbeddingsInterface, config: CouchbaseSearchVectorStoreArgs): Promise<CouchbaseSearchVectorStore>;
  /**
   * Create a new CouchbaseVectorStore from a set of texts.
   * This function will convert each text and its corresponding metadata into a Document,
   * initialize a new store, add the documents to it, and then return the store.
   * @param texts - The texts to be converted into Documents and added to the new store.
   * @param metadatas - The metadata for each text. If an array is passed, each text will have its corresponding metadata.
   * If not, all texts will have the same metadata.
   * @param embeddings - The embeddings to be used for the documents.
   * @param config - The configuration for the new CouchbaseVectorStore. This includes the options for adding vectors.
   *
   * @returns - A promise that resolves to the new CouchbaseVectorStore that contains the added documents.
   */
  static fromTexts(texts: string[], metadatas: any, embeddings: EmbeddingsInterface, config: CouchbaseSearchVectorStoreArgs): Promise<CouchbaseSearchVectorStore>;
  /**
   * Delete documents asynchronously from the collection.
   * This function will attempt to remove each document in the provided list of IDs from the collection.
   * If an error occurs during the deletion of a document, an error will be thrown with the ID of the document and the error message.
   * @param ids - An array of document IDs to be deleted from the collection.
   *
   * @returns - A promise that resolves when all documents have been attempted to be deleted. If a document could not be deleted, an error is thrown.
   */
  delete(ids: string[]): Promise<void>;
}
//#endregion
export { AddVectorOptions, CouchbaseSearchVectorStore, CouchbaseSearchVectorStoreArgs };
//# sourceMappingURL=couchbase_search.d.cts.map