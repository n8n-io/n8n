/**
 * This file implements scoring functions needed by braintrust.
 */
import { EvalArgs, EvalInput, EvalResult } from "@/types/evals";
/**
 * Scoring function: exactMatch
 * Given the arguments (including input, output, and expected result),
 * this returns a score of 1 if the result matches the expectation, and 0 otherwise.
 *
 * If "expected" is true, it checks if the output indicates success.
 * If "expected" is a boolean or an object with _success flag,
 * it checks if output is exactly that success condition.
 */
export declare function exactMatch(args: EvalArgs<EvalInput, boolean | {
    _success: boolean;
}, unknown>): EvalResult;
/**
 * Scoring function: errorMatch
 * Determines if an error occurred in the task.
 * Scores 1 if an error is found, otherwise 0.
 */
export declare function errorMatch(args: EvalArgs<EvalInput, boolean | {
    _success: boolean;
    error?: unknown;
}, unknown>): EvalResult;
