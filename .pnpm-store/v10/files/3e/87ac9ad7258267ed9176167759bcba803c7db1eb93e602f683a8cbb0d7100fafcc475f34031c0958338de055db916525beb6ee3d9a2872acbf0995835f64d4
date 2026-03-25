import Prem from "@premai/prem-sdk";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/premai.d.ts

/**
 * Interface for PremEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the PremEmbeddings class.
 */
interface PremEmbeddingsParams extends EmbeddingsParams {
  /**
   * The Prem API key to use for requests.
   * @default process.env.PREM_API_KEY
   */
  apiKey?: string;
  baseUrl?: string;
  /**
   * The ID of the project to use.
   */
  project_id?: number | string;
  /**
   * The model to generate the embeddings.
   */
  model: string;
  encoding_format?: ("float" | "base64") & string;
  batchSize?: number;
}
/**
 * Class for generating embeddings using the Prem AI's API. Extends the
 * Embeddings class and implements PremEmbeddingsParams and
 */
declare class PremEmbeddings extends Embeddings implements PremEmbeddingsParams {
  client: Prem;
  batchSize: number;
  apiKey?: string;
  project_id: number;
  model: string;
  encoding_format?: ("float" | "base64") & string;
  constructor(fields: PremEmbeddingsParams);
  /**
   * Method to generate embeddings for an array of documents. Splits the
   * documents into batches and makes requests to the Prem API to generate
   * embeddings.
   * @param texts Array of documents to generate embeddings for.
   * @returns Promise that resolves to a 2D array of embeddings for each document.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /**
   * Method to generate an embedding for a single document. Calls the
   * embedDocuments method with the document as the input.
   * @param text Document to generate an embedding for.
   * @returns Promise that resolves to an embedding for the document.
   */
  embedQuery(text: string): Promise<number[]>;
}
//#endregion
export { PremEmbeddings, PremEmbeddingsParams };
//# sourceMappingURL=premai.d.cts.map