# A/B context benchmark

This tool measures how much model context Instance AI uses for a fixed set of builds.
Use it to compare two commits, for example `master` and a branch that changes prompts or tools.

Each commit is an **arm**.
You run the benchmark one time for each arm against a running n8n instance.
Then you compare the arms in one table.

The tool measures tokens. It does not grade build quality.
The quality column shows the gating checks of the testmax runner only, as a guard against a cheaper but broken build.

## What it runs

| Case | Type | What it builds |
|---|---|---|
| `hn-digest` | One turn | Schedule, Hacker News, Slack |
| `email-triage` | One turn | Gmail trigger, AI classifier, branch, Slack or Google Sheets |
| `contact-webhook` | One turn | Webhook, Data Table, Respond to Webhook |
| `multi-edit` | Four turns | The contact webhook, then three follow-up edits and a question |

The case files are in `cases/`.
One-turn cases have `prompt.txt`, `expected.txt` and `scenarios.json`.
Multi-turn cases have `turns.json`, which is a list of user messages.

For one-turn cases, the tool calls the testmax runner (`.agents/skills/testmax-n8n-ai/scripts/compare.py --builders iai`).
The runner builds the workflow, runs it with pinned data and writes `auto-checks.json`.
For multi-turn cases, the tool sends each message in one thread.
It approves confirmation cards with the eval harness policy (`buildAutoApprovePayload`), so both arms get the same answers.

After each run, the tool reads the run debug records of the thread and writes `iai/context-report.json`.
This report has one row for each LLM call: input tokens, uncached tokens, cache read and cache write tokens, output tokens, and the size of the system prompt, the tool list and the messages.

## Prerequisites

- Python 3 and the testmax skill in this repository. The tool finds the skill from the repository root. Use `--testmax-dir` or `TESTMAX_DIR` to change it.
- A built n8n checkout of the commit for the arm.
- An n8n instance with these settings:

| Variable | Value | Why |
|---|---|---|
| `N8N_INSTANCE_AI_RUN_DEBUG_ENABLED` | `true` | Keeps the run debug records. The context report reads them. |
| `N8N_INSTANCE_AI_EVAL_INSTANCE` | `true` | Registers the eval routes that the testmax runner uses. |
| `E2E_TESTS` | `true` | Enables `/rest/e2e/reset`, which creates the owner account. |
| `N8N_SECURE_COOKIE` | `false` | Lets the login cookie work over plain `http://localhost`. |
| `N8N_ENABLED_MODULES` | `instance-ai,agents,mcp-registry` | Enables Instance AI. |
| `N8N_AI_ENABLED` | `true` | Enables Instance AI. |
| `ANTHROPIC_API_KEY` | your key | The builder model needs it. Without it, every build fails with zero tool calls. |
| Sandbox settings | from `.env.eval` | `N8N_INSTANCE_AI_SANDBOX_ENABLED` and the provider settings. See `docs/configuration.md`. |

Optional: set `N8N_INSTANCE_AI_EVAL_USAGE_LOG=<file>` to get one JSON line for each model call as a second source.

The tool logs in as the E2E owner: `nathan@n8n.io` with password `PlaywrightTest123`.
Use `N8N_EVAL_EMAIL` and `N8N_EVAL_PASSWORD` to change it.
Use `N8N_BASE_URL` to change the instance URL. The default is `http://localhost:5678`.

## Run two arms

Run the arms one after the other on the same machine.
Do not run two arms at the same time. They share the CPU, the sandbox and the rate limits, and the results are not comparable.

Do these steps for each arm. The example uses the arm names `base` and `branch`.

1. Check out and build the commit:

   ```bash
   git checkout --detach <commit>
   pnpm install --frozen-lockfile
   pnpm build > build.log 2>&1
   ```

2. Start the instance with an empty user folder.
   Run this from the repository root. Change the `-f` files to the env files that you use:

   ```bash
   rm -rf /tmp/n8n-ab-bench && mkdir -p /tmp/n8n-ab-bench
   cd packages/cli
   N8N_USER_FOLDER=/tmp/n8n-ab-bench \
   N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true N8N_INSTANCE_AI_EVAL_INSTANCE=true \
   E2E_TESTS=true N8N_SECURE_COOKIE=false N8N_DIAGNOSTICS_ENABLED=false \
   N8N_ENABLED_MODULES=instance-ai,agents,mcp-registry N8N_AI_ENABLED=true \
   npx @dotenvx/dotenvx run -f ../../.env.local -f ../../.env.eval -- ./bin/n8n start
   ```

3. In a second shell, create the owner account:

   ```bash
   curl -sf -X POST http://localhost:5678/rest/e2e/reset -H "Content-Type: application/json" \
     -d '{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'
   ```

4. Run the benchmark from `packages/@n8n/instance-ai`.
   The testmax runner reads its settings from the environment, so load `.env.eval` for it too:

   ```bash
   npx @dotenvx/dotenvx run -f ../../../.env.eval -- pnpm eval:ab-bench run --arm base
   ```

5. Wait for `arm base finished`. Then stop the instance.

Use the benchmark from the newer commit for both arms.
Keep it in a separate worktree, or copy `evaluations/ab-bench` to a path outside the checkout.
Then the case files and the code that measures stay the same for both arms.

When both arms are done, print the table:

```bash
pnpm eval:ab-bench compare base branch
```

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--arm <name>` | required for `run` | The folder name for the results of this arm. |
| `--reps <n>` | `2` | Runs for each case. |
| `--first-rep <n>` | `1` | The number of the first run. Use it to add runs later. |
| `--cases <a,b>` | all cases | Run only these cases. |
| `--runs-dir <dir>` | `.output/ab-bench` | Where the results go. `AB_BENCH_RUNS_DIR` also sets it. |
| `--testmax-dir <dir>` | the testmax `scripts` folder | `TESTMAX_DIR` also sets it. |
| `--python <bin>` | `python3` | `PYTHON` also sets it. |
| `--gap-seconds <n>` | `30` | Wait between turns of a multi-turn case. Keep it below the 5-minute prompt cache lifetime. |

The results are in `<runs-dir>/<arm>/<case>-r<n>/`.
The runner log of a one-turn case is in `<runs-dir>/<arm>/<case>-r<n>.log`.
The tool skips a run folder that exists. To run a case again, delete its folder.

To write the context report of one thread by hand, use:

```bash
pnpm eval:ab-bench report <threadId> --out report.json
```

## Read the table

| Column | Meaning |
|---|---|
| Runs | Runs that have a context report. |
| LLM calls | Mean number of orchestrator LLM calls for the thread. |
| Input tokens | Mean total input tokens over all calls. This includes cached tokens. |
| First call | Mean input tokens of the first call. This is the fixed cost: system prompt, tools and the first message. |
| Peak call | Mean input tokens of the largest call. |
| Output | Mean output tokens. |
| Tools | Number of tools in the first call. |
| Gating checks | Passed and total testmax gating checks for each run (`Correctness`, `Execution with pinned data`, `Service calls`). Multi-turn runs show `0/0`. |

Look at **First call** and **Tools** first. They change only when the prompt or the tool list changes.
Then look at the per-call sizes in `context-report.json` (`steps`, `largestTools`).
Use **Input tokens** and **LLM calls** only as a trend. They depend on the path that the model takes.

## Caveats

- **The debug records are in memory.** The instance deletes them when it stops. The tool writes the context report after each run. Do not restart the instance during an arm. If a report is missing, write it with `report <threadId>` before you stop the instance.
- **Run the arms one after the other on one machine.** Two arms at the same time compete for resources and change the timings and the model behaviour.
- **Two runs for each case are noisy for totals.** Total input tokens and the number of calls can change a lot between two runs of the same commit. First-call size and per-call sizes are stable. Add runs with `--first-rep 3 --reps 2` if you need a total.
- **Discard runs that stopped with a transient error.** A "model stream stalled" error or a provider timeout ends the run early, so the totals are too low. Look in the run log and in `iai/` for these errors. Delete the run folder and run the case again.
- **The sandbox uses the published SDK.** The builder sandbox installs `@n8n/workflow-sdk` from npm. Changes to the SDK in your branch have no effect unless you start the instance with `N8N_INSTANCE_AI_SANDBOX_LINK_SDK=1`. Use the same setting for both arms.
