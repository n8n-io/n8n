import { in_memory_d_exports } from "../stores/doc/in_memory.js";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { SaveableVectorStore } from "@langchain/core/vectorstores";
import { Index } from "usearch";

//#region src/vectorstores/usearch.d.ts

/**
 * Interface that defines the arguments that can be passed to the
 * `USearch` constructor. It includes optional properties for a
 * `docstore`, `index`, and `mapping`.
 */
interface USearchArgs {
  docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  index?: Index;
  mapping?: Record<number, string>;
}
/**
 * Class that extends `SaveableVectorStore` and provides methods for
 * adding documents and vectors to a `usearch` index, performing
 * similarity searches, and saving the index.
 */
declare class USearch extends SaveableVectorStore {
  _index?: Index;
  _mapping: Record<number, string>;
  docstore: in_memory_d_exports.SynchronousInMemoryDocstore;
  args: USearchArgs;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: USearchArgs);
  /**
   * Method that adds documents to the `usearch` index. It generates
   * embeddings for the documents and adds them to the index.
   * @param documents An array of `Document` instances to be added to the index.
   * @returns A promise that resolves with an array of document IDs.
   */
  addDocuments(documents: Document[]): Promise<string[]>;
  get index(): Index;
  private set index(value);
  /**
   * Method that adds vectors to the `usearch` index. It also updates the
   * mapping between vector IDs and document IDs.
   * @param vectors An array of vectors to be added to the index.
   * @param documents An array of `Document` instances corresponding to the vectors.
   * @returns A promise that resolves with an array of document IDs.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<string[]>;
  /**
   * Method that performs a similarity search in the `usearch` index. It
   * returns the `k` most similar documents to a given query vector, along
   * with their similarity scores.
   * @param query The query vector.
   * @param k The number of most similar documents to return.
   * @returns A promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Method that saves the `usearch` index and the document store to disk.
   * @param directory The directory where the index and document store should be saved.
   * @returns A promise that resolves when the save operation is complete.
   */
  save(directory: string): Promise<void>;
  /**
   * Static method that creates a new `USearch` instance from a list of
   * texts. It generates embeddings for the texts and adds them to the
   * `usearch` index.
   * @param texts An array of texts to be added to the index.
   * @param metadatas Metadata associated with the texts.
   * @param embeddings An instance of `Embeddings` used to generate embeddings for the texts.
   * @param dbConfig Optional configuration for the document store.
   * @returns A promise that resolves with a new `USearch` instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  }): Promise<USearch>;
  /**
   * Static method that creates a new `USearch` instance from a list of
   * documents. It generates embeddings for the documents and adds them to
   * the `usearch` index.
   * @param docs An array of `Document` instances to be added to the index.
   * @param embeddings An instance of `Embeddings` used to generate embeddings for the documents.
   * @param dbConfig Optional configuration for the document store.
   * @returns A promise that resolves with a new `USearch` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  }): Promise<USearch>;
}
//#endregion
export { USearch, USearchArgs };
//# sourceMappingURL=usearch.d.ts.map