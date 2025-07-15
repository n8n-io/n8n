# AI Workflow Builder Evaluation System

This evaluation system provides testing and assessment of the AI workflow builder's capabilities using LLM-as-a-judge methodology.

## Overview

The evaluation system consists of:
- **Workflow Generator**: Uses the AI agent to generate workflows from text prompts
- **LLM Evaluator**: Uses Claude Sonnet 4 to evaluate generated workflows across multiple dimensions
- **Test Case System**: Pre-defined and dynamically generated test cases
- **Parallel Execution**: Support for concurrent test execution to improve performance
- **Reporting**: Detailed scoring and violation reporting

## Running Evaluations

### Prerequisites

Set up environment variables:
```bash
export N8N_AI_ANTHROPIC_KEY="your-anthropic-api-key"
export LANGSMITH_API_KEY="your-langsmith-api-key"  # Optional for tracing
export EVALUATION_CONCURRENCY="3"  # Number of tests to run in parallel (default: 3)
```

### Available Scripts

```bash
# Run evaluation suite with all basic test cases
npm run eval

# Generate additional test cases and run evaluation
npm run eval:generate
```

## Evaluation Categories

The evaluator scores workflows across 5 categories:

1. **Functional Correctness (35%)**: Does the workflow implement what was requested?
2. **Connections (25%)**: Are nodes properly connected with correct data flow?
3. **Expressions (25%)**: Do expressions correctly reference nodes and data?
4. **Node Configuration (15%)**: Are nodes configured with correct parameters?
5. **Structural Similarity (0% or 10%)**: If reference workflow provided, how similar is the structure?

## Test Cases

### Basic Test Cases
- Simple API data fetch and storage
- CSV processing with filtering
- GitHub/Slack integration
- Data synchronization pipelines
- Complex multi-branch automations

### Custom Test Cases
Add test cases to `test-cases/basic-cases.json` or generate dynamically using the test case generator.

## Output

Evaluations produce:
- Markdown report with scores and violations
- JSON file with detailed results
- Console output with real-time progress

## Architecture

```
evaluations/
├── types/              # TypeScript types and Zod schemas
├── chains/             # LangChain implementations
├── test-cases/         # Pre-defined test cases
├── results/            # Generated evaluation results and reports
├── utils/              # Common utilities and helpers
│   └── evaluation-helpers.ts  # Shared functions for evaluations
├── load-nodes.ts       # Node loading from JSON
└── run-evaluation.ts   # Main evaluation runner with parallel support
```

## Performance

The evaluation system supports parallel execution to speed up test runs:

- **Default Concurrency**: 3 tests run in parallel
- **Customizable**: Set `EVALUATION_CONCURRENCY` to control parallelism
- **Resource Considerations**: Higher concurrency uses more API calls and memory
- **Speed Improvement**: 3x-5x faster with parallel execution

Each test case runs with its own:
- Dedicated WorkflowBuilderAgent instance
- Separate MemorySaver checkpointer
- Independent state management

This ensures no conflicts between parallel test executions.

## Code Organization

The evaluation system has been refactored for better maintainability:

### Common Utilities (`utils/evaluation-helpers.ts`)
- `setupLLM()` - Configures the language model
- `createTracer()` - Sets up LangSmith tracing
- `createAgent()` - Creates workflow builder agents
- `formatPercentage()` - Consistent percentage formatting
- `groupViolationsBySeverity()` - Organizes violations for display
- Various display helpers for clean output

### Main Evaluation Runner (`run-evaluation.ts`)
- `runFullEvaluation()` - Main entry point for evaluation suite
- `runTestCase()` - Executes individual test cases
- `generateReport()` - Creates markdown evaluation reports
- `calculateCategoryAverages()` - Computes average scores
- `countViolationsByType()` - Aggregates violation statistics
- `saveResults()` - Persists results to disk

## Extending the System

### Adding New Test Cases
1. Add to `test-cases/basic-cases.json`
2. Or use the test case generator to create them dynamically

### Modifying Evaluation Criteria
1. Update the prompt in `chains/workflow-evaluator.ts`
2. Adjust weights in the scoring function
3. Add new violation types if needed

### Custom Evaluators
Create new chains following the pattern in `workflow-evaluator.ts` using `withStructuredOutput`.
