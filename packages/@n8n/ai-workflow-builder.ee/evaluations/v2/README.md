# V2 Evaluation Harness

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
                           │ key: string  │
                           │ score: 0-1   │
                           │ comment?: str│
                           └──────────────┘
```

## Key Concepts

### Evaluator

A function that takes a workflow and returns feedback:

```typescript
interface Evaluator<TContext = void> {
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
  key: string;      // e.g., "functionality", "pairwise.judge1"
  score: number;    // 0.0 to 1.0
  comment?: string; // Optional explanation/violations
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

**Key fix for LangSmith 0.4.x:** The target function does ALL work (generation + evaluation). The LangSmith evaluator just extracts pre-computed feedback. This avoids the "Run not created by target function" error.

```typescript
// Inside runLangsmith():
const target = traceable(async (inputs) => {
  const workflow = await generateWorkflow(prompt);
  const feedback = await evaluateWithPlugins(workflow, evaluators);
  return { workflow, prompt, feedback };  // Pre-computed!
});

// LangSmith evaluator just extracts:
const feedbackExtractor = (run) => run.outputs.feedback;
```

## Available Evaluators

### LLM-Judge

Uses an LLM to evaluate workflow quality across multiple dimensions:

```typescript
import { createLLMJudgeEvaluator } from './evaluators';

const evaluator = createLLMJudgeEvaluator(llm, nodeTypes);
```

**Feedback keys:** `functionality`, `connections`, `expressions`, `nodeConfiguration`, `efficiency`, `dataFlow`, `maintainability`, `overallScore`

**Context required:** `{ prompt: string }`

### Pairwise

Uses a panel of judges to evaluate against dos/donts criteria:

```typescript
import { createPairwiseEvaluator } from './evaluators';

const evaluator = createPairwiseEvaluator(llm, { numJudges: 3 });
```

**Feedback keys:** `pairwise.majorityPass`, `pairwise.diagnosticScore`, `pairwise.judge1`, etc.

**Context required:** `{ dos?: string, donts?: string }`

### Programmatic

Rule-based checks without LLM calls:

```typescript
import { createProgrammaticEvaluator } from './evaluators';

const evaluator = createProgrammaticEvaluator(nodeTypes);
```

**Feedback keys:** `programmatic.overall`, `programmatic.connections`, `programmatic.trigger`, etc.

**Context required:** None

## CLI Usage

```bash
# Local mode (default)
tsx evaluations/v2/cli.ts --prompt "Create a workflow..." --verbose

# LangSmith mode
LANGSMITH_TRACING=true USE_LANGSMITH_EVAL=true \
  tsx evaluations/v2/cli.ts --name "my-experiment" --verbose

# Pairwise mode
USE_PAIRWISE_EVAL=true \
  tsx evaluations/v2/cli.ts --prompt "..." --dos "Must use Slack" --donts "No HTTP"
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
        { key: 'my-evaluator.score', score: 0.9 },
        { key: 'my-evaluator.detail', score: 0.8, comment: '...' },
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
evaluations/v2/
├── __tests__/
│   ├── evaluators/
│   │   ├── llm-judge.test.ts
│   │   ├── pairwise.test.ts
│   │   └── programmatic.test.ts
│   ├── lifecycle.test.ts
│   ├── runner.test.ts
│   ├── runner-langsmith.test.ts
│   └── types.test.ts
├── evaluators/
│   ├── index.ts
│   ├── llm-judge.ts
│   ├── pairwise.ts
│   └── programmatic.ts
├── cli.ts           # CLI entry point
├── index.ts         # Public exports
├── lifecycle.ts     # Console logging hooks
├── runner.ts        # Core runEvaluation()
├── types.ts         # TypeScript interfaces
└── README.md        # This file
```

## Error Handling

The harness uses "skip and continue" error handling:

- If an evaluator throws, it returns error feedback and continues
- If workflow generation fails, the example is marked as error and continues
- Other evaluators still run even if one fails

```typescript
// Error feedback format:
{ key: 'evaluator-name.error', score: 0, comment: 'Error message' }
```
