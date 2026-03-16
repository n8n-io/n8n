# Testing Documentation — @n8n/engine

## Overview

The `@n8n/engine` package uses a two-tier testing strategy:

1. **Unit tests** -- No database required. Exercise pure logic such as the transpiler,
   graph parser, error classification, and SDK types. These run with `pnpm test`.
2. **Integration tests** -- Require a live PostgreSQL instance. Exercise the full
   engine lifecycle: compilation, step queuing, execution, events, and API endpoints.
   These run with `pnpm test:db` (which starts an ephemeral test database on port
   5434 via `docker-compose.test.yml`).

All tests use **vitest** as the test runner. Integration tests are gated behind
`describe.skipIf(!process.env.DATABASE_URL)` so they are silently skipped when no
database is available.

---

## Test Infrastructure

### TestEngine (`test/integration/test-engine.ts`)

The `TestEngine` is the central test harness that wires together every engine service
in-process, bypassing the HTTP layer. It provides a self-contained engine instance
suitable for testing execution mechanics without starting an Express server.

**Setup** (`createTestEngine`, line 31):
- Creates a PostgreSQL DataSource via `createTestDataSource()` (drops and re-creates
  schema on connect).
- Instantiates all core services: `EngineEventBus`, `TranspilerService`,
  `StepPlannerService`, `CompletionService`, `StepProcessorService`, `EngineService`,
  `BroadcasterService`.
- Calls `registerEventHandlers()` to wire the event-driven step lifecycle
  (`step:completed` -> `planNextSteps` -> `checkExecutionComplete`).
- Starts a `StepQueueService` poller with aggressive test parameters:
  **20 max concurrency**, **10 ms poll interval** (production defaults are higher).

**Teardown** (`destroyTestEngine`, line 60):
- Stops the queue poller.
- Removes all event listeners.
- Destroys the DataSource (closes the connection pool).

**Key helper functions:**

| Function | Line | Purpose |
|----------|------|---------|
| `saveWorkflow(engine, source, options?)` | 73 | Compiles source via the transpiler, persists as version 1, returns workflow ID. |
| `saveWorkflowVersion(engine, workflowId, source, options?)` | 108 | Saves a new version of an existing workflow (increments version number). |
| `waitForEvent(eventBus, eventType, executionId, timeoutMs?)` | 153 | Returns a Promise that resolves when a specific event is emitted for a given execution. Default timeout: 10 s. |
| `collectEvents(eventBus, executionId, timeoutMs?)` | 176 | Accumulates all events for an execution until a terminal event (`execution:completed`, `execution:failed`, `execution:cancelled`). Default timeout: 15 s. |
| `executeAndWait(engine, workflowId, triggerData?, timeoutMs?)` | 210 | Convenience: starts an execution and waits for it to reach a terminal state. Returns `{ executionId, status, result?, error? }`. |
| `getExecution(engine, executionId)` | 254 | Loads the `WorkflowExecution` entity from the database. |
| `getStepExecutions(engine, executionId)` | 264 | Loads all `WorkflowStepExecution` records for an execution, ordered by `createdAt ASC`. |
| `getStepExecution(engine, executionId, stepId)` | 279 | Loads a single step execution by step ID. |
| `insertExecution(engine, data)` | 315 | Directly inserts an execution record (for scenario setup). |
| `insertStepExecution(engine, data)` | 298 | Directly inserts a step execution record (for scenario setup). |

### Fixtures (`test/fixtures.ts`)

Predefined workflow source-code strings used by both integration tests and the CLI
`bench` command. Each fixture is a complete TypeScript workflow script.

| Constant | Lines | Description |
|----------|-------|-------------|
| `HELLO_WORLD_SOURCE` | 6-21 | Two sequential steps: greet + format. |
| `LINEAR_3_STEP_SOURCE` | 23-35 | Three sequential steps with value accumulation (1 -> 2 -> 3). |
| `PARALLEL_MERGE_SOURCE` | 37-55 | Prepare -> two parallel steps -> merge. Tests `Promise.all` pattern. |
| `CONDITIONAL_SOURCE` | 57-72 | Fetch -> if/else branching (high vs low value). |
| `RETRY_SOURCE` | 74-92 | Step with `retry: { maxAttempts: 5, baseDelay: 100 }` using a module-level counter. |
| `TEN_STEP_PIPELINE_SOURCE` | 94-113 | Ten sequential steps, each incrementing a value. Used for benchmarking. |
| `FAILING_STEP_SOURCE` | 115-126 | Single step that throws `TypeError`. |
| `APPROVAL_SOURCE` | 128-146 | Step with `stepType: 'approval'`. |

### Helpers (`test/helpers.ts`)

Low-level database utilities.

| Function | Line | Purpose |
|----------|------|---------|
| `createTestDataSource()` | 10 | Creates a TypeORM DataSource pointing to `postgres://engine:engine@localhost:5433/engine_test` (or `DATABASE_URL`). Uses `synchronize: true` and `dropSchema: true` to start fresh each time. |
| `cleanDatabase(ds)` | 23 | Truncates all tables in dependency order: step executions -> executions -> webhooks -> workflows. |

### Setup (`test/setup.ts`)

Minimal bootstrap file that imports `reflect-metadata` (required by TypeORM
decorators). Loaded before all test files.

---

## Integration Test Suites

All integration test files live in `test/integration/` and share a common structure:
- `beforeAll`: creates a `TestEngine` (or manually wires services).
- `afterEach`: cleans the database and clears the step processor module cache.
- `afterAll`: destroys the engine.
- Step IDs are computed as `sha256(stepName).substring(0, 12)` for assertions.

### approval.test.ts

**What it covers:** Human-in-the-loop approval steps, including the API endpoint
`POST /api/workflow-step-executions/:id/approve`.

Unlike other test files, this one wires up a full Express app via `createApp()` and
uses `supertest` for HTTP-level assertions. It does **not** use the `TestEngine`
abstraction -- it manually instantiates all services (lines 38-62).

**Scenario setup** (`createApprovalScenario`, line 82): Creates a workflow, starts
execution, waits for the `prepare` step to complete, then manually sets the
`approval` step to `waiting_approval` status (because the transpiler does not yet
natively support `stepType: 'approval'` -- this is a known gap).

**Key test cases:**

| Test | Lines | What it verifies |
|------|-------|------------------|
| Approval step created with correct type and status | 193-198 | `stepType = approval`, `status = waiting_approval` |
| POST /approve with `approved=true` | 200-219 | Step becomes `completed`, output = `{ approved: true }` |
| POST /approve with `approved=false` | 221-239 | Step becomes `completed`, output = `{ approved: false }` |
| `step:completed` event emitted after approval | 241-267 | Event bus receives the correct event |
| Successor steps planned after approval | 269-307 | Execution reaches terminal state after approval resolves |
| Idempotency: second approval returns 409 | 315-331 | CAS guard prevents double-processing |
| Approval on non-waiting step returns 409 | 333-357 | Already-completed steps cannot be approved |
| Cancel prevents approval | 364-392 | Accepts either 200 or 409 (timing-dependent) |
| Missing `approved` field returns 400 | 400-407 | Input validation |
| Non-boolean `approved` returns 400 | 409-416 | Input validation |

### cancellation.test.ts

**What it covers:** Execution cancellation at various points in the lifecycle.

**Key test cases:**

| Test | Lines | What it verifies |
|------|-------|------------------|
| Cancel queued step before execution | 44-101 | `cancelRequested` flag set; execution reaches terminal state |
| Running step completes but successor not planned | 107-169 | Step A completes with output preserved; step B is undefined or cancelled |
| `execution:cancelled` event emitted | 175-231 | `execution:cancel_requested` event fires |
| Cancel does not pick up `retry_pending` step | 237-277 | Retry-pending step not re-queued after cancel |
| Cancel during parallel execution | 283-346 | Merge step never completes; all branches stop at next boundary |
| Completed step output preserved after cancel | 352-427 | First step output `{ output: 'preserved' }` survives cancellation |

### compilation.test.ts

**What it covers:** The `TranspilerService` -- both unit-level (no DB) and
integration-level (with DB persistence).

**Unit tests (no DATABASE_URL required):**

| Test | Lines | What it verifies |
|------|-------|------------------|
| Valid script produces code, graph, source map | 27-46 | All compilation artifacts are non-empty |
| Syntax errors handled | 52-72 | Either errors reported or empty graph |
| Duplicate step name produces error | 78-95 | Error message contains "Duplicate step name" |
| Empty script produces error | 101-108 | Error message contains "Empty source" |
| Whitespace-only produces error | 110-115 | Same as empty |
| Script without `defineWorkflow` | 121-131 | Error mentions `defineWorkflow` |
| `defineWorkflow` without `run()` | 137-150 | Error mentions `run()` |
| `run()` with no `ctx.step()` calls | 156-172 | Error mentions `ctx.step()` |
| Helper functions included in output | 178-201 | Compiled code contains `double` |
| Unreferenced helpers excluded (tree-shaking) | 207-235 | `used` present, `unused` absent |
| Transitive helper dependencies included | 241-270 | Both `wrapper` and `base` in output |
| TypeScript types stripped | 276-307 | No `: Item` in compiled output |
| Retry config parsed from step options | 313-342 | Graph node has correct `retryConfig` |
| Deterministic compilation | 348-367 | Same source produces identical graph and code |

**Integration tests (require DATABASE_URL):**

| Test | Lines | What it verifies |
|------|-------|------------------|
| Stores `compiled_code` and graph in DB | 394-425 | Graph has trigger + step nodes |
| Compilation errors prevent save | 431-443 | `saveWorkflow` throws; DB is empty |
| Compiled code executes correctly | 449-479 | `multiply(6, 7) * 2 = 84` |

### concurrency.test.ts

**What it covers:** Correctness under concurrent conditions: CAS guards, duplicate
step prevention, and independent parallel executions.

| Test | Lines | What it verifies |
|------|-------|------------------|
| Exactly one `execution:completed` event (CAS guard) | 45-97 | `completedCount = 1`, no duplicates |
| Parallel merge step queued exactly once | 103-134 | `ON CONFLICT DO NOTHING` prevents duplicate step creation |
| 5 concurrent executions complete independently | 140-177 | All complete; each has unique ID and correct result |
| `step:started` before `step:completed` ordering | 183-231 | Event ordering verified via index comparison |
| Diamond pattern: merge step created once | 237-268 | Single merge step with `sum = 2` |
| CAS guard prevents double finalization in DB | 274-320 | UPDATE with WHERE terminal status affects 0 rows |

### execution-lifecycle.test.ts

**What it covers:** Core happy-path execution: start to finish, event emission,
data flow, metrics, and version pinning.

| Test | Lines | What it verifies |
|------|-------|------------------|
| Simple 2-step workflow end-to-end | 44-67 | Output = `{ formatted: 'Hello from Engine v2! Done.' }` |
| 10-step pipeline | 73-107 | Output = `{ val: 10 }`, 11 step records (trigger + 10 steps) |
| Trigger step materialization with data | 113-140 | Trigger step output = provided trigger data |
| `execution:started` and `execution:completed` events | 146-186 | Both event types present |
| `step:started` event ordering | 192-237 | Started before completed for same step |
| Version pinning across saves | 243-291 | V1 execution returns `{ version: 1 }`, V2 returns `{ version: 2 }` |
| Execution with null trigger data | 297-315 | Completes normally |
| Execution metrics (durationMs, computeMs) | 321-347 | Both >= 0, timestamps defined |
| Predecessor output passed as step input | 353-389 | `consume` step input keyed by `produce`'s step ID |

### parallel.test.ts

**What it covers:** Parallel branch execution, merge semantics, fail-fast behavior,
and complex graph patterns.

| Test | Lines | What it verifies |
|------|-------|------------------|
| Two independent steps run in parallel | 40-75 | Both complete with correct outputs |
| Merge step queued when ALL predecessors complete | 81-135 | Merge receives both predecessors' outputs keyed by step ID |
| Fail-fast on branch failure | 141-175 | Execution fails; merge step never completes |
| Three-way merge | 181-222 | `total = 60`; merge input contains all three outputs |
| Diamond pattern | 228-257 | `sum = 500` (200 + 300) |
| Sequential dependency ordering | 263-293 | `{ order: 3, prev: 2 }` |

### pause-resume.test.ts

**What it covers:** Execution pause, resume, timed auto-resume, poller filtering,
and edge cases.

**Pause -- Basic** (line 45):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Successor not planned after pause | 46-112 | Second step undefined when paused |
| In-flight step completes normally during pause | 114-163 | Running step output preserved |
| No successor steps planned while paused | 165-219 | Step B and C undefined |
| Execution status changes to `paused` | 221-264 | Status is `Paused` or `Completed` (timing) |
| `execution:paused` event emitted | 266-318 | Event received |
| Queued steps not picked up while paused | 320-369 | Poller filters on `pauseRequested=false` |

**Resume** (line 376):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Resume sets `pauseRequested=false`, `status=running` | 377-433 | DB state verified |
| `execution:resumed` event emitted | 435-502 | Event received |
| Successor steps planned after resume | 504-583 | Second step completes with `{ v: 2 }` |

**Timed pause** (line 590):

| Test | Lines | What it verifies |
|------|-------|------------------|
| `resumeAfter` timestamp stored | 591-631 | Within 5 s of specified time |
| Manual resume before `resumeAfter` clears it | 633-691 | `resumeAfter = null`, `pauseRequested = false` |

**Pause edge cases** (line 698):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Double-pause is idempotent | 699-755 | No throw; still paused |
| Pausing completed execution is a no-op | 757-783 | Status remains `Completed` |

### retry.test.ts

**What it covers:** Retry mechanics: retriable vs non-retriable errors, backoff,
attempt counting, exhaustion.

| Test | Lines | What it verifies |
|------|-------|------------------|
| Retriable error -> `retry_pending` -> eventual failure | 43-106 | `step:retrying` event emitted; execution fails |
| Successful retry on 2nd attempt | 112-145 | Result = `{ success: true, attempts: 2 }` |
| Retries exhausted -> execution failed | 151-180 | Status `Failed`; step has error recorded |
| `TypeError` is non-retriable | 186-219 | No `step:retrying` events; immediate failure |
| `step:retrying` event with attempt and error info | 225-283 | Attempt >= 2, `retryAfter` and error defined |
| Exponential backoff | 289-333 | At least 1 retrying event with timestamp |
| `ReferenceError` is non-retriable | 339-368 | Failed on attempt 1 |
| Attempt counter incremented | 374-422 | Attempts start at 2 and increase sequentially |

### sleep-wait.test.ts

**What it covers:** Durable sleep (`ctx.sleep()`) and `ctx.waitUntil()`: child step
creation, parent/child relationships, wait timing, data flow across sleep boundaries,
error propagation, and cancellation interaction.

**Sleep -- Basic mechanics** (line 48):

| Test | Lines | What it verifies |
|------|-------|------------------|
| `ctx.sleep()` triggers `step:waiting` event | 49-85 | Parent step status = `Waiting` |
| Parent step status changes to `waiting` | 87-115 | Not `Completed` or `Failed` |
| Child step has correct `wait_until` timestamp | 117-151 | Within expected range |
| Child step has `parentStepExecutionId` | 153-181 | Points to parent step |
| Child step status is `waiting` | 183-209 | Correct initial status |
| Poller picks up child after `wait_until` | 211-234 | Execution completes |
| Poller does NOT pick up child before `wait_until` | 236-271 | Child still `waiting`; `waitUntil` in future |

**Sleep -- Child step completion** (line 278):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Child completion marks parent as completed | 279-304 | Parent status = `Completed` |
| Parent output equals child output | 306-336 | Both have `{ magic: 'value' }` |
| Successor steps planned after sleep | 338-368 | After-sleep step returns `{ received: true }` |

**Sleep -- Data flow** (line 375):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Data flows across sleep boundary | 376-403 | `{ token: 'abc123', woke: true }` |

**waitUntil -- Specific date** (line 410):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Child step `wait_until` equals specified date | 411-441 | Near-future date validated |

**Sleep -- Error handling** (line 448):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Child failure propagates to parent | 449-521 | Parent status = `Failed` after manual `step:failed` event |

**Sleep -- Cancellation** (line 528):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Cancel prevents child pickup | 529-566 | Child still `waiting`; `cancelRequested = true` |

**Sleep -- Execution status** (line 573):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Execution stays `running` while step is waiting | 574-601 | Not completed prematurely |
| Execution completes after sleep resolves | 603-627 | Status = `Completed` |

### streaming.test.ts

**What it covers:** `ctx.sendChunk()` streaming: event emission, ordering, DB
persistence semantics.

| Test | Lines | What it verifies |
|------|-------|------------------|
| `sendChunk()` emits `step:chunk` event | 45-84 | Event has correct `executionId`, `data`, `timestamp` |
| Multiple chunks delivered in order | 90-150 | Indices 0, 1, 2; timestamps non-decreasing |
| Chunks NOT persisted to DB | 156-192 | Step output contains only final return value |
| Final step output IS persisted | 198-230 | `{ finalAnswer: 42 }` in step and execution |
| Completion event has final output, not chunks | 236-289 | `step:completed` output = `{ complete: true }`; 2 chunk events |
| Streaming does not interfere with execution flow | 295-334 | Multi-step workflow with chunks completes correctly |

### versioning.test.ts

**What it covers:** Immutable workflow versioning: creation, preservation, pinning,
and specific-version execution.

| Test | Lines | What it verifies |
|------|-------|------------------|
| First save creates version 1 | 35-58 | `version = 1` |
| Subsequent save creates version 2, preserves 1 | 64-107 | Both rows exist; names differ |
| Execution pins `workflowVersion` | 113-134 | Execution record has `workflowVersion = 1` |
| Modifying workflow does not affect past executions | 140-188 | V1 exec has version 1, V2 exec has version 2 |
| Old versions never deleted | 194-228 | 4 versions all present; each has compiled code |
| Execute specific version | 234-300 | Explicitly requesting V1 returns `{ version: 1 }` |

### webhook.test.ts

**What it covers:** Webhook triggers via the HTTP API, including all 4 response
modes, input data extraction, and webhook registration lifecycle.

Like `approval.test.ts`, this file manually wires services and creates an Express
app via `createApp()` with `supertest`.

**Response modes** (line 139):

| Test | Lines | What it verifies |
|------|-------|------------------|
| `lastNode`: returns last step output | 140-160 | `res.body.echo = true` |
| `respondImmediately`: returns 202 immediately | 162-181 | `res.body.status = 'running'` |
| `respondWithNode`: waits for `ctx.respondToWebhook()` | 183-203 | Custom status 201, custom headers, custom body |
| `allData`: returns wrapped result | 205-221 | `res.body.result` defined |
| Unregistered path returns 404 | 223-225 | |
| Wrong HTTP method returns 404 | 227-240 | GET on POST-only webhook |

**Input data** (line 247):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Trigger step output contains body, headers, query, method, path | 248-276 | All fields present and correct |

**Registration** (line 283):

| Test | Lines | What it verifies |
|------|-------|------------------|
| Activate creates webhook record | 284-313 | Record in DB with correct method/path |
| Deactivate deletes webhook record | 315-342 | Record removed |
| Duplicate (method, path) handled with `ON CONFLICT DO NOTHING` | 344-389 | Only one record for the same path/method |

---

## Example Workflows

The 17 example scripts in `examples/` serve as both documentation and manual test
cases. They are organized by complexity and feature.

### Basic

| File | Features Exercised |
|------|--------------------|
| `01-hello-world.ts` | Manual trigger, 2 sequential steps, data passing, step metadata (icon, color, description). |
| `02-conditional-logic.ts` | If/else branching based on step output (`data.amount > 100`). |
| `03-helper-functions.ts` | Reusable helper functions (`slugify`, `buildUrl`, `categorize`), TypeScript interfaces, function composition, transitive dependencies. |
| `09-data-pipeline.ts` | 10-step sequential pipeline (generate -> filter -> map -> sort -> slice -> enrich -> format -> join -> validate -> finalize). Used for benchmarking. |

### Advanced

| File | Features Exercised |
|------|--------------------|
| `04-parallel-steps.ts` | `Promise.all` for parallel branches, merge step combining results. |
| `05-retry-backoff.ts` | `retry: { maxAttempts: 3, baseDelay: 500 }`, `ctx.attempt` counter, exponential backoff. |
| `06-error-handling.ts` | Retriable error (`ECONNREFUSED`, retried) followed by non-retriable error (`TypeError`, immediate failure). |
| `14-reference-error.ts` | `ReferenceError` on undefined variable -- non-retriable, immediate failure. |
| `15-retriable-error.ts` | Network-like failures with `ECONNREFUSED` code, fails twice then succeeds on 3rd attempt. |

### Features

| File | Features Exercised |
|------|--------------------|
| `07-streaming-output.ts` | `ctx.sendChunk()` for word-by-word streaming via SSE. |
| `08-webhook-echo.ts` | Webhook trigger (`webhook('/echo')`), `ctx.triggerData`, `ctx.respondToWebhook()`, `respondWithNode` mode. |
| `10-approval-flow.ts` | `stepType: 'approval'`, human-in-the-loop, conditional branching after approval decision. |
| `11-sleep-and-resume.ts` | `ctx.sleep(5000)`, durable state across sleep boundary. |
| `12-multi-wait-pipeline.ts` | Multiple `ctx.sleep()` and `ctx.waitUntil()` calls in one workflow, data flow across multiple wait boundaries. |
| `13-ai-chat-streaming.ts` | Webhook with streaming: `ctx.sendChunk()` + `ctx.respondToWebhook()`, simulated LLM token generation. |
| `16-pausable-workflow.ts` | Multi-step workflow with 1-2 second delays per step, designed for interactive pause/resume testing. |
| `17-streaming-webhook.ts` | Webhook + streaming combined: word-by-word chunks + final `respondToWebhook()`. |

---

## Performance Tests

### What is benchmarked

Two k6 scripts in `perf/` measure distinct aspects:

**1. `webhook-throughput.js`** (line 1-39):
- Ramp-up from 0 to 50 virtual users over 50 seconds (10 s ramp-up, 30 s sustained,
  10 s ramp-down).
- POSTs to `/webhook/echo` with a JSON payload.
- **Thresholds**: p95 < 500 ms, error rate < 1%.
- Measures raw webhook ingestion throughput.

**2. `execution-latency.js`** (line 1-67):
- 5 virtual users for 30 seconds.
- Each VU starts an execution via `POST /api/workflow-executions`, then polls
  `GET /api/workflow-executions/:id` up to 10 times (200 ms apart) for completion.
- Requires a pre-created workflow (set via `WORKFLOW_ID` env var).
- **Thresholds**: p95 < 2000 ms, error rate < 5%.
- Measures end-to-end execution latency including queue polling overhead.

### How to run

```bash
# 1. Start the perf stack (DB + API + InfluxDB + Grafana)
pnpm perf:up

# 2. Run the k6 tests
pnpm perf
# (or manually: bash perf/run.sh)

# 3. View results in Grafana
open http://localhost:3300/d/k6-perf

# 4. Tear down
pnpm perf:down
```

The `perf/run.sh` script (line 1-105) automates the full flow:
1. Checks that k6 is installed (`brew install k6`).
2. Verifies the perf stack is running at `$API_URL` (default `http://localhost:3101`).
3. Waits up to 30 s for workflows to be seeded.
4. Activates the webhook workflow.
5. Warms up with 3 requests.
6. Runs webhook throughput test, then execution latency test.
7. Outputs results to InfluxDB at `http://localhost:8086/k6`.

### Grafana Dashboard

The Grafana dashboard (`perf/grafana/dashboards/k6-results.json`) has 4 panels:

| Panel | Query | Unit |
|-------|-------|------|
| HTTP Request Duration (ms) | p95, p99, avg of `http_req_duration` | ms |
| Request Rate (req/s) | count of `http_reqs` | req/s |
| Active VUs | mean of `vus` | count |
| Errors | sum of `http_req_failed` | count |

InfluxDB is provisioned as the default datasource (`perf/grafana/provisioning/datasources/influxdb.yml`)
pointing to `http://influxdb:8086` with database `k6`.

---

## Coverage Analysis

```mermaid
graph LR
    subgraph Engine Features
        EL[Execution Lifecycle]
        PA[Parallel Merge]
        RY[Retry / Backoff]
        CN[Cancellation]
        PR[Pause / Resume]
        SW[Sleep / Wait]
        ST[Streaming]
        AP[Approval Steps]
        WH[Webhooks]
        VR[Versioning]
        CO[Compilation]
        CC[Concurrency]
    end

    subgraph Test Files
        T1[execution-lifecycle.test.ts]
        T2[parallel.test.ts]
        T3[retry.test.ts]
        T4[cancellation.test.ts]
        T5[pause-resume.test.ts]
        T6[sleep-wait.test.ts]
        T7[streaming.test.ts]
        T8[approval.test.ts]
        T9[webhook.test.ts]
        T10[versioning.test.ts]
        T11[compilation.test.ts]
        T12[concurrency.test.ts]
    end

    EL --> T1
    PA --> T2
    PA --> T12
    RY --> T3
    CN --> T4
    CN --> T8
    PR --> T5
    SW --> T6
    ST --> T7
    AP --> T8
    WH --> T9
    VR --> T10
    VR --> T1
    CO --> T11
    CC --> T12

    style EL fill:#22c55e
    style PA fill:#22c55e
    style RY fill:#22c55e
    style CN fill:#22c55e
    style PR fill:#22c55e
    style SW fill:#22c55e
    style ST fill:#22c55e
    style AP fill:#22c55e
    style WH fill:#22c55e
    style VR fill:#22c55e
    style CO fill:#22c55e
    style CC fill:#22c55e
```

### Features with test coverage

| Feature | Primary Test File | Cross-covered In |
|---------|-------------------|------------------|
| Execution lifecycle | `execution-lifecycle.test.ts` | `concurrency.test.ts`, `parallel.test.ts` |
| Parallel merge | `parallel.test.ts` | `concurrency.test.ts` |
| Retry / backoff | `retry.test.ts` | `cancellation.test.ts` (retry + cancel) |
| Cancellation | `cancellation.test.ts` | `approval.test.ts`, `sleep-wait.test.ts` |
| Pause / resume | `pause-resume.test.ts` | -- |
| Sleep / wait | `sleep-wait.test.ts` | -- |
| Streaming | `streaming.test.ts` | -- |
| Approval steps | `approval.test.ts` | -- |
| Webhooks (4 modes) | `webhook.test.ts` | -- |
| Versioning | `versioning.test.ts` | `execution-lifecycle.test.ts` |
| Compilation / transpiler | `compilation.test.ts` | -- |
| Concurrency guards | `concurrency.test.ts` | `parallel.test.ts` |

### Gaps in coverage

| Feature | Status | Notes |
|---------|--------|-------|
| Fan-out / fan-in | Not tested | Plan mentions it; no test file exists. |
| SSE event stream endpoint | Not tested | `GET /workflow-executions/:id/stream` not exercised. |
| AI chat streaming (webhook + streaming) | No integration test | Only example `13-ai-chat-streaming.ts` exists. |
| Stale job recovery | Not tested | No test for stuck `running` step re-queuing. |
| Source map error tracing | Not tested | Plan mentions it; `compilation.test.ts` only checks source map exists. |
| Conditional graph edges | Not tested | Conditional branching compiled but no test verifies condition evaluation in the graph. |
| Error classifier (unit) | Not tested here | Mentioned in plan's testing strategy but no test file in this directory. |
| Broadcaster (unit) | Not tested here | Mentioned in plan's testing strategy as unit test. |
| SDK types (unit) | Not tested here | Mentioned in plan's testing strategy. |
| Step timeout | Not tested | `timeout` option appears in examples but is not exercised in any test. |
| Soft-delete workflows | Not tested | `DELETE /api/workflows/:id` endpoint not tested. |
| Execution deletion | Not tested | `DELETE /api/workflow-executions/:id` not tested. |
| Execution listing/filtering | Not tested | `GET /api/workflow-executions?status=...` not tested. |

---

## Comparison with Plan

The `docs/engine-v2-plan.md` "Testing Strategy" section (line 3316) defines the
target test matrix:

| Plan Area | Plan Tool | Plan DB? | Implemented? |
|-----------|-----------|----------|--------------|
| SDK types | vitest | No | **Not in this test directory** (may exist elsewhere). |
| Graph parser + variable analysis | vitest | No | Partially: `compilation.test.ts` tests graph output but not variable analysis in isolation. |
| Source maps | vitest | No | **Not implemented.** Only existence check in `compilation.test.ts`. |
| Error classification | vitest | No | **Not in this test directory.** |
| Engine core | vitest + PostgreSQL | Yes | **Fully implemented** across multiple test files. |
| Queue | vitest + PostgreSQL | Yes | **Implicitly tested** via all integration tests (queue poller is running). No isolated queue tests. |
| Fan-out / fan-in | vitest + PostgreSQL | Yes | **Not implemented.** |
| Sleep/wait | vitest + PostgreSQL | Yes | **Fully implemented** in `sleep-wait.test.ts`. Crash recovery not tested. |
| Pause/resume | vitest + PostgreSQL | Yes | **Fully implemented** in `pause-resume.test.ts`. |
| API lifecycle | vitest + supertest + PostgreSQL | Yes | **Partially implemented** in `approval.test.ts` and `webhook.test.ts`. Missing CRUD tests for workflows and executions. |
| Webhooks (4 modes) | vitest + supertest + PostgreSQL | Yes | **Fully implemented** in `webhook.test.ts`. |
| AI chat streaming | vitest + supertest + PostgreSQL | Yes | **Not implemented** as a test. Only an example file. |
| Broadcaster | vitest | No | **Not in this test directory.** |

The "Performance Testing" section is not a standalone heading in the plan but is
referenced via the "Example Workflows" section (line 2514) and the "Architecture
Limitations" section. The k6 scripts and Grafana dashboard fulfill the intent.

---

## Issues and Improvements

### 1. Test Isolation

**Risk: Medium.** Tests share a PostgreSQL database within each test file. The
`afterEach` hook calls `cleanDatabase()` which truncates all tables, and also calls
`engine.stepProcessor.clearModuleCache()`. This provides good isolation between
test cases within a file.

However, there is a subtle issue: `afterEach` in `approval.test.ts` (line 64-69)
and `webhook.test.ts` (line 96-103) calls `eventBus.removeAllListeners()` and then
re-registers event handlers. If a test fails mid-execution and the `afterEach`
cleanup runs while asynchronous engine events are still in flight, the re-registered
handlers could process stale events from the previous test. This is mitigated by the
database truncation but could cause confusing failures.

**Recommendation:** Consider adding a short delay or awaiting all pending events
before cleanup. Alternatively, create a fresh `TestEngine` per test (slower but
more isolated).

### 2. Flakiness Risks (Timing-Dependent Tests)

**Risk: High.** Several tests are inherently timing-dependent due to the
event-driven architecture:

- **Pause/resume tests** (e.g., line 46-112 in `pause-resume.test.ts`): Many tests
  accept _either_ `Paused` or `Completed` status because the pause may not take
  effect before the workflow finishes. Tests use `if (!paused) return` to skip
  assertions (e.g., line 424, 481, 551, 682, 746). While pragmatic, this means
  the pause behavior is not always actually tested.

- **Cancellation tests** (e.g., line 97 in `cancellation.test.ts`): Accept either
  `Cancelled` or `Completed` status. The comment "depending on timing" appears
  multiple times.

- **Approval cancellation interaction** (line 364-392 in `approval.test.ts`):
  Accepts either 200 or 409 response code.

- **Fixed delays**: Several tests use `await new Promise(resolve => setTimeout(resolve, 200))`
  for synchronization (e.g., line 141 in `approval.test.ts`). These are fragile
  under CI load.

**Recommendation:**
- For pause tests, consider using a workflow with an artificially long step
  (e.g., 2-second delay) to ensure the pause always takes effect before completion.
- Replace fixed delays with event-based synchronization where possible.
- Add `test.retry(2)` for inherently racy tests to reduce CI noise.

### 3. Missing Test Scenarios

- **Crash recovery / stale step detection**: The plan mentions "stale recovery" as a
  key advantage of the per-step model. No test verifies that a step stuck in
  `running` status is re-queued after a timeout.
- **Fan-out / fan-in**: Listed in the plan's testing strategy but not implemented.
- **Source map error tracing**: Plan says source maps enable accurate error
  reporting. No test verifies that a runtime error in a step includes correct
  line numbers from the original TypeScript source.
- **Step timeout**: Examples declare `timeout: 10000` but no test verifies that a
  step exceeding its timeout is terminated.
- **Conditional edge evaluation**: The transpiler generates conditional edges in the
  graph (e.g., `condition: "output.length > 0"`) but no test verifies the engine
  evaluates these conditions correctly.
- **Execution listing and filtering**: No test for `GET /api/workflow-executions`.
- **Soft-delete**: No test for `DELETE /api/workflows/:id`.
- **SSE endpoint**: No test for the `GET /api/workflow-executions/:id/stream` SSE
  endpoint that clients use for real-time updates.
- **Concurrent pause and cancel**: What happens if `pauseExecution` and
  `cancelExecution` are called simultaneously?

### 4. Test Performance

The 10 ms poll interval (line 44 of `test-engine.ts`) and short retry delays
(50 ms in most tests) keep individual tests fast. However:

- **Sleep tests with long durations**: `sleep-wait.test.ts` uses 2-second sleeps
  (line 248) that require cancellation to avoid waiting. The 10-second sleep
  test (line 537) also requires manual cancellation.
- **Timeout values**: Most tests use 10-15 second timeouts. A single stuck test
  can block the suite for that duration.
- **No parallel test execution**: All integration tests run sequentially because
  they share a database. Consider using separate databases (or schemas) per test
  file for parallelism.

**Estimated total runtime:** ~30-60 seconds for the full integration suite (12 files
with ~75 test cases), dominated by database roundtrips and poll intervals.

### 5. Error Scenario Coverage

Error handling is well-covered for the core paths:
- Retriable vs non-retriable error classification (TypeError, ReferenceError).
- Retry exhaustion leading to execution failure.
- Step failure propagating to execution failure (fail-fast).

**Gaps:**
- No test for errors during the `planNextSteps` phase.
- No test for database connection failures mid-execution.
- No test for malformed step output (e.g., non-serializable objects).
- No test for what happens when `sendChunk()` is called after the step
  has already returned (race condition).

### 6. ~~Integration vs Unit Test Balance~~ (IMPROVED)

Unit tests now exist co-located with their source code in `__tests__/` directories:

| Unit Test File | Module |
|----------------|--------|
| `sdk/__tests__/sdk.test.ts` | SDK types and factory functions |
| `graph/__tests__/workflow-graph.test.ts` | Graph parser, traversal, cycle detection, error handlers |
| `engine/__tests__/event-bus.test.ts` | Event bus with typed events and wildcards |
| `engine/__tests__/broadcaster.test.ts` | SSE broadcaster |
| `engine/__tests__/batch-executor.test.ts` | Batch executor fan-out and aggregation |
| `engine/__tests__/workflow-trigger.test.ts` | Cross-workflow trigger service |
| `engine/__tests__/event-handlers.test.ts` | Event handler routing (including error handlers) |
| `engine/__tests__/step-queue-adaptive.test.ts` | Adaptive polling behavior |
| `engine/errors/__tests__/error-classifier.test.ts` | Error classification and backoff |
| `transpiler/__tests__/transpiler.test.ts` | Transpiler pipeline |
| `transpiler/__tests__/zod-to-json-schema.test.ts` | Zod-to-JSON-Schema conversion |
| `api/__tests__/workflow-api.test.ts` | Workflow REST API (requires DB) |
| `api/__tests__/execution-api.test.ts` | Execution REST API (requires DB) |
| `api/__tests__/validate-webhook-schema.test.ts` | Webhook schema validation |
| `database/__tests__/entities.test.ts` | Entity metadata |

### 7. ~~Inconsistent Test Infrastructure~~ (PARTIALLY RESOLVED)

Service wiring is now centralized in `createEngine(dataSource)`, which reduces
but does not eliminate the duplication. Test files that need an Express app
(`approval.test.ts`, `webhook.test.ts`) still manually create it, but the
underlying engine services are wired consistently through the factory.

**Remaining recommendation:** Extend `TestEngine` with an optional `app`
property that creates the Express app, so all test files can use a single
setup pattern.

### 8. Module-Level Counter Anti-Pattern

The retry test in `fixtures.ts` (line 77) uses a module-level `let callCount = 0`
to track attempts across retries. Because the step processor caches compiled modules,
this counter persists across test runs unless `clearModuleCache()` is called.
`afterEach` in most tests calls `clearModuleCache()`, but if a test forgets this,
the counter will carry over and cause unexpected behavior.

The `retry.test.ts` file (line 112-145) also uses this pattern inline. While it
works because module cache is cleared between tests, it is fragile.

**Recommendation:** Use `ctx.attempt` (provided by the engine) instead of
module-level state for tracking retry attempts. Example 05 (`05-retry-backoff.ts`)
correctly demonstrates this pattern.
