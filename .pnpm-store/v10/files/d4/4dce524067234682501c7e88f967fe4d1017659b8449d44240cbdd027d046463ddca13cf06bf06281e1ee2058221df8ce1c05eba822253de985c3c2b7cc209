import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { MainApi } from "@rockset/client";
import { CreateCollectionRequest } from "@rockset/client/dist/codegen/api.js";

//#region src/vectorstores/rockset.d.ts

/**
 * Generic Rockset vector storage error
 */
declare class RocksetStoreError extends Error {
  /**
   * Constructs a RocksetStoreError
   * @param message   The error message
   */
  constructor(message: string);
}
/**
 * Error that is thrown when a RocksetStore function is called
 * after `destroy()` is called (meaning the collection would be
 * deleted).
 */
declare class RocksetStoreDestroyedError extends RocksetStoreError {
  constructor();
}
/**
 * Functions to measure vector distance/similarity by.
 * See https://rockset.com/docs/vector-functions/#vector-distance-functions
 * @enum SimilarityMetric
 */
declare const SimilarityMetric: {
  readonly CosineSimilarity: "COSINE_SIM";
  readonly EuclideanDistance: "EUCLIDEAN_DIST";
  readonly DotProduct: "DOT_PRODUCT";
};
type SimilarityMetric = (typeof SimilarityMetric)[keyof typeof SimilarityMetric];
/**
 * Vector store arguments
 * @interface RocksetStore
 */
interface RocksetLibArgs {
  /**
   * The rockset client object constructed with `rocksetConfigure`
   * @type {MainAPI}
   */
  client: MainApi;
  /**
   * The name of the Rockset collection to store vectors
   * @type {string}
   */
  collectionName: string;
  /**
   * The name of othe Rockset workspace that holds @member collectionName
   * @type {string}
   */
  workspaceName?: string;
  /**
   * The name of the collection column to contain page contnent of documents
   * @type {string}
   */
  textKey?: string;
  /**
   * The name of the collection column to contain vectors
   * @type {string}
   */
  embeddingKey?: string;
  /**
   * The SQL `WHERE` clause to filter by
   * @type {string}
   */
  filter?: string;
  /**
   * The metric used to measure vector relationship
   * @type {SimilarityMetric}
   */
  similarityMetric?: SimilarityMetric;
}
/**
 * Exposes Rockset's vector store/search functionality
 */
declare class RocksetStore extends VectorStore {
  FilterType: string;
  client: MainApi;
  collectionName: string;
  workspaceName: string;
  textKey: string;
  embeddingKey: string;
  filter?: string;
  private _similarityMetric;
  private similarityOrder;
  private destroyed;
  /**
   * Gets a string representation of the type of this VectorStore
   * @returns {"rockset"}
   */
  _vectorstoreType(): "rockset";
  /**
   * Constructs a new RocksetStore
   * @param {Embeddings} embeddings  Object used to embed queries and
   *                                 page content
   * @param {RocksetLibArgs} args
   */
  constructor(embeddings: EmbeddingsInterface, args: RocksetLibArgs);
  /**
   * Sets the object's similarity order based on what
   * SimilarityMetric is being used
   */
  private setSimilarityOrder;
  /**
   * Embeds and adds Documents to the store.
   * @param {Documents[]} documents  The documents to store
   * @returns {Promise<string[]?>}   The _id's of the documents added
   */
  addDocuments(documents: Document[]): Promise<string[] | undefined>;
  /**
   * Adds vectors to the store given their corresponding Documents
   * @param {number[][]} vectors   The vectors to store
   * @param {Document[]} documents The Documents they represent
   * @return {Promise<string[]?>}  The _id's of the added documents
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<string[] | undefined>;
  /**
   * Deletes Rockset documements given their _id's
   * @param {string[]} ids  The IDS to remove documents with
   */
  delete(ids: string[]): Promise<void>;
  /**
   * Gets the most relevant documents to a query along
   * with their similarity score. The returned documents
   * are ordered by similarity (most similar at the first
   * index)
   * @param {number[]} query  The embedded query to search
   *                          the store by
   * @param {number} k        The number of documents to retreive
   * @param {string?} filter  The SQL `WHERE` clause to filter by
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: string): Promise<[Document, number][]>;
  /**
   * Constructs and returns a RocksetStore object given texts to store.
   * @param {string[]} texts               The texts to store
   * @param {object[] | object} metadatas  The metadatas that correspond
   *                                       to @param texts
   * @param {Embeddings} embeddings        The object used to embed queries
   *                                       and page content
   * @param {RocksetLibArgs} dbConfig      The options to be passed into the
   *                                       RocksetStore constructor
   * @returns {RocksetStore}
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: RocksetLibArgs): Promise<RocksetStore>;
  /**
   * Constructs, adds docs to, and returns a RocksetStore object
   * @param {Document[]} docs          The Documents to store
   * @param {Embeddings} embeddings    The object used to embed queries
   *                                   and page content
   * @param {RocksetLibArgs} dbConfig  The options to be passed into the
   *                                   RocksetStore constructor
   * @returns {RocksetStore}
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: RocksetLibArgs): Promise<RocksetStore>;
  private static collectionExists;
  private static collectionReady;
  /**
   * Deletes the collection this RocksetStore uses
   * @param {boolean?} waitUntilDeletion  Whether to sleep until the
   *                                      collection is ready to be
   *                                      queried
   */
  destroy(waitUntilDeletion?: boolean): Promise<void>;
  /**
   * Checks if this RocksetStore has been destroyed.
   * @throws {RocksetStoreDestroyederror} if it has.
   */
  private checkIfDestroyed;
  /**
   * Creates a new Rockset collection and returns a RocksetStore that
   * uses it
   * @param {Embeddings} embeddings    Object used to embed queries and
   *                                   page content
   * @param {RocksetLibArgs} dbConfig  The options to be passed into the
   *                                   RocksetStore constructor
   * @param {CreateCollectionRequest?} collectionOptions  The arguments to sent with the
   *                                                      HTTP request when creating the
   *                                                      collection. Setting a field mapping
   *                                                      that `VECTOR_ENFORCE`s is recommended
   *                                                      when using this function. See
   *                                                      https://rockset.com/docs/vector-functions/#vector_enforce
   * @returns {RocsketStore}
   */
  static withNewCollection(embeddings: EmbeddingsInterface, dbConfig: RocksetLibArgs, collectionOptions?: CreateCollectionRequest): Promise<RocksetStore>;
  get similarityMetric(): SimilarityMetric;
  set similarityMetric(metric: SimilarityMetric);
}
//#endregion
export { RocksetLibArgs, RocksetStore, RocksetStoreDestroyedError, RocksetStoreError, SimilarityMetric };
//# sourceMappingURL=rockset.d.cts.map