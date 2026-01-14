# Evaluations (v2 harness)

Internal evaluation harness for the AI Workflow Builder. Supports local CLI runs and LangSmith-backed runs, using the same evaluators.

## Quick Start

Run from the package directory:

```bash
pushd packages/@n8n/ai-workflow-builder.ee

# Local: run against default prompts (fixtures/default-prompts.csv)
pnpm eval --verbose

# Local: single prompt
pnpm eval --prompt "Create a workflow that..." --verbose

# Local: custom CSV file
pnpm eval --prompts-csv path/to/prompts.csv --verbose

# Local: pairwise + programmatic
pnpm eval:pairwise --prompt "Create a workflow that..." --dos "Must use Slack" --donts "No HTTP Request node" --verbose

# LangSmith: LLM-judge + programmatic
pnpm eval:langsmith --dataset "workflow-builder-canvas-prompts" --name "my-exp" --concurrency 10 --max-examples 20 --verbose

# LangSmith: pairwise + programmatic
pnpm eval:pairwise:langsmith --dataset "notion-pairwise-workflows" --name "pairwise-exp" --filter "technique:content_generation" --max-examples 50 --verbose

popd
```

## Prerequisites

- **LLM key** (required for generation and any LLM-based evaluators):
  - `N8N_AI_ANTHROPIC_KEY` (see `evaluations/support/environment.ts`)
- **Node definitions** (required for workflow generation, and used by evaluators):
  - `evaluations/.data/nodes.json` (see `evaluations/support/load-nodes.ts`)
  - Optional: `N8N_EVALS_DISABLED_NODES="n8n-nodes-base.httpRequest,..."` to exclude specific nodes from generation.
- **LangSmith** (only for `--backend langsmith` runs):
  - `LANGSMITH_API_KEY`
  - `LANGSMITH_TRACING=true` (the harness sets this in LangSmith mode, but exporting it is fine)
  - Optional: `LANGSMITH_MINIMAL_TRACING=false` to disable trace filtering (useful when debugging traces; default is filtered)

## Mental Model

```mermaid
flowchart TB
    subgraph Config["runEvaluation(config)"]
        direction LR
        C1["mode: 'local' | 'langsmith'"]
        C2["dataset: TestCase[] | string"]
        C3["generateWorkflow: (prompt) => workflow"]
        C4["evaluators: Evaluator[]"]
    end

    Config --> Loop

    subgraph Loop["For each test case"]
        G["1. generateWorkflow(prompt)"]
        E["2. evaluateWithPlugins (parallel)"]
        A["3. Aggregate feedback"]
        G --> E --> A
    end

    Loop --> Evaluators

    subgraph Evaluators["Evaluators (run in parallel)"]
        direction LR
        LLM["LLM-Judge"]
        Pair["Pairwise"]
        Prog["Programmatic"]
    end

    Evaluators --> Feedback

    subgraph Feedback["Feedback[]"]
        F1["evaluator: string"]
        F2["metric: string"]
        F3["score: 0-1"]
        F4["kind: 'score' | 'metric' | 'detail'"]
        F5["comment?: string"]
    end
```

## Key Concepts

### Evaluator

A function that takes a workflow and returns feedback:

```typescript
interface Evaluator<TContext = EvaluationContext> {
  name: string;
  evaluate(workflow: SimpleWorkflow, ctx: TContext): Promise<Feedback[]>;
}
```

Evaluators are:
- **Independent** - no dependencies between evaluators
- **Parallel** - all evaluators run concurrently
- **Error-tolerant** - if one fails, others continue

### Feedback

The universal output format from all evaluators:

```typescript
interface Feedback {
  evaluator: string; // e.g., "llm-judge", "pairwise"
  metric: string;    // e.g., "functionality", "judge1", "efficiency.nodeCountEfficiency"
  score: number;    // 0.0 to 1.0
  comment?: string; // Optional explanation/violations
  kind: 'score' | 'metric' | 'detail';
}
```

`kind` is used by the harness scoring logic:
- `score`: the evaluator’s single overall score (preferred for scoring)
- `metric`: stable per-category metrics (useful to show, but not necessarily used for scoring if a `score` exists)
- `detail`: verbose/unstable metrics and details (never used for scoring when a `score` is present)

### Lifecycle Hooks

Centralized logging via hooks (not per-evaluator logging):

```typescript
interface EvaluationLifecycle {
  onStart(config): void;
  onExampleStart(index, total, prompt): void;
  onWorkflowGenerated(workflow, durationMs): void;
  onEvaluatorComplete(name, feedback): void;
  onEvaluatorError(name, error): void;
  onExampleComplete(index, result): void;
  onEnd(summary): void;
}
```

### Context

Evaluators receive context from multiple sources:

```
globalContext (from RunConfig.context)
       +
testCase.context (per-test-case overrides)
       +
prompt (always included)
       =
Final context passed to evaluators
```

## Local vs LangSmith Mode

### Local Mode

```typescript
import { createLogger } from './harness/logger';

const logger = createLogger(true); // verbose output

const config: RunConfig = {
  mode: 'local',
  dataset: [
    { prompt: 'Create a workflow...', context: { dos: '...' } },
  ],
  generateWorkflow,
  evaluators: [llmJudge, programmatic],
  lifecycle: createConsoleLifecycle({ verbose: true, logger }),
  logger,
};

await runEvaluation(config);
```

- Processes test cases sequentially (examples), but LLM-bound work is capped via `llmCallLimiter` (see `evaluations/harness/runner.ts`)
- Results logged to console via lifecycle hooks
- The harness returns a `RunSummary`; the CLI decides exit codes

### LangSmith Mode

```typescript
import { createLogger } from './harness/logger';

const logger = createLogger(false); // non-verbose output

const config: RunConfig = {
  mode: 'langsmith',
  dataset: 'my-dataset-name',  // LangSmith dataset
  generateWorkflow,
  evaluators: [llmJudge, programmatic],
  logger,
  langsmithOptions: {
    experimentName: 'experiment-1',
    repetitions: 1,
    concurrency: 4,
  },
};

await runEvaluation(config);
```

If you want *no output* (e.g. unit tests), use `createQuietLifecycle()` (or pass a stub logger) instead of relying on a "silent logger".

**Architecture:** The target function does ALL work (generation + evaluation). The LangSmith evaluator just extracts pre-computed feedback.
The runner flushes pending trace batches before returning, so traces/results reliably show up in LangSmith.

```typescript
// Inside runLangsmith():
// IMPORTANT: Do NOT wrap target with traceable() - see "LangSmith Tracing" section below
const target = async (inputs) => {
  // Wrap inner operations with traceable() for child traces
  const traceableGenerate = traceable(
    async () => await generateWorkflow(prompt),
    { name: 'workflow_generation', run_type: 'chain', client: lsClient }
  );
  const workflow = await traceableGenerate();
  const feedback = await evaluateWithPlugins(workflow, evaluators);
  return { workflow, prompt, feedback };  // Pre-computed!
};

	// LangSmith evaluator converts internal `{ evaluator, metric }` into `{ key, score, comment? }`:
	const feedbackExtractor = (run) => run.outputs.feedback.map(toLangsmithEvaluationResult);
```

## LangSmith Tracing (Critical)

Do this in LangSmith mode:

1. **Do not** wrap the top-level `target` with `traceable()` — `evaluate()` will wrap it and wire up the run correctly.
2. **Do** wrap inner operations with `traceable()` for child traces, and pass `client: lsClient` so child runs attach to the same project/run tree.

## Available Evaluators

### LLM-Judge

Uses an LLM to evaluate workflow quality across multiple dimensions:

```typescript
import { createLLMJudgeEvaluator } from './evaluators';

const evaluator = createLLMJudgeEvaluator(llm, nodeTypes);
```

**Evaluator:** `llm-judge`

**Metrics:** `functionality`, `connections`, `expressions`, `nodeConfiguration`, `efficiency`, `dataFlow`, `maintainability`, `overallScore`

**Context required:** `{ prompt: string }`

### Pairwise

Uses a panel of judges to evaluate against dos/donts criteria:

```typescript
import { createPairwiseEvaluator } from './evaluators';

const evaluator = createPairwiseEvaluator(llm, { numJudges: 3 });
```

**Evaluator:** `pairwise`

**Metrics (v1-compatible):**
- Single-gen: `pairwise_primary`, `pairwise_diagnostic`, `pairwise_judges_passed`, `pairwise_total_passes`, `pairwise_total_violations`
- Multi-gen: `pairwise_generation_correctness`, `pairwise_aggregated_diagnostic`, `pairwise_generations_passed`, `pairwise_total_judge_calls`

Additional per-judge/per-generation details may also be emitted (e.g. `judge1`, `gen1.majorityPass`).

**Context required:** `{ dos?: string, donts?: string }`

### Programmatic

Rule-based checks without LLM calls:

```typescript
import { createProgrammaticEvaluator } from './evaluators';

const evaluator = createProgrammaticEvaluator(nodeTypes);
```

**Evaluator:** `programmatic`

**Metrics:** `overall`, `connections`, `trigger`, `agentPrompt`, `tools`, `fromAi` (optional: `similarity`)

**Context required:** None

## Metric Naming (LangSmith compatibility)

LangSmith metric keys are derived from `Feedback` in `evaluations/harness/feedback.ts`:
- `llm-judge`: **unprefixed** (e.g. `overallScore`, `maintainability.workflowOrganization`)
- `programmatic`: **prefixed** (e.g. `programmatic.trigger`)
- `pairwise`: v1-compatible keys stay **unprefixed** (e.g. `pairwise_primary`); non-v1 details are namespaced (e.g. `pairwise.judge1`)

## CLI Usage

### NPM Scripts

```bash
# Local mode with LLM-judge evaluator
pnpm eval --prompt "Create a workflow..." --verbose

# LangSmith mode (results in LangSmith dashboard)
pnpm eval:langsmith --name "my-experiment" --verbose

# Pairwise mode (local)
pnpm eval:pairwise --prompt "..." --dos "Must use Slack" --donts "No HTTP"

# Pairwise mode with LangSmith
pnpm eval:pairwise:langsmith --name "pairwise-exp" --verbose
```

Notes:
- In `--backend langsmith` mode, the CLI requires `--dataset` and rejects `--prompt`, `--prompts-csv`, and `--test-case`.
- `--output-dir` only applies to local mode (it writes artifacts to disk).

### Common Flags

```bash
--suite <llm-judge|pairwise|programmatic|similarity>
--backend <local|langsmith>   # Or `--langsmith` as a shortcut
--verbose, -v       # Enable verbose output
--name <name>       # Experiment name (LangSmith mode)
--dataset <name>    # LangSmith dataset name
--max-examples <n>  # Limit number of examples to evaluate
--concurrency <n>   # Max concurrent evaluations (default: 5)
--repetitions <n>   # Number of repetitions per example
--test-case <id>    # Run a predefined test case (local)
--prompts-csv <path># Load prompts from CSV (local)
--prompt <text>     # Single prompt for local testing
--dos <text>        # Pairwise: things the workflow should do
--donts <text>      # Pairwise: things the workflow should not do
--output-dir <dir>  # Local mode: write artifacts (one folder per example + summary.json)
--template-examples # Enable template examples feature flag
```

### CSV Format

`--prompts-csv` supports optional headers. Recognized columns:
- `prompt` (required)
- `id` (optional)
- `dos` / `do` (optional)
- `donts` / `dont` (optional)

Example:

```csv
id,prompt,dos,donts
pw-001,"Create a workflow to sync Gmail to Notion","Must use Notion","No HTTP Request node"
```

### Direct Usage

```bash
# Local mode (default)
tsx evaluations/cli/index.ts --prompt "Create a workflow..." --verbose

# LangSmith mode
tsx evaluations/cli/index.ts --backend langsmith --name "my-experiment" --verbose

# Pairwise mode
tsx evaluations/cli/index.ts --suite pairwise --prompt "..." --dos "Must use Slack"
```

## Components & Where Things Live

This directory is intentionally split by responsibility:

- `evaluations/cli/`: CLI entrypoint and input parsing (`cli/index.ts`, `cli/argument-parser.ts`, `cli/csv-prompt-loader.ts`)
- `evaluations/harness/`: orchestration, scoring, logging, and artifact writing (`harness/runner.ts`, `harness/lifecycle.ts`, `harness/score-calculator.ts`, `harness/output.ts`)
- `evaluations/evaluators/`: evaluator factories used by the harness (LLM-judge, pairwise, programmatic, similarity)
- `evaluations/judge/`: the LLM-judge “engine” (schemas + category evaluators + `judge/workflow-evaluator.ts`)
- `evaluations/langsmith/`: LangSmith-specific helpers (`langsmith/trace-filters.ts`, `langsmith/types.ts`)
- `evaluations/support/`: environment setup, node loading, report generation, and test-case generation
- `evaluations/programmatic/`: programmatic evaluator implementation (TypeScript) + `programmatic/python/` (kept separate)

## Extending

### Adding a new evaluator

Add an evaluator by implementing the `Evaluator` interface and returning `Feedback[]`:
- Put evaluator factories under `evaluations/evaluators/<name>/`
- Make sure you emit at least one `kind: 'score'` item (the harness scoring prefers this)
- If you need custom context, extend via `Evaluator<MyContext>` and validate required fields at runtime (keep the base context cast-free)
- If you want stable LangSmith keys, update `evaluations/harness/feedback.ts`

### Adding a new “runner” (backend)

The harness runner is `evaluations/harness/runner.ts`. Today it supports:
- `mode: 'local'` (local dataset array + optional artifacts)
- `mode: 'langsmith'` (LangSmith dataset or preloaded examples)

To add a new backend, keep evaluators backend-agnostic and extend the runner with a new `RunConfig['mode']` branch.

## File Structure

```
evaluations/
├── __tests__/               # Unit tests
├── cli/                     # CLI entry + arg parsing + CSV loader
├── evaluators/              # Evaluator factories
│   ├── llm-judge/
│   ├── pairwise/
│   ├── programmatic/
│   └── similarity/
├── harness/                 # Runner + lifecycle + scoring + artifacts
├── fixtures/                # Local fixtures (tracked)
│   └── reference-workflows/
├── judge/                   # LLM-judge internals (schemas + judge evaluators)
├── langsmith/               # LangSmith-specific helpers (types + trace filters)
├── programmatic/            # Programmatic evaluation logic
├── support/                 # Environment + node loading + reports + test case gen
├── index.ts                 # Public exports
└── README.md                # This file
```

## Error Handling

The harness uses "skip and continue" error handling:

- If an evaluator throws, it returns error feedback and continues
- If workflow generation fails, the example is marked as error and continues
- Other evaluators still run even if one fails

```typescript
// Error feedback format:
{ evaluator: 'evaluator-name', metric: 'error', score: 0, kind: 'score', comment: 'Error message' }
```

## Testing

From `packages/@n8n/ai-workflow-builder.ee`:

```bash
pnpm test:eval
```
