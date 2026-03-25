import { AgentTrajectoryEvaluator, LLMPairwiseStringEvaluator, LLMStringEvaluator, PairwiseStringEvaluator, StringEvaluator } from "./base.js";

//#region src/evaluation/types.d.ts
interface EvaluatorType {
  /**
   * The criteria evaluator, which evaluates a model based on a
   * custom set of criteria without any reference labels.
   * */
  criteria: LLMStringEvaluator;
  /**
   * The labeled criteria evaluator, which evaluates a model based on a
   * custom set of criteria, with a reference label.
   * */
  labeled_criteria: LLMStringEvaluator;
  /**
   *  The pairwise string evaluator, which predicts the preferred prediction from
   *  between two models.
   */
  pairwise_string: LLMPairwiseStringEvaluator;
  /**
   * The labeled pairwise string evaluator, which predicts the preferred prediction
   * from between two models based on a ground truth reference label.
   * */
  labeled_pairwise_string: LLMPairwiseStringEvaluator;
  /**
   * The agent trajectory evaluator, which grades the agent's intermediate steps.
   */
  trajectory: AgentTrajectoryEvaluator;
  /**
   * Compare a prediction to a reference label using embedding distance.
   * */
  embedding_distance: StringEvaluator;
  /**
   * Compare two predictions using embedding distance.
   * */
  pairwise_embedding_distance: PairwiseStringEvaluator;
}
//#endregion
export { EvaluatorType };
//# sourceMappingURL=types.d.ts.map