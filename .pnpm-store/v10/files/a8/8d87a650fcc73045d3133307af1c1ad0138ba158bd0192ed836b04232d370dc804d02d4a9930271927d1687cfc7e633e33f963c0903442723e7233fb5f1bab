import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";

//#region src/llms/aleph_alpha.d.ts

/**
 * Interface for the input parameters specific to the Aleph Alpha LLM.
 */
interface AlephAlphaInput extends BaseLLMParams {
  model: string;
  maximum_tokens: number;
  minimum_tokens?: number;
  echo?: boolean;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  sequence_penalty?: number;
  sequence_penalty_min_length?: number;
  repetition_penalties_include_prompt?: boolean;
  repetition_penalties_include_completion?: boolean;
  use_multiplicative_presence_penalty?: boolean;
  use_multiplicative_frequency_penalty?: boolean;
  use_multiplicative_sequence_penalty?: boolean;
  penalty_bias?: string;
  penalty_exceptions?: string[];
  penalty_exceptions_include_stop_sequences?: boolean;
  best_of?: number;
  n?: number;
  logit_bias?: object;
  log_probs?: number;
  tokens?: boolean;
  raw_completion: boolean;
  disable_optimizations?: boolean;
  completion_bias_inclusion?: string[];
  completion_bias_inclusion_first_token_only: boolean;
  completion_bias_exclusion?: string[];
  completion_bias_exclusion_first_token_only: boolean;
  contextual_control_threshold?: number;
  control_log_additive: boolean;
  stop?: string[];
  aleph_alpha_api_key?: string;
  base_url: string;
}
/**
 * Specific implementation of a Large Language Model (LLM) designed to
 * interact with the Aleph Alpha API. It extends the base LLM class and
 * includes a variety of parameters for customizing the behavior of the
 * Aleph Alpha model.
 */
declare class AlephAlpha extends LLM implements AlephAlphaInput {
  lc_serializable: boolean;
  model: string;
  maximum_tokens: number;
  minimum_tokens: number;
  echo: boolean;
  temperature: number;
  top_k: number;
  top_p: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  sequence_penalty?: number;
  sequence_penalty_min_length?: number;
  repetition_penalties_include_prompt?: boolean;
  repetition_penalties_include_completion?: boolean;
  use_multiplicative_presence_penalty?: boolean;
  use_multiplicative_frequency_penalty?: boolean;
  use_multiplicative_sequence_penalty?: boolean;
  penalty_bias?: string;
  penalty_exceptions?: string[];
  penalty_exceptions_include_stop_sequences?: boolean;
  best_of?: number;
  n?: number;
  logit_bias?: object;
  log_probs?: number;
  tokens?: boolean;
  raw_completion: boolean;
  disable_optimizations?: boolean;
  completion_bias_inclusion?: string[];
  completion_bias_inclusion_first_token_only: boolean;
  completion_bias_exclusion?: string[];
  completion_bias_exclusion_first_token_only: boolean;
  contextual_control_threshold?: number;
  control_log_additive: boolean;
  aleph_alpha_api_key?: string | undefined;
  stop?: string[];
  base_url: string;
  constructor(fields: Partial<AlephAlpha>);
  /**
   * Validates the environment by ensuring the necessary Aleph Alpha API key
   * is available. Throws an error if the API key is missing.
   */
  validateEnvironment(): void;
  /** Get the default parameters for calling Aleph Alpha API. */
  get defaultParams(): {
    model: string;
    temperature: number;
    maximum_tokens: number;
    minimum_tokens: number;
    top_k: number;
    top_p: number;
    presence_penalty: number | undefined;
    frequency_penalty: number | undefined;
    sequence_penalty: number | undefined;
    sequence_penalty_min_length: number | undefined;
    repetition_penalties_include_prompt: boolean | undefined;
    repetition_penalties_include_completion: boolean | undefined;
    use_multiplicative_presence_penalty: boolean | undefined;
    use_multiplicative_frequency_penalty: boolean | undefined;
    use_multiplicative_sequence_penalty: boolean | undefined;
    penalty_bias: string | undefined;
    penalty_exceptions: string[] | undefined;
    penalty_exceptions_include_stop_sequences: boolean | undefined;
    best_of: number | undefined;
    n: number | undefined;
    logit_bias: object | undefined;
    log_probs: number | undefined;
    tokens: boolean | undefined;
    raw_completion: boolean;
    disable_optimizations: boolean | undefined;
    completion_bias_inclusion: string[] | undefined;
    completion_bias_inclusion_first_token_only: boolean;
    completion_bias_exclusion: string[] | undefined;
    completion_bias_exclusion_first_token_only: boolean;
    contextual_control_threshold: number | undefined;
    control_log_additive: boolean;
  };
  /** Get the identifying parameters for this LLM. */
  get identifyingParams(): {
    model: string;
    temperature: number;
    maximum_tokens: number;
    minimum_tokens: number;
    top_k: number;
    top_p: number;
    presence_penalty: number | undefined;
    frequency_penalty: number | undefined;
    sequence_penalty: number | undefined;
    sequence_penalty_min_length: number | undefined;
    repetition_penalties_include_prompt: boolean | undefined;
    repetition_penalties_include_completion: boolean | undefined;
    use_multiplicative_presence_penalty: boolean | undefined;
    use_multiplicative_frequency_penalty: boolean | undefined;
    use_multiplicative_sequence_penalty: boolean | undefined;
    penalty_bias: string | undefined;
    penalty_exceptions: string[] | undefined;
    penalty_exceptions_include_stop_sequences: boolean | undefined;
    best_of: number | undefined;
    n: number | undefined;
    logit_bias: object | undefined;
    log_probs: number | undefined;
    tokens: boolean | undefined;
    raw_completion: boolean;
    disable_optimizations: boolean | undefined;
    completion_bias_inclusion: string[] | undefined;
    completion_bias_inclusion_first_token_only: boolean;
    completion_bias_exclusion: string[] | undefined;
    completion_bias_exclusion_first_token_only: boolean;
    contextual_control_threshold: number | undefined;
    control_log_additive: boolean;
  };
  /** Get the type of LLM. */
  _llmType(): string;
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
}
//#endregion
export { AlephAlpha, AlephAlphaInput };
//# sourceMappingURL=aleph_alpha.d.cts.map