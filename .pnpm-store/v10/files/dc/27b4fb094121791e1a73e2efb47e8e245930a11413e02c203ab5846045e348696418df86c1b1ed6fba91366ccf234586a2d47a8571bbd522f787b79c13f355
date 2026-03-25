import { GeminiAPIConfig, GenerateContentResponseData, GoogleAIAPI, GoogleAIModelParams, GoogleAISafetyHandler, GoogleLLMResponse, GoogleSpeechConfig, GoogleSpeechConfigSimplified } from "../types.cjs";

//#region src/utils/gemini.d.ts
interface FunctionCall {
  name: string;
  arguments: string;
}
interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
}
interface FunctionCallRaw {
  name: string;
  arguments: object;
}
interface ToolCallRaw {
  id: string;
  type: "function";
  function: FunctionCallRaw;
}
interface DefaultGeminiSafetySettings {
  errorFinish?: string[];
}
declare class DefaultGeminiSafetyHandler implements GoogleAISafetyHandler {
  errorFinish: string[];
  constructor(settings?: DefaultGeminiSafetySettings);
  handleDataPromptFeedback(response: GoogleLLMResponse, data: GenerateContentResponseData): GenerateContentResponseData;
  handleDataFinishReason(response: GoogleLLMResponse, data: GenerateContentResponseData): GenerateContentResponseData;
  handleData(response: GoogleLLMResponse, data: GenerateContentResponseData): GenerateContentResponseData;
  handle(response: GoogleLLMResponse): GoogleLLMResponse;
}
interface MessageGeminiSafetySettings extends DefaultGeminiSafetySettings {
  msg?: string;
  forceNewMessage?: boolean;
}
declare class MessageGeminiSafetyHandler extends DefaultGeminiSafetyHandler {
  msg: string;
  forceNewMessage: boolean;
  constructor(settings?: MessageGeminiSafetySettings);
  setMessage(data: GenerateContentResponseData): GenerateContentResponseData;
  handleData(response: GoogleLLMResponse, data: GenerateContentResponseData): GenerateContentResponseData;
}
declare function normalizeSpeechConfig(config: GoogleSpeechConfig | GoogleSpeechConfigSimplified | undefined): GoogleSpeechConfig | undefined;
declare function getGeminiAPI(config?: GeminiAPIConfig): GoogleAIAPI;
declare function validateGeminiParams(params: GoogleAIModelParams): void;
declare function isModelGemini(modelName: string): boolean;
declare function isModelGemma(modelName: string): boolean;
//#endregion
export { DefaultGeminiSafetyHandler, DefaultGeminiSafetySettings, FunctionCall, FunctionCallRaw, MessageGeminiSafetyHandler, MessageGeminiSafetySettings, ToolCall, ToolCallRaw, getGeminiAPI, isModelGemini, isModelGemma, normalizeSpeechConfig, validateGeminiParams };
//# sourceMappingURL=gemini.d.cts.map