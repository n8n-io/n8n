import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/fireworks.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the FireworksEmbeddings class.
 */
interface FireworksEmbeddingsParams extends EmbeddingsParams {
  /**
   * Model name to use.
   */
  model: string;
  /**
   * The maximum number of documents to embed in a single request. This is
   * limited by the Fireworks AI API to a maximum of 8.
   */
  batchSize?: number;
}
/**
 * Interface for the request body to generate embeddings.
 */
interface CreateFireworksEmbeddingRequest {
  /**
   * @type {string}
   * @memberof CreateFireworksEmbeddingRequest
   */
  model: string;
  /**
   *  Text to generate vector expectation
   * @type {CreateEmbeddingRequestInput}
   * @memberof CreateFireworksEmbeddingRequest
   */
  input: string | string[];
}
/**
 * A class for generating embeddings using the Fireworks AI API.
 */
declare class FireworksEmbeddings extends Embeddings implements FireworksEmbeddingsParams {
  model: string;
  batchSize: number;
  private apiKey;
  basePath?: string;
  apiUrl: string;
  headers?: Record<string, string>;
  /**
   * Constructor for the FireworksEmbeddings class.
   * @param fields - An optional object with properties to configure the instance.
   */
  constructor(fields?: Partial<FireworksEmbeddingsParams> & {
    verbose?: boolean;
    apiKey?: string;
  });
  /**
   * Generates embeddings for an array of texts.
   * @param texts - An array of strings to generate embeddings for.
   * @returns A Promise that resolves to an array of embeddings.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /**
   * Generates an embedding for a single text.
   * @param text - A string to generate an embedding for.
   * @returns A Promise that resolves to an array of numbers representing the embedding.
   */
  embedQuery(text: string): Promise<number[]>;
  private embeddingWithRetry;
}
//#endregion
export { CreateFireworksEmbeddingRequest, FireworksEmbeddings, FireworksEmbeddingsParams };
//# sourceMappingURL=fireworks.d.ts.map