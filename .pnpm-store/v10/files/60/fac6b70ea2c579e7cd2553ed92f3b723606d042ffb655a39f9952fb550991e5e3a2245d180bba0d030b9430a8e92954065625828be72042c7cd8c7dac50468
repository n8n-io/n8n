import { EvalOutputType, ExtractLLMCallOptions, LLMEvalChainInput, LLMPairwiseStringEvaluator, LLMPairwiseStringEvaluatorArgs } from "../base.js";
import { CriteriaLike } from "../criteria/criteria.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { ChatGeneration, Generation } from "@langchain/core/outputs";
import { BaseCallbackConfig, Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import * as _langchain_core_prompt_values4 from "@langchain/core/prompt_values";

//#region src/evaluation/comparison/pairwise.d.ts
/**
 * A parser for the output of the PairwiseStringEvalChain.
 */
declare class PairwiseStringResultOutputParser extends BaseLLMOutputParser<EvalOutputType> {
  static lc_name(): string;
  lc_namespace: string[];
  parseResult(generations: Generation[] | ChatGeneration[], _callbacks: Callbacks | undefined): Promise<EvalOutputType>;
}
/**
 * A chain for comparing two outputs, such as the outputs
 * of two models, prompts, or outputs of a single model on similar inputs.
 */
declare class PairwiseStringEvalChain extends LLMPairwiseStringEvaluator {
  static lc_name(): string;
  criterionName?: string;
  evaluationName?: string;
  requiresInput: boolean;
  requiresReference: boolean;
  skipReferenceWarning: string;
  outputParser: PairwiseStringResultOutputParser;
  static resolvePairwiseCriteria(criteria?: CriteriaLike): Record<string, string>;
  static resolvePairwisePrompt(prompt?: BasePromptTemplate): BasePromptTemplate<any, _langchain_core_prompt_values4.BasePromptValueInterface, any>;
  /**
   * Create a new instance of the PairwiseStringEvalChain.
   * @param llm
   * @param criteria The criteria to use for evaluation.
   * @param chainOptions Options to pass to the chain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, criteria?: CriteriaLike, chainOptions?: Partial<Omit<LLMEvalChainInput, "llm">>): Promise<PairwiseStringEvalChain>;
  _prepareOutput(result: ChainValues): any;
  _evaluateStringPairs(args: LLMPairwiseStringEvaluatorArgs, callOptions: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * A chain for comparing two outputs, such as the outputs
 * of two models, prompts, or outputs of a single model on similar inputs,
 * with labeled preferences.
 */
declare class LabeledPairwiseStringEvalChain extends PairwiseStringEvalChain {
  static lc_name(): string;
  requiresReference: boolean;
  static resolvePairwisePrompt(prompt?: BasePromptTemplate): BasePromptTemplate<any, _langchain_core_prompt_values4.BasePromptValueInterface, any>;
}
//#endregion
export { LabeledPairwiseStringEvalChain, PairwiseStringEvalChain, PairwiseStringResultOutputParser };
//# sourceMappingURL=pairwise.d.ts.map