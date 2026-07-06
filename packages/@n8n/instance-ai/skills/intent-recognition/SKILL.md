---
name: intent-recognition
description: >-
  Classifies automation requests by which primitive owns top-level control
  flow — a workflow graph or an agent — and whether the other primitive is
  embedded inside it. Must be used before deciding the intent of any
  automation request, including intent-only classification, route selection,
  workflow-vs-agent decisions, embedded-agent-vs-embedded-workflow
  distinctions, and ambiguous or out-of-scope automation requests, before
  choosing workflow-builder, planning, or an agent-oriented design.
---

# Intent recognition

## Purpose

Use this skill to classify an automation request before designing or building
it. This skill must be used before deciding which primitive owns an
automation request's control flow. Two orthogonal decisions:

1. **Anchor** — which primitive owns the top-level control flow: `workflow`,
   `agent`, `clarify`, or `out-of-scope`.
2. **Embeds other** — whether the primitive that lost the anchor still
   appears inside the winner (an agent node embedded in a workflow, or a
   user-authored workflow invoked as a tool from an agent).

If the user asked to build, use the classification to choose the next path:
`workflow-builder` for a workflow anchor (even one with an embedded agent
node, or a single bounded AI transformer), an agent design for an agent
anchor, `ask-user` for `clarify`, or answer directly for `out-of-scope`.

## Inputs

- The user's request or scenario prompt.
- Whether the conversation is already inside a workflow build or an agent
  build — prefer extending that paradigm over spawning a new one (see
  Inline context below).
- Any explicit constraints about determinism, auditability, latency, cost,
  compliance, or allowed tools.
- If the request is underspecified on an anchor-deciding axis, ask for the
  missing detail instead of guessing.

## Anchor criterion (structural weight)

Anchor to whichever primitive owns the top-level control flow.

**Agent-anchored — any one signal is enough:**

- Reasoning dominates the flow (investigate → decide → act → iterate)
- Multi-session or long-running task
- Proactive or heartbeat-driven behavior
- Self-improving / skill accretion is first-class
- Chat / session-based interaction
- Cross-session memory

**Workflow-anchored — all must hold:**

- Structure is a graph of enumerable steps
- LLM is used only as a bounded transformer (classify, extract, summarize, one
  decision) — this absorbs what used to be called "hybrid" and
  "single AI task"
- Trigger and actions are deterministic
- Reproducibility / auditability is required

**Growth tiebreaker.** If both are structurally viable, prefer the anchor that
scales with likely complexity growth — usually agent-anchored when novel
situations, longer horizons, or learning are implied.

**Clarify.** Use only when the request lacks the information needed to decide
(trigger shape, reasoning bounds, interaction mode) — not merely because the
criterion could defensibly go either way. When both anchors are legitimately
defensible given the same information, pick the one the growth tiebreaker
favors and say so in the rationale; do not default to clarify.

**Out-of-scope.** Meta or non-build questions (e.g. "what can you build?",
"what's the difference between a workflow and an agent?") — answer directly,
do not force a build classification.

## Compound intents

If a request bundles multiple independent automations, decompose it into
parts and classify each part independently against the same criterion. Two
automations are independent parts when they have separate triggers/lifecycles
and neither's outcome depends on the other's; a single automation with
sub-steps is not compound.

## Decision steps

1. Split into parts if the request bundles independent automations; otherwise
   treat it as one part.
2. For each part, identify whether it specifies enumerable steps or only an
   outcome that requires runtime reasoning.
3. If steps are specified or enumerable, and any LLM use is a bounded
   transformer feeding fixed branches, classify **workflow** — even when the
   workflow is long or contains an AI step.
4. If the top-level control flow is reasoning-driven, multi-session,
   proactive, self-improving, chat-based, or needs cross-session memory,
   classify **agent**.
5. Decide **embeds other** independently: does the workflow embed an agent
   node for a reasoning-heavy sub-step, or does the agent invoke a
   user-authored, independently reusable workflow as a tool?
6. If the part lacks the information to decide an anchor, classify
   **clarify** and name the missing dimension(s) instead of guessing.
7. If the request is a meta or product question rather than a build intent,
   classify **out-of-scope**.
8. Bias ties toward the simpler anchor unless the growth tiebreaker clearly
   favors the other. Unnecessary agency adds latency, cost, and compounding
   error risk.

## Signals

**Workflow-anchored signals**:

- "when X happens, do Y"
- schedules such as "every day", "every morning", or "hourly"
- fixed source-to-destination syncs
- named apps and fully ordered "and then" chains
- enumerable `if` / `else` or switch conditions
- classify-then-route, score-then-assign, triage, moderate, prioritize-and-dispatch
- requirements for reproducibility, auditability, same output every time,
  logging, recording, or notification
- a single bounded AI transformation (summarize, translate, rewrite, extract,
  draft) with no orchestration need

**Workflow-anchored with an embedded agent**:

- a fixed trigger/shell where one step is genuinely open-ended investigation
  or judgment that itself needs a tool-use loop (e.g. "scan logs and identify
  unusual patterns" inside an otherwise scheduled pipeline)

**Agent-anchored signals**:

- "figure out", "decide", "handle whatever comes in", "as needed", "based on
  context"
- open-ended research or investigation where each tool result determines the
  next action
- chat / conversational interaction, especially multi-turn or with memory
  across sessions
- proactive / heartbeat-driven monitoring that decides when to act
- long-running or multi-session coordination
- learning or improving from experience over time
- rules so numerous or shifting that a hardcoded branch tree would be
  unmaintainable

**Agent-anchored with a wf-tool**:

- the request explicitly calls out that some action should be a reusable
  workflow other automations can also trigger

**Clarify signals**:

- vague goals like "handle my inbox" or "notify me about important emails"
- mixed requests where one part is bounded but another part implies
  unspecified follow-up actions
- adjectives like "important", "urgent", or "interesting" without rules or
  examples
- missing interaction mode (one-shot vs. chat) or autonomy level

**Out-of-scope signals**:

- asking what the assistant/product can do
- asking for a definition or comparison (e.g. workflow vs. agent) with no
  request to build anything

## Inline context

When the conversation is already inside a workflow build or an agent build,
prefer extending the current paradigm over spawning a new primitive:

- Inside a workflow: an agentic-sounding follow-up ("investigate errors and
  figure out what's wrong") is usually cleanest as an embedded agent node,
  not a new standalone agent. If the request would require abandoning the
  existing workflow, classify **clarify** on the paradigm-switch dimension
  instead of silently spawning a new primitive.
- Inside an agent: a follow-up naming a concrete action ("also send a Slack
  when done") is a new tool on the existing agent, not a new workflow.

## Surface-vocabulary warning

Classify by structural shape, not by the words the user happens to use. "AI
agent" that only fires on a schedule and does one fixed action is
workflow-anchored; a "simple workflow" that chats with customers and answers
open-ended questions is agent-anchored. Do not let "agent", "workflow",
"bot", "assistant", or "automate" bias the label — and do not treat a high
tool or step count alone as an agent signal; count of steps is not autonomy.

## Examples

- "Every morning at 9am, pull yesterday's Stripe charges and append them to a
  Google Sheet." -> **workflow**, embeds_other: no — fixed schedule, fixed
  source, fixed destination.
- "When a form is submitted, create a HubSpot contact, send a welcome email,
  add them to a list, and post to Slack." -> **workflow**, embeds_other: no —
  multi-step does not mean agent when every step is specified.
- "Whenever a new article hits our RSS feed, summarize it in two sentences
  and post the summary to LinkedIn." -> **workflow**, embeds_other: no — AI
  inside a fixed pipeline is not an agent.
- "Read incoming support emails, classify by urgency and topic, then route
  urgent billing to finance and technical issues to PagerDuty." ->
  **workflow**, embeds_other: no — bounded classification plus deterministic
  routing (formerly "hybrid").
- "Every morning at 8am, have an agent scan our overnight error logs,
  identify unusual patterns, and post a summary to Slack." -> **workflow**,
  embeds_other: yes — scheduled shell; anomaly identification is
  reasoning-dominated, so it's an embedded agent node.
- "Research our competitors' recent pricing changes and summarize what
  changed." -> **agent**, embeds_other: no — search, reading, follow-up
  investigation, and synthesis are discovered at runtime.
- "When a customer complains, figure out what went wrong by checking orders
  and past tickets, then decide whether to refund, replace, or escalate." ->
  **agent**, embeds_other: depends — investigation order depends on lookup
  results; if the lookups should be reusable elsewhere, they're wf-tools.
- "Customer support agent that can look up orders from Postgres, issue
  refunds, and escalate to Zendesk — those actions should be reusable
  workflows we can also trigger manually." -> **agent**, embeds_other: yes —
  agent shell with explicit reusable wf-tools.
- "A tutor that helps me learn Python over multiple sessions, remembering
  what we covered." -> **agent**, embeds_other: no — cross-session memory and
  chat interaction.
- "Summarize this product announcement and translate it into German." ->
  **workflow**, embeds_other: no — a single bounded AI transformation needs
  no orchestration or tool loop.
- "Help me handle my inbox." -> **clarify** — ask whether the user wants
  deterministic rules or autonomous, judgment-based triage.
- "What can you build?" -> **out-of-scope** — a meta question, not a build
  intent.

## Gotchas

- Do not label a request agent-anchored just because it is long, multi-step,
  or mentions AI.
- Do not label classify-then-route as agent-anchored unless the model
  repeatedly decides the next action after observing prior results.
- Do not force vague prompts into an anchor. Ask a clarifying question when
  the control flow cannot be inferred — but do not reach for clarify just
  because both anchors are defensible; use the growth tiebreaker instead.
- Do not treat "embeds other" as free with either anchor: only set it true
  when the request actually implies the other primitive appears inside
  (an open-ended sub-step needing agent reasoning, or an action explicitly
  meant to be a standalone reusable workflow).
- Inside an existing workflow or agent build, do not spawn a new primitive
  for a follow-up that fits inside the current one.
- Keep n8n framing clear: agents operate inside workflow guardrails; they do
  not replace the workflow engine.

## Output Format

For intent-only classification requests, return one block per independent
part (a single-part request needs only one block and may omit the `Part`
line):

```text
Part: "<short excerpt of the request this part covers>"
Anchor: workflow | agent | clarify | out-of-scope
Embeds other: yes | no | n/a
Rationale: <one or two sentences citing the deciding signals from this skill>
Clarifying questions: <bulleted questions — only when Anchor is clarify>
```

For build requests, do not expose this format unless the user asks for
classification. Instead, proceed according to the selected next step:
workflow-anchored → `workflow-builder` (whether or not it embeds an agent
node, and whether the AI step is a single bounded transformer or a plain AI
node); agent-anchored → an agent-oriented design (with wf-tools when
embeds_other is yes); clarify → `ask-user`; out-of-scope → answer directly.
