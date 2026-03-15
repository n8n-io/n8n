# @n8n/engine

Standalone per-step execution engine for n8n v2. Implements durable workflow
execution with PostgreSQL-backed queue, webhook handling, retry/backoff,
sleep/wait, pause/resume, approval steps, batch processing, cross-workflow
triggering, try/catch error handling, and code-first workflow definitions.

**Documentation:** `docs/engine-v2/`

## Quick Start

```bash
# Start everything (DB + API with hot-reload + Frontend with HMR)
docker compose up

# Or run locally (just DB in Docker)
docker compose up -d postgres
pnpm dev        # Backend API on :3100 (tsx watch)
pnpm dev:web    # Frontend on :3200 (Vite HMR)
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start backend with hot-reload (tsx watch) |
| `pnpm dev:web` | Start frontend Vite dev server |
| `pnpm build` | Build backend TypeScript to dist/ |
| `pnpm test` | Run unit tests (no DB needed) |
| `pnpm test:db` | Start test DB + run all tests (including integration) |
| `pnpm typecheck` | TypeScript type checking |

## Docker

Single multi-target `Dockerfile` with four stages:

| Target | Purpose |
|--------|---------|
| `dev` | API with tsx watch, source mounted as volumes |
| `web` | Frontend Vite dev server, source mounted as volumes |
| `build` | Compiles TypeScript backend + Vite frontend |
| `prod` | Production image serving API + frontend |

### Docker Compose

Three compose files for different environments:

#### Development (`docker-compose.yml`)

Hot-reload for both backend and frontend. Source is mounted as volumes.

```bash
docker compose up                # All services (DB + API + Web)
docker compose up -d postgres    # Just the database
```

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5433 | PostgreSQL dev database |
| `api` | 3100 | Backend with tsx watch (hot-reload) |
| `web` | 3200 | Vite dev server (HMR) |

#### Testing (`docker-compose.test.yml`)

Ephemeral database on tmpfs for fast test runs.

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test
docker compose -f docker-compose.test.yml down
```

#### Performance (`docker-compose.perf.yml`)

k6 + Grafana stack for performance benchmarking.

```bash
docker compose -f docker-compose.perf.yml up -d
k6 run perf/webhook-throughput.js
```

#### Observability (`docker-compose.o11y.yml`)

Prometheus + Grafana stack for metrics collection and dashboards. Shared across
all environments via compose file composition.

```bash
docker compose -f docker-compose.o11y.yml up    # Standalone o11y stack
```

| Service | Port | Description |
|---------|------|-------------|
| `prometheus` | 9090 | Prometheus scraping `/metrics` |
| `grafana` | 3300 | Grafana dashboards (auto-provisioned) |

#### Scaling (`docker-compose.scaling.yml`)

Multi-instance deployment with 3 engine instances, Redis for event relay,
and Traefik for load balancing.

```bash
docker compose -f docker-compose.scaling.yml -f docker-compose.o11y.yml up
```

| Service | Port | Description |
|---------|------|-------------|
| `engine-1/2/3` | -- | 3 engine instances (internal network) |
| `redis` | 6379 | Redis for cross-instance event relay |
| `traefik` | 3100 | Load balancer routing to engine instances |
| `postgres` | 5433 | Shared PostgreSQL database |

#### Compose file composition

The compose files are designed to be layered with `-f` flags:

```bash
# Development with o11y (default `pnpm dev`)
docker compose -f docker-compose.yml -f docker-compose.o11y.yml up

# Scaling with o11y
docker compose -f docker-compose.scaling.yml -f docker-compose.o11y.yml up

# Performance with o11y
docker compose -f docker-compose.perf.yml -f docker-compose.o11y.yml up
```

#### Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Development stack + o11y (Prometheus + Grafana) |
| `pnpm dev:scaling` | 3 engine instances + Redis + Traefik + o11y |
| `pnpm dev:perf` | Performance stack (k6 + Grafana) + o11y |
| `pnpm dev:o11y` | Standalone Prometheus + Grafana |
| `pnpm scaling:up` | Start scaling stack in background (detached) |
| `pnpm scaling:down` | Stop scaling stack and remove volumes |

## URLs

| Environment | Frontend | API | Database |
|-------------|----------|-----|----------|
| Development | http://localhost:3200 | http://localhost:3100 | `localhost:5433` |
| Production | http://localhost:3100 | http://localhost:3100 | `localhost:5433` |
| Test DB | -- | -- | `localhost:5434` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://engine:engine@localhost:5433/engine` | PostgreSQL connection string |
| `PORT` | `3100` | HTTP server port |
| `REDIS_URL` | -- | Redis connection string. If set, enables cross-instance event relay for horizontal scaling. If absent, events stay in-process. |
| `MAX_CONCURRENCY` | `10` | Maximum concurrent step executions per instance |

## CLI

```bash
engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]
engine run <file.ts> [--input '{}']
engine watch <execution-id>
engine list [--workflow <id>] [--status <status>]
engine inspect <execution-id>
engine bench <file.ts> [--iterations 100]
```

## API Endpoints

### Workflows
```
POST   /api/workflows                    Create workflow (transpiles code)
PUT    /api/workflows/:id                Save new version
GET    /api/workflows/:id                Get latest (or ?version=N)
GET    /api/workflows/:id/versions       List versions
DELETE /api/workflows/:id                Soft-delete
POST   /api/workflows/:id/activate       Register webhooks
POST   /api/workflows/:id/deactivate     Remove webhooks
```

### Executions
```
POST   /api/workflow-executions                Start execution
GET    /api/workflow-executions                List (filter: workflowId, status)
GET    /api/workflow-executions/:id            Get execution
GET    /api/workflow-executions/:id/steps      Get step executions
GET    /api/workflow-executions/:id/stream     SSE event stream
POST   /api/workflow-executions/:id/cancel     Cancel
POST   /api/workflow-executions/:id/pause      Pause (optional resumeAfter)
POST   /api/workflow-executions/:id/resume     Resume
DELETE /api/workflow-executions/:id            Delete
```

### Step Executions
```
GET    /api/workflow-step-executions/:id           Get step details
POST   /api/workflow-step-executions/:id/approve   Approve/decline
```

### Webhooks
```
ALL    /webhook/:path    Incoming webhook handler (4 response modes)
```

### System
```
GET    /health    Health check (ok/degraded/error)
GET    /metrics   Prometheus metrics
```

## Project Structure

```
packages/@n8n/engine/
├── src/
│   ├── sdk/                    SDK types (defineWorkflow, ExecutionContext, errors)
│   │   ├── types.ts                StepDefinition, BatchStepDefinition, BatchResult,
│   │   │                           TriggerWorkflowConfig, ExecutionContext,
│   │   │                           WebhookSchemaConfig, InferTriggerData, WorkflowSettings
│   │   ├── errors.ts               NonRetriableError
│   │   └── index.ts                defineWorkflow, webhook factory functions
│   ├── engine/                 Core engine services
│   │   ├── create-engine.ts        Factory that wires all services together
│   │   ├── engine.service.ts       startExecution, cancel, pause, resume
│   │   ├── step-processor.service  processStep, loadStepFunction, buildStepContext
│   │   ├── step-planner.service    planNextSteps, gatherStepInput
│   │   ├── step-queue.service      PostgreSQL poller with adaptive polling
│   │   ├── batch-executor.service  Fan-out/aggregate batch steps (3 failure strategies)
│   │   ├── workflow-trigger.service Cross-workflow triggering and await
│   │   ├── completion.service      checkExecutionComplete, CAS guard, metrics
│   │   ├── broadcaster.service     SSE event delivery to HTTP clients
│   │   ├── event-bus.service       Typed in-process event emitter with wildcards
│   │   ├── event-bus.types.ts      Typed event interfaces (step/execution/webhook)
│   │   ├── event-handlers.ts       step:completed/failed/cancelled + execution handlers
│   │   └── errors/                 Error hierarchy and classifier
│   │       ├── engine-error.ts         Base EngineError class
│   │       ├── error-classifier.ts     buildErrorData, classifyError, calculateBackoff
│   │       ├── http.error.ts           HTTP-related errors
│   │       ├── infrastructure.error.ts StepFunctionNotFoundError
│   │       └── step-timeout.error.ts   StepTimeoutError
│   ├── graph/                  WorkflowGraph class (DAG traversal, conditions)
│   │   ├── graph.types.ts          GraphNodeData, GraphEdgeData, GraphStepConfig
│   │   └── workflow-graph.ts       DAG validation, traversal, error handlers, batch IDs
│   ├── transpiler/             TypeScript -> compiled step functions (ts-morph + esbuild)
│   │   ├── transpiler.service.ts   Full pipeline: parse, extract, typecheck, codegen
│   │   ├── zod-to-json-schema.ts   Converts Zod AST expressions to JSON Schema
│   │   └── source-map.service.ts   Stack trace remapping placeholder
│   ├── database/               TypeORM entities and repositories
│   │   ├── entities/               3 entities (workflow, webhook, execution + step execution)
│   │   ├── repositories/           4 repositories
│   │   ├── enums.ts                ExecutionStatus, StepStatus, StepType
│   │   └── data-source.ts          PostgreSQL DataSource factory
│   ├── api/                    Express REST API
│   │   ├── server.ts               Express app factory with CORS + error handling
│   │   ├── workflow.controller     CRUD + versioning + activate/deactivate
│   │   ├── execution.controller    Start, cancel, pause, resume, SSE
│   │   ├── step-execution.controller  Approve/decline
│   │   ├── webhook.controller      4 response modes + schema validation
│   │   └── validate-webhook-schema Ajv-based webhook body/query/headers validation
│   ├── web/                    Vue 3 frontend (Vite SPA)
│   │   ├── src/views/              WorkflowList, WorkflowEditor, ExecutionInspector,
│   │   │                           WorkspaceView (unified editor + execution)
│   │   ├── src/stores/             workflow.store, execution.store (Pinia)
│   │   ├── src/components/         StatusBadge, JsonViewer, StepCard, GraphCanvas,
│   │   │                           ExecutionGraph, CodeEditor (CodeMirror 6)
│   │   ├── src/composables/        useGraphLayout (Dagre-based positioning)
│   │   └── src/utils/              Node rendering helpers:
│   │                               batch-node, sleep-node, trigger-workflow-node,
│   │                               json-schema-faker (test data generation from schemas)
│   ├── cli/                    CLI commands
│   │   └── commands/               execute, run, watch, list, inspect, bench
│   └── main.ts                 Application entry point (wires everything)
├── examples/                   21 main example workflows + 61 use-case examples
│   └── use-cases/                  61 ported workflow patterns (f01-f54)
├── perf/                       k6 performance test scripts
│   ├── webhook-throughput.js       Webhook load testing
│   ├── execution-latency.js        Execution latency measurement
│   ├── run.sh                      Runner script
│   └── grafana/                    Grafana dashboard configs
├── test/                       Test helpers and fixtures
│   ├── helpers.ts                  createTestDataSource, cleanDatabase
│   ├── fixtures.ts                 Predefined workflow source strings
│   └── integration/                13 integration test suites (need PostgreSQL)
├── o11y/                       Observability configs (Prometheus + Grafana)
│   ├── prometheus.yml              Prometheus scrape config
│   └── grafana/                    Grafana provisioning and dashboards
├── docker-compose.yml          Development (hot-reload)
├── docker-compose.test.yml     Testing (ephemeral DB)
├── docker-compose.perf.yml     Performance (k6 + Grafana)
├── docker-compose.o11y.yml     Observability (Prometheus + Grafana)
├── docker-compose.scaling.yml  Scaling (3 engines + Redis + Traefik)
└── Dockerfile                  Single multi-stage: dev/web/build/prod targets
```

## Testing

Unit tests run without a database:
```bash
pnpm test
```

Integration tests need PostgreSQL (13 test suites):
```bash
pnpm test:db    # Starts test DB, runs all tests, stops DB
```

Or manually:
```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test
docker compose -f docker-compose.test.yml down
```

### Integration Test Suites

| Test File | Coverage |
|-----------|----------|
| `execution-lifecycle.test.ts` | Full execution lifecycle |
| `compilation.test.ts` | Transpiler integration |
| `parallel.test.ts` | Parallel step execution |
| `retry.test.ts` | Retry and backoff |
| `sleep-wait.test.ts` | Sleep/waitUntil durable execution |
| `webhook.test.ts` | Webhook routing and response modes |
| `approval.test.ts` | Human-in-the-loop approval |
| `pause-resume.test.ts` | Pause/resume execution |
| `cancellation.test.ts` | Execution cancellation |
| `streaming.test.ts` | SSE event streaming |
| `concurrency.test.ts` | Concurrent step processing |
| `versioning.test.ts` | Workflow versioning |

### Performance Testing

Requires [k6](https://k6.io/) and a running engine:

```bash
docker compose -f docker-compose.perf.yml up -d
k6 run perf/webhook-throughput.js
WORKFLOW_ID=<id> k6 run perf/execution-latency.js
```

## Example Workflows

### Main Examples (21 files)

| File | Description |
|------|-------------|
| `01-hello-world.ts` | Minimal two-step workflow with manual trigger |
| `02-conditional-logic.ts` | If/else branching based on step output |
| `03-helper-functions.ts` | Steps using local helper functions and shared types |
| `04-parallel-steps.ts` | Parallel branches with `Promise.all` that merge |
| `05-retry-backoff.ts` | Retry with exponential backoff on flaky API calls |
| `06-error-handling.ts` | Retriable vs non-retriable error behavior |
| `07-streaming-output.ts` | Simulated streaming with `ctx.sendChunk()` |
| `08-webhook-echo.ts` | Webhook trigger with Zod schema validation and echo |
| `09-data-pipeline.ts` | 10-step pipeline for benchmarking |
| `10-approval-flow.ts` | Human-in-the-loop approval step that pauses execution |
| `11-sleep-and-resume.ts` | Sleep between steps with durable state |
| `12-multi-wait-pipeline.ts` | Multiple sleeps and `waitUntil` with data passing |
| `13-ai-chat-streaming.ts` | AI agent webhook with streaming response |
| `14-reference-error.ts` | Demonstrates reference error handling |
| `15-retriable-error.ts` | Demonstrates retriable error classification |
| `16-pausable-workflow.ts` | Workflow that can be paused and resumed |
| `17-streaming-webhook.ts` | Webhook with streaming response mode |
| `18-batch-processing.ts` | Batch processing with `ctx.batch()` and failure strategies |
| `19-trigger-workflow.ts` | Cross-workflow triggering with `ctx.triggerWorkflow()` |
| `20-order-routing.ts` | Switch/case routing pattern with icons/colors |
| `21-product-catalog.ts` | Product catalog with Zod schemas and custom styling |

### Use-Case Examples (61 files in `examples/use-cases/`)

Ported workflow patterns covering: simple chains, if/else/switch branching,
error handling, AI starters, multi-output, loops, try/catch, sub-workflows,
merge nodes, filter patterns, webhook callbacks, form handling, and real-world
integrations (Gmail, Telegram, SSL monitoring, SAP, etc.).

## Key Architecture

- **Per-step execution**: Each step is an independent queue job, not a monolithic process
- **PostgreSQL queue**: `SELECT FOR UPDATE SKIP LOCKED` for atomic step claiming
- **Adaptive polling**: Queue poller uses exponential backoff (10ms-1000ms) and wakes immediately on new work
- **Event-driven**: Event bus drives the engine forward (step:completed -> planNextSteps -> checkComplete)
- **Fail-fast with try/catch**: Step failure immediately fails execution unless an error handler (catch block) is defined via `__error__` edges in the graph
- **Batch processing**: `ctx.batch()` fans out items as individual child step executions with three failure strategies (fail-fast, continue, abort-remaining)
- **Cross-workflow triggering**: `ctx.triggerWorkflow()` starts a child workflow and awaits its result, linking parent step to child execution via metadata
- **Crash-safe**: Step outputs persisted before/after execution; stale recovery for stuck steps
- **Versioned workflows**: Each save creates immutable version; executions pin their version
- **Zod schema validation**: Webhook triggers support Zod schemas (body/query/headers) transpiled to JSON Schema and validated with Ajv at request time
- **Type inference**: `webhook()` with Zod schemas provides type-safe `ctx.triggerData` via `InferTriggerData`
- **In-process typechecking**: Transpiler injects SDK type declarations into ts-morph and reports type errors before compilation
- **Event relay**: Abstract `EventRelay` interface with `LocalEventRelay` (no-op, default) and `RedisEventRelay` (Redis pub/sub, when `REDIS_URL` is set). Orchestration is always local. Redis is for cross-instance SSE event delivery only.
- **Prometheus metrics**: `prom-client` exposes execution, step, webhook, error, and event delivery metrics on `GET /metrics`

## Module Dependencies

```
SDK (types + errors)
  |
Transpiler (ts-morph + esbuild + zod-to-json-schema)
  |
Graph (WorkflowGraph -- DAG validation + traversal)
  |
Engine Services:
  EngineService (orchestration)
  StepProcessorService (step execution + context building)
  StepPlannerService (successor planning + input gathering)
  StepQueueService (adaptive PostgreSQL poller)
  BatchExecutorService (fan-out/aggregate batch items)
  WorkflowTriggerService (cross-workflow execution + await)
  CompletionService (execution finalization + metrics)
  BroadcasterService (SSE delivery)
  EngineEventBus (typed event system)
  |
API (Express controllers + webhook schema validation)
  |
Web (Vue 3 SPA + CodeMirror + custom SVG graph rendering)
```

## Documentation

All engine documentation lives in `docs/engine-v2/`:

| Doc | Description |
|-----|-------------|
| @docs/engine-v2/decisions.md | Key design decisions with reasoning |
| @docs/engine-v2/plans/backlog.md | Backlog of planned work |
| @docs/engine-v2/plans/sdk-redesign/ | SDK redesign specification and implementation plan |
| @docs/engine-v2/architecture/overview.md | High-level architecture overview |
| @docs/engine-v2/architecture/database.md | Entities, repositories, enums, state machines |
| @docs/engine-v2/architecture/graph.md | DAG representation, traversal, conditions, error edges |
| @docs/engine-v2/architecture/sdk.md | Public API: defineWorkflow, ctx.step, ctx.batch, ctx.triggerWorkflow, Zod schemas |
| @docs/engine-v2/architecture/transpiler.md | TS->JS compilation, step/batch/sleep/triggerWorkflow extraction, typechecking |
| @docs/engine-v2/architecture/engine.md | Core services: queue, processor, planner, batch executor, workflow trigger, events |
| @docs/engine-v2/architecture/api.md | REST controllers, Express setup, webhook routing, schema validation |
| @docs/engine-v2/architecture/cli.md | CLI commands, createEngine factory, service wiring |
| @docs/engine-v2/architecture/web.md | Vue 3 frontend, stores, components, custom node rendering |
| @docs/engine-v2/architecture/testing.md | Integration tests, fixtures, perf benchmarks, coverage |
