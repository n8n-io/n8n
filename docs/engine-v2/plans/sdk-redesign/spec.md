# Engine v2 SDK & Graph Model Redesign

**Status**: Approved (revised)
**Date**: 2026-03-11
**Scope**: Sub-project A — SDK primitives, graph model, transpiler, engine core, infrastructure, and UI changes

---

## Context

The engine v2 PoC validated per-step execution with PostgreSQL queue, but several
architectural decisions need revision:

- Sleep/wait uses error-throwing control flow (SleepRequestedError) with synthetic
  child steps — fragile, anti-pattern, and the continuation mechanism is broken
- Approval steps have no working implementation — the engine never transitions them
  to `waiting_approval` status
- Dependencies are inferred from variable references via regex — fragile and misses
  logical dependencies
- No batch/fan-out primitive
- No cross-workflow triggering
- Fixed 50ms polling regardless of load
- Single-instance only (no Redis pub/sub)
- No per-step timeout tracking at DB level (only in-process Promise.race)
- UI doesn't render streaming chunks, batch results, or distinguish paused vs skipped

This design addresses all of these as a cohesive set of changes.

**Reference**: [Explicit Wait and Approval Nodes — Design Plan](https://www.notion.so/n8n/3205b6e0c94f81be81afe8330fac5824)

---

## 1. SDK Primitives

### 1.1 Step (enhanced with batch)

The `ctx.step()` signature supports two modes based on argument count:

**Regular step (2 args)**:
```typescript
const result = await ctx.step(
  { name: 'Fetch Data', icon: 'globe', color: '#3b82f6' },
  async () => fetchData()
);
```

**Approval step** — a step with `stepType: 'approval'`. The step function returns
context data shown to the approver. The engine pauses execution until the `/approve`
endpoint is called. The step result contains the approval decision:

```typescript
const approval = await ctx.step({
  name: 'Manager Approval',
  stepType: 'approval',
  timeout: 3600000,  // 1 hour — auto-reject if no response
  icon: 'shield-check',
  description: 'Approve payment over $5000',
}, async () => {
  return { amount: 5000, requester: 'alice' };  // context for approver
});

// approval.approved is true/false (set by /approve endpoint)
if (approval.approved) {
  await ctx.step({ name: 'Process Payment' }, async () => charge(approval));
} else {
  await ctx.step({ name: 'Notify Rejection' }, async () => notify(approval));
}
```

**Batch step (3 args — array as second argument)**:
```typescript
const results = await ctx.step(
  {
    name: 'Process Order',
    batch: {
      onItemFailure: 'continue',  // 'fail-fast' | 'continue' | 'abort-remaining'
    },
    retry: { maxAttempts: 3, baseDelay: 500 },  // per-item retry
    timeout: 30000,                               // per-item timeout
  },
  orders,                    // Array<T> — items to process
  async (order, index) => {  // called once per item
    return processOrder(order);
  }
);
// results: Array<{ status: 'fulfilled', value: U } | { status: 'rejected', reason: Error }>
```

The `batch.onItemFailure` strategies:
- **`fail-fast`**: First item failure cancels remaining items, fails the batch step
- **`continue`**: All items run to completion regardless of failures. Results array
  contains both fulfilled and rejected entries (like `Promise.allSettled`)
- **`abort-remaining`**: First item failure cancels remaining items, but the batch
  step completes with partial results (not failed)

**No per-batch concurrency control.** All N child step executions are enqueued
immediately. The engine's queue `maxConcurrency` governs how many steps run across
all executions — this naturally throttles batch children alongside everything else.

**Rate limit handling:** External API rate limits (HTTP 429) are handled via the
per-item `retry` config with exponential backoff. The error classifier already marks
429 as retriable. The backoff naturally spreads retries over time. Workflow authors
should set `retry.maxDelay` appropriately for rate-limited APIs. Engine-level rate
limit detection (e.g., `rateLimit: { maxPerSecond: 10 }`) is a Phase 2 consideration.

Step-level config (`retry`, `timeout`, `retriableErrors`, `retryOnTimeout`) applies
to each item individually — a single item can retry without affecting other items.

### 1.2 Sleep (standalone primitive)

Sleep is a standalone primitive, not called inside a step. It appears as its own
node in the graph with a name and display configuration.

```typescript
await ctx.sleep({
  name: 'Wait for Processing',
  duration: 5000,                              // ms — mutually exclusive with `until`
  icon: 'clock',
  description: 'Waiting 5s for external system',
});

await ctx.sleep({
  name: 'Wait Until Market Opens',
  until: new Date('2026-03-12T09:30:00Z'),     // absolute time
  icon: 'calendar',
});
```

If the duration is computed dynamically (e.g., `duration: calculateDelay()`), the
expression is evaluated at execution time when the engine processes the sleep node.
The transpiler extracts the duration expression and generates a small evaluation
step that runs the expression and passes the result to the Wait node.

Sleep produces no output. The engine creates a step execution record with
`status: waiting` and `waitUntil` timestamp. The queue poller picks it up when the
time elapses and marks it `completed`.

The `SleepRequestedError`, `WaitUntilRequestedError`, continuation functions, and
`continuationRef` are all removed.

### 1.3 Trigger Workflow (new)

```typescript
// Await result — parent step waits for child workflow to complete
const result = await ctx.triggerWorkflow({
  workflowId: 'abc-123',
  input: { orderId: order.id },
  timeout: 60000,
});

// Fire and forget — no await, no waiting
ctx.triggerWorkflow({
  workflowId: 'abc-123',
  input: { orderId: order.id },
});
```

The transpiler detects whether the call is awaited. Awaited calls create a graph
node with `type: 'trigger-workflow'` that enters a waiting state until the child
workflow execution reaches a terminal status.

### 1.4 Streaming (unchanged)

`ctx.sendChunk(data)` and `ctx.respondToWebhook(response)` remain unchanged.

### 1.5 Conditions

Conditions stay as plain JavaScript (`if/else`, `switch/case`). There are two
distinct cases:

**Inside a step** — conditions are part of the step's internal logic. The engine
doesn't see them. One node in the graph, one step execution:

```typescript
await ctx.step({ name: 'Process' }, async () => {
  if (order.type === 'premium') return { discount: 0.2 };  // invisible to graph
  return { discount: 0 };
});
```

**Between steps** — conditions determine which `ctx.step()` calls execute. The
transpiler detects `if/else` and `switch/case` that wrap different step calls
and tags the graph edges with the condition expression:

```typescript
const order = await ctx.step({ name: 'Fetch' }, async () => fetchOrder());

if (order.amount > 100) {
  await ctx.step({ name: 'High Value' }, async () => processHigh(order));
} else {
  await ctx.step({ name: 'Standard' }, async () => processStandard(order));
}

switch (order.category) {
  case 'electronics':
    await ctx.step({ name: 'Electronics' }, async () => handleElectronics());
    break;
  case 'books':
    await ctx.step({ name: 'Books' }, async () => handleBooks());
    break;
  default:
    await ctx.step({ name: 'General' }, async () => handleGeneral());
}
```

**How conditions are represented:**
- The transpiler extracts the condition expression text and tags it on the edge
  (e.g., `condition: "order.amount > 100"`)
- At runtime, simple conditions (property access, comparisons) are evaluated via
  `new Function('output', expression)` in `WorkflowGraph.evaluateCondition()`
- Complex conditions with function calls (e.g., `isGood(value) && !isAmazing(value)`)
  require access to the compiled workflow module's scope. Today these fail silently
  (evaluate to `false`). Full support requires Phase 2 sandboxed evaluation within
  the module context.
- The execution graph shows which branches were taken based on which steps executed.
- No separate condition nodes in the graph. No condition step execution records.
  No condition evaluation results stored — only the path taken is visible.

---

## 2. Dependency Resolution

### Sequential by default

Steps are ordered by their position in the script. The transpiler walks the `run()`
body top-to-bottom and creates edges based on declaration order.

```typescript
async run(ctx) {
  // Sequential: A → B → C
  await ctx.step({ name: 'A' }, async () => { ... });
  await ctx.step({ name: 'B' }, async () => { ... });
  await ctx.step({ name: 'C' }, async () => { ... });
}
```

### Explicit parallelism via Promise.all

```typescript
async run(ctx) {
  await ctx.step({ name: 'Prepare' }, async () => { ... });

  // Fork: Prepare → [D, E] (parallel)
  const [x, y] = await Promise.all([
    ctx.step({ name: 'D' }, async () => { ... }),
    ctx.step({ name: 'E' }, async () => { ... }),
  ]);

  // Merge: [D, E] → F
  await ctx.step({ name: 'F' }, async () => merge(x, y));
}
```

### Variable references (secondary)

Variable references still create edges for data flow visualization. If step B uses a
variable assigned from step A's output, that edge is created. This is redundant with
sequential ordering but makes the graph show explicit data flow.

### No `depends` field

Dropped from the design. Sequential-by-default + `Promise.all` + variable references
cover all real dependency patterns. Authors express parallelism structurally in their
code, not through configuration.

---

## 3. Graph Model

### Workflow Graph (static, save time)

Derived from the script at transpile time. Represents the definition — what *could*
happen.

**Node types**:

| Type | Source | Description |
|------|--------|-------------|
| `trigger` | `webhook()` or implicit manual | Entry point |
| `step` | `ctx.step(def, fn)` | Regular work unit |
| `approval` | `ctx.step({ stepType: 'approval' }, fn)` | Human-in-the-loop gate |
| `batch` | `ctx.step(def, items, fn)` | Fan-out step |
| `sleep` | `ctx.sleep(config)` | Timed pause (Wait node) |
| `trigger-workflow` | `ctx.triggerWorkflow(config)` | Cross-workflow link |

**Edge sources** (in priority order):
1. Script position (sequential-by-default)
2. `Promise.all` grouping (fork/merge)
3. Variable references (data flow)
4. Condition expressions (tagged on edges from if/else, switch/case)

The static workflow graph has no cycles. Batch steps are a single node that expands
at runtime.

**Updated `GraphNodeData` type**:
```typescript
interface GraphNodeData {
  id: string;
  name: string;
  type: 'trigger' | 'step' | 'approval' | 'batch' | 'sleep' | 'trigger-workflow';
  stepFunctionRef: string | null;  // null for sleep and approval nodes
  config: GraphStepConfig;
}
```

Sleep and Approval nodes have `stepFunctionRef: null` — the engine skips function
loading and acts on the node type directly.

### Execution Graph (dynamic, runtime)

Computed at render time by combining the workflow graph with step execution records.
Extends the static graph with:

- **Batch expansion**: Batch node shows summary (`97✓ 3✗`). Collapsed by default.
  Expand on click to see individual items in a side panel — not rendered as graph
  nodes.
- **Paused steps**: When execution is paused, steps that haven't run yet are shown
  as "paused" (waiting for resume) — NOT "skipped". Skipped means "branch not taken"
  and only applies when the execution has reached a terminal state.
- **Sleep resolution**: Shows when the sleep started waiting and when it completed.
- **Approval status**: Shows "awaiting approval" with timer countdown when in
  `waiting_approval`, or the approval result when resolved.
- **Triggered workflows**: Shows child workflow execution status.

**Step status inference for UI:**

| Step record state | Execution Running | Execution Paused | Execution Terminal |
|---|---|---|---|
| No record exists | Pending (gray) | Paused (amber) | Skipped (gray, dimmed) |
| `queued` | Queued (gray) | Paused (amber) | — |
| `pending` | Pending (gray) | Paused (amber) | — |
| `running` | Running (pulse) | Running (pulse) | — |
| `waiting` | Waiting (clock) | Waiting (clock) | — |
| `waiting_approval` | Awaiting approval | Awaiting approval | — |
| `completed` | Completed (green) | Completed (green) | Completed (green) |
| `failed` | Failed (red) | Failed (red) | Failed (red) |
| `cancelled` | Cancelled | Cancelled | Cancelled |

No new database tables needed. The execution graph is derived from existing
`WorkflowStepExecution` records using `parentStepExecutionId` for batch children
and `metadata` JSONB for batch index, triggered workflow ID, etc.

---

## 4. Transpiler Changes

### New primitive detection

The transpiler recognizes four call patterns in the AST:

| Call | Detection | Graph Node Type |
|------|-----------|-----------------|
| `ctx.step(def, fn)` | 2 args, 2nd is function | `step` or `approval` (based on `stepType`) |
| `ctx.step(def, items, fn)` | 3 args, 2nd is not function | `batch` |
| `ctx.sleep(config)` | `ctx.sleep()` call | `sleep` |
| `ctx.triggerWorkflow(config)` | `ctx.triggerWorkflow()` call | `trigger-workflow` |

For approval steps: the transpiler checks `stepType: 'approval'` in the definition
object and sets the graph node type to `'approval'` with `stepFunctionRef` pointing
to the step function (which returns the approval context).

For sleep nodes: the transpiler extracts the `name`, `duration`/`until`, `icon`,
and `description` from the config object literal and stores them in the graph node's
config. If `duration` is a dynamic expression (not a literal), the transpiler notes
it for runtime evaluation.

### Sequential dependency resolution

The transpiler walks `run()` top-to-bottom:

1. Each primitive call creates a graph node
2. The previous node gets an edge to the current node
3. `Promise.all([...])` creates fork edges (previous node → all children) and
   merge edges (all children → next node)
4. `if/else` and `switch` — steps inside branches get conditional edges tagged
   with the condition expression
5. Variable references create additional data-flow edges (secondary to position)

### Removals

- `SleepRequestedError` / `WaitUntilRequestedError` error classes
- Continuation function splitting (`continuationRef`)
- `getContinuationStepId()` / `getContinuationFunctionRef()` from WorkflowGraph
- Regex-based dependency detection as primary mechanism (kept as secondary)

### What stays

- ts-morph for AST parsing
- esbuild for TS→JS compilation
- Step function extraction into standalone exports
- Graph stored as JSONB
- Source map generation
- `isContinuationStep()` and `getFanOutChildStepId()` — retained for batch fan-out

---

## 5. Engine Core Changes

### 5.1 Timeout — Dual Mechanism

Every step supports configurable timeouts via two parallel mechanisms:

**In-process timeout (existing):** `Promise.race` between the step function and a
timer. Catches hung functions within the same process. Fires `StepTimeoutError`.

**DB-level timeout (new):** A `timeoutAt` column on `workflow_step_execution`
(nullable `timestamptz`). Set when the step starts running or enters a waiting state.
Calculated as `startedAt + timeout` or `createdAt + timeout`.

The queue poller picks up timed-out steps:
```sql
-- Existing: pick up steps whose wait elapsed
(wse.status = 'waiting' AND wse.waitUntil IS NOT NULL AND wse.waitUntil <= NOW())

-- New: pick up steps that timed out while waiting for approval
OR (wse.status = 'waiting_approval' AND wse.timeoutAt IS NOT NULL AND wse.timeoutAt <= NOW())
```

When the step processor picks up a timed-out step:
- `waiting_approval` + `timeoutAt <= NOW()` → mark as `failed` with
  `{ code: 'STEP_TIMEOUT', timedOut: true }`. The approval was never received.
- The existing `retryOnTimeout` config determines if it retries or fails permanently.

Both mechanisms run in parallel. Whichever fires first wins. The DB-level timeout
survives process crashes — a key improvement over in-process-only timeout.

### 5.2 Dynamic Polling — Wake-on-Insert + Exponential Decay

Replace the fixed 50ms interval with an event-driven polling strategy:

**Idle state:** Poll every 1000ms (lazy). Near-zero DB load when nothing is happening.

**Wake-up trigger:** When `startExecution()` or `planNextSteps()` inserts new queued
steps, they call `queue.wake()` which immediately triggers a poll cycle and resets
the interval to 10ms (aggressive).

**Exponential decay:** After each empty poll, double the interval:
10ms → 20ms → 40ms → 80ms → 160ms → 320ms → 640ms → 1000ms (cap).
Any poll that finds work resets to 10ms.

This is better than a fixed interval because:
- Zero wasted polls when idle (no polling at all until work arrives)
- Near-zero latency on work arrival (wake-up is immediate, not waiting for timer)
- Smooth decay instead of abrupt state transitions
- Webhook triggers naturally wake the queue via `startExecution()` → `planNextSteps()`

### 5.3 Batch Execution

When the step processor encounters a batch step:

1. Mark parent step as `status: running`
2. Create N child step executions with `parentStepExecutionId` pointing to parent
   and `metadata: { batchIndex: i, batchItem: item }`
3. All children are inserted with `status: 'queued'` immediately — no per-batch
   concurrency control. The engine's queue `maxConcurrency` naturally throttles.
4. On child completion, apply `onItemFailure` strategy:
   - `fail-fast`: Any failure → cancel remaining, fail parent
   - `continue`: All run to completion, parent gets full results array
   - `abort-remaining`: Any failure → cancel remaining, parent gets partial results
5. When all children reach terminal status, mark parent completed with aggregated
   results: `Array<{ status: 'fulfilled', value } | { status: 'rejected', reason }>`

Step-level config (retry, timeout) applies per-item. Each child step has its own
attempt counter and retry scheduling. Parent/child step machinery
(`parentStepExecutionId`, `resolveParentStep`, `failParentStep`) is retained and
used for batch fan-out.

### 5.4 Sleep Execution

When the step processor encounters a sleep node (`type === 'sleep'`):

1. Read sleep configuration from the graph node config (duration or until date)
2. If duration is a dynamic expression, evaluate it
3. Create step execution with `status: waiting`, `waitUntil: now + duration`
4. Queue poller picks it up when `waitUntil <= NOW()`
5. Mark as `completed` with no output
6. Plan next steps (sequential successor)

No child steps, no continuation functions, no error throwing. Sleep nodes have
`stepFunctionRef: null` — the engine skips function loading entirely.

### 5.5 Approval Execution

When the step processor encounters an approval node (`type === 'approval'`):

1. Run the step function to get the approval context (the data shown to the approver)
2. Generate an approval token (UUID)
3. Set status to `StepStatus.WaitingApproval`
4. Store the approval token and context on the step execution record
5. If `timeout` is configured, set `timeoutAt = now + timeout`
6. Emit `step:waiting_approval`
7. Return — the step remains in `waiting_approval` until resolved

Resolution paths:
- **Approved:** `POST /approve` with `{ approved: true }` → step completes with
  `{ approved: true, ...approverData }` → successor planning continues
- **Declined:** `POST /approve` with `{ approved: false }` → step completes with
  `{ approved: false }` → successor planning continues (author uses if/else)
- **Timed out:** Queue poller picks up step when `timeoutAt <= NOW()` → step fails
  with `StepTimeoutError` → fail-fast or retry per config

### 5.6 Cross-Workflow Trigger

**Awaited**:
1. Create step execution with `status: waiting`
2. Start child workflow execution via `EngineService.startExecution()`
3. Store `metadata: { childExecutionId, childWorkflowId }`
4. Event handler listens for child execution completion/failure
5. Resolve parent step with child's result or error

**Non-awaited**:
1. Create step execution that immediately completes
2. Start child workflow execution as side effect
3. No waiting, no result propagation

### 5.7 Removals

- `SleepRequestedError` / `WaitUntilRequestedError` catch blocks in
  `StepProcessorService.processStep()`
- `SleepRequestedError` / `WaitUntilRequestedError` error classes from SDK
- `continuationRef` field from step config
- `getContinuationStepId()` / `getContinuationFunctionRef()` from `WorkflowGraph`
- `sleep(ms)` and `waitUntil(date)` from `ExecutionContext` runtime interface

### 5.8 What's retained for batch/fan-out

- `parentStepExecutionId` column on `WorkflowStepExecution`
- `resolveParentStep()` and `failParentStep()` in event handlers
- `isContinuationStep()` and `getFanOutChildStepId()` / `getBatchChildStepId()`
  in `WorkflowGraph`
- The `parentStepExecutionId` check in the `step:completed` handler

---

## 6. Database Changes

### New column

Add `timeoutAt` to `workflow_step_execution`:

```sql
ALTER TABLE workflow_step_execution ADD COLUMN timeout_at TIMESTAMPTZ;
```

Set when:
- A step starts running: `timeoutAt = startedAt + config.timeout`
- An approval enters `waiting_approval`: `timeoutAt = now + config.timeout`

Used by the queue poller to pick up timed-out steps.

### No other schema changes

Existing columns support the new design:
- `stepType` already has `'approval'` as a value
- `waitUntil` already exists for sleep nodes
- `approvalToken` already exists for approval nodes
- `status` enum already includes `waiting` and `waiting_approval`
- `parentStepExecutionId` remains for batch child steps

---

## 7. Infrastructure & Performance

### 7.1 Docker Compose Configurations

Five compose files for automated benchmarking:

| File | Setup | Purpose |
|------|-------|---------|
| `docker-compose.perf-single.yml` | 1 engine, 1 Postgres | Baseline |
| `docker-compose.perf-multi.yml` | 3 engines, 1 Postgres | Horizontal scaling |
| `docker-compose.perf-redis.yml` | 3 engines, 1 Postgres, 1 Redis | Multi-instance + pub/sub |
| `docker-compose.perf-heavy-db.yml` | 1 engine, 1 Postgres (4 CPU, 2GB) | DB-bound workloads |
| `docker-compose.perf-constrained.yml` | 1 engine (0.5 CPU, 256MB), 1 Postgres | Resource limits |

Each file is self-contained with its own network, ports, and resource limits.

### 7.2 Redis Pub/Sub

For multi-instance deployments:

- Engine events published to Redis channel `execution:{executionId}`
- Each instance subscribes to channels for executions with active SSE clients
- `BroadcasterService` receives events from local event bus AND Redis
- Redis is optional — single-instance mode works without it

### 7.3 Automated Benchmark Script

```bash
./perf/benchmark.sh
```

For each compose configuration:
1. Start stack
2. Wait for readiness
3. Seed workflows
4. Run k6 tests (webhook throughput + execution latency)
5. Collect metrics
6. Tear down
7. Next configuration

Output: markdown comparison report with throughput, p50/p95/p99 latency, and
error rates across all configurations.

---

## 8. UI Changes

### 8.1 Streaming Proof-of-Concept

Minimal implementation to verify the SSE pipeline works end-to-end:

- Step card shows a "streaming" indicator with chunk count (e.g., "12 chunks")
  when `step:chunk` events arrive during execution
- Click to open a modal/panel showing raw chunks in a scrollable log
- Not a production feature — verification only

### 8.2 Batch Visualization

**Execution graph** — batch node collapsed by default:
- Shows summary badge: progress while running (`47/100`), final result (`97✓ 3✗`)
- Progress bar inside node during processing
- Click to expand opens a side panel (not inline graph nodes)

**Side panel** — scrollable item list:
- Each item shows: index, status, duration, output/error
- Filterable: all, succeeded, failed
- Each item expandable to see full input/output/error via JsonViewer
- Summary stats: total, succeeded, failed, duration min/max/avg

### 8.3 New Node Type Visuals

| Node Type | Visual Treatment |
|-----------|------------------|
| `sleep` | Clock icon, dashed border, shows duration or target time |
| `approval` | Shield-check icon, purple accent, shows "Awaiting approval" or result |
| `batch` | Stacked layers icon, item count badge |
| `trigger-workflow` | External link icon, shows target workflow name |

### 8.4 Paused vs Skipped Step Rendering

When an execution is **paused**, steps that haven't executed yet are shown as
"paused" (amber, with a pause icon) — indicating they are waiting for the execution
to be resumed. This is distinct from "skipped" (gray, dimmed) which means the
branch was not taken due to a condition.

"Skipped" is ONLY shown when the execution has reached a terminal state
(`completed`, `failed`, `cancelled`) and a step never ran.

### 8.5 Execution Graph Rendering

The graph canvas distinguishes between:
- **Edit mode**: Workflow graph (static, from transpiler)
- **Execution mode**: Execution graph (workflow graph + step execution overlays,
  batch summaries, paused/skipped indicators, approval status)

---

## 9. Examples Overhaul

### 9.1 Update existing examples

All 17 examples updated to use the new SDK:
- Remove `ctx.sleep()` calls from inside steps → standalone `ctx.sleep()` between
  steps
- Update approval examples to use the new approval flow (step returns context,
  result has `approved` boolean, author uses if/else)

### 9.2 Port code-engine use-cases

Translate code-engine patterns into engine v2 scripting model:

| Code-Engine Pattern | Engine v2 Translation |
|--------------------|-----------------------|
| `@POST('/orders')` → `processOrder()` | `webhook('/orders')` → `ctx.step({ name: 'Process Order' }, ...)` |
| `@POST` → if/else → `processOrder` / `handleInquiry` | `webhook` → `ctx.step` → `if/else` → two `ctx.step` branches |
| `@GET('/products')` → switch → `getElectronics` / `getBooks` | `webhook('/products', { method: 'GET' })` → `ctx.step` → `switch` → branches |
| Sequential `stepOne` → `stepTwo` | Sequential `ctx.step` calls (sequential-by-default) |

---

## 10. Out of Scope

- Production sandboxing (NsJail, isolated-vm) — Phase 2
- Sleep inside step bodies with transpiler splitting — Phase 2
- Variable capture across sleep boundaries — Phase 2
- Poll trigger type — not needed for current use-cases
- `executionMode: 'in-process'` — not implemented
- Mobile/responsive UI — desktop-only
- Complex condition evaluation with function calls — Phase 2
- Per-batch rate limiting — Phase 2
