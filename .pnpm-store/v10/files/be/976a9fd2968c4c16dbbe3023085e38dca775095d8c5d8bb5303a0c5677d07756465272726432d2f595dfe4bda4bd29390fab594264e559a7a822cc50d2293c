import { CohereClientOptions } from "./client.cjs";
import { EmbedRequest } from "cohere-ai/api/client/index.js";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the CohereEmbeddings class.
 */
interface CohereEmbeddingsParams extends EmbeddingsParams {
  model?: string;
  /**
   * The maximum number of documents to embed in a single request. This is
   * limited by the Cohere API to a maximum of 96.
   */
  batchSize?: number;
  /**
   * Specifies the type of embeddings you want to generate.
   */
  embeddingTypes?: Array<string>;
  /**
   * Specifies the type of input you're giving to the model.
   * Not required for older versions of the embedding models (i.e. anything lower than v3),
   * but is required for more recent versions (i.e. anything bigger than v2).
   *
   * * `search_document` - Use this when you encode documents for embeddings that you store in a vector database for search use-cases.
   * * `search_query` - Use this when you query your vector DB to find relevant documents.
   * * `classification` - Use this when you use the embeddings as an input to a text classifier.
   * * `clustering` - Use this when you want to cluster the embeddings.
   */
  inputType?: string;
}
/**
 * A class for generating embeddings using the Cohere API.
 */
declare class CohereEmbeddings extends Embeddings implements CohereEmbeddingsParams {
  model: string | undefined;
  batchSize: number;
  embeddingTypes: string[];
  private client;
  /**
   * Constructor for the CohereEmbeddings class.
   * @param fields - An optional object with properties to configure the instance.
   */
  constructor(fields?: Partial<CohereEmbeddingsParams> & {
    verbose?: boolean;
  } & CohereClientOptions);
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
  embed(request: EmbedRequest): Promise<number[]>;
  private embeddingWithRetry;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
}
//#endregion
export { CohereEmbeddings, CohereEmbeddingsParams };
//# sourceMappingURL=embeddings.d.cts.map