import { BaseChain } from "../chains/base.js";
import { LLMChain, LLMChainInput } from "../chains/llm_chain.js";
import "../chains/index.js";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseCallbackConfig, Callbacks } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";
import { AgentStep } from "@langchain/core/agents";

//#region src/evaluation/base.d.ts
/**
 * Base input for evaluators.
 */
interface LLMEvalChainInput<T extends EvalOutputType = EvalOutputType, L extends BaseLanguageModelInterface = BaseLanguageModelInterface> extends LLMChainInput<T, L> {}
type ExtractLLMCallOptions<LanguageModelInterface> = LanguageModelInterface extends BaseLanguageModelInterface<
// eslint-disable-next-line @typescript-eslint/no-explicit-any
any, infer CallOptions> ? CallOptions : never;
/**
 * The type of the output of an evaluation evaluator.
 */
type EvalOutputType = Record<string, string | number | boolean>;
/**
 * Base llm chain class for evaluators.
 */
declare abstract class LLMEvalChain<T extends EvalOutputType = EvalOutputType, L extends BaseLanguageModelInterface = BaseLanguageModelInterface> extends LLMChain<T, L> {
  requiresInput?: boolean;
  requiresReference?: boolean;
  skipInputWarning?: string;
  skipReferenceWarning?: string;
  /**
   * Check if the evaluation arguments are valid.
   * @param reference  The reference label.
   * @param input The input string.
   * @throws {Error} If the evaluator requires an input string but none is provided, or if the evaluator requires a reference label but none is provided.
   */
  checkEvaluationArgs(reference?: string, input?: string): void;
}
/**
 * Base chain class for evaluators.
 */
declare abstract class EvalChain<RunInput extends ChainValues = ChainValues, RunOutput extends ChainValues = ChainValues> extends BaseChain<RunInput, RunOutput> {
  requiresInput?: boolean;
  requiresReference?: boolean;
  skipInputWarning?: string;
  skipReferenceWarning?: string;
  /**
   * Check if the evaluation arguments are valid.
   * @param reference  The reference label.
   * @param input The input string.
   * @throws {Error} If the evaluator requires an input string but none is provided, or if the evaluator requires a reference label but none is provided.
   */
  checkEvaluationArgs(reference?: string, input?: string): void;
}
/**
 * @field prediction The output string from the  model.
 * @field reference The expected output / reference string.
 * @field input The input string.
 */
interface StringEvaluatorArgs {
  prediction: string;
  reference?: string;
  input?: string;
}
/**
 * @field prediction The output string from the first model.
 * @field predictionB The output string from the second model.
 */
interface PairwiseStringEvaluatorArgs {
  prediction: string;
  predictionB: string;
}
/**
 * @field The input string.
 * @field prediction The output string from the first model.
 * @field predictionB The output string from the second model.
 * @field reference The expected output / reference string.
 */
interface LLMPairwiseStringEvaluatorArgs {
  input: string;
  prediction: string;
  predictionB: string;
  reference?: string;
}
/**
 * Args for AgentTrajectoryEvaluator
 * @field input The input to the agent.
 * @field prediction The final predicted response.
 * @field reference The reference answer.
 * @field agentTrajectory  The intermediate steps forming the agent trajectory.
 */
interface LLMTrajectoryEvaluatorArgs {
  input: string;
  prediction: string;
  reference?: string;
  agentTrajectory: AgentStep[];
}
/**
 * Grade, tag, or otherwise evaluate predictions relative to their inputs
 * and/or reference labels
 */
declare abstract class LLMStringEvaluator<T extends EvalOutputType = EvalOutputType, L extends BaseLanguageModelInterface = BaseLanguageModelInterface> extends LLMEvalChain<T, L> {
  /**
   * The name of the evaluation.
   */
  evaluationName?: string;
  /**
   * Evaluate Chain or LLM output, based on optional input and label.
   * @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
   * - score: the score of the evaluation, if applicable.
   * - value: the string value of the evaluation, if applicable.
   * - reasoning: the reasoning for the evaluation, if applicable.
   * @param args
   * @param callOptions
   * @param config
   */
  abstract _evaluateStrings(args: StringEvaluatorArgs & ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /**
   * Evaluate Chain or LLM output, based on optional input and label.
   * @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
   * - score: the score of the evaluation, if applicable.
   * - value: the string value of the evaluation, if applicable.
   * - reasoning: the reasoning for the evaluation, if applicable.
   * @param args
   * @param callOptions
   * @param config
   */
  evaluateStrings(args: StringEvaluatorArgs & ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * Grade, tag, or otherwise evaluate predictions relative to their inputs
 * and/or reference labels
 */
declare abstract class StringEvaluator extends EvalChain {
  /**
   * The name of the evaluation.
   */
  evaluationName?: string;
  /**
   * Evaluate Chain or LLM output, based on optional input and label.
   * @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
   * - score: the score of the evaluation, if applicable.
   * - value: the string value of the evaluation, if applicable.
   * - reasoning: the reasoning for the evaluation, if applicable.
   * @param args
   * @param config
   */
  abstract _evaluateStrings(args: StringEvaluatorArgs, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /**
   * Evaluate Chain or LLM output, based on optional input and label.
   * @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
   * - score: the score of the evaluation, if applicable.
   * - value: the string value of the evaluation, if applicable.
   * - reasoning: the reasoning for the evaluation, if applicable.
   * @param args
   * @param config
   */
  evaluateStrings(args: StringEvaluatorArgs, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * Compare the output of two models (or two outputs of the same model).
 */
declare abstract class PairwiseStringEvaluator extends EvalChain {
  /**
   * The name of the evaluation.
   */
  evaluationName?: string;
  /**
   * Evaluate the output string pairs.
   * @param args
   * @param config
   * @return A dictionary containing the preference, scores, and/or other information.
   */
  abstract _evaluateStringPairs(args: PairwiseStringEvaluatorArgs, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /**
   * Evaluate the output string pairs.
   * @param args
   * @param config
   * @return A dictionary containing the preference, scores, and/or other information.
   */
  evaluateStringPairs(args: PairwiseStringEvaluatorArgs, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * Compare the output of two models (or two outputs of the same model).
 */
declare abstract class LLMPairwiseStringEvaluator extends LLMEvalChain {
  /**
   * The name of the evaluation.
   */
  evaluationName?: string;
  /**
   * Evaluate the output string pairs.
   * @param args
   * @param callOptions
   * @param config
   * @return A dictionary containing the preference, scores, and/or other information.
   */
  abstract _evaluateStringPairs(args: LLMPairwiseStringEvaluatorArgs, callOptions?: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /**
   * Evaluate the output string pairs.
   * @param args
   * @param callOptions
   * @param config
   * @return A dictionary containing the preference, scores, and/or other information.
   */
  evaluateStringPairs(args: LLMPairwiseStringEvaluatorArgs, callOptions?: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
/**
 * Interface for evaluating agent trajectories.
 */
declare abstract class AgentTrajectoryEvaluator extends LLMEvalChain {
  requiresInput: boolean;
  /**
   * The name of the evaluation.
   */
  evaluationName?: string;
  /**
   * Evaluate a trajectory.
   * @return The evaluation result.
   * @param args
   * @param callOptions
   * @param config
   */
  abstract _evaluateAgentTrajectory(args: LLMTrajectoryEvaluatorArgs, callOptions?: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
  /**
   * Evaluate a trajectory.
   * @return The evaluation result.
   * @param args
   * @param callOptions
   * @param config
   */
  evaluateAgentTrajectory(args: LLMTrajectoryEvaluatorArgs, callOptions?: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
//#endregion
export { AgentTrajectoryEvaluator, EvalOutputType, ExtractLLMCallOptions, LLMEvalChainInput, LLMPairwiseStringEvaluator, LLMPairwiseStringEvaluatorArgs, LLMStringEvaluator, LLMTrajectoryEvaluatorArgs, PairwiseStringEvaluator, PairwiseStringEvaluatorArgs, StringEvaluator, StringEvaluatorArgs };
//# sourceMappingURL=base.d.ts.map