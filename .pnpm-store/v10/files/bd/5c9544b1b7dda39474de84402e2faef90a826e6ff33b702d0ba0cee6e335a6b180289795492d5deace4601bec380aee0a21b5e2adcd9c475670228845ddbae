import { BaseLLM, BaseLLMCallOptions, LLM } from "@langchain/core/language_models/llms";
import { GuardrailResponse, LLMMessage } from "@layerup/layerup-security";

//#region src/llms/layerup_security.d.ts
interface LayerupSecurityOptions extends BaseLLMCallOptions {
  llm: BaseLLM;
  layerupApiKey?: string;
  layerupApiBaseUrl?: string;
  promptGuardrails?: string[];
  responseGuardrails?: string[];
  mask?: boolean;
  metadata?: Record<string, unknown>;
  handlePromptGuardrailViolation?: (violation: GuardrailResponse) => LLMMessage;
  handleResponseGuardrailViolation?: (violation: GuardrailResponse) => LLMMessage;
}
declare class LayerupSecurity extends LLM {
  static lc_name(): string;
  lc_serializable: boolean;
  llm: BaseLLM;
  layerupApiKey: string;
  layerupApiBaseUrl: string;
  promptGuardrails: string[];
  responseGuardrails: string[];
  mask: boolean;
  metadata: Record<string, unknown>;
  handlePromptGuardrailViolation: (violation: GuardrailResponse) => LLMMessage;
  handleResponseGuardrailViolation: (violation: GuardrailResponse) => LLMMessage;
  private layerup;
  constructor(options: LayerupSecurityOptions);
  _llmType(): string;
  _call(input: string, options?: BaseLLMCallOptions): Promise<string>;
}
//#endregion
export { LayerupSecurity, LayerupSecurityOptions };
//# sourceMappingURL=layerup_security.d.ts.map