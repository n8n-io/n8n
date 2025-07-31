# Evaluation Feature - Technical Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The evaluation feature allows systematic testing of n8n workflows against datasets. It implements two distinct execution modes with different architectures and capabilities.

## Execution Modes

### 1. Canvas Mode (Light Evaluation)

Canvas mode implements a workaround to simulate looping behavior without true loop support in the workflow engine. This mode is used for light evaluation - testing with a small dataset without formal metrics.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant EvalTrigger
    participant Workflow

    User->>Frontend: Execute from canvas
    Frontend->>EvalTrigger: Execute (row 0)
    EvalTrigger->>EvalTrigger: Read row from GSheet
    EvalTrigger->>Workflow: Return row + _rowsLeft
    Workflow->>Frontend: Execution complete event

    loop While _rowsLeft > 0
        Frontend->>Frontend: executionFinished handler
        Frontend->>Frontend: continueEvaluationLoop()
        Frontend->>Frontend: Check _rowsLeft from trigger output
        Frontend->>EvalTrigger: Re-execute with previous trigger data
        EvalTrigger->>EvalTrigger: Read next row
        EvalTrigger->>Workflow: Return row + _rowsLeft
        Workflow->>Frontend: Execution complete event
    end
```

**Implementation Details:**
- Frontend orchestration happens in the `executionFinished` event handler:
  - Location: `packages/frontend/editor-ui/src/composables/usePushConnection/handlers/executionFinished.ts`
  - The `continueEvaluationLoop()` function is called when execution status is 'success'
  - Only the trigger node's output data is passed between iterations:
  ```typescript
  // From executionFinished.ts:146-157
  const rowsLeft = mainData ? (mainData[0]?.json?._rowsLeft as number) : 0;
  if (rowsLeft && rowsLeft > 0) {
    const { runWorkflow } = useRunWorkflow({ router });
    void runWorkflow({
      triggerNode: evaluationTrigger.name,
      // pass output of previous trigger run to next iteration
      nodeData: triggerRunData[0],
      rerunTriggerNode: true,
    });
  }
  ```
- Each execution is independent, passing only the trigger node's previous output as input (NOT the entire workflow output)
- No metrics collection or test run records

### 2. Test Runner Mode (Metric-based Evaluation)

Test runner mode uses a dedicated service to orchestrate metric-based evaluations. This mode creates test runs with test cases and collects metrics for each execution.

```mermaid
sequenceDiagram
    participant UI
    participant TestRunner
    participant Engine
    participant DB

    UI->>TestRunner: POST /test-runs/new
    TestRunner->>DB: Create TestRun
    TestRunner->>Engine: Execute Evaluation Trigger's getRows
    Engine->>TestRunner: Return all dataset rows

    loop For each row
        TestRunner->>Engine: Execute entire WF with pinned data on trigger
        Engine->>Engine: mode = 'evaluation'
        Engine->>TestRunner: Execution result
        TestRunner->>TestRunner: Extract metrics
        TestRunner->>DB: Create TestCaseExecution
    end

    TestRunner->>TestRunner: Aggregate metrics
    TestRunner->>DB: Update TestRun
    UI->>UI: Poll for updates
```

**Key Implementation:**
- `forceCustomOperation` mechanism bypasses normal node execution:
  ```typescript
  triggerNode.forceCustomOperation = {
    resource: 'dataset',
    operation: 'getRows'
  };
  ```
- Execution engine checks this flag in `packages/core/src/workflow-execute.ts`

## Core Components

### Evaluation Nodes

#### EvaluationTrigger Node
Location: `packages/nodes-base/nodes/Evaluation/EvaluationTrigger/EvaluationTrigger.node.ee.ts`

Two execution paths:
1. **Normal execution (`execute` method)**:
   - Returns single row per execution
   - Tracks `row_number` and `_rowsLeft`
   - Used in canvas mode

2. **Custom operation (`customOperations.dataset.getRows`)**:
   - Returns entire dataset at once
   - Only accessible via `forceCustomOperation`
   - Used by test runner

#### Evaluation Node
Location: `packages/nodes-base/nodes/Evaluation/Evaluation.node.ee.ts`

Operations:
- `setOutputs` (Set outputs): Updates Google Sheet row using trigger's row_number
- `setMetrics` (Set metrics): Flags metrics for test runner extraction
- `checkIfEvaluating` (Check if evaluating): Routes based on execution context

### Test Runner Service

Location: `packages/cli/src/evaluation.ee/test-runner/test-runner.service.ee.ts`

Key methods:
- `runTest()`: Main orchestration
- `runDatasetTrigger()`: Fetches dataset using forceCustomOperation
- `runTestCase()`: Executes single test with pinned data
- `extractMetrics()`: Collects user-defined and predefined metrics

### Database Schema

```mermaid
erDiagram
    Workflow ||--o{ TestRun : "has many"
    TestRun ||--o{ TestCaseExecution : "has many"
    TestCaseExecution ||--|| Execution : "linked to"
```

**Metrics Storage:**
- `TestCaseExecution.metrics`: JSON object storing individual test case metrics (e.g., `{"correctness": 0.8, "latency": 1200}`)
- `TestRun.metrics`: JSON object storing aggregated metrics across all test cases, same structure as individual metrics
- Both use the format: `{ [metricName: string]: number }`

### Frontend State Management

Pinia store: `packages/frontend/editor-ui/src/stores/evaluation.store.ee.ts`

Key features:
- Polling mechanism for running tests:
  ```typescript
  startPollingTestRun(testRunId: string) {
    const pollFn = async () => {
      await this.getTestRun(workflowId, testRunId);
      if (testRun.status === 'running') {
        this.pollingTimeouts[testRunId] = setTimeout(pollFn, 1000);
      }
    };
  }
  ```
- Manages test runs and test case executions separately
- Provides computed properties for workflow-specific runs

## Execution Mode: 'evaluation'

The `evaluation` execution mode is a special mode added to the execution engine.

Key characteristics:
- Defined in `packages/workflow/src/interfaces.ts`
- Supports pinned data like 'manual' mode
- Has separate concurrency control:
  ```typescript
  // packages/cli/src/config/schema.ts
  executions: {
    concurrency: {
      evaluationLimit: {
        env: 'N8N_CONCURRENCY_EVALUATION_LIMIT'
      }
    }
  }
  ```
- Counted as production executions in statistics
- Uses separate queue type in Bull/Redis

## Implementation Quirks

### Canvas Mode Loop Workaround
The loop mechanism is a workaround because:
- n8n doesn't support true loops in workflows
- Each "iteration" is a complete workflow execution
- Frontend coordinates the loop through the `executionFinished` event handler, not the backend
- `_rowsLeft` is a hidden communication channel embedded in the trigger node's output
- The loop only continues if the execution was successful and there's no `destinationNode` specified

### Dataset Fetching
The test runner can't use normal node execution because:
- It needs all rows at once for orchestration
- Normal execution returns one row at a time
- `forceCustomOperation` bypasses parameter-based operation selection

### Concurrency and Queue Management
- Evaluation executions use a separate queue to avoid interfering with production
- Queue type mapping in `packages/cli/src/scaling/queue/queue.constants.ts`
- Allows independent scaling and prioritization

## API Endpoints

Controller: `packages/cli/src/evaluation.ee/test-runs.controller.ee.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:workflowId/test-runs` | GET | List test runs |
| `/:workflowId/test-runs/:id` | GET | Get test run details |
| `/:workflowId/test-runs/:id/test-cases` | GET | Get test cases |
| `/:workflowId/test-runs/new` | POST | Start evaluation |
| `/:workflowId/test-runs/:id/cancel` | POST | Cancel running evaluation |
| `/:workflowId/test-runs/:id` | DELETE | Delete test run |

## Configuration

Environment variables:
- `N8N_CONCURRENCY_EVALUATION_LIMIT`: Max concurrent evaluation executions
- License quotas: `quota:evaluations:maxWorkflows`

## Known Limitations

1. **Google Sheets only**: Dataset source is hardcoded to Google Sheets
2. **No node mocking**: Canvas mode can't mock nodes (test runner mode has limited support)
3. **Sequential execution**: Canvas mode executes sequentially, can't parallelize
4. **Memory limitations**: Large datasets can cause memory issues in test runner mode
5. **No recovery**: Interrupted test runs can't be resumed
6. **Numeric metrics only**: Metrics must be numbers; boolean or string metrics are not supported (note: non-numeric data columns can be displayed in test results, but only numeric values can be used as metrics)
7. **Average-only aggregation**: Test run metrics are calculated as simple averages of test case metrics
