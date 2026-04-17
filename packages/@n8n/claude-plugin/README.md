# n8n for Claude

> Build, run, and debug n8n workflows without leaving Claude.

A Claude plugin that connects Claude (Code and claude.ai) to your own
n8n instance via n8n's built-in MCP server. Bundles skills, agents,
and an output style for the common workflow-automation tasks.

## What this plugin does

- Build workflows from a natural-language brief (400+ integrations
  via n8n's Workflow SDK).
- Run and test workflows — live execution or sandboxed with pinned
  data.
- Publish, update, and archive workflows from slash commands.
- Debug failed executions — Claude reads the execution data and
  names the broken node.
- Create and populate n8n data tables.

## Status

**v0.1 — local development only.** Not published to the Anthropic
marketplace yet. Install via `--plugin-dir` for now.

The execution-status monitor (background poller that notifies when
long-running workflows finish) is specified in the plan but not
shipped in v0.1 — it requires a public API key and a Node polling
script.

## Local install (development / testing)

From the n8n repo root:

```bash
claude --plugin-dir ./packages/@n8n/claude-plugin
```

Or `--plugin-dir` can be specified multiple times to combine plugins.

When Claude Code starts it will prompt for `n8n_instance_url`. Enter
your instance URL without a trailing slash, e.g.
`https://acme.n8n.cloud` or `https://n8n.mycompany.com`. Self-hosted
instances behind a path prefix should include the prefix.

On the first MCP tool call, Claude opens the n8n OAuth consent
screen. Approve it; tokens are refreshed automatically after that.

To pick up file changes during development, run `/reload-plugins` in
the Claude session.

## Reachability

| Context | Works with |
|---|---|
| **Claude Code** (local) | n8n Cloud, self-hosted (public), localhost |
| **claude.ai** (remote) | n8n Cloud, self-hosted that is publicly reachable over HTTPS with a valid cert |

`localhost` URLs do NOT work from claude.ai — Anthropic's servers
cannot reach your laptop. Use Claude Code for local n8n instances.

## Slash commands

| Command | What it does |
|---|---|
| `/n8n:build-workflow` | Build a new workflow from a description |
| `/n8n:run-workflow` | Live-execute an existing workflow |
| `/n8n:test-workflow` | Dry-run with pinned data (bypasses external calls) |
| `/n8n:publish-workflow` | Activate a workflow for production |
| `/n8n:update-workflow` | Modify an existing workflow's logic |
| `/n8n:debug-execution` | Investigate a failed execution (needs both workflow and execution IDs) |
| `/n8n:list-workflows` | List or search your workflows |
| `/n8n:manage-data-table` | Create or populate n8n data tables |

## Agents

| Agent | When to use |
|---|---|
| `workflow-builder` | Non-trivial workflow creation that benefits from an isolated context |
| `workflow-debugger` | Persistent failures where you want root-cause analysis over time |

## Common issues

**"This workflow isn't exposed to MCP."** Open the workflow in your
n8n UI → Settings → MCP → Available Workflows, toggle it on, then
retry.

**"Workflow building is disabled on this instance."** Your n8n
operator has set `N8N_MCP_BUILDER_ENABLED=false`. Ask them to
enable it, or use the n8n UI for workflow creation. The other
skills (run, test, publish, debug, list, manage-data-table) still
work.

**"I need both IDs."** `/n8n:debug-execution` needs both the
workflow ID and the execution ID. The n8n MCP surface has no way to
recover a workflow from an execution ID alone. Both IDs appear in
the execution URL in your n8n UI — paste them as
`/n8n:debug-execution {workflowId} {executionId}`.

**Can't resolve a workflow by ID.** `/n8n:list-workflows` and the
action skills that take `[workflow name or id]` handle both — if
your input looks like an ID it goes straight to `get_workflow_details`;
otherwise `search_workflows` searches by name/description.

## License

MIT.

## Contributing

This plugin is maintained alongside n8n. See the main n8n repo for
contribution guidelines.
