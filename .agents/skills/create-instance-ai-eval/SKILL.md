---
name: n8n:create-instance-ai-eval
description: >-
  Authors a new Instance AI workflow eval case, writing intent-driven outcome
  expectations and execution scenarios and calibrating them against a real build
  run. Use when adding a test case to packages/@n8n/instance-ai/evaluations/data/workflows,
  or when the user asks to create/add an Instance AI workflow eval.
---

# Create an Instance AI workflow eval

Each eval is **one JSON file** in
`packages/@n8n/instance-ai/evaluations/data/workflows/`. The loader
auto-discovers `*.json` and validates against
[`schema.ts`](../../../packages/@n8n/instance-ai/evaluations/data/workflows/schema.ts)
(`.strict()` — unknown keys fail at load). No registration step.

The core principle: **write expectations from intent, then calibrate against a
real build.** Decide up front what makes *any* correct solution correct (the
must-haves implied by the prompt), then build the workflow once for real to
calibrate granularity — loosen what's over-specified, confirm the must-haves are
achievable, and catch requirements the agent legitimately satisfies a different
way. Do **not** transcribe one observed build into assertions: that overfits the
eval into "did the agent reproduce that run" instead of "did it solve the
problem." See the eval
[README](../../../packages/@n8n/instance-ai/evaluations/README.md) for the full
field reference.

## Workflow

1. **State the must-haves first.** From the prompt alone, list what every
   correct workflow must do (trigger type, the essential operations, the gating
   condition). These become draft `outcomeExpectations`. Required case fields:
   `conversation` (≥1 turn, first `user`), `executionScenarios` (≥1),
   `complexity`, `tags`.
2. **Draft the case** from the template below; validate it loads (see
   "Validate") before running.
3. **Run it once** (see "Run locally") with `--keep-workflows` so the built
   workflow stays on the instance for inspection.
4. **Inspect the built workflow** — fetch it via `GET /rest/workflows/<id>` (the
   run prints `BUILT (<id>)`) and read nodes, parameters, and connections.
5. **Calibrate** the expectations against what you saw: relax any assertion the
   build satisfied a valid-but-different way, tighten any that a wrong build
   would have slipped past, and phrase `executionScenarios`
   (`dataSetup` → `successCriteria`) to match how the workflow runs on mocked
   data. Keep the must-haves; adjust only their granularity.
6. **Re-run to confirm** the calibrated expectations pass. Optionally
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
    "<a must-have condition any correct workflow satisfies>"
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

## Sizing each assertion

An assertion is right-sized when **every correct build passes it and a wrong or
lazy build fails it**. Quick check — the *substitution test*: would a reasonable
*alternative* implementation still pass? If no, it's too tight; if a
non-solution would also pass, it's too loose. Examples for the flight-status
case:

| Verdict | Assertion | Why |
|---|---|---|
| ❌ too tight | "Has an HTTP Request node calling `flightaware.com`" | Overfits to one run; a valid build using AeroDataBox fails. Vendor was never the requirement. |
| ❌ too tight | "Sends the alert via a Gmail node" | The channel was unspecified; Slack/email/etc. are all correct. |
| ❌ too loose | "Fetches flight data from somewhere" | A workflow that fetches but never compares would pass — doesn't prove change-detection. |
| ✅ right | "Fetches current status from an external source via an HTTP Request node" | Any correct build passes; one that hard-codes a status fails. |
| ✅ right | "Persists the previously-seen status and compares it to the freshly-fetched one" | The defining behaviour; substitution-proof across vendors and storage choices. |
| ✅ right | "Alert is sent only on the change-detected branch, gated by a conditional" | Proves the gate without pinning the node or channel. |

Put vendor-/channel-specific *intent* in `processExpectations` (judged from the
conversation), not in `outcomeExpectations`.

## Robust assertions vs harness flakiness

Two different things — keep them apart:

- **Robust assertion design (always do this).** The agent's choices vary run to
  run — whether it asks a clarifying question, which vendor/source it picks.
  Source-agnostic `outcomeExpectations` aren't a concession to flakiness; they
  are the *correct* assertion, because the vendor was never a requirement. Use
  the substitution test above.
- **Harness flakiness (a defect — surface and mitigate, don't accept).** The
  mock layer doesn't always honor `dataSetup` for state-bearing reads (e.g. a
  Data Table "previous value"), so change-detection scenarios can fail with
  `[mock_issue]`. A randomly-passing eval is worthless. When you hit this:
  narrow `dataSetup` to steer the mock, move the fragile intent to a
  `processExpectation`, or keep the scenario out of tight tiers (`["full"]`
  only) — and note it in the case `description`. Don't ship a scenario whose
  pass/fail is noise.

## Negative execution scenarios

Don't stop at the happy path. A workflow that only works when everything goes
right is under-tested. Add scenarios for the unhappy paths the trigger/source
implies, and assert the *graceful* behaviour:

- **No data / not-found** — source returns empty or 404 → workflow completes
  without sending a false alert.
- **Source error / timeout** — source returns 5xx or times out → workflow does
  not crash and does not emit a spurious "changed" alert.
- **Malformed response** — unexpected shape → handled without throwing.

Phrase `successCriteria` as the *absence* of the wrong action ("no alert is
sent", "run completes without error") as much as the presence of the right one.
If the mock layer can't reliably produce the failing input, that's harness
flakiness — see above.

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
