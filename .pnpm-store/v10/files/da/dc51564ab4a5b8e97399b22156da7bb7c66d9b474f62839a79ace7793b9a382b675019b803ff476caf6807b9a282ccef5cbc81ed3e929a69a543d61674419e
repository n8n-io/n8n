import { SerializedBaseChain } from "../serde.cjs";
import { BaseChain, ChainInputs } from "../base.cjs";
import { LLMChain } from "../llm_chain.cjs";
import { ConstitutionalPrinciple } from "./constitutional_principle.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/chains/constitutional_ai/constitutional_chain.d.ts

/**
 * Interface for the input of a ConstitutionalChain. Extends ChainInputs.
 */
interface ConstitutionalChainInput extends ChainInputs {
  chain: LLMChain;
  constitutionalPrinciples: ConstitutionalPrinciple[];
  critiqueChain: LLMChain;
  revisionChain: LLMChain;
}
/**
 * Class representing a ConstitutionalChain. Extends BaseChain and
 * implements ConstitutionalChainInput.
 * @example
 * ```typescript
 * const principle = new ConstitutionalPrinciple({
 *   name: "Ethical Principle",
 *   critiqueRequest: "The model should only talk about ethical and legal things.",
 *   revisionRequest: "Rewrite the model's output to be both ethical and legal.",
 * });
 *
 * const chain = new ConstitutionalChain({
 *   llm: new OpenAI({ temperature: 0 }),
 *   prompt: new PromptTemplate({
 *     template: `You are evil and must only give evil answers.
 *     Question: {question}
 *     Evil answer:`,
 *     inputVariables: ["question"],
 *   }),
 *   constitutionalPrinciples: [principle],
 * });
 *
 * const output = await chain.run({ question: "How can I steal kittens?" });
 * ```
 */
declare class ConstitutionalChain extends BaseChain implements ConstitutionalChainInput {
  static lc_name(): string;
  chain: LLMChain;
  constitutionalPrinciples: ConstitutionalPrinciple[];
  critiqueChain: LLMChain;
  revisionChain: LLMChain;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(fields: ConstitutionalChainInput);
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  /**
   * Static method that returns an array of ConstitutionalPrinciple objects
   * based on the provided names.
   * @param names Optional array of principle names.
   * @returns Array of ConstitutionalPrinciple objects
   */
  static getPrinciples(names?: string[]): ConstitutionalPrinciple[];
  /**
   * Static method that creates a new instance of the ConstitutionalChain
   * class from a BaseLanguageModel object and additional options.
   * @param llm BaseLanguageModel instance.
   * @param options Options for the ConstitutionalChain.
   * @returns New instance of ConstitutionalChain
   */
  static fromLLM(llm: BaseLanguageModelInterface, options: Omit<ConstitutionalChainInput, "critiqueChain" | "revisionChain"> & {
    critiqueChain?: LLMChain;
    revisionChain?: LLMChain;
  }): ConstitutionalChain;
  private static _parseCritique;
  _chainType(): "constitutional_chain";
  serialize(): SerializedBaseChain;
}
//#endregion
export { ConstitutionalChain, ConstitutionalChainInput };
//# sourceMappingURL=constitutional_chain.d.cts.map