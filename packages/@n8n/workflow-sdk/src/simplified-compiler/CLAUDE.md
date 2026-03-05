# Simplified Compiler

## Project Goal

n8n's Workflow-SDK TypeScript is verbose and configuration-heavy — exact node types, version numbers, parameter structures, credential configs, connection chains. An LLM generating SDK code directly faces high token cost and error rates.

**This project solves that** with a simplified JavaScript DSL that an LLM can generate quickly and naturally. The DSL reads like normal JS — `http.get()`, `ai.chat()`, `if/else`, `for-of` loops — but compiles to a fully valid n8n workflow.

The compiler handles translation to exact n8n node configs. The LLM never needs to know about node types, versions, or parameter schemas.

```javascript
// What the LLM writes (simplified DSL)
onSchedule({ every: '1h' }, async () => {
  const users = await http.get('https://api.example.com/users');
  const active = users.filter(u => u.active);
  await http.post('https://slack.com/api/chat.postMessage', { text: active.length + ' active users' });
});

// Compiler produces full Workflow-SDK TypeScript with trigger, HTTP nodes, Code nodes, expressions, etc.
```

## Design Philosophy

The DSL does NOT try to support every n8n concept. The guiding principle:

**If it can't be expressed as linear or branching JS control flow, it's out of scope.**

Intentionally excluded:
- **Merge nodes / multi-input joins** — can't be naturally expressed in sequential JS
- **n8n expression primitives (`$json`, `$input`, etc.)** — the DSL uses plain JS variables; the compiler resolves `users.name` to `={{ $('HTTP 1').first().json.name }}` automatically
- Any node pattern that requires non-linear graph topology

## Item Simplification

n8n nodes natively return arrays of items (e.g., `[{json: {...}}, {json: {...}}, ...]`). The DSL hides this:

- **Single-item by default** — `const result = await http.get(...)` gives a single object. The compiler sets `executeOnce: true` and references use `.first().json` (e.g., `$('HTTP 1').first().json.name`).
- **Multi-item with `.all()`** — when code needs the full array, references use `.all()` (e.g., `$('HTTP 1').all()`).
- **Loops for iteration** — `for (const item of items)` emits a splitter Code node for per-item processing.
- **Loop body isolation** — multi-IO loop bodies are wrapped in Execute Sub-Workflow nodes to prevent item multiplication (see below).
- **No aggregate nodes** — post-loop nodes use `executeOnce: true` and reference data by node name (`$('NodeName').first().json`), making aggregation unnecessary.

The LLM writes normal JS (single values, for-of loops) and the compiler handles n8n's item-list plumbing.

## Architecture — Two Pipelines

### Compile: Simplified JS -> SDK

```
Source JS string
  -> Acorn parse (AST)
  -> findCallbacks() (onManual, onWebhook, onSchedule, onError)
  -> walkStatements() per callback
     -> extractIOCall() (http, ai, workflow, respond)
     -> processIfStatement() / processSwitchStatement()
     -> processForOfStatement() / processPromiseAll()
     -> flushPendingCode() (batch non-IO statements into Code nodes)
  -> generateSDKCode()
  -> { code: string, errors: CompilerError[] }
```

Key tracking during compilation:
- `varSourceMap`: variable name -> source node name (for expression resolution)
- `varSourceKind`: variable -> `'io'` | `'code'` (determines reference style)
- Counters: `http`, `code`, `if`, `switch`, `loop`, `respond`, `wf`, `set`

### Decompile: SDK -> Simplified JS

```
SDK TypeScript string
  -> parseWorkflowCode()     -> WorkflowJSON
  -> buildSemanticGraph()    -> SemanticGraph
  -> annotateGraph()         -> (adds trigger/error markers)
  -> buildCompositeTree()    -> CompositeTree
  -> generateSimplifiedCode() -> Simplified JS string
```

The decompile pipeline lives in `src/codegen/`. The `decompiler.ts` here is a thin wrapper that orchestrates those steps. Purpose: convert existing workflows back to DSL for LLM editing.

## Shared Bidirectional Mappings (`src/shared/`)

Used by both compile and decompile:

| File | Maps |
|------|------|
| `trigger-mapping.ts` | Callback name (`onManual`) <-> trigger node type (`n8n-nodes-base.manualTrigger`) |
| `credential-mapping.ts` | Auth type (`bearer`) <-> credential type (`httpHeaderAuth`) |
| `schedule-mapping.ts` | Human string (`{ every: '5m' }`) <-> n8n rule params |

## Round-Trip Test Validation

The core test strategy in `compiler.test.ts`:

```
Simple JS  --compile-->  SDK₁  --decompile-->  Simple JS₂  --compile-->  SDK₂

Assert: normalizeSDK(SDK₁) === normalizeSDK(SDK₂)
```

**How it works:**
1. Compile the input fixture to SDK₁
2. Decompile SDK₁ back to simplified JS₂
3. Recompile JS₂ to SDK₂
4. Normalize both SDKs (strip metadata, collapse whitespace) and compare

**Two test modes per fixture:**
- **Forward test**: `transpileWorkflowJS(input.js)` must equal `output.js` exactly
- **Round-trip test**: compile -> decompile -> recompile must produce structurally identical SDK

**Fixtures:** `__fixtures__/w01-w17/`, each containing:
- `meta.json` — title, templateId, optional `skip` flag
- `input.js` — simplified DSL source
- `output.js` — expected SDK output

## File Map

| File | Purpose |
|------|---------|
| `compiler.ts` | Main transpiler: simplified JS -> Workflow-SDK TypeScript |
| `decompiler.ts` | Thin wrapper: SDK -> simplified JS (orchestrates codegen pipeline) |
| `compiler.test.ts` | Forward tests (15 phases) + round-trip tests |
| `decompiler-debug.test.ts` | Debug test for decompile round-trips with diff logging |
| `examples.ts` | Pre-built DSL examples for UI quick-start templates |
| `generate-report.ts` | HTML report generator for fixture validation results |
| `index.ts` | Public exports: `transpileWorkflowJS`, `decompileWorkflowSDK`, `COMPILER_EXAMPLES` |
| `__fixtures__/w01-w27/` | Test fixtures (real workflow patterns, w18-w22 sub-functions, w23-w24 try/catch, w25 CRUD+branching, w26 loop+sub-fn, w27 loop+try/catch) |

**Decompile pipeline (in `src/codegen/`):**

| File | Role in decompile |
|------|-------------------|
| `parse-workflow-code.ts` | SDK TypeScript -> WorkflowJSON |
| `semantic-graph.ts` | WorkflowJSON -> SemanticGraph (nodes + edges) |
| `graph-annotator.ts` | Adds trigger/error markers to graph |
| `composite-builder.ts` | SemanticGraph -> CompositeTree (abstract chain/ifElse/switchCase) |
| `simplified-generator.ts` | CompositeTree -> simplified JS string |

## Supported Language Features

| Category | DSL Syntax | Compiles To |
|----------|-----------|-------------|
| **Triggers** | `onManual()`, `onWebhook()`, `onSchedule()`, `onError()` | Trigger nodes |
| **HTTP** | `await http.get/post/put/patch/delete(url, body?, options?)` | httpRequest node |
| **AI** | `await ai.chat(model, prompt, { tools, memory })` | Agent node + subnodes |
| **Sub-workflows** | `await workflow.run(name)` | executeWorkflow node |
| **Respond** | `respond({ status, body, headers })` | respondToWebhook node |
| **If/else** | `if (cond) { ... } else { ... }` | ifElse node with branches |
| **Switch** | `switch (expr) { case: ... }` | switchCase node |
| **Loops** | `for (const x of items) { ... }` | Splitter Code + aggregate |
| **Try/catch** | `try { ... } catch { ... }` | onError behavior on nodes |
| **Sub-functions** | `async function fn(params) { ... }` then `await fn(args)` | Execute Workflow node with inline `workflowJson` |
| **Variables** | `const x = "value"` | Set node (static assignments) |
| **Code** | Any other JS statements | Code node with `jsCode` |
| **Credentials** | `{ auth: { type: 'bearer', credential: 'My Key' } }` | Node credentials config |

## Development Process

**Always use the TDD skill before making changes.** Every plan and implementation must follow the red/green pattern:

1. **Red** — Write a failing test that defines the expected behavior
2. **Green** — Implement the minimum code to make it pass
3. **Refactor** — Clean up if needed

**Plans must reflect this structure.** Each plan step should be a red/green cycle — not "implement X" but "add test for X (red), then implement X (green)". The plan itself is a sequence of test-then-implement pairs.

This applies to bug fixes, new features, and any code changes in the compiler/decompiler.

## Commands

```bash
# Run all compiler tests (from workflow-sdk package dir)
pushd packages/@n8n/workflow-sdk && pnpm test compiler.test.ts && popd

# Run decompiler debug tests
pushd packages/@n8n/workflow-sdk && pnpm test decompiler-debug.test.ts && popd

# Generate HTML fixture report
# (via generate-report.ts — produces __fixtures__/report.html)
```

## Conventions

- **Node variable naming**: `t0` (trigger), `http1`, `code1`, `if1`, `switch1`, `set1`, `agg1`, `respond1`, `wf1`
- **No n8n expressions in DSL**: plain JS variables only — compiler resolves to `={{ $('NodeName').first().json.path }}`
- **Never use `$json` in generated expressions**: always use explicit `$('NodeName').first().json.prop` references. This ensures expressions are unambiguous and don't depend on predecessor ordering.
- **`executeOnce: true`** on all non-trigger nodes (single-item semantics)
- **Fixture naming**: `w01-descriptive-name/` with `meta.json`, `input.js`, `output.js`
- **Adding new fixtures**: create dir, add the three files, fixture auto-discovered by `loadFixtures()`

## Skills

### generate-simplified-code

Location: `sdk-v3/.claude/skills/generate-simplified-code/SKILL.md`

Generates simplified DSL code from an n8n workflow template. Invoked with `/generate-simplified-code <templateId|url|path>`. Claude reads the template JSON, analyzes nodes/connections/expressions, writes the DSL, then compiles and validates the result.

### validate-compiler-fixture

Location: `sdk-v3/.claude/skills/validate-compiler-fixture/SKILL.md`

Validates existing fixtures through the full compilation pipeline (transpile, generate, structural checks). Referenced by `generate-simplified-code` for its optional "save as fixture" step.

### Maintenance

**When DSL syntax changes, the `generate-simplified-code` skill MUST be updated.** Key sections to keep in sync:
- Node type -> DSL mapping table (Step 2c)
- HTTP method signatures and auth handling (Step 2d)
- Credential type reverse mapping (Step 2d)
- AI agent options (Step 2e)
- IF/Switch condition mapping (Steps 2f, 2g)
- Schedule conversion table (Step 2a)
- Unsupported patterns list (Step 3)

## Round-Trip Coverage

27/27 fixtures pass round-trip (100%). Previous fixes: W10 indentation (preserve relative indentation in `emitSubFunctionDeclaration`), W25/W26/W27 (see below).

## Sub-Function Compiler Architecture

Sub-functions (`async function fn(params) { ... }` + `await fn(args)`) compile to Execute Workflow nodes with inline `workflowJson`.

### Compiler Side
- **Function detection**: `extractFunctionDeclarations()` finds top-level `async function` declarations with IO calls or calls to other known functions
- **Recursion detection**: DFS cycle detection on the call graph → error with `category: 'validation'`
- **Compilation order**: Topological sort (callees first) so inner function builders are available when compiling outer functions
- **Variable prefixing**: Sub-workflow node variables prefixed with `fn_<name>_` to avoid collision with main workflow. Two-pass rename: collect all renames first, then apply across all sdkCode (including `.onTrue()`/`.onFalse()` references)
- **Parameter passing**: Function arguments compiled to a Set node before the Execute Workflow node. Params seeded in `varSourceMap` with `'code'` kind pointing to `executeWorkflowTrigger`
- **Return values**: `const x = await fn(...)` maps `x` to the exec node name with `'io'` kind
- **WorkflowBuilder serialization**: Duck-typing (`toJSON` + `add`) in `json-serializer.ts` detects WorkflowBuilder instances in node parameters and converts them to `JSON.stringify(value.toJSON())`

### Decompiler Side
- **Detection**: `detectSubFunctions()` finds `executeWorkflow` nodes with `source: "parameter"` + `workflowJson` string
- **Dedup key**: Inner workflow's `id` field (not exec node name, which gets deduped by n8n like `processOrder 1`)
- **Set node pattern**: `isSubFunctionSetNode()` matches `"Set <name> params"` or `"Set <name> params N"` (deduped)
- **Recursive decompile**: Inner workflow JSON parsed → `buildSemanticGraph` → `annotateGraph` → `buildCompositeTree` → `generateSimplifiedCode`
- **Trigger wrapper stripping**: `stripTriggerWrapper()` removes the `onManual(async () => { ... })` wrapper that the inner `executeWorkflowTrigger` produces
- **Nested function hoisting**: `extractNestedFunctions()` extracts nested `async function` declarations from function bodies and hoists them to top level
- **Call emission**: Set nodes skipped, exec nodes emit `await functionName(args)` with resolved argument expressions

## Loop Body Sub-Workflow Architecture

When a `for...of` loop body has multiple IO calls, n8n's execution model causes item multiplication (each IO node's output feeds the next, multiplying items). The compiler solves this by wrapping multi-IO loop bodies in Execute Sub-Workflow nodes.

### Three-Way Branching in `processForOfStatement`

The effective IO count includes both direct IO calls and sub-function calls (`await fn(args)`). Sub-function calls are counted by `countFunctionCallsInBody()` using `extractFunctionCall()`.

| Effective IO count | Strategy | Pattern |
|-------------------|----------|---------|
| 0 (no IO, no fn calls) | Plain Code node | Loop body inlined as JS in a single Code node |
| 1 | Splitter → single node | Splitter Code node + the IO node or function call (no sub-workflow needed) |
| 2+ | Splitter → Execute Sub-Workflow | Splitter Code node + Execute Workflow node with inline `_loop_<var>` sub-workflow |

### Compiler Side
- **`countIOInBody()`**: Uses only `findNestedIO()` (not `extractIOCall` — they overlap and cause double-counting)
- **`loopBodyHasFunctionCall()` / `countFunctionCallsInBody()`**: Detect sub-function calls in loop body using `extractFunctionCall()`. These count as "effective IO" for the Case 1/2/3 decision.
- **`ctx.inLoopBody` and `executeOnce`**: When `ctx.inLoopBody` is true, Set nodes and Execute Workflow nodes for function calls are emitted WITHOUT `executeOnce` (they run per item from splitter).
- **`compileLoopBodyAsSubWorkflow()`**: Creates a sub-workflow with `executeWorkflowTrigger` in passthrough mode. Loop variable seeded as `'io'` kind pointing to trigger node. Variable prefix `loop_<var>_` avoids collision.
- **Execute Workflow node**: Emitted WITHOUT `executeOnce` (runs per item from splitter)
- **Sub-workflow name**: `_loop_<loopVar>` (naming convention as decompiler hint)
- **No aggregate nodes**: Removed entirely. Post-loop nodes use `executeOnce: true` and `$('NodeName').first().json`.

### Decompiler Side
- **Detection**: `detectSubFunctions()` checks if inner workflow id starts with `_loop_`. Populates `loopBodies` map (separate from `subFunctions`).
- **Pre-seeded variable mapping**: `generateSimplifiedCode` accepts optional `preSeededVarNames` to map `'When Executed by Another Workflow'` → loop variable name. Without this, expressions like `$('When Executed by Another Workflow').first().json.prop` resolve to just `prop` instead of `loopVar.prop`.
- **Loop body emission**: `detectForOfPattern()` detects splitter → Execute Workflow with `_loop_` sub-workflow, returns `loopBodyCode` field.
- **Indentation**: Loop body code from `stripTriggerWrapper` is already at correct relative indentation. Do NOT strip additional tabs (a previous bug caused nested function bodies to lose indentation).

## Try/Catch with Error Connections

The compiler supports three cases for `try { ... } catch { ... }`:

| Try body | Catch body | Strategy |
|----------|-----------|----------|
| 1 IO node | empty `catch {}` | Mark node with `onError: continueErrorOutput`, no error connection |
| 1 IO node | non-empty | Mark node with `onError: continueErrorOutput` + `.onError(catchChain)` |
| 2+ IO nodes | any | Wrap try body in `__tryCatch_N` sub-workflow, Execute Workflow node with `.onError(catchChain)` if catch non-empty |

### Error Connection Serialization (`main[1]` vs `error`)
- **`continueErrorOutput` nodes**: Error connections use `main` connection type at **output index 1** (not `error` connection type). This matches n8n's runtime expectation: success at `main[0]`, error at `main[1]`.
- **Regular error connections** (e.g., IfElseBuilder): Use `error` connection type at output index 0 (separate from `main`).
- **Builder's `.onError()`** (`node-builder.ts`): Automatically checks `config.onError === 'continueErrorOutput'` to determine which pattern to use.
- **Decompiler normalization**: `semantic-registry.ts:getOutputName()` normalizes `main[1]` → `'error'` for `continueErrorOutput` nodes, so the decompiler sees a uniform representation.

### Compiler Side
- **`processTryStatement()`**: Three-way branching based on `countIOInBody()` and whether catch body has statements
- **Error connections**: `ctx.errorConnections` array tracks `{ sourceVar, catchChainStartVar }` pairs. Emitted as `sourceVar.onError(catchChainStartVar);` in `generateSDKCode()` after node declarations.
- **Catch nodes as branch-only**: Catch chain nodes marked `branchOnly: true` (same pattern as if/else branches) so they don't appear in the main `.to()` chain
- **Multi-node try body**: Compiled via `compileTryCatchBodyAsSubWorkflow()` — same pattern as `compileLoopBodyAsSubWorkflow()`. Sub-workflow name `__tryCatch_N`, variable prefix `tc_tryCatch_N_`.
- **Variable capture**: `collectCapturedVariables()` walks try body AST for `Identifier` references present in `varSourceMap`. Captured vars passed via Set node before the Execute Workflow node.
- **Empty catch optimization**: When catch body is empty (any IO count), `onError: continueErrorOutput` is set but no error connection or catch chain is emitted.

### Decompiler Side
- **Single-node try with error handler**: `visitLeaf()` checks `leaf.errorHandler` + `onError === 'continueErrorOutput'`. Sets `ctx.suppressTryCatch = true` to prevent `emitHttpNode`/`emitAiNode` from adding their own `try/catch {}`, then wraps: `try { <node> } catch { <error handler> }`.
- **Multi-node try (`__tryCatch_` sub-workflow)**: `detectSubFunctions()` checks if inner workflow id starts with `__tryCatch_`. Decompiles inner workflow body, stores in `tryCatchBodies` map. `visitLeaf()` detects the exec node, emits `try { <decompiled body> } catch { <error handler> }`.
- **Set node skipping**: Set nodes for `__tryCatch_N` params are skipped via `isSubFunctionSetNode()` (same pattern as sub-function Set nodes).
- **`suppressTryCatch` flag**: Added to `SimplifiedGenContext`. When true, `emitHttpNode`/`emitAiNode` skip their own `try/catch` wrapping but still use assignment syntax (`x = await` instead of `const x = await`).

### Pre-existing try/catch (empty catch)
- **Variable name recovery**: `computeVariableAssignments()` checks the predecessor Code node for `let X = null;` and uses `X` as the variable name instead of the default `data`. This prevents duplicate declarations.
- **Code node awareness**: When `codeNodeVars.has(assignedVar)` is true, `emitHttpNode()`/`emitAiNode()` skip emitting `let X = null;` since the Code node already declares it.
- **`continueRegularOutput`** emits `// @onError continue` annotation (different pattern, no try/catch).

## W25/W26/W27 Round-Trip Fixes

### W25: CRUD + Branching + Error Handling
Two bugs prevented round-trip:
1. **Builder instance identity** (`workflow-builder.ts`): `addConnectionTargetNodes` and `addSingleNodeConnectionTargets` used `!nodes.has(targetNode.name)` to guard against adding duplicate nodes. With multiple nodes sharing the same name (e.g., 6x "POST httpbin.org/post"), different instances were incorrectly skipped. Fixed with `isInstanceInGraph()` which checks by instance reference (`===`), not by name.
2. **Switch case operator types** (`simplified-generator.ts`): `visitSwitchCase` always wrapped case values in quotes (`'true'`), making them string literals. When the operator type is `boolean` or `number`, values must be emitted without quotes to preserve type during round-trip.

### W26: Loop with Sub-Function
**Sub-function calls in loops counted as "0 IO"**: `processForOfStatement` only counted direct IO calls (`http.*`, `ai.*`). A sub-function call (`await enrichUser(...)`) was invisible, causing the loop body to be inlined as opaque JS in a Code node. The decompiler can't reconstruct function calls from opaque Code node `jsCode`. Fixed by adding `loopBodyHasFunctionCall()` / `countFunctionCallsInBody()` and treating function calls as effective IO. Also ensured Set/ExecuteWorkflow nodes respect `ctx.inLoopBody` to skip `executeOnce`.

### W27: Loop with Try/Catch
**Error connections lost in sub-workflow**: `compileLoopBodyAsSubWorkflow()` creates a local `errorConnections: []` context. Error connections pushed during `processTryStatement` were trapped in the local context and never returned. Fixed by propagating `errorConnections` through `CompiledFunction` interface and emitting them in `generateSDKCode()`.

## Updating This Document

**Every new session working on the simplified-compiler MUST update this CLAUDE.md with learnings before finishing.** This is a living document.

What to add:
- New language features or node types supported
- Edge cases discovered and how they're handled
- Design decisions made and their rationale
- Gotchas or pitfalls encountered
- Changes to conventions or architecture

Do not let knowledge die in a single session. If you learned it, write it here.
