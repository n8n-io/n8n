/**
 * Creates a deep copy of a process coverage.
 *
 * @param processCov Process coverage to clone.
 * @return Cloned process coverage.
 */
function cloneProcessCov(processCov) {
  const result = [];
  for (const scriptCov of processCov.result) {
    result.push(cloneScriptCov(scriptCov));
  }

  return {
    result,
  };
}

/**
 * Creates a deep copy of a script coverage.
 *
 * @param scriptCov Script coverage to clone.
 * @return Cloned script coverage.
 */
function cloneScriptCov(scriptCov) {
  const functions = [];
  for (const functionCov of scriptCov.functions) {
    functions.push(cloneFunctionCov(functionCov));
  }

  return {
    scriptId: scriptCov.scriptId,
    url: scriptCov.url,
    functions,
  };
}

/**
 * Creates a deep copy of a function coverage.
 *
 * @param functionCov Function coverage to clone.
 * @return Cloned function coverage.
 */
function cloneFunctionCov(functionCov) {
  const ranges = [];
  for (const rangeCov of functionCov.ranges) {
    ranges.push(cloneRangeCov(rangeCov));
  }

  return {
    functionName: functionCov.functionName,
    ranges,
    isBlockCoverage: functionCov.isBlockCoverage,
  };
}

/**
 * Creates a deep copy of a function coverage.
 *
 * @param rangeCov Range coverage to clone.
 * @return Cloned range coverage.
 */
function cloneRangeCov(rangeCov) {
  return {
    startOffset: rangeCov.startOffset,
    endOffset: rangeCov.endOffset,
    count: rangeCov.count,
  };
}

module.exports = {
  cloneProcessCov,
  cloneScriptCov,
  cloneFunctionCov,
  cloneRangeCov,
};
