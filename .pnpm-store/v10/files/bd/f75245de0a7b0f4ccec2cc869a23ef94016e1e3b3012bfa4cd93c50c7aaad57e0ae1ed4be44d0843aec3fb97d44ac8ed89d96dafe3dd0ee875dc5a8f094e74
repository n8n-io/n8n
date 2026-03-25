import { GbnfJsonSchema, LlamaChatSession, LlamaContext, LlamaEmbeddingContext, LlamaGrammar, LlamaJsonSchemaGrammar, LlamaModel } from "node-llama-cpp";

//#region src/utils/llama_cpp.d.ts

/**
 * Note that the modelPath is the only required parameter. For testing you
 * can set this in the environment variable `LLAMA_PATH`.
 */
interface LlamaBaseCppInputs {
  /** Prompt processing batch size. */
  batchSize?: number;
  /** Text context size. */
  contextSize?: number;
  /** Embedding mode only. */
  embedding?: boolean;
  /** Use fp16 for KV cache. */
  f16Kv?: boolean;
  /** Number of layers to store in VRAM. */
  gpuLayers?: number;
  /** The llama_eval() call computes all logits, not just the last one. */
  logitsAll?: boolean;
  /** */
  maxTokens?: number;
  /** Path to the model on the filesystem. */
  modelPath: string;
  /** Add the begining of sentence token.  */
  prependBos?: boolean;
  /** If null, a random seed will be used. */
  seed?: null | number;
  /** The randomness of the responses, e.g. 0.1 deterministic, 1.5 creative, 0.8 balanced, 0 disables. */
  temperature?: number;
  /** Number of threads to use to evaluate tokens. */
  threads?: number;
  /** Trim whitespace from the end of the generated text Disabled by default. */
  trimWhitespaceSuffix?: boolean;
  /** Consider the n most likely tokens, where n is 1 to vocabulary size, 0 disables (uses full vocabulary). Note: only applies when `temperature` > 0. */
  topK?: number;
  /** Selects the smallest token set whose probability exceeds P, where P is between 0 - 1, 1 disables. Note: only applies when `temperature` > 0. */
  topP?: number;
  /** Force system to keep model in RAM. */
  useMlock?: boolean;
  /** Use mmap if possible. */
  useMmap?: boolean;
  /** Only load the vocabulary, no weights. */
  vocabOnly?: boolean;
  /** JSON schema to be used to format output. Also known as `grammar`. */
  jsonSchema?: object;
  /** GBNF string to be used to format output. Also known as `grammar`. */
  gbnf?: string;
}
//#endregion
export { LlamaBaseCppInputs };
//# sourceMappingURL=llama_cpp.d.ts.map