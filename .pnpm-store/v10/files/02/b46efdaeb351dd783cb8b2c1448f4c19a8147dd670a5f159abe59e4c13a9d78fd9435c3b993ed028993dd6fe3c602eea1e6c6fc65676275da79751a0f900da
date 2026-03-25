import { FunctionCov, ProcessCov, RangeCov, ScriptCov } from "./types";

/**
 * Creates a deep copy of a process coverage.
 *
 * @param processCov Process coverage to clone.
 * @return Cloned process coverage.
 */
export function cloneProcessCov(processCov: Readonly<ProcessCov>): ProcessCov {
  const result: ScriptCov[] = [];
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
export function cloneScriptCov(scriptCov: Readonly<ScriptCov>): ScriptCov {
  const functions: FunctionCov[] = [];
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
export function cloneFunctionCov(functionCov: Readonly<FunctionCov>): FunctionCov {
  const ranges: RangeCov[] = [];
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
export function cloneRangeCov(rangeCov: Readonly<RangeCov>): RangeCov {
  return {
    startOffset: rangeCov.startOffset,
    endOffset: rangeCov.endOffset,
    count: rangeCov.count,
  };
}
