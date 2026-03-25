import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";

//#region src/llms/deepinfra.d.ts
declare const DEEPINFRA_API_BASE = "https://api.deepinfra.com/v1/openai/completions";
declare const DEFAULT_MODEL_NAME = "mistralai/Mixtral-8x22B-Instruct-v0.1";
declare const ENV_VARIABLE = "DEEPINFRA_API_TOKEN";
interface DeepInfraLLMParams extends BaseLLMParams {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
declare class DeepInfraLLM extends LLM implements DeepInfraLLMParams {
  static lc_name(): string;
  lc_serializable: boolean;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  constructor(fields?: Partial<DeepInfraLLMParams>);
  _llmType(): string;
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
}
//#endregion
export { DEEPINFRA_API_BASE, DEFAULT_MODEL_NAME, DeepInfraLLM, DeepInfraLLMParams, ENV_VARIABLE };
//# sourceMappingURL=deepinfra.d.cts.map