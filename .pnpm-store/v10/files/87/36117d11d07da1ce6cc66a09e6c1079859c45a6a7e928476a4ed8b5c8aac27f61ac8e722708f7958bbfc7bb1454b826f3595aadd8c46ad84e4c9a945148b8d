import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/deepinfra.d.ts
interface DeepInfraEmbeddingsRequest {
  inputs: string[];
  normalize?: boolean;
  image?: string;
  webhook?: string;
}
/**
 * Input parameters for the DeepInfra embeddings
 */
interface DeepInfraEmbeddingsParams extends EmbeddingsParams {
  /**
   * The API token to use for authentication.
   * If not provided, it will be read from the `DEEPINFRA_API_TOKEN` environment variable.
   */
  apiToken?: string;
  /**
   * The model ID to use for generating completions.
   * Default: `sentence-transformers/clip-ViT-B-32`
   */
  modelName?: string;
  /**
   * The maximum number of texts to embed in a single request. This is
   * limited by the DeepInfra API to a maximum of 1024.
   */
  batchSize?: number;
}
/**
 * Response from the DeepInfra embeddings API.
 */
interface DeepInfraEmbeddingsResponse {
  /**
   * The embeddings generated for the input texts.
   */
  embeddings: number[][];
  /**
   * The number of tokens in the input texts.
   */
  input_tokens: number;
  /**
   * The status of the inference.
   */
  request_id?: string;
}
/**
 * A class for generating embeddings using the DeepInfra API.
 * @example
 * ```typescript
 * // Embed a query using the DeepInfraEmbeddings class
 * const model = new DeepInfraEmbeddings();
 * const res = await model.embedQuery(
 *   "What would be a good company name for a company that makes colorful socks?",
 * );
 * console.log({ res });
 * ```
 */
declare class DeepInfraEmbeddings extends Embeddings implements DeepInfraEmbeddingsParams {
  apiToken: string;
  batchSize: number;
  modelName: string;
  /**
   * Constructor for the DeepInfraEmbeddings class.
   * @param fields - An optional object with properties to configure the instance.
   */
  constructor(fields?: Partial<DeepInfraEmbeddingsParams> & {
    verbose?: boolean;
  });
  /**
   * Generates embeddings for an array of texts.
   * @param inputs - An array of strings to generate embeddings for.
   * @returns A Promise that resolves to an array of embeddings.
   */
  embedDocuments(inputs: string[]): Promise<number[][]>;
  /**
   * Generates an embedding for a single text.
   * @param text - A string to generate an embedding for.
   * @returns A Promise that resolves to an array of numbers representing the embedding.
   */
  embedQuery(text: string): Promise<number[]>;
  private embeddingWithRetry;
}
//#endregion
export { DeepInfraEmbeddings, DeepInfraEmbeddingsParams, DeepInfraEmbeddingsRequest, DeepInfraEmbeddingsResponse };
//# sourceMappingURL=deepinfra.d.ts.map