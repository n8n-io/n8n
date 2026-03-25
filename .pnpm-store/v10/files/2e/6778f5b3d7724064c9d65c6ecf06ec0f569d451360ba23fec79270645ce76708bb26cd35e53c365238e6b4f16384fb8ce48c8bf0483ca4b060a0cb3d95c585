import { KVMap } from "../../schemas.js";
import { toBeRelativeCloseTo, toBeAbsoluteCloseTo, toBeSemanticCloseTo } from "./matchers.js";
import { SimpleEvaluationResult } from "./types.js";
import type { LangSmithJestlikeWrapperConfig, LangSmithJestlikeWrapperParams, LangSmithJestlikeDescribeWrapper, LangSmithJestlikeTestFunction } from "./types.js";
export declare function logFeedback(feedback: SimpleEvaluationResult, config?: {
    sourceRunId?: string;
}): void;
export declare function logOutputs(output: Record<string, unknown>): void;
export declare function _objectHash(obj: KVMap | unknown[], depth?: number): string;
export declare function generateWrapperFromJestlikeMethods(methods: Record<string, any>, testRunnerName: string): {
    test: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends KVMap, O extends KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends KVMap, O extends KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends KVMap, O extends KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    it: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends KVMap, O extends KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends KVMap, O extends KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends KVMap, O extends KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends KVMap, O extends KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: LangSmithJestlikeWrapperConfig) => (name: string, fn: LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    describe: LangSmithJestlikeDescribeWrapper & {
        only: LangSmithJestlikeDescribeWrapper;
        skip: LangSmithJestlikeDescribeWrapper;
        concurrent: LangSmithJestlikeDescribeWrapper;
    };
    expect: jest.Expect;
    toBeRelativeCloseTo: typeof toBeRelativeCloseTo;
    toBeAbsoluteCloseTo: typeof toBeAbsoluteCloseTo;
    toBeSemanticCloseTo: typeof toBeSemanticCloseTo;
};
export declare function isInTestContext(): boolean;
export { wrapEvaluator } from "./vendor/evaluatedBy.js";
export * from "./types.js";
