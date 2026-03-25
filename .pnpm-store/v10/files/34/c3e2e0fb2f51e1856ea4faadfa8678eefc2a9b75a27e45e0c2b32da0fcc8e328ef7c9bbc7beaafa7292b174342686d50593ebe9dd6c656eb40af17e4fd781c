import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { SaveableVectorStore } from "@langchain/core/vectorstores";
import { SynchronousInMemoryDocstore } from "@langchain/classic/stores/doc/in_memory";
import { IndexFlatL2 } from "faiss-node";
import { NameRegistry, Parser } from "pickleparser";

//#region src/vectorstores/faiss.d.ts

/**
 * Interface for the arguments required to initialize a FaissStore
 * instance.
 */
interface FaissLibArgs {
  docstore?: SynchronousInMemoryDocstore;
  index?: IndexFlatL2;
  mapping?: Record<number, string>;
}
/**
 * A class that wraps the FAISS (Facebook AI Similarity Search) vector
 * database for efficient similarity search and clustering of dense
 * vectors.
 */
declare class FaissStore extends SaveableVectorStore {
  _index?: IndexFlatL2;
  _mapping: Record<number, string>;
  docstore: SynchronousInMemoryDocstore;
  args: FaissLibArgs;
  _vectorstoreType(): string;
  getMapping(): Record<number, string>;
  getDocstore(): SynchronousInMemoryDocstore;
  constructor(embeddings: EmbeddingsInterface, args: FaissLibArgs);
  /**
   * Adds an array of Document objects to the store.
   * @param documents An array of Document objects.
   * @returns A Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  get index(): IndexFlatL2;
  private set index(value);
  /**
   * Adds an array of vectors and their corresponding Document objects to
   * the store.
   * @param vectors An array of vectors.
   * @param documents An array of Document objects corresponding to the vectors.
   * @returns A Promise that resolves with an array of document IDs when the vectors and documents have been added.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Performs a similarity search in the vector store using a query vector
   * and returns the top k results along with their scores.
   * @param query A query vector.
   * @param k The number of top results to return.
   * @returns A Promise that resolves with an array of tuples, each containing a Document and its corresponding score.
   */
  similaritySearchVectorWithScore(query: number[], k: number): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Saves the current state of the FaissStore to a specified directory.
   * @param directory The directory to save the state to.
   * @returns A Promise that resolves when the state has been saved.
   */
  save(directory: string): Promise<void>;
  /**
   * Method to delete documents.
   * @param params Object containing the IDs of the documents to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete(params: {
    ids: string[];
  }): Promise<void>;
  /**
   * Merges the current FaissStore with another FaissStore.
   * @param targetIndex The FaissStore to merge with.
   * @returns A Promise that resolves with an array of document IDs when the merge is complete.
   */
  mergeFrom(targetIndex: FaissStore): Promise<string[]>;
  /**
   * Loads a FaissStore from a specified directory.
   * @param directory The directory to load the FaissStore from.
   * @param embeddings An Embeddings object.
   * @returns A Promise that resolves with a new FaissStore instance.
   */
  static load(directory: string, embeddings: EmbeddingsInterface): Promise<FaissStore>;
  static loadFromPython(directory: string, embeddings: EmbeddingsInterface): Promise<FaissStore>;
  /**
   * Creates a new FaissStore from an array of texts, their corresponding
   * metadata, and an Embeddings object.
   * @param texts An array of texts.
   * @param metadatas An array of metadata corresponding to the texts, or a single metadata object to be used for all texts.
   * @param embeddings An Embeddings object.
   * @param dbConfig An optional configuration object for the document store.
   * @returns A Promise that resolves with a new FaissStore instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: SynchronousInMemoryDocstore;
  }): Promise<FaissStore>;
  /**
   * Creates a new FaissStore from an array of Document objects and an
   * Embeddings object.
   * @param docs An array of Document objects.
   * @param embeddings An Embeddings object.
   * @param dbConfig An optional configuration object for the document store.
   * @returns A Promise that resolves with a new FaissStore instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: SynchronousInMemoryDocstore;
  }): Promise<FaissStore>;
  /**
   * Creates a new FaissStore from an existing FaissStore and an Embeddings
   * object.
   * @param targetIndex An existing FaissStore.
   * @param embeddings An Embeddings object.
   * @param dbConfig An optional configuration object for the document store.
   * @returns A Promise that resolves with a new FaissStore instance.
   */
  static fromIndex(targetIndex: FaissStore, embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: SynchronousInMemoryDocstore;
  }): Promise<FaissStore>;
  static importFaiss(): Promise<{
    IndexFlatL2: typeof IndexFlatL2;
  }>;
  static importPickleparser(): Promise<{
    Parser: typeof Parser;
    NameRegistry: typeof NameRegistry;
  }>;
}
//#endregion
export { FaissLibArgs, FaissStore };
//# sourceMappingURL=faiss.d.ts.map