# Design Decisions

Key architectural decisions made during the engine v2 redesign, with reasoning.

| Date | Decision | Area |
|------|----------|------|
| 2026-03-11 | [Sleep is standalone between steps, not inside steps](#2026-03-11--sleep-is-standalone-between-steps-not-inside-steps) | SDK |
| 2026-03-11 | [Sequential-by-default dependency resolution](#2026-03-11--sequential-by-default-dependency-resolution) | Transpiler |
| 2026-03-11 | [No per-batch concurrency control](#2026-03-11--no-per-batch-concurrency-control) | Engine |
| 2026-03-11 | [Conditions are plain JavaScript, not traced steps](#2026-03-11--conditions-are-plain-javascript-not-traced-steps) | SDK / Transpiler |
| 2026-03-11 | [Approval returns result to the author, not a separate primitive](#2026-03-11--approval-returns-result-to-the-author-not-a-separate-primitive) | SDK |
| 2026-03-11 | [Dual timeout mechanism (Promise.race + DB-level timeoutAt)](#2026-03-11--dual-timeout-mechanism-promiserace--db-level-timeoutat) | Engine / DB |
| 2026-03-11 | [Wake-on-insert + exponential decay polling](#2026-03-11--wake-on-insert--exponential-decay-polling) | Engine |
| 2026-03-11 | [Paused steps shown as "paused", not "skipped"](#2026-03-11--paused-steps-shown-as-paused-not-skipped) | UI |
| 2026-03-11 | [Parent-child step machinery retained for batch, removed for sleep](#2026-03-11--parent-child-step-machinery-retained-for-batch-removed-for-sleep) | Engine |
| 2026-03-11 | [No migration system (PoC)](#2026-03-11--no-migration-system-poc) | Database |

---

## 2026-03-11 — Sleep is standalone between steps, not inside steps

**Decision:** `ctx.sleep()` is called between `ctx.step()` calls, not inside a
step body. The transpiler generates a Sleep node in the graph. No step splitting,
no variable capture across sleep boundaries.

**Reasoning:** Splitting step functions at sleep boundaries requires scope analysis,
intermediate state serialization, and continuation function generation — significant
transpiler complexity. The standalone approach is simpler, covers the common use
case, and can be extended later (Phase 2) if in-step sleep is needed. Authors who
need data across a sleep boundary return it from the step before and access it from
the step after via `ctx.input`.

**Alternative considered:** Transpiler splitting (see Notion doc: "Explicit Wait
and Approval Nodes"). Deferred to Phase 2.

---

## 2026-03-11 — Sequential-by-default dependency resolution

**Decision:** Steps are ordered by their position in the script. The transpiler
walks `run()` top-to-bottom and creates edges based on declaration order. Parallel
execution requires explicit `Promise.all`. No `depends` field.

**Reasoning:** The previous regex-based variable inference was fragile (false
positives in strings/comments, false negatives from destructuring). Sequential
ordering matches the author's mental model — if they wrote A before B, A runs
before B. `Promise.all` is the standard JavaScript pattern for parallelism and
is unambiguous. A `depends` field was considered but dropped because sequential +
`Promise.all` covers all real patterns without additional API surface.

**Alternative considered:** Explicit `depends: ['stepName']` field on StepDefinition.
Dropped — redundant with sequential ordering.

---

## 2026-03-11 — No per-batch concurrency control

**Decision:** All N batch child step executions are enqueued immediately. The
engine's queue `maxConcurrency` governs how many run across all executions.

**Reasoning:** Adding a second concurrency layer per-batch creates two throttling
mechanisms that interact in complex ways. The queue already limits concurrent steps
globally. If an author needs rate limiting for external APIs, the per-item retry
config with exponential backoff handles it naturally (HTTP 429 is retriable, backoff
spreads retries over time). Engine-level rate limiting (`maxPerSecond`) is a Phase 2
consideration.

---

## 2026-03-11 — Conditions are plain JavaScript, not traced steps

**Decision:** `if/else` and `switch/case` between steps are plain JavaScript. The
transpiler tags edges with condition expressions. The execution graph shows which
branches were taken (steps that executed) vs not taken. No condition nodes, no
condition step execution records.

**Reasoning:** Making every `if` a traced step would create deeply nested callback
APIs for complex branching. It also requires sandboxed evaluation for conditions
that call functions. The simpler approach — trace by path, not by evaluation —
scales to arbitrary nesting depth and requires no new primitives. Complex conditions
with function calls require Phase 2 sandboxed evaluation within the compiled module
context.

**Two cases:**
- Inside a step: invisible to the graph (internal logic)
- Between steps: edges tagged with condition text, branches shown as taken/skipped

---

## 2026-03-11 — Approval returns result to the author, not a separate primitive

**Decision:** Approval is a `ctx.step()` with `stepType: 'approval'`. The step
function returns the approval context (data shown to the approver). The step result
contains `{ approved: true/false }`. The author uses `if/else` to handle the
decision.

**Reasoning:** This makes approval composable with the existing step and condition
model. No new primitive needed. The timeout mechanism (`timeout` on StepDefinition)
applies uniformly — an approval that times out fails with `StepTimeoutError` just
like any other step timeout.

---

## 2026-03-11 — Dual timeout mechanism (Promise.race + DB-level timeoutAt)

**Decision:** Every step supports timeout via two parallel mechanisms:
1. In-process `Promise.race` (catches hung functions)
2. DB-level `timeoutAt` column (survives process crashes, handles approval timeouts)

**Reasoning:** In-process timeout only works when the step is actively running in
the same process. If the process crashes, the step stays in `running` forever. The
DB-level `timeoutAt` is checked by the queue poller, which picks up timed-out steps
regardless of which process was running them. For approvals, `timeoutAt` is the
only mechanism (there's no function running — the step is waiting for human input).

---

## 2026-03-11 — Wake-on-insert + exponential decay polling

**Decision:** Replace the fixed 50ms poll interval with event-driven polling.
`startExecution()` and `planNextSteps()` call `queue.wake()` which immediately
triggers a poll and resets the interval to 10ms. Empty polls double the interval
(10ms → 20ms → ... → 1000ms cap).

**Reasoning:** Fixed 50ms polling generates 20 queries/second even when idle. The
wake-on-insert pattern has near-zero latency when work arrives (immediate wake) and
near-zero DB load when idle (decays to 1s). Webhook triggers naturally wake the
queue because they call `startExecution()`.

**Alternative considered:** PostgreSQL `LISTEN/NOTIFY`. More efficient but adds
dependency on PostgreSQL-specific features and connection management complexity.
Wake-on-insert is simpler and sufficient for the PoC.

---

## 2026-03-11 — Paused steps shown as "paused", not "skipped"

**Decision:** When an execution is paused, steps that haven't run yet are shown as
"paused" (waiting for resume). "Skipped" is only shown when the execution has
reached a terminal state and a step never ran (branch not taken).

**Reasoning:** "Skipped" implies the step will never run. "Paused" implies it will
run when resumed. These are different user expectations. Showing pending steps as
"skipped" during a pause is misleading — the user might think the workflow failed
to reach those steps.

---

## 2026-03-11 — Parent-child step machinery retained for batch, removed for sleep

**Decision:** `parentStepExecutionId`, `resolveParentStep()`, `failParentStep()`
are kept in the engine for batch fan-out. They are no longer used for sleep/wait
(which now uses standalone Wait nodes) or approval (which uses the approval node
type directly).

**Reasoning:** Parent-child is the correct abstraction for dynamically spawned work
items (batch: one parent, N children). It was the wrong abstraction for sleep/wait
(a step is not "spawning child work" when it sleeps) and approval (a step is not
a "parent" of the human decision). Decoupling these concerns simplifies both the
sleep/wait code path and the batch code path.

---

## 2026-03-11 — No migration system (PoC)

**Decision:** Use `synchronize: true` for schema management. No migration files.

**Reasoning:** This is a PoC. Schema changes are frequent during development.
Migrations add overhead without benefit when the database can be freely reset.
Before production use, migrations are required (tracked in `later.md`).
