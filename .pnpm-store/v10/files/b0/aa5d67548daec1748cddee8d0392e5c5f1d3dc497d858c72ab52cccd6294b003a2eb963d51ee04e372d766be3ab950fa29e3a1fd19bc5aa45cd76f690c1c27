import { WatsonxAuth, WatsonxBaseChatParams, XOR } from "../types/ibm.cjs";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { InteropZodType } from "@langchain/core/utils/types";
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { DeploymentsTextChatParams, RequestCallbacks, TextChatParameterTools, TextChatParams, TextChatResponseFormat, TextChatToolCall } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { ChatsRequestTool, CreateChatCompletionsParams, Gateway } from "@ibm-cloud/watsonx-ai/gateway";
import { BaseChatModel, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";

//#region src/chat_models/ibm.d.ts
interface WatsonxCallParams extends WatsonxCallOptionsChat {}
interface WatsonxCallDeployedParams extends DeploymentsTextChatParams {}
interface WatsonxDeltaStream {
  role?: string;
  content?: string;
  tool_calls?: TextChatToolCall[];
  refusal?: string;
}
/** Project/space params */
interface WatsonxCallOptionsChat extends Partial<Omit<TextChatParams, "modelId" | "toolChoice" | "messages">>, WatsonxBaseChatParams {
  model?: string;
}
interface WatsonxProjectSpaceParams extends WatsonxCallOptionsChat {
  model: string;
  serviceUrl: string;
  version: string;
}
/** Deployed params */
interface WatsonxCallOptionsDeployedChat extends Partial<Omit<DeploymentsTextChatParams, "messages">>, WatsonxBaseChatParams {}
interface WatsonxDeployedParams extends WatsonxCallOptionsDeployedChat {
  serviceUrl: string;
  version: string;
}
/** Gateway params */
interface WatsonxGatewayChatKwargs extends Omit<CreateChatCompletionsParams, keyof TextChatParams | "model" | "stream" | "messages"> {}
interface WatsonxCallOptionsGatewayChat extends Omit<CreateChatCompletionsParams, "stream" | "toolChoice" | "messages" | "prompt" | keyof WatsonxGatewayChatKwargs>, WatsonxBaseChatParams {
  /** Additional parameters usable only in model gateway */
  modelGatewayKwargs?: WatsonxGatewayChatKwargs;
}
interface WatsonxGatewayChatParams extends WatsonxCallOptionsGatewayChat {
  serviceUrl: string;
  version: string;
}
interface ChatWatsonxInput extends BaseChatModelParams, WatsonxProjectSpaceParams {}
interface ChatWatsonxDeployedInput extends BaseChatModelParams, WatsonxDeployedParams {}
interface ChatWatsonxGatewayInput extends BaseChatModelParams, WatsonxGatewayChatParams {
  /** Flag indicating weather to use Model Gateway or no */
  modelGateway: boolean;
}
type ChatWatsonxConstructor = BaseChatModelParams & Partial<WatsonxBaseChatParams> & WatsonxDeployedParams & WatsonxCallParams & WatsonxDeployedParams;
type ChatWatsonxToolType = BindToolsInput | TextChatParameterTools | ChatsRequestTool;
type ChatWatsonxConstructorInput = XOR<XOR<ChatWatsonxInput, ChatWatsonxDeployedInput>, ChatWatsonxGatewayInput> & WatsonxAuth;
type ChatWatsonxCallOptions = XOR<XOR<WatsonxCallOptionsChat, WatsonxCallOptionsDeployedChat>, WatsonxCallOptionsGatewayChat>;
declare class ChatWatsonx<CallOptions extends ChatWatsonxCallOptions = ChatWatsonxCallOptions> extends BaseChatModel<CallOptions> implements ChatWatsonxConstructor {
  static lc_name(): string;
  lc_serializable: boolean;
  get lc_secrets(): {
    [key: string]: string;
  };
  get lc_aliases(): {
    [key: string]: string;
  };
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  private checkValidProperties;
  protected service?: WatsonXAI;
  protected gateway?: Gateway;
  model?: string;
  version: string;
  modelGateway: boolean;
  maxTokens?: number;
  maxCompletionTokens?: number;
  maxRetries: number;
  serviceUrl: string;
  spaceId?: string;
  projectId?: string;
  idOrName?: string;
  frequencyPenalty?: number;
  logprobs?: boolean;
  topLogprobs?: number;
  n?: number;
  presencePenalty?: number;
  temperature?: number;
  topP?: number;
  timeLimit?: number;
  includeReasoning?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  maxConcurrency?: number;
  responseFormat?: TextChatResponseFormat;
  streaming: boolean;
  modelGatewayKwargs?: WatsonxGatewayChatKwargs;
  watsonxCallbacks?: RequestCallbacks;
  constructor(fields: ChatWatsonxConstructorInput);
  _llmType(): string;
  invocationParams(options: this["ParsedCallOptions"]): {
    maxTokens: number | undefined;
    maxCompletionTokens: number | undefined;
    temperature: number | undefined;
    topP: number | undefined;
    presencePenalty: number | undefined;
    n: number | undefined;
    topLogprobs: number | undefined;
    logprobs: boolean | NonNullable<CallOptions["logprobs"]> | undefined;
    frequencyPenalty: number | undefined;
    reasoningEffort: "high" | "low" | "medium" | NonNullable<CallOptions["reasoningEffort"]> | undefined;
    responseFormat: CallOptions["responseFormat"] | undefined;
  };
  invocationCallbacks(options: this["ParsedCallOptions"]): RequestCallbacks<any> | undefined;
  bindTools(tools: ChatWatsonxToolType[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
  scopeId(options?: this["ParsedCallOptions"]): {
    idOrName: string;
  } | {
    projectId: string;
    modelId: string;
  } | {
    spaceId: string;
    modelId: string;
  } | {
    modelId: string;
  } | {
    model: string;
  };
  completionWithRetry<T>(callback: () => T, options?: this["ParsedCallOptions"]): Promise<T>;
  private _chatModelGateway;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  /** @ignore */
  _combineLLMOutput(): never[];
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { ChatWatsonx, ChatWatsonxCallOptions, ChatWatsonxConstructor, ChatWatsonxConstructorInput, ChatWatsonxDeployedInput, ChatWatsonxGatewayInput, ChatWatsonxInput, WatsonxCallDeployedParams, WatsonxCallOptionsChat, WatsonxCallOptionsDeployedChat, WatsonxCallOptionsGatewayChat, WatsonxCallParams, WatsonxDeltaStream, WatsonxDeployedParams, WatsonxGatewayChatKwargs, WatsonxGatewayChatParams, WatsonxProjectSpaceParams };
//# sourceMappingURL=ibm.d.cts.map