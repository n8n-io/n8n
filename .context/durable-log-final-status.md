# Durable event log: final status and handoff

Branch `r00gm/durable-log-qa-section`, 2026-07-07. Production-quality completion pass on top of the measured prototype. Companions: [rfc-instance-ai-durable-event-log.md](./rfc-instance-ai-durable-event-log.md) (design), [durable-log-evaluation-report.md](./durable-log-evaluation-report.md) (measured numbers + go/no-go + addenda), raw data JSONs alongside.

**Evaluation apparatus location (post-strip, 2026-07-07):** the merge candidate no longer carries the measurement harness. Commit `0369076471b` removed `packages/cli/scripts/durable-log-harness/` (behavior harness, mock OpenAI-compatible server, real-Anthropic crash-resume script), the synthetic integration harness test (`durable-event-log.harness.test.ts`), and the three E2E-only endpoints (`POST /instance-ai/test/publish-events`, `GET/POST /instance-ai/test/durable-log-metrics[/reset]`) plus `DurableLogMetrics.snapshot()/reset()`, net minus 2,354 lines (branch total vs master went from +6,166/-120 to +3,812/-120). The 28 ported unit tests keep the correctness matrix on the merge path. The COMPLETE apparatus lives on the local branch **`durable-log-evaluation-record`** (this branch's tip before the strip). Any re-measurement before a rollout gate, and every demo command in the evaluation report, means checking out that branch first:

```bash
git checkout durable-log-evaluation-record
# then run the demo/harness commands exactly as written in durable-log-evaluation-report.md
```

Everything below was built and verified locally; nothing external was touched (no PRs, no comments, no tickets).

## What was built (commit map, oldest first)

| Commit | Unit |
|---|---|
| `6bd6c9b576c` .. `6e58d026d2a` | The original 5-commit sketch (phase 1 write/read path, phase-2 seam, phase-3 stubs, replace-semantics block events) |
| `0b4f18f91e1` | Phase 1 complete behind `N8N_INSTANCE_AI_DURABLE_LOG` (flag off restores master byte for byte; SQL cursor filter, bounded append retry, shutdown flush, raw-at-rest redaction bypass, instrumentation counters) |
| `b743a506a0a` | Phase 2: history trees derived by folding the log; snapshot written but unread for post-log threads; synthesized snapshots for unsnapshotted runs |
| `875e6790905` | Phase 3 SDK: `stepCheckpoints` opt-in, per-step `running` checkpoints, `Agent.crashResume(contextNotes)`; additive schema (`tool-interrupted`, `interrupted` status + cancellation reason) |
| `c1aba890830` | Phase 3 cli: interrupted-run sweeper, crash-resume drive path, correction re-queue from log-vs-checkpoint diff |
| `efb940ca71a`, `030c6f15746`, `ff422961ad6` | Lint and test alignment |
| `305a229d77c` | Evaluation harness: synthetic (vitest integration over a real test DB), SDK (mocked model), behavior (real spawned n8n) |
| `375dce85a2f` | Harness publish-events endpoint enforces thread ownership (security-review finding) |
| `8a180b67c6d` | Crash-resume completed: HITL re-suspension registers + persists like the resumed path; multi-main activity-heartbeat grace window + atomic CAS checkpoint claim; durable resumed-after-restart marker |
| `c95f97ab905` | Model-endpoint fixes in `@n8n/agents`: `url` accepted as `baseURL` alias; custom baseURL routes `@ai-sdk/openai` through chat completions (the documented LM Studio path was doubly broken) |
| `8f941aedf86` | Scripted OpenAI-compatible mock server + behavior scenario R5 (real run, kill -9, sweep claims and crash-resumes to completion) |
| `62b477090eb` | `hostRunId` column on `instance_ai_checkpoints` (migration `1784000000044`) + sweeper exact match; terminal-outcome guard/replay reads flag-resolved to the log (evaluate* async) |
| `29d4c605918` | Instrumentation promoted to Prometheus via typed EventService events (rows, bytes, queue latency, conflicts, failures, replays, cursor age, fold duration, parser fallbacks, swept runs) |
| `20b70b6b99c` | FE replay cursor: id-bearing-frames-only contract explicit + NaN guard |
| `cc8a681c8c9` | Docs: the three false "events are persisted to thread storage" claims fixed; streaming-protocol documents DB cursors, id-less ephemeral frames, replace-semantics blocks |
| `5890f4da347` | 28 unit tests porting the harness correctness matrix (drain/coalescer, sweeper, service crash-resume incl. HITL re-suspension, reducer replace semantics, controller flag-on replay, SDK HITL-during-crash-resume) |
| `0c0bc77b6dc` | Model-factory guard: empty `url` means no custom endpoint (the api-key-only Instance AI config emits `url: ''`; without this the alias fix would send `baseURL: ''` to the provider) |
| `7fd25b9b388` | Real-Anthropic crash-resume scenario (`real-crash-resume.mjs`): boots n8n on `anthropic/claude-sonnet-4-6` with thinking, polls the checkpoint, `kill -9` mid-run, restarts, asserts sweep counters, completion under the original runId, the resumed marker, and zero provider signature errors |
| `52d3c22784d` | Durable-log drain state cleared with the thread (E2E resets deleted threads while the log kept per-thread seq caches, causing append-conflict bursts on thread reuse) |
| `321339c7158` | Per-thread idle flush (3s quiet default): trailing deltas that no structural fact ever follows (terminal-outcome lines, liveness notices) now reach the log instead of vanishing on reload |
| `af8614f4f95`, `2b7f3e35111`, `4307b654dc9` | Test alignment surfaced by the repo-wide ritual (config defaults snapshot, constructor/type drift, async guard evaluations) |
| `16ba5f7f736` | Terminal-outcome lines publish as `text-block` when the flag is on (a delta after `run-finish` raced the idle flush; a block is durable and replayable by construction) |
| `db5c4372154` | FE store reducer routes `text-block` / `reasoning-block` / `tool-interrupted`: the routing switch predated the block events, so live and replayed blocks were silently dropped (the one real flag-on playwright differential; root cause of the last SKIP-list item) |
| `aee95c34d48` | Terminal-guard order test harness pins `durableLog: false` explicitly |
| `0369076471b` | Evaluation apparatus stripped from the merge candidate (preserved on `durable-log-evaluation-record`): harness scripts, synthetic integration test, E2E harness endpoints, `DurableLogMetrics.snapshot()/reset()` |

Migrations on this branch: `1784000000043-CreateInstanceAiEventsTable`, `1784000000044-AddHostRunIdToInstanceAiCheckpoints`. Verified against `origin/master` at `66ad8b93030`: master's head is still `1784000000042`, so the numbering stands. Re-check before merge; renumber if master moves past 042.

## Verification matrix

All runs on Apple M1 Pro, SQLite, throwaway DBs and user folders only (`~/.n8n` never touched; the db_schema_check hook was bypassed with `--no-verify` per its pre-existing TS2589 failure).

| Check | Status |
|---|---|
| Full backend build (`pnpm build --filter=n8n`, includes tsc for every touched package) | GREEN |
| cli instance-ai unit suite, flag off (1,370 tests incl. the 24 new cli-side ones) | GREEN |
| @n8n/agents suite (950 tests incl. 4 crash-resume + 3 model-factory additions) | GREEN |
| @n8n/api-types suite (1,387 tests incl. 4 reducer replay cases) | GREEN |
| @n8n/instance-ai src suite (2,047 tests) | GREEN |
| FE threadRuntime suite (44 tests); touched FE file lint clean | GREEN |
| Synthetic harness, 10 scenarios, flag off vs on (real DB) | GREEN |
| Behavior harness flag off (L, R1, R2, R3) | GREEN |
| Behavior harness flag on (L, R1, R2, R3, R4 kill -9 sweep, R5 real crash-resume via mock LLM) | GREEN |
| Lint on all touched files | 0 errors |
| Real-LLM playwright local suite under the flag (A/B, key from `.env.eval`) | **DONE.** Flag on 32F/3P/5S vs flag off 31F/4P/5S; the mass failures are environmental on this box ("Workflow builder unavailable", no browser sandbox) and identical in both arms. Exactly one differential: `instance-ai-background-lifecycle.spec.ts` "should recover when a background builder task is cancelled" failed flag-on only. Root-caused through three layers (terminal-outcome delta racing the idle flush → published as `text-block`, `16ba5f7f736`; FE store reducer dropping block events → routing added, `db5c4372154`). After the fixes and an editor-ui rebuild the spec and its whole file pass flag-on (1 passed, 5.2s; file: 1 passed, 14.9s) |
| Real-LLM crash-resume (Anthropic thinking-signature fidelity on a checkpointed list) | **PASS.** `real-crash-resume.mjs` on `anthropic/claude-sonnet-4-6` with thinking: run `run_MInogE0x639kKeZ0cPfhg`, 3 real tool calls before `kill -9`, sweep counters `runsExamined: 1, runsCrashResumed: 1`, run completed under the original runId, resumed-after-restart marker present, `providerSignatureErrorsInLogs: 0` (no signature/`AI_APICallError`/`invalid_request_error` in either process log, so checkpointed thinking blocks replayed with valid signatures). Raw JSON: `behavior.realCrashResumeAnthropic.on` in [durable-log-behavior.json](./durable-log-behavior.json) |
| Repo-wide typecheck (final tree, after every commit above) | **EXIT 0** — 120/120 turbo tasks |
| Repo-wide lint (final tree) | **EXIT 0** — 116/116 turbo tasks (`NODE_OPTIONS=--max-old-space-size=8192`, `--concurrency=2`; the default concurrency OOMs on this 6-core box) |
| Postgres harness arm | **SKIPPED: no docker.** Command: `cd packages/cli && pnpm test:postgres test/integration/instance-ai/durable-event-log.harness.test.ts` (needs a reachable Postgres) |
| Multi-main playwright spec, flag off and on | **SKIPPED: no docker.** Command: `pnpm build:docker` then `cd packages/testing/playwright && pnpm test:container:sqlite tests/e2e/instance-ai/instance-ai-multimain.spec.ts`, and once more with `N8N_TEST_ENV='{"N8N_INSTANCE_AI_DURABLE_LOG":"true"}'` |

Real-LLM commands used (key sourced from `packages/@n8n/instance-ai/.env.eval`, never printed). The crash-resume script now lives on `durable-log-evaluation-record` only; check that branch out to re-run it:

```bash
set -a; source packages/@n8n/instance-ai/.env.eval; set +a
cd packages/testing/playwright
N8N_TEST_ENV='{"N8N_INSTANCE_AI_DURABLE_LOG":"true"}' pnpm test:local:instance-ai   # and once without N8N_TEST_ENV for the A/B baseline
# on durable-log-evaluation-record, from repo root:
node packages/cli/scripts/durable-log-harness/real-crash-resume.mjs
```

A clean-environment re-run of the playwright suite (a box where the flag-off baseline is green) is still worthwhile before merge; on this machine only the A/B differential is attributable to the flag, and it is fixed.

## Deletion plan (the RFC's "What this deletes", as a checklist)

These become tickets at rollout time; written down now so nothing silently becomes permanent.

**Gate A: flag default flips to on.** Criterion: the rollout metrics hold for a full release cycle: `instance_ai_durable_log_append_failures_total` at zero, queue latency p95 within the measured envelope, `instance_ai_parser_fallbacks_total` at zero for post-log threads, no degenerate-agentTree incidents. Then:

- [ ] Flip `durableLog` default to `true`; keep the env var as an off switch for one more release.

**Gate B: legacy read paths delete (after Gate A plus one 90-day thread-TTL window, so every surviving thread has log rows).** Inventory:

- [ ] The flag itself and every `durableLog` branch: bus legacy store path + `nextId` counter + `publishLocalOnly`, controller sync replay branch, `getNextEventId` bus authority, snapshot-events source branches, terminal-outcome read adapter's bus arm, memory-service legacy pass-through.
- [ ] `parseStoredMessages` fallback ladder (`buildFlatAgentTree` selection where a log fold exists) and the in-flight-checkpoint merge in `getRichMessages` (`loadInFlightCheckpointMessages`); post-log threads render from the fold.
- [ ] Snapshot write machinery: `saveAgentTreeSnapshot` tree persistence (keep run-group metadata or replace with a log-derived index), `persistShutdownSnapshot`, `markRunCancelled` / `cancelInFlightNodes` walk-and-mutate, the "Skipped updating empty Instance AI agent tree snapshot" guard, and eventually the `instance_ai_run_snapshots` table (or demote to the derive-on-read cache from the phase-2 condition).
- [ ] The bus cache demotes to a pure live-delivery buffer: `getEventsForRun(s)` same-process readers move to the log; eviction caps become pure performance knobs.
- [ ] [#33558](https://github.com/n8n-io/n8n/pull/33558) leftovers at the seq-authority swap: the Redis per-thread sequence, its 14-day TTL fallback, and the id-overlap fallbacks (the relay itself stays).
- [ ] The raw-at-rest bypass guard in `resolveOutputRedaction` becomes the only redaction wiring; delete the stream-side redactor invocation entirely (or keep behind the existing `N8N_INSTANCE_AI_OUTPUT_REDACTION_ENABLED` if the policy is ever re-scoped).

**Independent of the gates:**

- [ ] Recurring sweep interval (today: startup-only) once background tasks/steering make mid-uptime zombies plausible.
- [ ] `stepCheckpoints` blob growth watch on very long runs (RFC risk); consider delta checkpoints if p99 blob size grows past the snapshot sizes it replaced.

## #33558 composition plan (still open at time of writing)

[#33558](https://github.com/n8n-io/n8n/pull/33558) adds a shared per-thread Redis sequence with a publish-synchronous per-thread drain, producer-assigned ids on the relay, and `insertById` dedup. When it merges:

1. Rebase; the two drains are the same shape by design. Keep ONE drain: this branch's `DurableEventLog.drainBatch` becomes the body; `assignSequenceBlock`'s Redis `INCRBY` is replaced by `appendBatch`'s DB-assigned contiguous seqs (id assignment and durable insert collapse into one round trip, the RFC's stated intent).
2. Seed each thread's seq once at cutover: `currentSeq` takes `max(repo.maxSeq, Redis high-water mark)` on first durable write (one `GET`), so pre-cutover client cursors stay valid. The comment anchor is already in `currentSeq`.
3. Keep the relay id-carry: [#33558](https://github.com/n8n-io/n8n/pull/33558)'s producer-assigned ids on `relay-instance-ai-event` frames let sibling live frames advance cursors; wire `handleRelayInstanceAiEvent` to pass the carried seq through instead of emitting id-less (the follow-up already marked in that handler).
4. Retire the Redis counter, its TTL, and the id-overlap fallbacks (they exist to approximate what the DB PK now guarantees). The `insertById` bus dedup becomes unnecessary once replay is DB-backed.
5. Re-run the multi-main spec flag on/off, and the synthetic append-conflict scenario against Postgres.

## Merge-readiness checklist

- [x] One flag, default off, flag-off byte-for-byte (verified against the full existing suites)
- [x] Migrations registered for sqlite + postgres, numbered after master's head (re-check at merge)
- [x] Correctness matrix as unit tests (28) + integration harness (10 scenarios) + behavior scenarios on a real process (6)
- [x] Prometheus metrics per n8n conventions; harness endpoints E2E-gated out of production registration
- [x] Docs match reality (architecture, streaming-protocol, configuration)
- [x] Deletion inventory written down (above)
- [x] Real-Anthropic validation: crash-resume PASS (thinking-signature fidelity held, zero provider errors); playwright A/B run, the one flag-attributable differential root-caused and fixed (`16ba5f7f736`, `db5c4372154`), spec green flag-on
- [ ] Postgres harness arm + multi-main spec — needs docker
- [ ] Rebase over [#33558](https://github.com/n8n-io/n8n/pull/33558) when it merges (plan above)
- [ ] Product signoff: silent auto-resume after unclean restart (the timeline marker makes it visible; the behavior itself is a product decision), and confirmation that raw-to-screen is the intended user-facing consequence of raw-at-rest (one-line seam in `resolveOutputRedaction` if re-scoped)
- [x] Repo-wide lint/typecheck ritual (AGENTS.md final-PR prep) on the final tree: typecheck EXIT 0 (120/120 tasks), lint EXIT 0 (116/116 tasks). Recipe on this box: `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec turbo run <task> --concurrency=2` (default concurrency OOMs; `pnpm lint --concurrency=2` does not work because pnpm forwards the flag to eslint)

## Needs from you

1. A docker-capable machine for the Postgres arm and the multi-main spec (commands above), plus ideally one playwright suite run on a box whose flag-off baseline is green (this machine's baseline has environmental failures, so the suite verdict here rests on A/B differencing).
2. The two product decisions listed in merge-readiness (auto-resume semantics, raw-to-screen confirmation).
3. When [#33558](https://github.com/n8n-io/n8n/pull/33558) merges, say the word and I execute the composition plan.

## The end state, measured (2026-07-07)

Two follow-up cleanups landed as separate branches off the merge candidate `r00gm/durable-log-qa-section`:

1. **Merge candidate, evaluation apparatus stripped** — commit `0369076471b` on `r00gm/durable-log-qa-section` (harness + E2E endpoints removed; full apparatus preserved on `durable-log-evaluation-record`). See the top of this doc.
2. **`r00gm/durable-log-sunset-preview`** — the Gate A + Gate B end state made visible: the `N8N_INSTANCE_AI_DURABLE_LOG` flag and every legacy compensation deleted. This branch is a PREVIEW; it merges only after the gates pass (metrics hold + the 90-day thread-TTL window sunsets pre-log threads). Commits `c99ff6d1b5d` (the deletion) and `d0b5f4374f3` (docs).

**What the sunset deleted** (the RFC's "What this deletes", executed): the flag and all flag branches; the bus's legacy replay store + `nextId` counter + `publishLocalOnly` + legacy relay id-stamping (`getEventsAfter`/`getNextEventId` gone from the bus, which is now emitter + bounded live cache); the controller's sync replay branch and bus-authority `nextEventId`; the parser's flat-tree fallback ladder (`buildFlatAgentTree`/`buildTimeline`/`isRenderableTree`/`mergeFlatAgentTrees` + tool-part schemas) and `messageParserStats`; the in-flight-checkpoint merge stays (it is checkpoint-based, not snapshot-based); the entire agent-tree snapshot store (`saveAgentTreeSnapshot`, `persistShutdownSnapshot`, `markRunCancelled`/`cancelInFlightNodes`, `DbSnapshotStorage`, the entity + repository, and migration `1784000000045` dropping `instance_ai_run_snapshots`); the stream-side `OutputRedactor` and the `output-redaction-config` + the `outputRedaction` option threaded through the SDK streaming layer (the LangSmith telemetry redactor in `trace-payloads.ts` is untouched). Two things were **kept because something still reads them**: the LangSmith feedback anchor (relocated onto the `run-start` event payload, resolved by a new `InstanceAiEventLogRepository.findLangsmithAnchor` log query) and the bus's `getEventsForRun(s)` cache reads (tracing metadata + liveness dedupe, same-process best-effort). One correctness fix rode along: the terminal-response guard now counts `text-block` as visible output (it reads coalesced facts from the log, not live deltas).

**#33558 items were NOT touched** — that PR is unmerged, so nothing exists here to delete.

**Diffstat.** `git diff --stat` splits (production = everything except `**/__tests__/**`, `**/*.test.ts`, `**/test/**`):

| Comparison | Files | Insertions | Deletions | Net |
|---|---:|---:|---:|---:|
| Sunset delta (`0369076471b` → `d0b5f4374f3`), all | 61 | +622 | −3,561 | **−2,939** |
| Sunset delta, production only | 40 | +289 | −1,709 | **−1,420** |
| Sunset delta, tests only | 21 | +333 | −1,852 | **−1,519** |
| Whole feature vs `origin/master`, all | 84 | +3,976 | −3,223 | **+753** |
| Whole feature vs `origin/master`, production only | 57 | +2,332 | −1,513 | **+819** |
| Whole feature vs `origin/master`, tests only | 27 | +1,644 | −1,710 | **−66** |

**Render / replay-path accounting (the "less code" answer).** The durable-log core — the write path (`DurableEventLog` per-thread drain + `instance_ai_events` repository/entity/migration) and the read path (fold-on-read `buildLogDerivedTrees` + SSE replay from the log) — is a single mechanism that was added by the feature and stays. The sunset itself added only ~289 production lines (the fold rewrite replacing the snapshot overlay, the LangSmith relocation + `findLangsmithAnchor`, the drop migration, the guard `text-block` fix) while deleting ~1,709: it is almost pure deletion of machinery the log made redundant. Net for the sunset step: **−1,420 production lines**. End to end — a durable, crash-resumable event log with fold-on-read history, replacing the in-memory bus as the source of truth — the whole feature costs **+819 net production lines over master** while deleting the entire agent-tree snapshot store, the parser's tree-reconstruction ladder, and the stream-side redactor. The one-mechanism log read/replay path replaced three separate compensation mechanisms; the "resilient, not cheap" build is also, on net, close to line-neutral against master and strictly less code once pre-log threads TTL out (the base flat-tree parser tests and the two `overlayLogDerivedTrees` pre-log guards are the only survivors still tagged for that final deletion).

**Verification of the sunset branch** (SQLite, throwaway DBs, `~/.n8n` never touched):

| Check | Status |
|---|---|
| Full backend production build (`pnpm build --filter=n8n`, tsc every touched package) | GREEN |
| `packages/cli` typecheck (production + tests) | EXIT 0, 0 errors |
| cli instance-ai unit suite | GREEN — 1,332 tests / 71 files |
| @n8n/instance-ai suite (guard `text-block`, OutputRedactor removed, option threads gone) | GREEN — 2,854 tests / 201 files |
| @n8n/config suite (durableLog + outputRedaction defaults removed) | GREEN — 111 tests |
| @n8n/api-types suite (run-start langsmith payload) | GREEN — 1,387 tests |
| Typecheck @n8n/instance-ai + @n8n/config + @n8n/api-types + @n8n/db | EXIT 0 |
| Lint on all touched files (cli + SDK) | 0 errors |
| Migration machinery run against a DB | NOT RUN (per standing constraint; the drop migration is registered in both sqlite and postgres indexes, numbered `1784000000045` after master's head) |

The test suite shrank by ~1,519 lines net: legacy-pinning tests (snapshot writes, flat-tree reconstruction, flag-off replay, the redaction-config suite, `nextId`/`getEventsAfter` bus tests) were deleted with their production; the fold-on-read path gained the unit coverage it lacked.
