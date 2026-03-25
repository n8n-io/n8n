import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { CreateCollectionOptions } from "@datastax/astra-db-ts";

//#region src/vectorstores/astradb.d.ts
type CollectionFilter = Record<string, unknown>;
interface AstraLibArgs extends AsyncCallerParams {
  token: string;
  endpoint: string;
  collection: string;
  keyspace?: string;
  idKey?: string;
  contentKey?: string;
  skipCollectionProvisioning?: boolean;
  collectionOptions?: CreateCollectionOptions<any>;
  batchSize?: number;
}
type AstraDeleteParams = {
  ids: string[];
};
declare class AstraDBVectorStore extends VectorStore {
  FilterType: CollectionFilter;
  private astraDBClient;
  private collectionName;
  private collection;
  private collectionOptions;
  private readonly idKey;
  private readonly contentKey;
  caller: AsyncCaller;
  private readonly skipCollectionProvisioning;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: AstraLibArgs);
  private static applyCollectionOptionsDefaults;
  /**
   * Create a new collection in your Astra DB vector database and then connects to it.
   * If the collection already exists, it will connect to it as well.
   *
   * @returns Promise that resolves if connected to the collection.
   */
  initialize(): Promise<void>;
  /**
   * Method to save vectors to AstraDB.
   *
   * @param vectors Vectors to save.
   * @param documents The documents associated with the vectors.
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[], options?: string[]): Promise<void>;
  /**
   * Method that adds documents to AstraDB.
   *
   * @param documents Array of documents to add to AstraDB.
   * @param options Optional ids for the documents.
   * @returns Promise that resolves the documents have been added.
   */
  addDocuments(documents: Document[], options?: string[]): Promise<void>;
  /**
   * Method that deletes documents from AstraDB.
   *
   * @param params AstraDeleteParameters for the delete.
   * @returns Promise that resolves when the documents have been deleted.
   */
  delete(params: AstraDeleteParams): Promise<void>;
  /**
   * Method that performs a similarity search in AstraDB and returns and similarity scores.
   *
   * @param query Query vector for the similarity search.
   * @param k Number of top results to return.
   * @param filter Optional filter to apply to the search.
   * @returns Promise that resolves with an array of documents and their scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: CollectionFilter): Promise<[Document, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK - Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {CollectionFilter} options.filter - Optional filter
   *
   * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
  /**
   * Static method to create an instance of AstraDBVectorStore from texts.
   *
   * @param texts The texts to use.
   * @param metadatas The metadata associated with the texts.
   * @param embeddings The embeddings to use.
   * @param dbConfig The arguments for the AstraDBVectorStore.
   * @returns Promise that resolves with a new instance of AstraDBVectorStore.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: AstraLibArgs): Promise<AstraDBVectorStore>;
  /**
   * Static method to create an instance of AstraDBVectorStore from documents.
   *
   * @param docs The Documents to use.
   * @param embeddings The embeddings to use.
   * @param dbConfig The arguments for the AstraDBVectorStore.
   * @returns Promise that resolves with a new instance of AstraDBVectorStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: AstraLibArgs): Promise<AstraDBVectorStore>;
  /**
   * Static method to create an instance of AstraDBVectorStore from an existing index.
   *
   * @param embeddings The embeddings to use.
   * @param dbConfig The arguments for the AstraDBVectorStore.
   * @returns Promise that resolves with a new instance of AstraDBVectorStore.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: AstraLibArgs): Promise<AstraDBVectorStore>;
}
//#endregion
export { AstraDBVectorStore, AstraDeleteParams, AstraLibArgs, CollectionFilter };
//# sourceMappingURL=astradb.d.cts.map