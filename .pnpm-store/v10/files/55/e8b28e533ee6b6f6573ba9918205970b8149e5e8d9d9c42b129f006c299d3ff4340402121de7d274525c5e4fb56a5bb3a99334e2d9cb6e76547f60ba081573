import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/tigris.d.ts

/**
 * Type definition for the arguments required to initialize a
 * TigrisVectorStore instance.
 */
type TigrisLibArgs = {
  index: any;
};
/**
 * Class for managing and operating vector search applications with
 * Tigris, an open-source Serverless NoSQL Database and Search Platform.
 */
declare class TigrisVectorStore extends VectorStore {
  index?: any;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: TigrisLibArgs);
  /**
   * Method to add an array of documents to the Tigris database.
   * @param documents An array of Document instances to be added to the Tigris database.
   * @param options Optional parameter that can either be an array of string IDs or an object with a property 'ids' that is an array of string IDs.
   * @returns A Promise that resolves when the documents have been added to the Tigris database.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  } | string[]): Promise<void>;
  /**
   * Method to add vectors to the Tigris database.
   * @param vectors An array of vectors to be added to the Tigris database.
   * @param documents An array of Document instances corresponding to the vectors.
   * @param options Optional parameter that can either be an array of string IDs or an object with a property 'ids' that is an array of string IDs.
   * @returns A Promise that resolves when the vectors have been added to the Tigris database.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  } | string[]): Promise<void>;
  /**
   * Method to perform a similarity search in the Tigris database and return
   * the k most similar vectors along with their similarity scores.
   * @param query The query vector.
   * @param k The number of most similar vectors to return.
   * @param filter Optional filter object to apply during the search.
   * @returns A Promise that resolves to an array of tuples, each containing a Document and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: object): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Static method to create a new instance of TigrisVectorStore from an
   * array of texts.
   * @param texts An array of texts to be converted into Document instances and added to the Tigris database.
   * @param metadatas Either an array of metadata objects or a single metadata object to be associated with the texts.
   * @param embeddings An instance of Embeddings to be used for embedding the texts.
   * @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
   * @returns A Promise that resolves to a new instance of TigrisVectorStore.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: TigrisLibArgs): Promise<TigrisVectorStore>;
  /**
   * Static method to create a new instance of TigrisVectorStore from an
   * array of Document instances.
   * @param docs An array of Document instances to be added to the Tigris database.
   * @param embeddings An instance of Embeddings to be used for embedding the documents.
   * @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
   * @returns A Promise that resolves to a new instance of TigrisVectorStore.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: TigrisLibArgs): Promise<TigrisVectorStore>;
  /**
   * Static method to create a new instance of TigrisVectorStore from an
   * existing index.
   * @param embeddings An instance of Embeddings to be used for embedding the documents.
   * @param dbConfig An instance of TigrisLibArgs to be used for configuring the Tigris database.
   * @returns A Promise that resolves to a new instance of TigrisVectorStore.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: TigrisLibArgs): Promise<TigrisVectorStore>;
}
//#endregion
export { TigrisLibArgs, TigrisVectorStore };
//# sourceMappingURL=tigris.d.cts.map