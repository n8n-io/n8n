# Durable event log: evaluation report (go/no-go)

Measured: 2026-07-07, branch `r00gm/durable-log-qa-section`, prototype commits `0b4f18f91e1` (phase 1), `b743a506a0a` (phase 2), `875e6790905` + `c1aba890830` + `8a180b67c6d` (phase 3, completed same day: HITL re-suspension, multi-main sweep safety, real crash-resume E2E), model-endpoint fixes `c95f97ab905`, harness `305a229d77c` + `8f941aedf86`, on top of the 5-commit sketch.
Companion to [rfc-instance-ai-durable-event-log.md](./rfc-instance-ai-durable-event-log.md). Every number below is measured, none estimated. Raw data: [durable-log-synthetic.json](./durable-log-synthetic.json), [durable-log-behavior.json](./durable-log-behavior.json).

**Environment:** Apple M1 Pro, macOS 14.6.1, Node 22.22.3, SQLite (WAL) only. No docker and no `ANTHROPIC_API_KEY` in this workspace, so Postgres, the multi-main playwright spec, and real-LLM end-to-end runs are recorded as gaps with the commands to run them elsewhere (see "Gaps"). All A/B comparisons ran on the same machine in the same session; the flag `N8N_INSTANCE_AI_DURABLE_LOG` is the only variable.

**How the numbers were produced:**

- *Synthetic harness* (`packages/cli/test/integration/instance-ai/durable-event-log.harness.test.ts`): the real `InProcessEventBus` + `DurableEventLog` + repositories over a real migrated test DB, driven by scripted streams. S1 small run (29 events, 3 tool steps), S2 long run (1,922 events, 60 steps, ~94% token deltas), S3 concurrent multi-agent (78 events, 3 agents interleaved delta-by-delta). "Paced" publishes yield a 2ms macrotask per step (LLM-ish cadence); "burst" publishes everything synchronously (worst case). 5 runs each, first run discarded as warmup.
- *SDK harness* (`packages/@n8n/agents/src/runtime/__tests__/crash-resume.test.ts`): `AgentRuntime` with a mocked model, real loop, real checkpoint store interface.
- *Behavior harness* (`packages/cli/scripts/durable-log-harness/behavior-harness.mjs`): a real spawned `n8n start` (built dist, throwaway sqlite dir), scripted events through the real bus via an E2E-gated endpoint, real SSE endpoint, real SIGTERM/SIGKILL process lifecycle.

## Verdict summary

| Phase | Verdict | One-line rationale |
|---|---|---|
| 1. Durable log + DB replay | **GO** | Fixes restart replay, cursor reset, and eviction loss outright; ~1ms added delivery latency at realistic pacing; 4 rows / ~2KB per LLM step; flag-off byte-for-byte verified (5,720 existing tests green) |
| 2. Fold-on-read history | **GO, with one condition** | Kills the degenerate-agentTree bug class (0/3 rendered today vs 3/3 with the fold), but the fold is measurably slower than a raw snapshot read (p50 1.6ms vs 6.4ms at 500 facts), which literally fires an RFC failure trigger; condition: keep the derive-on-read cache in the rollout plan or explicitly accept single-digit-ms history loads |
| 3. Sweep + step checkpoints + crash-resume | **GO** | The full chain proven end to end on a REAL n8n process with a REAL orchestrator run (scripted mock model): step checkpoint written, kill -9 mid model call, restart, the sweep atomically claims the checkpoint and re-drives the run to `completed` under its original runId with a visible resumed-after-restart marker; HITL re-suspension wired like the resumed path; multi-main guarded by activity-heartbeat grace + CAS claim. Remaining pre-rollout items are validation, not construction (see gaps) |

The RFC's core claim holds up: **streaming granularity is not persistence granularity.** Persisting 12.6% of events (facts, never deltas) is enough to make replay, history, and crash recovery exact.

## 1. Live-stream delivery latency (publish to subscriber)

Same-process, no network: this isolates exactly what the drain adds. Milliseconds.

| Scenario | Kind | Flag off p50 / p95 | Flag on p50 / p95 | Added p50 |
|---|---|---|---|---|
| S1 small, paced | delta | 0.001 / 0.021 | 1.103 / 1.856 | +1.1ms |
| S1 small, paced | structural | 0.002 / 0.028 | 1.112 / 1.864 | +1.1ms |
| S3 multi-agent, paced | delta | 0.001 / 0.001 | 1.301 / 2.401 | +1.3ms |
| S1 small, burst | delta | 0.001 / 0.001 | 2.220 / 2.462 | +2.2ms |
| S3 multi-agent, burst | delta | 0.001 / 0.002 | 6.714 / 7.653 | +6.7ms |
| S2 long (1,922 events), burst | delta | 0.001 / 0.002 | 18.185 / 21.244 | +18ms |

Reading: flag off is synchronous (sub-microsecond). Flag on adds one queue tick plus a batched INSERT; at realistic pacing that is **~1ms p50, <2ms p95**, far inside SSE-over-network noise. The burst rows are a synthetic worst case (the entire run published in one synchronous flood, so early deltas wait for the batch write ahead of them); a real LLM stream is paced by token generation and never approaches it. Burst numbers also vary run-to-run (S2 burst p50 measured 18 to 38ms across sessions); paced numbers were stable.

Against the real server (behavior harness, includes the HTTP publish POST and per-iteration thread creation, n=12): first-event p50 5.5ms off vs 6.9ms on, p95 7.3ms vs 12.6ms.

**RFC threshold "within noise of baseline; at most one queue tick": met at realistic pacing.**

## 2. DB rows and bytes written per run

| Scenario | Events published | Rows persisted | Bytes | Share persisted |
|---|---|---|---|---|
| S1 small (3 steps) | 29 | 14 | 3,887 | 48% |
| S2 long (60 steps) | 1,922 | 242 | 120,201 | 12.6% |
| S3 multi-agent | 78 | 30 | 8,972 | 38% |

Flag off writes 0 rows to the log in all cases (and instead rewrites the 30 to 300KB `run_snapshots.tree` blob at every run-finish, per the RFC's dev-DB numbers; that write still happens in both arms during migration).

Per LLM step the log costs **4 rows (~2KB): tool-call, tool-result, one text-block, one reasoning-block.** The RFC's "~1 row per LLM step" was optimistic by 4x, but the failure trigger was "exceeding the estimate by an order of magnitude", and 4x is not 10x; at the measured SQLite insert rates (21k/s single-row from the RFC bench) a 60-step run's 242 rows are negligible. Batching works: the entire burst run landed in 2 INSERT batches.

## 3. Replay correctness across restart (the headline fix)

Synthetic (fresh stacks over the same DB simulate the restart), S1 stream:

| Check | Flag off | Flag on |
|---|---|---|
| Events replayable after restart | **0 (all lost)** | 14 (all facts) |
| `nextEventId` after restart | **1 (counter reset; stale cursors now replay wrongly)** | 15 (continues) |
| Fold(replay) equals fold(live stream) | n/a (nothing to fold) | **exact** (tree deep-equal) |
| Mid-stream cursor: fold(live prefix + replayed tail) equals fold(full) | n/a | **exact** |

Real process (behavior R2): publish half a run, SIGTERM, boot a fresh process on the same dir, reconnect with the pre-restart cursor (5). Flag off: 0 events replayed, `nextEventId` back to 1 (the shipped bug, live). Flag on: the cursor stayed valid, replay delivered exactly the facts appended after it, and, unprompted, the startup sweep had already appended `run-finish{interrupted}` for the half-run, so the reconnecting client saw the run terminate instead of spinning. `nextEventId` continued to 7.

## 4. Long-run eviction (the empty-agentTree bug class)

S2 long run, 1,922 events, 60 tool calls expected in the tree:

| | Flag off | Flag on |
|---|---|---|
| Events retained for replay/snapshot input | 500 (cap) / **1,422 lost** | 242 facts, all retained |
| Tool calls in the folded tree | **16 of 60** | **60 of 60** |

This is the RFC's motivating incident reproduced and fixed in one table: with the flag off the run evicts its own history mid-run and today's snapshot input is already truncated before run-finish.

## 5. Mid-block reconnect (replace semantics)

Synthetic: disconnect a client 3 deltas into an open text segment, reconnect with the last durable cursor; the replayed `text-block` REPLACES the partial deltas through the shared reducer. Folded tree after reconnect deep-equals the never-disconnected tree; no text or reasoning renders twice.

Real server (behavior R3): client saw `AAA`, `BBB` live, disconnected, segment completed with `CCC`; the replay carried one `text-block("AAABBBCCC")` for the same responseId and the reducer's replacement yields exactly `AAABBBCCC` once. (Flag off within one process replays the raw `CCC` delta by id, also correct; the difference is that flag on stays correct across restarts and eviction, where flag off has nothing to replay.)

## 6. Concurrent writers (multi-main precursor)

Two `DurableEventLog` instances on one thread, interleaved so the second writer's cached seq goes stale: the (threadId, seq) PK collision fired, was retried once after a reseed, all 3 events persisted with contiguous seqs 1..3, zero dropped batches. The mechanism [#33558](https://github.com/n8n-io/n8n/pull/33558) solves with a shared Redis sequence exists here by construction; what the log does not replace is that PR's live relay id-carry, which stays worthwhile.

## 7. History load: snapshot read vs fold (phase 2)

`getRichMessages` p50/p95 in ms, 20 iterations after 3 warmups, realistic complete snapshot trees in both arms (equal rendered content, verified):

| Persisted facts | Flag off (snapshot read) | Flag on (fold) | Ratio |
|---|---|---|---|
| 10 (1 run) | 0.96 / 1.97 | 1.55 / 3.24 | 1.6x |
| 100 (5 runs) | 1.15 / 1.76 | 2.39 / 2.99 | 2.1x |
| 500 (10 runs) | 1.64 / 2.39 | 6.35 / 7.80 | 3.9x |

**The RFC failure trigger "fold-on-read history latency exceeding today's snapshot read" fires, literally.** Context for the verdict: the absolute cost is single-digit milliseconds on a 500-fact thread (row fetch + JSON parse + fold), invisible next to network and rendering, and it buys the correctness below. The RFC's own end state already contains the mitigation (snapshot demotes to a derive-on-read cache); the prototype deliberately skips the cache. Condition for phase 2 GO: either carry that cache into the production PR or record the acceptance of ms-level fold cost explicitly.

**The bug class this buys (degenerate snapshot, same thread shape, 10 facts):**

| | Flag off | Flag on |
|---|---|---|
| Tool calls rendered when the persisted snapshot is degenerate/empty | **0 of 3** (today's fallback renders message text only) | **3 of 3** (fold ignores the broken snapshot) |
| Latency p50 | 0.86ms | 1.25ms |

Also verified: runs with log rows but NO snapshot row at all (write failed or process died first) get their tree synthesized from the log, grouped by the run-start `messageGroupId`; pre-log threads (no rows) take the untouched legacy path.

## 8. Interrupted-run sweep and crash-resume (phase 3)

Synthetic matrix (real sweeper + real repositories):

| Scenario | Result |
|---|---|
| run-start + in-flight tool-call, no finish, no checkpoint | `tool-interrupted` fact appended for the in-flight call, one `run-finish{interrupted}` appended, fold renders the run terminal with the call resolved ("effect unverified" error, not loading) |
| Same, sweep run twice | idempotent (second sweep appends nothing) |
| Running step checkpoint exists | crash-resume invoked with threadId/runId/userId (from the run-start fact)/checkpointKey/messageGroupId; NO run-finish appended (the resumed run owns its terminal event) |
| Corrections: one drained (in checkpoint), one undrained (log only) | exactly the undrained correction re-queued as a context note; the drained one not repeated; in-flight calls get verify-before-retry notes |
| HITL-suspended checkpoint | skipped entirely (pending-confirmation orphan path owns recovery); crash-resume not called, nothing appended |

Real process (behavior R4): publish run-start + in-flight tool-call, `kill -9`, restart. The startup sweep found it: `tool-interrupted` fact for the in-flight call, `run-finish{status: interrupted}`, sweep counters `{runsExamined: 1, runsMarkedInterrupted: 1, toolInterruptedFacts: 1}`. **The zombie-run class dies.**

SDK level (mocked model, real loop): with `stepCheckpoints: true` a 3-turn run wrote exactly 2 step checkpoints (one per settled tool batch, status `running`, `pendingToolCalls: {}`, message list containing both tool calls), deleted the checkpoint on completion, and after a simulated crash a fresh runtime's `crashResume({runId, contextNotes})` continued under the **same runId** with the checkpointed history plus the notes visible in the next model call, running to completion.

**Real end-to-end crash-resume (behavior R5, the full outcome):** a REAL orchestrator run on a REAL spawned n8n, driven by a scripted OpenAI-compatible mock server standing in for the LLM (`mock-openai-server.mjs`; no key needed). The mock's first turn issues one tool call picked from the orchestrator's own tool list, the real tool executes, the loop persists the step checkpoint, and the second model call parks (the crash window). Then `kill -9`, restart, and the startup sweep does the whole recovery unassisted:

| Check | Result |
|---|---|
| Sweep counters after restart | `{runsExamined: 1, runsCrashResumed: 1, runsMarkedInterrupted: 0}` |
| Checkpoint claim (CAS) | won; run re-driven, not marked interrupted |
| Run identity | finished under the ORIGINAL runId (`run-finish{completed}` in the log) |
| Real tool call in the durable log | 1 (the orchestrator's own tool, executed pre-crash) |
| Resumed-after-restart marker | visible as a durable text-block in the timeline |
| History after recovery | assistant message renders via GET /messages |

Completing the chain also hardened the pieces the first measurement round had stubbed: a crash-resumed run that re-suspends at HITL now registers exactly like the resumed path (in-memory suspension + persisted pending confirmation + confirmation event + refreshed snapshot), and multi-main got its safety story without a lease table: durable activity (newest log fact or checkpoint upsert, both per-step) is the liveness heartbeat behind a 2-minute grace window, and the checkpoint claim is an atomic compare-and-swap so two sweeping mains cannot double-drive one run. Single-main sweeps skip the grace window and stay instant.

Two production bugs were found and fixed on the way, because the mock exercised the documented custom-model path for real (`c95f97ab905`): `N8N_INSTANCE_AI_MODEL_URL` was silently ignored (host configs spell the base URL as `url`, the provider credential schemas only accept `baseURL`, and Zod strips unknown keys), and `@ai-sdk/openai` v3's default model targets OpenAI's Responses API (`/responses`), which OpenAI-compatible servers (LM Studio, vLLM, Ollama) do not implement; a custom baseURL now routes through the chat-completions model. The documented LM Studio path could not have worked before either fix.

## RFC success criteria matrix

| Signal (RFC) | Target | Measured | Verdict |
|---|---|---|---|
| Degenerate/empty agentTree on history load | zero for post-log threads | fold renders 3/3 vs 0/3 today; snapshot-less runs synthesized | **PASS** |
| History correctness after restart | passes on every main | exact fold equality after restart (synthetic + real process); multi-main by construction, not exercised (no docker) | **PASS single-main, multi-main unverified** |
| Duplicate/missing text after reconnect mid-stream | zero | exact tree equality; behavior R3 replaces partial segment | **PASS** |
| Zombie runs | zero once sweep ships | kill -9 to interrupted terminal fact, idempotent, HITL-safe; with a step checkpoint the run crash-resumes to completion instead (R5) | **PASS (startup sweep; multi-main via activity heartbeat + CAS claim, E2E-unverified)** |
| Live-stream latency | within noise; one queue tick | +1.1ms p50 paced; burst floods add batch-write latency (synthetic worst case) | **PASS** |
| Log volume | ~1 row/LLM step; alert past p99 | 4 rows / ~2KB per step (call+result+2 blocks); 12.6% of events on a delta-heavy run | **PASS with corrected estimate (4x, below the 10x trigger)** |
| (threadId, seq) append conflicts | ~zero, retried | conflict retried once, no loss, contiguous seqs | **PASS** |
| Net LOC in render/replay path | net-negative after TTL sunset | +1,819 gross production LOC now (see accounting); the deletions (parser ladder, snapshot machinery, `cancelInFlightNodes`, [#33558](https://github.com/n8n-io/n8n/pull/33558) fallbacks) remain future work by design | **NOT YET MEASURABLE (end-state claim)** |

Failure triggers: first-delta p95 within noise (no trigger); log growth 4x estimate (below the 10x trigger); **fold-on-read latency exceeds snapshot read (trigger fires; see section 7 for the condition attached to phase 2)**.

## LOC and complexity accounting

| Unit | Commit | Diff |
|---|---|---|
| Sketch (5 commits, pre-existing) | `6bd6c9b...6e58d02` | +751 / -114 |
| Phase 1 complete (flag, legacy restore, hardening, instrumentation) | `0b4f18f91e1` | +558 / -132 |
| Phase 2 fold-on-read | `b743a506a0a` | +139 / -6 |
| Phase 3 SDK (checkpoints, crashResume, schema) | `875e6790905` | +203 / -15 |
| Phase 3 cli (sweeper, crash-resume drive) | `c1aba890830` | +456 / -30 |
| Phase 3 completion (HITL re-suspension, grace + CAS claim, marker) | `8a180b67c6d` | +136 / -19 |
| Model-endpoint fixes (url alias, chat-completions routing) | `c95f97ab905` | +44 / -1 |
| Lint | `efb940ca71a` | +11 / -10 |
| Harness (test-only) | `305a229d77c` + `030c6f15746` + `8f941aedf86` | +2,182 |

Production (non-test) code total vs master: **+1,819 / -52 across 28 files** (includes ~180 lines of instrumentation and the E2E-only test-controller endpoint). The flag doubles some read paths during migration (controller replay, snapshot events source, nextEventId), which is the cost of the byte-for-byte off switch; those legacy branches and the fallback ladder are the planned post-sunset deletions the RFC counts against this.

## Go/no-go, per phase

**Phase 1: GO.** It fixes three shipped-bug classes outright (restart replay loss, cursor reset, eviction loss), measured cost is ~1ms delivery latency and ~2KB per step, the append path survives concurrent writers, and flag-off is verified byte-for-byte (existing suites: cli instance-ai 1,347, @n8n/instance-ai 2,047, @n8n/agents 946, api-types 1,383, all green with the flag off; plus 10 harness scenarios green with it on). Before a production PR: compose with [#33558](https://github.com/n8n-io/n8n/pull/33558) (drain merge + seed seq from the Redis high-water mark), carry seq on the relay so sibling live frames advance cursors, promote the prototype counters to the Prometheus metrics service, and port the harness's correctness scenarios into unit tests.

**Phase 2: GO, with one condition.** The degenerate-agentTree incident class and the raw-text-resurrection privacy gap (history no longer falls back to unredacted `instance_ai_messages` content for post-log threads) die structurally. The condition: the fold is 1.6 to 3.9x slower than a raw snapshot read (absolute: p50 6.4ms at 500 facts), which fires the RFC's own trigger as written; ship it with the derive-on-read cache from the RFC's end state (snapshot demotes to cache, fold only on miss/invalidation), or record acceptance of single-digit-ms history loads. Everything else in this phase is future deletion, not addition.

**Phase 3: GO.** All three gates from the first measurement round are closed. The full chain (per-step checkpoint, kill -9, startup sweep, atomic checkpoint claim, agent rebuild, re-drive with verify-first notes, completion under the original runId, visible resume marker) is proven end to end on a real n8n process against a scripted model (behavior R5), not just at the SDK level. HITL re-suspension during a crash-resumed run persists its pending confirmation like any other suspension. Multi-main is guarded by the activity-heartbeat grace window plus the CAS claim (double-drive impossible by construction). What remains before rollout is validation, not construction: one run against real Anthropic (provider fidelity: thinking signatures and tool-use ids replaying from a checkpointed list), one multi-main E2E under docker, and a product signoff on auto-resume semantics (an instance silently continuing agent work after an unclean restart is a behavior decision; the timeline marker makes it visible, but someone should decide it is wanted). Given those are checks rather than builds, phase 3 can ride the same rollout train as phases 1 and 2 behind the one flag.

## How to demo

All commands from the repo root; build once with `pnpm build --filter=n8n > build.log 2>&1`.

**1. Restart survival (cursor + history live through a restart, and the sweep terminates the half-run):**

```bash
cd packages/cli
node scripts/durable-log-harness/behavior-harness.mjs --flag on
# watch: "R1 reload mid-run PASS" and "R2 restart mid-run" with
# replayedTypes ["run-finish"] and a cursor that survived the SIGTERM.
# Run with --flag off to watch the same reconnect replay nothing and
# nextEventId reset to 1.
```

**2. Long-run eviction fix (flag off provably loses 74% of the run, flag on loses nothing):**

```bash
cd packages/cli
pnpm test:sqlite test/integration/instance-ai/durable-event-log.harness.test.ts \
  -t 'long run'
# assertion: flag off folds 16 of 60 tool calls after self-eviction,
# flag on folds 60 of 60 from the log. Numbers land in
# $TMPDIR/durable-log-synthetic.json (override with DURABLE_LOG_RESULTS).
```

**3. Crash sweep and full crash-resume (kill -9, restart, run continues to completion):**

```bash
cd packages/cli
node scripts/durable-log-harness/behavior-harness.mjs --flag on
# watch: "R4 kill -9 mid-run, startup sweep PASS" (zombie run terminated with
# tool-interrupted facts) and "R5 real crash-resume (mock LLM) PASS": a REAL
# orchestrator run killed -9 mid model call resumes from its step checkpoint
# after restart and finishes completed under its original runId, with
# sweepCounters {runsCrashResumed: 1} and the resume marker in the timeline.
```

SDK crash-resume (mocked model, same runId continuation with context notes):

```bash
cd packages/@n8n/agents && pnpm vitest run src/runtime/__tests__/crash-resume.test.ts
```

## Gaps and caveats (read before quoting numbers)

- **SQLite only.** No docker here, so the Postgres arm of the synthetic harness was not run; the harness supports it (`pnpm test:postgres` with a reachable Postgres). Expect the fold and insert numbers to shift, not the correctness results.
- **Multi-main spec not run** (needs docker + redis): `pnpm --filter=n8n-playwright test:local tests/e2e/instance-ai/instance-ai-multimain.spec.ts` should be run flag off (parity) and flag on before any multi-main exposure. Cross-main relay behavior is covered flag-off by existing unit tests; flag-on sibling frames are id-less by design until the relay carries seq.
- **Crash-resume is proven end to end against a scripted OpenAI-compatible model, not against real Anthropic.** The mock validates the whole n8n-side chain (checkpoint, sweep, claim, rebuild, re-drive, completion) but cannot validate Anthropic provider fidelity on resume (extended-thinking signatures and tool-use ids replaying from a checkpointed message list). Run once with a key: `ANTHROPIC_API_KEY=... pnpm test:local:instance-ai` from `packages/testing/playwright` with `N8N_TEST_ENV='{"N8N_INSTANCE_AI_DURABLE_LOG":"true"}'`, and the R5 flow manually. The HITL re-suspension path during a crash-resumed run is implemented as a faithful port of the proven resumed-path code but was not independently driven by a scenario.
- **Raw-at-rest is user-visible with the flag on:** taking the stream-side redactor off the publish path (team decision) means live SSE text is no longer scrubbed of secret patterns, not just the stored rows. If rollout wants redacted-to-UI with raw-at-rest, that is a different (egress-side) wiring than the prototype's one-line bypass.
- **Remaining prototype ceilings marked `ponytail:` in code:** startup-only sweep (no recurring interval; multi-main is protected by the activity-heartbeat grace window + CAS claim, but a periodic sweep is production work), newest-running-checkpoint-per-thread assumed to belong to the swept run (a runId column on checkpoints makes it exact), and the E2E metrics endpoint plus counters are prototype instrumentation, not the Prometheus integration. The multi-main grace/claim logic is unit-exercised but not E2E-tested (needs docker + redis).
- **Burst latency numbers are floor-noise sensitive** and varied up to 2x between sessions; treat paced numbers as the representative ones.
- The `instance-ai-terminal-outcome.service.ts` consumers still read the bus cache with the flag on (same-process reads, correct today); switching them to the log is a production nicety, not a correctness need.

## Addendum: production-quality completion pass (2026-07-07, post-report commits)

The commits after the measured report closed the caveats above. What each did and which caveat it retires:

| Commit | What | Caveat closed |
|---|---|---|
| `375dce85a2f` | Harness publish-events endpoint enforces thread ownership even in E2E mode | security-review finding on the harness endpoint |
| `8a180b67c6d` | HITL re-suspension during crash-resume (real registration + persisted confirmation), multi-main activity-heartbeat grace window + atomic CAS checkpoint claim, durable resumed-after-restart marker | "HITL re-suspension is stubbed"; "multi-main needs the lease first" |
| `c95f97ab905` | `url` accepted as baseURL alias in model configs; custom baseURL routes @ai-sdk/openai through chat-completions | the two model-endpoint bugs that made `N8N_INSTANCE_AI_MODEL_URL` unreachable |
| `8f941aedf86` | Scripted OpenAI-compatible mock server + behavior scenario R5 (real run, kill -9, sweep claims + crash-resumes to completion, PASS) | "crash-resume end-to-end with a real LLM is unverified" (mock-model E2E; real-Anthropic fidelity remains a validation item) |
| `62b477090eb` | `hostRunId` column on `instance_ai_checkpoints` (migration `1784000000044`) with sweeper exact-match; terminal-outcome guard and outcome-replay reads flag-resolved to the log | "newest-checkpoint assumption"; "terminal-outcome reads the bus cache" |
| `29d4c605918` | DurableLogMetrics emits typed EventService events; Prometheus counters/histograms for rows, bytes, queue latency, conflicts, failures, replays, cursor age, fold duration, parser fallbacks, swept runs | "prototype instrumentation, not the Prometheus integration" |
| `20b70b6b99c` | FE replay cursor: id-bearing-frames-only contract made explicit, NaN guard | FE follow-up from the sketch sizing doc |
| `cc8a681c8c9` | Docs: architecture/streaming-protocol/configuration no longer claim thread-storage persistence; protocol documents DB cursors, id-less ephemeral frames, replace-semantics blocks | "one task regardless of outcome" from the RFC |
| `5890f4da347` | 28 unit tests porting the harness correctness matrix (drain/coalescer 9, sweeper 10, service crash-resume 3, reducer 4, controller flag-on replay 1, SDK HITL-during-crash-resume 1) | "the HITL re-suspension path was not independently driven"; harness-only coverage |

**Redaction policy, stated explicitly (team decision, 2026-07-06):** with `N8N_INSTANCE_AI_DURABLE_LOG` on, the stream-side OutputRedactor is off the publish path entirely. Events are raw at rest in `instance_ai_events` AND raw on the live SSE stream to the user's own browser; this is by policy (redaction exists for LangSmith egress, where `trace-payloads.ts` keeps its own stricter redactor, untouched). The whole bypass is one guard at the top of `resolveOutputRedaction` in `output-redaction-config.ts`, so reversing or re-scoping the policy is a one-line change at one seam. The trigger that would force a read-side redaction pass is shared threads (participants seeing each other's content), per the RFC Q&A.

**Still environment-blocked after this pass** (commands in [durable-log-final-status.md](./durable-log-final-status.md)): the Postgres harness arm and the multi-main playwright spec (both need docker). The real-Anthropic runs were unblocked and executed; see Addendum 2 below.

## Addendum 2: real-LLM validation (2026-07-07, key sourced from `.env.eval`)

The two remaining real-LLM items from the list above were executed with `ANTHROPIC_API_KEY` sourced from `packages/@n8n/instance-ai/.env.eval` (never printed, never committed).

### Real-Anthropic crash-resume: PASS

`packages/cli/scripts/durable-log-harness/real-crash-resume.mjs` (committed `7fd25b9b388`) boots a real n8n on `anthropic/claude-sonnet-4-6` with extended thinking, sends a multi-tool prompt, polls the checkpoint table until the run has real tool calls in the durable log, `kill -9`s the process mid-run, restarts, and asserts the sweep outcome. Result (raw JSON at `behavior.realCrashResumeAnthropic.on` in [durable-log-behavior.json](./durable-log-behavior.json)):

| Assertion | Value |
|---|---|
| Run | `run_MInogE0x639kKeZ0cPfhg`, 3 real tool calls persisted before the kill |
| Sweep counters after restart | `runsExamined: 1`, `runsCrashResumed: 1`, `runsMarkedInterrupted: 0` |
| Terminal state | `run-finish` with `status: completed` under the ORIGINAL runId |
| Resumed-after-restart marker | present in the timeline |
| Thinking-signature fidelity | `providerSignatureErrorsInLogs: 0` — no `signature` / `AI_APICallError` / `invalid_request_error` in either process log, so the checkpointed message list (thinking blocks + signatures included) replayed against the real API without rejection |

This closes the RFC's last open fidelity question: Anthropic verifies thinking-block signatures server-side, so a checkpoint that mangled them would fail loudly at resume. It did not.

### Real-LLM playwright local suite, flag A/B: one differential, root-caused and fixed

This box cannot give a green absolute baseline (mass "Workflow builder unavailable" failures from missing browser sandboxing), so the suite verdict rests on A/B differencing: flag off 31F/4P/5S vs flag on 32F/3P/5S, identical failure lists except ONE spec: `instance-ai-background-lifecycle.spec.ts` "should recover when a background builder task is cancelled", failing flag-on only.

Root cause, three layers deep:

1. The cancellation outcome line is published by the terminal-outcome service AFTER `run-finish`, as a `text-delta`. Flag on, a trailing delta has no following structural fact, so only the idle flush (3s) would persist it; the test reloads faster than that. Fix: outcome lines publish as `text-block` when the flag is on (`16ba5f7f736`), durable by construction.
2. That exposed the real gap: the FE store-level reducer (`instanceAi.reducer.ts`, which routes SSE events to message groups before delegating to the shared run reducer) predated the block events entirely. `text-block`, `reasoning-block`, and `tool-interrupted` fell through its switch and were silently dropped, live AND on replay. Fix: blocks route like their delta siblings (the shared reducer's replace semantics prevent duplication), `tool-interrupted` routes with the other tool facts (`db5c4372154`, +3 reducer tests, 56/56 green).
3. A first re-run still failed because `n8n start` serves the BUILT editor bundle; after `pnpm build --filter=n8n-editor-ui` the spec passes flag-on (1 passed, 5.2s) and so does its whole file (1 passed, 14.9s).

The takeaway for the go/no-go: the differential was not a durability defect but a frontend routing gap for the new event types, exactly the class of bug the A/B harness exists to catch. Phase 1-3 verdicts unchanged.

### Repo-wide ritual (final tree)

`NODE_OPTIONS=--max-old-space-size=8192 pnpm exec turbo run typecheck --concurrency=2`: EXIT 0, 120/120 tasks. Same recipe for lint: EXIT 0, 116/116 tasks. Recorded in the merge-readiness checklist of [durable-log-final-status.md](./durable-log-final-status.md).
