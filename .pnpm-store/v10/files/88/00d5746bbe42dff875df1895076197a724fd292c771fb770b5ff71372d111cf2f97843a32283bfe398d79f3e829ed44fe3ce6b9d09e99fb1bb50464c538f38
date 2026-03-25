import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/zhipuai.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the ZhipuAIEmbeddingsParams class.
 */
interface ZhipuAIEmbeddingsParams extends EmbeddingsParams {
  /**
   * Model Name to use
   */
  modelName?: "embedding-2" | "embedding-3";
  /**
   * ZhipuAI API key to use
   */
  apiKey?: string;
  /**
   * Whether to strip new lines from the input text.
   */
  stripNewLines?: boolean;
}
interface EmbeddingData {
  embedding: number[];
  index: number;
  object: string;
}
interface TokenUsage {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
}
interface ZhipuAIEmbeddingsResult {
  model: string;
  data: EmbeddingData[];
  object: string;
  usage: TokenUsage;
}
declare class ZhipuAIEmbeddings extends Embeddings implements ZhipuAIEmbeddingsParams {
  modelName: ZhipuAIEmbeddingsParams["modelName"];
  apiKey?: string;
  stripNewLines: boolean;
  private embeddingsAPIURL;
  constructor(fields?: ZhipuAIEmbeddingsParams);
  private embeddingWithRetry;
  /**
   * Method to generate an embedding for a single document. Calls the
   * embeddingWithRetry method with the document as the input.
   * @param {string} text Document to generate an embedding for.
   * @returns {Promise<number[]>} Promise that resolves to an embedding for the document.
   */
  embedQuery(text: string): Promise<number[]>;
  /**
   * Method that takes an array of documents as input and returns a promise
   * that resolves to a 2D array of embeddings for each document. It calls
   * the embedQuery method for each document in the array.
   * @param documents Array of documents for which to generate embeddings.
   * @returns Promise that resolves to a 2D array of embeddings for each input document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
//#endregion
export { ZhipuAIEmbeddings, ZhipuAIEmbeddingsParams, ZhipuAIEmbeddingsResult };
//# sourceMappingURL=zhipuai.d.ts.map