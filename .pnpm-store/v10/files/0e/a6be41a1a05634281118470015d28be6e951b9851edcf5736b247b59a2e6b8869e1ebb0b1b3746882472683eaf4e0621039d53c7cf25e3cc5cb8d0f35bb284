import { RequestCallbacks } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { ChatsToolChoice } from "@ibm-cloud/watsonx-ai/gateway";
import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { BaseLLMParams } from "@langchain/core/language_models/llms";

//#region src/types/ibm.d.ts

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
interface WatsonxAuth {
  watsonxAIApikey?: string;
  watsonxAIBearerToken?: string;
  watsonxAIUsername?: string;
  watsonxAIPassword?: string;
  watsonxAIUrl?: string;
  watsonxAIAuthType?: string;
  disableSSL?: boolean;
  serviceUrl: string;
}
interface WatsonxInit {
  authenticator?: string;
  serviceUrl: string;
  version: string;
}
interface WatsonxRequestBasicOptions {
  maxConcurrency?: number;
  maxRetries?: number;
  streaming?: boolean;
  watsonxCallbacks?: RequestCallbacks;
  promptIndex?: number;
}
interface WatsonxChatBasicOptions extends BaseChatModelCallOptions, WatsonxRequestBasicOptions {}
interface WatsonxLLMBasicOptions extends BaseLLMParams, WatsonxInit, WatsonxRequestBasicOptions {}
interface WatsonxRerankBasicOptions extends WatsonxInit, WatsonxRequestBasicOptions {}
interface WatsonxEmbeddingsBasicOptions extends WatsonxInit, WatsonxRequestBasicOptions {}
interface WatsonxBaseChatParams extends WatsonxChatBasicOptions {
  tool_choice?: WatsonxTooChoice;
}
type WatsonxTooChoice = ChatsToolChoice | string | "auto" | "any";
//#endregion
export { WatsonxAuth, WatsonxBaseChatParams, WatsonxEmbeddingsBasicOptions, WatsonxInit, WatsonxLLMBasicOptions, WatsonxRerankBasicOptions, XOR };
//# sourceMappingURL=ibm.d.cts.map