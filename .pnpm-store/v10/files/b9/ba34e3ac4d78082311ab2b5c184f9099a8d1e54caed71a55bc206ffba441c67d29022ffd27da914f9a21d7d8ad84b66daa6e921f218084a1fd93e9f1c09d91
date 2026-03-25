import { BasePromptValueInterface } from "../../langchain-core/dist/prompt_values.cjs";
import { ConstitutionalPrinciple } from "../../chains/constitutional_ai/constitutional_principle.cjs";
import { EvalOutputType, ExtractLLMCallOptions, LLMEvalChainInput, LLMStringEvaluator, StringEvaluatorArgs } from "../base.cjs";
import { ChatGeneration, Generation } from "@langchain/core/outputs";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseCallbackConfig, Callbacks } from "@langchain/core/callbacks/manager";

//#region src/evaluation/criteria/criteria.d.ts
/**
 * A Criteria to evaluate.
 */
type Criteria = "conciseness" | "relevance" | "correctness" | "coherence" | "harmfulness" | "maliciousness" | "helpfulness" | "controversiality" | "misogyny" | "criminality" | "insensitivity" | "depth" | "creativity" | "detail";
type CriteriaLike = {
  [key: string]: string;
} | Criteria | ConstitutionalPrinciple;
/**
 * A parser for the output of the CriteriaEvalChain.
 */
declare class CriteriaResultOutputParser extends BaseLLMOutputParser<EvalOutputType> {
  lc_namespace: string[];
  parseResult(generations: Generation[] | ChatGeneration[], _callbacks: Callbacks | undefined): Promise<EvalOutputType>;
}
interface CriteriaEvalInput {
  input?: string;
  output: string;
  reference?: string;
}
declare class CriteriaEvalChain extends LLMStringEvaluator {
  static lc_name(): string;
  criterionName?: string;
  evaluationName?: string;
  requiresInput: boolean;
  requiresReference: boolean;
  skipReferenceWarning: string;
  // The output parser to use for the evaluation chain.
  outputParser: BaseLLMOutputParser<EvalOutputType>;
  /**
   * Resolve the criteria to evaluate.
   * @param criteria The criteria to evaluate the runs against. It can be:
   *                 -  a mapping of a criterion name to its description
   *                 -  a single criterion name present in one of the default criteria
   *                 -  a single `ConstitutionalPrinciple` instance
   *
   * @return A dictionary mapping criterion names to descriptions.
   */
  static resolveCriteria(criteria?: CriteriaLike): Record<string, string>;
  /**
   * Resolve the prompt to use for the evaluation.
   * @param prompt
   */
  static resolvePrompt(prompt?: BasePromptTemplate): BasePromptTemplate<any, BasePromptValueInterface, any>;
  /**
   * Create a new instance of the CriteriaEvalChain.
   * @param llm
   * @param criteria
   * @param chainOptions Options to pass to the constructor of the LLMChain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, criteria?: CriteriaLike, chainOptions?: Partial<Omit<LLMEvalChainInput, "llm">>): Promise<CriteriaEvalChain>;
  getEvalInput({
    input,
    prediction,
    reference
  }: StringEvaluatorArgs): CriteriaEvalInput;
  /**
   * Prepare the output of the evaluation.
   * @param result
   */
  _prepareOutput(result: ChainValues): any;
  _evaluateStrings(args: StringEvaluatorArgs & ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * Criteria evaluation chain that requires references.
 */
declare class LabeledCriteriaEvalChain extends CriteriaEvalChain {
  static lc_name(): string;
  // Whether the evaluation requires a reference text.
  requiresReference: boolean;
  static resolvePrompt(prompt?: BasePromptTemplate): BasePromptTemplate<any, BasePromptValueInterface, any>;
}
//#endregion
export { Criteria, CriteriaEvalChain, CriteriaEvalInput, CriteriaLike, CriteriaResultOutputParser, LabeledCriteriaEvalChain };
//# sourceMappingURL=criteria.d.cts.map