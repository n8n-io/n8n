const {
  deepNormalizeScriptCov,
  normalizeFunctionCov,
  normalizeProcessCov,
  normalizeRangeTree,
  normalizeScriptCov,
} = require("./normalize");
const { RangeTree } = require("./range-tree");

/**
 * Merges a list of process coverages.
 *
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param processCovs Process coverages to merge.
 * @return Merged process coverage.
 */
function mergeProcessCovs(processCovs) {
  if (processCovs.length === 0) {
    return { result: [] };
  }

  const urlToScripts = new Map();
  for (const processCov of processCovs) {
    for (const scriptCov of processCov.result) {
      let scriptCovs = urlToScripts.get(scriptCov.url);
      if (scriptCovs === undefined) {
        scriptCovs = [];
        urlToScripts.set(scriptCov.url, scriptCovs);
      }
      scriptCovs.push(scriptCov);
    }
  }

  const result = [];
  for (const scripts of urlToScripts.values()) {
    // assert: `scripts.length > 0`
    result.push(mergeScriptCovs(scripts));
  }
  const merged = { result };

  normalizeProcessCov(merged);
  return merged;
}

/**
 * Merges a list of matching script coverages.
 *
 * Scripts are matching if they have the same `url`.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param scriptCovs Process coverages to merge.
 * @return Merged script coverage, or `undefined` if the input list was empty.
 */
function mergeScriptCovs(scriptCovs) {
  if (scriptCovs.length === 0) {
    return undefined;
  } else if (scriptCovs.length === 1) {
    const merged = scriptCovs[0];
    deepNormalizeScriptCov(merged);
    return merged;
  }

  const first = scriptCovs[0];
  const scriptId = first.scriptId;
  const url = first.url;

  const rangeToFuncs = new Map();
  for (const scriptCov of scriptCovs) {
    for (const funcCov of scriptCov.functions) {
      const rootRange = stringifyFunctionRootRange(funcCov);
      let funcCovs = rangeToFuncs.get(rootRange);

      if (
        funcCovs === undefined ||
        // if the entry in rangeToFuncs is function-level granularity and
        // the new coverage is block-level, prefer block-level.
        (!funcCovs[0].isBlockCoverage && funcCov.isBlockCoverage)
      ) {
        funcCovs = [];
        rangeToFuncs.set(rootRange, funcCovs);
      } else if (funcCovs[0].isBlockCoverage && !funcCov.isBlockCoverage) {
        // if the entry in rangeToFuncs is block-level granularity, we should
        // not append function level granularity.
        continue;
      }
      funcCovs.push(funcCov);
    }
  }

  const functions = [];
  for (const funcCovs of rangeToFuncs.values()) {
    // assert: `funcCovs.length > 0`
    functions.push(mergeFunctionCovs(funcCovs));
  }

  const merged = { scriptId, url, functions };
  normalizeScriptCov(merged);
  return merged;
}

/**
 * Returns a string representation of the root range of the function.
 *
 * This string can be used to match function with same root range.
 * The string is derived from the start and end offsets of the root range of
 * the function.
 * This assumes that `ranges` is non-empty (true for valid function coverages).
 *
 * @param funcCov Function coverage with the range to stringify
 * @internal
 */
function stringifyFunctionRootRange(funcCov) {
  const rootRange = funcCov.ranges[0];
  return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;
}

/**
 * Merges a list of matching function coverages.
 *
 * Functions are matching if their root ranges have the same span.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param funcCovs Function coverages to merge.
 * @return Merged function coverage, or `undefined` if the input list was empty.
 */
function mergeFunctionCovs(funcCovs) {
  if (funcCovs.length === 0) {
    return undefined;
  } else if (funcCovs.length === 1) {
    const merged = funcCovs[0];
    normalizeFunctionCov(merged);
    return merged;
  }

  const functionName = funcCovs[0].functionName;

  const trees = [];
  for (const funcCov of funcCovs) {
    // assert: `fn.ranges.length > 0`
    // assert: `fn.ranges` is sorted
    trees.push(RangeTree.fromSortedRanges(funcCov.ranges));
  }

  // assert: `trees.length > 0`
  const mergedTree = mergeRangeTrees(trees);
  normalizeRangeTree(mergedTree);
  const ranges = mergedTree.toRanges();
  const isBlockCoverage = !(ranges.length === 1 && ranges[0].count === 0);

  const merged = { functionName, ranges, isBlockCoverage };
  // assert: `merged` is normalized
  return merged;
}

/**
 * @precondition Same `start` and `end` for all the trees
 */
function mergeRangeTrees(trees) {
  if (trees.length <= 1) {
    return trees[0];
  }
  const first = trees[0];
  let delta = 0;
  for (const tree of trees) {
    delta += tree.delta;
  }
  const children = mergeRangeTreeChildren(trees);
  return new RangeTree(first.start, first.end, delta, children);
}

class RangeTreeWithParent {
  parentIndex;
  tree;

  constructor(parentIndex, tree) {
    this.parentIndex = parentIndex;
    this.tree = tree;
  }
}

class StartEvent {
  offset;
  trees;

  constructor(offset, trees) {
    this.offset = offset;
    this.trees = trees;
  }

  static compare(a, b) {
    return a.offset - b.offset;
  }
}

class StartEventQueue {
  queue;
  nextIndex;
  pendingOffset;
  pendingTrees;

  constructor(queue) {
    this.queue = queue;
    this.nextIndex = 0;
    this.pendingOffset = 0;
    this.pendingTrees = undefined;
  }

  static fromParentTrees(parentTrees) {
    const startToTrees = new Map();
    for (const [parentIndex, parentTree] of parentTrees.entries()) {
      for (const child of parentTree.children) {
        let trees = startToTrees.get(child.start);
        if (trees === undefined) {
          trees = [];
          startToTrees.set(child.start, trees);
        }
        trees.push(new RangeTreeWithParent(parentIndex, child));
      }
    }
    const queue = [];
    for (const [startOffset, trees] of startToTrees) {
      queue.push(new StartEvent(startOffset, trees));
    }
    queue.sort(StartEvent.compare);
    return new StartEventQueue(queue);
  }

  setPendingOffset(offset) {
    this.pendingOffset = offset;
  }

  pushPendingTree(tree) {
    if (this.pendingTrees === undefined) {
      this.pendingTrees = [];
    }
    this.pendingTrees.push(tree);
  }

  next() {
    const pendingTrees = this.pendingTrees;
    const nextEvent = this.queue[this.nextIndex];
    if (pendingTrees === undefined) {
      this.nextIndex++;
      return nextEvent;
    } else if (nextEvent === undefined) {
      this.pendingTrees = undefined;
      return new StartEvent(this.pendingOffset, pendingTrees);
    } else {
      if (this.pendingOffset < nextEvent.offset) {
        this.pendingTrees = undefined;
        return new StartEvent(this.pendingOffset, pendingTrees);
      } else {
        if (this.pendingOffset === nextEvent.offset) {
          this.pendingTrees = undefined;
          for (const tree of pendingTrees) {
            nextEvent.trees.push(tree);
          }
        }
        this.nextIndex++;
        return nextEvent;
      }
    }
  }
}

function mergeRangeTreeChildren(parentTrees) {
  const result = [];
  const startEventQueue = StartEventQueue.fromParentTrees(parentTrees);
  const parentToNested = new Map();
  let openRange;

  while (true) {
    const event = startEventQueue.next();
    if (event === undefined) {
      break;
    }

    if (openRange !== undefined && openRange.end <= event.offset) {
      result.push(nextChild(openRange, parentToNested));
      openRange = undefined;
    }

    if (openRange === undefined) {
      let openRangeEnd = event.offset + 1;
      for (const { parentIndex, tree } of event.trees) {
        openRangeEnd = Math.max(openRangeEnd, tree.end);
        insertChild(parentToNested, parentIndex, tree);
      }
      startEventQueue.setPendingOffset(openRangeEnd);
      openRange = { start: event.offset, end: openRangeEnd };
    } else {
      for (const { parentIndex, tree } of event.trees) {
        if (tree.end > openRange.end) {
          const right = tree.split(openRange.end);
          startEventQueue.pushPendingTree(
            new RangeTreeWithParent(parentIndex, right),
          );
        }
        insertChild(parentToNested, parentIndex, tree);
      }
    }
  }
  if (openRange !== undefined) {
    result.push(nextChild(openRange, parentToNested));
  }

  return result;
}

function insertChild(parentToNested, parentIndex, tree) {
  let nested = parentToNested.get(parentIndex);
  if (nested === undefined) {
    nested = [];
    parentToNested.set(parentIndex, nested);
  }
  nested.push(tree);
}

function nextChild(openRange, parentToNested) {
  const matchingTrees = [];

  for (const nested of parentToNested.values()) {
    if (
      nested.length === 1 &&
      nested[0].start === openRange.start &&
      nested[0].end === openRange.end
    ) {
      matchingTrees.push(nested[0]);
    } else {
      matchingTrees.push(
        new RangeTree(openRange.start, openRange.end, 0, nested),
      );
    }
  }
  parentToNested.clear();
  return mergeRangeTrees(matchingTrees);
}

module.exports = {
  mergeProcessCovs,
  mergeScriptCovs,
  mergeFunctionCovs,
};
