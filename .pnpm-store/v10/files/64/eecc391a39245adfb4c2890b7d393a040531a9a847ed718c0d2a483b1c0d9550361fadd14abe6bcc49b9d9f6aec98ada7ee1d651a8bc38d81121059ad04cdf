import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/voyage.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the VoyageEmbeddings class.
 */
interface VoyageEmbeddingsParams extends EmbeddingsParams {
  modelName: string;
  /**
   * The maximum number of documents to embed in a single request. This is
   * limited by the Voyage AI API to a maximum of 8.
   */
  batchSize?: number;
  /**
   * Input type for the embeddings request.
   */
  inputType?: string;
  /**
   * Whether to truncate the input texts to the maximum length allowed by the model.
   */
  truncation?: boolean;
  /**
   * The desired dimension of the output embeddings.
   */
  outputDimension?: number;
  /**
   * The data type of the output embeddings. Can be "float" or "int8".
   */
  outputDtype?: string;
  /**
   * The format of the output embeddings. Can be "float", "base64", or "ubinary".
   */
  encodingFormat?: string;
}
/**
 * Interface for the request body to generate embeddings.
 */
interface CreateVoyageEmbeddingRequest {
  /**
   * @type {string}
   * @memberof CreateVoyageEmbeddingRequest
   */
  model: string;
  /**
   *  Text to generate vector expectation
   * @type {CreateEmbeddingRequestInput}
   * @memberof CreateVoyageEmbeddingRequest
   */
  input: string | string[];
  /**
   * Input type for the embeddings request.
   */
  input_type?: string;
  /**
   * Whether to truncate the input texts.
   */
  truncation?: boolean;
  /**
   * The desired dimension of the output embeddings.
   */
  output_dimension?: number;
  /**
   * The data type of the output embeddings.
   */
  output_dtype?: string;
  /**
   * The format of the output embeddings.
   */
  encoding_format?: string;
}
/**
 * A class for generating embeddings using the Voyage AI API.
 */
declare class VoyageEmbeddings extends Embeddings implements VoyageEmbeddingsParams {
  modelName: string;
  batchSize: number;
  private apiKey;
  basePath?: string;
  apiUrl: string;
  headers?: Record<string, string>;
  inputType?: string;
  truncation?: boolean;
  outputDimension?: number;
  outputDtype?: string;
  encodingFormat?: string;
  /**
   * Constructor for the VoyageEmbeddings class.
   * @param fields - An optional object with properties to configure the instance.
   */
  constructor(fields?: Partial<VoyageEmbeddingsParams> & {
    verbose?: boolean;
    apiKey?: string;
    inputType?: string;
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
export { CreateVoyageEmbeddingRequest, VoyageEmbeddings, VoyageEmbeddingsParams };
//# sourceMappingURL=voyage.d.ts.map