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
- **Automatic aggregation** — after loops with IO calls, the compiler inserts an aggregate node to collect results back into a single stream.

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
- Counters: `http`, `code`, `if`, `switch`, `loop`, `agg`, `respond`, `wf`, `set`

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
| `__fixtures__/w01-w17/` | Test fixtures (real workflow patterns) |

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
| **Parallel** | `await Promise.all([...])` | Fan-out with `.to()` |
| **Try/catch** | `try { ... } catch { ... }` | onError behavior on nodes |
| **Variables** | `const x = "value"` | Set node (static assignments) |
| **Code** | Any other JS statements | Code node with `jsCode` |
| **Credentials** | `{ auth: { type: 'bearer', credential: 'My Key' } }` | Node credentials config |

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

## Updating This Document

**Every new session working on the simplified-compiler MUST update this CLAUDE.md with learnings before finishing.** This is a living document.

What to add:
- New language features or node types supported
- Edge cases discovered and how they're handled
- Design decisions made and their rationale
- Gotchas or pitfalls encountered
- Changes to conventions or architecture

Do not let knowledge die in a single session. If you learned it, write it here.
