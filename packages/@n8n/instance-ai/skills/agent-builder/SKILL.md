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
`create_agent`, `read_config`, `write_config`, `patch_config`, `search_nodes`,
`get_node_types`, `get_resource_locator_options`, `create_skill`, `create_task`,
`build_custom_tool`, `list_integration_types`, `list_sub_agents`,
`list_workflows`, `search_mcp_servers`, `verify_mcp_server`, `resolve_llm`.

Credentials are listed via the native `credentials` tool (not an `agent_builder`
action) — call `credentials({ action: "list", type?, name? })`.

Where a reference below names an action (e.g. "call `write_config`"), invoke it
as `agent_builder({ action: "write_config", ... })`.

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
  the returned options, then write the choice via `write_config`.

## First: make sure an agent is being built

Every action below operates on a single target agent. If no agent is targeted
yet (a fresh request to build an agent, or `read_config` / `write_config` /
`patch_config` reports that no agent is being built), call
`agent_builder({ action: "create_agent", name: "<short name>" })` once to create
it. That binds the rest of the conversation to the new agent; then call
`agent_builder({ action: "read_config" })` and proceed. Do not create the agent
again if one is already being built or edited.

## Routing

- **Integrations** — Use when deciding whether Slack, Linear, Telegram, or another external platform should be a target-agent chat integration/trigger versus a node tool, and when adding or changing chat integrations; not for built-in Build chat or Preview chat behavior. Load [references/integrations.md](references/integrations.md).

- **MCP servers** — Use when adding, removing, or updating MCP (Model Context Protocol) servers on the target agent. Load [references/mcp.md](references/mcp.md).

- **Resource locators** — Use when adding or changing node tools with stable dynamic selector fields: resourceLocator, loadOptionsMethod, loadOptions routing, "Name or ID" parameters, teamId, channelId, projectId, calendarId, databaseId, tableId, model selectors, or when write_config/patch_config rejects $fromAI on a dynamic selector. Load [references/resource-locators.md](references/resource-locators.md).

- **Sub-agents** — Use when configuring inline or saved sub-agent delegation for the target agent, selecting published same-project sub-agents, or changing subAgents.maxChildren. Load [references/sub-agents.md](references/sub-agents.md).

- **Target skills** — Use when creating reusable target-agent skills, playbooks, policies, style guides, or domain instructions with create_skill that should load only for relevant future requests; not for builder guidance or one-off instructions. Load [references/target-skills.md](references/target-skills.md).

- **Target tasks** — Use when the user wants the target agent to run something on a recurring schedule (a "task"): a daily/weekly/hourly objective the agent carries out on its own with create_task. Not for one-off requests, chat/event triggers, or config/tool/skill/model edits. Load [references/target-tasks.md](references/target-tasks.md).
