import { SimpleEvaluationResult } from "../types.js";
import { RunTreeConfig } from "../../../run_trees.js";
export type SimpleEvaluatorParams = {
    inputs: Record<string, any>;
    referenceOutputs: Record<string, any>;
    outputs: Record<string, any>;
};
export type SimpleEvaluator = (params: SimpleEvaluatorParams) => SimpleEvaluationResult | Promise<SimpleEvaluationResult>;
export declare function wrapEvaluator<I, O extends SimpleEvaluationResult | SimpleEvaluationResult[]>(evaluator: (input: I) => O | Promise<O>): (input: I, config?: Partial<RunTreeConfig> & {
    runId?: string;
}) => Promise<O>;
export declare function evaluatedBy(outputs: any, evaluator: SimpleEvaluator): Promise<any[] | NonNullable<import("../../../schemas.js").ScoreType | undefined>>;
