---
name: n8n:create-instance-ai-eval
description: >-
  Authors a new Instance AI workflow eval case, grounding its outcome
  expectations and execution scenarios in a real build run rather than guesses.
  Use when adding a test case to packages/@n8n/instance-ai/evaluations/data/workflows,
  or when the user asks to create/add an Instance AI workflow eval.
---

# Create an Instance AI workflow eval

Each eval is **one JSON file** in
`packages/@n8n/instance-ai/evaluations/data/workflows/`. The loader
auto-discovers `*.json` and validates against
[`schema.ts`](../../../packages/@n8n/instance-ai/evaluations/data/workflows/schema.ts)
(`.strict()` — unknown keys fail at load). No registration step.

The core principle: **don't guess `outcomeExpectations` / `executionScenarios` —
build the workflow once for real, inspect it, then write assertions that match
what a correct build actually produces.** See the eval
[README](../../../packages/@n8n/instance-ai/evaluations/README.md) for the full
field reference.

## Workflow

1. **Draft the case** from the template below. Required: `conversation` (≥1
   turn, first `user`), `executionScenarios` (≥1), `complexity`, `tags`. Put
   placeholders in `outcomeExpectations` / scenario `dataSetup`+`successCriteria`.
   Validate it loads (see "Validate" below) before running.
2. **Run it once** (see "Run locally"). Use `--keep-workflows` so the built
   workflow stays on the instance for inspection.
3. **Inspect the built workflow** — fetch it via
   `GET /rest/workflows/<id>` (the run prints `BUILT (<id>)`) and read the nodes,
   parameters, and connections.
4. **Ground the assertions**: rewrite `outcomeExpectations` to describe the
   structure a correct build has, and `executionScenarios` (`dataSetup` →
   `successCriteria`) to match how that workflow runs on mocked data.
5. **Re-run to confirm** the grounded expectations pass. Optionally
   `--iterations 5` to measure flakiness before adding the case to a tighter
   tier (`datasets: ["pr", ...]`).

## Template

```json
{
  "description": "What this case tests.",
  "conversation": [
    { "role": "user", "text": "<the build prompt>" }
  ],
  "complexity": "medium",
  "tags": ["build", "<nodes>", "<concepts>"],
  "triggerType": "schedule",
  "datasets": ["full"],
  "outcomeExpectations": [
    "<structural assertion about the resulting workflow JSON>"
  ],
  "executionScenarios": [
    {
      "name": "happy-path",
      "description": "<what this run exercises>",
      "dataSetup": "<input + what mocked services return>",
      "successCriteria": "<observable proof the run succeeded>"
    }
  ]
}
```

For a clarifying-question / multi-turn case, add `assistant` reference turns and
a `user` stage direction in `[square brackets]` (proxy behaviour, never sent to
the builder), e.g. `[Don't mention the channel unless asked; then say 'Slack
#growth.']`. `processExpectations` judge the conversation; `outcomeExpectations`
judge the workflow. Both count as pass-rate units.

## Lessons (from real grounding)

- **Agent behaviour is non-deterministic.** Whether it asks a clarifying
  question, and which service/source it picks, varies run to run. Keep
  `outcomeExpectations` **source-agnostic** (assert "fetches via an HTTP Request
  / external API", not a specific vendor) so they pass regardless of the
  agent's choice. Put vendor-specific intent in `processExpectations`, accepting
  it as a flaky behaviour signal.
- **The mock layer doesn't always honor `dataSetup`** for state-bearing reads
  (e.g. a Data Table "previous value"). Scenarios that depend on injected prior
  state can fail with `[mock_issue]` — phrase `dataSetup` to steer the mock, and
  expect some flakiness for change-detection-style workflows.
- **Don't over-specify counts** that depend on mock data; describe conditions
  ("fewer than before", "no alert sent") not exact numbers.

## Validate

```bash
cd packages/@n8n/instance-ai
npx tsx -e "import {loadWorkflowTestCasesWithFiles} from './evaluations/data/workflows/index.ts'; console.log(loadWorkflowTestCasesWithFiles('<slug>')[0].fileSlug)"
```

## Run locally

Needs a live n8n with Instance AI enabled (not a default instance): a model key,
and a working sandbox. See
[setup notes](reference.md) for the exact env combo (the README's quick-start
omits the sandbox-auth pieces). Then, from `packages/@n8n/instance-ai`:

```bash
pnpm eval:instance-ai --filter <slug> --keep-workflows --verbose
```
