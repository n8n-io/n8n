import { AsyncCaller, AsyncCallerParams } from "./utils/async_caller.js";

//#region src/embeddings.d.ts
/**
 * The parameters required to initialize an instance of the Embeddings
 * class.
 */
type EmbeddingsParams = AsyncCallerParams;
interface EmbeddingsInterface<TOutput = number[]> {
  /**
   * An abstract method that takes an array of documents as input and
   * returns a promise that resolves to an array of vectors for each
   * document.
   * @param documents An array of documents to be embedded.
   * @returns A promise that resolves to an array of vectors for each document.
   */
  embedDocuments(documents: string[]): Promise<TOutput[]>;
  /**
   * An abstract method that takes a single document as input and returns a
   * promise that resolves to a vector for the query document.
   * @param document A single document to be embedded.
   * @returns A promise that resolves to a vector for the query document.
   */
  embedQuery(document: string): Promise<TOutput>;
}
/**
 * An abstract class that provides methods for embedding documents and
 * queries using LangChain.
 */
declare abstract class Embeddings<TOutput = number[]> implements EmbeddingsInterface<TOutput> {
  /**
   * The async caller should be used by subclasses to make any async calls,
   * which will thus benefit from the concurrency and retry logic.
   */
  caller: AsyncCaller;
  constructor(params: EmbeddingsParams);
  /**
   * An abstract method that takes an array of documents as input and
   * returns a promise that resolves to an array of vectors for each
   * document.
   * @param documents An array of documents to be embedded.
   * @returns A promise that resolves to an array of vectors for each document.
   */
  abstract embedDocuments(documents: string[]): Promise<TOutput[]>;
  /**
   * An abstract method that takes a single document as input and returns a
   * promise that resolves to a vector for the query document.
   * @param document A single document to be embedded.
   * @returns A promise that resolves to a vector for the query document.
   */
  abstract embedQuery(document: string): Promise<TOutput>;
}
//#endregion
export { Embeddings, EmbeddingsInterface, EmbeddingsParams };
//# sourceMappingURL=embeddings.d.ts.map