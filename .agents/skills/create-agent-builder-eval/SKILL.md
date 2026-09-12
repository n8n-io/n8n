---
name: n8n:create-agent-builder-eval
description: >-
  Authors and calibrates Instance AI evaluations that build standalone n8n
  Agents through Agent Builder. Use when a change under
  packages/cli/src/modules/agents affects build-agent routing, Agent setup,
  model or credential selection, tools, MCP servers, integrations, skills,
  tasks, testing, or user-facing build responses. Requires LangTracer access
  before authoring so each finished case can be published.
---

# Create an Agent Builder eval

Use the shared Instance AI eval harness. Agent cases use an Agent-specific
authoring directory, dataset, and LangTracer suite.

## Required LangTracer preflight

Run this check before sourcing, drafting, or writing an eval. Run it from
`packages/@n8n/instance-ai`:

```bash
pnpm exec dotenvx run -f ../../../.env.local -- \
  sh -c 'test -n "${LANGTRACER_URL:-}" && test -n "${LANGTRACER_API_KEY:-}"'
```

If the check fails, stop before creating an eval file. Ask the user to:

1. Generate a key on the
   [LangTracer API page](https://lang-tracer.n8n-maintenance.workers.dev/account?section=api).
2. Add these variables to the repository root `.env.local` file:

   ```env
   LANGTRACER_URL=https://lang-tracer.n8n-maintenance.workers.dev
   LANGTRACER_API_KEY=<generated-key>
   ```

3. Confirm when the environment is ready.

Do not ask the user to paste the key into chat. Do not print or inspect its
value. Rerun the check after the user confirms. Continue only when it passes.

## Non-negotiable routing

- Author the case at
  `packages/@n8n/instance-ai/evaluations/data/agents/<slug>.json`.
- Set `"datasets": ["agents"]`.
- Push general Agent Builder cases to
  [Instance AI capabilities — agents](https://lang-tracer.n8n-maintenance.workers.dev/suites/10).
  Its suite slug is `agents`.
- Do not commit the case JSON. LangTracer is the durable source of truth.
- Commit changes to this skill, the harness, and CI when applicable.

The disk runner loads both `data/agents/` and `data/workflows/`. A misplaced
Agent case can therefore pass locally. That does not make the location correct.

## Decide what the case proves

Write the smallest user request that exercises the changed behavior.

- Use `processExpectations` for the Instance AI conversation and final response.
- Use `outcomeExpectations` for the created Agent artifact and its configuration.
- Use `executionScenarios` only when the built Agent must run to prove the behavior.
- Declare only the credentials that the build must see.

The harness captures the Agent configuration and authored skills. It supplies
them to the expectation judge. A scenario-less Agent case is valid when process
or outcome expectations can prove the behavior.

Use the substitution test for every expectation. A correct alternative build
must pass. A build that misses the requested behavior must fail.

For multi-turn, seeded, or capability-gap cases, follow the case-shape and
calibration rules in [create-instance-ai-eval](../create-instance-ai-eval/SKILL.md).
This skill overrides its workflow directory and suite guidance for Agent cases.

## Draft the case

Start with this shape:

```json
{
  "description": "The Agent Builder behavior this case guards.",
  "conversation": [
    { "role": "user", "text": "Build me an Agent that ..." }
  ],
  "complexity": "simple",
  "tags": ["agent", "agent-build", "<capability>"],
  "credentials": [{ "type": "<credentialType>", "name": "<display name>" }],
  "processExpectations": [
    "The final response ..."
  ],
  "outcomeExpectations": [
    "A standalone Agent was created and no workflow was created.",
    "The Agent ..."
  ],
  "datasets": ["agents"]
}
```

Keep the prompt in the user's voice. Do not tell Instance AI which internal
tools or configuration fields to use unless that choice is the behavior under
test.

## Validate and run locally

Read [local-setup.md](local-setup.md) when the machine does not already have an
eval instance and environment file.

From `packages/@n8n/instance-ai`:

```bash
pnpm exec tsx -e "import { loadAgentEvalTestCasesWithFiles } from './evaluations/data/agents/index.ts'; const matches = loadAgentEvalTestCasesWithFiles('<slug>'); if (matches.length !== 1) throw new Error('Expected exactly one Agent eval case, found ' + matches.length); console.log(matches[0].fileSlug)"

pnpm eval:instance-ai \
  --base-url http://localhost:5680 \
  --filter <slug> \
  --tier agents \
  --concurrency 1 \
  --keep-workflows \
  --verbose
```

Use `eval:instance-ai` for a new disk case. `eval:agents` reads the published
LangTracer suite and is for running cases that are already there.

Inspect the transcript, the rendered Agent artifact, and each judge reason.
Do not accept a green result when a conditional expectation never occurred.
Do not weaken an expectation to hide a real Agent Builder defect.

## CI coverage

The Instance AI PR gate checks the files changed by the PR. A change under
`packages/cli/src/modules/agents/` selects the `Instance AI capabilities — agents`
suite through its `agents` slug. It also selects the `agents` dataset and uses
an absolute pass gate. The run uses a suite-scoped LangSmith cohort. It does not
write to the workflow dataset or compare against the workflow baseline. Other
Instance AI changes select the `baseline` suite and its `pr` dataset.

The gate runs when a PR opens, reopens, or becomes ready for review. It does not
run for each new push. Use the PR gate's manual dispatch after a later push.

## Credential behavior

Declared credentials are real n8n credential records with placeholder data.
The eval thread limits the builder to those credential IDs.

Agent Builder model catalog requests return deterministic fake models during an
eval. They do not decrypt the placeholder model credential or call its provider.
Production model catalog requests remain live.

This mock covers catalog lookup only. A builder `call_agent` action and an Agent
`executionScenario` run the target Agent model. They need a working provider
credential such as `EVAL_OPENAI_API_KEY`. A build-only case does not need one.

## Calibrate and publish

1. Run the case once with `--concurrency 1`.
2. Confirm that Instance AI called `build-agent`.
3. Confirm that the expected Agent artifact was captured.
4. Classify each red as a product gap, harness limitation, or non-determinism.
5. Use `--iterations 5` before adding a case to a gating tier.
6. Preview the LangTracer change.
7. Push it to `agents`.

```bash
pnpm exec dotenvx run -f ../../../.env.local -- \
  pnpm eval:langtracer-push --suite agents --dry-run --changed

pnpm exec dotenvx run -f ../../../.env.local -- \
  pnpm eval:langtracer-push --suite agents --changed
```

The push needs `LANGTRACER_URL` and `LANGTRACER_API_KEY`. Generate a key on the
[LangTracer API page](https://lang-tracer.n8n-maintenance.workers.dev/account?section=api).
Report the case and suite as clickable LangTracer links. Delete the local JSON
after a successful push.

## Completion checklist

- The LangTracer environment preflight passed before authoring.
- The case is in `data/agents/` and uses the `agents` dataset.
- The strict loader accepts it.
- A local run captures a standalone Agent.
- The transcript proves each process expectation was exercised.
- The rendered Agent artifact proves each outcome expectation.
- Repeated runs are stable enough for the selected tier.
- The case is pushed to `Instance AI capabilities — agents` with suite slug `agents`.
- Agent Builder PR changes select the `agents` suite in CI.
- The local case JSON is not committed.
