import { Example, Run, ScoreType, ValueType } from "../schemas.js";
import { EvaluationResult, RunEvaluator } from "./evaluator.js";
export interface GradingFunctionResult {
    key?: string;
    score?: ScoreType;
    value?: ValueType;
    comment?: string;
    correction?: Record<string, unknown>;
}
export interface GradingFunctionParams {
    input: string;
    prediction: string;
    answer?: string;
}
export interface StringEvaluatorParams {
    evaluationName?: string;
    inputKey?: string;
    predictionKey?: string;
    answerKey?: string;
    gradingFunction: (params: GradingFunctionParams) => Promise<GradingFunctionResult>;
}
export declare class StringEvaluator implements RunEvaluator {
    protected evaluationName?: string;
    protected inputKey: string;
    protected predictionKey: string;
    protected answerKey?: string;
    protected gradingFunction: (params: GradingFunctionParams) => Promise<GradingFunctionResult>;
    constructor(params: StringEvaluatorParams);
    evaluateRun(run: Run, example?: Example): Promise<EvaluationResult>;
}
