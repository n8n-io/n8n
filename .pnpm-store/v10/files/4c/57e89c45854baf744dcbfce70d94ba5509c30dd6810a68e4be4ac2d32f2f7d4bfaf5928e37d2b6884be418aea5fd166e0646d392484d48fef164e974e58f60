"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var testGroups_exports = {};
__export(testGroups_exports, {
  createTestGroups: () => createTestGroups,
  filterForShard: () => filterForShard
});
module.exports = __toCommonJS(testGroups_exports);
function createTestGroups(projectSuite, expectedParallelism) {
  const groups = /* @__PURE__ */ new Map();
  const createGroup = (test) => {
    return {
      workerHash: test._workerHash,
      requireFile: test._requireFile,
      repeatEachIndex: test.repeatEachIndex,
      projectId: test._projectId,
      tests: []
    };
  };
  for (const test of projectSuite.allTests()) {
    let withWorkerHash = groups.get(test._workerHash);
    if (!withWorkerHash) {
      withWorkerHash = /* @__PURE__ */ new Map();
      groups.set(test._workerHash, withWorkerHash);
    }
    let withRequireFile = withWorkerHash.get(test._requireFile);
    if (!withRequireFile) {
      withRequireFile = {
        general: createGroup(test),
        parallel: /* @__PURE__ */ new Map(),
        parallelWithHooks: createGroup(test)
      };
      withWorkerHash.set(test._requireFile, withRequireFile);
    }
    let insideParallel = false;
    let outerMostSequentialSuite;
    let hasAllHooks = false;
    for (let parent = test.parent; parent; parent = parent.parent) {
      if (parent._parallelMode === "serial" || parent._parallelMode === "default")
        outerMostSequentialSuite = parent;
      insideParallel = insideParallel || parent._parallelMode === "parallel";
      hasAllHooks = hasAllHooks || parent._hooks.some((hook) => hook.type === "beforeAll" || hook.type === "afterAll");
    }
    if (insideParallel) {
      if (hasAllHooks && !outerMostSequentialSuite) {
        withRequireFile.parallelWithHooks.tests.push(test);
      } else {
        const key = outerMostSequentialSuite || test;
        let group = withRequireFile.parallel.get(key);
        if (!group) {
          group = createGroup(test);
          withRequireFile.parallel.set(key, group);
        }
        group.tests.push(test);
      }
    } else {
      withRequireFile.general.tests.push(test);
    }
  }
  const result = [];
  for (const withWorkerHash of groups.values()) {
    for (const withRequireFile of withWorkerHash.values()) {
      if (withRequireFile.general.tests.length)
        result.push(withRequireFile.general);
      result.push(...withRequireFile.parallel.values());
      const parallelWithHooksGroupSize = Math.ceil(withRequireFile.parallelWithHooks.tests.length / expectedParallelism);
      let lastGroup;
      for (const test of withRequireFile.parallelWithHooks.tests) {
        if (!lastGroup || lastGroup.tests.length >= parallelWithHooksGroupSize) {
          lastGroup = createGroup(test);
          result.push(lastGroup);
        }
        lastGroup.tests.push(test);
      }
    }
  }
  return result;
}
function filterForShard(shard, weights, testGroups) {
  weights ??= Array.from({ length: shard.total }, () => 1);
  if (weights.length !== shard.total)
    throw new Error(`PWTEST_SHARD_WEIGHTS number of weights must match the shard total of ${shard.total}`);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let shardableTotal = 0;
  for (const group of testGroups)
    shardableTotal += group.tests.length;
  const shardSizes = weights.map((w) => Math.floor(w * shardableTotal / totalWeight));
  const remainder = shardableTotal - shardSizes.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remainder; i++) {
    shardSizes[i % shardSizes.length]++;
  }
  let from = 0;
  for (let i = 0; i < shard.current - 1; i++)
    from += shardSizes[i];
  const to = from + shardSizes[shard.current - 1];
  let current = 0;
  const result = /* @__PURE__ */ new Set();
  for (const group of testGroups) {
    if (current >= from && current < to)
      result.add(group);
    current += group.tests.length;
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createTestGroups,
  filterForShard
});
