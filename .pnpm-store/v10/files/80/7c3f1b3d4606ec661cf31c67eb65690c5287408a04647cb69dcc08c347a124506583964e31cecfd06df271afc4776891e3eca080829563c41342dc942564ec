import { LlamaBaseCppInputs } from "../utils/llama_cpp.js";
import { LlamaEmbeddingContext, LlamaModel } from "node-llama-cpp";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/llama_cpp.d.ts

/**
 * Note that the modelPath is the only required parameter. For testing you
 * can set this in the environment variable `LLAMA_PATH`.
 */
interface LlamaCppEmbeddingsParams extends LlamaBaseCppInputs, EmbeddingsParams {}
/**
 * @example
 * ```typescript
 * // Initialize LlamaCppEmbeddings with the path to the model file
 * const embeddings = await LlamaCppEmbeddings.initialize({
 *   modelPath: llamaPath,
 * });
 *
 * // Embed a query string using the Llama embeddings
 * const res = embeddings.embedQuery("Hello Llama!");
 *
 * // Output the resulting embeddings
 * console.log(res);
 *
 * ```
 */
declare class LlamaCppEmbeddings extends Embeddings {
  _model: LlamaModel;
  _embeddingContext: LlamaEmbeddingContext;
  constructor(inputs: LlamaCppEmbeddingsParams);
  /**
   * Initializes the llama_cpp model for usage in the embeddings wrapper.
   * @param inputs - the inputs passed onto the model.
   * @returns A Promise that resolves to the LlamaCppEmbeddings type class.
   */
  static initialize(inputs: LlamaBaseCppInputs): Promise<LlamaCppEmbeddings>;
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
}
//#endregion
export { LlamaCppEmbeddings, LlamaCppEmbeddingsParams };
//# sourceMappingURL=llama_cpp.d.ts.map