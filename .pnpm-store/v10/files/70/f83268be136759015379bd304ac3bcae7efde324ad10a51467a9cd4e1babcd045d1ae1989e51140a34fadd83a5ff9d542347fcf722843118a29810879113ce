import { RangeTree } from "./range-tree";
import { FunctionCov, ProcessCov, ScriptCov } from "./types";
/**
 * Normalizes a process coverage.
 *
 * Sorts the scripts alphabetically by `url`.
 * Reassigns script ids: the script at index `0` receives `"0"`, the script at
 * index `1` receives `"1"` etc.
 * This does not normalize the script coverages.
 *
 * @param processCov Process coverage to normalize.
 */
export declare function normalizeProcessCov(processCov: ProcessCov): void;
/**
 * Normalizes a process coverage deeply.
 *
 * Normalizes the script coverages deeply, then normalizes the process coverage
 * itself.
 *
 * @param processCov Process coverage to normalize.
 */
export declare function deepNormalizeProcessCov(processCov: ProcessCov): void;
/**
 * Normalizes a script coverage.
 *
 * Sorts the function by root range (pre-order sort).
 * This does not normalize the function coverages.
 *
 * @param scriptCov Script coverage to normalize.
 */
export declare function normalizeScriptCov(scriptCov: ScriptCov): void;
/**
 * Normalizes a script coverage deeply.
 *
 * Normalizes the function coverages deeply, then normalizes the script coverage
 * itself.
 *
 * @param scriptCov Script coverage to normalize.
 */
export declare function deepNormalizeScriptCov(scriptCov: ScriptCov): void;
/**
 * Normalizes a function coverage.
 *
 * Sorts the ranges (pre-order sort).
 * TODO: Tree-based normalization of the ranges.
 *
 * @param funcCov Function coverage to normalize.
 */
export declare function normalizeFunctionCov(funcCov: FunctionCov): void;
/**
 * @internal
 */
export declare function normalizeRangeTree(tree: RangeTree): void;
