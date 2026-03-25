import { FunctionCov, RangeCov, ScriptCov } from "./types";

/**
 * Compares two script coverages.
 *
 * The result corresponds to the comparison of their `url` value (alphabetical sort).
 */
export function compareScriptCovs(a: Readonly<ScriptCov>, b: Readonly<ScriptCov>): number {
  if (a.url === b.url) {
    return 0;
  } else if (a.url < b.url) {
    return -1;
  } else {
    return 1;
  }
}

/**
 * Compares two function coverages.
 *
 * The result corresponds to the comparison of the root ranges.
 */
export function compareFunctionCovs(a: Readonly<FunctionCov>, b: Readonly<FunctionCov>): number {
  return compareRangeCovs(a.ranges[0], b.ranges[0]);
}

/**
 * Compares two range coverages.
 *
 * The ranges are first ordered by ascending `startOffset` and then by
 * descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */
export function compareRangeCovs(a: Readonly<RangeCov>, b: Readonly<RangeCov>): number {
  if (a.startOffset !== b.startOffset) {
    return a.startOffset - b.startOffset;
  } else {
    return b.endOffset - a.endOffset;
  }
}
