import { Generation, GenerationChunk, LLMResult } from "../outputs.cjs";
import { BaseCache } from "../caches/index.cjs";
import { BaseCallbackConfig, CallbackManagerForLLMRun, Callbacks } from "../callbacks/manager.cjs";
import { RunnableConfig } from "../runnables/types.cjs";
import { BasePromptValueInterface } from "../prompt_values.cjs";
import { BaseLanguageModel, BaseLanguageModelCallOptions, BaseLanguageModelInput, BaseLanguageModelParams } from "./base.cjs";

//#region src/language_models/llms.d.ts
type SerializedLLM = {
  _model: string;
  _type: string;
} & Record<string, any>;
interface BaseLLMParams extends BaseLanguageModelParams {}
interface BaseLLMCallOptions extends BaseLanguageModelCallOptions {}
/**
 * LLM Wrapper. Takes in a prompt (or prompts) and returns a string.
 */
declare abstract class BaseLLM<CallOptions extends BaseLLMCallOptions = BaseLLMCallOptions> extends BaseLanguageModel<string, CallOptions> {
  ParsedCallOptions: Omit<CallOptions, Exclude<keyof RunnableConfig, "signal" | "timeout" | "maxConcurrency">>;
  lc_namespace: string[];
  /**
   * This method takes an input and options, and returns a string. It
   * converts the input to a prompt value and generates a result based on
   * the prompt.
   * @param input Input for the LLM.
   * @param options Options for the LLM call.
   * @returns A string result based on the prompt.
   */
  invoke(input: BaseLanguageModelInput, options?: Partial<CallOptions>): Promise<string>;
  _streamResponseChunks(_input: string, _options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  protected _separateRunnableConfigFromCallOptionsCompat(options?: Partial<CallOptions>): [RunnableConfig, this["ParsedCallOptions"]];
  _streamIterator(input: BaseLanguageModelInput, options?: Partial<CallOptions>): AsyncGenerator<string>;
  /**
   * This method takes prompt values, options, and callbacks, and generates
   * a result based on the prompts.
   * @param promptValues Prompt values for the LLM.
   * @param options Options for the LLM call.
   * @param callbacks Callbacks for the LLM call.
   * @returns An LLMResult based on the prompts.
   */
  generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | Partial<CallOptions>, callbacks?: Callbacks): Promise<LLMResult>;
  /**
   * Run the LLM on the given prompts and input.
   */
  abstract _generate(prompts: string[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<LLMResult>;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(_options?: this["ParsedCallOptions"]): any;
  _flattenLLMResult(llmResult: LLMResult): LLMResult[];
  /** @ignore */
  _generateUncached(prompts: string[], parsedOptions: this["ParsedCallOptions"], handledOptions: BaseCallbackConfig, startedRunManagers?: CallbackManagerForLLMRun[]): Promise<LLMResult>;
  _generateCached({
    prompts,
    cache,
    llmStringKey,
    parsedOptions,
    handledOptions,
    runId
  }: {
    prompts: string[];
    cache: BaseCache<Generation[]>;
    llmStringKey: string;
    parsedOptions: any;
    handledOptions: RunnableConfig;
    runId?: string;
  }): Promise<LLMResult & {
    missingPromptIndices: number[];
    startedRunManagers?: CallbackManagerForLLMRun[];
  }>;
  /**
   * Run the LLM on the given prompts and input, handling caching.
   */
  generate(prompts: string[], options?: string[] | Partial<CallOptions>, callbacks?: Callbacks): Promise<LLMResult>;
  /**
   * Get the identifying parameters of the LLM.
   */
  _identifyingParams(): Record<string, any>;
  /**
   * Return the string type key uniquely identifying this class of LLM.
   */
  abstract _llmType(): string;
  _modelType(): string;
}
/**
 * LLM class that provides a simpler interface to subclass than {@link BaseLLM}.
 *
 * Requires only implementing a simpler {@link _call} method instead of {@link _generate}.
 *
 * @augments BaseLLM
 */
declare abstract class LLM<CallOptions extends BaseLLMCallOptions = BaseLLMCallOptions> extends BaseLLM<CallOptions> {
  /**
   * Run the LLM on the given prompt and input.
   */
  abstract _call(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
  _generate(prompts: string[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<LLMResult>;
}
//#endregion
export { BaseLLM, BaseLLMCallOptions, BaseLLMParams, LLM, SerializedLLM };
//# sourceMappingURL=llms.d.cts.map