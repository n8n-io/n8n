# AI Workflow Builder Evaluations

This module provides a evaluation framework for testing the AI Workflow Builder's ability to generate correct n8n workflows from natural language prompts.

## Architecture Overview

The evaluation system is split into two distinct modes with a **parallel evaluation architecture** for optimal performance:
1. **CLI Evaluation** - Runs predefined test cases locally with progress tracking and parallel metric evaluation
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
│   ├── test-case-generator.ts    # Dynamic test case generation
│   ├── workflow-evaluator.ts     # Main orchestrator for parallel evaluation
│   └── evaluators/               # Individual metric evaluators
│       ├── index.ts              # Evaluator exports
│       ├── functionality-evaluator.ts      # Functional correctness evaluation
│       ├── connections-evaluator.ts        # Node connection evaluation
│       ├── expressions-evaluator.ts        # n8n expression syntax evaluation
│       ├── node-configuration-evaluator.ts # Node parameter evaluation
│       ├── efficiency-evaluator.ts         # Workflow efficiency evaluation
│       ├── data-flow-evaluator.ts          # Data flow logic evaluation
│       └── maintainability-evaluator.ts    # Code maintainability evaluation
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

#### 3. Workflow Evaluator (`chains/workflow-evaluator.ts`)

The main orchestrator that coordinates parallel evaluation across all metric categories:
- **Parallel Execution**: Runs all 7 evaluators concurrently using `Promise.all()` for optimal performance
- **Score Calculation**: Computes weighted overall score using the weight distribution
- **Summary Generation**: Creates evaluation summaries based on all metric results
- **Critical Issues Identification**: Aggregates critical violations from all evaluator categories

#### 4. Individual Evaluators (`chains/evaluators/`)

Each metric category has its own specialized evaluator chain with tailored prompts and scoring logic:

**Functionality Evaluator**: Focuses on whether the workflow achieves explicitly requested goals
**Connections Evaluator**: Analyzes node connections and data flow paths
**Expressions Evaluator**: Validates n8n expression syntax and data references
**Node Configuration Evaluator**: Checks parameter configuration and required fields
**Efficiency Evaluator**: Evaluates redundancy, path optimization, and node count efficiency
**Data Flow Evaluator**: Analyzes data transformations and validation logic
**Maintainability Evaluator**: Assesses naming, organization, and structural quality

#### 5. Langsmith Integration

The Langsmith integration provides two key components:

**Evaluator (`langsmith/evaluator.ts`):**
- Converts Langsmith Run objects to evaluation inputs
- Validates all data using type guards before processing
- Safely extracts usage metadata without type coercion
- Returns structured evaluation results from the parallel evaluation system

**Runner (`langsmith/runner.ts`):**
- Creates workflow generation functions compatible with Langsmith
- Validates message content before processing
- Extracts usage metrics safely from message metadata
- Handles dataset verification and error reporting

#### 6. CLI Evaluation

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

The system evaluates workflows across seven categories, with each category having its own specialized evaluator chain that runs in parallel:

1. **Functionality** (25% weight)
   - Does the workflow achieve the intended goal?
   - Are the right nodes selected?
   - Is core functionality explicitly requested implemented?

2. **Connections** (15% weight)
   - Are nodes properly connected?
   - Is data flow logical?
   - Are connection paths optimized?

3. **Expressions** (15% weight)
   - Are n8n expressions syntactically correct?
   - Do they reference valid data paths?
   - Are expressions efficient and maintainable?

4. **Node Configuration** (15% weight)
   - Are node parameters properly set?
   - Are required fields populated?
   - Are configurations appropriate for the use case?

5. **Efficiency** (10% weight)
   - **Redundancy Score**: Avoiding duplicate operations that could be consolidated
   - **Path Optimization**: Using optimal execution paths
   - **Node Count Efficiency**: Using minimal necessary nodes
   - Are backup/fallback paths intentional vs. wasteful?

6. **Data Flow** (10% weight)
   - Is data flowing correctly between nodes?
   - Are data transformations logical and necessary?
   - Is data validation properly implemented?

7. **Maintainability** (5% weight)
   - **Node Naming Quality**: Are nodes descriptively named?
   - **Workflow Organization**: Is the structure logically organized?
   - **Modularity**: Are components reusable and well-structured?

8. **Structural Similarity** (5% weight, optional)
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
1. Create a new evaluator file in `chains/evaluators/` following the existing pattern
2. Update the `EvaluationResult` schema in `types/evaluation.ts` to include the new metric
3. Add the new evaluator to the exports in `chains/evaluators/index.ts`
4. Import and call the new evaluator in `chains/workflow-evaluator.ts`'s `Promise.all()` array
5. Adjust weight calculations in the `calculateWeightedScore` function
6. Update the evaluator in `langsmith/evaluator.ts` to include new metrics
