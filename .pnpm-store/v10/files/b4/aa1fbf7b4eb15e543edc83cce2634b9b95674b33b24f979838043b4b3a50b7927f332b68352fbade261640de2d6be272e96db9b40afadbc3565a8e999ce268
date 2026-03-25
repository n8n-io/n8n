import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { InferenceClient, InferenceProviderOrPolicy } from "@huggingface/inference";

//#region src/embeddings/hf.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the HuggingFaceInferenceEmbeddings class.
 */
interface HuggingFaceInferenceEmbeddingsParams extends EmbeddingsParams {
  apiKey?: string;
  model?: string;
  endpointUrl?: string;
  provider?: InferenceProviderOrPolicy;
}
/**
 * Class that extends the Embeddings class and provides methods for
 * generating embeddings using Hugging Face models through the
 * HuggingFaceInference API.
 */
declare class HuggingFaceInferenceEmbeddings extends Embeddings implements HuggingFaceInferenceEmbeddingsParams {
  apiKey?: string;
  model: string;
  endpointUrl?: string;
  provider?: InferenceProviderOrPolicy;
  client: InferenceClient;
  constructor(fields?: HuggingFaceInferenceEmbeddingsParams);
  _embed(texts: string[]): Promise<number[][]>;
  /**
   * Method that takes a document as input and returns a promise that
   * resolves to an embedding for the document. It calls the _embed method
   * with the document as the input and returns the first embedding in the
   * resulting array.
   * @param document Document to generate an embedding for.
   * @returns Promise that resolves to an embedding for the document.
   */
  embedQuery(document: string): Promise<number[]>;
  /**
   * Method that takes an array of documents as input and returns a promise
   * that resolves to a 2D array of embeddings for each document. It calls
   * the _embed method with the documents as the input.
   * @param documents Array of documents to generate embeddings for.
   * @returns Promise that resolves to a 2D array of embeddings for each document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
//#endregion
export { HuggingFaceInferenceEmbeddings, HuggingFaceInferenceEmbeddingsParams };
//# sourceMappingURL=hf.d.cts.map