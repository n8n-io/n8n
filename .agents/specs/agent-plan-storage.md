# Agent plan storage

## Boundary

This storage layer owns plan documents and immutable revision snapshots.
The document has the existing `JsonObject` type. Storage does not interpret its fields.
The caller supplies a positive `formatVersion`. Storage accepts unfamiliar format versions without transformations.

Task/group types and graph rules belong to a later PR. This layer does not own Agent tools,
trace associations, background jobs, UI, or events. It does not validate task states or dependencies.

## Identity and lifecycle

A plan has a caller-generated UUID. Its `threadId` references `agent_execution_threads.id`.
The caller must create the session record before it creates a plan. The SDK memory thread is not the owner.
The caller must authorize access to the thread. Repository methods require the thread ID for every operation.

A thread can have several plans, but at most one active plan. An active plan has no `closedAt` value.
A unique partial index enforces this rule across processes. A separate thread index covers all plans.
Closure releases the active-plan slot and preserves the document. Closure does not imply success or cancellation.
Closed plans cannot change through the storage API. A later plan receives a new UUID.

## Persistence

`agent_plan` stores `id`, `threadId`, `revision`, `formatVersion`, `data`, `closedAt`, `createdAt`, and `updatedAt`.
`agent_plan_history` stores `planId`, `revision`, `formatVersion`, `data`, `closedAt`, and `createdAt`.
The history primary key is `(planId, revision)`. Each history row contains the complete document after a change.

Creation starts at revision 1. Each accepted replacement or closure adds one revision and one snapshot.
The format version identifies the document format. The revision identifies a stored change. These values are independent.
Current rows and snapshots use the same timestamp for each change. History order follows revision numbers, not timestamps.
The database requires positive revision and format-version values.

Deleting a session cascades to all its plans and snapshots. There is no automatic history pruning.

## Repository contract

`AgentPlanRepository` exposes these internal methods:

- `createActivePlan(input, ctx)`: Create the supplied UUID, thread, format version, and document.
- `findActivePlan(threadId, ctx)`: Read the active plan or return `null`.
- `findPlan(threadId, planId, ctx)`: Read a current document, including a closed plan, or return `null`.
- `findRevision(threadId, planId, revision, ctx)`: Read a complete snapshot or return `null`.
- `listHistory(threadId, planId, options, ctx)`: Read revision metadata without documents, in ascending revision order.
- `replacePlan(input, ctx)`: Replace the complete document and format version at the expected active revision.
- `closePlan(input, ctx)`: Close the expected active revision without changing its document or format version.

History pages default to 50 rows and permit 1–100 rows. `afterRevision` is exclusive and defaults to 0.
An empty page represents no matching revisions. `nextCursor` is the last returned revision when more rows exist, or `null`.
Invalid page parameters and write versions produce input errors.

Writes use `BaseRepository` and `TransactionRunner`. Each method requires an `OperationContext`.
A standalone caller passes `{}`. An outer transaction passes its existing context to every repository call.
Errors must propagate out of the outer transaction. Do not catch a write error and commit partial work.

Replacements and closure use a conditional database update against the thread, plan ID, expected revision, and active state.
The current document and its new snapshot commit in one transaction. Snapshot failure rolls back the current write.
The repository rejects stale writes, repeated writes, missing targets, wrong-thread writes, and writes to closed plans
with `AgentPlanWriteConflictError`. Duplicate IDs and competing active-plan creation produce the same conflict.
There is no automatic retry, merge, content deduplication, or successful replay of an earlier response.
An accepted replacement adds a revision even when the document content is unchanged.

## Implementation checklist

- [x] Add a reversible, additive migration without a backfill.
- [x] Register plan and history entities in the Agents module.
- [x] Add atomic repository operations with revision checks.
- [x] Add repository coverage for history, concurrency, isolation, and rollback.
- [x] Add migration round-trip and constraint coverage.
- [x] Run focused SQLite and PostgreSQL checks.
- [x] Regenerate database schema documentation.
- [x] Run package lint and type checks.
