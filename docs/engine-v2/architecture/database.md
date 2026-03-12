# Database Layer Documentation

## Overview

The database layer provides the persistence foundation for the n8n Engine v2. It is responsible for storing workflow definitions (versioned, immutable), execution state, step-level execution records, and webhook registrations. The layer is built on TypeORM with PostgreSQL as the sole supported backend.

The database serves dual purposes:
1. **Definition storage**: Immutable, versioned workflow code, compiled output, and graph data.
2. **Execution state machine**: Durable tracking of workflow and step execution lifecycle, enabling crash recovery, pause/resume, retry, and sleep/wait semantics.

The step execution table (`workflow_step_execution`) also functions as a **job queue** -- the `StepQueueService` polls it using `SELECT FOR UPDATE SKIP LOCKED` to claim and dispatch steps for processing.

## Architecture

### Entity-Relationship Diagram

```mermaid
erDiagram
    WorkflowEntity {
        uuid id PK
        int version PK
        text name
        text code
        text compiledCode
        jsonb triggers
        jsonb settings
        jsonb graph
        text sourceMap
        boolean active
        timestamptz deletedAt
        timestamptz createdAt
    }

    WebhookEntity {
        uuid id PK
        uuid workflowId
        text method
        text path
        timestamptz createdAt
    }

    WorkflowExecution {
        uuid id PK
        uuid workflowId
        int workflowVersion
        text status
        text mode
        jsonb result
        jsonb error
        boolean cancelRequested
        boolean pauseRequested
        timestamptz resumeAfter
        timestamptz startedAt
        timestamptz completedAt
        int durationMs
        int computeMs
        int waitMs
        timestamptz createdAt
        timestamptz updatedAt
    }

    WorkflowStepExecution {
        uuid id PK
        uuid executionId FK
        text stepId
        text stepType
        text status
        jsonb input
        jsonb output
        jsonb error
        int attempt
        timestamptz retryAfter
        timestamptz waitUntil
        text approvalToken
        uuid parentStepExecutionId FK
        timestamptz startedAt
        timestamptz completedAt
        int durationMs
        jsonb metadata
        timestamptz createdAt
        timestamptz updatedAt
    }

    WorkflowEntity ||--o{ WebhookEntity : "workflowId (no FK)"
    WorkflowEntity ||--o{ WorkflowExecution : "workflowId + workflowVersion (no FK)"
    WorkflowExecution ||--o{ WorkflowStepExecution : "executionId (FK, CASCADE)"
    WorkflowStepExecution ||--o{ WorkflowStepExecution : "parentStepExecutionId (self-ref)"
```

### TypeORM Configuration (`data-source.ts`)

The data source factory creates a PostgreSQL connection with these characteristics:

- **Database type**: PostgreSQL only (hardcoded `type: 'postgres'`).
- **Connection URL**: Resolved in order: explicit `url` parameter, `DATABASE_URL` env var, or default `postgres://engine:engine@localhost:5433/engine`.
- **Schema management**: `synchronize: true` -- TypeORM auto-creates/updates tables from entity metadata. This is explicitly marked as a PoC shortcut; no migration files exist.
- **Logging**: Controlled by `DB_LOGGING=true` env var.
- **Entity registration**: All four entities are registered directly in the DataSource constructor.

### Repository Pattern

Each entity has a corresponding repository class that extends TypeORM's `Repository<T>`. Repositories are instantiated manually (not via DI container) by passing the `DataSource` to their constructor. They provide:

- All inherited TypeORM CRUD methods (`find`, `save`, `delete`, `createQueryBuilder`, etc.).
- Custom query methods specific to the domain.

In practice, the engine services often bypass repositories entirely and use `dataSource.getRepository(Entity)` directly for query builder operations. The custom repository classes are only used in tests and for their named query methods.

## Entities

### WorkflowEntity (`workflow.entity.ts`)

**Table name**: `workflow`

Stores immutable, versioned workflow definitions. Each save creates a new row with an incremented version number. Previous versions are never modified or deleted, ensuring that running executions always have access to the exact code and graph they were started with.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | `uuid` | No | -- | Workflow identifier (composite PK with `version`) |
| `version` | `int` | No | -- | Monotonically increasing version number (composite PK with `id`) |
| `name` | `text` | No | -- | Human-readable workflow name |
| `code` | `text` | No | -- | Original TypeScript source code |
| `compiledCode` | `text` | No | -- | Transpiled JavaScript (esbuild output) |
| `triggers` | `jsonb` | No | `[]` | Array of trigger configurations extracted from source |
| `settings` | `jsonb` | No | `{}` | Workflow-level settings (e.g., timeout) |
| `graph` | `jsonb` | No | -- | Parsed step graph (nodes + edges) for UI and engine |
| `sourceMap` | `text` | Yes | `null` | Source map for error tracing |
| `active` | `boolean` | No | `false` | Whether the workflow has registered webhooks |
| `deletedAt` | `timestamptz` | Yes | `null` | Soft-delete timestamp (`null` = not deleted) |
| `createdAt` | `timestamptz` | No | `now()` | Row creation timestamp |

**Primary Key**: Composite `(id, version)`.

**Indexes**:
- `idx_workflow_latest` on `(id, version)` -- supports finding the latest version of a workflow.

**Design notes**:
- `active` and `deletedAt` are per-workflow, not per-version. When toggling activation or soft-deleting, all rows sharing the same `id` are updated.
- There is no separate identity table. The plan document explains this as a simplification to avoid composite FK issues.

### WebhookEntity (`webhook.entity.ts`)

**Table name**: `webhook`

Stores active webhook registrations. Created when a workflow is activated; deleted when deactivated. Used by the webhook controller to route incoming HTTP requests to the correct workflow.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | `uuid` | No | auto-generated | Primary key |
| `workflowId` | `uuid` | No | -- | References workflow (no FK constraint) |
| `method` | `text` | No | -- | HTTP method (`GET`, `POST`, etc.) |
| `path` | `text` | No | -- | URL path segment for routing |
| `createdAt` | `timestamptz` | No | `now()` | Row creation timestamp |

**Constraints**:
- `UNIQUE(method, path)` -- prevents duplicate webhook registrations.

**Indexes**:
- Index on `workflowId` -- for bulk deletion during deactivation.

### WorkflowExecution (`workflow-execution.entity.ts`)

**Table name**: `workflow_execution`

Tracks the lifecycle of a single workflow run. One record per execution. Contains aggregate metrics, status flags for pause/cancel, and references the pinned workflow version.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | `uuid` | No | auto-generated | Primary key |
| `workflowId` | `uuid` | No | -- | References workflow (no FK) |
| `workflowVersion` | `int` | No | -- | Pinned version of the workflow |
| `status` | `text` | No | `'running'` | Current execution status |
| `mode` | `text` | No | `'production'` | Execution mode (production/manual/test) |
| `result` | `jsonb` | Yes | `null` | Final output (last leaf step output) |
| `error` | `jsonb` | Yes | `null` | Error details if execution failed |
| `cancelRequested` | `boolean` | No | `false` | Flag to request cancellation |
| `pauseRequested` | `boolean` | No | `false` | Flag to request pause |
| `resumeAfter` | `timestamptz` | Yes | `null` | Auto-resume timestamp for timed pauses |
| `startedAt` | `timestamptz` | No | `now()` | Execution start time |
| `completedAt` | `timestamptz` | Yes | `null` | Execution end time |
| `durationMs` | `int` | Yes | `null` | Total wall-clock duration |
| `computeMs` | `int` | Yes | `null` | Sum of step compute times |
| `waitMs` | `int` | Yes | `null` | Total wait time (wall - compute) |
| `createdAt` | `timestamptz` | No | `now()` | Row creation timestamp |
| `updatedAt` | `timestamptz` | No | `now()` | Last update timestamp |

**Indexes**:
- `idx_we_workflow` on `(workflowId, createdAt)` -- for listing executions per workflow.
- `idx_we_status` on `(status)` -- for filtering by status.

**Relationships**:
- `OneToMany` to `WorkflowStepExecution` (mapped by `execution`).

### WorkflowStepExecution (`workflow-step-execution.entity.ts`)

**Table name**: `workflow_step_execution`

The core table of the engine. Tracks individual step executions within a workflow run. Also serves as the job queue for the step poller. Supports retry tracking, sleep/wait semantics, approval tokens, and parent-child relationships for fan-out/continuation patterns.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | `uuid` | No | auto-generated | Primary key |
| `executionId` | `uuid` | No | -- | FK to `workflow_execution(id)`, CASCADE delete |
| `stepId` | `text` | No | -- | Stable step identifier (content-hash from graph) |
| `stepType` | `text` | No | `'step'` | One of: trigger, step, approval, condition |
| `status` | `text` | No | `'pending'` | Current step status |
| `input` | `jsonb` | Yes | `null` | Input data from predecessor outputs |
| `output` | `jsonb` | Yes | `null` | Output data from step function |
| `error` | `jsonb` | Yes | `null` | Error details `{ message, stack, code, retriable, timedOut }` |
| `attempt` | `int` | No | `1` | Current attempt number (incremented on retry) |
| `retryAfter` | `timestamptz` | Yes | `null` | When to retry (for `retry_pending` status) |
| `waitUntil` | `timestamptz` | Yes | `null` | When to resume (for `waiting` status) |
| `approvalToken` | `text` | Yes | `null` | Token for approval step verification |
| `parentStepExecutionId` | `uuid` | Yes | `null` | Self-referencing FK for child steps (sleep continuations, fan-out) |
| `startedAt` | `timestamptz` | Yes | `null` | When the step started executing |
| `completedAt` | `timestamptz` | Yes | `null` | When the step finished |
| `durationMs` | `int` | Yes | `null` | Step execution duration |
| `metadata` | `jsonb` | No | `{}` | Extensible metadata (e.g., `functionRef` for continuation steps) |
| `createdAt` | `timestamptz` | No | `now()` | Row creation timestamp |
| `updatedAt` | `timestamptz` | No | `now()` | Last update timestamp |

**Constraints**:
- `UNIQUE(executionId, stepId)` -- prevents duplicate step records within an execution.

**Indexes**:
- `idx_wse_execution` on `(executionId)` -- for loading all steps of an execution.
- `idx_wse_queue` on `(status, retryAfter)` -- for queue polling (queued and retry_pending steps).
- `idx_wse_waiting` on `(status, waitUntil)` -- for polling waiting steps whose timer has elapsed.
- `idx_wse_step_lookup` on `(executionId, stepId, status)` -- for predecessor completion checks.
- `idx_wse_stale` on `(status, startedAt)` -- for stale recovery (finding stuck running steps).
- `idx_wse_exec_status` on `(executionId, status)` -- for completion checks (counting non-terminal steps).

**Relationships**:
- `ManyToOne` to `WorkflowExecution` with `ON DELETE CASCADE`.
- Self-referencing `ManyToOne` / `OneToMany` for parent-child step hierarchy.

## Enums

### ExecutionStatus

Represents the lifecycle status of a workflow execution.

| Value | Description | Terminal? |
|-------|-------------|-----------|
| `running` | Execution is active, steps being processed | No |
| `completed` | All steps completed successfully | Yes |
| `failed` | A step failed (fail-fast) | Yes |
| `cancelled` | User cancelled, all steps are terminal | Yes |
| `waiting` | A step is in `waiting_approval` or `waiting` | No |
| `paused` | User paused, current step finished | No |

### StepStatus

Represents the lifecycle status of a step execution.

| Value | Description | Terminal? |
|-------|-------------|-----------|
| `pending` | Created, not yet queued (waiting for predecessors) | No |
| `queued` | Ready to be claimed by the poller | No |
| `running` | Claimed by a worker, function is executing | No |
| `retry_pending` | Failed with retriable error, waiting for `retryAfter` | No |
| `waiting_approval` | Approval step, awaiting external API call | No |
| `waiting` | Sleep/waitUntil, awaiting timer or child step | No |
| `completed` | Step executed successfully | Yes |
| `failed` | Step failed permanently | Yes |
| `cancelled` | Step was cancelled | Yes |
| `skipped` | Conditional branch not taken | Yes |
| `cached` | Output reused from previous execution (replay) | Yes |

### StepType

Classifies the type of step node.

| Value | Description |
|-------|-------------|
| `trigger` | Entry point (webhook, manual, etc.) |
| `step` | Regular processing step |
| `batch` | Batch processing step (fans out items as child steps) |
| `approval` | Human-in-the-loop approval step |
| `condition` | If/else branching step |
| `sleep` | Durable sleep/wait node |
| `trigger_workflow` | Cross-workflow trigger node |

### Terminal vs Non-Terminal Classification (`enums.ts`, lines 31-46)

```typescript
TERMINAL_STATUSES = [Completed, Failed, Cancelled, Skipped, Cached]
NON_TERMINAL_STATUSES = [Pending, Queued, Running, RetryPending, WaitingApproval, Waiting]
```

These arrays are used by the `CompletionService` to determine when all steps are done and by the `StepQueueService` to identify reclaimable steps.

### State Machine Transitions

#### Execution Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Running : startExecution()
    Running --> Completed : All steps terminal, at least one completed
    Running --> Failed : Step failed (fail fast)
    Running --> Cancelled : cancel_requested + all steps terminal
    Running --> Waiting : Step enters waiting_approval or waiting
    Running --> Paused : pause_requested + current step finished
    Waiting --> Running : Approval resolved or sleep timer expires
    Waiting --> Cancelled : cancel_requested
    Paused --> Running : resume() API call or resume_after timer
    Paused --> Cancelled : cancel_requested
    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

#### Step Execution Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending : Step created
    Pending --> Queued : planNextSteps(), all predecessors complete
    Queued --> Running : Poller claims (SELECT FOR UPDATE)
    Running --> Completed : Step function returns
    Running --> Failed : Non-retriable error or retries exhausted
    Running --> RetryPending : Retriable error + retries remaining
    Running --> Waiting : ctx.sleep() or ctx.waitUntil()
    Running --> Cancelled : cancel_requested
    Running --> WaitingApproval : Approval step
    RetryPending --> Running : retry_after passes, poller claims
    RetryPending --> Cancelled : cancel_requested
    Waiting --> Running : wait_until passes, poller claims child
    Waiting --> Cancelled : cancel_requested
    WaitingApproval --> Completed : POST /approve
    WaitingApproval --> Cancelled : cancel_requested
    Skipped --> [*] : Conditional branch not taken
    Cached --> [*] : Replay with cached output
    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

## Repositories

### WorkflowRepository (`workflow.repository.ts`)

Extends `Repository<WorkflowEntity>`.

| Method | Description |
|--------|-------------|
| `findLatestVersion(workflowId)` | Returns the highest-version row for a workflow, or `null`. |
| `findByIdAndVersion(workflowId, version)` | Returns a specific version, or `null`. |

**Note**: In practice, most engine services bypass this repository and use `dataSource.getRepository('WorkflowEntity')` with query builders directly.

### WebhookRepository (`webhook.repository.ts`)

Extends `Repository<WebhookEntity>`.

| Method | Description |
|--------|-------------|
| `findByMethodAndPath(method, path)` | Looks up a webhook registration by HTTP method and path. Used for routing incoming webhook requests. |

### WorkflowExecutionRepository (`workflow-execution.repository.ts`)

Extends `Repository<WorkflowExecution>`.

No custom methods -- a thin wrapper providing only inherited TypeORM methods. All execution queries in the engine use query builders directly on the data source.

### WorkflowStepExecutionRepository (`workflow-step-execution.repository.ts`)

Extends `Repository<WorkflowStepExecution>`.

| Method | Description |
|--------|-------------|
| `findByExecutionId(executionId)` | Returns all steps for an execution, ordered by `createdAt ASC`. |
| `countNonTerminal(executionId)` | Counts steps not in a terminal status (used for completion checks). |

## Data Flow

### Workflow Creation / Save

```mermaid
sequenceDiagram
    participant Client
    participant API as WorkflowController
    participant Transpiler
    participant DB as PostgreSQL

    Client->>API: POST /api/workflows { name, code }
    API->>Transpiler: compile(code)
    Transpiler-->>API: { code, graph, sourceMap, errors }
    alt Compilation errors
        API-->>Client: 422 { errors }
    else Success
        API->>DB: INSERT INTO workflow (id, version=1, code, compiledCode, graph, ...)
        DB-->>API: saved entity
        API-->>Client: 201 { id, version, graph }
    end

    Note over Client,DB: PUT /api/workflows/:id creates version N+1
    Client->>API: PUT /api/workflows/:id { code }
    API->>DB: SELECT latest version
    API->>Transpiler: compile(code)
    API->>DB: INSERT INTO workflow (id, version=latest+1, ...)
    API-->>Client: 200 { id, version }
```

### Execution Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Engine as EngineService
    participant Planner as StepPlannerService
    participant DB as PostgreSQL
    participant Queue as StepQueueService
    participant Processor as StepProcessorService
    participant Completion as CompletionService
    participant EventBus

    Client->>Engine: startExecution(workflowId)
    Engine->>DB: SELECT workflow (latest version)
    Engine->>DB: INSERT workflow_execution (status=running)
    Engine->>DB: INSERT workflow_step_execution (trigger, status=completed)
    Engine->>Planner: planNextSteps(executionId, triggerNodeId)
    Planner->>DB: Check predecessor completion
    Planner->>DB: INSERT step_execution (status=queued) ON CONFLICT DO NOTHING
    Engine->>EventBus: emit(execution:started)

    loop Poll every 50ms
        Queue->>DB: SELECT FOR UPDATE SKIP LOCKED (queued steps)
        Queue->>DB: UPDATE status=running, startedAt=now()
        Queue->>Processor: processStep(step)
    end

    Processor->>DB: SELECT execution (check cancel_requested)
    Processor->>DB: SELECT workflow (pinned version)
    Processor->>Processor: loadStepFunction(), buildContext()
    Processor->>Processor: Execute step function with timeout

    alt Step succeeds
        Processor->>DB: UPDATE step (status=completed, output=result)
        Processor->>EventBus: emit(step:completed)
        EventBus->>Planner: planNextSteps(successors)
        EventBus->>Completion: checkExecutionComplete()
    else Step fails (retriable)
        Processor->>DB: UPDATE step (status=retry_pending, retryAfter=...)
        Processor->>EventBus: emit(step:retrying)
    else Step fails (permanent)
        Processor->>DB: UPDATE step (status=failed, error=...)
        Processor->>EventBus: emit(step:failed)
        EventBus->>DB: UPDATE execution (status=failed) -- fail fast
    end

    Completion->>DB: COUNT non-terminal steps
    alt All steps terminal
        Completion->>DB: UPDATE execution (status=completed/failed, metrics)
        Completion->>EventBus: emit(execution:completed/failed)
    end
```

### Step Execution Lifecycle

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Pending : StepPlannerService creates step
    Pending --> Queued : All predecessors completed

    state "Queue Poll" as poll {
        Queued --> Running : SELECT FOR UPDATE SKIP LOCKED
    }

    Running --> Completed : Function returns result
    Running --> Failed : Permanent error
    Running --> RetryPending : Retriable error

    state "Sleep/Wait" as sleep {
        Running --> Waiting : ctx.sleep() / ctx.waitUntil()
        Waiting --> ChildCreated : Create continuation child step
        ChildCreated --> Running : Child's waitUntil passes, poller claims
    }

    RetryPending --> Running : retryAfter elapsed, poller re-claims

    Completed --> [*]
    Failed --> [*]
```

## Comparison with Plan

Comparing the implementation against `docs/engine-v2-plan.md` (Database Schema section, lines 573-827).

### Matches the Plan Exactly

- **Workflow table structure**: All columns match (id, version, name, code, compiled_code, triggers, settings, graph, source_map, active, deleted_at, created_at). Composite PK `(id, version)`.
- **Webhook table structure**: All columns match (id, workflow_id, method, path, created_at). UNIQUE on `(method, path)`. No FK to workflow (per plan, "Plain UUID, no FK for PoC simplicity").
- **Workflow execution columns**: All columns match (id, workflow_id, workflow_version, status, mode, result, error, cancel_requested, pause_requested, resume_after, started_at, completed_at, duration_ms, compute_ms, wait_ms, created_at, updated_at).
- **Step execution columns**: All columns match (id, execution_id, step_id, step_type, status, input, output, error, attempt, retry_after, wait_until, approval_token, parent_step_execution_id, started_at, completed_at, duration_ms, metadata, created_at, updated_at). UNIQUE on `(execution_id, step_id)`.
- **Enum values**: Both `ExecutionStatus` and `StepStatus` have identical values.
- **StepType enum**: Expanded beyond the plan. The plan had four values (trigger, step, approval, condition). The implementation adds three more: `batch`, `sleep`, and `trigger_workflow` for the new node types.
- **Terminal/non-terminal classification**: Matches exactly.
- **State machine transitions**: Implementation follows the documented state machines.
- **Step execution indexes**: All six indexes from the plan are present (`idx_wse_execution`, `idx_wse_queue`, `idx_wse_waiting`, `idx_wse_step_lookup`, `idx_wse_stale`, `idx_wse_exec_status`).

### Deviations from the Plan

1. **Missing partial indexes (WHERE clauses)**
   - **Plan**: `idx_we_status` has `WHERE status IN ('running', 'waiting')` partial filter.
   - **Implementation**: `@Index('idx_we_status', ['status'])` -- no partial index filter. TypeORM's decorator does not easily support `WHERE` clauses on indexes.
   - **Plan**: `idx_wse_queue` has `WHERE status IN ('queued', 'retry_pending')`.
   - **Implementation**: No partial filter -- indexes the full table.
   - **Plan**: `idx_wse_waiting` has `WHERE status = 'waiting'`.
   - **Implementation**: No partial filter.
   - **Plan**: `idx_wse_stale` has `WHERE status = 'running'`.
   - **Implementation**: No partial filter.
   - **Impact**: Larger index sizes, slightly slower writes. Negligible at PoC scale but important for production.

2. **Missing `idx_we_paused` index**
   - **Plan** defines `idx_we_paused` on `(status, resume_after) WHERE status = 'paused' AND resume_after IS NOT NULL`.
   - **Implementation**: This index is absent entirely. Auto-resume for timed pauses would require a full table scan.

3. **Missing `idx_wse_parent` index**
   - **Plan** defines `idx_wse_parent` on `(parent_step_execution_id) WHERE parent_step_execution_id IS NOT NULL`.
   - **Implementation**: This index is absent. Parent-child lookups rely on the primary key or the `executionId` index.

4. **Missing CHECK constraints**
   - **Plan** includes CHECK constraints on `status`, `mode`, `step_type`, `status` (step), `attempt > 0`, `duration_ms >= 0`, `compute_ms >= 0`, `wait_ms >= 0`.
   - **Implementation**: No CHECK constraints are defined. TypeORM decorators don't support CHECK constraints declaratively with `synchronize: true`.

5. **Index ordering on `idx_workflow_latest`**
   - **Plan**: `CREATE INDEX idx_workflow_latest ON workflow(id, version DESC)` -- note `DESC` on version.
   - **Implementation**: `@Index('idx_workflow_latest', ['id', 'version'], {})` -- no DESC ordering specified. The standard B-tree index works but is less optimal for "find latest version" queries.

6. **Index ordering on `idx_we_workflow`**
   - **Plan**: `idx_we_workflow ON workflow_execution(workflow_id, created_at DESC)`.
   - **Implementation**: `@Index('idx_we_workflow', ['workflowId', 'createdAt'])` -- no DESC on `createdAt`.

7. **Status column typing**
   - **Plan** uses CHECK constraints to enforce valid status/mode values.
   - **Implementation**: Status and mode columns are typed as plain `text` in TypeORM with TypeScript enum values used at the application layer. No database-level enforcement.

### Missing from the Plan (Added in Implementation)

1. **`TERMINAL_STATUSES` and `NON_TERMINAL_STATUSES` arrays** (`enums.ts`, lines 31-46) -- convenience arrays not mentioned in the plan but essential for the completion check logic.

2. **`WorkflowStepExecution.metadata`** column -- the plan includes this column (`metadata JSONB DEFAULT '{}'`) but does not highlight its use for storing `functionRef` on continuation steps. The implementation uses it creatively to pass the continuation function reference to the step processor.

3. **Self-referencing relationship decorators** on `WorkflowStepExecution` (`parentStep`, `childSteps`) -- the plan defines the column and FK but doesn't mention ORM relationship navigation.

### In the Plan but Not Implemented

1. **`idx_we_paused` index** -- for auto-resume of timed pauses (mentioned above).
2. **`idx_wse_parent` index** -- for parent-child step lookups (mentioned above).
3. **All CHECK constraints** -- data integrity is enforced only at the TypeScript level.
4. **Partial index filters** -- all indexes are full-table; none have WHERE clauses.
5. **`version > 0` CHECK** on the workflow table -- no enforcement that versions are positive.
6. **`mode` CHECK constraint** -- no enforcement that mode is one of `('production', 'manual', 'test')`.

## Issues and Improvements

### Critical Issues

#### 1. `synchronize: true` in Production (`data-source.ts`, line 15)

```typescript
synchronize: true, // Auto-create tables for PoC
```

TypeORM's `synchronize` mode can **drop columns** or alter tables in destructive ways when entity definitions change. This is a well-known footgun:
- Column renames cause the old column to be dropped and a new one created (data loss).
- Type changes can cause data truncation.
- There is no rollback mechanism.

**Recommendation**: Replace with proper TypeORM migrations before any production use. The `synchronize` comment acknowledges this is a PoC shortcut.

#### 2. No Foreign Key from `WorkflowExecution` to `WorkflowEntity`

The `workflowId` + `workflowVersion` columns on `WorkflowExecution` have no FK constraint to `workflow(id, version)`. This means:
- Executions can reference non-existent workflows.
- Workflow deletion doesn't cascade or prevent orphaned executions.
- Data integrity depends entirely on application logic.

The plan explicitly documents this as a deliberate PoC simplification, but it should be addressed before production.

#### 3. No Foreign Key from `WebhookEntity` to `WorkflowEntity`

Same issue -- `webhookEntity.workflowId` is a plain UUID with no FK. Webhook records can outlive their workflow if the application fails to clean up during deactivation.

#### 4. Race Condition in Version Increment (`workflow.controller.ts`, lines 122-160)

The workflow save endpoint:
1. Reads the latest version.
2. Computes `nextVersion = latest.version + 1`.
3. Inserts the new version.

Between steps 1 and 3, another request could read the same latest version and attempt to insert the same version number. The composite PK `(id, version)` would catch this as a unique constraint violation, but it would result in an unhandled 500 error rather than a retry.

**Recommendation**: Use a database sequence or `SELECT ... FOR UPDATE` when computing the next version.

#### 5. Potential Race in `active` / `deletedAt` Cross-Version Updates

When activating/deactivating or soft-deleting a workflow, the controller updates ALL versions with matching `id`:
```sql
UPDATE workflow SET active = true WHERE id = :id
```
If a new version is being inserted concurrently (between the SELECT and UPDATE), it may not receive the `active = true` update. The `PUT` endpoint does carry forward `latest.active`, but there is a window where the values can diverge.

### Performance Concerns

#### 6. Missing Partial Indexes

As noted in the comparison, all indexes are full-table. The queue polling query (`StepQueueService`) runs every 50ms and scans the `idx_wse_queue` index. Without a partial index filtering to only `queued` and `retry_pending` statuses, the index includes all rows regardless of status. At scale, this creates unnecessary index maintenance overhead on every INSERT/UPDATE.

#### 7. Polling Interval is Hardcoded (`step-queue.service.ts`, line 22)

```typescript
private readonly pollIntervalMs: number = 50,
```

50ms polling is aggressive. At scale, this generates 20 queries/second per engine instance regardless of load. Combined with the `SELECT FOR UPDATE SKIP LOCKED` and the join to `workflow_execution`, this could become a bottleneck.

**Recommendation**: Implement adaptive polling (e.g., exponential backoff when queue is empty, immediate re-poll when work was found) or switch to PostgreSQL `LISTEN/NOTIFY`.

#### 8. No Connection Pooling Configuration

The `DataSource` is created with no explicit pool settings. TypeORM's default pool size may be insufficient under load, especially with the 50ms polling interval consuming connections.

#### 9. Unbounded `jsonb` Columns

`input`, `output`, `error`, `result`, `graph`, `triggers`, `settings`, and `metadata` columns are all unbounded `jsonb`. A step producing a large output (e.g., a data pipeline processing megabytes of records) could lead to:
- Slow queries (especially when JSONB is included in SELECT).
- Bloated WAL and replication streams.
- Memory pressure during step planning (gathering inputs from predecessors).

### Data Integrity

#### 10. No Enum Validation at Database Level

The `status`, `mode`, and `stepType` columns are stored as plain `text`. Invalid values can be inserted without error. The plan specifies CHECK constraints for all enum columns, but none are implemented.

#### 11. No Constraint on `attempt > 0` or `duration >= 0`

The plan specifies `CHECK (attempt > 0)`, `CHECK (duration_ms >= 0)`, `CHECK (compute_ms >= 0)`, and `CHECK (wait_ms >= 0)`. None are present in the implementation. Negative durations could be computed if system clocks are not monotonic.

#### 12. Stale Recovery Threshold is Hardcoded (`step-queue.service.ts`, line 121)

```typescript
const defaultStaleThresholdMs = 330_000; // 5 min + 30s buffer
```

The stale recovery threshold does not consider per-step timeout configuration from the workflow graph. A step with a 10-minute timeout would be incorrectly requeued after 5.5 minutes.

**Recommendation**: Either join to the workflow graph to read the step's timeout, or use a conservative global maximum.

#### 13. SQL Injection Risk in `recoverStaleSteps` (`step-queue.service.ts`, line 129)

```typescript
.andWhere(`"startedAt" <= NOW() - INTERVAL '${defaultStaleThresholdMs} milliseconds'`)
```

While `defaultStaleThresholdMs` is currently a hardcoded number (not user input), string interpolation in SQL queries is a pattern that could become dangerous if the value source changes. Use parameterized queries instead.

### Security Concerns

#### 14. Database Credentials in Source Code (`data-source.ts`, line 13)

```typescript
url: url ?? process.env.DATABASE_URL ?? 'postgres://engine:engine@localhost:5433/engine',
```

Default credentials (`engine:engine`) are embedded in source code. While acceptable for local development, this pattern risks accidentally using weak credentials in production if `DATABASE_URL` is not set.

#### 15. `approvalToken` is Stored in Plain Text

The `approvalToken` column on `WorkflowStepExecution` is plain `text`. If approval tokens are security-sensitive (e.g., used to authorize actions), they should be hashed.

### Missing Features

#### 16. No Migration System

There are no migration files, no migration CLI, and no versioning of schema changes. Any schema evolution requires manual intervention or relies on `synchronize: true`.

#### 17. No Soft-Delete Filtering by Default

Soft-deleted workflows (where `deletedAt IS NOT NULL`) are not filtered automatically. Each query must manually check `deletedAt`. TypeORM supports `@DeleteDateColumn` with automatic filtering, but this isn't used.

#### 18. No Audit Trail

There is no tracking of who created/modified workflows or executions. No `createdBy`, `updatedBy`, or `deletedBy` columns exist.

#### 19. Repositories Are Underutilized

The custom repository classes define useful methods (`findLatestVersion`, `countNonTerminal`, etc.), but the engine services mostly bypass them in favor of raw query builders on `dataSource.getRepository(Entity)`. This creates two patterns for the same operations, making the codebase harder to maintain.

**Recommendation**: Consolidate all database queries into repository classes and inject repositories (not the DataSource) into services.

#### 20. No Data Retention or Cleanup

There is no mechanism for pruning old execution data. Over time, the `workflow_execution` and `workflow_step_execution` tables will grow unboundedly. The plan does not address this either, but production use requires a retention policy.
