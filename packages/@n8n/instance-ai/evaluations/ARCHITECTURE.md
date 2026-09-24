# Eval harness architecture

One pipeline, two thin drivers (TRUST-261). Every phase of a run lives behind a
named seam in `evaluations/run/`; `cli/index.ts` is a ~150-line composition
root, and the rest of `cli/` is the sibling entrypoints (`pairwise`,
`compare-pairwise`, `report`, `build-mcp-manifest`, `langtracer-push`) plus
their helpers (`args.ts`, `mcp-builder.ts`).

```
cli/index.ts (composition root)
  → run/case-selection.ts   narrow loaded cases (prebuilt coverage, MCP limits)
  → run/lane-setup.ts       one authenticated lane per --base-url (+ final cleanup)
  → driver:
      run/langsmith-driver.ts   LANGSMITH_API_KEY set — evaluate(), experiments,
                                per-run pass metrics, gate/baseline comparison
      run/direct-driver.ts      keyless — the LangTracer dispatcher's mode; same
                                rows, same pipeline, same local artifacts — just
                                no LangSmith experiments/feedback/comparison
        → run/eval-session.ts   shared assembly: lane wrappers (tracing hook),
                                work-stealing allocator, orchestrator, pipeline,
                                side-band resolution, end-of-run artifact drain
          → run/build-orchestrator.ts  getOrBuild: per-(iteration, case) build
                                       cache, transient retry across lanes,
                                       side-band capture (transcript, expectation
                                       verdicts incl. artifactContext, run debug)
          → run/case-pipeline.ts       runRow: sentinel / build-fail / agent /
                                       workflow dispatch, transient retry, seed-
                                       table serialization, framework_issue
                                       guard, eager per-build cleanup
  → run/rows.ts        single source of row set + order for BOTH drivers
  → run/reshape.ts     rows → WorkflowTestCaseResult[][] (driver-agnostic)
  → run/aggregator.ts  pass@k / pass^k aggregation
  → run/persist.ts     always-write eval-results.json / eval-pr-comment.md,
                       row journal (eval-rows.jsonl) + crash recovery
  → comparison/*       baseline comparison + the absolute gate
  → run/reporters.ts   console paths, HTML reports, terminal summary, noise advisory
```

The tracing hook is the only driver-specific piece of the session: the
LangSmith driver wraps lane functions with `traceable()` (span names
`workflow_build` / `scenario_execution` / `agent_scenario_execution` — the
analytics pipeline reads them), the direct driver passes identity.

## Harness primitives

The `run/` phases sit on domain modules in `evaluations/harness/` (TRUST-342
split them out of the old `runner.ts` monolith):

- `harness/build-workflow.ts` — `buildWorkflow` end to end (thread +
  credential-view setup, conversation seeding, chat loop, outcome discovery)
  and its `BuildResult` / `BuildWorkflowConfig` types.
- `harness/scenario-execution.ts` — `executeScenario` against a built
  workflow, multi-workflow entry-point routing, and verification-artifact
  assembly (`VerificationArtifact`).
- `harness/agent-execution.ts` — `executeAgentScenario` and the agent
  artifact helpers (the agent-anchored counterpart of scenario execution).
- `harness/seed-tables.ts` — the scenario seed-data-table family (TRUST-311):
  dedupe, pre-seed note, per-scenario row reseeding.
- `harness/cleanup.ts` — `cleanupBuild`, per-case timeout policy, bounded
  concurrency, binary workflow checks and shared failure summaries.

## Expectation judging: context blocks and preconditions

`build-expectations/verifier.ts` assembles one prompt per build. Everything the
judge may treat as fact goes in under a **"Ground truth — do not recount"**
heading, so a block is never something the judge re-derives from prose:

- The transcript (`utils/conversation-text.ts`), with per-turn token usage
  inlined in each turn header — step count, input tokens, cached share, output
  tokens — joined to the turn by its `runIds` (one turn spans many runs, because
  every resume emits its own `run-start`).
- A build-wide token **Total**, a cache read/write split, and a **Fixed
  overhead** line (the opening step's input — instructions and tool schemas
  plus one user message, before the thread had any history).
- The **observation rows** for the thread (markers + text), read from
  `instance_ai_observations` — so an expectation can grade the compacted summary
  itself, not just whether the reply happened to be right.
- The built workflow, tool traces, and rendered artifacts.

The **token** numbers come from `RunDebugBuffer` snapshots, so they need
`N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true` on the instance under test; without it
those blocks render `(no run debug captured)`. The **memory** block does not —
it is a separate REST read, so a compaction case runs with the flag off.

The buffer keys records by `runId` and hooks only the orchestrator's own stream
(`buildOrchestratorAgentStreamOptions` and its resume twin are the sole call
sites of `createRunDebugStepHooks`). A workflow build runs in that loop, so a
workflow case's totals are its whole cost. A delegated **Agent** build reuses
the same `runId` on a stream with no hooks, and a step carries no `agentId`, so
its tokens are absent and could not be attributed even if the hooks existed.
Per-agent cost attribution needs hooks on the builder stream plus an `agentId`
on `RunDebugStep` / `InstanceAiRunDebugStep`.

`DEBUG_JUDGE_CONTEXT=<file>` dumps the assembled prompt, which is the only
practical way to check a new block renders as intended.

**Preconditions belong in the harness, not the prompt.** When a case's premise
can fail to materialise (`requiresMemoryCompaction` — no compaction cursor, or a
cursor with no observations), `run/build-orchestrator.ts` replaces the judge call
with `allFailVerdicts(…)`, producing `incomplete` verdicts that scoring
**excludes**. The judge never learns the premise was checked: it grades the
conversation, and a misconfigured lane must not read as a quality regression.
Same mechanism as `priorRunFailed`.

**Read state from its own store, not from a rendering.** The premise check used
to regex an `<observations>` tag out of the debug snapshot's system prompt,
through a *display* helper. That is the same surface that silently emptied when
the AI SDK renamed `system` to `instructions` (#38887) — and it fails quietly, so
a rename would report every compaction case "not judged" forever while looking
fine. `GET /rest/instance-ai/eval/threads/:threadId/memory` serves the rows and
the cursor instead.

## Where to add things

| You want to… | Touch exactly |
|---|---|
| Add a grader / judge / check wiring | `run/case-pipeline.ts` (row-side) or `run/build-orchestrator.ts` (build-side capture) — it then runs in CI **and** dispatcher mode |
| Add a tier | nothing — tiers are free-form strings in a case's `datasets` field; only a tier that should assert the absolute green bar registers in `run/tiers.ts` |
| Add a case source | `data/source.ts` (`--source` dispatch) |
| Add a driver | compose `createEvalSession()` + feed rows from `run/rows.ts` |
| Change persisted output | `run/persist.ts` — and extend `__tests__/eval-results-dispatcher-contract.test.ts` |

## External contracts (do not drift silently)

- **`eval-results.json`** is ingested by the LangTracer dispatcher, which runs
  this CLI keyless per case. The exact field set is pinned by
  `__tests__/eval-results-dispatcher-contract.test.ts`.

  **The CLI is per case; the n8n instance is not.** The dispatcher never starts
  n8n — it targets a long-lived container per slot, `restart: unless-stopped`,
  booted once for the whole sweep and never reset between cases. The nightly
  runs ~12 of them (runners x slots), so one n8n process serves dozens of cases
  back to back. Isolation is per-case *user* (`run/lane-users.ts`
  `provisionCaseBuildUser`), not per-case instance. Assume anything the backend
  holds in memory outlives the case that created it, and size it for a
  multi-hour process rather than one run.
- **`eval-pr-comment.md`** is posted verbatim by CI. The comment uses an
  `### Instance AI Workflow Eval` or `### Instance AI Agent Eval` prefix.
- **LangSmith feedback keys** (`scenario_pass`, `failure_category`,
  `evals.workflows.*`, `pass_at_k`, `pass_hat_k` — plus `build_cost_usd` /
  `build_turns` on `--build-via-mcp` rows) and the traced span names
  feed the LangSmith→BigQuery analytics.
- **`pnpm eval:*` script names** are invoked by CI workflows and
  `run-eval-lanes.sh`.

## Crash recovery

Both drivers journal every completed row to `<output-dir>/eval-rows.jsonl`
(`run/persist.ts`). If the run dies, `runEvalAndPersist` reshapes the journal's
*complete* iterations into `eval-results.json` — incomplete iterations are
dropped, never stubbed, so a crash artifact cannot fabricate failures for rows
that never ran. This is also the merge seam for sharding runs (TRUST-152):
concatenate journals, reshape once.
