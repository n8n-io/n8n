# MCP workflow evaluations

Use the Instance AI evaluation harness to score workflows built through the MCP
module. The MCP step creates workflows in a running n8n instance and writes a
manifest of workflow IDs. The evaluation step then runs the normal
`eval:instance-ai` verifier against those prebuilt workflows.

For the full framework documentation, argument reference, outputs, and
troubleshooting, use the [Instance AI workflow evaluation README](../../../../../@n8n/instance-ai/evaluations/README.md).

The usual flow is:

1. Start a local n8n instance with Instance AI enabled.
2. Generate an MCP-built workflow cohort with `eval:build-mcp-manifest`.
3. Evaluate that manifest with `eval:instance-ai --prebuilt-workflows`.


```text
+-------------------------+       writes        +--------------------------+       reads       +------------------------+
| eval:build-mcp-manifest | ------------------> | output-dir/manifest.json | ----------------> | eval:instance-ai       |
| --output-dir <dir>      |                     |                          |                   | --prebuilt-workflows   |
|                         |                     |                          |                   | <dir>/manifest.json    |
+-------------------------+                     +--------------------------+                   +------------------------+
```

## Environment

Use a local `.env` file instead of exporting secrets directly in the terminal.
For example, create `.env.mcp-evals` at the repo root:

```env
N8N_ENABLED_MODULES=instance-ai
N8N_AI_ENABLED=true

N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5-20250929
N8N_INSTANCE_AI_MODEL_API_KEY=sk-ant-...

N8N_EVAL_EMAIL=eval@example.com
N8N_EVAL_PASSWORD=...

CONTEXT7_API_KEY=ctx7sk-...

# Optional — record this run to LangSmith. Pair with --dataset and
# --baseline-prefix (see "Record runs in LangSmith") so MCP runs never touch
# the Instance AI dataset or baseline.
# LANGSMITH_API_KEY=ls__...
# LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

Leave `N8N_AI_ANTHROPIC_KEY` unset unless you are intentionally testing that
path.

To record MCP eval runs in LangSmith, always pass a dedicated `--dataset` and
`--baseline-prefix` so the run lands in its own dataset and only compares
against MCP baselines — never the Instance AI dataset or the
`instance-ai-baseline-` experiments. See
[Record runs in LangSmith](#record-runs-in-langsmith).

Start n8n with the same env file in watch mode:

```bash
dotenvx run -f .env.mcp-evals -- pnpm dev:ai
```

Alternatively, use a regular local n8n instance started with `pnpm start` and
its existing users and projects:

```bash
dotenvx run -f .env.mcp-evals -- pnpm start
```

When using an existing local instance, set `N8N_EVAL_EMAIL` and
`N8N_EVAL_PASSWORD` to a user that can log in to that instance. If you pass
`--project-id`, use a project available to that user.

On a fresh local DB, create or seed the owner account with the email and
password from `.env.mcp-evals`. The full setup is documented in the linked
Instance AI evaluation README.

## Record runs in LangSmith

LangSmith recording is opt-in via `LANGSMITH_API_KEY` and reuses the Instance AI
eval pipeline (the `--prebuilt-workflows` path records exactly like a normal
run). To keep MCP runs isolated from the Instance AI dataset and baselines,
always pass a dedicated `--dataset` and `--baseline-prefix`:

```bash
LANGSMITH_API_KEY=ls__... dotenvx run -f .env.mcp-evals -- \
  pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 \
  --tier mcp \
  --prebuilt-workflows /tmp/n8n-mcp-cohort/manifest.json \
  --dataset mcp-workflow-evals \
  --baseline-prefix mcp-baseline- \
  --iterations 3 \
  --concurrency 3 \
  --output-dir /tmp/n8n-mcp-cohort-eval
```

- `--dataset` syncs only the `--tier mcp` examples into a dataset of its own;
  the Instance AI `instance-ai-workflow-evals` dataset is never written to.
- `--baseline-prefix` scopes regression comparison to MCP baselines. Until an
  MCP baseline exists the comparison is simply skipped — an MCP run is never
  compared against `instance-ai-baseline-`.
- `--dataset` and `--baseline-prefix` are the two halves of isolation — pass
  both together. Overriding only one logs a **partial isolation** warning, since
  the run would still write to / compare against shared Instance AI data.
- The dataset and experiments are created in the workspace your
  `LANGSMITH_API_KEY` belongs to. Use a personal key/workspace to avoid
  cluttering the shared team workspace.

### Create or refresh a baseline

Refresh the MCP baseline the same way as the Instance AI one, but with the MCP
dataset and prefix (high `--iterations` for a low-noise reference point):

```bash
LANGSMITH_API_KEY=ls__... dotenvx run -f .env.mcp-evals -- \
  pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 \
  --tier mcp \
  --prebuilt-workflows /tmp/n8n-mcp-cohort/manifest.json \
  --dataset mcp-workflow-evals \
  --baseline-prefix mcp-baseline- \
  --experiment-name mcp-baseline \
  --iterations 10
```

LangSmith appends a random suffix (e.g. `mcp-baseline-7abc1234`); the most
recently started `mcp-baseline-` experiment becomes the comparison target on the
next MCP run. The comparison is skipped on the baseline-creation run itself.

### Check baselines in LangSmith

A baseline is not a special LangSmith object — it's just an experiment whose name
starts with `--baseline-prefix` (`mcp-baseline-`). To find them, open your
workspace → **Datasets & Experiments** → `mcp-workflow-evals` → the
**Experiments** list: baselines are the rows named `mcp-baseline-<suffix>`,
while normal runs (e.g. `local-<branch>-<sha>`) are not. With no `mcp-baseline-*`
experiment yet, every run's comparison is skipped.

Two comparison views, kept separate:

- **Native LangSmith compare** — select two or more experiments in the dataset's
  **Experiments** list and click **Compare** for a side-by-side metrics view
  (the `?selectedSessions=…` link printed at the start of a run opens this view).
- **This tool's regression report** — computed locally by the eval CLI (reading
  the latest baseline's runs), written to `eval-pr-comment.md` and
  `eval-results.json`, and printed to the console. It is not rendered back inside
  LangSmith.

## Prerequisites

- `claude` CLI is installed and authenticated.
- `~/.claude.json` contains an MCP server entry for the target n8n instance.
- The MCP server name used below, for example `n8n-local`, matches that Claude
  config entry.
- The n8n instance is reachable at the URL configured in the MCP server block.

## Run size

Use the same size for generation and evaluation unless you have a reason to do
otherwise:

- `-n` on `eval:build-mcp-manifest` is the number of workflows
  to generate per test case.
- `-j` on `eval:build-mcp-manifest` is the number of
  concurrent Claude Code build processes.
- `--iterations` on `eval:instance-ai` is the number of verifier runs per test
  case.
- `--concurrency` on `eval:instance-ai` is the number of concurrent eval
  workers.

`-n` should usually match `eval:instance-ai --iterations` so each verifier
iteration can use a different prebuilt workflow. The concurrency flags affect
speed and load, not confidence, but keeping them aligned makes the recipes easy
to copy.

| Recipe | Build flags | Eval flags | Use |
|--------|-------------|------------|-----|
| Quick eval | `-n 1 -j 1` | `--iterations 1 --concurrency 1` | Fast smoke test |
| Medium confidence | `-n 3 -j 3` | `--iterations 3 --concurrency 3` | Local comparison run |
| Best confidence | `-n 5 -j 5` | `--iterations 5 --concurrency 5` | Higher-confidence batch |

## Run the `mcp` tier

The repository ships a curated `mcp` tier: test cases that can be scored fairly
when a workflow is built from a single MCP prompt (see
[Adding a case to the `mcp` tier](#adding-a-case-to-the-mcp-tier)). Pass
`--tier mcp` to **both** steps so the build and the eval select the same cases
and stay in lockstep:

```bash
# 1. Build the cohort — only mcp-tier cases
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
  --tier mcp \
  -n 3 \
  -j 3 \
  --output-dir /tmp/n8n-mcp-cohort \
  --mcp-server n8n-local

# 2. Evaluate the same cohort
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 \
  --tier mcp \
  --prebuilt-workflows /tmp/n8n-mcp-cohort/manifest.json \
  --iterations 3 \
  --concurrency 3 \
  --output-dir /tmp/n8n-mcp-cohort-eval
```

`--tier` filters by the `datasets` array in each test case. Build the whole tier
so every case the eval selects is present in the manifest — any case missing
from the manifest falls back to the normal Instance AI build path.

`--filter` and `--exclude` are `eval:instance-ai` flags only — combine them with
`--tier` to narrow the eval further. `eval:build-mcp-manifest` does not accept
them; narrow its build set with positional slugs instead (e.g. append
`contact-form-automation` to build just that case).

## Generate a cohort

Without `--tier` or a positional slug, the build covers every test case in
`data/workflows/`. From the repo root, build five workflows per test case with
five concurrent Claude Code builds:

```bash
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
  -n 5 \
  -j 5 \
  --output-dir /tmp/n8n-mcp-cohort \
  --mcp-server n8n-local
```

The output directory contains:

- `manifest.json` for `eval:instance-ai --prebuilt-workflows`.
- `manifest-stats.json` with aggregate build cost, turns, and duration.
- `logs/` with one build log per generated workflow.

To use a different Claude model for the build step, add `--model`:

```bash
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
  -n 5 \
  -j 5 \
  --output-dir /tmp/n8n-mcp-cohort \
  --mcp-server n8n-local \
  --model claude-opus-4-5
```

## Generate from another Claude project

Use this when Claude should load skills or settings from a different working
directory while the evaluation script still runs from the n8n repo:

```bash
dotenvx run -f /path/to/n8n/.env.mcp-evals -- pnpm --dir /path/to/n8n \
  --filter @n8n/instance-ai run eval:build-mcp-manifest \
  -n 5 \
  -j 5 \
  --mcp-server n8n-local \
  --project-id <n8n-project-id> \
  --workflow-dir /path/to/n8n/packages/@n8n/instance-ai/evaluations/data/workflows \
  --build-cwd /path/to/mcp-workspace \
  --output-dir /tmp/n8n-mcp-skills-cohort
```

Useful flags:

- `--project-id` tells the builder to create workflows in a specific n8n
  project when the MCP server supports project-aware workflow creation, such as
  the official n8n MCP server. Other MCP servers may ignore it and create
  workflows in the user's personal project.
- `--workflow-dir` points to the test-case JSON files when the process is not
  running from the n8n repo root.
- `--build-cwd` controls the working directory for the Claude subprocess, which
  affects the Claude project config and skills that get loaded.

## Generate one test case

Pass the test-case slug as a positional argument. The slug is the workflow JSON
filename without `.json` from
`packages/@n8n/instance-ai/evaluations/data/workflows/`.

```bash
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
  -n 5 \
  -j 5 \
  --output-dir /tmp/n8n-mcp-contact-form \
  --mcp-server n8n-local \
  contact-form-automation
```

When evaluating a single generated test case, always pass the same slug to
`eval:instance-ai --filter`. Otherwise, test cases missing from the manifest
fall back to the normal Instance AI build path, which can produce confusing
setup errors if that path is not configured for the run.

## Evaluate a cohort

Evaluate all workflows from a generated manifest with five iterations and five
concurrent eval workers:

```bash
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 \
  --prebuilt-workflows /tmp/n8n-mcp-cohort/manifest.json \
  --iterations 5 \
  --concurrency 5 \
  --output-dir /tmp/n8n-mcp-cohort-eval
```

The eval CLI reads `N8N_EVAL_EMAIL`, `N8N_EVAL_PASSWORD`, model keys, and
Context7 settings from `.env.mcp-evals`.

## Evaluate one generated test case

Use `--filter` with the same slug that was used during manifest generation:

```bash
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 \
  --prebuilt-workflows /tmp/n8n-mcp-contact-form/manifest.json \
  --filter contact-form-automation \
  --iterations 5 \
  --concurrency 5 \
  --output-dir /tmp/n8n-mcp-contact-form-eval
```

## Adding a case to the `mcp` tier

Test cases live in
`packages/@n8n/instance-ai/evaluations/data/workflows/*.json`, validated by
`schema.ts` — see
[Adding test cases](../../../../../@n8n/instance-ai/evaluations/README.md#adding-test-cases)
for the full schema. To include a case in the MCP cohort, add `"mcp"` to its
`datasets` array; both `--tier mcp` steps then pick it up, no registration:

```json
"datasets": ["mcp", "full"]
```

The same mechanism defines any custom grouping: use a distinct value (e.g.
`"datasets": ["mcp-regression"]`) and pass it to `--tier mcp-regression`.

### What makes a case MCP-evaluable

The MCP client builds each workflow from a **single flattened prompt** (the
conversation's user turns concatenated) and the eval scores the **resulting
workflow**. A good `mcp` case is therefore:

- **Fair when flattened** — single-turn, or multi-turn with _additive_ user
  turns that refine earlier ones. Avoid _contradictory_ turns ("actually, use X
  instead of Y") and `[bracketed]` stage directions (deliberate
  withholding/timing): both make the flattened prompt ambiguous or misleading.
- **Scored on the artifact** — the `executionScenarios` success criteria and any
  `outcomeExpectations` must be judgeable from the workflow JSON.
  `processExpectations` (assertions about the build _conversation_) are
  **skipped** in MCP runs because there is no transcript, so they must not be a
  case's only signal.

### Build preconditions

Some workflows need the MCP client to perform setup before or while creating the
workflow. Such cases can still live in the tier — a build failure is itself a
useful signal — but expect them to fail until the client and instance support
the precondition:

- **Data tables** must be created in-session: workflow creation rejects
  references to a data table that does not exist in the target project.
- **MCP registry nodes** require the registry to be available and seeded on the
  instance.

## Cleanup

Prebuilt workflows are not deleted by default, so the same manifest can be
reused for comparison runs. If the workflows are throwaway, add
`--delete-prebuilt-workflows` to the `eval:instance-ai` command. It only deletes
workflows that were successfully used in the run.

### Data tables and other build leftovers

The manifest records only workflow IDs, so anything an MCP build creates on the
side is invisible to `--delete-prebuilt-workflows` and is left behind. The most
common case is **data tables**: cases like `workflow-data-table` need the MCP
client to create a data table before the workflow can reference it (see
[Build preconditions](#build-preconditions)), and those tables are not tracked
in the manifest.

For a clean slate, run the cohort against a throwaway project with `--project-id`
and delete the whole project afterwards — that removes the workflows and the data
tables they created in one step.
