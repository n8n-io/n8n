# Issues — Deferred to Later Phase

Issues identified during the staff-level review that are not blocking for the
current phase. They should be addressed before production use.

## Transpiler

### findVariableReferences scans entire source file
**Module:** `src/transpiler/transpiler.service.ts`

For const-assigned arrow functions, all identifiers in the file are treated as
references, defeating helper function tree-shaking. Every helper gets included
if any one is referenced.

**Impact:** Too many helpers included in compiled output. No correctness issue.

## API

### No pagination on list endpoints
**Module:** `src/api/workflow.controller.ts`, `execution.controller.ts`

All list endpoints return every row with no limit/offset. Will degrade as data
volume grows.

### No input validation library
**Module:** `src/api/` (all controllers)

All validation is ad-hoc `if (!field)` checks. No Zod or schema validation.
Invalid UUIDs, bad dates, NaN versions propagate to the engine.

## CLI

### No signal handling (SIGINT/SIGTERM)
**Module:** `src/cli/commands/*.ts`

Ctrl+C during execution doesn't stop the queue or close the DB connection.
Steps can get stuck in `running` status. Only `main.ts` handles `SIGTERM`.

## Web

### node_modules inside src/web/
**Module:** `src/web/node_modules/`

65MB of vendor code exists locally. The web app manages its own dependencies
separately from the monorepo's pnpm workspace. No local `.gitignore`.

## Graph

### evaluateCondition uses new Function() with no sandboxing
**Module:** `src/graph/workflow-graph.ts`

Condition strings have full global scope access (`process`, `require`, etc.).
Complex conditions with function calls fail silently (evaluate to `false`).
Phase 2: sandboxed evaluation within the compiled module context.

## Database

### synchronize: true — no migration system
**Module:** `src/database/data-source.ts`

TypeORM auto-creates/alters tables. Column renames cause data loss. No migration
files, no migration CLI. Required before any production use.

### No foreign keys between entities
**Module:** `src/database/entities/`

`WorkflowExecution.workflowId` and `WebhookEntity.workflowId` have no FK
constraints. Executions can reference non-existent workflows. Documented as a
deliberate PoC simplification.

### No data retention or cleanup
**Module:** Engine-wide

No mechanism for pruning old execution data. Tables grow unboundedly.

## Transpiler (Phase 2)

### Sleep inside step bodies with transpiler splitting
Splitting step functions at `ctx.sleep()` boundaries with variable capture
across the split. Requires scope analysis, intermediate state serialization,
and continuation function generation.

### Complex condition evaluation with function calls
Conditions like `isGood(value) && !isAmazing(value)` require evaluation inside
the compiled module's scope. Needs sandboxed execution context.

## Engine (Phase 2)

### Per-batch rate limiting
Engine-level `rateLimit: { maxPerSecond: 10 }` on batch steps to prevent
overwhelming external APIs. Currently handled by per-item retry backoff.

### Pause/resume execution during waiting steps
When a step is in `waiting` status (e.g., sleeping or waiting until a date),
there is no way to pause the execution and resume it later. The pause/resume
API only works on running executions, not waiting ones. This requires the
engine to support transitioning `waiting` steps to `paused` and back.

### Redis pub/sub for multi-instance event delivery
In-process event bus doesn't reach SSE clients on other instances. Required
for horizontal scaling.
