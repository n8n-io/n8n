import { LLMEvalChainInput } from "./base.js";
import { CriteriaLike } from "./criteria/criteria.js";
import "./criteria/index.js";
import { EmbeddingDistanceEvalChainInput } from "./embedding_distance/base.js";
import "./embedding_distance/index.js";
import { EvaluatorType } from "./types.js";
import { StructuredToolInterface } from "@langchain/core/tools";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/evaluation/loader.d.ts
type LoadEvaluatorOptions = EmbeddingDistanceEvalChainInput & {
  /**
   * The language model to use for the evaluator.
   */
  llm: BaseLanguageModelInterface;
  /**
   * The options to pass to the evaluator chain.
   */
  chainOptions?: Partial<Omit<LLMEvalChainInput, "llm">>;
  /**
   * The criteria to use for the evaluator.
   */
  criteria?: CriteriaLike;
  /**
   * A list of tools available to the agent, for TrajectoryEvalChain.
   */
  agentTools?: StructuredToolInterface[];
};
/**
 * Load the requested evaluation chain specified by a string
 * @param type The type of evaluator to load.
 * @param options
 *        - llm The language model to use for the evaluator.
 *        - criteria The criteria to use for the evaluator.
 *        - agentTools A list of tools available to the agent,for TrajectoryEvalChain.
 */
declare function loadEvaluator<T extends keyof EvaluatorType>(type: T, options: LoadEvaluatorOptions): Promise<EvaluatorType[T]>;
//#endregion
export { LoadEvaluatorOptions, loadEvaluator };
//# sourceMappingURL=loader.d.ts.map