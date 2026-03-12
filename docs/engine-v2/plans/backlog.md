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

### Replace manual lucide-paths.ts with proper Lucide package
**Module:** `src/web/src/components/lucide-paths.ts`

Icon SVG paths are manually maintained in a static map. Should use the
`lucide` npm package to access all ~1500 icons dynamically. The challenge
is that the graph canvases render icons as raw SVG `<path>` elements (not
Vue components), so `lucide-vue-next` can't be used directly. Options:
import icon data from `lucide` at build time, or use `lucide-static`.

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

### Per-item graph continuation in batch steps
Currently `ctx.batch()` executes a single function per item. It should
support following a different sub-graph for each item — e.g., batch items
that pass a condition go through one path, items that fail go through
another. This requires the engine to support per-item graph traversal
within a batch, not just a single function call.

### Per-batch rate limiting
Engine-level `rateLimit: { maxPerSecond: 10 }` on batch steps to prevent
overwhelming external APIs. Currently handled by per-item retry backoff.

### Pause/resume execution during waiting steps
When a step is in `waiting` status (e.g., sleeping or waiting until a date),
there is no way to pause the execution and resume it later. The pause/resume
API only works on running executions, not waiting ones. This requires the
engine to support transitioning `waiting` steps to `paused` and back.

### ctx.triggerWorkflow — resolve by ID instead of name
Currently `ctx.triggerWorkflow({ workflow: 'name' })` resolves the target
workflow by name. This should be changed to `workflowId` (UUID) for
production use — name-based lookup is convenient for development but
fragile (renames break references). The transpiler should extract the
workflow ID at compile time if possible.

### Fix integration test failures after SDK redesign
20 integration tests fail after the SDK redesign changes:
- **cancellation.test.ts** (5 tests): Timeouts — likely caused by adaptive
  polling timing changes. Steps never reach terminal state within the
  test timeout. May need longer timeouts or event-based coordination
  instead of fixed delays.
- **webhook.test.ts** (8 tests): Various failures in webhook routing and
  registration. May be related to changes in the workflow controller or
  graph validation at construction time.
- **workflow-api.test.ts** (2 tests): Activate/deactivate webhook record
  creation failures.
- **retry.test.ts** (2 tests): Test fixtures with intentional type errors
  now compile successfully (type errors are warnings). The tests expect
  runtime errors that no longer occur because the code shape changed
  after esbuild transformation.
- **examples.test.ts** (3 tests): Execution result assertions don't
  match — conditional logic, batch processing, and product catalog
  results differ from expectations.

### Redis pub/sub for multi-instance event delivery
In-process event bus doesn't reach SSE clients on other instances. Required
for horizontal scaling.
