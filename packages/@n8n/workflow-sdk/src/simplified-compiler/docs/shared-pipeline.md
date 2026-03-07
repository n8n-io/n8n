# Shared Pipeline (Multiple Triggers -> Same Chain)

When multiple `onX()` callbacks call the same parameterless top-level function (e.g., `onManual(async () => { await process(); })` + `onSchedule(async () => { await process(); })`), the compiler inlines the function body and connects all triggers to the shared chain -- no Execute Workflow sub-workflow needed.

## Detection Criteria
1. Function has **no parameters**
2. Called from **2+ callbacks**
3. Each calling callback body is **solely** `await fnName()` (single statement, no args)

## Compiler Side (`compiler.ts`)
- **`detectSharedPipelines()`**: Scans callbacks for the pattern, returns `Map<fnName, callbackIndices[]>`
- **`extractSolePipelineCall()`**: Checks if a callback body is exactly `await fnName()` with no params
- Shared pipeline functions are **removed from `functionDefs`** before sub-workflow compilation (step 4.5a)
- **First callback**: function body replaces callback body -> `transpileCallback()` produces trigger + inline nodes
- **Subsequent callbacks**: just a trigger node connected to the first pipeline node via `tN.to(firstPipelineNodeVar)`

## Decompiler Side (`simplified-generator.ts`)
- **`detectSharedPipeline()`**: In the composite tree, detects when multiple trigger roots converge on the same downstream chain. Pattern: root A = `Chain([Trigger, ...nodes])`, root B = `Chain([Trigger, VarRef(firstNode)])`.
- When detected, emits `async function pipeline() { ... }` with the shared body, then each trigger callback as `await pipeline();`
- The `visited` set in `composite-builder.ts` naturally creates `VarRef` nodes when the second trigger tries to visit already-visited downstream nodes

## Node Counter Behavior
The second trigger's variable name (e.g., `t5` in W10) is based on `allNodes.length` at the time of creation. The pipeline nodes (code1, http1, etc.) consume counter slots, so the second trigger gets a higher index.
