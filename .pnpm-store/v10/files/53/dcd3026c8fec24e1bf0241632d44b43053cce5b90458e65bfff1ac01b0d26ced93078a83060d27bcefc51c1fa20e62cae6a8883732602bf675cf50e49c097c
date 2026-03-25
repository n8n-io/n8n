import { Example, FeedbackConfig, Run, ScoreType, ValueType } from "../schemas.js";
import { RunTreeConfig } from "../run_trees.js";
/**
 * Represents a categorical class.
 */
export type Category = {
    /**
     * The value of the category.
     */
    value?: number;
    /**
     * The label of the category.
     */
    label: string;
};
/**
 * Represents the result of an evaluation.
 */
export type EvaluationResult = {
    /**
     * The key associated with the evaluation result.
     */
    key: string;
    /**
     * The score of the evaluation result.
     */
    score?: ScoreType;
    /**
     * The value of the evaluation result.
     */
    value?: ValueType;
    /**
     * A comment associated with the evaluation result.
     */
    comment?: string;
    /**
     * A correction record associated with the evaluation result.
     */
    correction?: Record<string, unknown>;
    /**
     * Information about the evaluator.
     */
    evaluatorInfo?: Record<string, unknown>;
    /**
     * The source run ID of the evaluation result.
     * If set, a link to the source run will be available in the UI.
     */
    sourceRunId?: string;
    /**
     * The target run ID of the evaluation result.
     * If this is not set, the target run ID is assumed to be
     * the root of the trace.
     */
    targetRunId?: string;
    /**
     * The feedback config associated with the evaluation result.
     * If set, this will be used to define how a feedback key
     * should be interpreted.
     */
    feedbackConfig?: FeedbackConfig;
};
/**
 * Batch evaluation results, if your evaluator wishes
 * to return multiple scores.
 */
export type EvaluationResults = {
    /**
     * The evaluation results.
     */
    results: Array<EvaluationResult>;
};
export interface RunEvaluator {
    evaluateRun(run: Run, example?: Example, options?: Partial<RunTreeConfig>): Promise<EvaluationResult | EvaluationResults>;
}
export type RunEvaluatorLike = ((run: Run, example?: Example) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>) | ((run: Run, example?: Example) => EvaluationResult | EvaluationResult[] | EvaluationResults) | ((run: Run, example: Example) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>) | ((run: Run, example: Example) => EvaluationResult | EvaluationResult[] | EvaluationResults) | ((args: {
    run: Run;
    example: Example;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    referenceOutputs?: Record<string, any>;
}) => EvaluationResult | EvaluationResult[] | EvaluationResults) | ((args: {
    run: Run;
    example: Example;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    referenceOutputs?: Record<string, any>;
}) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>);
/**
 * Wraps an evaluator function + implements the RunEvaluator interface.
 */
export declare class DynamicRunEvaluator<Func extends (...args: any[]) => any> implements RunEvaluator {
    func: Func;
    constructor(evaluator: Func);
    private isEvaluationResults;
    private coerceEvaluationResults;
    private coerceEvaluationResult;
    /**
     * Evaluates a run with an optional example and returns the evaluation result.
     * @param run The run to evaluate.
     * @param example The optional example to use for evaluation.
     * @returns A promise that extracts to the evaluation result.
     */
    evaluateRun(run: Run, example?: Example, options?: Partial<RunTreeConfig>): Promise<EvaluationResult | EvaluationResults>;
}
export declare function runEvaluator(func: RunEvaluatorLike): RunEvaluator;
