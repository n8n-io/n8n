import { WatsonxAuth, WatsonxInit, WatsonxLLMBasicOptions, XOR } from "../types/ibm.cjs";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { RequestCallbacks, ReturnOptionProperties, TextGenLengthPenalty, TextGenParameters, TextTokenizeParameters } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { CreateCompletionsParams, Gateway } from "@ibm-cloud/watsonx-ai/gateway";
import { BaseLLM, BaseLLMParams } from "@langchain/core/language_models/llms";
import { GenerationChunk, LLMResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms/ibm.d.ts

/**
 * Input to LLM class.
 */
/** Parameters for basic llm invoke */
interface WatsonxLLMParams {
  maxNewTokens?: number;
  maxTokens?: number;
  decodingMethod?: TextGenParameters.Constants.DecodingMethod | string;
  lengthPenalty?: TextGenLengthPenalty;
  minNewTokens?: number;
  randomSeed?: number;
  stopSequence?: string[];
  temperature?: number;
  timeLimit?: number;
  topK?: number;
  topP?: number;
  repetitionPenalty?: number;
  truncateInputTokens?: number;
  returnOptions?: ReturnOptionProperties;
  includeStopSequence?: boolean;
  headers?: Record<string, any>;
  signal?: AbortSignal;
}
/** Parameters for basic llm invoke */
interface WatsonxDeploymentLLMParams {
  idOrName: string;
}
/** Gateway parameters */
interface WatsonxLLMGatewayKwargs extends Omit<CreateCompletionsParams, keyof WatsonxLLMParams | "model" | "stream" | "prompt" | "maxTokens"> {}
interface WatsonxLLMGatewayParams extends WatsonxInit, Omit<CreateCompletionsParams, keyof WatsonxLLMGatewayKwargs | "stream" | "prompt"> {
  /** Additional parameters usable only in model gateway */
  modelGatewayKwargs?: WatsonxLLMGatewayKwargs;
  modelGateway: boolean;
}
/** Call interface for second parameter of inbuild methods */
interface WatsonxCallOptionsLLM extends BaseLanguageModelCallOptions, Partial<WatsonxInit> {
  maxRetries?: number;
  parameters?: XOR<Partial<WatsonxLLMParams>, Partial<WatsonxLLMGatewayParams>>;
  watsonxCallbacks?: RequestCallbacks;
}
/** Constructor input interfaces for each mode */
interface WatsonxInputLLM extends WatsonxLLMBasicOptions, WatsonxLLMParams {
  model: string;
  spaceId?: string;
  projectId?: string;
}
interface WatsonxDeployedInputLLM extends WatsonxLLMBasicOptions, WatsonxDeploymentLLMParams {}
interface WatsonxGatewayInputLLM extends WatsonxLLMBasicOptions, WatsonxLLMGatewayParams {}
type WatsonxLLMConstructor = XOR<XOR<WatsonxInputLLM, WatsonxDeployedInputLLM>, WatsonxGatewayInputLLM> & WatsonxAuth;
/**
 * Integration with an LLM.
 */
declare class WatsonxLLM<CallOptions extends WatsonxCallOptionsLLM = WatsonxCallOptionsLLM> extends BaseLLM<CallOptions> implements BaseLLMParams {
  static lc_name(): string;
  lc_serializable: boolean;
  streaming: boolean;
  model: string;
  maxRetries: number;
  version: string;
  serviceUrl: string;
  maxTokens?: number;
  maxNewTokens?: number;
  spaceId?: string;
  projectId?: string;
  idOrName?: string;
  decodingMethod?: WatsonXAI.TextGenParameters.Constants.DecodingMethod | string;
  lengthPenalty?: TextGenLengthPenalty;
  minNewTokens?: number;
  randomSeed?: number;
  stopSequence?: string[];
  temperature?: number;
  timeLimit?: number;
  topK?: number;
  topP?: number;
  repetitionPenalty?: number;
  truncateInputTokens?: number;
  returnOptions?: ReturnOptionProperties;
  includeStopSequence?: boolean;
  maxConcurrency?: number;
  watsonxCallbacks?: RequestCallbacks;
  modelGateway: boolean;
  modelGatewayKwargs: WatsonxLLMGatewayKwargs;
  protected service?: WatsonXAI;
  protected gateway?: Gateway;
  private checkValidProperties;
  constructor(fields: WatsonxLLMConstructor);
  get lc_secrets(): {
    [key: string]: string;
  };
  get lc_aliases(): {
    [key: string]: string;
  };
  invocationParams(options: this["ParsedCallOptions"]): {
    stop: string[] | undefined;
    temperature: number | undefined;
    topP: number | undefined;
    maxTokens: number | undefined;
    stop_sequences?: undefined;
    top_p?: undefined;
    max_new_tokens?: undefined;
    decoding_method?: undefined;
    length_penalty?: undefined;
    min_new_tokens?: undefined;
    random_seed?: undefined;
    time_limit?: undefined;
    top_k?: undefined;
    repetition_penalty?: undefined;
    truncate_input_tokens?: undefined;
    return_options?: undefined;
    include_stop_sequence?: undefined;
  } | {
    stop_sequences: string[] | undefined;
    temperature: number | undefined;
    top_p: number | undefined;
    max_new_tokens: number | undefined;
    decoding_method: string | undefined;
    length_penalty: TextGenLengthPenalty | undefined;
    min_new_tokens: number | undefined;
    random_seed: number | undefined;
    time_limit: number | undefined;
    top_k: number | undefined;
    repetition_penalty: number | undefined;
    truncate_input_tokens: number | undefined;
    return_options: ReturnOptionProperties | undefined;
    include_stop_sequence: boolean | undefined;
  } | undefined;
  invocationCallbacks(options: this["ParsedCallOptions"]): RequestCallbacks<any> | undefined;
  scopeId(): {
    projectId: string;
    modelId: string;
    spaceId?: undefined;
    idOrName?: undefined;
  } | {
    projectId?: undefined;
    spaceId: string;
    modelId: string;
    idOrName?: undefined;
  } | {
    projectId?: undefined;
    spaceId?: undefined;
    idOrName: string;
    modelId: string;
  } | {
    projectId?: undefined;
    spaceId?: undefined;
    idOrName?: undefined;
    modelId: string;
  };
  listModels(): Promise<string[] | undefined>;
  private generateSingleMessage;
  completionWithRetry<T>(callback: () => T, options?: this["ParsedCallOptions"]): Promise<T>;
  _generate(prompts: string[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<LLMResult>;
  getNumTokens(content: string, options?: TextTokenizeParameters): Promise<number>;
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  _llmType(): string;
}
//#endregion
export { WatsonxCallOptionsLLM, WatsonxDeployedInputLLM, WatsonxDeploymentLLMParams, WatsonxGatewayInputLLM, WatsonxInputLLM, WatsonxLLM, WatsonxLLMConstructor, WatsonxLLMGatewayParams, WatsonxLLMParams };
//# sourceMappingURL=ibm.d.cts.map