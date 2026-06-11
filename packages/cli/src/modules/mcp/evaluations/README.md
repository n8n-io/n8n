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
+-------------------------+       writes        +--------------------------+       reads        +------------------------+
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

# Not recommended for MCP evals until MCP has a separate LangSmith project.
# LANGSMITH_API_KEY=ls__...
# LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

Leave `N8N_AI_ANTHROPIC_KEY` unset unless you are intentionally testing that
path.

Do not enable LangSmith reporting for MCP evals yet. It currently writes into
the existing Instance AI evaluation project and will overwrite Instance AI
baselines. Wait until MCP has a separate LangSmith project before setting
`LANGSMITH_API_KEY` for these runs.

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

## Generate a cohort

From the repo root, build five workflows per test case with five concurrent
Claude Code builds:

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

## Cleanup

Prebuilt workflows are not deleted by default, so the same manifest can be
reused for comparison runs. If the workflows are throwaway, add
`--delete-prebuilt-workflows` to the `eval:instance-ai` command.

Alternatively, if you use `--project-id`, you can always just delete the project after workflows are not needed anymore.
