import { OllamaCamelCaseOptions } from "./types.cjs";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { Ollama } from "ollama/browser";
import { GenerationChunk } from "@langchain/core/outputs";
import { StringWithAutocomplete } from "@langchain/core/utils/types";
import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";

//#region src/llms.d.ts
interface OllamaCallOptions extends BaseLanguageModelCallOptions {
  images?: string[];
}
interface OllamaInput extends BaseLLMParams, OllamaCamelCaseOptions {
  /**
   * The model to use when making requests.
   * @default "llama3"
   */
  model?: string;
  /**
   * Optionally override the base URL to make request to.
   * This should only be set if your Ollama instance is being
   * server from a non-standard location.
   * @default "http://localhost:11434"
   */
  baseUrl?: string;
  format?: string;
  /**
   * Optional HTTP Headers to include in the request.
   */
  headers?: Headers | Record<string, string>;
  /**
   * The fetch function to use.
   * @default fetch
   */
  fetch?: typeof fetch;
}
/**
 * Class that represents the Ollama language model. It extends the base
 * LLM class and implements the OllamaInput interface.
 * @example
 * ```typescript
 * const ollama = new Ollama({
 *   baseUrl: "http://api.example.com",
 *   model: "llama3",
 * });
 *
 * // Streaming translation from English to German
 * const stream = await ollama.stream(
 *   `Translate "I love programming" into German.`
 * );
 *
 * const chunks = [];
 * for await (const chunk of stream) {
 *   chunks.push(chunk);
 * }
 *
 * console.log(chunks.join(""));
 * ```
 */
declare class Ollama$1 extends LLM<OllamaCallOptions> implements OllamaInput {
  static lc_name(): string;
  lc_serializable: boolean;
  model: string;
  baseUrl: string;
  keepAlive?: string | number;
  embeddingOnly?: boolean;
  f16KV?: boolean;
  frequencyPenalty?: number;
  logitsAll?: boolean;
  lowVram?: boolean;
  mainGpu?: number;
  mirostat?: number;
  mirostatEta?: number;
  mirostatTau?: number;
  numBatch?: number;
  numCtx?: number;
  numGpu?: number;
  numKeep?: number;
  numPredict?: number;
  numThread?: number;
  penalizeNewline?: boolean;
  presencePenalty?: number;
  repeatLastN?: number;
  repeatPenalty?: number;
  temperature?: number;
  stop?: string[];
  tfsZ?: number;
  topK?: number;
  topP?: number;
  typicalP?: number;
  useMLock?: boolean;
  useMMap?: boolean;
  vocabOnly?: boolean;
  format?: StringWithAutocomplete<"json">;
  client: Ollama;
  constructor(fields?: OllamaInput & BaseLLMParams);
  _llmType(): string;
  invocationParams(options?: this["ParsedCallOptions"]): {
    model: string;
    format: StringWithAutocomplete<"json"> | undefined;
    keep_alive: string | number | undefined;
    images: string[] | undefined;
    options: {
      embedding_only: boolean | undefined;
      f16_kv: boolean | undefined;
      frequency_penalty: number | undefined;
      logits_all: boolean | undefined;
      low_vram: boolean | undefined;
      main_gpu: number | undefined;
      mirostat: number | undefined;
      mirostat_eta: number | undefined;
      mirostat_tau: number | undefined;
      num_batch: number | undefined;
      num_ctx: number | undefined;
      num_gpu: number | undefined;
      num_keep: number | undefined;
      num_predict: number | undefined;
      num_thread: number | undefined;
      penalize_newline: boolean | undefined;
      presence_penalty: number | undefined;
      repeat_last_n: number | undefined;
      repeat_penalty: number | undefined;
      temperature: number | undefined;
      stop: string[] | undefined;
      tfs_z: number | undefined;
      top_k: number | undefined;
      top_p: number | undefined;
      typical_p: number | undefined;
      use_mlock: boolean | undefined;
      use_mmap: boolean | undefined;
      vocab_only: boolean | undefined;
    };
  };
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
}
//#endregion
export { Ollama$1 as Ollama, OllamaCallOptions, OllamaInput };
//# sourceMappingURL=llms.d.cts.map