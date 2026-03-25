import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { AI } from "@raycast/api";

//#region src/llms/raycast.d.ts

/**
 * The input parameters for the RaycastAI class, which extends the BaseLLMParams interface.
 */
interface RaycastAIInput extends BaseLLMParams {
  model?: AI.Model;
  creativity?: number;
  rateLimitPerMinute?: number;
}
/**
 * The RaycastAI class, which extends the LLM class and implements the RaycastAIInput interface.
 */
declare class RaycastAI extends LLM implements RaycastAIInput {
  lc_serializable: boolean;
  /**
   * The model to use for generating text.
   */
  model: AI.Model;
  /**
   * The creativity parameter, also known as the "temperature".
   */
  creativity: number;
  /**
   * The rate limit for API calls, in requests per minute.
   */
  rateLimitPerMinute: number;
  /**
   * The timestamp of the last API call, used to enforce the rate limit.
   */
  private lastCallTimestamp;
  /**
   * Creates a new instance of the RaycastAI class.
   * @param {RaycastAIInput} fields The input parameters for the RaycastAI class.
   * @throws {Error} If the Raycast AI environment is not accessible.
   */
  constructor(fields: RaycastAIInput);
  /**
   * Returns the type of the LLM, which is "raycast_ai".
   * @return {string} The type of the LLM.
   * @ignore
   */
  _llmType(): string;
  /**
   * Calls AI.ask with the given prompt and returns the generated text.
   * @param {string} prompt The prompt to generate text from.
   * @return {Promise<string>} A Promise that resolves to the generated text.
   * @ignore
   */
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
}
//#endregion
export { RaycastAI, RaycastAIInput };
//# sourceMappingURL=raycast.d.cts.map