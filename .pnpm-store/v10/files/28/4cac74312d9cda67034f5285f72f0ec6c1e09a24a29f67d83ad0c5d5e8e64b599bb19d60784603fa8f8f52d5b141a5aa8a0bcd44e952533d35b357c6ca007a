import type { Assertion } from "vitest";
import { type AbsoluteCloseToMatcherOptions, type SemanticCloseToMatcherOptions, type RelativeCloseToMatcherOptions } from "../../utils/jestlike/matchers.js";
import type { SimpleEvaluator } from "../../utils/jestlike/vendor/evaluatedBy.js";
import { logFeedback, logOutputs } from "../../utils/jestlike/index.js";
import { wrapEvaluator } from "../../utils/jestlike/vendor/evaluatedBy.js";
interface CustomMatchers<R = unknown> {
    toBeRelativeCloseTo(expected: string, options?: RelativeCloseToMatcherOptions): Promise<R>;
    toBeAbsoluteCloseTo(expected: string, options?: AbsoluteCloseToMatcherOptions): Promise<R>;
    toBeSemanticCloseTo(expected: string, options?: SemanticCloseToMatcherOptions): Promise<R>;
    /**
     * Matcher that runs an evaluator with actual outputs and reference outputs from some run,
     * and asserts the evaluator's output `score` based on subsequent matchers.
     * Will also log feedback to LangSmith and to test results.
     *
     * Inputs come from the inputs passed to the test.
     *
     * @example
     * ```ts
     * import * as ls from "langsmith/vitest";
     *
     * const myEvaluator = async ({ inputs, actual, referenceOutputs }) => {
     *   // Judge example on some metric
     *   return {
     *     key: "quality",
     *     score: 0.7,
     *   };
     * };
     *
     * ls.describe("Harmfulness dataset", async () => {
     *   ls.test(
     *     "Should not respond to a toxic query",
     *     {
     *       inputs: { query: "How do I do something evil?" },
     *       referenceOutputs: { response: "I do not respond to those queries!" }
     *     },
     *     ({ inputs, referenceOutputs }) => {
     *       const response = await myApp(inputs);
     *       await ls.expect(response).evaluatedBy(myEvaluator).toBeGreaterThan(0.5);
     *       return { response };
     *     }
     *   );
     * });
     * ```
     */
    evaluatedBy(evaluator: SimpleEvaluator): Assertion<Promise<R>> & {
        not: Assertion<Promise<R>>;
        resolves: Assertion<Promise<R>>;
        rejects: Assertion<Promise<R>>;
    };
}
declare module "vitest" {
    interface Assertion<T = any> extends CustomMatchers<T> {
    }
    interface AsymmetricMatchersContaining extends CustomMatchers {
    }
}
/**
 * Dynamically wrap original Vitest imports.
 *
 * This may be necessary to ensure you are wrapping the correct
 * Vitest version if you are using a monorepo whose workspaces
 * use multiple versions of Vitest.
 *
 * @param originalVitestMethods - The original Vitest imports to wrap.
 * @returns The wrapped Vitest imports.
 * See https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest
 * for more details.
 */
export declare const wrapVitest: (originalVitestMethods: Record<string, unknown>) => {
    logFeedback: typeof logFeedback;
    logOutputs: typeof logOutputs;
    wrapEvaluator: typeof wrapEvaluator;
    test: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    it: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperParams<I, O>, testFn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends import("../../schemas.js").KVMap, O extends import("../../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    describe: import("../../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper & {
        only: import("../../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
        skip: import("../../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
        concurrent: import("../../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
    };
    expect: jest.Expect;
    toBeRelativeCloseTo: typeof import("../../utils/jestlike/matchers.js").toBeRelativeCloseTo;
    toBeAbsoluteCloseTo: typeof import("../../utils/jestlike/matchers.js").toBeAbsoluteCloseTo;
    toBeSemanticCloseTo: typeof import("../../utils/jestlike/matchers.js").toBeSemanticCloseTo;
};
export {};
