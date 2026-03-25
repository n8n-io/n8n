import { SerializedLLMChain } from "./serde.js";
import { BaseChain, ChainInputs } from "./base.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { BaseLanguageModelInput, BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { Generation } from "@langchain/core/outputs";
import { BaseCallbackConfig, CallbackManager, CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage } from "@langchain/core/messages";
import { ChainValues } from "@langchain/core/utils/types";
import { BasePromptValueInterface } from "@langchain/core/prompt_values";

//#region src/chains/llm_chain.d.ts
type LLMType = BaseLanguageModelInterface | Runnable<BaseLanguageModelInput, string> | Runnable<BaseLanguageModelInput, BaseMessage>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallOptionsIfAvailable<T> = T extends {
  CallOptions: infer CO;
} ? CO : any;
/**
 * Interface for the input parameters of the LLMChain class.
 */
interface LLMChainInput<T extends string | object = string, Model extends LLMType = LLMType> extends ChainInputs {
  /** Prompt object to use */
  prompt: BasePromptTemplate;
  /** LLM Wrapper to use */
  llm: Model;
  /** Kwargs to pass to LLM */
  llmKwargs?: CallOptionsIfAvailable<Model>;
  /** OutputParser to use */
  outputParser?: BaseLLMOutputParser<T>;
  /** Key to use for output, defaults to `text` */
  outputKey?: string;
}
/**
 * Chain to run queries against LLMs.
 *
 * @example
 * ```ts
 * import { ChatPromptTemplate } from "@langchain/core/prompts";
 * import { ChatOpenAI } from "@langchain/openai";
 *
 * const prompt = ChatPromptTemplate.fromTemplate("Tell me a {adjective} joke");
 * const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const chain = prompt.pipe(llm);
 *
 * const response = await chain.invoke({ adjective: "funny" });
 * ```
 */
declare class LLMChain<T extends string | object = string, Model extends LLMType = LLMType> extends BaseChain implements LLMChainInput<T> {
  static lc_name(): string;
  lc_serializable: boolean;
  prompt: BasePromptTemplate;
  llm: Model;
  llmKwargs?: CallOptionsIfAvailable<Model>;
  outputKey: string;
  outputParser?: BaseLLMOutputParser<T>;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(fields: LLMChainInput<T, Model>);
  private getCallKeys;
  /** @ignore */
  _selectMemoryInputs(values: ChainValues): ChainValues;
  /** @ignore */
  _getFinalOutput(generations: Generation[], promptValue: BasePromptValueInterface, runManager?: CallbackManagerForChainRun): Promise<unknown>;
  /**
   * Run the core logic of this chain and add to output if desired.
   *
   * Wraps _call and handles memory.
   */
  call(values: ChainValues & CallOptionsIfAvailable<Model>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /** @ignore */
  _call(values: ChainValues & CallOptionsIfAvailable<Model>, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  /**
   * Format prompt with values and pass to LLM
   *
   * @param values - keys to pass to prompt template
   * @param callbackManager - CallbackManager to use
   * @returns Completion from LLM.
   *
   * @example
   * ```ts
   * llm.predict({ adjective: "funny" })
   * ```
   */
  predict(values: ChainValues & CallOptionsIfAvailable<Model>, callbackManager?: CallbackManager): Promise<T>;
  _chainType(): "llm";
  static deserialize(data: SerializedLLMChain): Promise<LLMChain>;
  /** @deprecated */
  serialize(): SerializedLLMChain;
  _getNumTokens(text: string): Promise<number>;
}
//#endregion
export { LLMChain, LLMChainInput };
//# sourceMappingURL=llm_chain.d.ts.map