# @n8n/workflow-sdk

TypeScript SDK for programmatic n8n workflow creation. Used by the AI code builder agent to generate workflows from natural language prompts.

## Code Formats

| | SDK | Data-flow (preferred for LLMs) |
|---|---|---|
| Style | Fluent builder chain: `.to()`, `.onTrue()`, `.onFalse()` | Native TypeScript: `if/else`, `switch/case`, `try/catch` |
| Generate | `generateWorkflowCode(json)` | `generateDataFlowWorkflowCode(json)` |
| Parse | `parseWorkflowCode(code)` | `parseDataFlowCode(code)` |
| Source | `src/codegen/code-generator.ts` | `src/codegen/dataflow/dataflow-generator.ts` |
| Parser | `src/codegen/parse-workflow-code.ts` | `src/codegen/dataflow/dataflow-parser.ts` |

Data-flow is preferred because LLMs already know TypeScript control flow — no custom DSL to learn.

## Data-Flow DSL Primitives

- `workflow({ name }, callback)` — top-level wrapper
- `onTrigger({ type, params, version }, (items) => ...)` — trigger entry point
- `node({ type, name?, params, version, subnodes? })(input)` — create node, returns output variable
- `items.map((item) => node({ ... })(items))` — per-item execution (`.map()` wrapping)
- `import { $now, $today, ... } from 'n8n'` — import n8n expression globals for use as bare identifiers (stripped during parsing)
- `$now.toISO()`, `$today`, `$execution.id` — n8n globals used directly (instead of `expr('{{ $now.toISO() }}')`)
- `expr('{{ complex expression }}')` — wrap complex n8n expressions that can't be represented as simple identifiers
- `item.json.field` — direct field access inside `.map()` callbacks
- `items.map((item) => { if (item.json.field === value) { ... } else { ... } })` → IF node branching (per-item)
- `items.map((item) => { switch (item.json.field) { ... } })` → Switch node routing (per-item)
- Native `try { ... } catch (e) { ... }` → error handling (continueErrorOutput)
- `items.filter((item) => condition)` → Filter node (per-item: `item.json`)
- `batch(source, config?, (item) => { ... })` — batch processing via SplitInBatches. Config: `{ params?: { batchSize }, version?, name? }`. Omitted when all defaults (batchSize 1, version 3, auto name).
- `const [out0, out1, out2] = node({ ... })(input)` — multi-output destructuring
- `subnodes: { ai_languageModel: { type, params, version } }` — AI sub-connections
- **Note:** `for`, `while`, `do...while` loops are forbidden outside code nodes — use `batch()` instead

See `src/codegen/dataflow/__fixtures__/f01-f23/` for full examples of each pattern.

## Architecture

### JSON → Code (generation)

```
WorkflowJSON → Semantic Graph → Graph Annotator → Composite Tree → Code
```

1. **Semantic graph** (`semantic-graph.ts`): index-based connections → named edges
2. **Graph annotator** (`graph-annotator.ts`): detect cycles and convergence
3. **Composite builder** (`composite-builder.ts`): group into tree (chain, ifElse, switchCase, filter, merge, loop, fanOut, multiOutput)
4. **Code generator**: emit format-specific code from composite tree

### Code → JSON (parsing)

- **Data-flow**: Acorn AST parser with static walking (`dataflow-parser.ts`)
- **SDK**: custom AST interpreter (`parse-workflow-code.ts`)

### executeOnce Semantics

The `executeOnce` flag on `NodeJSON` distinguishes per-item vs execute-once nodes:

- **Per-item** (default, `executeOnce` unset): node runs once per item. Code uses `.map()`: `items.map((item) => executeNode(...))`
- **Execute-once** (`executeOnce: true`): node runs once for all items. Code uses direct call: `executeNode(...)`

**Parser** (`dataflow-parser.ts`): tracks `branchDepth` counter in state. Only sets `executeOnce = true` when a direct `executeNode()` call is at top-level (`branchDepth === 0`). Inside `if/else`, `switch/case`, or `try/catch` blocks, `branchDepth > 0` so `executeOnce` is never set — branch nodes always use the parent's execution mode.

**Generator** (`dataflow-generator.ts`): uses `insideBranch` flag in context. Emits `.map()` wrapping only when `!node.json.executeOnce && !ctx.insideBranch`. Inside branches and error handlers, `insideBranch = true` suppresses `.map()` to avoid double-wrapping.

### Filter vs IF Node

Both use the same V2 conditions parameter format, but serve different purposes:

- **IF node** (`n8n-nodes-base.if`): branches workflow into two paths. Data-flow: `.map()` with `if/else` block. Outputs: `trueBranch`/`falseBranch`.
- **Filter node** (`n8n-nodes-base.filter`): filters items matching a condition (pass-through). Data-flow: `.filter()` call. Outputs: `kept`/`discarded`.

Key difference in code generation: Filter's kept branch is a **continuation** (downstream nodes keep `.map()` wrapping), not a **branch** (`insideBranch` stays false). This prevents round-trip issues where downstream nodes would incorrectly get `executeOnce: true`.

In the SDK format, both use `.onTrue()`/`.onFalse()` — the `isIfNodeType()` guard accepts both types.

### Adding a New Composite Node Type

**CRITICAL: Always use TDD.** Write failing tests first (parser test, generator test, round-trip test), then implement. This applies both during planning (plan which tests to write) and implementation (write tests before production code).

To add a new composite (like Filter was added alongside IF), touch these files in order:

1. **`semantic-registry.ts`**: add to `CompositeType` union, register in `NODE_SEMANTICS` with outputs/inputs/composite
2. **`composite-tree.ts`**: add interface (e.g. `FilterCompositeNode`), add to `CompositeNode` union
3. **`composite-builder.ts`**: add `buildXxx()` function + `case` in switch + `case` in `getDownstreamTargetName`
4. **`dataflow-parser.ts`**: add/update parsing pattern to produce the new node type
5. **`dataflow-generator.ts`**: add `generateXxxNode()` + `case` in `generateCompositeNode` switch
6. **`code-generator.ts`**: add `generateXxxSDK()` + `case` in `generateComposite` + `case` in `collectNestedMultiOutputs`
7. **`constants/node-types.ts`**: add constant + type guard if needed

Tests to add/update for each layer: `node-types.test.ts`, `semantic-registry.test.ts`, `composite-builder.test.ts`, `code-generator.test.ts`, `dataflow-generator.test.ts`, `dataflow-parser.test.ts`, `dataflow-roundtrip.test.ts`.

### Round-Trip Validation

The compiler test (`compiler.test.ts`) validates fixtures via JSON-level comparison, not code string comparison. This means formatting differences don't count as mismatches — only semantic differences (different nodes or connections) do. The report (`generate-report.ts`) shows ROUND-TRIP OK/MISMATCH badges based on this JSON equality check.

### Execution Tests & Fixture Expectations

The execution test (`execution.test.ts`) validates fixtures by actually executing the parsed workflow with pin data and nock HTTP mocks, then checking expectations.

**Fixture files** (all in `__fixtures__/<fixture-dir>/`):

| File | Purpose | Required |
|------|---------|----------|
| `meta.json` | `{ title, skip?, templateId? }` | Yes |
| `input.ts` | Data-flow code (the primary input) | Yes (unless `skip` set) |
| `input.json` | Reference WorkflowJSON for round-trip comparison | No |
| `nock.ts` | HTTP mocks — `export function setupNock(): nock.Scope[]` | No |
| `pin-data.json` | Simulated node outputs — `{ "Node Name": [{ ... }] }` | No |
| `expectations.json` | Expected requests + node outputs | No |

**When a fixture gets executed:** It must have at least one of: `pin-data.json`, `nock.ts`, or `outputSampleData` in the code. Fixtures with none of these are silently skipped by the execution test.

**Pin data strategy by node type:**
- **Triggers** (webhook, schedule, manual, form, chat, error): Always pin — they seed the workflow
- **Service nodes** (Google Sheets, Gmail, Telegram, Slack, etc.): Pin — no credentials in test
- **AI nodes** (Agent, OpenAI): Pin — no API keys in test
- **httpRequest nodes**: Use nock mocks instead (pin data is auto-stripped when nock is present via `stripHttpPinData()`)
- **Set/Code/Edit Fields/Merge/Filter nodes**: Do NOT pin — they execute naturally from upstream data

**expectations.json format:**
```json
{
  "requests": {
    "GET https://example.com/api": {},
    "POST https://example.com/api": { "requestBody": { "key": "val" } },
    "POST https://example.com/api#2": { "requestHeaders": { "authorization": "Bearer token" } }
  },
  "nodes": {
    "Node Name": { "items": [{ "field": "value" }] }
  }
}
```
- `requests`: keys are `"METHOD URL"`, optional `#N` suffix for Nth occurrence. `requestBody` uses exact match, `requestHeaders` uses partial match.
- `nodes`: `items` array uses partial match against node output at `outputIndex: 0`.

**Report generation order matters:** The HTML report (`report.html`) is generated by `compiler.test.ts` which reads `execution-data.json`. To get a report with fresh execution data, run execution tests first, then compiler tests:
```bash
pnpm jest execution.test.ts && pnpm jest compiler.test.ts
```

### Key Modules

- `src/codegen/code-generator.ts` — SDK format code generator
- `src/codegen/parse-workflow-code.ts` — SDK format parser
- `src/codegen/dataflow/` — data-flow format generator + parser
- `src/codegen/dataflow/compiler.test.ts` — round-trip fixture tests with HTML report
- `src/codegen/dataflow/execution.test.ts` — execution tests with pin data/nock/expectations
- `src/codegen/dataflow/expectation-matcher.ts` — request/node output matching for expectations
- `src/codegen/dataflow/execution-utils.ts` — `stripHttpPinData()` and execution helpers
- `src/codegen/dataflow/fixture-loader.ts` — loads fixture files from `__fixtures__/`
- `src/codegen/dataflow/generate-report.ts` — HTML report generator for fixture results
- `src/codegen/dataflow/compiler-types.ts` — shared types for compiler tests/report
- `src/codegen/composite-tree.ts` — intermediate tree representation
- `src/codegen/semantic-graph.ts` — named-edge connection graph
- `src/workflow-builder/` — fluent builder runtime API
- `src/validation/` — workflow schema validation
- `src/expression/` — expression parsing utilities

## Commands

```bash
pnpm build        # Build package
pnpm test         # Run all tests
pnpm typecheck    # Type check
```

## Checklist Evaluator

Tests the AI code builder agent with both formats against LLM-extracted checklists. Located in the sibling `@n8n/ai-workflow-builder` package.

```bash
cd packages/@n8n/ai-workflow-builder.ee

# Run both formats (default)
pnpm eval:checklist --max-examples 4

# Single format
pnpm eval:checklist --format sdk --max-examples 2
pnpm eval:checklist --format dataflow --max-examples 2

# Filter by tags or substring
pnpm eval:checklist --tags webhook,agent --grep "onboarding"

# Regenerate report from saved runs
pnpm eval:checklist report
```

**Prerequisites:** `N8N_AI_ANTHROPIC_KEY` env var, workflow-sdk must be built, `pnpm export:nodes` run in ai-workflow-builder.ee.

**Output:** `evaluations/.data/checklist-report.html` — interactive HTML report with per-prompt scores, generated code, and checklist verification details.
