# Calibrating and publishing

Run locally first to catch case errors. Calibrate remotely, where every
provider and episodic memory work.

## Run locally (smoke test)

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
Then, from `packages/@n8n/instance-ai`:

```bash
pnpm eval:instance-ai \
  --base-url http://localhost:5680 \
  --filter <slug> \
  --concurrency 1 \
  --verbose
```

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
fields, the case cannot be pushed, so it cannot run remotely.

1. Build an n8n image from the top of the stack:
   `gh workflow run docker-build-push.yml --ref <stack-head-branch> -f push_enabled=true`.
   Rebuild after each change to the stack.
2. Push the case (see Publish), then start the run with `start_evaluation`.
   Set `configuration.image` to that GHCR image. Select the case by id, or
   the suite filtered by tag.
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
  This is a finding about the Agent or the runtime. Push it with
  `--set-kind capability_gap`, and propose a Linear ticket for the Agent team.
- **Noise:** passes in some runs. Tighten the goal or the expectation, then
  run again.

Never weaken an expectation to make a real Agent failure pass.

## Publish

**Pending L2/L3.** Until then, `eval:langtracer-push` refuses runtime cases.

After review (see [SKILL.md](SKILL.md#review)), from `packages/@n8n/instance-ai`:

```bash
pnpm exec dotenvx run -f ../../../.env.eval -- \
  pnpm eval:langtracer-push --suite <agents-runtime-slug> --dry-run --changed

pnpm exec dotenvx run -f ../../../.env.eval -- \
  pnpm eval:langtracer-push --suite <agents-runtime-slug> --changed
```

Get the slug of "Agents — runtime" from `list_suites`. Then:

- Link the case to its source: `update_test_case` with `sourceThreadId` and
  `sourceRunId` (the snapshot run).
- Report the case, the suite, and the source thread as LangTracer links.
- Delete the local JSON, and the scrub working case if you made one
  ([building.md](building.md#1-snapshot--seedagents)).

The nightly schedule and Slack (`#alerts-agents-evals`) are turned on for the
suite once, after N1–N4 are in the nightly image. Not per case.
