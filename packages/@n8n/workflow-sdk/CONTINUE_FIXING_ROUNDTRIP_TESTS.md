# Fix All Remaining Codegen Roundtrip Tests

## Goal

Unskip ALL remaining workflows in the skip list by fixing the codegen/parser to handle their patterns correctly.

## Constraints

- **Do NOT change the SDK interface** - only fix internal codegen/parser logic
- **Commit after each batch of fixes** - commit when you fix a pattern that enables multiple workflows
- **Follow TDD** - write failing test first, then fix
- **No regressions** - all unit tests and passing roundtrip tests must continue passing

## Current State (Session 2)

- Location: `/Users/mutasem/repos/n8n-worktree/code-workflow-builder/packages/@n8n/workflow-sdk`
- **235 roundtrip tests passing** (up from 229)
- **56 workflows in skip list** (down from 62)
- 47 workflow-builder unit tests passing
- 6 merge tests passing

### Session 2 Progress

Fixed the following issues:

1. **MergeNodeInstance.then() composite targets** (`src/merge.ts`)
   - Fixed handling when a MergeComposite is passed as a target to another merge's `.then()`
   - Added extraction of `mergeNode` from composite targets
   - Added handling for null/undefined targets in arrays
   - Added handling for empty targets array case

2. **handleNodeChain in workflow-builder.then()** (`src/workflow-builder.ts`)
   - Added `handleNodeChain()` method for when NodeChain is passed to `workflow.then()`
   - Updated `then()` signature to accept NodeChain type
   - Added `isNodeChain()` check before composite checks

3. **Nested merge composites in addMergeNodes** (`src/workflow-builder.ts`)
   - Fixed `addMergeNodes()` to recursively handle nested MergeComposite branches
   - Added handling for NodeChain branches in merge

4. **Recursive merge generation in codegen** (`src/codegen.ts`)
   - Fixed `generateMergeCall()` to recursively generate merge calls for nested merge nodes

**Workflows fixed:** 11466

## Files

- `src/codegen.ts` - Generates TypeScript from workflow JSON
- `src/parse-workflow-code.ts` - Parses code back to JSON
- `src/merge.ts` - Merge composite implementation
- `src/workflow-builder.ts` - Workflow builder implementation
- `src/__tests__/codegen-roundtrip.test.ts` - Roundtrip tests (skip list at top)

## Remaining 56 Skipped Workflows

All remaining failures are **connection mismatches** (code generates and parses, but connections don't match).

### Analysis by Pattern

Run `npx ts-node scripts/analyze_skipped.ts` to get current analysis.

**Common failure patterns observed:**

1. **SplitInBatches/Loop patterns** (cycles within batches)
   - 2896, 4557, 4807, 5045, 5139, 7945, 7946, 10132, 10196

2. **Merge node connections missing**
   - 3066, 3790, 4637, 5453, 5789, 8591, 11617

3. **Agent/Tool subnode connections**
   - 4366, 4975, 5435, 5449, 5734, 9814

4. **Wait node patterns**
   - 3121, 4767, 11617, 12462

5. **Fan-out within chains**
   - 5611, 5842, 6535, 11366, 12299

### Simplest Failures (1-2 missing nodes)

| ID | Missing Count | Missing Nodes |
|----|---------------|---------------|
| 3790 | 1 | Merge |
| 4868 | 1 | On new file in Google Drive |
| 5139 | 1 | Wait2 |
| 5453 | 1 | Merge |
| 5789 | 1 | Merge4 |
| 6542 | 1 | Reranker Cohere |
| 7957 | 1 | graph: adaccounts |
| 10889 | 1 | Select a Workflow |
| 11724 | 1 | Upload video to youtube as |
| 12325 | 1 | Create a post with image |

## Workflow

### For each pattern group:

1. **Analyze** - Pick simplest workflow, run debug command to see what's missing
2. **Understand** - Trace code flow to understand why connection is missing
3. **Fix** - Update codegen/parser/builder to handle the pattern
4. **Verify** - Run unit tests, run roundtrip tests
5. **Unskip** - Comment out fixed workflows from skip list with reason
6. **Commit** - `git add -A && git commit -m "fix: handle [pattern] in codegen"`

### Debug Commands

```bash
# Analyze a specific workflow
npx ts-node scripts/debug_merge.ts 3790

# Analyze all skipped workflows
npx ts-node scripts/analyze_skipped.ts

# Run roundtrip tests
pnpm test src/__tests__/codegen-roundtrip.test.ts

# Test specific workflow
pnpm test src/__tests__/codegen-roundtrip.test.ts -- --testNamePattern="3790"

# Run workflow-builder tests
pnpm test src/__tests__/workflow-builder.test.ts

# Run merge tests
pnpm test src/__tests__/merge.test.ts
```

### Debug Script Usage

The `scripts/debug_merge.ts` script shows:
- Generated code (first 2000 chars)
- Parse success/failure
- Node count comparison
- Missing connection sources
- Extra connection sources

## Attack Order (Recommended)

1. **Single missing Merge** (3790, 5453) - Likely related to merge-to-merge patterns
2. **Single missing node** (4868, 5139, etc.) - Various simple patterns
3. **Shared entry point issues** (5789 - Merge4) - Cycle target connection issues
4. **SplitInBatches loops** - Complex batch iteration patterns
5. **Agent/Tool connections** - AI subnode patterns
6. **Complex multi-node missing** - Larger structural issues

## Key Code Locations

- Cycle detection: `codegen.ts` ~line 280
- Cycle vars: `codegen.ts` ~line 356
- Chain with cycles: `codegen.ts` ~line 1985
- Merge generation: `codegen.ts` ~line 1667 (`generateMergeCall`)
- IF branches: `codegen.ts` ~line 2125
- Switch cases: `codegen.ts` ~line 2302
- Merge handling in builder: `workflow-builder.ts` ~line 692 (`addMergeNodes`)
- NodeChain handling: `workflow-builder.ts` ~line 953 (`handleNodeChain`)
- MergeNodeInstance.then(): `merge.ts` ~line 62

## Commit Message Format

```
fix: handle [pattern description] in codegen

- [what was wrong]
- [what was fixed]
- Unskipped: [workflow IDs]
```

## Done When

- Skip list in `codegen-roundtrip.test.ts` is empty (all commented out)
- All roundtrip tests pass
- All unit tests pass

<promise>ALL TESTS UNSKIPPED</promise>
