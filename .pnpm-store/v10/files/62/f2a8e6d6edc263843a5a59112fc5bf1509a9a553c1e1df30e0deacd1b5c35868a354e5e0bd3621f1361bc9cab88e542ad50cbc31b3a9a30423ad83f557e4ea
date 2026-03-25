import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput } from "@langchain/core/language_models/chat_models";
import { ChatResult } from "@langchain/core/outputs";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";

//#region src/chat_models/deepinfra.d.ts
declare const DEFAULT_MODEL = "meta-llama/Meta-Llama-3-70B-Instruct";
type DeepInfraMessageRole = "system" | "assistant" | "user" | "tool";
declare const API_BASE_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
declare const ENV_VARIABLE_API_KEY = "DEEPINFRA_API_TOKEN";
type DeepInfraFinishReason = "stop" | "length" | "tool_calls" | "null" | null;
interface DeepInfraToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
interface DeepInfraMessage {
  role: DeepInfraMessageRole;
  content: string;
  tool_calls?: DeepInfraToolCall[];
}
interface ChatCompletionRequest {
  model: string;
  messages?: DeepInfraMessage[];
  stream?: boolean;
  max_tokens?: number | null;
  temperature?: number | null;
  tools?: BindToolsInput[];
  stop?: string[];
}
interface BaseResponse {
  code?: string;
  message?: string;
}
interface ChoiceMessage {
  role: string;
  content: string;
  tool_calls?: DeepInfraToolCall[];
}
interface ResponseChoice {
  index: number;
  finish_reason: DeepInfraFinishReason;
  delta: ChoiceMessage;
  message: ChoiceMessage;
}
interface ChatCompletionResponse extends BaseResponse {
  choices: ResponseChoice[];
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
  output: {
    text: string;
    finish_reason: DeepInfraFinishReason;
  };
}
interface DeepInfraCallOptions extends BaseChatModelCallOptions {
  stop?: string[];
  tools?: BindToolsInput[];
}
interface ChatDeepInfraParams {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}
declare class ChatDeepInfra extends BaseChatModel<DeepInfraCallOptions> implements ChatDeepInfraParams {
  static lc_name(): string;
  get callKeys(): string[];
  apiKey?: string;
  model: string;
  apiUrl: string;
  maxTokens?: number;
  temperature?: number;
  constructor(fields?: Partial<ChatDeepInfraParams> & BaseChatModelParams);
  invocationParams(options?: this["ParsedCallOptions"]): Omit<ChatCompletionRequest, "messages">;
  identifyingParams(): Omit<ChatCompletionRequest, "messages">;
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"]): Promise<ChatResult>;
  completionWithRetry(request: ChatCompletionRequest, stream: boolean, signal?: AbortSignal): Promise<ChatCompletionResponse>;
  bindTools(tools: BindToolsInput[], kwargs?: Partial<DeepInfraCallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, DeepInfraCallOptions>;
  _llmType(): string;
}
//#endregion
export { API_BASE_URL, ChatDeepInfra, ChatDeepInfraParams, DEFAULT_MODEL, DeepInfraCallOptions, DeepInfraMessageRole, ENV_VARIABLE_API_KEY };
//# sourceMappingURL=deepinfra.d.cts.map