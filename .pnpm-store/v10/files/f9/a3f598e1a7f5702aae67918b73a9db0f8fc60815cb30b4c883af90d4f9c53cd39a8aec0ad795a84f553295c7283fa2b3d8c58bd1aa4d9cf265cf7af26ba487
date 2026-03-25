import { IVectorIndexClient } from "@gomomento/sdk-core";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/momento_vector_index.d.ts
interface DocumentProps {
  ids: string[];
}
interface MomentoVectorIndexLibArgs {
  /**
   * The Momento Vector Index client.
   */
  client: IVectorIndexClient;
  /**
   * The name of the index to use to store the data.
   * Defaults to "default".
   */
  indexName?: string;
  /**
   * The name of the metadata field to use to store the text of the document.
   * Defaults to "text".
   */
  textField?: string;
  /**
   * Whether to create the index if it does not already exist.
   * Defaults to true.
   */
  ensureIndexExists?: boolean;
}
interface DeleteProps {
  /**
   * The ids of the documents to delete.
   */
  ids: string[];
}
/**
 * A vector store that uses the Momento Vector Index.
 *
 * @remarks
 * To sign up for a free Momento account, visit https://console.gomomento.com.
 */
declare class MomentoVectorIndex extends VectorStore {
  private client;
  private indexName;
  private textField;
  private _ensureIndexExists;
  _vectorstoreType(): string;
  /**
   * Creates a new `MomentoVectorIndex` instance.
   * @param embeddings The embeddings instance to use to generate embeddings from documents.
   * @param args The arguments to use to configure the vector store.
   */
  constructor(embeddings: EmbeddingsInterface, args: MomentoVectorIndexLibArgs);
  /**
   * Returns the Momento Vector Index client.
   * @returns The Momento Vector Index client.
   */
  getClient(): IVectorIndexClient;
  private ensureIndexExists;
  /**
   * Converts the documents to a format that can be stored in the index.
   *
   * This is necessary because the Momento Vector Index requires that the metadata
   * be a map of strings to strings.
   * @param vectors The vectors to convert.
   * @param documents The documents to convert.
   * @param ids The ids to convert.
   * @returns The converted documents.
   */
  private prepareItemBatch;
  /**
   * Adds vectors to the index.
   *
   * @remarks If the index does not already exist, it will be created if `ensureIndexExists` is true.
   * @param vectors The vectors to add to the index.
   * @param documents The documents to add to the index.
   * @param documentProps The properties of the documents to add to the index, specifically the ids.
   * @returns Promise that resolves when the vectors have been added to the index. Also returns the ids of the
   * documents that were added.
   */
  addVectors(vectors: number[][], documents: Document<Record<string, any>>[], documentProps?: DocumentProps): Promise<void | string[]>;
  /**
   * Adds vectors to the index. Generates embeddings from the documents
   * using the `Embeddings` instance passed to the constructor.
   * @param documents Array of `Document` instances to be added to the index.
   * @returns Promise that resolves when the documents have been added to the index.
   */
  addDocuments(documents: Document[], documentProps?: DocumentProps): Promise<void>;
  /**
   * Deletes vectors from the index by id.
   * @param params The parameters to use to delete the vectors, specifically the ids.
   */
  delete(params: DeleteProps): Promise<void>;
  /**
   * Searches the index for the most similar vectors to the query vector.
   * @param query The query vector.
   * @param k The number of results to return.
   * @returns Promise that resolves to the documents of the most similar vectors
   * to the query vector.
   */
  similaritySearchVectorWithScore(query: number[], k: number): Promise<[Document<Record<string, any>>, number][]>;
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
   * @param {this["FilterType"]} options.filter - Optional filter
   * @param _callbacks
   *
   * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
  /**
   * Stores the documents in the index.
   *
   * Converts the documents to vectors using the `Embeddings` instance passed.
   * @param texts The texts to store in the index.
   * @param metadatas The metadata to store in the index.
   * @param embeddings The embeddings instance to use to generate embeddings from the documents.
   * @param dbConfig The configuration to use to instantiate the vector store.
   * @param documentProps The properties of the documents to add to the index, specifically the ids.
   * @returns Promise that resolves to the vector store.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: MomentoVectorIndexLibArgs, documentProps?: DocumentProps): Promise<MomentoVectorIndex>;
  /**
   * Stores the documents in the index.
   * @param docs The documents to store in the index.
   * @param embeddings The embeddings instance to use to generate embeddings from the documents.
   * @param dbConfig The configuration to use to instantiate the vector store.
   * @param documentProps The properties of the documents to add to the index, specifically the ids.
   * @returns Promise that resolves to the vector store.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: MomentoVectorIndexLibArgs, documentProps?: DocumentProps): Promise<MomentoVectorIndex>;
}
//#endregion
export { DeleteProps, DocumentProps, MomentoVectorIndex, MomentoVectorIndexLibArgs };
//# sourceMappingURL=momento_vector_index.d.cts.map