import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Voy } from "voy-search";

//#region src/vectorstores/voy.d.ts
type VoyClient = Omit<Voy, "remove" | "size" | "serialize" | "free">;
/**
 * Internal interface for storing documents mappings.
 */
interface InternalDoc {
  embeddings: number[];
  document: Document;
}
/**
 * Class that extends `VectorStore`. It allows to perform similarity search using
 * Voi similarity search engine. The class requires passing Voy Client as an input parameter.
 */
declare class VoyVectorStore extends VectorStore {
  client: VoyClient;
  numDimensions: number | null;
  docstore: InternalDoc[];
  _vectorstoreType(): string;
  constructor(client: VoyClient, embeddings: EmbeddingsInterface);
  /**
   * Adds documents to the Voy database. The documents are embedded using embeddings provided while instantiating the class.
   * @param documents An array of `Document` instances associated with the vectors.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds vectors to the Voy database. The vectors are associated with
   * the provided documents.
   * @param vectors An array of vectors to be added to the database.
   * @param documents An array of `Document` instances associated with the vectors.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Searches for vectors in the Voy database that are similar to the
   * provided query vector.
   * @param query The query vector.
   * @param k The number of similar vectors to return.
   * @returns A promise that resolves with an array of tuples, each containing a `Document` instance and a similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Method to delete data from the Voy index. It can delete data based
   * on specific IDs or a filter.
   * @param params Object that includes either an array of IDs or a filter for the data to be deleted.
   * @returns Promise that resolves when the deletion is complete.
   */
  delete(params: {
    deleteAll?: boolean;
  }): Promise<void>;
  /**
   * Creates a new `VoyVectorStore` instance from an array of text strings. The text
   * strings are converted to `Document` instances and added to the Voy
   * database.
   * @param texts An array of text strings.
   * @param metadatas An array of metadata objects or a single metadata object. If an array is provided, it must have the same length as the `texts` array.
   * @param embeddings An `Embeddings` instance used to generate embeddings for the documents.
   * @param client An instance of Voy client to use in the underlying operations.
   * @returns A promise that resolves with a new `VoyVectorStore` instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, client: VoyClient): Promise<VoyVectorStore>;
  /**
   * Creates a new `VoyVectorStore` instance from an array of `Document` instances.
   * The documents are added to the Voy database.
   * @param docs An array of `Document` instances.
   * @param embeddings An `Embeddings` instance used to generate embeddings for the documents.
   * @param client An instance of Voy client to use in the underlying operations.
   * @returns A promise that resolves with a new `VoyVectorStore` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, client: VoyClient): Promise<VoyVectorStore>;
}
//#endregion
export { VoyClient, VoyVectorStore };
//# sourceMappingURL=voy.d.cts.map