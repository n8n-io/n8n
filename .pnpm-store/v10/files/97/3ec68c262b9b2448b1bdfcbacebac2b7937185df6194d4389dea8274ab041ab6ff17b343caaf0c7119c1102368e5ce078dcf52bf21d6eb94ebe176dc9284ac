import { in_memory_d_exports } from "../stores/doc/in_memory.cjs";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { SaveableVectorStore } from "@langchain/core/vectorstores";
import { HierarchicalNSW, SpaceName } from "hnswlib-node";

//#region src/vectorstores/hnswlib.d.ts

/**
 * Interface for the base configuration of HNSWLib. It includes the space
 * name and the number of dimensions.
 */
interface HNSWLibBase {
  space: SpaceName;
  numDimensions?: number;
}
/**
 * Interface for the arguments that can be passed to the HNSWLib
 * constructor. It extends HNSWLibBase and includes properties for the
 * document store and HNSW index.
 */
interface HNSWLibArgs extends HNSWLibBase {
  docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  index?: HierarchicalNSW;
}
/**
 * Class that implements a vector store using Hierarchical Navigable Small
 * World (HNSW) graphs. It extends the SaveableVectorStore class and
 * provides methods for adding documents and vectors, performing
 * similarity searches, and saving and loading the vector store.
 */
declare class HNSWLib extends SaveableVectorStore {
  FilterType: (doc: Document) => boolean;
  _index?: HierarchicalNSW;
  docstore: in_memory_d_exports.SynchronousInMemoryDocstore;
  args: HNSWLibBase;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: HNSWLibArgs);
  /**
   * Method to add documents to the vector store. It first converts the
   * documents to vectors using the embeddings, then adds the vectors to the
   * vector store.
   * @param documents The documents to be added to the vector store.
   * @returns A Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  private static getHierarchicalNSW;
  private initIndex;
  get index(): HierarchicalNSW;
  private set index(value);
  /**
   * Method to add vectors to the vector store. It first initializes the
   * index if it hasn't been initialized yet, then adds the vectors to the
   * index and the documents to the document store.
   * @param vectors The vectors to be added to the vector store.
   * @param documents The documents corresponding to the vectors.
   * @returns A Promise that resolves when the vectors and documents have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Method to perform a similarity search in the vector store using a query
   * vector. It returns the k most similar documents along with their
   * similarity scores. An optional filter function can be provided to
   * filter the documents.
   * @param query The query vector.
   * @param k The number of most similar documents to return.
   * @param filter An optional filter function to filter the documents.
   * @returns A Promise that resolves to an array of tuples, where each tuple contains a document and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Method to delete the vector store from a directory. It deletes the
   * hnswlib.index file, the docstore.json file, and the args.json file from
   * the directory.
   * @param params An object with a directory property that specifies the directory from which to delete the vector store.
   * @returns A Promise that resolves when the vector store has been deleted.
   */
  delete(params: {
    directory: string;
  }): Promise<void>;
  /**
   * Method to save the vector store to a directory. It saves the HNSW
   * index, the arguments, and the document store to the directory.
   * @param directory The directory to which to save the vector store.
   * @returns A Promise that resolves when the vector store has been saved.
   */
  save(directory: string): Promise<void>;
  /**
   * Static method to load a vector store from a directory. It reads the
   * HNSW index, the arguments, and the document store from the directory,
   * then creates a new HNSWLib instance with these values.
   * @param directory The directory from which to load the vector store.
   * @param embeddings The embeddings to be used by the HNSWLib instance.
   * @returns A Promise that resolves to a new HNSWLib instance.
   */
  static load(directory: string, embeddings: EmbeddingsInterface): Promise<HNSWLib>;
  /**
   * Static method to create a new HNSWLib instance from texts and metadata.
   * It creates a new Document instance for each text and metadata, then
   * calls the fromDocuments method to create the HNSWLib instance.
   * @param texts The texts to be used to create the documents.
   * @param metadatas The metadata to be used to create the documents.
   * @param embeddings The embeddings to be used by the HNSWLib instance.
   * @param dbConfig An optional configuration object for the document store.
   * @returns A Promise that resolves to a new HNSWLib instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  }): Promise<HNSWLib>;
  /**
   * Static method to create a new HNSWLib instance from documents. It
   * creates a new HNSWLib instance, adds the documents to it, then returns
   * the instance.
   * @param docs The documents to be added to the HNSWLib instance.
   * @param embeddings The embeddings to be used by the HNSWLib instance.
   * @param dbConfig An optional configuration object for the document store.
   * @returns A Promise that resolves to a new HNSWLib instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig?: {
    docstore?: in_memory_d_exports.SynchronousInMemoryDocstore;
  }): Promise<HNSWLib>;
  static imports(): Promise<{
    HierarchicalNSW: typeof HierarchicalNSW;
  }>;
}
//#endregion
export { HNSWLib, HNSWLibArgs, HNSWLibBase };
//# sourceMappingURL=hnswlib.d.cts.map