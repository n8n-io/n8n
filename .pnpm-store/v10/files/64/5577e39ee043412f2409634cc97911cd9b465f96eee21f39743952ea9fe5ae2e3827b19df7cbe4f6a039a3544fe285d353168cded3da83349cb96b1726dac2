import { GenerationChunk } from "@langchain/core/outputs";
import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import * as _huggingface_inference0 from "@huggingface/inference";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms/hf.d.ts

/**
 * Interface defining the parameters for configuring the Hugging Face
 * model for text generation.
 */
interface HFInput {
  /** Model to use */
  model: string;
  /** Custom inference endpoint URL to use */
  endpointUrl?: string;
  /** Sampling temperature to use */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the completion.
   */
  maxTokens?: number;
  /**
   * The model will stop generating text when one of the strings in the list is generated.
   */
  stopSequences?: string[];
  /** Total probability mass of tokens to consider at each step */
  topP?: number;
  /** Integer to define the top tokens considered within the sample operation to create new text. */
  topK?: number;
  /** Penalizes repeated tokens according to frequency */
  frequencyPenalty?: number;
  /** API key to use. */
  apiKey?: string;
  /**
   * Credentials to use for the request. If this is a string, it will be passed straight on. If it's a boolean, true will be "include" and false will not send credentials at all.
   */
  includeCredentials?: string | boolean;
}
/**
 * Class implementing the Large Language Model (LLM) interface using the
 * Hugging Face Inference API for text generation.
 * @example
 * ```typescript
 * const model = new HuggingFaceInference({
 *   model: "gpt2",
 *   temperature: 0.7,
 *   maxTokens: 50,
 * });
 *
 * const res = await model.invoke(
 *   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
 * );
 * console.log({ res });
 * ```
 */
declare class HuggingFaceInference extends LLM implements HFInput {
  lc_serializable: boolean;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  model: string;
  temperature: number | undefined;
  maxTokens: number | undefined;
  stopSequences: string[] | undefined;
  topP: number | undefined;
  topK: number | undefined;
  frequencyPenalty: number | undefined;
  apiKey: string | undefined;
  endpointUrl: string | undefined;
  includeCredentials: string | boolean | undefined;
  constructor(fields?: Partial<HFInput> & BaseLLMParams);
  _llmType(): string;
  invocationParams(options?: this["ParsedCallOptions"]): {
    model: string;
    parameters: {
      return_full_text: boolean;
      temperature: number | undefined;
      max_new_tokens: number | undefined;
      stop: string[] | undefined;
      top_p: number | undefined;
      top_k: number | undefined;
      repetition_penalty: number | undefined;
    };
  };
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
  private _prepareHFInference;
  /** @ignore */
  static imports(): Promise<{
    HfInference: typeof _huggingface_inference0.HfInference;
  }>;
}
//#endregion
export { HFInput, HuggingFaceInference };
//# sourceMappingURL=hf.d.ts.map