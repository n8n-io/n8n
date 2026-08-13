---
name: agent-builder
description: >-
  Load before calling build-agent for a new or existing n8n Agent. Governs
  prerequisite creation, faithful handoff of the user's request, agent
  targeting across turns, builder questions, testing, and publishing. Use
  directly for routine follow-ups when the conversation already targets an
  Agent; rerun intent-recognition only when the requested artifact is no
  longer clear.
recommended_tools:
  - build-agent
  - build-workflow
  - data-tables
---

# Agent Builder

## Routing

Use this skill after `intent-recognition` chooses an agent-anchored design, or
when the conversation already targets an Agent and the user is continuing that
build. Do not rerun intent recognition for routine Agent edits or extensions.
Use `build-agent` only for Agent artifacts.

## Faithful handoff

Treat `message` as a faithful handoff of the user's request, not an Agent build
specification authored by you. Forward the user's wording as close to verbatim
as possible. Include only:

- Requirements, constraints, and implementation choices the user explicitly
  stated.
- Explicit answers or decisions from earlier turns that are necessary for the
  current request.
- Prerequisite workflows or data tables you created for this Agent.

Never infer, invent, expand, recommend, or prescribe implementation details the
user did not request, and never present your assumptions as user requirements.
In particular, do not choose or tell the builder which model, instructions,
tools, tool types, integrations, channels, MCP servers, workflows, skills,
tasks, memory, credentials, triggers, schedules, approvals, or test strategy to
use.

Do not translate an outcome or named service into a specific implementation.
For example, forward "a Slack agent that says hello to me" without turning it
into a request for a Slack node tool. Preserve unspecified and ambiguous
implementation details so the builder can resolve them with its own guidance
and interactive tools.

## Prerequisites

Before the first `build-agent` call, create every prerequisite the builder
cannot create:

- Create a workflow tool only when one Agent tool call must run an ordered
  multi-node procedure, or when the user explicitly needs that workflow to be
  reusable, manually callable, or usable outside the Agent. Follow
  `workflow-builder`, then pass the built workflow in `workflowContext`.
- When the Agent will store or query tabular data, follow `data-table-manager`
  and create the required tables via `data-tables`. The builder cannot create
  tables.

List prerequisite names and schemas in `message`. Let the builder gather the
remaining Agent-specific requirements, including model, credentials,
integrations, and direct tools.

If a `builderReply` lists missing workflows or tables, create them and call
`build-agent` again. Never ask the user to create them manually.

## Targeting across turns

Address Agents in this conversation with `agentRef`, a short stable key similar
to a workflow `filePath`.

- For the first Agent, pass a fresh `agentRef` and `name`.
- Reuse that `agentRef` on later calls. Calls with neither `agentRef` nor
  `agentId` continue editing the current Agent.
- To build an additional Agent, pass `createNew: true` with a different
  `agentRef` and `name`.
- To edit an Agent not built in this conversation, pass its `agentId` once,
  optionally with an `agentRef`, then prefer the returned `agentRef`.

Naming or renaming the current Agent never silently creates another one.

## Builder-owned interactions

When the user asks to test, run, publish, activate, make usable, unpublish, or
otherwise change the Agent, forward that intent in `message`. The builder owns
its internal testing tools; do not conclude testing is unavailable because
those tools do not appear in your toolset.

When the builder needs a user choice, credential, chat channel, or approval, it
surfaces an interactive card in this chat. Do not relay the question yourself;
the `build-agent` call resumes with the user's answer.
