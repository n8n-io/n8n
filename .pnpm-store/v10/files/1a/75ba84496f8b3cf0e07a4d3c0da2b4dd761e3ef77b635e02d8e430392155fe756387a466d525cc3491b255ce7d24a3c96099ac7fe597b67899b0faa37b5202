import { BaseLLMCallOptions, BaseLLMParams, LLM } from "@langchain/core/language_models/llms";

//#region src/llms/gradient_ai.d.ts

/**
 * The GradientLLMParams interface defines the input parameters for
 * the GradientLLM class.
 */
interface GradientLLMParams extends BaseLLMParams {
  /**
   * Gradient AI Access Token.
   * Provide Access Token if you do not wish to automatically pull from env.
   */
  gradientAccessKey?: string;
  /**
   * Gradient Workspace Id.
   * Provide workspace id if you do not wish to automatically pull from env.
   */
  workspaceId?: string;
  /**
   * Parameters accepted by the Gradient npm package.
   */
  inferenceParameters?: Record<string, unknown>;
  /**
   * Gradient AI Model Slug.
   */
  modelSlug?: string;
  /**
   * Gradient Adapter ID for custom fine tuned models.
   */
  adapterId?: string;
}
/**
 * The GradientLLM class is used to interact with Gradient AI inference Endpoint models.
 * This requires your Gradient AI Access Token which is autoloaded if not specified.
 */
declare class GradientLLM extends LLM<BaseLLMCallOptions> {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  modelSlug: string;
  adapterId?: string;
  gradientAccessKey?: string;
  workspaceId?: string;
  inferenceParameters?: Record<string, unknown>;
  lc_serializable: boolean;
  model: any;
  constructor(fields: GradientLLMParams);
  _llmType(): string;
  /**
   * Calls the Gradient AI endpoint and retrieves the result.
   * @param {string} prompt The input prompt.
   * @returns {Promise<string>} A promise that resolves to the generated string.
   */
  /** @ignore */
  _call(prompt: string, _options: this["ParsedCallOptions"]): Promise<string>;
  setModel(): Promise<void>;
}
//#endregion
export { GradientLLM, GradientLLMParams };
//# sourceMappingURL=gradient_ai.d.ts.map