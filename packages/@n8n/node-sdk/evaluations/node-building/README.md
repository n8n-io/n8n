# Node-building eval

This eval measures how fast, how efficiently, and how correctly an LLM agent
builds an n8n node in the old format (`@n8n/node-cli`, community node) and in the
new format (`@n8n/node-sdk`, `n8n-node-next`).

## Run

Build `n8n-core`, `@n8n/node-cli`, and `@n8n/node-sdk` first. Run from
`packages/@n8n/node-sdk`:

```bash
pnpm exec tsx evaluations/node-building/run.ts --task acme-tasks --format both \
  --iterations 3 --concurrency 2 --out /tmp/n8n-6071-nodeeval/run-1
# Grade a saved run again:
pnpm exec tsx evaluations/node-building/run.ts --grade /tmp/n8n-6071-nodeeval/run-1/runs/acme-tasks-new-1
# Tests of the mock server, the graders, and the metrics:
pnpm exec vitest run --config evaluations/node-building/vitest.config.ts
```

Options: `--task <id|all>`, `--format <old|new|both>`, `--model` (default
`anthropic/claude-sonnet-5-5`), `--timeout-min` (default 15). The runner starts
the mock server on port 18090, or uses the one another run already started.

## Tasks

| Task            | Service                    | What it tests                                             |
|-----------------|----------------------------|-----------------------------------------------------------|
| `acme-tasks`    | mock, docs in markdown     | API key header, cursor pages, status filter, create       |
| `ledger`        | mock, docs in markdown     | Bearer token, nested items, cents, `null` due date, 404   |
| `searchly`      | mock, OpenAPI description  | Key in the query, JSON body, offset pages, 429 and retry  |
| `github-issues` | GitHub REST, read-only     | Docs the agent finds, `Link` pages, labels, no token      |
| `inventory`     | mock, docs in markdown     | Body by `kind`, 422 field errors to one message, continue on fail |
| `events`        | mock, docs in markdown     | UTC range from local times (DST), `Link` pages, tombstones |

Each task file fixes the names that the grader needs. The prompt is the same for
both formats, except one format paragraph (`tasks.ts`).

`overlays/<format>/` is copied onto the scaffold. `overlays/old/AGENTS.md` replaces
the `n8n-node new` AGENTS.md with a compact reference, tuned once against the
old-format transcripts, as the new-format `AGENTS.md.tmpl` was.

The mock logs each request under the credential secret. The grader uses a new
secret for each case, so the log of a case holds only its own requests. The
GitHub cases compare the node output with `gh api`. The grader reads the token
from `gh auth token` at grade time. The agent gets no token and an empty
`GH_CONFIG_DIR`.

## Output

```
<out>/templates/<format>/<task>   scaffolded once: n8n-node new or n8n-node-next new, node_modules linked to the repo
<out>/runs/<task>-<format>-<n>/   workspace/, events.jsonl (raw pi stream), results.json
<out>/results.json                every run
<out>/summary.md                  medians per format and task
```

`results.json` of a run holds `pass`, `checks` (build or typecheck, lint or
check, node, credential, one check per case, each with a reason), `seconds`,
`turns`, `toolCalls`, `tools`, `tokens` (input, output, cache read and write,
cost), `turnTokens`, `commands` (build, check, test, run, and curl counts),
`firstPassTurn` (the turn of the first build or check command that passed), and
`calls`.

## Graders

- Old format: `n8n-node build`, `n8n-node lint`, then n8n's
  `PackageDirectoryLoader` loads the package and `WorkflowExecute` runs each case
  in a one-node workflow (`old-executor.ts`).
- New format: `tsc --noEmit`, `n8n-node-next check`, then `runAction` from the
  project's `@n8n/node-sdk/testing` runs each case (`n1-adapter.ts`).

Both formats run the cases only when the compile step (`build` or `typecheck`)
passes, and report the same checks. A case with `continueOnFail` sets the node
setting in the old format. In the new format the SDK executor makes a failed
item `{ error: message }`, and the grader does the same with the `runAction`
result. `errorMessage` compares the error message only, not its description.

`reference/<task>/` holds a hand-written solution for each format of
`acme-tasks`, `inventory`, and `events`. The grader tests prove that each one
passes and that a broken copy fails.
