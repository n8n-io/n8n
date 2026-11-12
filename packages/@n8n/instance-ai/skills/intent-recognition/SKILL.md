---
name: intent-recognition
description: >-
  Load before you build any new kept workflow or Agent. It decides which one to
  build, or what to ask first. Classifies automation requests using two decisions:
  anchor (which primitive owns the top-level control flow — workflow-anchored, agent-anchored,
  needs-clarification, or out-of-scope) and embeds_other (whether the other
  primitive appears embedded inside — an agent step inside a workflow, or a
  workflow invoked as an agent tool). Must be used whenever the current turn
  requires choosing or reconsidering the intent of an automation request,
  including compound requests, independent automations introduced mid-build,
  one-off questions or reports that need external systems you cannot query
  directly, and requests that need clarification before an anchor can be
  chosen. An explicit Agent request routes to agent-builder before ask_user.
  Do not load for routine edits or extensions when the conversation already
  targets a workflow or Agent.
---

# Intent recognition

## Purpose

Use this skill when an automation request still needs to be classified before
designing or building it, or when a new turn may require reconsidering the
current artifact. Do not load it again for a routine edit or extension when the
conversation already targets a workflow or Agent, unless the user introduces
an independent automation or the new request carries its own anchor signal.
The deciding question is not a single "workflow or agent" label — it is two
questions: who owns the top-level control flow, and does the other primitive
show up inside that flow.

If the user asked to build, route on the result: workflow-builder for
workflow-anchored (a bounded LLM step is an AI node in the graph; an embedded
agent is an AI Agent step inside it), an agent-oriented design for
agent-anchored (a tool-use loop), `ask_user` for needs-clarification, or answer
directly for out-of-scope.

## Inputs

- The user's request or scenario prompt.
- Whether the user is mid-build on an existing workflow or agent in this
  conversation — incremental requests default to extending that primitive.
- Whether the editor/canvas context the conversation opened from shows an
  existing **agent** or an existing **workflow** (or both). An existing agent
  in context that the user asks to change is an agent-anchored request — see
  Context continuity and Existing-agent modification.
- Any explicit constraints about determinism, auditability, latency, cost,
  compliance, reusability, or allowed tools.
- If the user did not explicitly select an Agent and the request is
  underspecified on an anchor-deciding axis, ask for the missing detail instead
  of guessing. An explicit Agent request already decides the anchor. Leave
  missing setup and implementation details to the Agent Builder.

## Decisions

Two orthogonal decisions per request, or per part for compound requests:

**1. Anchor** — which primitive owns the top-level control flow:

- **workflow-anchored**: the outer shell is a workflow graph. May include LLM
  steps as bounded transformers (classify, extract, summarize, score, a
  single decision feeding fixed branches).
- **agent-anchored**: an agent owns the flow; the LLM decides the next step
  at runtime or owns an ongoing role that requires judgment. n8n Agents are not
  chat-only: besides chat sessions, they run recurring objectives on a cron
  schedule (**tasks**) and keep memory across sessions and runs — so recurring
  or scheduled duties do not disqualify this anchor.
- **needs-clarification**: the request is under-specified on an
  anchor-deciding axis.
- **out-of-scope**: not a build intent at all. Covers meta or product
  questions (e.g. asking what the assistant is capable of building) and
  one-off content tasks with no trigger, no persistence, and no reuse intent
  (summarize, translate, or draft something once) — answer or do these
  directly instead of building an automation. It applies only when you can
  do the task yourself. A one-off task with an external *effect* (export,
  migrate, backfill) is **workflow-anchored**. Requests to operate on existing
  resources (run a workflow, debug an execution, list or manage workflows or
  agents, query data) are not classified by this skill: route them through
  their normal paths.

**2. Embeds other** — whether the other primitive appears inside the anchor:

- workflow-anchored + `true`: an agent embedded as a workflow step (e.g. a
  scheduled pipeline whose middle step is open-ended investigation).
- agent-anchored + `true`: workflows invoked as tools of the agent; see Agent
  tool shape to distinguish them from direct tools.
- `n/a` for needs-clarification and out-of-scope.

## Agent tool shape

After choosing an agent-anchored design, decide whether each capability should
be a direct agent tool or a workflow tool:

- **Direct agent tools are the default.** One node-backed capability or multiple
  independent node tools stay on the Agent build path with
  `embeds_other: false`.
- Use a **workflow tool** only when one agent tool call must run an ordered
  multi-node procedure, or when the user explicitly needs that workflow
  reusable, manually callable, or usable outside the agent. Build the workflow
  first, attach it to the Agent as a workflow tool, and set
  `embeds_other: true`.

Count the nodes required inside one tool invocation, not the total number of
tools on the agent. For example, looking up and inserting Data Table rows are
two direct node tools; an atomic lookup-transform-write procedure is one
workflow tool.

After choosing an agent-anchored design, load `agent-builder` before the first
`agent_builder_*` call. It owns targeting, prerequisite creation, and the Agent
build.

## Decision Steps

0. If the user is mid-build on an existing workflow or agent, apply context
   continuity (see Signals) before anything else — an incremental request
   normally extends the current primitive.
1. **Explicit artifact requests.** "Build me an Agent/assistant that…" selects
   an Agent artifact and decides the anchor. Do not ask the user to reconsider
   that choice during intent recognition. Do not silently substitute a workflow,
   even when it could implement the same behavior. You may explain a simpler
   workflow alternative, but switch only after the user chooses it. Route
   missing setup and implementation choices to Agent Builder. The immediate
   next routing action is to load `agent-builder`. Do not call `ask_user`
   between classification and that handoff. Forward the request without
   selecting services, tools, topics, schedules, or other implementation
   details. Agent Builder owns those questions. An explicit
   workflow request selects a workflow, unless it fits a row in Close pairs.
   Then the word "workflow" or named workflow nodes do not settle the choice:
   ask that row's question before you build either one. The
   false-friends rule applies to task descriptions, not to an explicit Agent
   request.
2. If the request is not a build intent — a meta or product question, or a
   one-off content task with no trigger or reuse — classify **out-of-scope**
   and answer or do it directly.
3. Split the request into parts only if it contains multiple independent
   automations with separate lifecycles (unrelated triggers, audiences, or
   cadences). Markers like numbering or "and separately" are a giveaway but
   are not required — a single plain sentence can contain two automations.
   Do not split a single automation that merely enumerates many tools or
   steps. Run steps 4-9 on each part.
4. Test the agent signals. If any one holds, classify **agent-anchored**.
5. Before selecting a workflow, verify that the request supplies or clearly
   entails every workflow condition. Do not invent a fixed sequence, decision
   policy, or bounded LLM task from a generic outcome. If a missing
   anchor-defining detail could make the work judgment-driven, classify
   **needs-clarification** and ask only for that detail.
6. Otherwise, test the workflow conditions. If all of them hold, classify
   **workflow-anchored**.
7. Decide `embeds_other` in both directions: does an agent step appear inside
   this workflow, or does this agent invoke workflows as tools?
8. **Degenerate-shell check.** If a workflow-anchored design reduces to a
   trigger plus a single open-ended agent step that does all the work — no
   deterministic steps earning the shell — the anchor is wrong: reclassify
   **agent-anchored** and build an n8n Agent (an on-demand duty becomes the
   agent's chat use; a scheduled duty becomes a task on the agent). Re-run
   this check while building.
9. If both anchors are genuinely defensible, apply the growth tiebreaker:
   prefer whichever primitive scales with likely complexity growth — usually
   agent-anchored when novel situations, longer horizons, or learning are
   implied. The tiebreaker applies only to genuine ties: when a bounded
   workflow reading fully satisfies the request, prefer it. If it is a real
   toss-up, say so and name both readings instead of feigning certainty.
   The workflow preference applies to task-shaped requests; it never
   overrides an explicitly requested agent artifact (step 1).

## Close pairs

Some artifacts look alike. Each row names a pair, the signal that a request
fits both, and one question that tells them apart. When the user names one
side and the signal fits the other side too, ask the row's question with
`ask_user`, then build what the user picks. Do not build
either side first. An explicit Agent request does not use this table (step 1).
A new artifact type adds a row here.

| Pair | The request fits both when | Question |
| --- | --- | --- |
| Agent, or a workflow with a Chat Trigger or AI Agent node | People send it messages over time (a chat window, DMs, a messaging channel), and each reply needs judgment, memory of the person, or actions on their behalf. | Should it hold a conversation with each person and decide its replies, or run the same fixed steps on every message? |

## Signals

**Agent-anchored** (any one is enough):

- Reasoning dominates the flow: investigate, decide, act, iterate.
- Persistent delegated role: the user gives an analyst, coordinator,
  receptionist, researcher, or similar role continuing responsibility for a
  changing domain. The role must require judgment such as choosing what
  matters, selecting tools, following up, or adapting actions. A role noun by
  itself is not enough.
- On-demand question or report that requires judgment-driven navigation of
  external systems (which items matter, how they map to goals) and cannot be
  answered directly with your own tools — the user is in effect already
  chatting with the automation they need. The artifact is an agent with those
  tools that can be asked again anytime, not a manually triggered workflow.
- Multi-session or long-running: coordination across days, tracked open
  threads, daily check-ins.
- Proactive or recurring on its own: wakes on a heartbeat or a scheduled
  task, checks state, and decides what to do about it each run. The judgment
  per run is the signal, not the cadence — a schedule alone is anchor-neutral
  (see Scheduled judgment work).
- Self-improving or skill accretion is first-class: learns from feedback
  over time, gets better at the task.
- Chat or session-based interaction. A workflow with a Chat Trigger is not
  a substitute — this signal holds unless the chat merely triggers a fixed
  pipeline (see Gotchas).
- Cross-session memory.

**Workflow-anchored** (all must hold):

- Structure is a graph of enumerable steps.
- Any LLM use is a bounded transformer: fixed-label classify, extract,
  summarize, or a single decision.
- Trigger and actions are deterministic. A cron schedule satisfies this but
  never decides the anchor by itself — agents run scheduled tasks too; what
  must be deterministic is the body of each run.
- Reproducibility or auditability is served by the same graph running every
  time.

**Scheduled judgment work** (recurring cadence + open-ended body): both
primitives can own it — a workflow shell with an embedded agent step, or an
agent with a scheduled task. Default to an Agent task when the open-ended duty
is the whole outcome and the workflow shell would only trigger the duty and
deliver its result. Use a workflow shell when its deterministic collection,
gating, transformation, branching, or delivery steps are independently
meaningful and the agent owns only one bounded stage. Choose an Agent when the
duty belongs to a persistent role, needs memory across runs, supports user
interaction, or has other duties. An explicit Agent request remains binding.
A recurring duty added to an agent mid-build is always a task on that agent,
never a spawned workflow.

**Embeds-other signals**:

- Workflow with an embedded agent: a step in an otherwise fixed pipeline is
  open-ended ("figure out why", "investigate", "decide what to do about it")
  while the trigger and surrounding steps stay deterministic.
- The embedding is often implicit — the request never says "agent". Ask of
  each step: could a fixed-instruction transform do it (enumerable labels,
  one bounded rewrite), or does doing it well require gathering and weighing
  context that differs per item, then producing a judgment? A nightly job
  that drafts a tailored renewal pitch for each account from its usage
  history embeds an agent; a nightly job that condenses each ticket into a
  two-sentence summary does not.
- For an agent with workflow tools, apply Agent tool shape.

**Context continuity** (step 0): inside a workflow build, a request to insert
a scoring step stays a bounded LLM step, not a new agent. Inside an agent
build, a request to post an update on completion is a new tool on that
agent, not a spawned workflow. Only cross into the other primitive when the
incremental request itself carries its own anchor signal — and even then,
prefer asking before switching paradigm if it isn't clearly load-bearing.

**Existing-agent modification**: context continuity extends to an agent open
in the editor. A request to change its configuration or capabilities is
**agent-anchored**, including an unsupported capability, unless the user names
a workflow as the target. If both an agent and a workflow are in context and
the target is ambiguous, classify **needs-clarification**.

**Clarify triggers**: rule-based vs judgment-based (what defines "important"
or "urgent"?), scope/autonomy (act on its own vs draft for review),
interaction mode (one-shot vs chat). Clarify when the missing answer changes
the anchor. When the request supplies enough evidence and both designs remain
valid, apply the growth tiebreaker instead of asking a theoretical preference.
Until the anchor is chosen, ask in plain terms, without the words workflow
or Agent.

**False friends — not signals by themselves**:

- Surface vocabulary: "agent", "assistant", "bot", "workflow", "automate"
  in a *task description* carries no weight — classify the shape, not the
  words. A persistent delegated role combines the role with ongoing judgment,
  so it is a real Agent signal. An explicit artifact request ("build me an
  agent that…") is binding; see Decision Step 1.
- Step count and tool count: long linear pipelines and high tool counts are
  not agentic. Seven deterministic steps with zero branches is still a
  workflow.

## Examples

- "Every day at 6pm, pull today's Shopify order count and post it to a
  Discord channel." -> **workflow-anchored**, `embeds_other: false`: fixed
  schedule, source, and destination.
- "When a new Jira issue is created, classify it as bug/feature/question and
  route it to the matching Discord channel." -> **workflow-anchored**,
  `embeds_other: false`: bounded classification feeding fixed routing.
- "Every night, gather the day's failed background jobs, dig into the logs
  and recent deploys to work out why each one failed, and post a write-up to
  a Notion page." -> **workflow-anchored**, `embeds_other: true`: schedule
  and destination are fixed; "work out why" is open-ended investigation, best
  run as an embedded agent step.
- "Give me a chat window where I can ask about our expense-reporting rules
  and get answers pulled from the finance handbook." -> **agent-anchored**,
  `embeds_other: false`: chat interaction, the LLM decides what to look up
  each turn.
- "Build an ops agent that can check server health, restart services via our
  runbook, and file a Jira ticket if it can't resolve things — the restart
  and ticket-filing should also be triggerable manually elsewhere." ->
  **agent-anchored**, `embeds_other: true`: explicitly reusable actions are
  workflows the agent calls as tools.
- "Have an agent keep an eye on our AWS spend throughout the day and flag me
  before we blow through budget, without me asking it to check." ->
  **agent-anchored**, `embeds_other: false`: proactive, heartbeat-driven,
  no fixed check schedule.
- "Every night, fetch the day's new GitHub stars and send me a digest." ->
  **workflow-anchored**. "Build me an agent that does the same" ->
  **agent-anchored**: the user selected an Agent, and the recurring duty is a
  scheduled task on it.
- "Set up a daily market analyst. It should research market changes, decide
  which developments matter, and send me a briefing each morning." ->
  **agent-anchored**, `embeds_other: false`: the analyst owns a persistent,
  judgment-driven role; the morning cadence is a task on that Agent.
- "Give me a chat box where I paste a company name and it runs our
  enrichment steps and replies with the result." -> **workflow-anchored**:
  chat only triggers a fixed graph.
- "Transcribe my sales calls and chase the deals that go quiet." -> two
  parts: a bounded transcription pipeline (**workflow-anchored**) and ongoing
  deal chasing (**agent-anchored**).
- "Tell me when something important happens with our shipments." ->
  **needs-clarification**: ask whether concrete rules define "important".

## Gotchas

- Do not force vague prompts into an anchor; ask when an anchor-deciding
  axis is missing.
- Never default `embeds_other` to `false` without checking both directions:
  an agent step hiding inside a workflow, and a workflow acting as an
  agent's tool.
- Unnecessary agency adds latency, cost, and compounding error risk — do not
  reach for an agent when a bounded workflow fully satisfies a task-shaped
  request. This is not a license to override an explicit agent request.
- Unnecessary workflow shells hide Agent intent. Do not wrap an open-ended
  delegated duty in a workflow when the shell only supplies a schedule and a
  destination.
- Never satisfy an **agent-anchored** classification with a workflow
  containing a Chat Trigger + AI Agent node. The AI Agent *node* is only for
  `embeds_other: true` steps inside a workflow-anchored pipeline.
- Do not use an agent when progress cannot be verified: if the path cannot
  be scripted and the result cannot be checked, the design is not ready.
- Respect the current build context: an incremental request stays on the
  active primitive unless it carries its own anchor signal.
- Keep n8n framing clear: agents operate inside workflow guardrails; they do
  not replace the workflow engine.

## Output Format

Return a concise classification and reason:

```text
Anchor: workflow-anchored | agent-anchored | needs-clarification | out-of-scope
Embeds other: true | false | n/a
Reason: <one or two sentences citing the deciding signals>
Next step: <build workflow / build workflow with embedded agent step / build n8n Agent artifact (agent build path; recurring duties as scheduled tasks on the agent) / ask clarification / answer directly>
```

For build requests, do not expose this format unless the user asks for
classification. Instead, proceed according to the selected next step. When
the user asks for classification in a specific format, such as a JSON block,
follow that format and map the vocabulary accordingly (workflow-anchored,
agent-anchored, needs-clarification, out-of-scope, and their equivalents).
For compound requests, output one classification block per part.
