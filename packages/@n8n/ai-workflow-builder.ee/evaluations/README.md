# AI Workflow Builder Evaluations

This module provides a evaluation framework for testing the AI Workflow Builder's ability to generate correct n8n workflows from natural language prompts.

## Architecture Overview

The evaluation system is split into three distinct modes with a **parallel evaluation architecture** for optimal performance:
1. **CLI Evaluation** - Runs predefined test cases locally with progress tracking and parallel metric evaluation
2. **Langsmith Evaluation** - Integrates with Langsmith for dataset-based evaluation and experiment tracking
3. **Pairwise Evaluation** - Evaluates workflows against custom do/don't criteria from a dataset

### Directory Structure

```
evaluations/
├── cli/                 # CLI evaluation implementation
│   ├── runner.ts       # Main CLI evaluation orchestrator
│   └── display.ts      # Console output and progress tracking
├── langsmith/          # Langsmith integration (non-pairwise)
│   ├── evaluator.ts    # Langsmith-compatible evaluator function
│   └── runner.ts       # Langsmith evaluation orchestrator
├── pairwise/           # Pairwise evaluation (local + LangSmith modes)
│   ├── runner.ts       # Orchestration for both local and LangSmith modes
│   ├── generator.ts    # Target function + workflow generation
│   ├── metrics-builder.ts # LangSmith metric builders
│   ├── judge-chain.ts  # LLM judge chain
│   ├── judge-panel.ts  # Multi-judge execution and aggregation
│   └── types.ts        # Dataset input/output types
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

#### 6. Pairwise Evaluation

Pairwise evaluation provides a criteria-based approach to workflow evaluation with hierarchical scoring and multi-judge consensus. It evaluates workflows against a custom set of "do" and "don't" rules defined in the dataset. All pairwise-related code is consolidated in the `pairwise/` directory.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVALUATION FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Dataset (LangSmith)           Local Mode                                    │
│  ┌──────────────────┐         ┌──────────────────┐                          │
│  │ prompt           │         │ --prompt "..."   │                          │
│  │ evals.dos        │         │ --dos "..."      │                          │
│  │ evals.donts      │         │ --donts "..."    │                          │
│  └────────┬─────────┘         └────────┬─────────┘                          │
│           │                            │                                     │
│           ▼                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         GENERATION PHASE                             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ Generation 1 │  │ Generation 2 │  │ Generation N │  (in parallel) │    │
│  │  │             │  │             │  │             │                  │    │
│  │  │ Agent.chat()│  │ Agent.chat()│  │ Agent.chat()│                  │    │
│  │  │     ↓       │  │     ↓       │  │     ↓       │                  │    │
│  │  │  Workflow   │  │  Workflow   │  │  Workflow   │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         JUDGE PANEL PHASE                            │    │
│  │                     (per generation, in parallel)                    │    │
│  │                                                                      │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                              │    │
│  │  │ Judge 1 │  │ Judge 2 │  │ Judge 3 │  (default: 3 judges)         │    │
│  │  │         │  │         │  │         │                              │    │
│  │  │ LLM     │  │ LLM     │  │ LLM     │  Same prompt, independent    │    │
│  │  │ Eval    │  │ Eval    │  │ Eval    │  calls for variance          │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘                              │    │
│  │       │            │            │                                    │    │
│  │       ▼            ▼            ▼                                    │    │
│  │  ┌─────────────────────────────────────────────────────────┐        │    │
│  │  │              AGGREGATION                                 │        │    │
│  │  │  • primaryPass: ALL criteria passed (no violations)?     │        │    │
│  │  │  • diagnosticScore: passes / total criteria              │        │    │
│  │  │  • majorityPass: ≥50% judges have primaryPass=true       │        │    │
│  │  └─────────────────────────────────────────────────────────┘        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MULTI-GENERATION AGGREGATION                      │    │
│  │  (only if numGenerations > 1)                                        │    │
│  │                                                                      │    │
│  │  • generationCorrectness: (# passing gens) / total gens             │    │
│  │  • aggregatedDiagnosticScore: avg across all generations            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Judge Chain (`pairwise/judge-chain.ts`):**
- Evaluates workflows against a checklist of criteria (dos and don'ts)
- Uses an LLM to determine if each criterion passes or fails
- Requires evidence-based justification for each decision
- Returns `primaryPass` (true only if ALL criteria pass) and `diagnosticScore` (ratio of passes)

**Runner (`pairwise/runner.ts`):**
- Generates workflows from prompts in the dataset
- Runs multiple LLM judges in parallel for each evaluation (configurable via `--judges`)
- Aggregates judge results using majority vote
- Supports filtering by `notion_id` metadata for single-example runs
- Reports five metrics to Langsmith:
  - `pairwise_primary`: Majority vote result (0 or 1)
  - `pairwise_diagnostic`: Average diagnostic score across judges
  - `pairwise_judges_passed`: Count of judges that passed
  - `pairwise_total_violations`: Sum of all violations
  - `pairwise_total_passes`: Sum of all passes

**Logger (`utils/logger.ts`):**
- Simple evaluation logger with verbose mode support
- Controls output verbosity via `--verbose` flag

**Dataset Format:**
The pairwise evaluation expects a Langsmith dataset with examples containing:
```json
{
  "inputs": {
    "prompt": "Create a workflow that...",
    "evals": {
      "dos": "Use HTTP Request node for API calls\nInclude error handling",
      "donts": "Don't use deprecated nodes\nDon't hardcode credentials"
    }
  }
}
```
Note: `dos` and `donts` are newline-separated strings, not arrays.

#### 7. CLI Evaluation

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

# With feature flags enabled
pnpm eval --multi-agent --template-examples
```

### Langsmith Evaluation

```bash
# Set required environment variables
export LANGSMITH_API_KEY=your_api_key
# Optionally specify dataset
export LANGSMITH_DATASET_NAME=your_dataset_name

# Run evaluation
pnpm eval:langsmith

# With feature flags enabled
pnpm eval:langsmith --multi-agent
```

### Pairwise Evaluation

Pairwise evaluation uses a dataset with custom do/don't criteria for each prompt. It implements a hierarchical scoring system with multiple LLM judges per evaluation.

#### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--prompt <text>` | Run local evaluation with this prompt (no LangSmith required) | - |
| `--dos <rules>` | Newline-separated "do" rules for local evaluation | - |
| `--donts <rules>` | Newline-separated "don't" rules for local evaluation | - |
| `--notion-id <id>` | Filter to a single example by its `notion_id` metadata | (all examples) |
| `--max-examples <n>` | Limit number of examples to evaluate (useful for testing) | (no limit) |
| `--repetitions <n>` | Number of times to repeat the entire evaluation | 1 |
| `--generations <n>` | Number of workflow generations per prompt (for variance reduction) | 1 |
| `--judges <n>` | Number of LLM judges per evaluation | 3 |
| `--concurrency <n>` | Number of prompts to evaluate in parallel | 5 |
| `--name <name>` | Custom experiment name in LangSmith | `pairwise-evals` |
| `--output-dir <path>` | Save generated workflows and evaluation results to this directory | - |
| `--verbose`, `-v` | Enable verbose logging (shows judge details, violations, etc.) | false |
| `--multi-agent` | Enable multi-agent architecture (see [Feature Flags](#feature-flags)) | false |
| `--template-examples` | Enable template-based examples (see [Feature Flags](#feature-flags)) | false |

#### Local Mode (No LangSmith Required)

Run a single pairwise evaluation locally without needing a LangSmith account:

```bash
# Basic local evaluation
pnpm eval:pairwise --prompt "Create a workflow that sends Slack messages" --dos "Use Slack node"

# With don'ts and multiple judges
pnpm eval:pairwise \
  --prompt "Create a workflow that fetches data from an API" \
  --dos "Use HTTP Request node\nHandle errors" \
  --donts "Don't hardcode URLs" \
  --judges 5 \
  --verbose
```

Local mode is useful for:
- Testing prompts before adding them to a dataset
- Quick iteration on evaluation criteria
- Running evaluations without LangSmith setup

#### LangSmith Mode

For dataset-based evaluation with experiment tracking:

```bash
# Set required environment variables
export LANGSMITH_API_KEY=your_api_key

# Run pairwise evaluation (uses default dataset: notion-pairwise-workflows)
pnpm eval:pairwise

# Run a single example by notion_id
pnpm eval:pairwise --notion-id 30d29454-b397-4a35-8e0b-74a2302fa81a

# Run with 3 repetitions and 5 judges, custom experiment name
pnpm eval:pairwise --repetitions 3 --judges 5 --name "my-experiment"

# Enable verbose logging to see all judge details
pnpm eval:pairwise --notion-id abc123 --verbose

# Use a custom dataset
LANGSMITH_DATASET_NAME=my-pairwise-dataset pnpm eval:pairwise

# Limit to specific number of examples (useful for testing)
pnpm eval:pairwise --max-examples 2
```

#### Multi-Generation Evaluation

The `--generations` flag enables multiple workflow generations per prompt, providing a **Generation Correctness** metric:

```bash
# Run 3 generations per prompt with 3 judges each
pnpm eval:pairwise --generations 3 --judges 3 --verbose

# Example output:
# Gen 1: 2/3 judges → ✓ PASS (diag=85%)
# Gen 2: 1/3 judges → ✗ FAIL (diag=60%)
# Gen 3: 3/3 judges → ✓ PASS (diag=95%)
# 📊 [#1] 2/3 gens → PASS (gen_corr=0.67, diag=80%)
```

**Generation Correctness** = (# passing generations) / total generations:
- With `--generations 3`: Values are 0, 0.33, 0.67, or 1
- With `--generations 5`: Values are 0, 0.2, 0.4, 0.6, 0.8, or 1

#### Hierarchical Scoring System

The pairwise evaluation uses a multi-level scoring hierarchy:

| Level | Primary Score | Secondary Score |
|-------|--------------|-----------------|
| Individual do/don't | Binary (true/false) | 0 or 1 |
| 1 LLM judge | false if ANY criterion fails | Average of criteria scores |
| N judges on 1 generation | Majority vote (≥50% pass) | Average diagnostic across judges |
| N generations on 1 prompt | (# passing gens) / N | Average diagnostic across generations |
| Full dataset | Average across prompts | Average diagnostic across all |

This approach reduces variance from LLM non-determinism by using multiple judges and generations.

#### Saving Artifacts with --output-dir

The `--output-dir` flag saves all generated workflows and evaluation results to disk:

```bash
# Save artifacts to ./eval-output directory
pnpm eval:pairwise --generations 3 --output-dir ./eval-output --verbose
```

**Output structure:**
```
eval-output/
├── prompt-1/
│   ├── prompt.txt              # Original prompt text
│   ├── criteria.json           # dos/donts criteria
│   ├── gen-1/
│   │   ├── workflow.json       # Importable n8n workflow
│   │   └── evaluation.json     # Judge results for this generation
│   ├── gen-2/
│   │   ├── workflow.json
│   │   └── evaluation.json
│   └── gen-3/
│       ├── workflow.json
│       └── evaluation.json
├── prompt-2/
│   └── ...
└── summary.json                # Overall results summary
```

**workflow.json**: Directly importable into n8n (File → Import from file)

**evaluation.json**: Contains per-judge results including violations and passes:
```json
{
  "generationIndex": 1,
  "majorityPass": false,
  "primaryPasses": 1,
  "numJudges": 3,
  "diagnosticScore": 0.35,
  "judges": [
    {
      "judgeIndex": 1,
      "primaryPass": false,
      "diagnosticScore": 0.30,
      "violations": [{"rule": "...", "justification": "..."}],
      "passes": [{"rule": "...", "justification": "..."}]
    }
  ]
}
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
- `USE_PAIRWISE_EVAL` - Set to "true" to use pairwise evaluation mode
- `LANGSMITH_DATASET_NAME` - Override default dataset name
- `EVALUATION_CONCURRENCY` - Number of parallel test executions (default: 5)
- `GENERATE_TEST_CASES` - Set to "true" to generate additional test cases
- `LLM_MODEL` - Model identifier for metadata tracking
- `EVAL_FEATURE_MULTI_AGENT` - Set to "true" to enable multi-agent mode
- `EVAL_FEATURE_TEMPLATE_EXAMPLES` - Set to "true" to enable template examples
- `N8N_EVALS_DISABLED_NODES` - Comma-separated list of node types to disable (e.g., `n8n-nodes-base.slack,@n8n/n8n-nodes-langchain.agent`)

### Feature Flags

Feature flags control experimental or optional behaviors in the AI Workflow Builder agent during evaluations. They can be set via environment variables or CLI arguments.

#### Available Flags

| Flag | Description | Default |
|------|-------------|---------|
| `multiAgent` | Enables multi-agent architecture with specialized sub-agents (supervisor, builder, configurator, discovery) | `false` |
| `templateExamples` | Enables template-based examples in agent prompts | `false` |

#### Setting Feature Flags

**Via Environment Variables:**
```bash
# Enable multi-agent mode
EVAL_FEATURE_MULTI_AGENT=true pnpm eval

# Enable template examples
EVAL_FEATURE_TEMPLATE_EXAMPLES=true pnpm eval:pairwise

# Enable both
EVAL_FEATURE_MULTI_AGENT=true EVAL_FEATURE_TEMPLATE_EXAMPLES=true pnpm eval:langsmith
```

**Via CLI Arguments:**
```bash
# Enable multi-agent mode
pnpm eval --multi-agent

# Enable template examples
pnpm eval:pairwise --template-examples

# Enable both
pnpm eval:langsmith --multi-agent --template-examples
```

#### Usage Across Evaluation Modes

Feature flags work consistently across all evaluation modes:

**CLI Evaluation:**
```bash
pnpm eval --multi-agent --template-examples
```

**Langsmith Evaluation:**
```bash
pnpm eval:langsmith --multi-agent
```

**Pairwise Evaluation (LangSmith mode):**
```bash
pnpm eval:pairwise --multi-agent --template-examples
```

**Pairwise Evaluation (Local mode):**
```bash
pnpm eval:pairwise --prompt "Create a Slack workflow" --dos "Use Slack node" --multi-agent
```

When feature flags are enabled, they are logged at the start of the evaluation:
```
➔ Feature flags enabled: multiAgent, templateExamples
```

## Output

### CLI Evaluation Output

- **Console Display**: Real-time progress, test results, and summary statistics
- **Markdown Report**: `results/evaluation-report-[timestamp].md`
- **JSON Results**: `results/evaluation-results-[timestamp].json`

### Langsmith Evaluation Output

- Results are stored in Langsmith dashboard
- Experiment name format: `workflow-builder-evaluation-[date]`
- Includes detailed metrics for each evaluation category

### Pairwise Evaluation Output

- Results are stored in Langsmith dashboard
- Experiment name format: `<name>-[uuid]` (default: `pairwise-evals-[uuid]`)
- Metrics reported (single generation mode):
  - `pairwise_primary`: Binary pass/fail based on majority vote (0 or 1)
  - `pairwise_diagnostic`: Average diagnostic score across judges (0-1)
  - `pairwise_judges_passed`: Number of judges that returned primaryPass=true
  - `pairwise_total_violations`: Sum of violations across all judges
  - `pairwise_total_passes`: Sum of passes across all judges
- Additional metrics reported (multi-generation mode with `--generations N`):
  - `pairwise_generation_correctness`: (# passing generations) / N (0, 0.33, 0.67, 1 for N=3)
  - `pairwise_aggregated_diagnostic`: Average diagnostic score across all generations
  - `pairwise_generations_passed`: Count of generations that passed majority vote
  - `pairwise_total_judge_calls`: Total judge invocations (generations × judges)
- Each result includes detailed comments with:
  - Majority vote summary
  - List of violations with justifications (per judge)
  - List of passes (per judge)

## Design Decisions

### Why Multiple Judges?

LLM outputs are stochastic. Running multiple judges (default: 3) and using majority voting reduces variance and provides more stable evaluation results.

### Why Multiple Generations?

The workflow builder itself is stochastic. Running multiple generations tests whether it can *consistently* produce correct workflows, not just once.

### Why Pre-compute in Target?

LangSmith's evaluator context has restrictions on making API calls. By doing all LLM work (generation + judging) in the target function and passing pre-computed metrics, we avoid 403 errors and ensure clean trace structure.

### Why Parallel Execution?

Both generations and judges run in parallel (using `Promise.all`) for speed. A typical 3-judge, 3-generation evaluation would otherwise take 9× longer.

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
