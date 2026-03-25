import { OpenAIApiKey, OpenAICallOptions, OpenAICoreRequestOptions, OpenAIInput } from "./types.js";
import { ClientOptions, OpenAI as OpenAI$1 } from "openai";
import { GenerationChunk, LLMResult } from "@langchain/core/outputs";
import { BaseLLM, BaseLLMParams } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/llms.d.ts

/**
 * Wrapper around OpenAI large language models.
 *
 * To use you should have the `openai` package installed, with the
 * `OPENAI_API_KEY` environment variable set.
 *
 * To use with Azure, import the `AzureOpenAI` class.
 *
 * @remarks
 * Any parameters that are valid to be passed to {@link
 * https://platform.openai.com/docs/api-reference/completions/create |
 * `openai.createCompletion`} can be passed through {@link modelKwargs}, even
 * if not explicitly available on this class.
 * @example
 * ```typescript
 * const model = new OpenAI({
 *   modelName: "gpt-4",
 *   temperature: 0.7,
 *   maxTokens: 1000,
 *   maxRetries: 5,
 * });
 *
 * const res = await model.invoke(
 *   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
 * );
 * console.log({ res });
 * ```
 */
declare class OpenAI$2<CallOptions extends OpenAICallOptions = OpenAICallOptions> extends BaseLLM<CallOptions> implements Partial<OpenAIInput> {
  static lc_name(): string;
  get callKeys(): string[];
  lc_serializable: boolean;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  n: number;
  bestOf?: number;
  logitBias?: Record<string, number>;
  model: string;
  /** @deprecated Use "model" instead */
  modelName: string;
  modelKwargs?: OpenAIInput["modelKwargs"];
  batchSize: number;
  timeout?: number;
  stop?: string[];
  stopSequences?: string[];
  user?: string;
  streaming: boolean;
  openAIApiKey?: OpenAIApiKey;
  apiKey?: OpenAIApiKey;
  organization?: string;
  protected client: OpenAI$1;
  protected clientConfig: ClientOptions;
  constructor(fields?: Partial<OpenAIInput> & BaseLLMParams & {
    configuration?: ClientOptions;
  });
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): Omit<OpenAI$1.CompletionCreateParams, "prompt">;
  /** @ignore */
  _identifyingParams(): Omit<OpenAI$1.CompletionCreateParams, "prompt"> & {
    model_name: string;
  } & ClientOptions;
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): Omit<OpenAI$1.CompletionCreateParams, "prompt"> & {
    model_name: string;
  } & ClientOptions;
  /**
   * Call out to OpenAI's endpoint with k unique prompts
   *
   * @param [prompts] - The prompts to pass into the model.
   * @param [options] - Optional list of stop words to use when generating.
   * @param [runManager] - Optional callback manager to use when generating.
   *
   * @returns The full LLM output.
   *
   * @example
   * ```ts
   * import { OpenAI } from "langchain/llms/openai";
   * const openai = new OpenAI();
   * const response = await openai.generate(["Tell me a joke."]);
   * ```
   */
  _generate(prompts: string[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<LLMResult>;
  // TODO(jacoblee): Refactor with _generate(..., {stream: true}) implementation?
  _streamResponseChunks(input: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  /**
   * Calls the OpenAI API with retry logic in case of failures.
   * @param request The request to send to the OpenAI API.
   * @param options Optional configuration for the API call.
   * @returns The response from the OpenAI API.
   */
  completionWithRetry(request: OpenAI$1.CompletionCreateParamsStreaming, options?: OpenAICoreRequestOptions): Promise<AsyncIterable<OpenAI$1.Completion>>;
  completionWithRetry(request: OpenAI$1.CompletionCreateParamsNonStreaming, options?: OpenAICoreRequestOptions): Promise<OpenAI$1.Completions.Completion>;
  /**
   * Calls the OpenAI API with retry logic in case of failures.
   * @param request The request to send to the OpenAI API.
   * @param options Optional configuration for the API call.
   * @returns The response from the OpenAI API.
   */
  protected _getClientOptions(options: OpenAICoreRequestOptions | undefined): OpenAICoreRequestOptions;
  _llmType(): string;
}
//#endregion
export { OpenAI$2 as OpenAI };
//# sourceMappingURL=llms.d.ts.map