import { LlamaBaseCppInputs } from "../utils/llama_cpp.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { GbnfJsonSchema, LlamaChatSession, LlamaContext, LlamaGrammar, LlamaJsonSchemaGrammar, LlamaModel } from "node-llama-cpp";
import { BaseLLMCallOptions, BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms/llama_cpp.d.ts

/**
 * Note that the modelPath is the only required parameter. For testing you
 * can set this in the environment variable `LLAMA_PATH`.
 */
interface LlamaCppInputs extends LlamaBaseCppInputs, BaseLLMParams {}
interface LlamaCppCallOptions extends BaseLLMCallOptions {
  /** The maximum number of tokens the response should contain. */
  maxTokens?: number;
  /** A function called when matching the provided token array */
  onToken?: (tokens: number[]) => void;
}
/**
 *  To use this model you need to have the `node-llama-cpp` module installed.
 *  This can be installed using `npm install -S node-llama-cpp` and the minimum
 *  version supported in version 2.0.0.
 *  This also requires that have a locally built version of Llama3 installed.
 */
declare class LlamaCpp extends LLM<LlamaCppCallOptions> {
  lc_serializable: boolean;
  static inputs: LlamaCppInputs;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  trimWhitespaceSuffix?: boolean;
  _model: LlamaModel;
  _context: LlamaContext;
  _session: LlamaChatSession;
  _jsonSchema: LlamaJsonSchemaGrammar<GbnfJsonSchema> | undefined;
  _gbnf: LlamaGrammar | undefined;
  static lc_name(): string;
  constructor(inputs: LlamaCppInputs);
  /**
   * Initializes the llama_cpp model for usage.
   * @param inputs - the inputs passed onto the model.
   * @returns A Promise that resolves to the LlamaCpp type class.
   */
  static initialize(inputs: LlamaCppInputs): Promise<LlamaCpp>;
  _llmType(): string;
  /** @ignore */
  _call(prompt: string, options?: this["ParsedCallOptions"]): Promise<string>;
  _streamResponseChunks(prompt: string, _options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
}
//#endregion
export { LlamaCpp, LlamaCppCallOptions, LlamaCppInputs };
//# sourceMappingURL=llama_cpp.d.ts.map