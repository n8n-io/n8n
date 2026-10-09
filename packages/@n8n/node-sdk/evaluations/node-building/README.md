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
| `contacts`      | mock, docs in markdown     | Items with expressions, continue on fail in a batch, `tags=a&tags=b`, 204, array body, 64-bit IDs |
| `projects`      | mock, docs in markdown     | Resource locator (list, ID, URL), list search with filter and cursor pages |

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

The workspace `@n8n/node-sdk` holds only the run-time entries, not
`evaluations/`. The realpath of a linked file still shows the repo path.

## Output

```
<out>/templates/<format>/<task>   scaffolded once: n8n-node new or n8n-node-next new, node_modules linked to the repo
<out>/templates/node-sdk/         @n8n/node-sdk for the new format: links to package.json, dist, spec, src, templates, node_modules
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
  project's `@n8n/node-sdk/testing` runs each case (`n1-adapter.ts`). When the
  action input has `paging`, the case fields `returnAll: true` and `limit: n`
  become `paging: { mode: 'all' }` and `paging: { mode: 'limit', max: n }`.
- A task with `"engine": "n8n"` (`contacts`, `projects`) runs the new format in
  n8n too: `toNodeType` of the project's `@n8n/node-sdk/host` makes a node type
  for each action, and `WorkflowExecute` runs it as an old-format node. `runAction`
  does not resolve expressions for each item and does not continue on fail.

In `WorkflowExecute`, a stub source node gives the case `items` (one empty item
by default), so parameters can be expressions such as `={{ $json.email }}`.
`expect.pairedItems` checks the input item of each output item. A case with
`listSearch` calls the list search method of the resource locator field, as the
n8n form does, and follows `paginationToken`. Its items are `{ name, value }`.
An expected item `{ "error": true }` matches any error item, because the error
text is different in each format.

Both formats run the cases only when the compile step (`build` or `typecheck`)
passes, and report the same checks. A case with `continueOnFail` sets the node
setting in the old format. In the new format the SDK executor makes a failed
item `{ error: message }`, and the grader does the same with the `runAction`
result. `errorMessage` compares the error message only, not its description.

`reference/<task>/` holds a hand-written solution for each format of
`acme-tasks`, `inventory`, `events`, `contacts`, and `projects`. The grader tests prove that each one
passes and that a broken copy fails.
