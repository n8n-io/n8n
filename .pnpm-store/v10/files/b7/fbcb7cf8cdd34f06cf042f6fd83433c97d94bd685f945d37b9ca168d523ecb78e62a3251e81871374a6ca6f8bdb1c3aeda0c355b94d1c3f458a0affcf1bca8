import { LLMChain, LLMChainInput } from "../../chains/llm_chain.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/evaluation/qa/eval_chain.d.ts
interface EvaluateArgs {
  questionKey: string;
  answerKey: string;
  predictionKey: string;
}
declare class QAEvalChain extends LLMChain {
  static lc_name(): string;
  static fromLlm(llm: BaseLanguageModelInterface, options?: {
    prompt?: PromptTemplate;
    chainInput?: Omit<LLMChainInput, "llm">;
  }): QAEvalChain;
  evaluate(examples: ChainValues, predictions: ChainValues, args?: EvaluateArgs): Promise<ChainValues>;
}
//#endregion
export { QAEvalChain };
//# sourceMappingURL=eval_chain.d.cts.map