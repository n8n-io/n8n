# Simplified Compiler

## Project Goal

n8n's Workflow-SDK TypeScript is verbose and configuration-heavy — exact node types, version numbers, parameter structures, credential configs, connection chains. An LLM generating SDK code directly faces high token cost and error rates.

**This project solves that** with a simplified JavaScript DSL that an LLM can generate quickly and naturally. The DSL reads like normal JS — `http.get()`, `new Agent({...}).chat()`, `if/else`, `for-of` loops — but compiles to a fully valid n8n workflow.

The compiler handles translation to exact n8n node configs. The LLM never needs to know about node types, versions, or parameter schemas.

```javascript
// What the LLM writes (simplified DSL)
import { onSchedule } from '@n8n/sdk';
import http from '@n8n/sdk/http';

onSchedule({ every: '1h' }, async () => {
  const users = await http.get('https://api.example.com/users');
  const active = users.filter(u => u.active);
  await http.post('https://slack.com/api/chat.postMessage', { text: active.length + ' active users' });
});

// AI with class-based constructors — parameter names match node schemas directly
import { Agent, OpenAiModel, HttpRequestTool } from '@n8n/sdk/ai';

const answer = await new Agent({
  prompt: 'Answer the question',
  model: new OpenAiModel({ model: 'gpt-4o' }),
  tools: [new HttpRequestTool({ name: 'Search', url: 'https://api.kb.com/search' })],
}).chat();

// Compiler produces full Workflow-SDK TypeScript with trigger, HTTP nodes, Code nodes, expressions, etc.
```

## Design Philosophy

The DSL does NOT try to support every n8n concept. The guiding principle:

**If it can't be expressed as linear or branching JS control flow, it's out of scope.**

Intentionally excluded:
- **Merge nodes / multi-input joins** — can't be expressed directly in the DSL (though the compiler uses Merge internally for `Promise.all` convergence)
- **n8n expression primitives (`$json`, `$input`, etc.)** — the DSL uses plain JS variables; the compiler resolves `users.name` to `={{ $('HTTP 1').first().json.name }}` automatically
- Any node pattern that requires non-linear graph topology

**Import statements** (`import ... from '...'`) are silently ignored by the compiler. They exist to make the DSL feel like normal JS/TS to LLMs and editors. All DSL globals (`http`, `onManual`, `Agent`, etc.) are available without imports. Convention: `@n8n/sdk` for triggers, `@n8n/sdk/http` for http, `@n8n/sdk/ai` for AI classes.

## Item Simplification

n8n nodes natively return arrays of items (e.g., `[{json: {...}}, {json: {...}}, ...]`). The DSL hides this:

- **Single-item by default** — `const result = await http.get(...)` gives a single object. The compiler sets `executeOnce: true` on HTTP nodes.
- **Aggregate Code nodes** — after every HTTP call with an assigned variable, the compiler emits an aggregate Code node (`Collect <varName>`) that collects all items, defensively unwraps single-item responses, and stores the result under the variable name. This ensures both single-object and array responses work correctly for downstream Code nodes and expressions.
- **Loops for iteration** — `for (const item of items)` emits a splitter Code node for per-item processing.
- **Loop body isolation** — multi-IO loop bodies are wrapped in Execute Sub-Workflow nodes to prevent item multiplication (see `docs/loop-sub-workflows.md`).
- **Post-loop aggregation** — post-loop nodes use `executeOnce: true` and reference data by node name (`$('NodeName').first().json`), making further aggregation unnecessary.

The LLM writes normal JS (single values, for-of loops) and the compiler handles n8n's item-list plumbing.

## Architecture — Two Pipelines

### Compile: Simplified JS -> SDK

```
Source JS string
  -> Acorn parse (AST)
  -> findCallbacks() (onManual, onWebhook, onSchedule, onError, onTrigger)
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
| `trigger-mapping.ts` | Callback name (`onManual`) <-> trigger node type (`n8n-nodes-base.manualTrigger`). Also `APP_TRIGGER_REGISTRY` for `onTrigger()` generic app triggers. |
| `credential-mapping.ts` | Auth type (`bearer`) <-> credential type (`httpHeaderAuth`) |
| `schedule-mapping.ts` | Human string (`{ every: '5m' }`) <-> n8n rule params |
| `ai-node-mapping.ts` | DSL class name (`OpenAiModel`) <-> node type + version + category (from auto-generated registry) |

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

**Fixtures:** `__fixtures__/w01-w38/`, each containing:
- `meta.json` — title, templateId, optional `skip` flag
- `input.js` — simplified DSL source
- `output.js` — expected SDK output

## File Map

| File | Purpose |
|------|---------|
| `compiler.ts` | Main transpiler: simplified JS -> Workflow-SDK TypeScript |
| `decompiler.ts` | Thin wrapper: SDK -> simplified JS (orchestrates codegen pipeline) |
| `compiler.test.ts` | Forward tests (18 phases) + round-trip tests + report generation |
| `execution.test.ts` | Execution tests: compile → parse → pin data → execute with nock |
| `execution-utils.ts` | Lightweight workflow executor: `executeWorkflow()`, `buildAdditionalData()`, mock task runner |
| `decompiler-debug.test.ts` | Debug test for decompile round-trips with diff logging |
| `expectation-matcher.ts` | Execution expectation matching: `deepPartialMatch`, `deepExactMatch`, `matchRequests`, `matchNodes`, `checkExpectations` |
| `expectation-matcher.test.ts` | 40 unit tests for expectation matchers |
| `examples.ts` | Pre-built DSL examples for UI quick-start templates |
| `generate-report.ts` | HTML report generator for fixture validation results + expectation badges/diffs |
| `index.ts` | Public exports: `transpileWorkflowJS`, `decompileWorkflowSDK`, `COMPILER_EXAMPLES` |
| `__fixtures__/w01-w38/` | Test fixtures (real workflow patterns, w18-w22 sub-functions, w23-w24 try/catch, w25 CRUD+branching, w26 loop+sub-fn, w27 loop+try/catch, w28 else-if+numeric, w29 try+switch, w30 multi-trigger independent, w31 Promise.all, w32 app trigger, w33 wait-time, w34 wait-webhook, w35 wait-form, w36 wait-webhook-simple, w37 wait-in-webhook-flow, w38 wait-form-no-callback) |

**Decompile pipeline (in `src/codegen/`):**

| File | Role in decompile |
|------|-------------------|
| `parse-workflow-code.ts` | SDK TypeScript -> WorkflowJSON |
| `semantic-graph.ts` | WorkflowJSON -> SemanticGraph (nodes + edges) |
| `graph-annotator.ts` | Adds trigger/error markers to graph |
| `composite-builder.ts` | SemanticGraph -> CompositeTree (abstract chain/ifElse/switchCase) |
| `simplified-generator.ts` | CompositeTree -> simplified JS string |

## Aggregate Code Node Architecture

See `docs/aggregate-nodes.md` for full details. After every HTTP call with an assigned variable, the compiler emits an aggregate Code node (`Collect <varName>`) that collects all items and defensively unwraps single-item responses. Uses `// @aggregate: <varName>` jsCode marker for decompiler detection. Variable kind `'aggregate'` behaves like `'code'` for expression resolution.

## Expression-Object Format for HTTP Bodies

When an HTTP POST/PUT/PATCH body contains node references (e.g. `users.length` resolving to `$('Collect users').first().json.users.length`), the compiler wraps the entire `jsonBody` as a single expression: `={{ { "key": expr, ... } }}`. This is necessary because n8n's `jsonBody` parameter only evaluates expressions when the value starts with `=` (expression mode).

The `jsonBodyToExpression()` function recursively converts the parsed JSON body, unwrapping `={{ }}` expressions at any nesting depth into raw JS expressions within the outer `={{ { ... } }}` wrapper. The decompiler's `formatJsonBody()` reverses this using placeholder-based JSON parsing — `$('...')` expressions are replaced with JSON-safe placeholders, the result is parsed as JSON, then placeholders are restored as `={{ expr }}` strings.

## Promise.all (Parallel Execution)

`const [a, b] = await Promise.all([http.get(...), http.get(...)])` compiles to:

1. **Fan-out connections**: Source node → multiple HTTP nodes in parallel (via separate `.to()` calls from the same node)
2. **Per-branch aggregates**: Each HTTP node gets its own aggregate Code node (reuses existing `// @aggregate:` pattern)
3. **Merge node**: A `n8n-nodes-base.merge` node (mode `append`, `numberInputs: N`) that waits for all branches to complete. Each aggregate connects to a separate input slot (`agg1.to(merge1.input(0))`, `agg2.to(merge1.input(1))`)
4. **Collect node**: A Code node with `// @parallel-collect: a, b` marker that references all aggregate outputs and returns them as a single object. Connected after the Merge node.
5. **Chain splitting**: The main `.add()` chain is split at parallel boundaries to avoid direct source→collect connections. Parallel connections are emitted as separate statements after the chain.

**Why Merge is required**: n8n only waits for multiple inputs when a node has multiple input slots (`main[0]`, `main[1]`). Multiple connections to the same slot (`main[0]`) fire the downstream node on the first arrival. The Merge node provides proper multi-input waiting.

**Decompiler detection**: The `// @parallel-collect:` jsCode prefix on a Code node signals a fan-out convergence point. The decompiler searches `deferredMergeDownstreams` (since the composite builder treats Merge nodes as deferred) and reconstructs the `Promise.all([...])` syntax.

**Constraints**: Destructuring is required (`const [a, b] = ...`). Each array element must be an IO call (`http.get/post/...`). The collect node maps each variable to `varSourceKind: 'code'` for expression resolution.

## App Trigger Registry (`onTrigger`)

Generic app triggers via `onTrigger('serviceName', options, callback)`. Unlike `onManual/onWebhook/onSchedule/onError` which have specialized parameter mappings, app trigger parameters pass through directly to the node — no custom mapping per service.

**DSL syntax:**
```javascript
onTrigger('jira', {
  events: ['jira:issue_created'],
  credential: 'My Jira Account',
}, async () => { ... });
```

**How it works:**
1. `findCallbacks()` detects `onTrigger` calls, extracts service name from arg[0], options from arg[1], callback from arg[2]
2. Service name is looked up in `APP_TRIGGER_REGISTRY` (in `trigger-mapping.ts`) to get nodeType, version, credentialTypes
3. `credential` key is extracted from options and emitted as node credentials config using the appropriate credential type
4. `credentialType` key (optional) selects a non-default credential type (e.g. `'githubOAuth2Api'` instead of `'githubApi'`)
5. Remaining options are passed through directly as node parameters
6. Callback params are seeded into `varSourceMap` (same as webhook `{ body }`)

**Credential type selection:** Each registry entry has `credentialTypes: string[]` listing all valid credential keys (first = default). User can specify `credentialType` in options to pick a non-default one. The decompiler only emits `credentialType` when it differs from the default.

**Registry** (in `trigger-mapping.ts`): jira, github, gitlab, slack, telegram, stripe, typeform, airtable, hubspot, linear. Easily extensible — add entries to `APP_TRIGGER_REGISTRY`.

**Decompiler**: `NODE_TYPE_TO_APP_TRIGGER` reverse lookup detects app trigger nodes. `emitTriggerHeader()` reconstructs `onTrigger('serviceName', { ...params, credential }, ...)` from the node's parameters and credentials.

## Wait Node (`n8n-nodes-base.wait` v1.1)

Five DSL functions map to the Wait node with different `resume` modes:

| DSL Function | Resume Mode | Callback? | Expression Override |
|---|---|---|---|
| `await wait('5s')` | `timeInterval` | No | — |
| `setTimeout(callback, ms)` | `timeInterval` | Yes (body emitted AFTER wait) | — |
| `await waitUntil('2024-12-25T00:00:00Z')` | `specificTime` | No | — |
| `await waitForWebhook(callback?)` | `webhook` | Yes (body emitted BEFORE wait) | `resumeUrl` → `$execution.resumeUrl` |
| `await waitForForm(config, callback?)` | `form` | Yes (body emitted BEFORE wait) | `formUrl` → `$execution.resumeFormUrl` |

**Callback semantics**: `setTimeout` emits wait THEN body (like native JS). `waitForWebhook`/`waitForForm` emit body THEN wait (setup runs before pause, e.g. send callback URL to external service).

**Expression overrides**: Callback parameters (`resumeUrl`, `formUrl`) are mapped to n8n execution expressions via sentinel values in `varSourceMap` (`__execution_resumeUrl__`, `__execution_resumeFormUrl__`). These are intercepted in `resolveExpressionFromAST()` and `resolveJsonRefs()`.

**Duration parsing**: `wait('5s')` → regex `/^(\d+)\s*(s|m|h|d)$/` → `{ amount, unit }`. `setTimeout(cb, ms)` → convert ms to best unit (days > hours > minutes > seconds).

**Variable assignment**: `const data = await waitForWebhook()` emits an aggregate Code node after the Wait node (same pattern as HTTP). Time-based waits don't support assignment.

**Decompiler**: `emitWaitNode()` in `simplified-generator.ts` dispatches by `resume` param. Time-based → `await wait('5s')`. Specific time → `await waitUntil(...)`. Webhook/form → simple `await waitForWebhook()`/`await waitForForm({...})`. The callback is not reconstructed in the decompiler (round-trip produces linear code).

## Supported Language Features

| Category | DSL Syntax | Compiles To |
|----------|-----------|-------------|
| **Imports** | `import { onManual } from '@n8n/sdk'` | Silently ignored (DSL is compiled, not executed) |
| **Triggers** | `onManual()`, `onWebhook()`, `onSchedule()`, `onError()` | Trigger nodes |
| **App Triggers** | `onTrigger('jira', { events: [...], credential: 'Name' }, cb)` | App-specific trigger nodes (jira, github, slack, etc.) via `APP_TRIGGER_REGISTRY` |
| **HTTP** | `await http.get/post/put/patch/delete(url, body?, options?)` | httpRequest node |
| **AI** | `await new Agent({ prompt, model: new OpenAiModel({...}) }).chat()` | Agent node + subnodes (passthrough params) |
| **Sub-workflows** | `await workflow.run(name)` | executeWorkflow node |
| **Respond** | `respond({ status, body, headers })` | respondToWebhook node |
| **If/else** | `if (cond) { ... } else { ... }` | ifElse node with branches |
| **Switch** | `switch (expr) { case: ... }` | switchCase node |
| **Loops** | `for (const x of items) { ... }` | Splitter Code + aggregate |
| **Try/catch** | `try { ... } catch { ... }` | onError behavior on nodes |
| **Promise.all** | `const [a, b] = await Promise.all([http.get(...), ...])` | Fan-out HTTP nodes + Merge + collect Code node |
| **Sub-functions** | `async function fn(params) { ... }` then `await fn(args)` | Execute Workflow node with inline `workflowJson` |
| **Variables** | `const x = "value"` | Set node (static assignments) |
| **Code** | Any other JS statements | Code node with `jsCode` |
| **Credentials** | `{ auth: { type: 'bearer', credential: 'My Key' } }` | Node credentials config |
| **Wait (time)** | `await wait('5s')`, `setTimeout(cb, 5000)` | Wait node (`resume: 'timeInterval'`) |
| **Wait (specific time)** | `await waitUntil('2024-12-25T00:00:00Z')` | Wait node (`resume: 'specificTime'`) |
| **Wait (webhook)** | `await waitForWebhook(cb?)` | Wait node (`resume: 'webhook'`), callback body emitted BEFORE wait |
| **Wait (form)** | `await waitForForm(config, cb?)` | Wait node (`resume: 'form'`), callback body emitted BEFORE wait |
| **Pin Data** | `/** @example [{ id: 1 }] */` before IO call or trigger | `config.pinData` on node |

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

# Run execution tests (also regenerates report.html)
pushd packages/@n8n/workflow-sdk && pnpm test execution.test.ts && popd

# Run decompiler debug tests
pushd packages/@n8n/workflow-sdk && pnpm test decompiler-debug.test.ts && popd

# Generate HTML fixture report
# (via generate-report.ts — produced by both compiler.test.ts and execution.test.ts afterAll)
```

## Conventions

- **Node variable naming**: `t0` (trigger), `http1`, `code1`, `if1`, `switch1`, `set1`, `agg1`, `respond1`, `wait1`, `wf1`
- **No n8n expressions in DSL**: plain JS variables only — compiler resolves to `={{ $('NodeName').first().json.path }}`
- **Never use `$json` in generated expressions**: always use explicit `$('NodeName').first().json.prop` references. This ensures expressions are unambiguous and don't depend on predecessor ordering.
- **`executeOnce: true`** on all non-trigger nodes (single-item semantics)
- **Node variable naming for Promise.all**: `merge1`, `merge2`, ... for Merge nodes; `collect1`, `collect2`, ... for collect parallel Code nodes
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

## Execution Test Architecture

Execution tests (`execution.test.ts`) compile fixtures, parse to WorkflowJSON, extract pin data, set up nock interceptors, and execute the workflow using a lightweight mock execution environment in `execution-utils.ts`.

### Report Generation

Both `compiler.test.ts` and `execution.test.ts` call `generateReport()` in their `afterAll` hooks. The execution tests write per-fixture results to `__fixtures__/execution-data.json`, which the report generator reads to render execution status, node outputs, nock traces, and expectation diffs in `__fixtures__/report.html`.

### Mock additionalData (execution-utils.ts)

`buildAdditionalData()` uses a `Proxy` to provide a minimal `IWorkflowExecuteAdditionalData`. Key mocked properties:

| Property | What it mocks |
|----------|---------------|
| `credentialsHelper` | `MockCredentialsHelper` — returns static credential data |
| `ssrfBridge` | Permits all URLs (no SSRF protection in tests). Must implement `SsrfBridge` interface from `packages/core/src/execution-engine/index.ts` with `Result` type `{ ok: true, result: T }` (NOT `value`) |
| `startRunnerTask` | Executes Code node JS in a `new Function` sandbox with `$`, `$input`, `$json` |
| `executeWorkflow` | Delegates to `executeSubWorkflow()` for inline sub-workflow execution |
| `getRunExecutionData` | Looks up sub-workflow run data by execution ID |

**Gotcha — Proxy default**: Any property NOT in overrides returns `() => undefined`. If a new node type accesses a new `additionalData` property, it will silently get a no-op function. Always check the Proxy when debugging mysterious `undefined` or "is not a function" errors.

### Mock Task Runner (`mockStartRunnerTask`)

Code nodes execute JS via `additionalData.startRunnerTask()`. The mock provides:
- **`$(nodeName)`** — reads from `runExecutionData.resultData.runData[nodeName]`, returns `.all()`, `.first()`, `.last()`, `.item(i)`, `.isExecuted`
- **`$input`** — reads from `connectionInputData`, returns `.all()`, `.first()`, `.last()`, `.item(i)`, `.length`
- **`$json`** — shorthand for first input item's `.json`
- Code is wrapped in `(async () => { <code> })()` so `return` statements work

**Limitations**: The mock doesn't support `$evaluateExpression`, `$getWorkflowStaticData`, `require()`, `$env`, binary data helpers, or RPC methods. Fixtures needing these will fail execution tests.

### Fixture nock setup

Fixtures with HTTP calls can provide a `nock.ts` file exporting `setupNock(): nock.Scope[]`. When present, the test strips HTTP node pin data (so real HTTP calls go through nock) and tracks request/response data for expectation matching.

## Coverage Status

- **Round-trip**: 38/38 fixtures pass (100%)
- **Schema validation**: 37/38 fixtures pass. `KNOWN_SCHEMA_VIOLATIONS` has W35 (Wait node form fieldType schema).

**Key insight**: Nested sub-workflow WorkflowBuilder references (e.g., `workflowJson: __tryCatch_1Workflow` inside a loop body sub-workflow) are handled automatically by `resolveWorkflowBuilderValues()` in `json-serializer.ts`. It duck-types WorkflowBuilder instances (`toJSON` + `add` methods) at any nesting depth and converts them to `JSON.stringify(value.toJSON())`.

## Detailed Documentation

Deep-dive architecture docs live in `docs/` — read on demand when working on specific areas:

| File | Topic |
|------|-------|
| `docs/sub-functions.md` | Sub-function compiler/decompiler architecture (Execute Workflow with inline workflowJson) |
| `docs/loop-sub-workflows.md` | Loop body sub-workflow wrapping (three-way branching, item multiplication prevention) |
| `docs/try-catch.md` | Try/catch error connections (`main[1]` vs `error`, three-case strategy) |
| `docs/shared-pipeline.md` | Multiple triggers sharing a single chain (detection, inlining, decompiler) |
| `docs/pin-data.md` | `@example` JSDoc annotations for pin data (compiler + decompiler + comment scoping) |
| `docs/ai-dsl.md` | Class-based AI DSL (registry, Agent sugar, subnode passthrough, gotchas) |
| `docs/dynamic-urls.md` | BinaryExpression URL resolution (lazy resolution timing, decompiler splitOnPlus) |
| `docs/execution-tests.md` | Execution test harness (task runner, nock mocking, expectations, credentials) |
| `docs/round-trip-fixes.md` | W25/W26/W27 historical bug fixes |

## Updating This Document

**Every new session working on the simplified-compiler MUST update this CLAUDE.md (or the relevant `docs/*.md` file) with learnings before finishing.** This is a living document.

What to add:
- New language features or node types supported
- Edge cases discovered and how they're handled
- Design decisions made and their rationale
- Gotchas or pitfalls encountered
- Changes to conventions or architecture

Do not let knowledge die in a single session. If you learned it, write it here.
