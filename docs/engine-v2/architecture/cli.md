# CLI Documentation

## Overview

CLI commands for the n8n Engine v2. The CLI provides a set of commands to
execute workflows, inspect executions, stream events, list execution history,
run workflow files directly from disk, and benchmark workflow performance.

The binary is registered as `engine` via the `bin` field in `package.json`
(line 23-25), pointing to `./dist/cli/index.js`.

## Architecture

### Entry Point and Command Dispatch

The CLI entry point is `index.ts` (this directory). It does **not** use
Commander.js or any argument parsing library. Instead, it implements a minimal
manual dispatcher:

1. `process.argv` is sliced to extract the command name (line 3-4).
2. A `switch` statement (lines 7-37) dynamically imports the matching command
   module and invokes its exported function, passing the remaining arguments.
3. If no command matches, a usage banner is printed to stdout (lines 39-49)
   and the process exits with code 1 (for unknown commands) or 0 (for no
   command at all) -- see line 50.
4. Top-level errors are caught by `.catch()` on line 54, logged to stderr,
   and the process exits with code 1.

Each command is a standalone async function exported from
`commands/<name>.ts`. There is no shared base class, middleware, or shared
initialization logic -- every command independently handles its own argument
parsing, database connection, service wiring, and teardown.

### Shared Initialization Pattern

Although there is no shared initialization function, five of the six commands
(`execute`, `run`, `watch`, `bench`, and implicitly `list`/`inspect` for
database only) follow a common pattern:

1. Parse arguments manually via a `for` loop over `args`.
2. Call `createDataSource()` and `await dataSource.initialize()`.
3. Instantiate engine services: `EngineEventBus`, `StepPlannerService`,
   `CompletionService`, `StepProcessorService`, `EngineService`.
4. Call `registerEventHandlers(...)` to wire the event-driven engine loop.
5. Create and start `StepQueueService`.
6. Perform the command-specific work.
7. Call `queue.stop()` and `await dataSource.destroy()` for cleanup.

The `list` and `inspect` commands only need the database (no engine services).

## Commands

### execute

**File:** `commands/execute.ts` (93 lines)

**Description:** Executes an existing workflow stored in the database by its
ID. Optionally streams engine events to stdout in real time.

**Usage:**
```bash
engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `<workflow-id>` | Yes | UUID of the workflow to execute |
| `--input '{}'` | No | JSON string passed as trigger data |
| `--watch` | No | Stream all engine events to stdout in real time |
| `--version <n>` | No | Pin execution to a specific workflow version |

**What it does:**
1. Validates the workflow ID is present (line 12-15).
2. Parses `--input`, `--watch`, and `--version` flags via manual loop
   (lines 22-30). The `--input` value is parsed with `JSON.parse` (line 24).
3. Creates and initializes the database connection (lines 32-33).
4. Wires up all engine services: `EngineEventBus`, `StepPlannerService`,
   `CompletionService`, `StepProcessorService`, `EngineService` (lines 35-41).
5. Registers event handlers and starts the step queue (lines 43-44).
6. If `--watch` is enabled, registers an `onAny` listener that prints every
   engine event with a timestamp prefix (lines 46-51).
7. Calls `engineService.startExecution()` with the workflow ID, input,
   `'manual'` mode, and optional version (line 53).
8. **Without `--watch`:** Waits for a terminal event (`execution:completed`,
   `execution:failed`, or `execution:cancelled`) via a Promise, then stops
   the queue and destroys the data source (lines 56-71).
9. **With `--watch`:** Keeps the process alive, logging events. On terminal
   events, stops the queue, destroys the data source, and exits with code 0
   (completed/cancelled) or 1 (failed) (lines 73-92).

**Example:**
```bash
# Execute workflow and wait silently
engine execute abc-123

# Execute with input data and live event streaming
engine execute abc-123 --input '{"name": "test"}' --watch

# Execute a specific version
engine execute abc-123 --version 3 --watch
```

**Engine service interaction:** Uses `EngineService.startExecution()` to
create the execution record and plan initial steps. The `StepQueueService`
polls for and processes pending steps. The `EngineEventBus` drives completion
detection.

---

### run

**File:** `commands/run.ts` (124 lines)

**Description:** Reads a TypeScript workflow file from disk, transpiles it,
saves it to the database as a new workflow, and executes it. This is the
primary developer workflow for testing workflow files locally.

**Usage:**
```bash
engine run <file.ts> [--input '{}']
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `<file.ts>` | Yes | Path to a TypeScript workflow file |
| `--input '{}'` | No | JSON string passed as trigger data |

**What it does:**
1. Validates the file path is present (lines 21-25).
2. Parses the `--input` flag (lines 27-31).
3. Reads the source file from disk using `readFileSync` (lines 35-36).
4. Transpiles the source using `TranspilerService.compile()` (lines 37-38).
5. If compilation produces errors, prints them with line numbers and exits
   with code 1 (lines 40-46).
6. Creates and initializes the database, wires up all engine services
   (lines 48-58).
7. Registers an `onAny` listener that selectively logs `step:completed`,
   `step:failed`, and `execution:*` events (lines 63-73).
8. Saves the workflow to the database with a random UUID, extracting the
   workflow name from the first trigger node or the file name (lines 76-96).
9. Starts execution via `engineService.startExecution()` (line 99).
10. Waits for a terminal event. On completion, prints the result as formatted
    JSON. On failure, prints the error message. Exits with code 0 (success/
    cancelled) or 1 (failure) (lines 103-123).

**Example:**
```bash
# Run a workflow file
engine run examples/hello-world.ts

# Run with input data
engine run examples/webhook-echo.ts --input '{"body": {"message": "hello"}}'
```

**Engine service interaction:** Uses `TranspilerService` to compile the
TypeScript source into an executable graph. Creates a `WorkflowEntity` record
in the database. Then follows the same execution flow as `execute`.

---

### watch

**File:** `commands/watch.ts` (71 lines)

**Description:** Attaches to an existing (in-progress) execution and streams
all engine events for that execution to stdout in real time. If the execution
is already in a terminal state, it advises using `inspect` instead.

**Usage:**
```bash
engine watch <execution-id>
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `<execution-id>` | Yes | UUID of the execution to watch |

**What it does:**
1. Validates the execution ID is present (lines 13-17).
2. Creates and initializes the database (lines 19-20).
3. Looks up the execution record by ID (lines 23-25). If not found, prints
   an error and exits with code 1 (lines 27-31).
4. If the execution is already in a terminal state (`completed`, `failed`,
   `cancelled`), prints a message and returns without streaming (lines 35-39).
5. Wires up engine services and starts the step queue so that the engine can
   continue processing steps while watching (lines 42-49).
6. Registers an `onAny` listener filtered to only the target execution ID
   (line 54). Events from other executions are ignored.
7. On any terminal event (`execution:completed`, `execution:failed`,
   `execution:cancelled`) for the target execution, stops the queue, destroys
   the data source, and exits with code 0 (lines 60-70).

**Example:**
```bash
engine watch 550e8400-e29b-41d4-a716-446655440000
```

**Engine service interaction:** Starts the full engine pipeline (queue +
event handlers) to continue processing the execution while streaming events.
This means `watch` is not a passive observer -- it actively processes steps
if any are pending.

---

### inspect

**File:** `commands/inspect.ts` (95 lines)

**Description:** Displays a detailed post-mortem view of a completed (or
in-progress) execution, including metadata, step timeline with status icons,
and the final result.

**Usage:**
```bash
engine inspect <execution-id>
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `<execution-id>` | Yes | UUID of the execution to inspect |

**What it does:**
1. Validates the execution ID is present (lines 6-10).
2. Creates and initializes the database (lines 12-13).
3. Fetches the execution record (lines 16-18). If not found, prints an error
   and exits with code 1 (lines 20-24).
4. Prints execution metadata: ID, workflow ID + version, status, mode,
   start/finish timestamps, duration breakdown (total, compute, wait), and
   error if present (lines 26-42).
5. Fetches all step executions ordered by creation time (lines 45-50).
6. Prints a step timeline with status icons, step IDs, parent/child
   indicators, attempt numbers, durations, and error messages (lines 52-68).
7. If the execution has a result, prints it as formatted JSON (lines 70-73).
8. Destroys the data source (line 75).

**Status icons** (lines 78-94):
| Icon | Status |
|------|--------|
| `[done]` | completed |
| `[FAIL]` | failed |
| `[skip]` | cancelled |
| `[wait]` | waiting |
| `[hold]` | waiting_approval |
| `[ >> ]` | running |
| `[    ]` | unknown |

**Example:**
```bash
engine inspect 550e8400-e29b-41d4-a716-446655440000
```

**Output example:**
```
=== Execution ===
ID:       550e8400-e29b-41d4-a716-446655440000
Workflow: abc-123 v1
Status:   completed
Mode:     manual
Started:  2026-03-10T12:00:00.000Z
Finished: 2026-03-10T12:00:01.234Z
Duration: 1234ms (compute: 800ms, wait: 434ms)

=== Step Timeline ===
  [done] greet -- completed (120ms)
  [done] format -- completed (80ms)

=== Result ===
{
  "formatted": "Hello from Engine v2! (at 2026-03-10T12:00:00.123Z)"
}
```

**Engine service interaction:** Read-only. Only uses the database to fetch
execution and step records. Does not start the engine or queue.

---

### list

**File:** `commands/list.ts` (54 lines)

**Description:** Lists recent executions in a tabular format, with optional
filtering by workflow ID and/or status.

**Usage:**
```bash
engine list [--workflow <id>] [--status <status>]
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `--workflow <id>` | No | Filter by workflow UUID |
| `--status <status>` | No | Filter by execution status (e.g., `completed`, `failed`, `running`) |

**What it does:**
1. Parses `--workflow` and `--status` flags (lines 5-11).
2. Creates and initializes the database (lines 13-14).
3. Builds a query selecting execution ID, workflow ID, version, status, mode,
   start/completion timestamps, and duration (lines 16-28).
4. Orders by creation date descending, limited to 50 results (lines 29-30).
5. Applies optional `WHERE` clauses for workflow ID and status (lines 32-33).
6. Prints results using `console.table()` with truncated UUIDs (first 8
   chars + `...`) for readability (lines 37-51).
7. Destroys the data source (line 53).

**Example:**
```bash
# List all recent executions
engine list

# List only failed executions
engine list --status failed

# List executions for a specific workflow
engine list --workflow abc-123
```

**Engine service interaction:** Read-only. Only queries the database. Does
not start the engine or queue.

---

### bench

**File:** `commands/bench.ts` (128 lines)

**Description:** Benchmarks a workflow file by running it multiple times and
reporting latency statistics (min, max, average, P50, P95, P99, throughput).

**Usage:**
```bash
engine bench <file.ts> [--iterations 100]
```

**Arguments and Options:**
| Argument/Option | Required | Description |
|----------------|----------|-------------|
| `<file.ts>` | Yes | Path to a TypeScript workflow file |
| `--iterations <n>` | No | Number of iterations (default: 10) |

**What it does:**
1. Validates the file path is present (lines 17-21).
2. Parses the `--iterations` flag (lines 23-28, default 10).
3. Reads and compiles the workflow file (lines 31-34). Exits on compilation
   errors (lines 36-39).
4. Wires up all engine services and starts the queue (lines 42-55).
5. Saves the workflow to the database with name `'Benchmark'` (lines 58-73).
6. Runs the workflow `iterations` times sequentially (lines 81-101):
   - For each iteration, records `performance.now()` before and after.
   - Starts execution with input `{ iteration: i }` in `'test'` mode.
   - Waits for `execution:completed` or `execution:failed` events.
   - Prints progress every 10% of iterations.
7. Computes and prints statistics (lines 107-124):
   - Total, Average, Min, Max, P50, P95, P99, Throughput (executions/sec).
8. Stops queue and destroys data source (lines 126-127).

**Example:**
```bash
# Quick benchmark (10 iterations)
engine bench examples/hello-world.ts

# Longer benchmark
engine bench examples/data-pipeline.ts --iterations 1000
```

**Engine service interaction:** Same as `run` (transpile + save + execute),
but repeated `iterations` times with latency measurement. Each iteration
creates a new execution but reuses the same saved workflow record. Event
listeners for completed/failed are registered per-iteration but **never
removed** (see Issues section).

---

## Main Entrypoint

**File:** `src/main.ts` (79 lines)

The `main.ts` file bootstraps the full application server (not the CLI). It
is the entry point for `pnpm dev` (via `tsx watch src/main.ts`).

### Initialization Sequence

1. **Database** (lines 21-23): Creates a `DataSource` via `createDataSource()`
   and calls `initialize()`. The database URL defaults to
   `postgres://engine:engine@localhost:5433/engine` (from `data-source.ts`
   line 13). Uses `synchronize: true` for automatic schema creation.

2. **Seed data** (line 26): Calls `seedExampleWorkflows(dataSource)` to
   populate example workflows on first run.

3. **Service wiring** (lines 28-34): Manually instantiates all engine
   services -- no dependency injection container is used:
   - `EngineEventBus` -- typed in-process event emitter
   - `TranspilerService` -- TypeScript-to-graph compiler
   - `StepPlannerService` -- determines next steps after completion
   - `CompletionService` -- checks if execution is complete
   - `StepProcessorService` -- executes individual steps
   - `EngineService` -- orchestrates execution lifecycle
   - `BroadcasterService` -- SSE event delivery to HTTP clients

4. **Event handlers** (line 37): Calls `registerEventHandlers()` to wire
   the event-driven engine loop (step:completed -> plan next -> check
   complete).

5. **Step queue** (lines 40-41): Creates and starts `StepQueueService`,
   which polls PostgreSQL for pending steps using
   `SELECT FOR UPDATE SKIP LOCKED`.

6. **Express app** (lines 44-51): Creates the Express application via
   `createApp()`, passing all services as dependencies.

7. **Static files** (lines 53-64): If `dist/web` exists, serves the frontend
   as static files with SPA fallback (non-API routes serve `index.html`).

8. **HTTP server** (lines 66-69): Listens on `PORT` environment variable
   (default 3100).

### Graceful Shutdown

Lines 72-76 register a `SIGTERM` handler that:
1. Stops the step queue poller.
2. Destroys the database connection.
3. Exits with code 0.

**Notable:** Only `SIGTERM` is handled. `SIGINT` (Ctrl+C) is not explicitly
handled, which means the default Node.js behavior applies (immediate
termination without cleanup).

## Data Flow

```mermaid
flowchart TD
    subgraph CLI["CLI Entry (index.ts)"]
        ARGV["process.argv"] --> SWITCH["switch(command)"]
    end

    SWITCH -->|execute| EXEC["executeCommand()"]
    SWITCH -->|run| RUN["runCommand()"]
    SWITCH -->|watch| WATCH["watchCommand()"]
    SWITCH -->|inspect| INSPECT["inspectCommand()"]
    SWITCH -->|list| LIST["listCommand()"]
    SWITCH -->|bench| BENCH["benchCommand()"]

    subgraph ReadOnly["Read-Only Commands"]
        INSPECT --> DB_READ["Database Query"]
        LIST --> DB_READ
        DB_READ --> OUTPUT_TABLE["console.table / console.log"]
    end

    subgraph Execution["Execution Commands"]
        RUN -->|"readFileSync"| FILE["TypeScript File"]
        BENCH -->|"readFileSync"| FILE
        FILE -->|"source"| TRANSPILER["TranspilerService.compile()"]
        TRANSPILER -->|"graph + code"| SAVE["Save WorkflowEntity to DB"]
        SAVE --> START_EXEC

        EXEC --> START_EXEC["EngineService.startExecution()"]

        START_EXEC -->|"creates"| EXECUTION["WorkflowExecution record"]
        START_EXEC -->|"plans"| INITIAL_STEPS["Initial StepExecution records"]

        INITIAL_STEPS --> QUEUE["StepQueueService (poller)"]
        QUEUE -->|"SELECT FOR UPDATE SKIP LOCKED"| PROCESSOR["StepProcessorService"]
        PROCESSOR -->|"emits"| EVENT_BUS["EngineEventBus"]

        EVENT_BUS -->|"step:completed"| PLANNER["StepPlannerService.planNextSteps()"]
        PLANNER -->|"new steps"| QUEUE

        EVENT_BUS -->|"step:completed/failed"| COMPLETION["CompletionService.checkComplete()"]
        COMPLETION -->|"execution:completed/failed"| EVENT_BUS

        EVENT_BUS -->|"terminal event"| CLEANUP["queue.stop() + dataSource.destroy()"]
    end

    subgraph Watch["Watch Command"]
        WATCH -->|"checks status"| DB_CHECK["DB: Find execution"]
        DB_CHECK -->|"in-progress"| FULL_ENGINE["Start full engine pipeline"]
        FULL_ENGINE --> EVENT_BUS
        EVENT_BUS -->|"filtered by executionId"| STREAM_OUT["console.log events"]
    end
```

## Comparison with Plan

The `docs/engine-v2-plan.md` CLI section (lines 2347-2356) specifies:

```bash
engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]
engine run <file.ts> [--input '{}']
engine watch <execution-id>
engine list [--workflow <id>] [--status <status>]
engine inspect <execution-id>
engine bench <file.ts> --iterations 100
```

**Parity assessment:**

| Planned Command | Implemented | Signature Match | Notes |
|----------------|-------------|-----------------|-------|
| `execute` | Yes | Yes | All flags implemented: `--input`, `--watch`, `--version` |
| `run` | Yes | Yes | `--input` flag implemented |
| `watch` | Yes | Yes | |
| `list` | Yes | Yes | `--workflow` and `--status` filters implemented |
| `inspect` | Yes | Yes | |
| `bench` | Yes | Yes | `--iterations` flag implemented, default 10 |

All six commands specified in the plan are implemented with matching
signatures. The plan's CLI section is minimal (just the usage lines), and the
implementation matches it exactly. The plan is checked off as complete on
line 3951: `- [x] CLI (execute, run, watch, list, inspect, bench)`.

The plan's project structure (lines 241-249) also matches the actual file
layout exactly.

## Issues and Improvements

### 1. Duplicated Service Wiring (High Priority)

**Problem:** The service initialization sequence (create DataSource,
instantiate EventBus, StepPlanner, CompletionService, StepProcessor,
EngineService, register event handlers, create and start queue) is duplicated
across four commands (`execute.ts` lines 32-44, `run.ts` lines 49-62,
`watch.ts` lines 42-49, `bench.ts` lines 43-55) and also in `main.ts`
lines 21-41.

**Impact:** Any change to the service wiring (e.g., adding a new service
dependency) must be replicated in five places.

**Recommendation:** Extract a shared `createEngine(dataSource)` factory
function that returns all wired services:

```typescript
function createEngine(dataSource: DataSource) {
  const eventBus = new EngineEventBus();
  const stepPlanner = new StepPlannerService(dataSource);
  const completionService = new CompletionService(dataSource, eventBus);
  const stepProcessor = new StepProcessorService(dataSource, eventBus);
  const engineService = new EngineService(dataSource, eventBus, stepPlanner);
  registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);
  const queue = new StepQueueService(dataSource, stepProcessor);
  return { eventBus, engineService, stepProcessor, stepPlanner, completionService, queue };
}
```

### 2. No Argument Parsing Library

**Problem:** All argument parsing is done manually with `for` loops and index
manipulation (e.g., `execute.ts` lines 22-30, `run.ts` lines 28-31). This
approach:
- Does not validate unknown flags (silently ignores them).
- Does not handle malformed input (e.g., `--input` without a value silently
  skips the flag rather than erroring).
- Does not support `--input='{}'` (equals syntax), only `--input '{}'`.
- Produces inconsistent usage messages (each command has its own `console.error`).

**Recommendation:** Use a lightweight argument parser like Commander.js
(already mentioned in the task), `yargs`, or `meow`. Alternatively, keep the
manual approach but add validation for unknown flags and missing values.

### 3. JSON.parse Without Error Handling

**Problem:** The `--input` flag is parsed with a bare `JSON.parse(args[++i])`
(`execute.ts` line 24, `run.ts` line 30). If the user provides malformed
JSON, the resulting `SyntaxError` propagates to the top-level `.catch()`
handler in `index.ts` line 54, which prints the raw error object -- not a
user-friendly message.

**Recommendation:** Wrap `JSON.parse` in a try/catch with a clear error
message:

```typescript
try {
  input = JSON.parse(args[++i]);
} catch {
  console.error(`Invalid JSON for --input: ${args[i]}`);
  process.exit(1);
}
```

### 4. Missing Signal Handling in CLI Commands

**Problem:** None of the CLI commands register `SIGINT` or `SIGTERM`
handlers. If a user presses Ctrl+C during execution:
- The step queue is not stopped gracefully.
- The database connection is not destroyed.
- In-progress step executions may be left in `running` state in the database.

`main.ts` handles `SIGTERM` (line 72) but not `SIGINT`. The CLI commands
handle neither.

**Recommendation:** Add signal handlers to all execution commands:

```typescript
const shutdown = async () => {
  queue.stop();
  await dataSource.destroy();
  process.exit(130); // Standard exit code for SIGINT
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### 5. Event Listener Leak in bench Command

**Problem:** In `bench.ts`, each iteration registers new `execution:completed`
and `execution:failed` handlers on the event bus (lines 86-93) but never
removes them. After N iterations, there are 2*N listeners accumulated on the
event bus. For large iteration counts (e.g., 1000), this causes:
- Memory pressure from accumulated closures.
- A potential Node.js `MaxListenersExceededWarning` (though the bus sets
  `maxListeners` to 100 in `event-bus.service.ts` line 17).

**Recommendation:** Remove listeners after each iteration resolves, or use
`once()` semantics:

```typescript
await new Promise<void>((resolve) => {
  const handler = (event: ExecutionCompletedEvent | ExecutionFailedEvent) => {
    if (event.executionId === executionId) {
      eventBus.off('execution:completed', handler);
      eventBus.off('execution:failed', handler);
      resolve();
    }
  };
  eventBus.on('execution:completed', handler);
  eventBus.on('execution:failed', handler);
});
```

### 6. Inconsistent Exit Codes

**Problem:** Exit codes are inconsistent across commands:
- `execute.ts` with `--watch`: exits 0 on completed/cancelled, 1 on failed
  (lines 78, 84, 90).
- `execute.ts` without `--watch`: exits implicitly (returns from `main()`,
  which resolves the promise and the process exits naturally). Exit code
  depends on whether unhandled errors occur.
- `run.ts`: always calls `process.exit(exitCode)` with 0 or 1 (line 123).
- `watch.ts`: always exits 0, even when the execution failed (line 65).
- `bench.ts`: exits naturally (no explicit `process.exit`).
- `inspect.ts` and `list.ts`: exit naturally.

**Recommendation:** Define a consistent exit code contract:
- `0` = success / completed
- `1` = execution failed or error
- `2` = usage error (bad arguments)
- `130` = interrupted (SIGINT)

### 7. No Logging Framework

**Problem:** All output uses raw `console.log` / `console.error`. There is
no structured logging, no log levels, and no way to control verbosity. This
makes it difficult to:
- Distinguish between informational output and debug output.
- Pipe structured logs to monitoring systems.
- Suppress verbose output in scripts.

**Recommendation:** For a CLI tool, raw console output is acceptable for
user-facing messages. However, the engine services themselves (queue polling,
event handling) should use a structured logger. Consider adding a `--quiet`
flag for commands like `run` and `execute` that suppresses event streaming.

### 8. watch Command is Not a Passive Observer

**Problem:** The `watch` command starts the full engine pipeline (queue +
event handlers) on lines 42-49. This means it actively processes steps, not
just observes them. If two `watch` processes attach to the same execution,
both will compete for steps via `SELECT FOR UPDATE SKIP LOCKED`. This is
technically safe (the locking prevents double-processing) but semantically
surprising.

**Recommendation:** Document this behavior clearly or consider a passive
mode that only polls the database for status changes without starting the
engine.

### 9. No Help for Individual Commands

**Problem:** There is no `--help` flag support. Each command prints a usage
string only when the required positional argument is missing, but there is
no way to see the full options for a command (e.g.,
`engine execute --help` is treated as an execution with workflow ID `--help`).

**Recommendation:** Check for `--help` or `-h` in each command before parsing
other arguments, and print the usage string.

### 10. Database URL Not Configurable via CLI Flag

**Problem:** The database connection URL is only configurable via the
`DATABASE_URL` environment variable (see `data-source.ts` line 13). There is
no `--database-url` CLI flag. This is fine for server deployment but less
convenient for CLI usage where a user might want to point to different
databases.

**Recommendation:** Add a `--db` or `--database-url` global option that is
passed to `createDataSource()`.

### 11. No --format Flag for Output

**Problem:** `list` outputs using `console.table()` (line 40) and `inspect`
uses a custom text format. Neither supports machine-readable output (JSON).
This makes it difficult to compose CLI commands in scripts.

**Recommendation:** Add a `--format json` option to `list` and `inspect`
that outputs raw JSON for piping and scripting.

### 12. Hardcoded Limit of 50 in list Command

**Problem:** The `list` command has a hardcoded `LIMIT 50` (line 30). There
is no `--limit` or `--offset` flag for pagination.

**Recommendation:** Add `--limit <n>` (default 50) and `--offset <n>`
(default 0) flags.

### 13. run Command Leaves Orphaned Workflow Records

**Problem:** The `run` command creates a new workflow record with a random
UUID every time it is invoked (line 84). These records are never cleaned up.
Repeated use of `engine run` will fill the database with transient workflow
records.

**Recommendation:** Either mark CLI-created workflows with a flag for
periodic cleanup, delete them after execution completes, or use a
deterministic ID based on the file path so reruns overwrite the same record.

### 14. Missing execution:cancelled Handling in bench Command

**Problem:** The `bench` command only listens for `execution:completed` and
`execution:failed` (lines 86-93). If an execution is cancelled, the Promise
never resolves and the benchmark hangs indefinitely.

**Recommendation:** Add a handler for `execution:cancelled`.
