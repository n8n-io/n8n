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
- **`eval-pr-comment.md`** is posted verbatim by CI; the comment is found by its
  `### Instance AI Workflow Eval` prefix.
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
