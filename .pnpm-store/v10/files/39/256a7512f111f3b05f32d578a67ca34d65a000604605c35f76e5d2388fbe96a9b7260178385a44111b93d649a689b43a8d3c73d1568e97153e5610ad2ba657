/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-namespace */
import { expect as vitestExpect, test as vitestTest, it as vitestIt, describe as vitestDescribe, beforeAll as vitestBeforeAll, afterAll as vitestAfterAll, beforeEach as vitestBeforeEach, afterEach as vitestAfterEach, } from "vitest";
import { toBeRelativeCloseTo, toBeAbsoluteCloseTo, toBeSemanticCloseTo, } from "../utils/jestlike/matchers.js";
import { wrapVitest } from "./utils/wrapper.js";
vitestExpect.extend({
    toBeRelativeCloseTo,
    toBeAbsoluteCloseTo,
    toBeSemanticCloseTo,
});
const { test, it, describe, expect, logFeedback, logOutputs, wrapEvaluator } = wrapVitest({
    expect: vitestExpect,
    it: vitestIt,
    test: vitestTest,
    describe: vitestDescribe,
    beforeAll: vitestBeforeAll,
    afterAll: vitestAfterAll,
    beforeEach: vitestBeforeEach,
    afterEach: vitestAfterEach,
});
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
 * import * as ls from "langsmith/vitest";
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
 * import * as ls from "langsmith/vitest";
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
 * import * as ls from "langsmith/vitest";
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
 * import * as ls from "langsmith/vitest";
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
 * import * as ls from "langsmith/vitest";
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
wrapEvaluator, wrapVitest, };
export * from "../utils/jestlike/types.js";
