# [RFC] Instance AI: durable event log

> In a hurry? Read the [short version](./rfc-instance-ai-durable-event-log-short.md) (2 minutes). This document is the full reference: evidence, Q&A, and risks.

Created: Jul 3, 2026
State: Draft
Created by: Raúl (r00gm)

## Title

A durable event log for Instance AI: persist the stream's source of truth.

## Author(s)

Raúl (r00gm)

### Stakeholders

Instance AI team (runtime/streaming); Cadiac (builds on multi-main PRs [#33296](https://github.com/n8n-io/n8n/pull/33296)/[#33558](https://github.com/n8n-io/n8n/pull/33558)); `@n8n/agents` maintainers (checkpoint-at-step, later phase).

## Status

Draft. A reference sketch exists on branch `r00gm/durable-log-qa-section` (five commits, net +716/−81, rebased onto post-[#33296](https://github.com/n8n-io/n8n/pull/33296) master). Sizing lives in [instance-ai-durable-log-sketch-sizing.md](./instance-ai-durable-log-sketch-sizing.md); there is also a [non-technical explainer](./rfc-instance-ai-durable-event-log-explainer.md).

## Summary

Everything the Instance AI UI renders, including all sub-agent activity, flows through an event stream that lives only in a per-thread in-memory buffer (500 events / 2 MB, FIFO-evicted, ids reset on restart). The docs claim it's persisted; it isn't. Proposal: persist coalesced **step-level** events to an append-only DB table as the durable source of truth for rendering and replay. Token deltas stay in memory. The run-finish snapshot becomes a cache. This fixes a family of shipped bugs and makes long autonomous runs, restarts, and multi-main replay correct.

## Context & Motivation

Verified in code and a dev DB:

- `InProcessEventBus` is memory-only, while the package docs claim events are persisted to thread storage (`architecture.md:280`, `streaming-protocol.md:393`, `configuration.md:171`). Consequences:
  - Restart resets event ids → stale client cursors replay wrongly (single-main; [#33558](https://github.com/n8n-io/n8n/pull/33558) fixes this for multi-main only, via Redis).
  - Long runs (50+ steps) evict their own history mid-run, so the run-finish snapshot is built from a truncated buffer. This shipped as the empty `agentTree` bug.
  - Crash mid-run loses everything since run start; only HITL-suspended runs recover (checkpoints).
  - Sub-agent work exists **only** as events (`instance_ai_messages` is the orchestrator's LLM transcript only), so eviction is permanent loss.
- Compensations have accumulated: run-finish tree snapshot (30–300 KB blob rewritten per run), the message-parser fallback ladder, the in-flight-checkpoint merge for pending confirmations.
- [#33296](https://github.com/n8n-io/n8n/pull/33296) (merged 2026-07-06) fixes cross-main transport; [#33558](https://github.com/n8n-io/n8n/pull/33558) (open) adds id agreement via a shared Redis sequence. Neither adds **durability**, and single-main SQLite, the majority deployment, is unaffected by them. Notably, with a DB-backed log the per-main id-authority problem [#33558](https://github.com/n8n-io/n8n/pull/33558) solves disappears on its own: seq comes from the shared DB, so any main replays correctly.

Input sought: agreement on direction and on the remaining risks.

## Proposal

Rule: **streaming granularity ≠ persistence granularity.** Deltas are transport; steps are state.

1. **New `instance_ai_events` table** (PK `(threadId, seq)`, JSON payload). Rows FK to `instance_ai_threads` with `ON DELETE CASCADE`, so retention is explicit: events prune with the existing thread TTL (default 90 days) on the existing pruning cycle. Append coalesced step facts: completed text/reasoning blocks, tool-call/result/error, agent-spawned/completed, tasks-update, confirmation-request, run lifecycle. Never token deltas (~100× per response, zero resilience value: an interrupted LLM step can't be resumed anyway). Blocks get dedicated `text-block`/`reasoning-block` event types with **replace** semantics: an additive schema change plus two cases and an open-segment marker in the shared run reducer, which serves both the frontend and `buildAgentTreeFromEvents`. The coalescer closes a block whenever the segment's `responseId` changes, so blocks map 1:1 to streamed segments and a client that reconnects mid-block can never see partial text or reasoning twice. Implemented in the sketch.
2. **Ids and writes**: assign `seq` from the DB inside the writer's per-thread drain (publish stays synchronous; implemented in the sketch). When [#33558](https://github.com/n8n-io/n8n/pull/33558) lands, its drain merges with this one: Redis `INCRBY` becomes the batch-INSERT's id assignment, one round trip. The memory buffer demotes to a live-delivery cache, and SSE replay reads the table, which is correct across restarts and across mains. Multi-main needs no extra machinery: the log lives in the shared Postgres every main already uses, and the merged [#33296](https://github.com/n8n-io/n8n/pull/33296) relay stays what it is, live-push transport rather than storage.
3. **Append-only**: state changes are new facts, folded at read. One `run-finish{cancelled}` supersedes all in-flight items; no walk-and-mutate (`cancelInFlightNodes` retires).
4. **Snapshot demotes** to a derive-on-read cache of `buildAgentTreeFromEvents(log)`. Legacy read paths (fallback ladder, checkpoint-merge) are deleted after the 90-day thread TTL ages out pre-log threads.
5. **Later phases** (separate PRs, same invariants): per-step checkpoint upsert (a crash loses only the in-flight step), remove non-checkpoint "inline" confirmations, lease + startup sweep appending `run-finish{interrupted}` (no zombie runs).

End state: three stores, three consumers, no overlap of purpose.

| Store | Consumer | Content |
|---|---|---|
| `instance_ai_messages` | model | orchestrator LLM context: provider fidelity (thinking signatures, tool-use ids), SDK-owned |
| `instance_ai_events` (new) | UI | all render facts incl. sub-agents: total order, cursors, durable |
| `instance_ai_checkpoints` | resume | SDK state for suspended runs |

Storage policy (team decision): both stores hold raw values, consistent with execution data; redaction applies at egress boundaries (a deliberately stricter telemetry redactor already guards LangSmith), not at rest. Implementation consequence for phase 1: the stream-side output redactor moves off the publish path (or is removed, team call), so the log captures raw values; the LangSmith telemetry redactor is unchanged. The two stores are two projections with opposite fidelity: messages carry provider metadata the UI never needs; events carry the multi-agent record and ordering the model must never see. Neither is derivable from the other.

`instance_ai_run_snapshots` is deliberately absent from this table: it is deleted (see "What this deletes"). The events table serves the UI for both live runs and history; there is no separate historical UI store.

## What this deletes

The compensations for the ephemeral buffer become dead code once pre-log threads age out (90-day thread TTL):

- The run-finish snapshot machinery (`saveAgentTreeSnapshot`, blob rewrites, eventually the `instance_ai_run_snapshots` table).
- The `parseStoredMessages` fallback ladder and the in-flight-checkpoint merge for pending confirmations.
- `persistShutdownSnapshot`, the `cancelInFlightNodes`/`markRunCancelled` walk-and-mutate, and the empty-snapshot guards (the empty `agentTree` bug class dies with them).
- The Redis seq TTL and id-overlap fallbacks in [#33558](https://github.com/n8n-io/n8n/pull/33558), at the seq-authority swap (its drain and the [#33296](https://github.com/n8n-io/n8n/pull/33296) relay stay).

Kept on purpose: checkpoints (resume), `instance_ai_messages` (model context), the relay (live transport), the bus as bounded cache. Net: the end state is several hundred lines smaller than today.

## Alternatives Considered

- **Band-aids** (persist the counter, pin confirmation events): the buffer is still empty after restart; replay stays broken.
- **Persist deltas**: ~100× write amplification for zero resilience gain.
- **Write the snapshot per step** instead: a 30–300 KB blob rewrite per step vs a ~1 KB append, and still no cursor replay.
- **Full event sourcing** (messages as a log projection): messages and events differ *by design*, because output redaction applies to the event stream (user-facing) but not to model context; unifying them also couples the SDK message format to the API contract.
- **Redis Streams as the durable store**: n8n treats Redis as wipeable transport (queue + pub/sub, no persistence guarantee in deployments), so this would become a second, independently-regressable source of truth with no transactional link to messages/checkpoints, and stream trimming reintroduces eviction. Multi-main doesn't need it for durability: the shared Postgres already gives every main the same log, and Redis stays live-push ([#33296](https://github.com/n8n-io/n8n/pull/33296)). Single-main has no Redis at all, so this path also means two storage backends forever.

## Prior art: Conductor / Claude Code

The agent tooling this team uses daily converged on the same design, independently (verified by inspecting its storage on disk). Claude Code persists each session as an append-only JSONL log of completed facts: full provider-fidelity messages, zero streamed deltas stored, sub-agent activity in separate linked logs with only the summary in the parent, raw values at rest, resume by re-reading the log. On top of that, Conductor maintains its own SQLite store (WAL mode) with a render-shaped `session_messages` table, indexed for its UI, rather than re-parsing transcripts. Two stores, one provider-fidelity log for the model and one derived, indexed record for rendering: the same split this RFC proposes, arrived at by a single-writer local app that could have unified them and chose not to. Our additional machinery (DB-assigned `seq`, cursor replay, append-conflict handling) maps exactly to the requirements Conductor doesn't have: remote clients reconnecting over SSE and concurrent producers across processes.

## Q&A

Questions raised during drafting, with their answers.

**Won't per-step writes hurt SQLite?**
No. Measured (WAL, ~1 KB rows): 21k inserts/sec with worst-case single-row commits, 96k/sec batched. We need ~1 per LLM step, seconds apart.

**Does it reduce memory while a thread runs?**
Modestly, and structurally. Token deltas no longer enter any store (the cache holds coalesced blocks, roughly 10x denser for streamed text), the 30–300 KB tree rebuild at every run-finish disappears with phase 2, and sibling mains stop buffering relayed thread history entirely (they emit live and replay from the shared DB). After phase 2 the in-memory store's last reader (run-sync bootstrap) can also move to the log, leaving the bus as a bare emitter. The dominant consumer, the agent loop itself (message list, tool results), is deliberately untouched. Note that memory was never the disease: the 2 MB cap already bounded it, but enforced itself by destroying data; with the log underneath, the cap becomes a pure performance knob, safe at any size.

**Can `@n8n/agents` checkpoint at step boundaries?**
Yes, with a small SDK change (~70–100 lines; the package lives in this monorepo). The hard parts already exist: `SerializableAgentState` serialization, a pluggable `CheckpointStore` keyed by runId (upsert), and one suspension call site. New: a `checkpointStep()` save (same state, status `running`) called at the end of each loop iteration behind an opt-in flag, plus a resume path that accepts `running`-status checkpoints. Sketched on the RFC branch; the larger half of the phase (crash-resume consumer, `tool-interrupted` resolution) lives in `packages/cli`, which we fully control.

**What happens to client cursors when this lands after [#33558](https://github.com/n8n-io/n8n/pull/33558)?**
Multi-main: seed each thread's DB counter from the Redis high-water mark on first durable write (one `GET`). Single-main has nothing to seed from, which is identical to today's every-restart cursor reset and self-heals via hydration (`nextEventId`).

**Is writing events to the DB a privacy regression?**
No, by policy: raw values at rest are accepted (team decision), consistent with workflow execution data in the same database. The boundary that matters is external egress, and LangSmith already has its own deliberately stricter telemetry redactor (`trace-payloads.ts`), independent of the stream-side output redactor. Thread deletion (TTL or manual) cascades all stores. One forward flag: if shared threads ship, raw-to-UI needs revisiting, since participants would see each other's content; that is the one future that would add a read-side redaction pass at the serve boundary.

**Do events outlive the run? How are they purged?**
They outlive the run on purpose: after phase 2 there is no snapshot, so the events are what history renders from, for live and finished runs alike. Purging is inherited, not independent: rows cascade with their thread's deletion under the existing thread TTL (default 90 days). The executions pruning mechanism was considered and not adopted, because executions are top-level entities needing their own age/count policy, while events are strictly thread-subordinate; an intra-thread pruning knob would also delete visible history. If storage ever measurably matters, finished runs can later be compacted into a verified cached tree with no schema change, but that reintroduces view-as-source-of-truth semantics and is not proposed.

**Rows are immutable and old payloads stay readable. How does the schema evolve?**
Payloads use the canonical `instanceAiEventSchema`; evolution is additive (new types and optional fields, never repurposing); the fold is a tolerant reader that skips unknown types and fields, which also covers version rollbacks.

**After a crash, do interrupted tool calls re-execute?**
Never mechanically; the infra layer is strictly at-most-once. Completed calls replay their recorded results. Calls in-flight at the crash (usually one, possibly a parallel batch) become durable `tool-interrupted` facts, resolved into the resumed context as a synthetic result ("effect unverified, verify before retrying"), the same shape as today's `tool-error` recovery. The agent verifies via existing read tools (all n8n domain effects are observable) and retries only if the effect is absent; unverifiable external-MCP effects escalate to `ask-user`; destructive retries re-pass the HITL gate. No per-tool idempotency review is needed, because no tool is ever blind-retried.

**Why not store UI messages in `instance_ai_messages` and derive model messages (ai-sdk's `convertToModelMessages`)?**
Credit where due: the converter does support asymmetric views (data parts are dropped by default, with a `convertDataPart` hook), so UI-only content such as sub-agent activity could in principle ride in data parts and stay out of the model view. Three things still break the pattern here. (1) Redaction is content-level: the user-facing record is scrubbed at emit time while model context must stay unredacted, and no converter recovers scrubbed values; storing unredacted UI messages instead means redacting on every read path forever. (2) The assembly problem: sub-agent and background-task activity arrives as concurrent event streams published outside the orchestrator's turn (clean-context delegation; verified in a dev DB, a planner sub-agent's 13 tool calls exist only as events, never in messages). Folding them into stored UI messages happens either at run-finish (the snapshot freeze this RFC deletes) or incrementally (rewriting a growing message row per event, with concurrent writers and no replay cursors: an event log with worse ergonomics). Durable per-event records must exist first either way, and then UI messages are a derived cache of them. (3) Ownership: neither the frontend (renders events through the run reducer) nor `@n8n/agents` (own message list, persisted and serialized into resume checkpoints) speaks ai-sdk `UIMessage`; adopting the converter means migrating the whole message stack to that format first, and couples the checkpoint format to UI storage.

The strongest variant (store everything raw in one superset table, derive the model view with a `convert-to-model-messages` and the UI view with a `convert-to-ui-messages`) fails on two grounds that have nothing to do with redaction. First, durability mechanics: the in-progress record must be append-only facts with a sequence (concurrent producers across mains, cursor replay), so a single table that fixes the actual bugs is the events table under another name. Second, provider-metadata fidelity: the model context requires content UI facts deliberately lack, such as Anthropic extended-thinking signatures (thinking blocks cannot be replayed to the API without them), provider tool-use ids, cache markers, and SDK bookkeeping messages whose ids observational-memory cursors reference. A fold over UI facts cannot reconstruct a valid model context, and carrying all provider metadata on every fact rebuilds the messages store inside the log. The two converters already exist in the proposed design: `convert-to-ui-messages` is the fold (`reduceEvent` / `buildAgentTreeFromEvents`), and the model view needs no converter because the SDK materializes it natively.

**Does steering (task corrections) still work?**
Yes, unchanged on its live path (the in-memory queue plus [#33296](https://github.com/n8n-io/n8n/pull/33296) pubsub; both are transport). The request is already a durable fact for free (the `correct-background-task` call/result), and once drained, the correction lands in the next per-step checkpoint. The current silent-loss window (queued but not drained at crash) closes: on resume, corrections present in the log but absent from the checkpoint's message list (keyed by `toolCallId`) are re-queued.

**How does this relate to the multi-main PRs ([#33296](https://github.com/n8n-io/n8n/pull/33296) / [#33558](https://github.com/n8n-io/n8n/pull/33558))?**
It builds on them, not against them. [#33296](https://github.com/n8n-io/n8n/pull/33296) (merged) is live-push transport; the sketch is rebased onto it: the drain assigns DB seqs, then relays through it unchanged. [#33558](https://github.com/n8n-io/n8n/pull/33558) (open) solves cross-main id agreement with a shared Redis sequence, a problem a DB-backed log removes by construction, since every main reads the same table and replay is correct anywhere. Its remaining value on top of the log is carrying the produced `seq` on the relay (so sibling *live* frames advance cursors too); the Redis counter itself becomes unnecessary.

**Does this support multiple users in one thread?**
Readers: supported by construction (per-connection cursors into one total per-thread order, on any main, full fidelity for late joiners). Writers: DB-assigned `seq` already serializes concurrent producers, and the atomic confirmation claim prevents double-answers; what's left is additive attribution (`userId` on user-originated facts), the same per-user pattern `instance_ai_thread_grants` already uses. Whose RBAC a shared thread's runs execute under is a sharing-feature decision, not a persistence one.

## Success criteria

Measured against a pre-rollout baseline. The failure thresholds are rollback triggers, not aspirations; during rollout the bus cache and snapshot write path stay in place, so rollback is a read-path flag flip, not a migration.

| Signal | Today | Target |
|---|---|---|
| Degenerate or empty `agentTree` on history load (parser fallback activations; the "skipped empty snapshot" warning) | recurring incident class | zero for post-log threads |
| History correctness after a restart or on a different main (e2e: kill the main mid-run, reload, compare) | fails | passes on every main |
| Duplicate or missing text after reconnect mid-stream | reproducible | zero (replace-semantics blocks) |
| Zombie runs (`run-start` with no terminal event past the liveness window) | possible, unmeasured | zero once the sweep ships (later phase) |
| Live-stream latency (p95 time-to-first-delta, inter-delta gap) | baseline | within noise of baseline; the drain adds at most one queue tick |
| Log volume | n/a | measured: 4 rows / ~2KB per LLM step (tool-call, tool-result, text-block, reasoning-block); alert when a run's rows exceed the p99 estimate |
| `(threadId, seq)` append conflicts (multi-main) | n/a | ~zero; alert on sustained retries |
| Net LOC in the render/replay path | baseline | net-negative after the TTL sunset (fallback ladder and snapshot machinery deleted) |

Failure triggers: p95 first-delta latency degrading beyond noise; log growth per active thread exceeding the estimate by an order of magnitude; phase-2 fold-on-read history latency exceeding an absolute budget of p95 25ms at p99 thread size (measured in the evaluation: p50 6.4ms at 500 facts; a relative trigger against the snapshot blob read was mis-specified, since a fold can never beat a single-row read and doesn't need to). Mitigation if the budget is ever exceeded: the derive-on-read cache from the end state. Instrumentation: counters at the drain (rows, bytes, retries), the SSE endpoint (replays served, cursor age), and the parser (fallback activations, already logged today). Full measured results: [durable-log-evaluation-report.md](./durable-log-evaluation-report.md).

## Risks & Open Questions

Open questions: none; everything raised during drafting was resolved (see Q&A).

**Remaining risks** (decided, not risk-free):

- **Phase-2 read-path surgery** touches `parseStoredMessages`, an area that is historically bug-prone (the empty `agentTree` incident). Mitigation: the legacy path stays for pre-log threads until the 90-day TTL sunsets them, and the new path is a pure fold, testable against recorded logs.
- **[#33558](https://github.com/n8n-io/n8n/pull/33558) merges long before this lands.** That's fine technically: nothing gates its merge, the sketch already composes with its drain, and the cutover seeds each thread's DB counter from the Redis high-water mark. The risk is organizational: without a heads-up now, the later seq-authority swap (Redis → DB, retiring the TTL/overlap fallbacks) reads as a surprise rewrite of freshly shipped code, and interim effort may go into hardening the Redis sequence the log makes moot. Mitigation: one non-blocking review comment on [#33558](https://github.com/n8n-io/n8n/pull/33558) recording the intent, so the swap lands as an expected follow-up.
- **Checkpoint blob growth**: the per-step upsert rewrites one per-run row whose state grows with the run. Fine at step cadence; watch size on very long autonomous runs.
- **Forever-discipline**: immutable rows and additive-only schema evolution hold only if enforced. Add schema tests; don't rely on convention.

One task regardless of outcome: fix the package docs that claim events are persisted to thread storage (`architecture.md`, `streaming-protocol.md`, `configuration.md`).

## Feedback Summary (optional)

None yet.
