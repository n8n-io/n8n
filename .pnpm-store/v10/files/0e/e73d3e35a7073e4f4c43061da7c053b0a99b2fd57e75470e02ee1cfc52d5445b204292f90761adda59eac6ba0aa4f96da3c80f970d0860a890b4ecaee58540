import { GenerationChunk } from "@langchain/core/outputs";
import { BaseLLMCallOptions, BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms/friendli.d.ts

/**
 * The FriendliParams interface defines the input parameters for
 * the Friendli class.
 */
interface FriendliParams extends BaseLLMParams {
  /**
   * Model name to use.
   */
  model?: string;
  /**
   * Base endpoint url.
   */
  baseUrl?: string;
  /**
   * Friendli personal access token to run as.
   */
  friendliToken?: string;
  /**
   * Friendli team ID to run as.
   */
  friendliTeam?: string;
  /**
   * Number between -2.0 and 2.0. Positive values penalizes tokens that have been
   * sampled, taking into account their frequency in the preceding text. This
   * penalization diminishes the model's tendency to reproduce identical lines
   * verbatim.
   */
  frequencyPenalty?: number;
  /**
   * Number between -2.0 and 2.0. Positive values penalizes tokens that have been
   * sampled at least once in the existing text.
   * presence_penalty: Optional[float] = None
   * The maximum number of tokens to generate. The length of your input tokens plus
   * `max_tokens` should not exceed the model's maximum length (e.g., 2048 for OpenAI
   * GPT-3)
   */
  maxTokens?: number;
  /**
   * When one of the stop phrases appears in the generation result, the API will stop
   * generation. The phrase is included in the generated result. If you are using
   * beam search, all of the active beams should contain the stop phrase to terminate
   * generation. Before checking whether a stop phrase is included in the result, the
   * phrase is converted into tokens.
   */
  stop?: string[];
  /**
   * Sampling temperature. Smaller temperature makes the generation result closer to
   * greedy, argmax (i.e., `top_k = 1`) sampling. If it is `None`, then 1.0 is used.
   */
  temperature?: number;
  /**
   * Tokens comprising the top `top_p` probability mass are kept for sampling. Numbers
   * between 0.0 (exclusive) and 1.0 (inclusive) are allowed. If it is `None`, then 1.0
   * is used by default.
   */
  topP?: number;
  /**
   * Additional kwargs to pass to the model.
   */
  modelKwargs?: Record<string, unknown>;
}
/**
 * The Friendli class is used to interact with Friendli inference Endpoint models.
 * This requires your Friendli Token and Friendli Team which is autoloaded if not specified.
 */
declare class Friendli extends LLM<BaseLLMCallOptions> {
  lc_serializable: boolean;
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  model: string;
  baseUrl: string;
  friendliToken?: string;
  friendliTeam?: string;
  frequencyPenalty?: number;
  maxTokens?: number;
  stop?: string[];
  temperature?: number;
  topP?: number;
  modelKwargs?: Record<string, unknown>;
  constructor(fields: FriendliParams);
  _llmType(): string;
  private constructHeaders;
  private constructBody;
  /**
   * Calls the Friendli endpoint and retrieves the result.
   * @param {string} prompt The input prompt.
   * @returns {Promise<string>} A promise that resolves to the generated string.
   */
  /** @ignore */
  _call(prompt: string, _options: this["ParsedCallOptions"]): Promise<string>;
  _streamResponseChunks(prompt: string, _options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
}
//#endregion
export { Friendli, FriendliParams };
//# sourceMappingURL=friendli.d.ts.map