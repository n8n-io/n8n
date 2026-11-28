# Calibrating and publishing

The case lives in LangTracer ([building.md](building.md)). Run it locally
first to catch case errors. Calibrate remotely, where every provider and
episodic memory work. Publish by adding the case to the suite. There is no push
from a disk file: do not use `eval:langtracer-push` for runtime cases.

## Run locally (smoke test)

Run the schema check in [building.md](building.md#validate) first. It
catches most case errors in a second, without an instance.

Locally, everything runs on Anthropic. Non-Anthropic Agents run on a
comparable Anthropic model, and episodic cases are skipped with "no embedding
key". A local green is not a calibration.

Source the shared env file in the worktree. Do not copy it:

```bash
set -a; source ~/repos/.env.eval; set +a
```

The instance needs `N8N_INSTANCE_AI_EVAL_INSTANCE=true` (it turns on the eval
endpoints) and `N8N_INSTANCE_AI_ENABLED=true`. Direct mode needs no sandbox.
Start an isolated instance and seed the owner as in
[running-evals.md](../create-instance-ai-eval/running-evals.md#run-locally-against-a-dev-instance).
### Get the case onto disk

LangTracer has no single-case export. The only pull path is per suite:
`export_suite`, which `--source langtracer --suite <slug>` also uses. So keep
unpublished cases in a drafts suite, for example "Agents — runtime (drafts)".
Ask the driver before you create it with `create_suite`. Reuse it for every
case. It has no schedule.

Then run straight from LangTracer, from `packages/@n8n/instance-ai`:

```bash
pnpm exec dotenvx run -f ../../../.env.eval -- \
  pnpm eval:instance-ai --source langtracer --suite <drafts-slug> \
  --filter <case-name> --base-url http://localhost:5680 --concurrency 1 --verbose
```

To edit and rerun quickly, write the case's body from `export_suite`
(`<case-name>.json`) to a scratch file at
`packages/@n8n/instance-ai/evaluations/data/agents/<case-name>.json`, and run
with `--filter <case-name>` and no `--source`. This file is scratch:

- Never commit it. Delete it when you are done.
- Copy every fix back to LangTracer with `update_test_case`. LangTracer is the
  source of truth.

**Pending L2/L3.** The export does not carry `agentRun`, seed `rows`,
`expectations`, `userTurns`, or `sessions` yet. Until it does, add them to the
scratch file by hand. The first run is the strict loader's check of the case.

Check:

- The row has `buildPath: "agent-direct"` in `eval-results.json`. The
  assistant never ran.
- The log line for model resolution names the route (`direct`,
  `openrouter-same`, `comparable`) and the models.
- No `framework_issue`. A seeding failure (`seedingFailed`) is a case error,
  not an Agent failure. Fix the seed.
- Before N3/N4 land, the log warns about each ignored field (`userTurns`,
  `sessions`, `keepMemory`, `configOverrides`). That is expected.

## Run remotely (calibration)

Remote runs use the CI keys: Anthropic, OpenAI (also for embeddings), and
OpenRouter (pending L2).

**Pending L2/L3.** Until LangTracer carries `agentRun` and the multi-turn
fields, the case runs remotely as an assistant case, which is wrong. Do not
calibrate remotely before then.

1. Build an n8n image from the top of the stack:
   `gh workflow run docker-build-push.yml --ref <stack-head-branch> -f push_enabled=true`.
   Rebuild after each change to the stack.
2. Start the run with `start_evaluation`. Set `configuration.image` to that
   GHCR image. Select the case by id (`selection.kind: "cases"`). It does not
   need to be in the suite yet. A case still marked `containsUserData` runs
   on your personal dispatcher only.
3. Run each new case 3–5 times. A runtime case uses real models and a
   simulated user, so one green proves little.

Pin the image for every run of this suite until N1–N4 are in the nightly
image. A direct case on an image without N1 fails.

## Read the result

Read three things for each scenario, not just the verdict:

- **The transcript:** what the simulated user said, and each Agent reply and
  tool call. Use `get_case_runs`, then `get_eval_transcript`. Did the user
  stay on goal and stop when done? Did it leak the expectations?
- **The judge input:** the transcript, the tool calls, and (N4) the stored
  memory and which memory tasks ran. Each expectation needs the evidence it
  grades. A reply-only transcript cannot prove "no row was added".
- **The judge reason** for each expectation.

Then check that each conditional expectation's precondition happened. A
"must not save after refusal" pass means nothing if the user never refused.

## Fix or keep each red

Classify each red, as in "A red is signal" in
[create-instance-ai-eval](../create-instance-ai-eval/SKILL.md):

- **Case error:** a wrong name after the rename, a row the expectation does not
  match, a goal that does not reach the precondition. Fix the case.
- **Harness limitation:** a mocked tool returns the wrong shape, memory did not
  settle, the proxy went off goal. Record it. Do not loosen the expectation to
  hide it.
- **Agent failure:** the Agent breaks a rule its instructions give. Keep it.
  This is a finding about the Agent or the runtime. Set
  `setKind: "capability_gap"` with `update_test_case`, and propose a Linear
  ticket for the Agent team. Do not create the ticket unless the driver says so.
- **Noise:** passes in some runs. Tighten the goal or the expectation, then
  run again.

Never weaken an expectation to make a real Agent failure pass.

## Publish

Publish only after the review (see [SKILL.md](SKILL.md#review)) and after a
person cleared `containsUserData`.

1. Get the id of "Agents — runtime" from `list_suites`.
2. File the case: `move_cases_to_suite` from the drafts suite, or
   `add_cases_to_suite` if it is in no suite.
3. Check the source link (`sourceThreadId`, `sourceRunId`) set in
   [building.md](building.md#1-snapshot--seedagents).
4. Report the case, the suite, and the source thread as LangTracer links.
5. Delete the scratch file, if you made one.

The nightly schedule and Slack (`#alerts-agents-evals`) are turned on for the
suite once, after N1–N4 are in the nightly image. Not per case.
