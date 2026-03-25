import { GenerationChunk } from "@langchain/core/outputs";
import { BaseLLMCallOptions, BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms/togetherai.d.ts

/**
 * Note that the modelPath is the only required parameter. For testing you
 * can set this in the environment variable `LLAMA_PATH`.
 */
interface TogetherAIInputs extends BaseLLMParams {
  /**
   * The API key to use for the TogetherAI API.
   * @default {process.env.TOGETHER_AI_API_KEY}
   */
  apiKey?: string;
  /**
   * The name of the model to query.
   * Alias for `model`
   */
  modelName?: string;
  /**
   * The name of the model to query.
   */
  model?: string;
  /**
   * A decimal number that determines the degree of randomness in the response.
   * A value of 1 will always yield the same output.
   * A temperature less than 1 favors more correctness and is appropriate for question answering or summarization.
   * A value greater than 1 introduces more randomness in the output.
   * @default {0.7}
   */
  temperature?: number;
  /**
   * Whether or not to stream tokens as they are generated.
   * @default {false}
   */
  streaming?: boolean;
  /**
   * The `topP` (nucleus) parameter is used to dynamically adjust the number of choices for each predicted token based on the cumulative probabilities.
   * It specifies a probability threshold, below which all less likely tokens are filtered out.
   * This technique helps to maintain diversity and generate more fluent and natural-sounding text.
   * @default {0.7}
   */
  topP?: number;
  /**
   * The `topK` parameter is used to limit the number of choices for the next predicted word or token.
   * It specifies the maximum number of tokens to consider at each step, based on their probability of occurrence.
   * This technique helps to speed up the generation process and can improve the quality of the generated text by focusing on the most likely options.
   * @default {50}
   */
  topK?: number;
  /**
   * A number that controls the diversity of generated text by reducing the likelihood of repeated sequences.
   * Higher values decrease repetition.
   * @default {1}
   */
  repetitionPenalty?: number;
  /**
   * An integer that specifies how many top token log probabilities are included in the response for each token generation step.
   */
  logprobs?: number;
  /**
   * Run an LLM-based input-output safeguard model on top of any model.
   */
  safetyModel?: string;
  /**
   * Limit the number of tokens generated.
   */
  maxTokens?: number;
  /**
   * A list of tokens at which the generation should stop.
   */
  stop?: string[];
}
interface TogetherAICallOptions extends BaseLLMCallOptions, Pick<TogetherAIInputs, "modelName" | "model" | "temperature" | "topP" | "topK" | "repetitionPenalty" | "logprobs" | "safetyModel" | "maxTokens" | "stop"> {}
declare class TogetherAI extends LLM<TogetherAICallOptions> {
  lc_serializable: boolean;
  static inputs: TogetherAIInputs;
  temperature: number;
  topP: number;
  topK: number;
  modelName: string;
  model: string;
  streaming: boolean;
  repetitionPenalty: number;
  logprobs?: number;
  maxTokens?: number;
  safetyModel?: string;
  stop?: string[];
  private apiKey;
  private inferenceAPIUrl;
  static lc_name(): string;
  /**
   * Check if a model name appears to be a chat/instruct model
   * @param modelName The model name to check
   * @returns true if the model appears to be a chat/instruct model
   */
  private isChatModel;
  constructor(inputs: TogetherAIInputs);
  _llmType(): string;
  private constructHeaders;
  private constructBody;
  completionWithRetry(prompt: string, options?: this["ParsedCallOptions"]): Promise<any>;
  /** @ignore */
  _call(prompt: string, options?: this["ParsedCallOptions"]): Promise<string>;
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
}
//#endregion
export { TogetherAI, TogetherAICallOptions, TogetherAIInputs };
//# sourceMappingURL=togetherai.d.ts.map