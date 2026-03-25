import { z } from "zod";
import type { EvalLogger } from "../evals/logger";
import type { AvailableModel } from "../types/model";
import type { LogLine } from "../types/log";
import type { EvalCase } from "braintrust";
export type EvalFunction = (args: {
    modelName: AvailableModel;
    logger: EvalLogger;
    useTextExtract: boolean;
    useAccessibilityTree: boolean;
}) => Promise<{
    _success: boolean;
    logs: LogLine[];
    debugUrl: string;
    sessionUrl: string;
    error?: unknown;
}>;
export declare const EvalCategorySchema: z.ZodEnum<["observe", "act", "combination", "extract", "experimental", "text_extract"]>;
export type EvalCategory = z.infer<typeof EvalCategorySchema>;
export interface EvalInput {
    name: string;
    modelName: AvailableModel;
}
export interface Testcase extends EvalCase<EvalInput, unknown, {
    model: AvailableModel;
    test: string;
}> {
    input: EvalInput;
    name: string;
    tags: string[];
    metadata: {
        model: AvailableModel;
        test: string;
    };
    expected: unknown;
}
export interface SummaryResult {
    input: EvalInput;
    output: {
        _success: boolean;
    };
    name: string;
    score: number;
}
export interface EvalArgs<TInput, TOutput, TExpected> {
    input: TInput;
    output: TOutput;
    expected: TExpected;
    metadata?: {
        model: AvailableModel;
        test: string;
    };
}
export interface EvalResult {
    name: string;
    score: number;
}
export type LogLineEval = LogLine & {
    parsedAuxiliary?: string | object;
};
