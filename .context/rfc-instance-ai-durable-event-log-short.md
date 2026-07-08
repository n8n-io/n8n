# [RFC] Instance AI: durable event log (short version)

Created: Jul 6, 2026
State: Draft
Created by: Raúl (r00gm)

The 2-minute version. Details, evidence, and every "what about X?" live in the [full RFC](./rfc-instance-ai-durable-event-log.md). There is also a [non-technical explainer](./rfc-instance-ai-durable-event-log-explainer.md).

## The problem

- Everything the Instance AI UI renders, including all sub-agent activity, lives only in an in-memory buffer: 500 events / 2 MB per thread, oldest evicted first, ids reset on restart. The architecture docs claim it's persisted; it isn't.
- Consequences we've already paid for: long runs evict their own history (the empty `agentTree` bug shipped from this), a crash loses everything since run start, and reconnect cursors break on every restart. Sub-agent work exists *only* as events, so eviction is permanent loss.
- Five compensation mechanisms have accumulated around the gap (run-finish snapshots, parser fallback ladders, checkpoint merges, shutdown heroics, cancel walk-and-mutate).
- The multi-main PRs ([#33296](https://github.com/n8n-io/n8n/pull/33296) merged, [#33558](https://github.com/n8n-io/n8n/pull/33558) open) fix transport and id agreement, not durability. Single-main SQLite, the majority deployment, gets nothing from them.

## The proposal

Rule: deltas are transport, steps are state.

1. **New append-only `instance_ai_events` table.** Persist coalesced step facts (completed text/reasoning blocks, tool calls and results, agent lifecycle, confirmations). Never token deltas.
2. **`seq` comes from the DB.** Replay reads the table: correct across restarts and across mains (multi-main shares Postgres, so every main serves the same log). Redis stays live-push transport.
3. **Append-only.** Status changes are new facts folded at read; nothing is ever updated in place.
4. **The run-finish snapshot demotes to a cache.** Legacy read paths get deleted after the 90-day thread TTL ages out pre-log threads.
5. **Later phases**: per-step checkpoints (a crash loses only the in-flight step), no more unresumable inline confirmations, lease + sweep so no run can hang forever.

## Why believe it

- **Working sketch**: branch `r00gm/durable-log-qa-section`, five commits (one per phase), net +716/−81, rebased onto merged [#33296](https://github.com/n8n-io/n8n/pull/33296). [Sizing breakdown](./instance-ai-durable-log-sketch-sizing.md).
- **Write cost measured**: SQLite does 21k inserts/sec in the worst case; we need about 1 per LLM step.
- **Net-negative end state**: the log deletes several hundred lines of compensation code and the bug classes that came with them.
- Steering, multi-user threads, crash re-run safety, schema evolution, and cursor migration are all answered in the [full RFC's Q&A](./rfc-instance-ai-durable-event-log.md#qa).

## How we'll know it worked

- The recurring bug class dies: zero degenerate `agentTree` history loads and zero lost-history-after-restart reports for post-log threads (both are countable today).
- Nothing gets slower: p95 time-to-first-delta stays within noise of baseline, and history loads stay within today's snapshot-read latency.
- The codebase shrinks: after the 90-day sunset, the render/replay path is net-negative (snapshot machinery and parser fallbacks deleted).
- Rollback stays cheap during rollout: the old read path remains behind a flag, so failure means flipping a flag, not migrating data.

## What we're asking

1. Agreement on the direction (log = source of truth, snapshot = cache).
2. A heads-up to [#33558](https://github.com/n8n-io/n8n/pull/33558)'s author, nothing blocking: it merges as-is and long before this lands (the sketch already composes with its drain, and the cutover seeds the DB counter from the Redis high-water mark). We just want the later swap (Redis seq → DB seq, retiring the TTL/overlap fallbacks) to be an expected follow-up rather than a surprise, and to avoid further investment in Redis-side sequence hardening the log makes moot.
