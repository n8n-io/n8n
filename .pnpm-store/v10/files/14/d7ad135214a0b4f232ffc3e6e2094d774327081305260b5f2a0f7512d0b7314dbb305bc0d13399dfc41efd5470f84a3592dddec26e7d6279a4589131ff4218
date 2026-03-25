import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { DocumentInterface } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Index, QueryResult } from "@upstash/vector";

//#region src/vectorstores/upstash.d.ts

/**
 * This interface defines the arguments for the UpstashVectorStore class.
 */
interface UpstashVectorLibArgs extends AsyncCallerParams {
  index: Index;
  filter?: string;
  namespace?: string;
}
type UpstashMetadata = Record<string, any>;
type UpstashQueryMetadata = UpstashMetadata & {
  _pageContentLC: any;
};
/**
 * Type that defines the parameters for the delete method.
 * It can either contain the target id(s) or the deleteAll config to reset all the vectors.
 */
type UpstashDeleteParams = {
  ids: string | string[];
  deleteAll?: never;
} | {
  deleteAll: boolean;
  ids?: never;
};
/**
 * The main class that extends the 'VectorStore' class. It provides
 * methods for interacting with Upstash index, such as adding documents,
 * deleting documents, performing similarity search and more.
 */
declare class UpstashVectorStore extends VectorStore {
  FilterType: string;
  index: Index;
  caller: AsyncCaller;
  useUpstashEmbeddings?: boolean;
  filter?: this["FilterType"];
  namespace?: string;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: UpstashVectorLibArgs);
  /**
   * This method adds documents to Upstash database. Documents are first converted to vectors
   * using the provided embeddings instance, and then upserted to the database.
   * @param documents Array of Document objects to be added to the database.
   * @param options Optional object containing array of ids for the documents.
   * @returns Promise that resolves with the ids of the provided documents when the upsert operation is done.
   */
  addDocuments(documents: DocumentInterface[], options?: {
    ids?: string[];
    useUpstashEmbeddings?: boolean;
  }): Promise<string[]>;
  /**
   * This method adds the provided vectors to Upstash database.
   * @param vectors  Array of vectors to be added to the Upstash database.
   * @param documents Array of Document objects, each associated with a vector.
   * @param options Optional object containing the array of ids foor the vectors.
   * @returns Promise that resolves with the ids of the provided documents when the upsert operation is done.
   */
  addVectors(vectors: number[][], documents: DocumentInterface[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * This method adds the provided documents to Upstash database. The pageContent of the documents will be embedded by Upstash Embeddings.
   * @param documents Array of Document objects to be added to the Upstash database.
   * @param options Optional object containing the array of ids for the documents.
   * @returns Promise that resolves with the ids of the provided documents when the upsert operation is done.
   */
  protected _addData(documents: DocumentInterface[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * This method deletes documents from the Upstash database. You can either
   * provide the target ids, or delete all vectors in the database.
   * @param params Object containing either array of ids of the documents or boolean deleteAll.
   * @returns Promise that resolves when the specified documents have been deleted from the database.
   */
  delete(params: UpstashDeleteParams): Promise<void>;
  protected _runUpstashQuery(query: number[] | string, k: number, filter?: this["FilterType"], options?: {
    includeVectors: boolean;
  }): Promise<QueryResult<UpstashQueryMetadata>[]>;
  /**
   * This method performs a similarity search in the Upstash database
   * over the existing vectors.
   * @param query Query vector for the similarity search.
   * @param k The number of similar vectors to return as result.
   * @returns Promise that resolves with an array of tuples, each containing
   *  Document object and similarity score. The length of the result will be
   *  maximum of 'k' and vectors in the index.
   */
  similaritySearchVectorWithScore(query: number[] | string, k: number, filter?: this["FilterType"]): Promise<[DocumentInterface, number][]>;
  /**
   * This method creates a new UpstashVector instance from an array of texts.
   * The texts are initially converted to Document instances and added to Upstash
   * database.
   * @param texts The texts to create the documents from.
   * @param metadatas The metadata values associated with the texts.
   * @param embeddings Embedding interface of choice, to create the text embeddings.
   * @param dbConfig Object containing the Upstash database configs.
   * @returns Promise that resolves with a new UpstashVector instance.
   */
  static fromTexts(texts: string[], metadatas: UpstashMetadata | UpstashMetadata[], embeddings: EmbeddingsInterface, dbConfig: UpstashVectorLibArgs): Promise<UpstashVectorStore>;
  /**
   * This method creates a new UpstashVector instance from an array of Document instances.
   * @param docs The docs to be added to Upstash database.
   * @param embeddings Embedding interface of choice, to create the embeddings.
   * @param dbConfig Object containing the Upstash database configs.
   * @returns Promise that resolves with a new UpstashVector instance
   */
  static fromDocuments(docs: DocumentInterface[], embeddings: EmbeddingsInterface, dbConfig: UpstashVectorLibArgs): Promise<UpstashVectorStore>;
  /**
   * This method creates a new UpstashVector instance from an existing index.
   * @param embeddings Embedding interface of the choice, to create the embeddings.
   * @param dbConfig Object containing the Upstash database configs.
   * @returns
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: UpstashVectorLibArgs): Promise<UpstashVectorStore>;
}
//#endregion
export { UpstashDeleteParams, UpstashMetadata, UpstashQueryMetadata, UpstashVectorLibArgs, UpstashVectorStore };
//# sourceMappingURL=upstash.d.cts.map