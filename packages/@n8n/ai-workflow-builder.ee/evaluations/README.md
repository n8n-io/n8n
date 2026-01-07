# Evaluation Harness

A factory-based, testable evaluation system for AI workflow generation.

## Mental Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           runEvaluation(config)                          │
│                                                                          │
│  Config contains:                                                        │
│  - mode: 'local' | 'langsmith'                                          │
│  - dataset: TestCase[] | string (LangSmith dataset name)                │
│  - generateWorkflow: (prompt) => workflow                               │
│  - evaluators: Evaluator[]                                              │
│  - lifecycle: hooks for logging                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        For each test case:                               │
│                                                                          │
│   1. generateWorkflow(prompt)  →  SimpleWorkflow                        │
│   2. evaluateWithPlugins(workflow, evaluators, context)                 │
│      └── runs all evaluators IN PARALLEL                                │
│   3. Aggregate feedback, determine pass/fail                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌──────────┐    ┌──────────┐    ┌──────────┐
             │LLM-Judge │    │Pairwise  │    │Program.  │
             │Evaluator │    │Evaluator │    │Evaluator │
             └──────────┘    └──────────┘    └──────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                           ┌──────────────┐
                           │  Feedback[]  │
                           │              │
                           │ evaluator: str│
                           │ metric: str   │
                           │ score: 0-1    │
                           │ kind?: str    │
                           │ comment?: str │
                           └──────────────┘
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
  kind?: 'score' | 'metric' | 'detail';
}
```

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
const config: RunConfig = {
  mode: 'local',
  dataset: [
    { prompt: 'Create a workflow...', context: { dos: '...' } },
  ],
  generateWorkflow,
  evaluators: [llmJudge, programmatic],
  lifecycle: createConsoleLifecycle({ verbose: true }),
};

await runEvaluation(config);
```

- Processes test cases sequentially
- Results logged to console
- Exit code based on pass rate

### LangSmith Mode

```typescript
const config: RunConfig = {
  mode: 'langsmith',
  dataset: 'my-dataset-name',  // LangSmith dataset
  generateWorkflow,
  evaluators: [llmJudge, programmatic],
		  langsmithOptions: {
		    experimentName: 'experiment-1',
		    repetitions: 1,
		    concurrency: 4,
		  },
		};

await runEvaluation(config);
```

**Architecture:** The target function does ALL work (generation + evaluation). The LangSmith evaluator just extracts pre-computed feedback.

```typescript
// Inside runLangsmith():
// IMPORTANT: Do NOT wrap target with traceable() - see "LangSmith Tracing" section below
const target = async (inputs) => {
  // Wrap inner operations with traceable() for child traces
  const traceableGenerate = traceable(
    async () => await generateWorkflow(prompt),
    { name: 'workflow_generation', run_type: 'chain' }
  );
  const workflow = await traceableGenerate();
  const feedback = await evaluateWithPlugins(workflow, evaluators);
  return { workflow, prompt, feedback };  // Pre-computed!
};

	// LangSmith evaluator converts internal `{ evaluator, metric }` into `{ key, score, comment? }`:
	const feedbackExtractor = (run) => run.outputs.feedback.map(toLangsmithEvaluationResult);
```

## LangSmith Tracing (Critical)

### The Problem

When using LangSmith's `evaluate()` function with `traceable()`, there's a subtle but critical interaction that can cause issues like:
- Target function executing multiple times per example
- Infinite loops
- Missing traces

### Root Cause

The LangSmith SDK's `evaluate()` function internally checks if the target is already a traceable function:

```javascript
// From langsmith/dist/evaluation/_runner.js
const wrappedFn = isTraceableFunction(fn)
    ? fn  // Uses function AS-IS, without applying defaultOptions!
    : traceable(fn, defaultOptions);
```

When you pre-wrap your target with `traceable()`:
1. The SDK detects it via `isTraceableFunction()` (checks for `"langsmith:traceable"` property)
2. It uses your function **as-is** without applying its critical `defaultOptions`
3. `defaultOptions` contains essential configuration:
   - `on_end` callback (captures the run for linking to dataset example)
   - `reference_example_id` (links run to dataset example)
   - `client` (the properly configured LangSmith client)
   - `project_name` (experiment name)

Without these options, the SDK cannot properly track the run, leading to undefined behavior.

### The Solution

**DO NOT** wrap the target function with `traceable()`. Let `evaluate()` handle it automatically.

**DO** wrap inner operations (like workflow generation) with `traceable()` to create child traces.

```typescript
// ❌ WRONG - causes multiple executions or missing traces
const target = traceable(async (inputs) => {
  const workflow = await generateWorkflow(prompt);
  return { workflow };
}, { name: 'my_target' });

// ✅ CORRECT - let evaluate() wrap the target, wrap inner operations
const target = async (inputs) => {
  // This creates a child trace under the automatically-created parent
  const traceableGenerate = traceable(
    async () => await generateWorkflow(prompt),
    { name: 'workflow_generation', run_type: 'chain' }
  );
  const workflow = await traceableGenerate();
  return { workflow };
};

await evaluate(target, { data, evaluators, client });
```

### Harmonized Approach

All evaluation targets in this package follow the same pattern:
1. **Do NOT** wrap the target function with `traceable()`
2. **Do** wrap inner operations (workflow generation, judge panels) with `traceable()` for child traces
3. Let `evaluate()` handle target tracing automatically

This ensures consistent behavior and avoids the client mismatch issues that can occur when mixing `traceable()` with `evaluate()`.

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
--template-examples # Enable template examples feature flag
--multi-agent       # Enable multi-agent feature flag
```

### Direct Usage

```bash
# Local mode (default)
tsx evaluations/cli.ts --prompt "Create a workflow..." --verbose

# LangSmith mode
tsx evaluations/cli.ts --backend langsmith --name "my-experiment" --verbose

# Pairwise mode
tsx evaluations/cli.ts --suite pairwise --prompt "..." --dos "Must use Slack"
```

## Adding a New Evaluator

1. Create the evaluator factory in `evaluators/`:

```typescript
// evaluators/my-evaluator.ts
	export function createMyEvaluator(options): Evaluator<MyContext> {
	  return {
	    name: 'my-evaluator',
	    async evaluate(workflow, ctx) {
	      // Your evaluation logic
	      return [
	        { evaluator: 'my-evaluator', metric: 'score', score: 0.9, kind: 'score' },
	        { evaluator: 'my-evaluator', metric: 'detail', score: 0.8, kind: 'detail', comment: '...' },
	      ];
	    },
	  };
	}
```

2. Export from `evaluators/index.ts`

3. Add to CLI in `cli.ts`

4. Write tests in `__tests__/evaluators/`

## File Structure

```
evaluations/
├── __tests__/               # Unit tests
├── chains/                  # LLM evaluation chains
├── core/                    # Core utilities (environment, args, trace filters)
├── evaluators/              # Evaluator factories
│   ├── llm-judge/
│   ├── pairwise/
│   ├── programmatic/
│   └── similarity/
├── fixtures/                # Local fixtures (tracked)
│   └── reference-workflows/
├── programmatic/            # Programmatic evaluation logic
├── types/                   # Shared types
├── utils/                   # Shared utilities
├── cache-analyzer.ts        # LLM cache statistics
├── cli.ts                   # CLI entry point
├── constants.ts             # Shared constants
├── harness-types.ts         # Harness-specific types
├── index.ts                 # Public exports
├── lifecycle.ts             # Lifecycle hooks for logging
├── load-nodes.ts            # Node type loading
├── multi-gen.ts             # Multi-generation support
├── output.ts                # Artifact saving
├── report-generator.ts      # Markdown report generation
├── runner.ts                # Core runEvaluation()
├── score-calculator.ts      # Score aggregation
├── test-case-generator.ts   # Test case generation
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

## LangSmith SDK Tips & Gotchas

Additional findings from working with LangSmith SDK 0.4.x that may help future development:

### Environment Variables

```bash
LANGSMITH_TRACING=true      # Required for tracing to work (0.4.x)
LANGSMITH_API_KEY=ls_...    # Your API key
LANGSMITH_PROJECT=name      # Optional: default project for traces
LANGSMITH_MINIMAL_TRACING=false  # Set to disable trace filtering (default: true)
```

### Flushing Traces

Always call `awaitPendingTraceBatches()` before the process exits to ensure all traces are sent:

```typescript
await evaluate(target, options);
await client.awaitPendingTraceBatches();  // Don't forget this!
```

Without this, traces may be lost if the process exits before the background upload completes.

### Trace Filtering (Reducing Payload Size)

Large payloads can cause 403 errors. Use `hideInputs`/`hideOutputs` on the Client:

```typescript
const client = new Client({
  hideInputs: (inputs) => filterLargeFields(inputs),
  hideOutputs: (outputs) => filterLargeFields(outputs),
  batchSizeBytesLimit: 2_000_000,  // 2MB limit
  batchSizeLimit: 10,              // Max runs per batch
});
```

Our trace filtering achieves ~80% reduction in payload size by:
- Summarizing large arrays (messages, node types, templates)
- Truncating large string inputs
- Summarizing workflow JSON for large workflows

### numRepetitions Behavior

When `numRepetitions` is set, the SDK duplicates examples in the array:

```typescript
// numRepetitions: 3 with 2 examples = 6 total executions
// [ex1, ex2] becomes [ex1, ex2, ex1, ex2, ex1, ex2]
```

### AsyncLocalStorage for Trace Context

The SDK uses `AsyncLocalStorage` to track the current run tree. This enables:
- Nested traces (child runs automatically link to parent)
- Context propagation across async boundaries

If traces aren't nesting correctly, ensure you're not breaking the async context chain.

### Client Consistency

The `traceable()` function uses the default client (from environment variables) unless you pass a custom client. If you create a custom client for `evaluate()`, inner `traceable()` calls may use a different client, causing:
- Traces appearing in different projects
- Missing parent-child relationships
- Potential duplicate executions

**Solution:** Use `setupTestEnvironment()` which creates a properly configured client, or ensure all code uses the same client instance.

### Debugging Tips

1. **Check trace count:** Add logging to track how many times target is called
2. **Verify client:** Log which client is being used for evaluate() vs traceable()
3. **Check environment:** Ensure `LANGSMITH_TRACING=true` is set
4. **Inspect SDK source:** The evaluate logic is in `node_modules/langsmith/dist/evaluation/_runner.js`
