const {
  compareFunctionCovs,
  compareRangeCovs,
  compareScriptCovs,
} = require("./compare");
const { RangeTree } = require("./range-tree");

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
function normalizeProcessCov(processCov) {
  processCov.result.sort(compareScriptCovs);
  for (const [scriptId, scriptCov] of processCov.result.entries()) {
    scriptCov.scriptId = scriptId.toString(10);
  }
}

/**
 * Normalizes a process coverage deeply.
 *
 * Normalizes the script coverages deeply, then normalizes the process coverage
 * itself.
 *
 * @param processCov Process coverage to normalize.
 */
function deepNormalizeProcessCov(processCov) {
  for (const scriptCov of processCov.result) {
    deepNormalizeScriptCov(scriptCov);
  }
  normalizeProcessCov(processCov);
}

/**
 * Normalizes a script coverage.
 *
 * Sorts the function by root range (pre-order sort).
 * This does not normalize the function coverages.
 *
 * @param scriptCov Script coverage to normalize.
 */
function normalizeScriptCov(scriptCov) {
  scriptCov.functions.sort(compareFunctionCovs);
}

/**
 * Normalizes a script coverage deeply.
 *
 * Normalizes the function coverages deeply, then normalizes the script coverage
 * itself.
 *
 * @param scriptCov Script coverage to normalize.
 */
function deepNormalizeScriptCov(scriptCov) {
  for (const funcCov of scriptCov.functions) {
    normalizeFunctionCov(funcCov);
  }
  normalizeScriptCov(scriptCov);
}

/**
 * Normalizes a function coverage.
 *
 * Sorts the ranges (pre-order sort).
 * TODO: Tree-based normalization of the ranges.
 *
 * @param funcCov Function coverage to normalize.
 */
function normalizeFunctionCov(funcCov) {
  funcCov.ranges.sort(compareRangeCovs);
  const tree = RangeTree.fromSortedRanges(funcCov.ranges);
  normalizeRangeTree(tree);
  funcCov.ranges = tree.toRanges();
}

/**
 * @internal
 */
function normalizeRangeTree(tree) {
  tree.normalize();
}

module.exports = {
  normalizeProcessCov,
  deepNormalizeProcessCov,
  normalizeScriptCov,
  deepNormalizeScriptCov,
  normalizeFunctionCov,
  normalizeRangeTree,
};
