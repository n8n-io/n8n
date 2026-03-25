import { BeforeRequestHook, HTTPClient, RequestErrorHook, ResponseHook } from "@mistralai/mistralai/lib/http.js";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts

/**
 * Interface for MistralAIEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the MistralAIEmbeddings class.
 */
interface MistralAIEmbeddingsParams extends EmbeddingsParams {
  /**
   * The API key to use.
   * @default {process.env.MISTRAL_API_KEY}
   */
  apiKey?: string;
  /**
   * The name of the model to use.
   * Alias for `model`.
   * @default {"mistral-embed"}
   */
  modelName?: string;
  /**
   * The name of the model to use.
   * @default {"mistral-embed"}
   */
  model?: string;
  /**
   * The format of the output data.
   * @default {"float"}
   */
  encodingFormat?: string;
  /**
   * Override the default server URL used by the Mistral SDK.
   * @deprecated use serverURL instead
   */
  endpoint?: string;
  /**
   * Override the default server URL used by the Mistral SDK.
   */
  serverURL?: string;
  /**
   * The maximum number of documents to embed in a single request.
   * @default {512}
   */
  batchSize?: number;
  /**
   * Whether to strip new lines from the input text. This is recommended,
   * but may not be suitable for all use cases.
   * @default {true}
   */
  stripNewLines?: boolean;
  /**
   * A list of custom hooks that must follow (req: Request) => Awaitable<Request | void>
   * They are automatically added when a ChatMistralAI instance is created
   */
  beforeRequestHooks?: BeforeRequestHook[];
  /**
   * A list of custom hooks that must follow (err: unknown, req: Request) => Awaitable<void>
   * They are automatically added when a ChatMistralAI instance is created
   */
  requestErrorHooks?: RequestErrorHook[];
  /**
   * A list of custom hooks that must follow (res: Response, req: Request) => Awaitable<void>
   * They are automatically added when a ChatMistralAI instance is created
   */
  responseHooks?: ResponseHook[];
  /**
   * Optional custom HTTP client to manage API requests
   * Allows users to add custom fetch implementations, hooks, as well as error and response processing.
   */
  httpClient?: HTTPClient;
}
/**
 * Class for generating embeddings using the MistralAI API.
 */
declare class MistralAIEmbeddings extends Embeddings implements MistralAIEmbeddingsParams {
  modelName: string;
  model: string;
  encodingFormat: string;
  batchSize: number;
  stripNewLines: boolean;
  apiKey: string;
  /**
   * @deprecated use serverURL instead
   */
  endpoint: string;
  serverURL?: string;
  beforeRequestHooks?: Array<BeforeRequestHook>;
  requestErrorHooks?: Array<RequestErrorHook>;
  responseHooks?: Array<ResponseHook>;
  httpClient?: HTTPClient;
  constructor(fields?: Partial<MistralAIEmbeddingsParams>);
  /**
   * Method to generate embeddings for an array of documents. Splits the
   * documents into batches and makes requests to the MistralAI API to generate
   * embeddings.
   * @param {Array<string>} texts Array of documents to generate embeddings for.
   * @returns {Promise<number[][]>} Promise that resolves to a 2D array of embeddings for each document.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /**
   * Method to generate an embedding for a single document. Calls the
   * embeddingWithRetry method with the document as the input.
   * @param {string} text Document to generate an embedding for.
   * @returns {Promise<number[]>} Promise that resolves to an embedding for the document.
   */
  embedQuery(text: string): Promise<number[]>;
  private embeddingWithRetry;
  addAllHooksToHttpClient(): void;
  removeAllHooksFromHttpClient(): void;
  removeHookFromHttpClient(hook: BeforeRequestHook | RequestErrorHook | ResponseHook): void;
  private imports;
}
//#endregion
export { MistralAIEmbeddings, MistralAIEmbeddingsParams };
//# sourceMappingURL=embeddings.d.ts.map