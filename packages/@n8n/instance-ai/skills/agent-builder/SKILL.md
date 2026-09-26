---
name: agent-builder
recommended_mode: agents
description: >-
  Load immediately after an Agent intent, and for every follow-up on an Agent
  that the conversation targets. Governs how you build, edit, test, and publish
  n8n Agents yourself with select-agent and the Agent Builder tools, including
  targeting, prerequisite workflows and data tables, and setup questions.
shared_references:
  - credential-setup-with-computer-use
recommended_tools:
  - select-agent
  - read_config
  - write_config
  - patch_config
  - build-workflow
  - data-tables
---

# Agent Builder

You build n8n Agents yourself. `select-agent` chooses the Agent to work on, and
the Agent Builder tools (`read_config`, `write_config`, `patch_config`,
`create_skills`, `create_tasks`, `resolve_llm`, `ask_credential`,
`configure_channel`, `finish_setup`, `call_agent`, `publish_agent`, and the
others) act on that Agent.

Before your first Agent Builder tool call in a conversation, load
`agent-builder-guide`. It is the full build procedure: config rules, the
initial build, interactive tools, testing, and publishing. Load the other
references it names when a step needs them.

## Routing

Use this skill when a request calls for an n8n Agent, or when the conversation
already targets an Agent and the user is continuing that build. Use the Agent
Builder tools only for Agent artifacts. On the `workflow-builder` path, never
call them — not to inspect nodes, list workflows, or supply a tool the
workspace lacks.

When the conversation opens from an existing Agent in the editor and the user
asks to change its configuration or capabilities, that is an agent-anchored
request — target that Agent and edit it. Do not reroute to
`workflow-builder`, and do not build a workflow to satisfy a capability change
on the Agent.

For a new Agent request, start the build as soon as any required prerequisites
are ready. Before the build, use `ask-user` only to choose a supported channel
or to define a prerequisite workflow or data table. Only ask about the channel
after `list-agent-capabilities` shows that the requested channel is
unsupported. Model, service, tool, topic, schedule, credential, and other Agent
implementation choices follow `agent-builder-guide`: the initial build uses
stated assumptions and collects the open choices in one trailing
`finish_setup` call.

During an Agent build, ask with the builder's interactive tools
(`ask_questions`, `ask_credential`, `configure_channel`, `finish_setup`), not
with `ask-user`.

## Supported channels & unsupported requests

`list-agent-capabilities` returns every chat channel n8n Agents support, each
with `capabilities`, `useIntegrationWhen`, and `useNodeToolWhen`. It is the
authoritative source; a channel absent from its result is unsupported for
agents.

When the user asks for a channel that is not supported (e.g. WhatsApp,
Microsoft Teams), do not configure it and do not fake it by adding the platform
as an Agent tool. Explain the channel is unsupported for agents, offer the
supported alternatives, and ask which to use — or whether the user explicitly
wants that unsupported platform as the conversation surface. In that case,
build an `agent-entrypoint` workflow as described in Prerequisites (it connects
the platform trigger to Message an Agent; it is not a channel config).

## Targeting across turns

`select-agent` persists the target in the thread. The builder tools keep
acting on it in later turns until you select another Agent. Address Agents in
this conversation with `agentRef`, a short stable key similar to a workflow
`filePath`.

- For a new Agent, call `select-agent` with a fresh `agentRef` and `name`.
  `mode: "create"` in the result means an initial build.
- To switch back to an Agent from this conversation, call `select-agent` with
  its `agentRef`.
- To build an additional Agent, pass `createNew: true` with a different
  `agentRef` and `name`.
- To edit an Agent not built in this conversation, pass its `agentId` once
  (find it with `agents`), optionally with an `agentRef`, then prefer the
  returned `agentRef`.
- Do not call `select-agent` again for follow-ups on the current Agent.

Naming or renaming the current Agent never silently creates another one.
Rename an Agent through its config.

Use the returned `previewPath` for markdown Preview links:
`[Preview](<previewPath>)`. Do not invent absolute URLs.

## Prerequisites

The Agent Builder tools cannot create workflows or data tables. You can, so
never ask the user to create them manually. Switch to the `build` mode for a
workflow or the `data` mode for a data table, then switch back to `agents`.

- Create a workflow tool only when one Agent tool call must run an ordered
  multi-node procedure, or when the user explicitly needs that workflow to be
  reusable, manually callable, or usable outside the Agent. Follow
  `workflow-builder`. The workflow must start with the trigger that
  `list_workflows` requires. Then attach it to the Agent config as a
  `workflow` tool.
- When the Agent will store or query tabular data, follow `data-table-manager`
  and create the required tables via `data-tables` before you write the Agent
  instructions or tools that use them.
- For an unsupported chat channel that the user wants as the conversation
  surface, build an `agent-entrypoint` workflow after the Agent exists. It
  connects the platform trigger to Message an Agent, maps the incoming message,
  uses a stable platform conversation or sender identifier as the custom
  session key, and sends the Agent's `text` response back through the
  platform. This workflow invokes the Agent: never attach it to the Agent as a
  tool. Native Agent channels do not need this wrapper.

When you discover a missing prerequisite in the middle of an Agent build, keep
the Agent build going as far as it can, build the prerequisite, then come back
and attach it.

## Saved sub-agent dependencies

When the user asks for an Agent that uses other newly built Agents as saved
sub-agents:

1. Build each child Agent under its own `agentRef` before attaching it to the
   parent.
2. Select the parent and attach each child by the id that `list_sub_agents`
   returns for it.
3. Publication is not required for saved sub-agent delegation. Publish only
   when the user explicitly asks to publish or activate an Agent.

## Agent UI labels

When you send the user to the agent editor, use the labels they see:

- Sessions tab: past agent conversations, tests, and activity. Each item is a session.
- Preview: the live test-chat dock, not the history list.
- Workflow execution history stays "Executions". Do not reuse that name for agents.

Never say Runs tab, Executions tab, Activity History, or Runs Activity History for an agent.
