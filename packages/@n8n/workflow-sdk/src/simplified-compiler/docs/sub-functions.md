# Sub-Function Compiler Architecture

Sub-functions (`async function fn(params) { ... }` + `await fn(args)`) compile to Execute Workflow nodes with inline `workflowJson`.

## Compiler Side
- **Function detection**: `extractFunctionDeclarations()` finds top-level `async function` declarations with IO calls or calls to other known functions
- **Recursion detection**: DFS cycle detection on the call graph -> error with `category: 'validation'`
- **Compilation order**: Topological sort (callees first) so inner function builders are available when compiling outer functions
- **Variable prefixing**: Sub-workflow node variables prefixed with `fn_<name>_` to avoid collision with main workflow. Two-pass rename: collect all renames first, then apply across all sdkCode (including `.onTrue()`/`.onFalse()` references)
- **Parameter passing**: Function arguments compiled to a Set node before the Execute Workflow node. Params seeded in `varSourceMap` with `'code'` kind pointing to `executeWorkflowTrigger`
- **Return values**: `const x = await fn(...)` maps `x` to the exec node name with `'io'` kind
- **WorkflowBuilder serialization**: Duck-typing (`toJSON` + `add`) in `json-serializer.ts` detects WorkflowBuilder instances in node parameters and converts them to `JSON.stringify(value.toJSON())`

## Decompiler Side
- **Detection**: `detectSubFunctions()` finds `executeWorkflow` nodes with `source: "parameter"` + `workflowJson` string
- **Dedup key**: Inner workflow's `id` field (not exec node name, which gets deduped by n8n like `processOrder 1`)
- **Set node pattern**: `isSubFunctionSetNode()` matches `"Set <name> params"` or `"Set <name> params N"` (deduped)
- **Recursive decompile**: Inner workflow JSON parsed -> `buildSemanticGraph` -> `annotateGraph` -> `buildCompositeTree` -> `generateSimplifiedCode`
- **Trigger wrapper stripping**: `stripTriggerWrapper()` removes the `onManual(async () => { ... })` wrapper that the inner `executeWorkflowTrigger` produces
- **Nested function hoisting**: `extractNestedFunctions()` extracts nested `async function` declarations from function bodies and hoists them to top level
- **Call emission**: Set nodes skipped, exec nodes emit `await functionName(args)` with resolved argument expressions
