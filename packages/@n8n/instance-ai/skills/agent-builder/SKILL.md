---
name: agent-builder
description: >-
  Load immediately after an Agent intent. Describe a complete plan,
  then hand the user request and plan to build-agent for JEV review. Agent
  Builder owns Agent setup and implementation questions. Governs prerequisite
  creation, faithful handoff, targeting, testing, and publishing. Use directly
  for routine Agent follow-ups; rerun intent-recognition only when the requested
  artifact is no longer clear.
recommended_tools:
  - build-agent
  - build-workflow
  - data-tables
---

# Agent Builder

First describe the complete Agent behavior in text. Pass it in the `plan`
field of `build-agent`. The tool runs JEV before the embedded builder fills
parameters. Keep proposed implementation separate from the original user
requirements. Use the existing question, credential, and approval cards.
Use `plan-build` separately only when building prerequisite workflows.

## Plan quality

Check the proposed capabilities before handoff:

- Keep query structure fixed. Let the model supply typed values, not SQL or
  unrestricted query syntax. Select only the fields needed for the task.
- Separate identity verification from conversation. Asking for an email
  address does not verify it. Participant tools need a verified session or an
  opaque, validated access token. Mark a missing identity integration as a
  setup requirement. Keep participant data tools unavailable until it is ready.
- Bind record and event lookups to that verified participant. The model must
  not choose another participant's scope or an arbitrary external event ID.
  A `$fromAI` value remains model input even when its description says it is
  verified. Pass a token to a tool that validates it and derives the participant
  ID before the query, or use trusted runtime context. An instruction to call
  an identity tool first does not enforce that sequence.
- Prefer availability or free/busy operations when the task needs free slots.
  Do not return unrelated calendar event details to a participant.
- Use a workflow tool when booking or editing needs an ordered procedure:
  validate access, check availability, apply the calendar change, persist the
  returned event ID and state, then send confirmation. Include retry and
  recovery behavior. Direct independent tools are insufficient for that contract.
  A calendar change and a database write are separate effects. Do not call
  them atomic. Define recovery for a failure between them.
- Treat candidate confirmation and business approval as different decisions.
  Keep hiring decisions with the recruiter. Never infer an outcome from a
  scheduling change.

Pass any missing behavior and setup requirements to the embedded builder.
Inspect the saved configuration before describing the Agent as usable.

## Routing

Use this skill after `intent-recognition` chooses an agent-anchored design, or
when the conversation already targets an Agent and the user is continuing that
build. Do not rerun intent recognition for routine Agent edits or extensions.
Use `build-agent` only for Agent artifacts.

For a new Agent request, describe the plan first. Then
make the first `build-agent` call with the request and plan once any
required prerequisites are ready. Before that call, use `ask-user` only to choose a supported channel or to
define a workflow or data-table prerequisite that the orchestrator must create.
Only ask about the channel after `list-agent-capabilities` shows that the
requested channel is unsupported. Do not collect model, service, tool, topic,
schedule, credential, or other Agent implementation choices first. The embedded
Agent Builder asks those questions through the `build-agent` call.

When the conversation opens from an existing Agent in the editor and the user
asks to change its configuration or capabilities, that is an agent-anchored
request — target that Agent and call `build-agent`. Do not reroute to
`build-workflow`, and do not spawn a workflow to satisfy a capability change
on the Agent.

## Supported channels & unsupported requests

`list-agent-capabilities` returns every chat channel n8n Agents support, each
with `capabilities`, `useIntegrationWhen`, and `useNodeToolWhen`. It is the
authoritative source the orchestrator can read before building; a channel
absent from its result is unsupported for agents.

When the user asks for a channel that is not supported (e.g. WhatsApp,
Microsoft Teams), do not forward it to the builder as a channel to configure
and do not fake it by adding the platform as an agent tool. Explain the channel
is unsupported for agents, offer the supported alternatives, and ask which to
use — or whether the user explicitly wants that unsupported platform as the
conversation surface, in which case offer the `agent-entrypoint` workflow
bridge described in Prerequisites (it connects the platform trigger to Message
an Agent; it is not a channel config). Only forward a channel to `build-agent`
once it is a supported type or the user has chosen an alternative.

## Faithful handoff

Keep user requirements separate from proposed implementation in `message`.
Forward the user's wording as close to verbatim as possible. The requirements
section includes only:

- Requirements, constraints, and implementation choices the user explicitly
  stated.
- Explicit answers or decisions from earlier turns that are necessary for the
  current request.
- Prerequisite workflows or data tables you created for this Agent.

Put the detailed LLM plan in the `plan` field. Identify assumptions and
uncertain choices. The tool adds the JEV results to the handoff. The
embedded builder must validate these proposals against its capabilities and
the user's requirements. Proposals do not grant approval or supply credentials.

The host appends an <aia-handoff> block with the current user text and pending
ask-user answers that have not yet reached Agent Builder. Treat those as the
user's decisions for this build call, not as implementation you invented.
Still copy user-stated model, channel, and credential choices into message; do not omit
them because the host also injected them.

Never present assumptions or JEV choices as user requirements. Do not prescribe
a model, channel, credential, or approval policy that the user did not choose.
The embedded builder owns those choices and their existing interactive cards.

Do not silently translate an outcome into an implementation requirement.
For example, forward "a Slack agent that says hello to me" without turning it
into a request for a Slack node tool. Preserve unspecified and ambiguous
implementation details so the builder can resolve them with its own guidance
and interactive tools.

## Prerequisites

Before the first `build-agent` call, create prerequisites the builder cannot
create when they must be attached to or used by the Agent:

- Create a workflow tool only when one Agent tool call must run an ordered
  multi-node procedure, or when the user explicitly needs that workflow to be
  reusable, manually callable, or usable outside the Agent. Build it with
  `build-workflow`, then pass the built workflow in `workflowContext`.
- When the Agent will store or query tabular data, follow `data-table-manager`
  and create the required tables via `data-tables`. The builder cannot create
  tables.

List prerequisite names and schemas in `message`. Let the builder gather the
remaining Agent-specific requirements, including model, credentials,
integrations, and direct tools.

`build-agent` can return structured `requiredArtifacts` when the embedded
builder discovers something Instance AI must create:

- For a workflow with `relationship: "agent-tool"`, build it, pass it in
  `workflowContext`, and call `build-agent` again so the builder can attach it.
- For a workflow with `relationship: "agent-entrypoint"`, build it after the
  Agent exists, using the returned `agentId`. This workflow invokes the Agent;
  never pass it in `workflowContext`, never attach it to the Agent as a tool,
  and do not call `build-agent` again solely to attach it.
- For a data table, create it and call `build-agent` again with its name and
  schema in `message`.

For an unsupported chat channel, an `agent-entrypoint` workflow should connect
the platform trigger to Message an Agent, map the incoming message, use a
stable platform conversation/sender identifier as the custom session key, and
send the Agent's `text` response through the platform. Native Agent channels do
not need this wrapper.

If an older builder only lists missing workflows or tables in `builderReply`,
handle them the same way based on whether the workflow calls the Agent or is
called by the Agent. Never ask the user to create prerequisites manually.

## Targeting across turns

Address Agents in this conversation with `agentRef`, a short stable key similar
to a workflow compiler `sessionId`.

- For the first Agent, pass a fresh `agentRef` and `name`.
- Reuse that `agentRef` on later calls. Calls with neither `agentRef` nor
  `agentId` continue editing the current Agent.
- To build an additional Agent, pass `createNew: true` with a different
  `agentRef` and `name`.
- To edit an Agent not built in this conversation, pass its `agentId` once,
  optionally with an `agentRef`, then prefer the returned `agentRef`.

Naming or renaming the current Agent never silently creates another one.

## Saved sub-agent dependencies

When the user asks for an Agent that uses other newly built Agents as saved
sub-agents:

1. Build each child Agent under its own `agentRef` before attaching it to the
   parent.
2. Call `build-agent` for the parent and identify the child by its display name.
   The parent builder must discover the saved child and map its name to the
   valid stored ID. Do not pass a raw `agentId` as a user requirement.
3. Publication is not required for saved sub-agent delegation. Forward
   publication intent only when the user explicitly asks to publish or activate
   an Agent.

## Builder-owned interactions

When the user asks to test, run, publish, activate, make usable, unpublish, or
otherwise change the Agent, forward that intent in `message`. The builder owns
its internal testing tools; do not conclude testing is unavailable because
those tools do not appear in your toolset.

When the builder needs a user choice, credential, chat channel, or approval, it
surfaces an interactive card in this chat. Do not relay the question yourself;
the `build-agent` call resumes with the user's answer.
