# Loop Body Sub-Workflow Architecture

When a `for...of` loop body has multiple IO calls, n8n's execution model causes item multiplication (each IO node's output feeds the next, multiplying items). The compiler solves this by wrapping multi-IO loop bodies in Execute Sub-Workflow nodes.

## Three-Way Branching in `processForOfStatement`

The effective IO count includes both direct IO calls and sub-function calls (`await fn(args)`). Sub-function calls are counted by `countFunctionCallsInBody()` using `extractFunctionCall()`.

| Effective IO count | Strategy | Pattern |
|-------------------|----------|---------|
| 0 (no IO, no fn calls) | Plain Code node | Loop body inlined as JS in a single Code node |
| 1 | Splitter -> single node | Splitter Code node + the IO node or function call (no sub-workflow needed) |
| 2+ | Splitter -> Execute Sub-Workflow | Splitter Code node + Execute Workflow node with inline `_loop_<var>` sub-workflow |

## Compiler Side
- **`countIOInBody()`**: Uses only `findNestedIO()` (not `extractIOCall` -- they overlap and cause double-counting)
- **`loopBodyHasFunctionCall()` / `countFunctionCallsInBody()`**: Detect sub-function calls in loop body using `extractFunctionCall()`. These count as "effective IO" for the Case 1/2/3 decision.
- **`ctx.inLoopBody` and `executeOnce`**: When `ctx.inLoopBody` is true, Set nodes and Execute Workflow nodes for function calls are emitted WITHOUT `executeOnce` (they run per item from splitter).
- **`compileLoopBodyAsSubWorkflow()`**: Creates a sub-workflow with `executeWorkflowTrigger` in passthrough mode. Loop variable seeded as `'io'` kind pointing to trigger node. Variable prefix `loop_<var>_` avoids collision.
- **Execute Workflow node**: Emitted WITHOUT `executeOnce` (runs per item from splitter)
- **Sub-workflow name**: `_loop_<loopVar>` (naming convention as decompiler hint)
- **No aggregate nodes**: Removed entirely. Post-loop nodes use `executeOnce: true` and `$('NodeName').first().json`.

## Decompiler Side
- **Detection**: `detectSubFunctions()` checks if inner workflow id starts with `_loop_`. Populates `loopBodies` map (separate from `subFunctions`).
- **Pre-seeded variable mapping**: `generateSimplifiedCode` accepts optional `preSeededVarNames` to map `'When Executed by Another Workflow'` -> loop variable name. Without this, expressions like `$('When Executed by Another Workflow').first().json.prop` resolve to just `prop` instead of `loopVar.prop`.
- **Loop body emission**: `detectForOfPattern()` detects splitter -> Execute Workflow with `_loop_` sub-workflow, returns `loopBodyCode` field.
- **Indentation**: Loop body code from `stripTriggerWrapper` is already at correct relative indentation. Do NOT strip additional tabs (a previous bug caused nested function bodies to lose indentation).
