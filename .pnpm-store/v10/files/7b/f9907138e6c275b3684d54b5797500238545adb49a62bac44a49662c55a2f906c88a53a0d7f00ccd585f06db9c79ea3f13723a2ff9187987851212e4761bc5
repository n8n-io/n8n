import { ConfigurationParameters } from "../chat_models/minimax.js";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/minimax.d.ts

/**
 * Interface for MinimaxEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the MinimaxEmbeddings class.
 */
interface MinimaxEmbeddingsParams extends EmbeddingsParams {
  /**
   * Model name to use
   * Alias for `model`
   */
  modelName: string;
  /** Model name to use */
  model: string;
  /**
   * API key to use when making requests. Defaults to the value of
   * `MINIMAX_GROUP_ID` environment variable.
   */
  minimaxGroupId?: string;
  /**
   * Secret key to use when making requests. Defaults to the value of
   * `MINIMAX_API_KEY` environment variable.
   * Alias for `apiKey`
   */
  minimaxApiKey?: string;
  /**
   * Secret key to use when making requests. Defaults to the value of
   * `MINIMAX_API_KEY` environment variable.
   */
  apiKey?: string;
  /**
   * The maximum number of documents to embed in a single request. This is
   * limited by the Minimax API to a maximum of 4096.
   */
  batchSize?: number;
  /**
   * Whether to strip new lines from the input text. This is recommended by
   * Minimax, but may not be suitable for all use cases.
   */
  stripNewLines?: boolean;
  /**
   *  The target use-case after generating the vector.
   *  When using embeddings, the vector of the target content is first generated through the db and stored in the vector database,
   *  and then the vector of the retrieval text is generated through the query.
   *  Note: For the parameters of the partial algorithm, we adopted a separate algorithm plan for query and db.
   *  Therefore, for a paragraph of text, if it is to be used as a retrieval text, it should use the db,
   *  and if it is used as a retrieval text, it should use the query.
   */
  type?: "db" | "query";
}
interface CreateMinimaxEmbeddingRequest {
  /**
   * @type {string}
   * @memberof CreateMinimaxEmbeddingRequest
   */
  model: string;
  /**
   *  Text to generate vector expectation
   * @type {CreateEmbeddingRequestInput}
   * @memberof CreateMinimaxEmbeddingRequest
   */
  texts: string[];
  /**
   *  The target use-case after generating the vector. When using embeddings,
   *  first generate the vector of the target content through the db and store it in the vector database,
   *  and then generate the vector of the retrieval text through the query.
   *  Note: For the parameter of the algorithm, we use the algorithm scheme of query and db separation,
   *  so a text, if it is to be retrieved as a text, should use the db,
   *  if it is used as a retrieval text, should use the query.
   * @type {string}
   * @memberof CreateMinimaxEmbeddingRequest
   */
  type: "db" | "query";
}
/**
 * Class for generating embeddings using the Minimax API. Extends the
 * Embeddings class and implements MinimaxEmbeddingsParams
 * @example
 * ```typescript
 * const embeddings = new MinimaxEmbeddings();
 *
 * // Embed a single query
 * const queryEmbedding = await embeddings.embedQuery("Hello world");
 * console.log(queryEmbedding);
 *
 * // Embed multiple documents
 * const documentsEmbedding = await embeddings.embedDocuments([
 *   "Hello world",
 *   "Bye bye",
 * ]);
 * console.log(documentsEmbedding);
 * ```
 */
declare class MinimaxEmbeddings extends Embeddings implements MinimaxEmbeddingsParams {
  modelName: string;
  model: string;
  batchSize: number;
  stripNewLines: boolean;
  minimaxGroupId?: string;
  minimaxApiKey?: string;
  apiKey?: string;
  type: "db" | "query";
  apiUrl: string;
  basePath?: string;
  headers?: Record<string, string>;
  constructor(fields?: Partial<MinimaxEmbeddingsParams> & {
    configuration?: ConfigurationParameters;
  });
  /**
   * Method to generate embeddings for an array of documents. Splits the
   * documents into batches and makes requests to the Minimax API to generate
   * embeddings.
   * @param texts Array of documents to generate embeddings for.
   * @returns Promise that resolves to a 2D array of embeddings for each document.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /**
   * Method to generate an embedding for a single document. Calls the
   * embeddingWithRetry method with the document as the input.
   * @param text Document to generate an embedding for.
   * @returns Promise that resolves to an embedding for the document.
   */
  embedQuery(text: string): Promise<number[]>;
  private embeddingWithRetry;
}
//#endregion
export { CreateMinimaxEmbeddingRequest, MinimaxEmbeddings, MinimaxEmbeddingsParams };
//# sourceMappingURL=minimax.d.ts.map