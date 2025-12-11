# Pairwise Evaluation System - Mental Model

This document explains how the pairwise evaluation system works, including the
data flow, component responsibilities, and key design decisions.

## Overview

The pairwise evaluation system tests the AI Workflow Builder by:
1. Generating workflows from prompts
2. Evaluating them against do/don't criteria using LLM judges
3. Aggregating results across multiple judges and generations

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
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         OUTPUT                                       │    │
│  │                                                                      │    │
│  │  LangSmith Mode:              Local Mode:                           │    │
│  │  • Metrics uploaded           • Console output                      │    │
│  │  • Dashboard visible          • Optional JSON artifacts             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### Entry Point (`index.ts`)

Parses CLI arguments and routes to the appropriate evaluation mode:
- `USE_PAIRWISE_EVAL=true` + `--prompt`: Local mode (single prompt, no LangSmith)
- `USE_PAIRWISE_EVAL=true` (no prompt): LangSmith mode (dataset-driven)
- `USE_LANGSMITH_EVAL=true`: Legacy LangSmith evaluation
- Default: CLI evaluation

### Pairwise Runner (`langsmith/pairwise-runner.ts`)

Orchestrates the evaluation:
- **LangSmith mode**: Fetches dataset, creates target/evaluator, calls `evaluate()`
- **Local mode**: Runs generations, judges, displays results

### Pairwise Generator (`langsmith/pairwise-generator.ts`)

Creates the "target" function for LangSmith that does ALL the work:
1. Generates workflows (via `generateWorkflow()`)
2. Runs judge panels (via `runJudgePanel()`)
3. Returns pre-computed feedback

**Why all work in target?** LangSmith evaluators run in a special context that
causes 403 errors when making nested traceable calls. By doing all work in the
target, we avoid this issue.

### Pairwise Judge Chain (`chains/pairwise-judge-chain.ts`)

The LLM chain that acts as a judge:
- Takes a workflow + dos/donts criteria
- Returns violations and passes with justifications
- Calculates `primaryPass` (no violations) and `diagnosticScore`

### LangSmith Metrics Builder (`langsmith/pairwise-metrics-builder.ts`)

Builds LangSmith-compatible metrics from judge results:
- `buildSingleGenerationResults()`: For numGenerations=1
- `buildMultiGenerationResults()`: For numGenerations>1
- `createPairwiseLangsmithEvaluator()`: Simple extractor that returns pre-computed feedback

### Judge Panel (`utils/judge-panel.ts`)

Runs multiple judges and aggregates results:
- Executes judges in parallel
- Calculates majority vote (≥50% must pass)
- Also handles multi-generation aggregation

## Scoring System

### Single Generation (numGenerations=1)

```
For each judge:
  primaryPass = (violations.length === 0)
  diagnosticScore = passes.length / (passes.length + violations.length)

Aggregated:
  primaryPasses = count of judges with primaryPass=true
  majorityPass = primaryPasses >= ceil(numJudges / 2)
  avgDiagnosticScore = mean of all judges' diagnosticScores
```

### Multiple Generations (numGenerations>1)

```
For each generation:
  Run judge panel → majorityPass (boolean)

Aggregated:
  generationCorrectness = (# generations with majorityPass) / numGenerations
  aggregatedDiagnosticScore = mean of all generations' avgDiagnosticScore
```

## LangSmith Metrics

| Metric Key | Description | When |
|------------|-------------|------|
| `pairwise_primary` | 1 if first gen passed majority vote, 0 otherwise | Always |
| `pairwise_diagnostic` | Average diagnostic score (first gen) | Always |
| `pairwise_judges_passed` | Number of judges that passed | Always |
| `pairwise_total_passes` | Total criteria passes | Always |
| `pairwise_total_violations` | Total violations | Always |
| `pairwise_generation_correctness` | Fraction of passing generations | Multi-gen |
| `pairwise_aggregated_diagnostic` | Avg diagnostic across all gens | Multi-gen |
| `pairwise_generations_passed` | Count of passing generations | Multi-gen |
| `pairwise_total_judge_calls` | numGenerations × numJudges | Multi-gen |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_PAIRWISE_EVAL` | Enable pairwise evaluation mode | `false` |
| `LANGSMITH_API_KEY` | LangSmith API key | Required for LS mode |
| `LANGSMITH_DATASET_NAME` | Dataset name | `notion-pairwise-workflows` |
| `N8N_AI_ANTHROPIC_KEY` | Anthropic API key for LLM | Required |
| `N8N_EVALS_DISABLED_NODES` | Comma-separated node types to disable | - |
| `EVAL_FEATURE_MULTI_AGENT` | Enable multi-agent feature flag | `false` |
| `EVAL_FEATURE_TEMPLATE_EXAMPLES` | Enable template examples flag | `false` |

### CLI Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--prompt` | Prompt for local mode | - |
| `--dos` | Do criteria for local mode | - |
| `--donts` | Don't criteria for local mode | - |
| `--judges` | Number of judges | 3 |
| `--generations` | Number of generations | 1 |
| `--repetitions` | LangSmith repetitions | 1 |
| `--concurrency` | Max concurrent evaluations | 5 |
| `--max-examples` | Limit dataset examples | All |
| `--notion-id` | Filter to specific example | - |
| `--name` | Experiment name | `pairwise-evals` |
| `--output-dir` | Directory for artifacts | - |
| `--verbose` / `-v` | Verbose output | `false` |

## Design Decisions

### Why Multiple Judges?

LLM outputs are stochastic. Running multiple judges (default: 3) and using
majority voting reduces variance and provides more stable evaluation results.

### Why Multiple Generations?

The workflow builder itself is stochastic. Running multiple generations tests
whether it can *consistently* produce correct workflows, not just once.

### Why Pre-compute in Target?

LangSmith's evaluator context has restrictions on making API calls. By doing
all LLM work (generation + judging) in the target function and passing
pre-computed metrics, we avoid 403 errors and ensure clean trace structure.

### Why Parallel Execution?

Both generations and judges run in parallel (using `Promise.all`) for speed.
A typical 3-judge, 3-generation evaluation would otherwise take 9× longer.

## File Structure

```
evaluations/
├── index.ts                      # Entry point, CLI parsing
├── constants.ts                  # DEFAULTS, METRIC_KEYS, EVAL_TYPES
├── load-nodes.ts                 # Node type loading from nodes.json
│
├── langsmith/
│   ├── pairwise-runner.ts        # Orchestration (LangSmith + local modes)
│   ├── pairwise-generator.ts     # Target function + workflow generation
│   └── pairwise-metrics-builder.ts  # LangSmith metric builders
│
├── chains/
│   ├── pairwise-judge-chain.ts   # LLM judge chain
│   └── evaluators/base.ts        # Evaluator chain factory
│
├── utils/
│   ├── judge-panel.ts            # Judge execution + aggregation
│   ├── artifact-saver.ts         # Disk persistence for local mode
│   ├── evaluation-helpers.ts     # Formatting, utility functions
│   └── logger.ts                 # Simple logger with verbose mode
│
├── types/
│   ├── pairwise.ts               # Dataset input/output types
│   └── langsmith.ts              # Type guards, workflow state types
│
└── core/
    └── environment.ts            # LLM setup, agent creation
```
