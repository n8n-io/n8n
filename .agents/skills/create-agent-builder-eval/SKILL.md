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
pnpm exec dotenvx run -f ../../../.env.eval -- \
  sh -c 'test -n "${LANGTRACER_URL:-}" && test -n "${LANGTRACER_API_KEY:-}"'
```

If the check fails, stop before creating an eval file. Ask the user to:

1. Generate a key on the
   [LangTracer API page](https://lang-tracer.n8n-maintenance.workers.dev/account?section=api).
2. Add these variables to the repository root `.env.eval` file:

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
- Ask the driver for the target suite before you do anything else. See
  "Ask for the target suite first" below. Do not assume `agents`.
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

## Write expectations about the Agent, not the builder's internals

Agent Builder runs as a delegated sub-agent architecture today. That design
can change. Do not write an expectation that depends on it. Follow
"Keep expectations free of internal mechanics" in
[create-instance-ai-eval](../create-instance-ai-eval/SKILL.md).

Do not write:

- "The sub-agent runs/tests the Agent before it responds."
- "Instance AI delegates to `build-agent`" or "calls `build-agent` once."
- "The builder calls `call_agent` to verify the Agent."
- "The sub-agent reads the skill, then sets the model."

Write what a user or a reviewer can observe:

| ❌ mechanical | ✅ intent |
|---|---|
| "The sub-agent tests the Agent before it reports" | "The final response says the Agent was tested only if a test ran, and it reports the result of that test honestly" |
| "`build-agent` is called with the Slack credential" | "The Agent uses the Slack credential the user has" |
| "The sub-agent adds a tool for the lookup" | "The Agent can look up the order status when a user asks for it" |
| "The builder sets `model` after the catalog lookup" | "The Agent uses a model that the connected credential supports" |

Put each one where it belongs:

- The Agent's configuration, tools, skills, and behavior go in
  `outcomeExpectations`.
- What the user is told, asked, or shown goes in `processExpectations`.
- The final response is the place to check claims ("says it is ready",
  "lists the tools it added"). Do not check which component made the claim.

The calibration steps below ask you to confirm that `build-agent` ran. That is
a check for you, to be sure the case reached Agent Builder. Do not add it to the
case.

For multi-turn, seeded, or capability-gap cases, follow the case-shape and
calibration rules in [create-instance-ai-eval](../create-instance-ai-eval/SKILL.md).
This skill overrides its workflow directory and suite guidance for Agent cases.
The sections below add the Agent-specific parts. Do not skip the general rules
they point to.

## Ask for the target suite first

Follow "Ask for the target suite first" in
[create-instance-ai-eval](../create-instance-ai-eval/SKILL.md). Do it after the
LangTracer preflight and before you source or draft anything. If the request
already names a suite, state it and do not ask. Otherwise ask, in autonomous
mode too, in the same message as the autonomy question.

For Agent cases, recommend
[Instance AI capabilities — agents](https://lang-tracer.n8n-maintenance.workers.dev/suites/10)
(slug `agents`). Offer `baseline` as well: the Instance AI (INS) team monitors
it and it runs nightly. Get the full list from `list_suites`. Use the suite the
driver picks in every push command, in place of `agents` in the examples below.
Keep the `agents` dataset and the `data/agents/` directory. They do not depend
on the suite.

## Set the autonomy level first

Follow "Set the autonomy level first" in
[create-instance-ai-eval](../create-instance-ai-eval/SKILL.md). Ask the driver
for *autonomous* or *checkpoint* mode before you source or draft anything. The
four gates are the same: selection, shape and expectations, calibration, push.

## Source the case from a real thread

The best Agent cases come from a real conversation. Discover the conversation
with LangTracer. Author a synthetic case from what you learn.

1. List candidates: `list_conversations` with `usedAgentBuilder: true`. Do not
   use `source: "agent-builder"`. That pool is a different product, has
   unscrubbed payloads, and has no Agent snapshots.
2. List what the thread did to the Agent: `list_conversation_agent_snapshots`.
   `target-resolved` is the state that a turn opened on. `config-updated` is the
   state after the builder changed it.
3. Pick the shape from the snapshot sequence (next section).
4. Fetch the state to seed with `get_conversation_agent_snapshot`. Seed from the
   `target-resolved` row of the turn under test.
5. Read the raw turn before you write any expectation. Follow
   "First reproduce, then reclassify" in the general skill.

Two snapshot patterns to look for:

- A `target-resolved` hash that differs from the previous `config-updated` hash.
  The user edited the Agent in the UI between turns. This is the best seed for a
  repair or update case.
- A run of turns that each end in `config-updated`. The user added one rule per
  turn. Use it for a "new rule does not erase old rules" case.

Credentials arrive as `[redacted]`. Instructions and skill bodies do not. Scrub
the prose before it enters a case. See the `agents` section in
[case-shapes.md](../create-instance-ai-eval/case-shapes.md) (the `agents` seed section).

## Pick the shape: create or update

| Shape | Question it answers | How to write it |
|---|---|---|
| **Create** | Does the builder make the right Agent from a fresh request? | One user turn. No seed. Assert on the Agent artifact. |
| **Update** | Does the builder change only what the user asked for? | `seed.agents` with the Agent before the change. One live turn with the change. Assert on the new behavior and that the untouched parts survive. |
| **Repair** | Does the builder find the cause of a failure and fix it? | Seed the broken Agent. The live turn reports the failure. Assert on the cause found and the fix applied. |
| **Incremental rules** | Do earlier rules survive when a new rule lands? | Seed the Agent after several rules. Add one conflicting or overlapping rule. Assert that the old rules are still in force. |

Rules that apply to all four:

- An update that rebuilds the Agent from scratch is a failure. Assert on a
  specific untouched instruction, tool, or skill that must still be there.
- Write the conversation in English, even when the source thread is not.
- Trim to the fewest turns that reproduce the behavior. Do not copy a long
  thread.
- Put only the live turn in `conversation`. Put earlier turns in `seed.messages`.

## Confirm the precondition fired

A pass can mean the builder did the right thing. It can also mean the situation
never happened. Check before you trust a green.

- For "the builder did not do X", confirm that it reached the turn where X was
  possible. A builder that never edited the Agent passes "did not delete the old
  rule".
- For a repair case, confirm that the seeded Agent really has the defect. Read
  the seeded config in the rendered artifact.
- For an update case, compare the seeded config with the final config. Confirm
  that the requested change is the only difference you expected.
- For a "say you cannot" case, confirm that the tool or data was really missing
  in the run.

## A red is a finding

Follow "A red is signal" in the general skill. For Agent cases, add this:

1. Classify the red as a product gap, a harness limitation, or non-determinism.
2. Keep a product-gap red. Start the case `description` with
   `Capability-gap finding:`.
3. **Propose a Linear ticket for the Agent team.** The Linear team is named
   `Agent`. Propose the ticket. Do not create it unless the driver says go.
   Follow "Capability gap → propose a Linear ticket" in the general skill. Also
   check whether the gap already has a ticket.
   - Write the ticket in English. Use Simplified Technical English, as
     [AGENTS.md](../../../AGENTS.md) requires. Translate the user's words. Do
     not paste them.
   - This repository is public. Keep customer names, company names, and real
     URLs out of the ticket. Describe the use case in neutral words.
   - Link the LangTracer case and the source thread. Do not copy raw user
     messages or agent instructions from the thread.
   - Reproduce the gap first. This is a default, not a hard rule. Propose a
     ticket only after a case is red on a real build. Quote the failing
     expectation and the judge reason. Follow "Reproduce first" in the general
     skill.
   - The driver may approve an exception, for example when the harness cannot
     reach the mechanism after about three attempts. Then the ticket must say
     "Not reproduced in the eval. Based on trace analysis."
4. **Check the builder's own guidance for the gap.** Read the files that steer
   Agent Builder:
   `packages/cli/src/modules/agents/builder/agents-builder-prompts.ts`,
   `packages/cli/src/modules/agents/builder/prompts/`, and
   `packages/cli/src/modules/agents/builder/skills/`. Also read the Instance AI
   orchestrator prompt in `packages/@n8n/instance-ai/src/agent/system-prompt.ts`.
   If none of them covers the failing situation, add that to the ticket as a
   proposed prompt or skill change.
5. Propose the smallest added line first. Do not delete existing guidance to fix a
   gap. A measured case: adding one line fixed a routing gap, and deleting two
   lines did not.
6. Every prompt or skill change needs a before and after measurement. The new
   case is the "before" run. Run it again after the change. Use `--iterations 5`.

When the failure is in the Agent's runtime (for example a channel that cannot
report an error), the builder cannot see it. The right fix is often a builder
instruction to say so and stop guessing. Write that as a `processExpectations`
item on the final response.

## Publish and link

Follow "Share links, never bare ids" and "Link the pushed case to its source" in
the general skill. For a sourced Agent case:

- Report the case, the suite, and the source thread as links. Use the
  `https://lang-tracer.n8n-maintenance.workers.dev/test-cases/<id>` form.
- Call `update_test_case` with `sourceThreadId`, `expectedBehavior`, and
  `failurePattern`.
- Add a capability tag with `add_case_tags`.
- Push a case whose *build* is wrong with `--set-kind capability_gap` into a
  suite of that kind. If no such Agent suite exists, tell the driver. Do not put
  it in a `regression` suite.

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
    "A standalone Agent is the deliverable; any workflow created exists only as a tool the Agent calls.",
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
7. Push it to the suite the driver chose (`<suite>` below).

```bash
pnpm exec dotenvx run -f ../../../.env.eval -- \
  pnpm eval:langtracer-push --suite <suite> --dry-run --changed

pnpm exec dotenvx run -f ../../../.env.eval -- \
  pnpm eval:langtracer-push --suite <suite> --changed
```

The push needs `LANGTRACER_URL` and `LANGTRACER_API_KEY`. Generate a key on the
[LangTracer API page](https://lang-tracer.n8n-maintenance.workers.dev/account?section=api).
Report the case and suite as clickable LangTracer links. Delete the local JSON
after a successful push.

## Completion checklist

- The LangTracer environment preflight passed before authoring.
- The driver chose the target suite before any work, including in autonomous mode.
- The autonomy level was set and stated before any work.
- A sourced case links to its source thread, and the source turn was read raw.
- Each conditional expectation has proof that its precondition fired.
- A kept product-gap red has a proposed Linear ticket and a check of the builder guidance.
- The case is in `data/agents/` and uses the `agents` dataset.
- The strict loader accepts it.
- A local run captures a standalone Agent.
- The transcript proves each process expectation was exercised.
- The rendered Agent artifact proves each outcome expectation.
- No expectation names a sub-agent, an internal tool, or a delegation step.
  Each one passes for a correct build from a different architecture.
- Repeated runs are stable enough for the selected tier.
- The case is pushed to the suite the driver chose, and the report links to it.
- Agent Builder PR changes select the `agents` suite in CI. A case pushed to
  another suite does not run in that lane.
- The local case JSON is not committed.
