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
- `expr('{{ $json.field }}')` — wrap n8n expressions
- Native `if (items[0].json.field === value)` → IF node branching
- Native `switch (items[0].json.field)` → Switch node routing
- Native `try { ... } catch (e) { ... }` → error handling (continueErrorOutput)
- `const [out0, out1, out2] = node({ ... })(input)` — multi-output destructuring
- `subnodes: { ai_languageModel: { type, params, version } }` — AI sub-connections

See `src/codegen/dataflow/__fixtures__/f01-f08/` for full examples of each pattern.

## Architecture

### JSON → Code (generation)

```
WorkflowJSON → Semantic Graph → Graph Annotator → Composite Tree → Code
```

1. **Semantic graph** (`semantic-graph.ts`): index-based connections → named edges
2. **Graph annotator** (`graph-annotator.ts`): detect cycles and convergence
3. **Composite builder** (`composite-builder.ts`): group into tree (chain, ifElse, switchCase, merge, loop, fanOut, multiOutput)
4. **Code generator**: emit format-specific code from composite tree

### Code → JSON (parsing)

- **Data-flow**: Acorn AST parser with static walking (`dataflow-parser.ts`)
- **SDK**: custom AST interpreter (`parse-workflow-code.ts`)

### Key Modules

- `src/codegen/code-generator.ts` — SDK format code generator
- `src/codegen/parse-workflow-code.ts` — SDK format parser
- `src/codegen/dataflow/` — data-flow format generator + parser
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
