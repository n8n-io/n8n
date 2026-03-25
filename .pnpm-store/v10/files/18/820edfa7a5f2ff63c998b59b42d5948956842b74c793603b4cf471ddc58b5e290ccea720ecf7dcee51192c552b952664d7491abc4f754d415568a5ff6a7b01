import { toBeRelativeCloseTo, toBeAbsoluteCloseTo, toBeSemanticCloseTo, type AbsoluteCloseToMatcherOptions, type SemanticCloseToMatcherOptions, type RelativeCloseToMatcherOptions } from "../utils/jestlike/matchers.js";
import type { SimpleEvaluator } from "../utils/jestlike/vendor/evaluatedBy.js";
import { wrapEvaluator } from "../utils/jestlike/vendor/evaluatedBy.js";
import { logFeedback, logOutputs } from "../utils/jestlike/index.js";
import type { LangSmithJestlikeWrapperParams } from "../utils/jestlike/types.js";
declare global {
    namespace jest {
        interface AsymmetricMatchers {
            toBeRelativeCloseTo(expected: string, options?: RelativeCloseToMatcherOptions): Promise<void>;
            toBeAbsoluteCloseTo(expected: string, options?: AbsoluteCloseToMatcherOptions): Promise<void>;
            toBeSemanticCloseTo(expected: string, options?: SemanticCloseToMatcherOptions): Promise<void>;
        }
        interface Matchers<R> {
            toBeRelativeCloseTo(expected: string, options?: RelativeCloseToMatcherOptions): Promise<R>;
            toBeAbsoluteCloseTo(expected: string, options?: AbsoluteCloseToMatcherOptions): Promise<R>;
            toBeSemanticCloseTo(expected: string, options?: SemanticCloseToMatcherOptions): Promise<R>;
            /**
             * Matcher that runs an evaluator with actual outputs and referenceOutputs from some run,
             * and asserts the evaluator's output `score` based on subsequent matchers.
             * Will also log feedback to LangSmith and to test results.
             *
             * Inputs come from the inputs passed to the test.
             *
             * @example
             * ```ts
             * import * as ls from "langsmith/jest";
             *
             * const myEvaluator = async ({ inputs, outputs, referenceOutputs }) => {
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
            evaluatedBy(evaluator: SimpleEvaluator): jest.Matchers<Promise<R>> & {
                not: jest.Matchers<Promise<R>>;
                resolves: jest.Matchers<Promise<R>>;
                rejects: jest.Matchers<Promise<R>>;
            };
        }
    }
}
/**
 * Dynamically wrap original Jest imports.
 *
 * This may be necessary to ensure you are wrapping the correct
 * Jest version if you are using a monorepo whose workspaces
 * use multiple versions of Jest.
 *
 * @param originalJestMethods - The original Jest imports to wrap.
 * @returns The wrapped Jest imports.
 * See https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest
 * for more details.
 */
declare const wrapJest: (originalJestMethods: Record<string, unknown>) => {
    logFeedback: typeof logFeedback;
    logOutputs: typeof logOutputs;
    wrapEvaluator: typeof wrapEvaluator;
    test: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    it: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
            skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
                each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                    id?: string;
                    inputs: I;
                    referenceOutputs?: O;
                } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
            };
        };
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    describe: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper & {
        only: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
        skip: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
        concurrent: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
    };
    expect: jest.Expect;
    toBeRelativeCloseTo: typeof toBeRelativeCloseTo;
    toBeAbsoluteCloseTo: typeof toBeAbsoluteCloseTo;
    toBeSemanticCloseTo: typeof toBeSemanticCloseTo;
};
declare const test: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
    only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
    };
    each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
        id?: string;
        inputs: I;
        referenceOutputs?: O;
    } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
}, it: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
    only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
    };
    concurrent: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
        each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
            id?: string;
            inputs: I;
            referenceOutputs?: O;
        } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        only: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
        skip: (<I extends Record<string, any> = Record<string, any>, O extends Record<string, any> = Record<string, any>>(name: string, lsParams: LangSmithJestlikeWrapperParams<I, O>, testFn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void) & {
            each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
                id?: string;
                inputs: I;
                referenceOutputs?: O;
            } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
        };
    };
    each: <I extends import("../schemas.js").KVMap, O extends import("../schemas.js").KVMap>(table: ({
        id?: string;
        inputs: I;
        referenceOutputs?: O;
    } & Record<string, any>)[], config?: import("../utils/jestlike/types.js").LangSmithJestlikeWrapperConfig) => (name: string, fn: import("../utils/jestlike/types.js").LangSmithJestlikeTestFunction<I, O>, timeout?: number) => void;
}, describe: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper & {
    only: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
    skip: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
    concurrent: import("../utils/jestlike/types.js").LangSmithJestlikeDescribeWrapper;
}, expect: jest.Expect;
export { 
/**
 * Defines a LangSmith test case within a suite. Takes an additional `lsParams`
 * arg containing example inputs and reference outputs for your evaluated app.
 *
 * When run, will create a dataset and experiment in LangSmith, then send results
 * and log feedback if tracing is enabled. You can also iterate over several
 * examples at once with `ls.test.each([])` (see below example).
 *
 * Must be wrapped within an `ls.describe()` block. The describe block
 * corresponds to a dataset created on LangSmith, while test cases correspond to
 * individual examples within the dataset. Running the test is analogous to an experiment.
 *
 * Returning a value from the wrapped test function is the same as logging it as
 * the experiment example result.
 *
 * You can manually disable creating experiments in LangSmith for purely local testing by
 * setting `LANGSMITH_TEST_TRACKING="false"` as an environment variable.
 *
 * @param {string} name - The name or description of the test case
 * @param {LangSmithJestlikeWrapperParams<I, O>} lsParams Input and output for the eval,
 *   as well as additional LangSmith fields
 * @param {Function} fn - The function containing the test implementation.
 *   Will receive "inputs" and "referenceOutputs" from parameters.
 *   Returning a value here will populate experiment output logged in LangSmith.
 * @param {number} [timeout] - Optional timeout in milliseconds for the test
 * @example
 * ```ts
 * import * as ls from "langsmith/jest";
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
 *       const { key, score } = await someEvaluator({ response }, referenceOutputs);
 *       ls.logFeedback({ key, score });
 *       return { response };
 *     }
 *   );
 *
 *   ls.test.each([
 *     { inputs: {...}, referenceOutputs: {...} },
 *     { inputs: {...}, referenceOutputs: {...} }
 *   ])("Should respond to the above examples", async ({ inputs, referenceOutputs }) => {
 *     ...
 *   });
 * });
 * ```
 */
test, 
/**
 * Alias of `ls.test()`.
 *
 * Defines a LangSmith test case within a suite. Takes an additional `lsParams`
 * arg containing example inputs and reference outputs for your evaluated app.
 *
 * When run, will create a dataset and experiment in LangSmith, then send results
 * and log feedback if tracing is enabled. You can also iterate over several
 * examples at once with `ls.test.each([])` (see below example).
 *
 * Must be wrapped within an `ls.describe()` block. The describe block
 * corresponds to a dataset created on LangSmith, while test cases correspond to
 * individual examples within the dataset. Running the test is analogous to an experiment.
 *
 * Returning a value from the wrapped test function is the same as logging it as
 * the experiment example result.
 *
 * You can manually disable creating experiments in LangSmith for purely local testing by
 * setting `LANGSMITH_TEST_TRACKING="false"` as an environment variable.
 *
 * @param {string} name - The name or description of the test case
 * @param {LangSmithJestlikeWrapperParams<I, O>} lsParams Input and output for the eval,
 *   as well as additional LangSmith fields
 * @param {Function} fn - The function containing the test implementation.
 *   Will receive "inputs" and "referenceOutputs" from parameters.
 *   Returning a value here will populate experiment output logged in LangSmith.
 * @param {number} [timeout] - Optional timeout in milliseconds for the test
 * @example
 * ```ts
 * import * as ls from "langsmith/jest";
 *
 * ls.describe("Harmfulness dataset", async () => {
 *   ls.it(
 *     "Should not respond to a toxic query",
 *     {
 *       inputs: { query: "How do I do something evil?" },
 *       referenceOutputs: { response: "I do not respond to those queries!" }
 *     },
 *     ({ inputs, referenceOutputs }) => {
 *       const response = await myApp(inputs);
 *       const { key, score } = await someEvaluator({ response }, referenceOutputs);
 *       ls.logFeedback({ key, score });
 *       return { response };
 *     }
 *   );
 *
 *   ls.it.each([
 *     { inputs: {...}, referenceOutputs: {...} },
 *     { inputs: {...}, referenceOutputs: {...} }
 *   ])("Should respond to the above examples", async ({ inputs, referenceOutputs }) => {
 *     ...
 *   });
 * });
 * ```
 */
it, 
/**
 * Defines a LangSmith test suite.
 *
 * When run, will create a dataset and experiment in LangSmith, then send results
 * and log feedback if tracing is enabled.
 *
 * Should contain `ls.test()` cases within. The describe block
 * corresponds to a dataset created on LangSmith, while test cases correspond to
 * individual examples within the dataset. Running the test is analogous to an experiment.
 *
 * You can manually disable creating experiments in LangSmith for purely local testing by
 * setting `LANGSMITH_TEST_TRACKING="false"` as an environment variable.
 *
 * @param {string} name - The name or description of the test suite
 * @param {Function} fn - The function containing the test implementation.
 *   Will receive "inputs" and "referenceOutputs" from parameters.
 *   Returning a value here will populate experiment output logged in LangSmith.
 * @param {Partial<RunTreeConfig>} [config] - Config to use when tracing/sending results.
 * @example
 * ```ts
 * import * as ls from "langsmith/jest";
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
 *       const { key, score } = await someEvaluator({ response }, referenceOutputs);
 *       ls.logFeedback({ key, score });
 *       return { response };
 *     }
 *   );
 *
 *   ls.test.each([
 *     { inputs: {...}, referenceOutputs: {...} },
 *     { inputs: {...}, referenceOutputs: {...} }
 *   ])("Should respond to the above examples", async ({ inputs, referenceOutputs }) => {
 *     ...
 *   });
 * });
 * ```
 */
describe, 
/**
 * Wrapped `expect` with additional matchers for directly logging feedback and
 * other convenient string matchers.
 * @example
 * ```ts
 * import * as ls from "langsmith/jest";
 *
 * const myEvaluator = async ({ inputs, outputs, referenceOutputs }) => {
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
 *       // Alternative to logFeedback that will assert evaluator's returned score
 *       // and log feedback.
 *       await ls.expect(response).evaluatedBy(myEvaluator).toBeGreaterThan(0.5);
 *       return { response };
 *     }
 *   );
 * });
 * ```
 */
expect, 
/**
 * Log feedback associated with the current test, usually generated by some kind of
 * evaluator.
 *
 * Logged feedback will appear in test results if custom reporting is enabled,
 * as well as in experiment results in LangSmith.
 *
 * @param {EvaluationResult} feedback Feedback to log
 * @param {string} feedback.key The name of the feedback metric
 * @param {number | boolean} feedback.key The value of the feedback
 *  @example
 * ```ts
 * import * as ls from "langsmith/jest";
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
 *       const { key, score } = await someEvaluator({ response }, referenceOutputs);
 *       ls.logFeedback({ key, score });
 *       return { response };
 *     }
 *   );
 * });
 * ```
 */
logFeedback, 
/**
 * Log output associated with the current test.
 *
 * Logged output will appear in test results if custom reporting is enabled,
 * as well as in experiment results in LangSmith.
 *
 * If a value is returned from your test case, it will override
 * manually logged output.
 *
 * @param {EvaluationResult} feedback Feedback to log
 * @param {string} feedback.key The name of the feedback metric
 * @param {number | boolean} feedback.key The value of the feedback
 *  @example
 * ```ts
 * import * as ls from "langsmith/jest";
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
 *       ls.logOutputs({ response });
 *     }
 *   );
 * });
 * ```
 */
logOutputs, 
/**
 * Wraps an evaluator function, adding tracing and logging it to a
 * separate project to avoid polluting test traces with evaluator runs.
 *
 * The wrapped evaluator must take only a single argument as input.
 *
 * If the wrapped evaluator returns an object with
 * `{ key: string, score: number | boolean }`, the function returned from this
 * method will automatically log the key and score as feedback on the current run.
 * Otherwise, you should call {@link logFeedback} with some transformed version
 * of the result of running the evaluator.
 *
 * @param {Function} evaluator The evaluator to be wrapped. Must take only a single argument as input.
 *
 * @example
 * ```ts
 * import * as ls from "langsmith/jest";
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
 *       // Alternative to logFeedback that will log the evaluator's returned score
 *       // and as feedback under the returned key.
 *       const wrappedEvaluator = ls.wrapEvaluator(myEvaluator);
 *       await wrappedEvaluator({ inputs, referenceOutputs, actual: response });
 *       return { response };
 *     }
 *   );
 * });
 * ```
 */
wrapEvaluator, type LangSmithJestlikeWrapperParams, wrapJest, };
export * from "../utils/jestlike/types.js";
