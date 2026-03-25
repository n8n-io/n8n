"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const normalize_1 = require("./normalize");
const range_tree_1 = require("./range-tree");
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
    normalize_1.normalizeProcessCov(merged);
    return merged;
}
exports.mergeProcessCovs = mergeProcessCovs;
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
    }
    else if (scriptCovs.length === 1) {
        const merged = scriptCovs[0];
        normalize_1.deepNormalizeScriptCov(merged);
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
            if (funcCovs === undefined ||
                // if the entry in rangeToFuncs is function-level granularity and
                // the new coverage is block-level, prefer block-level.
                (!funcCovs[0].isBlockCoverage && funcCov.isBlockCoverage)) {
                funcCovs = [];
                rangeToFuncs.set(rootRange, funcCovs);
            }
            else if (funcCovs[0].isBlockCoverage && !funcCov.isBlockCoverage) {
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
    normalize_1.normalizeScriptCov(merged);
    return merged;
}
exports.mergeScriptCovs = mergeScriptCovs;
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
    }
    else if (funcCovs.length === 1) {
        const merged = funcCovs[0];
        normalize_1.normalizeFunctionCov(merged);
        return merged;
    }
    const functionName = funcCovs[0].functionName;
    const trees = [];
    for (const funcCov of funcCovs) {
        // assert: `fn.ranges.length > 0`
        // assert: `fn.ranges` is sorted
        trees.push(range_tree_1.RangeTree.fromSortedRanges(funcCov.ranges));
    }
    // assert: `trees.length > 0`
    const mergedTree = mergeRangeTrees(trees);
    normalize_1.normalizeRangeTree(mergedTree);
    const ranges = mergedTree.toRanges();
    const isBlockCoverage = !(ranges.length === 1 && ranges[0].count === 0);
    const merged = { functionName, ranges, isBlockCoverage };
    // assert: `merged` is normalized
    return merged;
}
exports.mergeFunctionCovs = mergeFunctionCovs;
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
    return new range_tree_1.RangeTree(first.start, first.end, delta, children);
}
class RangeTreeWithParent {
    constructor(parentIndex, tree) {
        this.parentIndex = parentIndex;
        this.tree = tree;
    }
}
class StartEvent {
    constructor(offset, trees) {
        this.offset = offset;
        this.trees = trees;
    }
    static compare(a, b) {
        return a.offset - b.offset;
    }
}
class StartEventQueue {
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
        }
        else if (nextEvent === undefined) {
            this.pendingTrees = undefined;
            return new StartEvent(this.pendingOffset, pendingTrees);
        }
        else {
            if (this.pendingOffset < nextEvent.offset) {
                this.pendingTrees = undefined;
                return new StartEvent(this.pendingOffset, pendingTrees);
            }
            else {
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
        }
        else {
            for (const { parentIndex, tree } of event.trees) {
                if (tree.end > openRange.end) {
                    const right = tree.split(openRange.end);
                    startEventQueue.pushPendingTree(new RangeTreeWithParent(parentIndex, right));
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
        if (nested.length === 1 && nested[0].start === openRange.start && nested[0].end === openRange.end) {
            matchingTrees.push(nested[0]);
        }
        else {
            matchingTrees.push(new range_tree_1.RangeTree(openRange.start, openRange.end, 0, nested));
        }
    }
    parentToNested.clear();
    return mergeRangeTrees(matchingTrees);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUM7QUFDekMsQ0FBQyIsImZpbGUiOiJtZXJnZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGRlZXBOb3JtYWxpemVTY3JpcHRDb3YsXG4gIG5vcm1hbGl6ZUZ1bmN0aW9uQ292LFxuICBub3JtYWxpemVQcm9jZXNzQ292LFxuICBub3JtYWxpemVSYW5nZVRyZWUsXG4gIG5vcm1hbGl6ZVNjcmlwdENvdixcbn0gZnJvbSBcIi4vbm9ybWFsaXplXCI7XG5pbXBvcnQgeyBSYW5nZVRyZWUgfSBmcm9tIFwiLi9yYW5nZS10cmVlXCI7XG5pbXBvcnQgeyBGdW5jdGlvbkNvdiwgUHJvY2Vzc0NvdiwgUmFuZ2UsIFJhbmdlQ292LCBTY3JpcHRDb3YgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG4vKipcbiAqIE1lcmdlcyBhIGxpc3Qgb2YgcHJvY2VzcyBjb3ZlcmFnZXMuXG4gKlxuICogVGhlIHJlc3VsdCBpcyBub3JtYWxpemVkLlxuICogVGhlIGlucHV0IHZhbHVlcyBtYXkgYmUgbXV0YXRlZCwgaXQgaXMgbm90IHNhZmUgdG8gdXNlIHRoZW0gYWZ0ZXIgcGFzc2luZ1xuICogdGhlbSB0byB0aGlzIGZ1bmN0aW9uLlxuICogVGhlIGNvbXB1dGF0aW9uIGlzIHN5bmNocm9ub3VzLlxuICpcbiAqIEBwYXJhbSBwcm9jZXNzQ292cyBQcm9jZXNzIGNvdmVyYWdlcyB0byBtZXJnZS5cbiAqIEByZXR1cm4gTWVyZ2VkIHByb2Nlc3MgY292ZXJhZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVByb2Nlc3NDb3ZzKHByb2Nlc3NDb3ZzOiBSZWFkb25seUFycmF5PFByb2Nlc3NDb3Y+KTogUHJvY2Vzc0NvdiB7XG4gIGlmIChwcm9jZXNzQ292cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge3Jlc3VsdDogW119O1xuICB9XG5cbiAgY29uc3QgdXJsVG9TY3JpcHRzOiBNYXA8c3RyaW5nLCBTY3JpcHRDb3ZbXT4gPSBuZXcgTWFwKCk7XG4gIGZvciAoY29uc3QgcHJvY2Vzc0NvdiBvZiBwcm9jZXNzQ292cykge1xuICAgIGZvciAoY29uc3Qgc2NyaXB0Q292IG9mIHByb2Nlc3NDb3YucmVzdWx0KSB7XG4gICAgICBsZXQgc2NyaXB0Q292czogU2NyaXB0Q292W10gfCB1bmRlZmluZWQgPSB1cmxUb1NjcmlwdHMuZ2V0KHNjcmlwdENvdi51cmwpO1xuICAgICAgaWYgKHNjcmlwdENvdnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzY3JpcHRDb3ZzID0gW107XG4gICAgICAgIHVybFRvU2NyaXB0cy5zZXQoc2NyaXB0Q292LnVybCwgc2NyaXB0Q292cyk7XG4gICAgICB9XG4gICAgICBzY3JpcHRDb3ZzLnB1c2goc2NyaXB0Q292KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IFNjcmlwdENvdltdID0gW107XG4gIGZvciAoY29uc3Qgc2NyaXB0cyBvZiB1cmxUb1NjcmlwdHMudmFsdWVzKCkpIHtcbiAgICAvLyBhc3NlcnQ6IGBzY3JpcHRzLmxlbmd0aCA+IDBgXG4gICAgcmVzdWx0LnB1c2gobWVyZ2VTY3JpcHRDb3ZzKHNjcmlwdHMpISk7XG4gIH1cbiAgY29uc3QgbWVyZ2VkOiBQcm9jZXNzQ292ID0ge3Jlc3VsdH07XG5cbiAgbm9ybWFsaXplUHJvY2Vzc0NvdihtZXJnZWQpO1xuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIE1lcmdlcyBhIGxpc3Qgb2YgbWF0Y2hpbmcgc2NyaXB0IGNvdmVyYWdlcy5cbiAqXG4gKiBTY3JpcHRzIGFyZSBtYXRjaGluZyBpZiB0aGV5IGhhdmUgdGhlIHNhbWUgYHVybGAuXG4gKiBUaGUgcmVzdWx0IGlzIG5vcm1hbGl6ZWQuXG4gKiBUaGUgaW5wdXQgdmFsdWVzIG1heSBiZSBtdXRhdGVkLCBpdCBpcyBub3Qgc2FmZSB0byB1c2UgdGhlbSBhZnRlciBwYXNzaW5nXG4gKiB0aGVtIHRvIHRoaXMgZnVuY3Rpb24uXG4gKiBUaGUgY29tcHV0YXRpb24gaXMgc3luY2hyb25vdXMuXG4gKlxuICogQHBhcmFtIHNjcmlwdENvdnMgUHJvY2VzcyBjb3ZlcmFnZXMgdG8gbWVyZ2UuXG4gKiBAcmV0dXJuIE1lcmdlZCBzY3JpcHQgY292ZXJhZ2UsIG9yIGB1bmRlZmluZWRgIGlmIHRoZSBpbnB1dCBsaXN0IHdhcyBlbXB0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlU2NyaXB0Q292cyhzY3JpcHRDb3ZzOiBSZWFkb25seUFycmF5PFNjcmlwdENvdj4pOiBTY3JpcHRDb3YgfCB1bmRlZmluZWQge1xuICBpZiAoc2NyaXB0Q292cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKHNjcmlwdENvdnMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWVyZ2VkOiBTY3JpcHRDb3YgPSBzY3JpcHRDb3ZzWzBdO1xuICAgIGRlZXBOb3JtYWxpemVTY3JpcHRDb3YobWVyZ2VkKTtcbiAgICByZXR1cm4gbWVyZ2VkO1xuICB9XG5cbiAgY29uc3QgZmlyc3Q6IFNjcmlwdENvdiA9IHNjcmlwdENvdnNbMF07XG4gIGNvbnN0IHNjcmlwdElkOiBzdHJpbmcgPSBmaXJzdC5zY3JpcHRJZDtcbiAgY29uc3QgdXJsOiBzdHJpbmcgPSBmaXJzdC51cmw7XG5cbiAgY29uc3QgcmFuZ2VUb0Z1bmNzOiBNYXA8c3RyaW5nLCBGdW5jdGlvbkNvdltdPiA9IG5ldyBNYXAoKTtcbiAgZm9yIChjb25zdCBzY3JpcHRDb3Ygb2Ygc2NyaXB0Q292cykge1xuICAgIGZvciAoY29uc3QgZnVuY0NvdiBvZiBzY3JpcHRDb3YuZnVuY3Rpb25zKSB7XG4gICAgICBjb25zdCByb290UmFuZ2U6IHN0cmluZyA9IHN0cmluZ2lmeUZ1bmN0aW9uUm9vdFJhbmdlKGZ1bmNDb3YpO1xuICAgICAgbGV0IGZ1bmNDb3ZzOiBGdW5jdGlvbkNvdltdIHwgdW5kZWZpbmVkID0gcmFuZ2VUb0Z1bmNzLmdldChyb290UmFuZ2UpO1xuXG4gICAgICBpZiAoZnVuY0NvdnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAvLyBpZiB0aGUgZW50cnkgaW4gcmFuZ2VUb0Z1bmNzIGlzIGZ1bmN0aW9uLWxldmVsIGdyYW51bGFyaXR5IGFuZFxuICAgICAgICAvLyB0aGUgbmV3IGNvdmVyYWdlIGlzIGJsb2NrLWxldmVsLCBwcmVmZXIgYmxvY2stbGV2ZWwuXG4gICAgICAgICghZnVuY0NvdnNbMF0uaXNCbG9ja0NvdmVyYWdlICYmIGZ1bmNDb3YuaXNCbG9ja0NvdmVyYWdlKSkge1xuICAgICAgICBmdW5jQ292cyA9IFtdO1xuICAgICAgICByYW5nZVRvRnVuY3Muc2V0KHJvb3RSYW5nZSwgZnVuY0NvdnMpO1xuICAgICAgfSBlbHNlIGlmIChmdW5jQ292c1swXS5pc0Jsb2NrQ292ZXJhZ2UgJiYgIWZ1bmNDb3YuaXNCbG9ja0NvdmVyYWdlKSB7XG4gICAgICAgIC8vIGlmIHRoZSBlbnRyeSBpbiByYW5nZVRvRnVuY3MgaXMgYmxvY2stbGV2ZWwgZ3JhbnVsYXJpdHksIHdlIHNob3VsZFxuICAgICAgICAvLyBub3QgYXBwZW5kIGZ1bmN0aW9uIGxldmVsIGdyYW51bGFyaXR5LlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZ1bmNDb3ZzLnB1c2goZnVuY0Nvdik7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZnVuY3Rpb25zOiBGdW5jdGlvbkNvdltdID0gW107XG4gIGZvciAoY29uc3QgZnVuY0NvdnMgb2YgcmFuZ2VUb0Z1bmNzLnZhbHVlcygpKSB7XG4gICAgLy8gYXNzZXJ0OiBgZnVuY0NvdnMubGVuZ3RoID4gMGBcbiAgICBmdW5jdGlvbnMucHVzaChtZXJnZUZ1bmN0aW9uQ292cyhmdW5jQ292cykhKTtcbiAgfVxuXG4gIGNvbnN0IG1lcmdlZDogU2NyaXB0Q292ID0ge3NjcmlwdElkLCB1cmwsIGZ1bmN0aW9uc307XG4gIG5vcm1hbGl6ZVNjcmlwdENvdihtZXJnZWQpO1xuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHJvb3QgcmFuZ2Ugb2YgdGhlIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgc3RyaW5nIGNhbiBiZSB1c2VkIHRvIG1hdGNoIGZ1bmN0aW9uIHdpdGggc2FtZSByb290IHJhbmdlLlxuICogVGhlIHN0cmluZyBpcyBkZXJpdmVkIGZyb20gdGhlIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0cyBvZiB0aGUgcm9vdCByYW5nZSBvZlxuICogdGhlIGZ1bmN0aW9uLlxuICogVGhpcyBhc3N1bWVzIHRoYXQgYHJhbmdlc2AgaXMgbm9uLWVtcHR5ICh0cnVlIGZvciB2YWxpZCBmdW5jdGlvbiBjb3ZlcmFnZXMpLlxuICpcbiAqIEBwYXJhbSBmdW5jQ292IEZ1bmN0aW9uIGNvdmVyYWdlIHdpdGggdGhlIHJhbmdlIHRvIHN0cmluZ2lmeVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeUZ1bmN0aW9uUm9vdFJhbmdlKGZ1bmNDb3Y6IFJlYWRvbmx5PEZ1bmN0aW9uQ292Pik6IHN0cmluZyB7XG4gIGNvbnN0IHJvb3RSYW5nZTogUmFuZ2VDb3YgPSBmdW5jQ292LnJhbmdlc1swXTtcbiAgcmV0dXJuIGAke3Jvb3RSYW5nZS5zdGFydE9mZnNldC50b1N0cmluZygxMCl9OyR7cm9vdFJhbmdlLmVuZE9mZnNldC50b1N0cmluZygxMCl9YDtcbn1cblxuLyoqXG4gKiBNZXJnZXMgYSBsaXN0IG9mIG1hdGNoaW5nIGZ1bmN0aW9uIGNvdmVyYWdlcy5cbiAqXG4gKiBGdW5jdGlvbnMgYXJlIG1hdGNoaW5nIGlmIHRoZWlyIHJvb3QgcmFuZ2VzIGhhdmUgdGhlIHNhbWUgc3Bhbi5cbiAqIFRoZSByZXN1bHQgaXMgbm9ybWFsaXplZC5cbiAqIFRoZSBpbnB1dCB2YWx1ZXMgbWF5IGJlIG11dGF0ZWQsIGl0IGlzIG5vdCBzYWZlIHRvIHVzZSB0aGVtIGFmdGVyIHBhc3NpbmdcbiAqIHRoZW0gdG8gdGhpcyBmdW5jdGlvbi5cbiAqIFRoZSBjb21wdXRhdGlvbiBpcyBzeW5jaHJvbm91cy5cbiAqXG4gKiBAcGFyYW0gZnVuY0NvdnMgRnVuY3Rpb24gY292ZXJhZ2VzIHRvIG1lcmdlLlxuICogQHJldHVybiBNZXJnZWQgZnVuY3Rpb24gY292ZXJhZ2UsIG9yIGB1bmRlZmluZWRgIGlmIHRoZSBpbnB1dCBsaXN0IHdhcyBlbXB0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlRnVuY3Rpb25Db3ZzKGZ1bmNDb3ZzOiBSZWFkb25seUFycmF5PEZ1bmN0aW9uQ292Pik6IEZ1bmN0aW9uQ292IHwgdW5kZWZpbmVkIHtcbiAgaWYgKGZ1bmNDb3ZzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoZnVuY0NvdnMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWVyZ2VkOiBGdW5jdGlvbkNvdiA9IGZ1bmNDb3ZzWzBdO1xuICAgIG5vcm1hbGl6ZUZ1bmN0aW9uQ292KG1lcmdlZCk7XG4gICAgcmV0dXJuIG1lcmdlZDtcbiAgfVxuXG4gIGNvbnN0IGZ1bmN0aW9uTmFtZTogc3RyaW5nID0gZnVuY0NvdnNbMF0uZnVuY3Rpb25OYW1lO1xuXG4gIGNvbnN0IHRyZWVzOiBSYW5nZVRyZWVbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZ1bmNDb3Ygb2YgZnVuY0NvdnMpIHtcbiAgICAvLyBhc3NlcnQ6IGBmbi5yYW5nZXMubGVuZ3RoID4gMGBcbiAgICAvLyBhc3NlcnQ6IGBmbi5yYW5nZXNgIGlzIHNvcnRlZFxuICAgIHRyZWVzLnB1c2goUmFuZ2VUcmVlLmZyb21Tb3J0ZWRSYW5nZXMoZnVuY0Nvdi5yYW5nZXMpISk7XG4gIH1cblxuICAvLyBhc3NlcnQ6IGB0cmVlcy5sZW5ndGggPiAwYFxuICBjb25zdCBtZXJnZWRUcmVlOiBSYW5nZVRyZWUgPSBtZXJnZVJhbmdlVHJlZXModHJlZXMpITtcbiAgbm9ybWFsaXplUmFuZ2VUcmVlKG1lcmdlZFRyZWUpO1xuICBjb25zdCByYW5nZXM6IFJhbmdlQ292W10gPSBtZXJnZWRUcmVlLnRvUmFuZ2VzKCk7XG4gIGNvbnN0IGlzQmxvY2tDb3ZlcmFnZTogYm9vbGVhbiA9ICEocmFuZ2VzLmxlbmd0aCA9PT0gMSAmJiByYW5nZXNbMF0uY291bnQgPT09IDApO1xuXG4gIGNvbnN0IG1lcmdlZDogRnVuY3Rpb25Db3YgPSB7ZnVuY3Rpb25OYW1lLCByYW5nZXMsIGlzQmxvY2tDb3ZlcmFnZX07XG4gIC8vIGFzc2VydDogYG1lcmdlZGAgaXMgbm9ybWFsaXplZFxuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIEBwcmVjb25kaXRpb24gU2FtZSBgc3RhcnRgIGFuZCBgZW5kYCBmb3IgYWxsIHRoZSB0cmVlc1xuICovXG5mdW5jdGlvbiBtZXJnZVJhbmdlVHJlZXModHJlZXM6IFJlYWRvbmx5QXJyYXk8UmFuZ2VUcmVlPik6IFJhbmdlVHJlZSB8IHVuZGVmaW5lZCB7XG4gIGlmICh0cmVlcy5sZW5ndGggPD0gMSkge1xuICAgIHJldHVybiB0cmVlc1swXTtcbiAgfVxuICBjb25zdCBmaXJzdDogUmFuZ2VUcmVlID0gdHJlZXNbMF07XG4gIGxldCBkZWx0YTogbnVtYmVyID0gMDtcbiAgZm9yIChjb25zdCB0cmVlIG9mIHRyZWVzKSB7XG4gICAgZGVsdGEgKz0gdHJlZS5kZWx0YTtcbiAgfVxuICBjb25zdCBjaGlsZHJlbjogUmFuZ2VUcmVlW10gPSBtZXJnZVJhbmdlVHJlZUNoaWxkcmVuKHRyZWVzKTtcbiAgcmV0dXJuIG5ldyBSYW5nZVRyZWUoZmlyc3Quc3RhcnQsIGZpcnN0LmVuZCwgZGVsdGEsIGNoaWxkcmVuKTtcbn1cblxuY2xhc3MgUmFuZ2VUcmVlV2l0aFBhcmVudCB7XG4gIHJlYWRvbmx5IHBhcmVudEluZGV4OiBudW1iZXI7XG4gIHJlYWRvbmx5IHRyZWU6IFJhbmdlVHJlZTtcblxuICBjb25zdHJ1Y3RvcihwYXJlbnRJbmRleDogbnVtYmVyLCB0cmVlOiBSYW5nZVRyZWUpIHtcbiAgICB0aGlzLnBhcmVudEluZGV4ID0gcGFyZW50SW5kZXg7XG4gICAgdGhpcy50cmVlID0gdHJlZTtcbiAgfVxufVxuXG5jbGFzcyBTdGFydEV2ZW50IHtcbiAgcmVhZG9ubHkgb2Zmc2V0OiBudW1iZXI7XG4gIHJlYWRvbmx5IHRyZWVzOiBSYW5nZVRyZWVXaXRoUGFyZW50W107XG5cbiAgY29uc3RydWN0b3Iob2Zmc2V0OiBudW1iZXIsIHRyZWVzOiBSYW5nZVRyZWVXaXRoUGFyZW50W10pIHtcbiAgICB0aGlzLm9mZnNldCA9IG9mZnNldDtcbiAgICB0aGlzLnRyZWVzID0gdHJlZXM7XG4gIH1cblxuICBzdGF0aWMgY29tcGFyZShhOiBTdGFydEV2ZW50LCBiOiBTdGFydEV2ZW50KTogbnVtYmVyIHtcbiAgICByZXR1cm4gYS5vZmZzZXQgLSBiLm9mZnNldDtcbiAgfVxufVxuXG5jbGFzcyBTdGFydEV2ZW50UXVldWUge1xuICBwcml2YXRlIHJlYWRvbmx5IHF1ZXVlOiBTdGFydEV2ZW50W107XG4gIHByaXZhdGUgbmV4dEluZGV4OiBudW1iZXI7XG4gIHByaXZhdGUgcGVuZGluZ09mZnNldDogbnVtYmVyO1xuICBwcml2YXRlIHBlbmRpbmdUcmVlczogUmFuZ2VUcmVlV2l0aFBhcmVudFtdIHwgdW5kZWZpbmVkO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IocXVldWU6IFN0YXJ0RXZlbnRbXSkge1xuICAgIHRoaXMucXVldWUgPSBxdWV1ZTtcbiAgICB0aGlzLm5leHRJbmRleCA9IDA7XG4gICAgdGhpcy5wZW5kaW5nT2Zmc2V0ID0gMDtcbiAgICB0aGlzLnBlbmRpbmdUcmVlcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUGFyZW50VHJlZXMocGFyZW50VHJlZXM6IFJlYWRvbmx5QXJyYXk8UmFuZ2VUcmVlPik6IFN0YXJ0RXZlbnRRdWV1ZSB7XG4gICAgY29uc3Qgc3RhcnRUb1RyZWVzOiBNYXA8bnVtYmVyLCBSYW5nZVRyZWVXaXRoUGFyZW50W10+ID0gbmV3IE1hcCgpO1xuICAgIGZvciAoY29uc3QgW3BhcmVudEluZGV4LCBwYXJlbnRUcmVlXSBvZiBwYXJlbnRUcmVlcy5lbnRyaWVzKCkpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgcGFyZW50VHJlZS5jaGlsZHJlbikge1xuICAgICAgICBsZXQgdHJlZXM6IFJhbmdlVHJlZVdpdGhQYXJlbnRbXSB8IHVuZGVmaW5lZCA9IHN0YXJ0VG9UcmVlcy5nZXQoY2hpbGQuc3RhcnQpO1xuICAgICAgICBpZiAodHJlZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRyZWVzID0gW107XG4gICAgICAgICAgc3RhcnRUb1RyZWVzLnNldChjaGlsZC5zdGFydCwgdHJlZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRyZWVzLnB1c2gobmV3IFJhbmdlVHJlZVdpdGhQYXJlbnQocGFyZW50SW5kZXgsIGNoaWxkKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHF1ZXVlOiBTdGFydEV2ZW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtzdGFydE9mZnNldCwgdHJlZXNdIG9mIHN0YXJ0VG9UcmVlcykge1xuICAgICAgcXVldWUucHVzaChuZXcgU3RhcnRFdmVudChzdGFydE9mZnNldCwgdHJlZXMpKTtcbiAgICB9XG4gICAgcXVldWUuc29ydChTdGFydEV2ZW50LmNvbXBhcmUpO1xuICAgIHJldHVybiBuZXcgU3RhcnRFdmVudFF1ZXVlKHF1ZXVlKTtcbiAgfVxuXG4gIHNldFBlbmRpbmdPZmZzZXQob2Zmc2V0OiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnBlbmRpbmdPZmZzZXQgPSBvZmZzZXQ7XG4gIH1cblxuICBwdXNoUGVuZGluZ1RyZWUodHJlZTogUmFuZ2VUcmVlV2l0aFBhcmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdUcmVlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdUcmVlcyA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnBlbmRpbmdUcmVlcy5wdXNoKHRyZWUpO1xuICB9XG5cbiAgbmV4dCgpOiBTdGFydEV2ZW50IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBwZW5kaW5nVHJlZXM6IFJhbmdlVHJlZVdpdGhQYXJlbnRbXSB8IHVuZGVmaW5lZCA9IHRoaXMucGVuZGluZ1RyZWVzO1xuICAgIGNvbnN0IG5leHRFdmVudDogU3RhcnRFdmVudCB8IHVuZGVmaW5lZCA9IHRoaXMucXVldWVbdGhpcy5uZXh0SW5kZXhdO1xuICAgIGlmIChwZW5kaW5nVHJlZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5uZXh0SW5kZXgrKztcbiAgICAgIHJldHVybiBuZXh0RXZlbnQ7XG4gICAgfSBlbHNlIGlmIChuZXh0RXZlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZW5kaW5nVHJlZXMgPSB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gbmV3IFN0YXJ0RXZlbnQodGhpcy5wZW5kaW5nT2Zmc2V0LCBwZW5kaW5nVHJlZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nT2Zmc2V0IDwgbmV4dEV2ZW50Lm9mZnNldCkge1xuICAgICAgICB0aGlzLnBlbmRpbmdUcmVlcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFydEV2ZW50KHRoaXMucGVuZGluZ09mZnNldCwgcGVuZGluZ1RyZWVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnBlbmRpbmdPZmZzZXQgPT09IG5leHRFdmVudC5vZmZzZXQpIHtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdUcmVlcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBmb3IgKGNvbnN0IHRyZWUgb2YgcGVuZGluZ1RyZWVzKSB7XG4gICAgICAgICAgICBuZXh0RXZlbnQudHJlZXMucHVzaCh0cmVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uZXh0SW5kZXgrKztcbiAgICAgICAgcmV0dXJuIG5leHRFdmVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VSYW5nZVRyZWVDaGlsZHJlbihwYXJlbnRUcmVlczogUmVhZG9ubHlBcnJheTxSYW5nZVRyZWU+KTogUmFuZ2VUcmVlW10ge1xuICBjb25zdCByZXN1bHQ6IFJhbmdlVHJlZVtdID0gW107XG4gIGNvbnN0IHN0YXJ0RXZlbnRRdWV1ZTogU3RhcnRFdmVudFF1ZXVlID0gU3RhcnRFdmVudFF1ZXVlLmZyb21QYXJlbnRUcmVlcyhwYXJlbnRUcmVlcyk7XG4gIGNvbnN0IHBhcmVudFRvTmVzdGVkOiBNYXA8bnVtYmVyLCBSYW5nZVRyZWVbXT4gPSBuZXcgTWFwKCk7XG4gIGxldCBvcGVuUmFuZ2U6IFJhbmdlIHwgdW5kZWZpbmVkO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgZXZlbnQ6IFN0YXJ0RXZlbnQgfCB1bmRlZmluZWQgPSBzdGFydEV2ZW50UXVldWUubmV4dCgpO1xuICAgIGlmIChldmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAob3BlblJhbmdlICE9PSB1bmRlZmluZWQgJiYgb3BlblJhbmdlLmVuZCA8PSBldmVudC5vZmZzZXQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5leHRDaGlsZChvcGVuUmFuZ2UsIHBhcmVudFRvTmVzdGVkKSk7XG4gICAgICBvcGVuUmFuZ2UgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKG9wZW5SYW5nZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsZXQgb3BlblJhbmdlRW5kOiBudW1iZXIgPSBldmVudC5vZmZzZXQgKyAxO1xuICAgICAgZm9yIChjb25zdCB7cGFyZW50SW5kZXgsIHRyZWV9IG9mIGV2ZW50LnRyZWVzKSB7XG4gICAgICAgIG9wZW5SYW5nZUVuZCA9IE1hdGgubWF4KG9wZW5SYW5nZUVuZCwgdHJlZS5lbmQpO1xuICAgICAgICBpbnNlcnRDaGlsZChwYXJlbnRUb05lc3RlZCwgcGFyZW50SW5kZXgsIHRyZWUpO1xuICAgICAgfVxuICAgICAgc3RhcnRFdmVudFF1ZXVlLnNldFBlbmRpbmdPZmZzZXQob3BlblJhbmdlRW5kKTtcbiAgICAgIG9wZW5SYW5nZSA9IHtzdGFydDogZXZlbnQub2Zmc2V0LCBlbmQ6IG9wZW5SYW5nZUVuZH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3Qge3BhcmVudEluZGV4LCB0cmVlfSBvZiBldmVudC50cmVlcykge1xuICAgICAgICBpZiAodHJlZS5lbmQgPiBvcGVuUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgY29uc3QgcmlnaHQ6IFJhbmdlVHJlZSA9IHRyZWUuc3BsaXQob3BlblJhbmdlLmVuZCk7XG4gICAgICAgICAgc3RhcnRFdmVudFF1ZXVlLnB1c2hQZW5kaW5nVHJlZShuZXcgUmFuZ2VUcmVlV2l0aFBhcmVudChwYXJlbnRJbmRleCwgcmlnaHQpKTtcbiAgICAgICAgfVxuICAgICAgICBpbnNlcnRDaGlsZChwYXJlbnRUb05lc3RlZCwgcGFyZW50SW5kZXgsIHRyZWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAob3BlblJhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXN1bHQucHVzaChuZXh0Q2hpbGQob3BlblJhbmdlLCBwYXJlbnRUb05lc3RlZCkpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGQocGFyZW50VG9OZXN0ZWQ6IE1hcDxudW1iZXIsIFJhbmdlVHJlZVtdPiwgcGFyZW50SW5kZXg6IG51bWJlciwgdHJlZTogUmFuZ2VUcmVlKTogdm9pZCB7XG4gIGxldCBuZXN0ZWQ6IFJhbmdlVHJlZVtdIHwgdW5kZWZpbmVkID0gcGFyZW50VG9OZXN0ZWQuZ2V0KHBhcmVudEluZGV4KTtcbiAgaWYgKG5lc3RlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbmVzdGVkID0gW107XG4gICAgcGFyZW50VG9OZXN0ZWQuc2V0KHBhcmVudEluZGV4LCBuZXN0ZWQpO1xuICB9XG4gIG5lc3RlZC5wdXNoKHRyZWUpO1xufVxuXG5mdW5jdGlvbiBuZXh0Q2hpbGQob3BlblJhbmdlOiBSYW5nZSwgcGFyZW50VG9OZXN0ZWQ6IE1hcDxudW1iZXIsIFJhbmdlVHJlZVtdPik6IFJhbmdlVHJlZSB7XG4gIGNvbnN0IG1hdGNoaW5nVHJlZXM6IFJhbmdlVHJlZVtdID0gW107XG5cbiAgZm9yIChjb25zdCBuZXN0ZWQgb2YgcGFyZW50VG9OZXN0ZWQudmFsdWVzKCkpIHtcbiAgICBpZiAobmVzdGVkLmxlbmd0aCA9PT0gMSAmJiBuZXN0ZWRbMF0uc3RhcnQgPT09IG9wZW5SYW5nZS5zdGFydCAmJiBuZXN0ZWRbMF0uZW5kID09PSBvcGVuUmFuZ2UuZW5kKSB7XG4gICAgICBtYXRjaGluZ1RyZWVzLnB1c2gobmVzdGVkWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF0Y2hpbmdUcmVlcy5wdXNoKG5ldyBSYW5nZVRyZWUoXG4gICAgICAgIG9wZW5SYW5nZS5zdGFydCxcbiAgICAgICAgb3BlblJhbmdlLmVuZCxcbiAgICAgICAgMCxcbiAgICAgICAgbmVzdGVkLFxuICAgICAgKSk7XG4gICAgfVxuICB9XG4gIHBhcmVudFRvTmVzdGVkLmNsZWFyKCk7XG4gIHJldHVybiBtZXJnZVJhbmdlVHJlZXMobWF0Y2hpbmdUcmVlcykhO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==
