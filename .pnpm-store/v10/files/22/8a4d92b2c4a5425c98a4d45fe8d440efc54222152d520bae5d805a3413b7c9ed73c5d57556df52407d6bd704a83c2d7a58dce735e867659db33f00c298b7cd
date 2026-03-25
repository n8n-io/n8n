import { TaskType } from "@google/generative-ai";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts
/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the GoogleGenerativeAIEmbeddings class.
 */
interface GoogleGenerativeAIEmbeddingsParams extends EmbeddingsParams {
  /**
   * Model Name to use
   *
   * Alias for `model`
   *
   * Note: The format must follow the pattern - `{model}`
   */
  modelName?: string;
  /**
   * Model Name to use
   *
   * Note: The format must follow the pattern - `{model}`
   */
  model?: string;
  /**
   * Type of task for which the embedding will be used
   *
   * Note: currently only supported by `embedding-001` model
   */
  taskType?: TaskType;
  /**
   * An optional title for the text. Only applicable when TaskType is
   * `RETRIEVAL_DOCUMENT`
   *
   * Note: currently only supported by `embedding-001` model
   */
  title?: string;
  /**
   * Whether to strip new lines from the input text. Default to true
   */
  stripNewLines?: boolean;
  /**
   * Google API key to use
   */
  apiKey?: string;
  /**
   * Google API base URL to use
   */
  baseUrl?: string;
}
/**
 * Class that extends the Embeddings class and provides methods for
 * generating embeddings using the Google Palm API.
 * @example
 * ```typescript
 * const model = new GoogleGenerativeAIEmbeddings({
 *   apiKey: "<YOUR API KEY>",
 *   modelName: "embedding-001",
 * });
 *
 * // Embed a single query
 * const res = await model.embedQuery(
 *   "What would be a good company name for a company that makes colorful socks?"
 * );
 * console.log({ res });
 *
 * // Embed multiple documents
 * const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
 * console.log({ documentRes });
 * ```
 */
declare class GoogleGenerativeAIEmbeddings extends Embeddings implements GoogleGenerativeAIEmbeddingsParams {
  apiKey?: string;
  modelName: string;
  model: string;
  taskType?: TaskType;
  title?: string;
  stripNewLines: boolean;
  maxBatchSize: number;
  private client;
  constructor(fields?: GoogleGenerativeAIEmbeddingsParams);
  private _convertToContent;
  protected _embedQueryContent(text: string): Promise<number[]>;
  protected _embedDocumentsContent(documents: string[]): Promise<number[][]>;
  /**
   * Method that takes a document as input and returns a promise that
   * resolves to an embedding for the document. It calls the _embedText
   * method with the document as the input.
   * @param document Document for which to generate an embedding.
   * @returns Promise that resolves to an embedding for the input document.
   */
  embedQuery(document: string): Promise<number[]>;
  /**
   * Method that takes an array of documents as input and returns a promise
   * that resolves to a 2D array of embeddings for each document. It calls
   * the _embedText method for each document in the array.
   * @param documents Array of documents for which to generate embeddings.
   * @returns Promise that resolves to a 2D array of embeddings for each input document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
//#endregion
export { GoogleGenerativeAIEmbeddings, GoogleGenerativeAIEmbeddingsParams };
//# sourceMappingURL=embeddings.d.ts.map