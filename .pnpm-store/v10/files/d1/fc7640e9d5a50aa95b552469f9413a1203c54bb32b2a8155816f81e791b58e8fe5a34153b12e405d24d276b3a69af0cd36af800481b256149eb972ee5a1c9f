import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { BaseClient } from "@xata.io/client";

//#region src/vectorstores/xata.d.ts

/**
 * Interface for the arguments required to create a XataClient. Includes
 * the client instance and the table name.
 */
interface XataClientArgs<XataClient> {
  readonly client: XataClient;
  readonly table: string;
}
/**
 * Type for the filter object used in Xata database queries.
 */
type XataFilter = object;
/**
 * Class for interacting with a Xata database as a VectorStore. Provides
 * methods to add documents and vectors to the database, delete entries,
 * and perform similarity searches.
 */
declare class XataVectorSearch<XataClient extends BaseClient> extends VectorStore {
  FilterType: XataFilter;
  private readonly client;
  private readonly table;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: XataClientArgs<XataClient>);
  /**
   * Method to add documents to the Xata database. Maps the page content of
   * each document, embeds the documents using the embeddings, and adds the
   * vectors to the database.
   * @param documents Array of documents to be added.
   * @param options Optional object containing an array of ids.
   * @returns Promise resolving to an array of ids of the added documents.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Method to add vectors to the Xata database. Maps each vector to a row
   * with the document's content, embedding, and metadata. Creates or
   * replaces these rows in the Xata database.
   * @param vectors Array of vectors to be added.
   * @param documents Array of documents corresponding to the vectors.
   * @param options Optional object containing an array of ids.
   * @returns Promise resolving to an array of ids of the added vectors.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Method to delete entries from the Xata database. Deletes the entries
   * with the provided ids.
   * @param params Object containing an array of ids of the entries to be deleted.
   * @returns Promise resolving to void.
   */
  delete(params: {
    ids: string[];
  }): Promise<void>;
  /**
   * Method to perform a similarity search in the Xata database. Returns the
   * k most similar documents along with their scores.
   * @param query Query vector for the similarity search.
   * @param k Number of most similar documents to return.
   * @param filter Optional filter for the search.
   * @returns Promise resolving to an array of tuples, each containing a Document and its score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: XataFilter | undefined): Promise<[Document, number][]>;
}
//#endregion
export { XataClientArgs, XataVectorSearch };
//# sourceMappingURL=xata.d.cts.map