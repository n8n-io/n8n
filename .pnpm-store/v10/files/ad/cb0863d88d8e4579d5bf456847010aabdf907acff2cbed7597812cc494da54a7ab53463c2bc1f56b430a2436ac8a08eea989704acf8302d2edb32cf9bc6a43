import { CohereClientOptions } from "./client.js";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { Cohere, CohereClient } from "cohere-ai";
import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms.d.ts

/**
 * Interface for the input parameters specific to the Cohere model.
 */
interface BaseCohereInput extends BaseLLMParams {
  /** Sampling temperature to use */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the completion.
   */
  maxTokens?: number;
  /** Model to use */
  model?: string;
}
type CohereInput = BaseCohereInput & CohereClientOptions;
interface CohereCallOptions extends BaseLanguageModelCallOptions, Partial<Omit<Cohere.GenerateRequest, "message">> {}
/**
 * Class representing a Cohere Large Language Model (LLM). It interacts
 * with the Cohere API to generate text completions.
 * @example
 * ```typescript
 * const model = new Cohere({
 *   temperature: 0.7,
 *   maxTokens: 20,
 *   maxRetries: 5,
 * });
 *
 * const res = await model.invoke(
 *   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
 * );
 * console.log({ res });
 * ```
 */
declare class Cohere$1 extends LLM<CohereCallOptions> implements CohereInput {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  temperature: number;
  maxTokens: number;
  model: string;
  apiKey: string;
  client: CohereClient;
  constructor(fields?: CohereInput);
  _llmType(): string;
  invocationParams(options: this["ParsedCallOptions"]): {
    [k: string]: string | number | string[] | undefined;
  };
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
}
//#endregion
export { BaseCohereInput, Cohere$1 as Cohere, CohereInput };
//# sourceMappingURL=llms.d.ts.map