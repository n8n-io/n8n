import { FunctionCov, RangeCov, ScriptCov } from "./types";
/**
 * Compares two script coverages.
 *
 * The result corresponds to the comparison of their `url` value (alphabetical sort).
 */
export declare function compareScriptCovs(a: Readonly<ScriptCov>, b: Readonly<ScriptCov>): number;
/**
 * Compares two function coverages.
 *
 * The result corresponds to the comparison of the root ranges.
 */
export declare function compareFunctionCovs(a: Readonly<FunctionCov>, b: Readonly<FunctionCov>): number;
/**
 * Compares two range coverages.
 *
 * The ranges are first ordered by ascending `startOffset` and then by
 * descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */
export declare function compareRangeCovs(a: Readonly<RangeCov>, b: Readonly<RangeCov>): number;
