---
name: agent-builder
description: >-
  Use when creating, configuring, or editing a target n8n agent's build
  configuration — chat integrations/triggers, MCP servers, node-tool resource
  locators, sub-agent delegation, reusable target-agent skills, or recurring
  scheduled tasks. Not for building n8n workflows or for built-in Build/Preview
  chat.
---

# Agent Builder

Guidance for configuring a target n8n agent's build configuration. Each area
below has a dedicated reference file with the full operating procedure. Match
the user's request to the area, then load that reference with
`load_skill({ skillId: "agent-builder", filePath: "references/<file>.md" })`
before acting — do not act on an area from memory.

## Tools

All builder actions run through a single `agent_builder` tool. Invoke an action
as `agent_builder({ action: "<name>", ...args })`. Available actions:
`create_agent`, `read_config`, `build_agent`, `search_nodes`,
`get_node_types`, `get_resource_locator_options`, `create_skill`, `create_task`,
`build_custom_tool`, `list_integration_types`, `list_sub_agents`, `list_agents`,
`list_workflows`, `search_mcp_servers`, `verify_mcp_server`, `resolve_llm`.

Credentials are listed via the native `credentials` tool (not an `agent_builder`
action) — call `credentials({ action: "list", type?, name? })`.

Where a reference below names an action (e.g. "call `build_agent`"), invoke it
as `agent_builder({ action: "build_agent", ... })`.

## Config editing flow (required)

The agent config is edited as a JSON file in the workspace, then persisted with
`build_agent` — never composed inline:

1. Call `agent_builder({ action: "read_config" })` to get the persisted
   `config` and `configHash`.
2. Write the config JSON to a stable workspace file,
   `src/agents/<slug>.agent.json` (for an existing agent, write the `config`
   returned by `read_config`; for a brand-new agent, write the full new
   config). Reuse the same file for the rest of the conversation; re-create it
   from `read_config` if the workspace was reset.
3. Make the requested change by editing that file with the workspace file
   tools — always the smallest edit that fulfills the request.
4. Call `agent_builder({ action: "build_agent", filePath:
   "src/agents/<slug>.agent.json", baseConfigHash: <configHash from step 1> })`.
   Pass `baseConfigHash: null` only when `read_config` showed no config yet.
5. On `{ ok: false, stage: "stale" }` the config changed elsewhere: take the
   returned `config`/`configHash`, re-apply the edit on top of it in the file,
   and call `build_agent` again with the new hash. On validation errors, fix
   the file and rebuild. On success, the returned `configHash` is the base for
   the next edit.

One builder capability is a separate tool, not an `agent_builder` action:
`configure_channel({ integrationType })` — an interactive tool that opens the
chat-channel setup UI so the user creates a new credential and connects a
channel. The `integrationType` comes from `list_integration_types`. See the
Integrations reference.

## Asking the user, credentials, and the LLM

There are no builder-specific picker cards. When you need input from the user:

- **A question or a choice** — use the native `ask-user` tool.
- **A credential** for a node tool, MCP server, or integration — call the native
  `credentials` tool: `credentials({ action: "list", type: "<credentialType>" })`
  (pass `name` for a targeted lookup by credential name). If exactly one matches,
  use its `id`. If several match, ask the user to choose with `ask-user` (present
  the names) and use the chosen credential's `id`. Build the credentials map as
  `{ "<credentialType>": { "id": "<id>", "name": "<name>" } }`. Use only returned
  credential ids; if none exists, tell the user to create it in n8n first.
  **Chat channels are the exception**: use `configure_channel` (see the
  Integrations reference), which creates a new channel credential through setup.
- **The agent's main LLM** — call
  `agent_builder({ action: "resolve_llm", provider?, model? })`. If it returns
  `ok: true`, use the returned `provider`/`model`/`credentialId`. If it returns
  `ok: false` (missing/ambiguous/unsupported), ask the user with `ask-user` using
  the returned options, then write the choice into the config file and call
  `build_agent`.

## First: make sure an agent is being built

Every action below operates on a single target agent. If no agent is targeted
yet (a fresh request to build an agent, or `read_config` / `build_agent`
reports that no agent is being built), call
`agent_builder({ action: "create_agent", name: "<short name>" })` once to create
it. That binds the rest of the conversation to the new agent; then call
`agent_builder({ action: "read_config" })` and proceed with the config editing
flow above. Do not create the agent again if one is already being built or
edited — the binding persists across turns.

## Routing

- **Integrations** — Use when deciding whether Slack, Linear, Telegram, or another external platform should be a target-agent chat integration/trigger versus a node tool, and when adding or changing chat integrations; not for built-in Build chat or Preview chat behavior. Load [references/integrations.md](references/integrations.md).

- **MCP servers** — Use when adding, removing, or updating MCP (Model Context Protocol) servers on the target agent. Load [references/mcp.md](references/mcp.md).

- **Resource locators** — Use when adding or changing node tools with stable dynamic selector fields: resourceLocator, loadOptionsMethod, loadOptions routing, "Name or ID" parameters, teamId, channelId, projectId, calendarId, databaseId, tableId, model selectors, or when build_agent rejects $fromAI on a dynamic selector. Load [references/resource-locators.md](references/resource-locators.md).

- **Sub-agents** — Use when configuring inline or saved sub-agent delegation for the target agent, selecting published same-project sub-agents, or changing subAgents.maxChildren. Load [references/sub-agents.md](references/sub-agents.md).

- **Target skills** — Use when creating reusable target-agent skills, playbooks, policies, style guides, or domain instructions with create_skill that should load only for relevant future requests; not for builder guidance or one-off instructions. Load [references/target-skills.md](references/target-skills.md).

- **Target tasks** — Use when the user wants the target agent to run something on a recurring schedule (a "task"): a daily/weekly/hourly objective the agent carries out on its own with create_task. Not for one-off requests, chat/event triggers, or config/tool/skill/model edits. Load [references/target-tasks.md](references/target-tasks.md).
