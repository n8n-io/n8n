import { OllamaCamelCaseOptions } from "./types.cjs";
import { Ollama } from "ollama/browser";
import { Options } from "ollama";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts

/**
 * Interface for OllamaEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the OllamaEmbeddings class.
 */
interface OllamaEmbeddingsParams extends EmbeddingsParams {
  /**
   * The Ollama model to use for embeddings.
   * @default "mxbai-embed-large"
   */
  model?: string;
  /**
   * Base URL of the Ollama server
   * @default "http://localhost:11434"
   */
  baseUrl?: string;
  /**
   * The number of dimensions for the embeddings.
   */
  dimensions?: number;
  /**
   * Defaults to "5m"
   */
  keepAlive?: string | number;
  /**
   * Whether or not to truncate the input text to fit inside the model's
   * context window.
   * @default false
   */
  truncate?: boolean;
  /**
   * Optional HTTP Headers to include in the request.
   */
  headers?: Headers | Record<string, string>;
  /**
   * Advanced Ollama API request parameters in camelCase, see
   * https://github.com/ollama/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values
   * for details of the available parameters.
   */
  requestOptions?: OllamaCamelCaseOptions & Partial<Options>;
  /**
   * The fetch function to use.
   * @default fetch
   */
  fetch?: typeof fetch;
}
declare class OllamaEmbeddings extends Embeddings {
  model: string;
  baseUrl: string;
  dimensions?: number;
  keepAlive?: string | number;
  requestOptions?: Partial<Options>;
  client: Ollama;
  truncate: boolean;
  constructor(fields?: OllamaEmbeddingsParams);
  /** convert camelCased Ollama request options like "useMMap" to
   * the snake_cased equivalent which the ollama API actually uses.
   * Used only for consistency with the llms/Ollama and chatModels/Ollama classes
   */
  _convertOptions(requestOptions: OllamaCamelCaseOptions): Partial<Options>;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  private embeddingWithRetry;
}
//#endregion
export { OllamaEmbeddings, OllamaEmbeddingsParams };
//# sourceMappingURL=embeddings.d.cts.map