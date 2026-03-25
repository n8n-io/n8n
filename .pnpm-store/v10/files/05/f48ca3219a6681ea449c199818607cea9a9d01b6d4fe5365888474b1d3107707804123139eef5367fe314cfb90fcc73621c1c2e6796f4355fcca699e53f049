import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";

//#region src/llms/writer.d.ts

/**
 * Interface for the input parameters specific to the Writer model.
 */
interface WriterInput extends BaseLLMParams {
  /** Writer API key */
  apiKey?: string;
  /** Writer organization ID */
  orgId?: string | number;
  /** Model to use */
  model?: string;
  /** Sampling temperature to use */
  temperature?: number;
  /** Minimum number of tokens to generate. */
  minTokens?: number;
  /** Maximum number of tokens to generate in the completion. */
  maxTokens?: number;
  /** Generates this many completions server-side and returns the "best"." */
  bestOf?: number;
  /** Penalizes repeated tokens according to frequency. */
  frequencyPenalty?: number;
  /** Whether to return log probabilities. */
  logprobs?: number;
  /** Number of completions to generate. */
  n?: number;
  /** Penalizes repeated tokens regardless of frequency. */
  presencePenalty?: number;
  /** Total probability mass of tokens to consider at each step. */
  topP?: number;
}
/**
 * Class representing a Writer Large Language Model (LLM). It interacts
 * with the Writer API to generate text completions.
 */
declare class Writer extends LLM implements WriterInput {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  apiKey: string;
  orgId: number;
  model: string;
  temperature?: number;
  minTokens?: number;
  maxTokens?: number;
  bestOf?: number;
  frequencyPenalty?: number;
  logprobs?: number;
  n?: number;
  presencePenalty?: number;
  topP?: number;
  constructor(fields?: WriterInput);
  _llmType(): string;
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
}
//#endregion
export { Writer, WriterInput };
//# sourceMappingURL=writer.d.cts.map