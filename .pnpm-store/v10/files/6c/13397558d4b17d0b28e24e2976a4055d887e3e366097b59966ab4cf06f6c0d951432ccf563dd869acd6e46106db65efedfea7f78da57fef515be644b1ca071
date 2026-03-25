import { SerializedSequentialChain, SerializedSimpleSequentialChain } from "./serde.cjs";
import { BaseChain, ChainInputs } from "./base.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/chains/sequential_chain.d.ts

/**
 * Interface for the input parameters of the SequentialChain class.
 */
interface SequentialChainInput extends ChainInputs {
  /** Array of chains to run as a sequence. The chains are run in order they appear in the array. */
  chains: BaseChain[];
  /** Defines which variables should be passed as initial input to the first chain. */
  inputVariables: string[];
  /** Which variables should be returned as a result of executing the chain. If not specified, output of the last of the chains is used. */
  outputVariables?: string[];
  /** Whether or not to return all intermediate outputs and variables (excluding initial input variables). */
  returnAll?: boolean;
}
/**
 * Chain where the outputs of one chain feed directly into next.
 * @example
 * ```typescript
 * const promptTemplate = new PromptTemplate({
 *   template: `You are a playwright. Given the title of play and the era it is set in, it is your job to write a synopsis for that title.
 * Title: {title}
 * Era: {era}
 * Playwright: This is a synopsis for the above play:`,
 *   inputVariables: ["title", "era"],
 * });

 * const reviewPromptTemplate = new PromptTemplate({
 *   template: `You are a play critic from the New York Times. Given the synopsis of play, it is your job to write a review for that play.
 *
 *     Play Synopsis:
 *     {synopsis}
 *     Review from a New York Times play critic of the above play:`,
 *   inputVariables: ["synopsis"],
 * });

 * const overallChain = new SequentialChain({
 *   chains: [
 *     new LLMChain({
 *       llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *       prompt: promptTemplate,
 *       outputKey: "synopsis",
 *     }),
 *     new LLMChain({
 *       llm: new OpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *       prompt: reviewPromptTemplate,
 *       outputKey: "review",
 *     }),
 *   ],
 *   inputVariables: ["era", "title"],
 *   outputVariables: ["synopsis", "review"],
 *   verbose: true,
 * });

 * const chainExecutionResult = await overallChain.call({
 *   title: "Tragedy at sunset on the beach",
 *   era: "Victorian England",
 * });
 * console.log(chainExecutionResult);
 * ```
 */
declare class SequentialChain extends BaseChain implements SequentialChainInput {
  static lc_name(): string;
  chains: BaseChain[];
  inputVariables: string[];
  outputVariables: string[];
  returnAll?: boolean | undefined;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(fields: SequentialChainInput);
  /** @ignore */
  _validateChains(): void;
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "sequential_chain";
  static deserialize(data: SerializedSequentialChain): Promise<SequentialChain>;
  serialize(): SerializedSequentialChain;
}
/**
 * Interface for the input parameters of the SimpleSequentialChain class.
 */
interface SimpleSequentialChainInput extends ChainInputs {
  /** Array of chains to run as a sequence. The chains are run in order they appear in the array. */
  chains: Array<BaseChain>;
  /** Whether or not to trim the intermediate outputs. */
  trimOutputs?: boolean;
}
/**
 * Simple chain where a single string output of one chain is fed directly into the next.
 * @augments BaseChain
 * @augments SimpleSequentialChainInput
 *
 * @example
 * ```ts
 * import { SimpleSequentialChain, LLMChain } from "@langchain/classic/chains";
 * import { OpenAI } from "langchain/llms/openai";
 * import { PromptTemplate } from "langchain/prompts";
 *
 * // This is an LLMChain to write a synopsis given a title of a play.
 * const llm = new OpenAI({ temperature: 0 });
 * const template = `You are a playwright. Given the title of play, it is your job to write a synopsis for that title.
 *
 * Title: {title}
 * Playwright: This is a synopsis for the above play:`
 * const promptTemplate = new PromptTemplate({ template, inputVariables: ["title"] });
 * const synopsisChain = new LLMChain({ llm, prompt: promptTemplate });
 *
 *
 * // This is an LLMChain to write a review of a play given a synopsis.
 * const reviewLLM = new OpenAI({ temperature: 0 })
 * const reviewTemplate = `You are a play critic from the New York Times. Given the synopsis of play, it is your job to write a review for that play.
 *
 * Play Synopsis:
 * {synopsis}
 * Review from a New York Times play critic of the above play:`
 * const reviewPromptTemplate = new PromptTemplate({ template: reviewTemplate, inputVariables: ["synopsis"] });
 * const reviewChain = new LLMChain({ llm: reviewLLM, prompt: reviewPromptTemplate });
 *
 * const overallChain = new SimpleSequentialChain({chains: [synopsisChain, reviewChain], verbose:true})
 * const review = await overallChain.run("Tragedy at sunset on the beach")
 * // the variable review contains resulting play review.
 * ```
 */
declare class SimpleSequentialChain extends BaseChain implements SimpleSequentialChainInput {
  static lc_name(): string;
  chains: Array<BaseChain>;
  inputKey: string;
  outputKey: string;
  trimOutputs: boolean;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(fields: SimpleSequentialChainInput);
  /** @ignore */
  _validateChains(): void;
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "simple_sequential_chain";
  static deserialize(data: SerializedSimpleSequentialChain): Promise<SimpleSequentialChain>;
  serialize(): SerializedSimpleSequentialChain;
}
//#endregion
export { SequentialChain, SequentialChainInput, SimpleSequentialChain, SimpleSequentialChainInput };
//# sourceMappingURL=sequential_chain.d.cts.map