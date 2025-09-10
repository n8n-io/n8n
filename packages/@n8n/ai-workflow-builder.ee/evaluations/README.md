# AI Workflow Builder Evaluations

This module provides a evaluation framework for testing the AI Workflow Builder's ability to generate correct n8n workflows from natural language prompts.

## Architecture Overview

The evaluation system is split into two distinct modes:
1. **CLI Evaluation** - Runs predefined test cases locally with progress tracking
2. **Langsmith Evaluation** - Integrates with Langsmith for dataset-based evaluation and experiment tracking

### Directory Structure

```
evaluations/
├── cli/                 # CLI evaluation implementation
│   ├── runner.ts       # Main CLI evaluation orchestrator
│   └── display.ts      # Console output and progress tracking
├── langsmith/          # Langsmith integration
│   ├── evaluator.ts    # Langsmith-compatible evaluator function
│   └── runner.ts       # Langsmith evaluation orchestrator
├── core/               # Shared evaluation logic
│   ├── environment.ts  # Test environment setup and configuration
│   └── test-runner.ts  # Core test execution logic
├── types/              # Type definitions
│   ├── evaluation.ts   # Evaluation result schemas
│   ├── test-result.ts  # Test result interfaces
│   └── langsmith.ts    # Langsmith-specific types and guards
├── chains/             # LLM evaluation chains
│   ├── test-case-generator.ts  # Dynamic test case generation
│   └── workflow-evaluator.ts   # LLM-based workflow evaluation
├── utils/              # Utility functions
│   ├── evaluation-calculator.ts  # Metrics calculation
│   ├── evaluation-helpers.ts     # Common helper functions
│   ├── evaluation-reporter.ts    # Report generation
└── index.ts            # Main entry point
```

## Implementation Details
### Core Components

#### 1. Test Runner (`core/test-runner.ts`)

The core test runner handles individual test execution:
- Generates workflows using the WorkflowBuilderAgent
- Validates generated workflows using type guards
- Evaluates workflows against test criteria
- Returns structured test results with error handling

#### 2. Environment Setup (`core/environment.ts`)

Centralizes environment configuration:
- LLM initialization with API key validation
- Langsmith client setup
- Node types loading
- Concurrency and test generation settings

#### 3. Langsmith Integration

The Langsmith integration provides two key components:

**Evaluator (`langsmith/evaluator.ts`):**
- Converts Langsmith Run objects to evaluation inputs
- Validates all data using type guards before processing
- Safely extracts usage metadata without type coercion
- Returns structured evaluation results

**Runner (`langsmith/runner.ts`):**
- Creates workflow generation functions compatible with Langsmith
- Validates message content before processing
- Extracts usage metrics safely from message metadata
- Handles dataset verification and error reporting

#### 4. CLI Evaluation

The CLI evaluation provides local testing capabilities:

**Runner (`cli/runner.ts`):**
- Orchestrates parallel test execution with concurrency control
- Manages test case generation when enabled
- Generates detailed reports and saves results

**Display (`cli/display.ts`):**
- Progress bar management for real-time feedback
- Console output formatting
- Error display and reporting

### Evaluation Metrics

The system evaluates workflows across five categories:

1. **Functionality** (30% weight)
   - Does the workflow achieve the intended goal?
   - Are the right nodes selected?

2. **Connections** (25% weight)
   - Are nodes properly connected?
   - Is data flow logical?

3. **Expressions** (20% weight)
   - Are n8n expressions syntactically correct?
   - Do they reference valid data paths?

4. **Node Configuration** (15% weight)
   - Are node parameters properly set?
   - Are required fields populated?

5. **Structural Similarity** (10% weight, optional)
   - How closely does the structure match a reference workflow?
   - Only evaluated when reference workflow is provided

### Violation Severity Levels

Violations are categorized by severity:
- **Critical** (-40 to -50 points): Workflow-breaking issues
- **Major** (-15 to -25 points): Significant problems affecting functionality
- **Minor** (-5 to -15 points): Non-critical issues or inefficiencies

## Running Evaluations

### CLI Evaluation

```bash
# Run with default settings
pnpm eval

# Run a specific test case
pnpm eval --test-case google-sheets-processing
pnpm eval --test-case extract-from-file

# With additional generated test cases
GENERATE_TEST_CASES=true pnpm eval

# With custom concurrency
EVALUATION_CONCURRENCY=10 pnpm eval
```

### Langsmith Evaluation

```bash
# Set required environment variables
export LANGSMITH_API_KEY=your_api_key
# Optionally specify dataset
export LANGSMITH_DATASET_NAME=your_dataset_name

# Run evaluation
pnpm eval:langsmith
```

## Configuration

### Required Files

#### nodes.json
**IMPORTANT**: The evaluation framework requires a `nodes.json` file in the evaluations root directory (`evaluations/nodes.json`).

This file contains all n8n node type definitions and is used by the AI Workflow Builder agent to:
- Know what nodes are available in n8n
- Understand node parameters and their schemas
- Generate valid workflows with proper node configurations

**Why is this required?**
The AI Workflow Builder agent needs access to node definitions to generate workflows. In a normal n8n runtime, these definitions are loaded automatically. However, since the evaluation framework instantiates the agent without a running n8n instance, we must provide the node definitions manually via `nodes.json`.

**How to generate nodes.json:**
1. Run your n8n instance
2. Download the node definitions from locally running n8n instance(http://localhost:5678/types/nodes.json)
3. Save the node definitions to `evaluations/nodes.json`
` curl -o evaluations/nodes.json http://localhost:5678/types/nodes.json`

The evaluation will fail with a clear error message if `nodes.json` is missing.

### Environment Variables

- `N8N_AI_ANTHROPIC_KEY` - Required for LLM access
- `LANGSMITH_API_KEY` - Required for Langsmith evaluation
- `USE_LANGSMITH_EVAL` - Set to "true" to use Langsmith mode
- `LANGSMITH_DATASET_NAME` - Override default dataset name
- `EVALUATION_CONCURRENCY` - Number of parallel test executions (default: 5)
- `GENERATE_TEST_CASES` - Set to "true" to generate additional test cases
- `LLM_MODEL` - Model identifier for metadata tracking

## Output

### CLI Evaluation Output

- **Console Display**: Real-time progress, test results, and summary statistics
- **Markdown Report**: `results/evaluation-report-[timestamp].md`
- **JSON Results**: `results/evaluation-results-[timestamp].json`

### Langsmith Evaluation Output

- Results are stored in Langsmith dashboard
- Experiment name format: `workflow-builder-evaluation-[date]`
- Includes detailed metrics for each evaluation category

## Adding New Test Cases

Test cases are defined in `chains/test-case-generator.ts`. Each test case requires:
- `id`: Unique identifier
- `name`: Descriptive name
- `prompt`: Natural language description of the workflow to generate
- `referenceWorkflow` (optional): Expected workflow structure for comparison

## Extending the Framework

To add new evaluation metrics:
1. Update the `EvaluationResult` schema in `types/evaluation.ts`
2. Modify the evaluation logic in `chains/workflow-evaluator.ts`
3. Update the evaluator in `langsmith/evaluator.ts` to include new metrics
4. Adjust weight calculations in `utils/evaluation-calculator.ts`
