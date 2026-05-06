# `evaluations/scripts/`

Helper scripts that produce inputs for the eval CLI. Today there's one — a
runner that builds workflows via an MCP server so they can be scored with
`pnpm eval:instance-ai --prebuilt-workflows`.

## `build-instance-mcp-workflows.sh`

Drives `claude -p` against an MCP server (defaults to n8n's instance MCP
at `http://localhost:5678/mcp-server/http`) to build one or more workflows
per test case, then writes a manifest the eval CLI accepts as input.

The MCP server's own `InitializeResult.instructions` is auto-injected into
the system prompt by Claude Code, so the script doesn't ship a curated
build prompt — it just appends a tail asking the model to print
`WORKFLOW_ID=<id>` so the resulting ID can be parsed.

### Prerequisites

- `claude` CLI installed — see [Claude Code docs](https://docs.claude.com/claude-code).
- `jq` installed (`brew install jq` / `apt install jq`).
- `~/.claude.json` has the target MCP server block configured. For n8n's
  instance MCP, the block looks like:

  ```jsonc
  {
    "projects": {
      "/path/to/n8n": {
        "mcpServers": {
          "n8n-mcp (instance)": {
            "type": "http",
            "url": "http://localhost:5678/mcp-server/http",
            "headers": {
              "Authorization": "Bearer <n8n-api-key>"
            }
          }
        }
      }
    }
  }
  ```

  Mint the API key at `http://localhost:5678/settings/api`. Block can also
  live globally under top-level `mcpServers` if you prefer.

- An n8n instance running and reachable at the URL above. For n8n's
  instance MCP specifically, that means a running dev server with
  `N8N_MCP_BUILDER_ENABLED=true` (the default). Start it with
  `dotenvx run -f .env.local -- pnpm dev` from `packages/cli/`.

- Owner credentials for the n8n instance — `--email` / `--password` on
  the eval CLI, or `N8N_EVAL_EMAIL` / `N8N_EVAL_PASSWORD` in `.env.local`.

### Usage

```bash
# From anywhere; outputs default to cwd
./packages/@n8n/instance-ai/evaluations/scripts/build-instance-mcp-workflows.sh --help

# Build every test case once
./packages/@n8n/instance-ai/evaluations/scripts/build-instance-mcp-workflows.sh

# Build N=5 iterations per test case, 4 in parallel, into a specific dir
./packages/@n8n/instance-ai/evaluations/scripts/build-instance-mcp-workflows.sh \
  -n 5 -j 4 --output-dir ./mcp-cohort-2026-05

# Restrict to specific slugs
./packages/@n8n/instance-ai/evaluations/scripts/build-instance-mcp-workflows.sh \
  -n 3 contact-form-automation weather-monitoring

# Top up an existing manifest with two more iterations of one slug
./packages/@n8n/instance-ai/evaluations/scripts/build-instance-mcp-workflows.sh \
  --append -n 2 contact-form-automation
```

### Outputs

Two files in `--output-dir` (default: cwd):

- `manifest.json` — matches the schema in `harness/prebuilt-workflows.ts`
  (`version: 1`, `builder`, `workflows: { slug: id[] }`). Pass this to
  `pnpm eval:instance-ai --prebuilt-workflows`.
- `manifest-stats.json` — cohort-level build telemetry (avg turns, avg
  cost USD, total cost, avg duration). Useful for cost-comparable
  side-by-side analysis across builders.

Plus per-build session JSONs in `--log-dir` (default: `<output-dir>/logs`),
one per attempt. Useful for forensics on failed builds — each contains
the model's full output, tool-call sequence, turn count, and cost.

### Driving a different MCP server

The script defaults to n8n's instance MCP, but the only thing that's
n8n-specific is the **list of allowed tool names** (the workflow-builder
subset: `get_sdk_reference`, `search_nodes`, `get_node_types`,
`validate_workflow`, `create_workflow_from_code`, `update_workflow`,
`archive_workflow`, `get_suggested_nodes`).

For a different server (e.g. the community `n8n-mcp` package, with its
JSON-shape `n8n_create_workflow` tool), edit the `INSTANCE_MCP_TOOLS`
array near the top of the script. Long-term we'll port this to
TypeScript and pull the tool list from MCP-server discovery — see
[TRUST-76](https://linear.app/n8n/issue/TRUST-76) for context.

### See also

- [`evaluations/README.md`](../README.md#running-evals-against-pre-built-workflows)
  — the eval CLI's `--prebuilt-workflows` flag this manifest pairs with.
- [`harness/prebuilt-workflows.ts`](../harness/prebuilt-workflows.ts) —
  manifest schema, ID picker, BuildResult adapter.
