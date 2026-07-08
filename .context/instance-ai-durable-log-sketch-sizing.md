# Durable event log: code sketch sizing

Branch `r00gm/durable-log-qa-section`, **rebased onto post-[#33296](https://github.com/n8n-io/n8n/pull/33296) master** (relay merged 2026-07-06). Four commits: one per phase, plus the block-events fix. The bus now composes with the relay: the log drain assigns DB seqs, then delivers to local SSE and to sibling mains; relayed events on siblings are delivered id-less, and their replay reads the shared DB, so the per-main id-authority problem vanishes without Redis.
Companion to [rfc-instance-ai-durable-event-log.md](./rfc-instance-ai-durable-event-log.md).

## Per-phase size

| Phase | Commit | Files | Diff | State |
|---|---|---|---|---|
| 1 (durable log) | `6bd6c9b576c` | 12 | **+476 / −79** | Working sketch of the full write and read path, composed with the merged [#33296](https://github.com/n8n-io/n8n/pull/33296) relay |
| 2 (fold-on-read) | `ee273aee315` | 1 | **+12 / −2** | Seam switched; the rest of this phase is *deletions* |
| 3 (resilience) | `be129f9f4d4` | 3 | **+96** | Scoped stubs, intentionally unimplemented |
| 1b (block events) | `0e59d871848` | 3 | **+68 / −12** | `text-block`/`reasoning-block` with replace semantics: schema, shared reducer, log flush. Closes the mid-block-reconnect duplication for text; the reducer is shared by the FE and `buildAgentTreeFromEvents`, so one change covers both |
| 1c (reasoning replace) | `6e58d026d2a` | 2 | **+99 / −23** | Open-segment marker in reducer state makes `reasoning-block` replacement exact too (reasoning has no timeline to key on); coalescer rolls buffers on responseId change so blocks stay 1:1 with segments |
| **Total (net)** | | **18** | **+716 / −81** | |

## What each phase contains

**Phase 1, the real fix (ships alone):**
- `instance-ai-event-log-entry.entity.ts`: append-only table, `(threadId, seq)` PK, FK cascade from threads (retention rides the 90-day TTL for free).
- `instance-ai-event-log.repository.ts`: `maxSeq`, `appendBatch` (contiguous seq in one txn; a PK collision means another main won the range, so reseed and retry), `getAfter`, `getForRuns`.
- `event-bus/durable-event-log.ts`, the core: the durability predicate (ephemeral vs structural), the per-agent delta **coalescer** (blocks flush immediately before the next structural fact, so replay order equals live order), and the per-thread **drain** (publish stays synchronous, the same shape as [#33558](https://github.com/n8n-io/n8n/pull/33558), so the two merge rather than conflict).
- `in-process-event-bus.ts`: demoted to a live-delivery cache over the log; eviction is now a cache bound, not data loss.
- `instance-ai.controller.ts`: SSE replay reads the DB (subscribe, buffer, then replay with seq dedupe); `nextEventId` comes from the log; **ephemeral frames carry no `id:` line**, so the browser cursor only advances on durable facts (same precedent as the existing run-sync frames).
- Migration `1784000000043-CreateInstanceAiEventsTable`, registered for sqlite and postgres.

**Phase 2, small add, big delete:** the tree in `saveAgentTreeSnapshot` now derives from the durable log, which kills the evicted-input bug immediately. The remainder of the phase is **net-negative code**, gated on the 90-day TTL sunset: stop persisting `run_snapshots.tree`, derive on read in the messages endpoint, delete the parser fallback ladder and the in-flight-checkpoint merge (~−200 lines).

**Phase 3, stubs sized for planning:**
- `@n8n/agents`: `RunStateManager.checkpointStep` / `loadForCrashResume` plus `AgentRuntime.persistStepCheckpoint`. The serialization and store already existed; the real work is the loop call site, the opt-in option, and the crash-resume path generalizing `rebuildSuspendedRun` from `suspended` to `running` checkpoints.
- `interrupted-run-sweeper.ts`: lease, sweep, `run-finish{interrupted}`, `tool-interrupted` resolution, and correction re-queue, as a documented plan.

## Production-hardening still owed (not in sketch)

- Phase 1: SQL-side cursor filter in `getAfter`, bounded retry and a metric on append conflict, drain flush on shutdown, unit tests (coalescer boundaries, replay dedupe, restart seq continuity), and the `streaming-protocol.md` / `architecture.md` doc fixes.
- Policy follow-through (team decision, 2026-07-06): move the stream-side output redactor off the publish path so the log stores raw values; the LangSmith telemetry redactor is a separate layer and stays. The sketch predates this decision and persists post-redaction events.
- FE follow-up (small): the store's manual `?lastEventId` persistence should track only id-bearing frames (native `EventSource` already does this for the header path).
- Rebase over [#33558](https://github.com/n8n-io/n8n/pull/33558) when it lands: its drain and ours merge; `assignSequenceBlock` swaps INCRBY for `appendBatch`, seeding per-thread seq from the Redis high-water mark once (see the RFC Q&A on cursors).
- Not typechecked or built; sketch only. `persistStepCheckpoint` is deliberately uncalled.
- Rollout note: the SQLite write bench assumed WAL mode; verify `DB_SQLITE_ENABLE_WAL` in deployment guidance (Conductor's own event store runs WAL for the same workload shape).

## Phasing verdict

**Yes, and the phases are real release units, not just review chunks.** Phase 1 alone fixes eviction loss, restart cursor reset, and replay-after-restart, with zero behavior change to agents or FE rendering. Phase 2 rides behind it and ends smaller than it starts. Phase 3 is independent and can wait for the `@n8n/agents` conversation. Rough production estimate: Phase 1 ≈ 600–800 LOC including tests; Phase 2 ≈ +100, then −200 after sunset; Phase 3 ≈ 400–600 across both packages.
