import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/gradient_ai.d.ts

/**
 * Interface for GradientEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the GradientEmbeddings class.
 */
interface GradientEmbeddingsParams extends EmbeddingsParams {
  /**
   * Gradient AI Access Token.
   * Provide Access Token if you do not wish to automatically pull from env.
   */
  gradientAccessKey?: string;
  /**
   * Gradient Workspace Id.
   * Provide workspace id if you do not wish to automatically pull from env.
   */
  workspaceId?: string;
}
/**
 * Class for generating embeddings using the Gradient AI's API. Extends the
 * Embeddings class and implements GradientEmbeddingsParams and
 */
declare class GradientEmbeddings extends Embeddings implements GradientEmbeddingsParams {
  gradientAccessKey?: string;
  workspaceId?: string;
  batchSize: number;
  model: any;
  constructor(fields: GradientEmbeddingsParams);
  /**
   * Method to generate embeddings for an array of documents. Splits the
   * documents into batches and makes requests to the Gradient API to generate
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
  /**
   * Method to set the model to use for generating embeddings.
   * @sets the class' `model` value to that of the retrieved Embeddings Model.
   */
  setModel(): Promise<void>;
}
//#endregion
export { GradientEmbeddings, GradientEmbeddingsParams };
//# sourceMappingURL=gradient_ai.d.cts.map