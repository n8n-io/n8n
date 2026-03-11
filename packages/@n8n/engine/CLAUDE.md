# @n8n/engine

Standalone per-step execution engine for n8n v2. Implements durable workflow
execution with PostgreSQL-backed queue, webhook handling, retry/backoff,
sleep/wait, pause/resume, approval steps, and code-first workflow definitions.

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

## Docker Compose

Three compose files for different environments:

### Development (`docker-compose.yml`)

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

### Testing (`docker-compose.test.yml`)

Ephemeral database on tmpfs for fast test runs.

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test
docker compose -f docker-compose.test.yml down
```

### Production (`docker-compose.prod.yml`)

Built assets. Single container serves API + frontend.

```bash
docker compose -f docker-compose.prod.yml up --build
# App available at http://localhost:3100
```

## URLs

| Environment | Frontend | API | Database |
|-------------|----------|-----|----------|
| Development | http://localhost:3200 | http://localhost:3100 | `localhost:5433` |
| Production | http://localhost:3100 | http://localhost:3100 | `localhost:5433` |
| Test DB | — | — | `localhost:5434` |

## CLI

```bash
engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]
engine run <file.ts> [--input '{}']
engine watch <execution-id>
engine list [--workflow <id>] [--status <status>]
engine inspect <execution-id>
engine bench <file.ts> --iterations 100
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

## Project Structure

```
packages/@n8n/engine/
├── src/
│   ├── sdk/                    SDK types (defineWorkflow, ExecutionContext, errors)
│   ├── engine/                 Core engine services
│   │   ├── engine.service.ts       startExecution, cancel, pause, resume
│   │   ├── step-processor.service  processStep, loadStepFunction, buildStepContext
│   │   ├── step-planner.service    planNextSteps, gatherStepInput
│   │   ├── step-queue.service      PostgreSQL poller (SELECT FOR UPDATE SKIP LOCKED)
│   │   ├── completion.service      checkExecutionComplete, CAS guard, metrics
│   │   ├── broadcaster.service     SSE event delivery to HTTP clients
│   │   ├── event-bus.service       Typed in-process event emitter
│   │   ├── event-handlers.ts       step:completed/failed/cancelled handlers
│   │   └── errors/                 Error hierarchy and classifier
│   ├── graph/                  WorkflowGraph class (DAG traversal, conditions)
│   ├── transpiler/             TypeScript → compiled step functions (ts-morph + esbuild)
│   ├── database/               TypeORM entities and repositories
│   │   ├── entities/               5 entities (identity, workflow, webhook, execution, step)
│   │   ├── repositories/           5 repositories
│   │   ├── enums.ts                ExecutionStatus, StepStatus, StepType
│   │   └── data-source.ts          PostgreSQL DataSource factory
│   ├── api/                    Express REST API
│   │   ├── server.ts               Express app factory
│   │   ├── workflow.controller     CRUD + versioning + activate/deactivate
│   │   ├── execution.controller    Start, cancel, pause, resume, SSE
│   │   ├── step-execution.controller  Approve/decline
│   │   └── webhook.controller      4 response modes
│   ├── web/                    Vue 3 frontend (Vite SPA)
│   │   ├── src/views/              WorkflowList, WorkflowEditor, ExecutionInspector
│   │   ├── src/stores/             workflow.store, execution.store (Pinia)
│   │   └── src/components/         StatusBadge, JsonViewer, StepCard, GraphCanvas
│   ├── cli/                    CLI commands
│   │   └── commands/               execute, run, watch, list, inspect, bench
│   └── main.ts                 Application entry point (wires everything)
├── examples/                   13 example workflow scripts
├── perf/                       k6 performance test scripts
├── test/                       Test helpers and fixtures
│   ├── helpers.ts                  createTestDataSource, cleanDatabase
│   ├── fixtures.ts                 Predefined workflow source strings
│   └── integration/                Full engine integration tests (need PostgreSQL)
├── docker-compose.yml          Development (hot-reload)
├── docker-compose.test.yml     Testing (ephemeral DB)
├── docker-compose.prod.yml     Production (built assets)
├── Dockerfile                  Multi-stage: dev + prod targets
└── Dockerfile.web              Frontend Vite dev server
```

## Testing

Unit tests run without a database:
```bash
pnpm test
```

Integration tests need PostgreSQL:
```bash
pnpm test:db    # Starts test DB, runs all tests, stops DB
```

Or manually:
```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test
docker compose -f docker-compose.test.yml down
```

### Performance Testing

Requires [k6](https://k6.io/) and a running engine:

```bash
docker compose up -d
k6 run perf/webhook-throughput.js
WORKFLOW_ID=<id> k6 run perf/execution-latency.js
```

Results are visualized in Grafana at http://localhost:3300/d/k6-perf

## Example Workflows

| File | Description |
|------|-------------|
| `hello-world.ts` | Minimal two-step workflow with manual trigger |
| `webhook-echo.ts` | Webhook trigger with input validation and echo response |
| `conditional-logic.ts` | If/else branching based on step output |
| `retry-backoff.ts` | Retry with exponential backoff on flaky API calls |
| `approval-flow.ts` | Human-in-the-loop approval step that pauses execution |
| `streaming-output.ts` | Simulated streaming with `ctx.sendChunk()` |
| `error-handling.ts` | Retriable vs non-retriable error behavior |
| `data-pipeline.ts` | 10-step pipeline for benchmarking |
| `parallel-steps.ts` | Parallel branches with `Promise.all` that merge |
| `ai-chat-streaming.ts` | AI agent webhook with streaming response |
| `sleep-and-resume.ts` | Sleep between steps with durable state |
| `multi-wait-pipeline.ts` | Multiple sleeps and `waitUntil` with data passing |
| `helper-functions.ts` | Steps using local helper functions and shared types |

## Key Architecture

- **Per-step execution**: Each step is an independent queue job, not a monolithic process
- **PostgreSQL queue**: `SELECT FOR UPDATE SKIP LOCKED` for atomic step claiming
- **Event-driven**: Event bus drives the engine forward (step:completed → planNextSteps → checkComplete)
- **Fail-fast**: Step failure immediately marks execution as failed
- **Crash-safe**: Step outputs persisted before/after execution; stale recovery for stuck steps
- **Versioned workflows**: Each save creates immutable version; executions pin their version

## Documentation

All engine documentation lives in `docs/engine-v2/`:

| Doc | Description |
|-----|-------------|
| @docs/engine-v2/plan.md | Original engine v2 design plan |
| @docs/engine-v2/decisions.md | Key design decisions with reasoning |
| @docs/engine-v2/now.md | Issues to address in current phase |
| @docs/engine-v2/later.md | Issues deferred to later phases |
| @docs/engine-v2/architecture/database.md | Entities, repositories, enums, state machines |
| @docs/engine-v2/architecture/graph.md | DAG representation, traversal, conditions |
| @docs/engine-v2/architecture/sdk.md | Public API for workflow authors |
| @docs/engine-v2/architecture/transpiler.md | TS→JS compilation, step extraction, graph derivation |
| @docs/engine-v2/architecture/engine.md | Core execution services, queue, events, error handling |
| @docs/engine-v2/architecture/api.md | REST controllers, Express setup, webhook routing |
| @docs/engine-v2/architecture/cli.md | CLI commands, entrypoint, service wiring |
| @docs/engine-v2/architecture/web.md | Vue 3 frontend, stores, components, graph rendering |
| @docs/engine-v2/architecture/testing.md | Integration tests, fixtures, perf benchmarks, coverage |
