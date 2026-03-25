import type { ExpressionAnalysis } from './ExpressionBuilder';
import type { ExpressionEvaluatorClass } from './Evaluator';
import type { TournamentHooks } from './ast';
export type { TmplDifference } from './Analysis';
export type { ExpressionEvaluator, ExpressionEvaluatorClass } from './Evaluator';
export * from './ast';
export type ReturnValue = string | null | (() => unknown);
export declare class Tournament {
    errorHandler: (error: Error) => void;
    private _dataNodeName;
    private readonly astHooks;
    private evaluator;
    constructor(errorHandler?: (error: Error) => void, _dataNodeName?: string, Evaluator?: ExpressionEvaluatorClass, astHooks?: TournamentHooks);
    setEvaluator(Evaluator: ExpressionEvaluatorClass): void;
    getExpressionCode(expr: string): [string, ExpressionAnalysis];
    tmplDiff(expr: string): import("./Analysis").TmplDifference;
    execute(expr: string, data: unknown): ReturnValue;
}
