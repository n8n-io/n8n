# Eliminate pairedItem Cloning in Execution Engine

**Date:** 2026-04-01
**Status:** Draft
**Area:** `packages/core/src/execution-engine/workflow-execute.ts`
**Impact:** High (data-heavy workflows) | **Effort:** Low | **Risk:** Low

## Problem

At `workflow-execute.ts:1527-1566`, every item flowing into every node is shallow-cloned via object spread (`{...item}`) solely to attach a `pairedItem` property. Two nested `.map()` calls also allocate new arrays, and a new `ITaskDataConnections` container object is created — all to replace `executionData.data` on line 1566.

For a node processing N items, this means:
- N object allocations (shallow clones of each item)
- N shallow copies of all item properties (`json`, `binary`, `error`, etc.)
- 2 new arrays (outer connection array + inner items array) per connection type
- 1 new `ITaskDataConnections` object

On a workflow where a Code node processes 50,000 rows, this block alone creates ~50,002 objects and copies ~25MB of shallow references — before the node even starts executing.

### Current Code (lines 1527-1566)

```typescript
const newTaskDataConnections: ITaskDataConnections = {};
for (const connectionType of Object.keys(executionData.data)) {
  newTaskDataConnections[connectionType] = executionData.data[connectionType].map(
    (input, inputIndex) => {
      if (input === null) {
        return input;
      }
      return input.map((item, itemIndex) => {
        const sourceOverwrite = resolveSourceOverwrite(item, executionData);
        if (sourceOverwrite) {
          return {
            ...item,
            pairedItem: {
              item: itemIndex,
              input: inputIndex || undefined,
              sourceOverwrite,
            },
          };
        }
        return {
          ...item,
          pairedItem: {
            item: itemIndex,
            input: inputIndex || undefined,
          },
        };
      });
    },
  );
}
executionData.data = newTaskDataConnections;
```

## Solution

Mutate items in-place instead of cloning. Replace `.map()` with `for` loops to avoid array allocations.

### Why In-Place Mutation Is Safe

1. **No aliasing.** Items on the `nodeExecutionStack` are owned by this execution. They were created by the previous node's `execute()` or placed by `addNodeToBeExecuted()`. No external code holds references to the pre-mutation state.

2. **`resolveSourceOverwrite` reads before mutation.** It reads `item.pairedItem.sourceOverwrite` (line 15 in `resolve-source-overwrite.ts`) before we overwrite `pairedItem`. The value is captured in a local variable and written back into the new `pairedItem` object.

3. **Nothing downstream reads old `pairedItem`.** After line 1566, `executionData.data` flows to `runNode()` which provides it to the node's `execute()`. Nodes consume `item.json` and `item.binary` — they do not inspect `pairedItem`.

4. **`assignPairedItems` operates on output data.** The method at line 2603 runs on `nodeSuccessData` after node execution, not on input data. It is a separate code path.

5. **The `.map()` return values are only assigned back to `executionData.data`.** No intermediate consumer observes the transition between old and new arrays.

### Proposed Code

```typescript
// Mutate pairedItem in-place — zero item clones, zero array allocations
for (const connectionType of Object.keys(executionData.data)) {
  const connections = executionData.data[connectionType];
  for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
    const input = connections[inputIndex];
    if (input === null) continue;

    for (let itemIndex = 0; itemIndex < input.length; itemIndex++) {
      const item = input[itemIndex];
      const sourceOverwrite = resolveSourceOverwrite(item, executionData);
      item.pairedItem = sourceOverwrite
        ? { item: itemIndex, input: inputIndex || undefined, sourceOverwrite }
        : { item: itemIndex, input: inputIndex || undefined };
    }
  }
}
// executionData.data is already mutated — no reassignment needed
```

### What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Item objects | Shallow-cloned via `{...item}` | Mutated in-place |
| Connection arrays | New arrays via `.map()` | Existing arrays, `for` loops |
| Container object | New `ITaskDataConnections` created | Reuses `executionData.data` |
| `executionData.data` assignment | Replaced on line 1566 | No reassignment |

### What Stays the Same

- `pairedItem` property object is still freshly allocated (unavoidable, 3 properties, cheap)
- `resolveSourceOverwrite()` still called to preserve tool execution context
- `inputIndex || undefined` falsy-check behavior preserved exactly
- `null` input connections still skipped

## Performance Impact

| Metric | Before (10K items) | After (10K items) |
|--------|--------------------|--------------------|
| Object allocations | ~10,002 | ~10,000 (pairedItem objects only) |
| Shallow property copies | ~10,000 items x avg 4 props | 0 |
| Array allocations | 2 per connection type | 0 |
| GC pressure | High for large payloads | Minimal |

For a 50K-item workflow node, this eliminates ~50,000 object clones and ~200KB of array overhead per node execution.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Node modifies input items expecting fresh copy | Very Low — nodes receive items via ExecuteContext, which does not deep-clone. Existing behavior already assumes shared references for `json` sub-properties. | Existing test suite catches regressions. |
| Tool execution `sourceOverwrite` breaks | Very Low — `resolveSourceOverwrite` reads `item.pairedItem.sourceOverwrite` before we overwrite. Same read-before-write order as current code. | Add targeted test for tool execution path. |
| Test assertions on `executionData.data` object identity | Low — tests may assert `executionData.data !== original`. | Update any affected test assertions. |
| Plugin/community node reads pre-mutation `pairedItem` | None — `pairedItem` is set by the engine before `execute()` is called. Nodes only see the post-mutation value. | N/A |

## Test Plan

### 1. Existing Tests (must pass)
```bash
pushd packages/core && pnpm test && popd
pushd packages/cli && pnpm test && popd
```

### 2. Targeted Tests to Add

**a) Large item count verification:**
- Create execution data with 10,000 items on a single input
- Run the pairedItem assignment block
- Assert every item has correct `pairedItem: { item: <index> }`
- Assert no new item objects were created (check referential identity)

**b) Multi-input pairedItem verification:**
- Create execution data with 3 inputs, each having items
- Run the block
- Assert `input` property is set correctly (`undefined` for index 0, `1` for index 1, etc.)

**c) Tool execution sourceOverwrite preservation:**
- Create execution data with `metadata.preserveSourceOverwrite = true`
- Set `item.pairedItem = { item: 0, sourceOverwrite: { nodeName: 'Agent' } }`
- Run the block
- Assert `sourceOverwrite` is preserved in the new `pairedItem`

**d) Tool execution with preservedSourceOverwrite metadata:**
- Create execution data with `metadata.preservedSourceOverwrite = { nodeName: 'Agent' }`
- Run the block
- Assert metadata-level `preservedSourceOverwrite` takes precedence

**e) Null input connection handling:**
- Create execution data where one input connection is `null`
- Run the block
- Assert null connection is unchanged, other connections have correct `pairedItem`

### 3. Typecheck
```bash
pushd packages/core && pnpm typecheck && popd
```

### 4. Performance Benchmark (manual)
Before and after comparison:
- Workflow: Trigger -> Code node (generates 50K items) -> NoOp node
- Measure: execution time of the NoOp node (dominated by pairedItem assignment)
- Expected: measurable reduction in execution time and memory allocation

## Implementation Steps

1. **Modify `workflow-execute.ts` lines 1527-1566** — replace clone block with in-place mutation
2. **Remove line 1566** (`executionData.data = newTaskDataConnections`)
3. **Run existing tests** — `packages/core` and `packages/cli`
4. **Run typecheck** — `packages/core`
5. **Add targeted tests** — the 5 test cases described above
6. **Run lint** — `packages/core`
7. **Manual benchmark** — 50K item workflow, before/after timing

## Files Modified

| File | Change |
|------|--------|
| `packages/core/src/execution-engine/workflow-execute.ts` | Replace lines 1527-1566 with in-place mutation |
| `packages/core/src/execution-engine/__tests__/paired-item-mutation.test.ts` | New test file for targeted tests |

## Rollback

If issues are discovered post-merge, revert the single commit. The change is isolated to one block in one file with no external API changes.
