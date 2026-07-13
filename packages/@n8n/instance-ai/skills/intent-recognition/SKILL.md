---
name: intent-recognition
description: >-
  Classifies automation requests using two decisions: anchor (which primitive
  owns the top-level control flow — workflow-anchored, agent-anchored,
  needs-clarification, or out-of-scope) and embeds_other (whether the other
  primitive appears embedded inside — an agent step inside a workflow, or a
  workflow invoked as an agent tool). Must be used before deciding the intent
  of any automation request, including compound requests with multiple
  independent automations, mid-build extensions to an existing workflow or
  agent, and requests that need clarification before an anchor can be chosen,
  before choosing workflow-builder, planning, or an agent-oriented design.
---

# Intent recognition

## Purpose

Use this skill to classify an automation request before designing or building
it. This skill must be used before deciding whether a request is
workflow-anchored, agent-anchored, needs clarification, or out of scope, and
before deciding whether the other primitive is embedded inside it. The
deciding question is not a single "workflow or agent" label — it is two
questions: who owns the top-level control flow, and does the other primitive
show up inside that flow.

If the user asked to build, route on the result: workflow-builder for
workflow-anchored (a bounded LLM step is an AI node in the graph; an embedded
agent is an AI Agent step inside it), an agent-oriented design for
agent-anchored (a tool-use loop; build reusable actions as workflows the
agent invokes), `ask-user` for needs-clarification, or answer directly for
out-of-scope.

## Inputs

- The user's request or scenario prompt.
- Whether the user is mid-build on an existing workflow or agent in this
  conversation — incremental requests default to extending that primitive.
- Any explicit constraints about determinism, auditability, latency, cost,
  compliance, reusability, or allowed tools.
- If the request is underspecified on an anchor-deciding axis, ask for the
  missing detail instead of guessing.

## Decisions

Two orthogonal decisions per request, or per part for compound requests:

**1. Anchor** — which primitive owns the top-level control flow:

- **workflow-anchored**: the outer shell is a workflow graph. May include LLM
  steps as bounded transformers (classify, extract, summarize, score, a
  single decision feeding fixed branches).
- **agent-anchored**: an agent owns the flow; the LLM decides the next step
  at runtime.
- **needs-clarification**: the request is under-specified on an
  anchor-deciding axis.
- **out-of-scope**: not a build intent at all. Covers meta or product
  questions (e.g. asking what the assistant is capable of building) and
  one-off content tasks with no trigger, no persistence, and no reuse intent
  (summarize, translate, or draft something once) — answer or do these
  directly instead of building an automation. Requests to operate on
  existing resources (debugging a failed execution, listing or managing
  workflows, querying data) are not classified by this skill at all — route
  them through their normal paths.

**2. Embeds other** — whether the other primitive appears inside the anchor:

- workflow-anchored + `true`: an agent embedded as a workflow step (e.g. a
  scheduled pipeline whose middle step is open-ended investigation).
- agent-anchored + `true`: workflows invoked as tools of the agent —
  especially when the user wants reusable or manually-triggerable actions, or
  an action is itself a deterministic multi-step procedure.
- `n/a` for needs-clarification and out-of-scope.

**Migration from the old taxonomy**: old **hybrid** → workflow-anchored,
`embeds_other: false`. Old **single AI task** → out-of-scope when it is a
one-off request (do the task directly); workflow-anchored with one LLM step
only when the user wants a persistent, triggerable automation. Old
**ambiguous** → needs-clarification. Old **workflow** and **agent** map
directly onto the matching anchor value.

## Decision Steps

0. If the user is mid-build on an existing workflow or agent, apply context
   continuity (see Signals) before anything else — an incremental request
   normally extends the current primitive.
1. If the request is not a build intent — a meta or product question, or a
   one-off content task with no trigger or reuse — classify **out-of-scope**
   and answer or do it directly.
2. Split the request into parts only if it contains multiple independent
   automations with separate lifecycles (unrelated triggers, audiences, or
   cadences). Markers like numbering or "and separately" are a giveaway but
   are not required — a single plain sentence can contain two automations.
   Do not split a single automation that merely enumerates many tools or
   steps. Run steps 3-7 on each part.
3. Test the agent signals. If any one holds, classify **agent-anchored**.
4. Otherwise, test the workflow conditions. If all of them hold, classify
   **workflow-anchored**.
5. Decide `embeds_other` in both directions: does an agent step appear inside
   this workflow, or does this agent invoke workflows as tools?
6. If the request is under-specified on an anchor-deciding axis (rule-based
   vs judgment-based, scope/autonomy, interaction mode), classify
   **needs-clarification** and name the missing axis instead of guessing.
7. If both anchors are genuinely defensible, apply the growth tiebreaker:
   prefer whichever primitive scales with likely complexity growth — usually
   agent-anchored when novel situations, longer horizons, or learning are
   implied. The tiebreaker applies only to genuine ties: when a bounded
   workflow reading fully satisfies the request, prefer it. If it is a real
   toss-up, say so and name both readings instead of feigning certainty.

## Signals

**Agent-anchored** (any one is enough):

- Reasoning dominates the flow: investigate, decide, act, iterate.
- Multi-session or long-running: coordination across days, tracked open
  threads, daily check-ins.
- Proactive or heartbeat-driven: wakes on its own, checks state, decides
  whether to intervene.
- Self-improving or skill accretion is first-class: learns from feedback
  over time, gets better at the task.
- Chat or session-based interaction.
- Cross-session memory.

**Workflow-anchored** (all must hold):

- Structure is a graph of enumerable steps.
- Any LLM use is a bounded transformer: fixed-label classify, extract,
  summarize, or a single decision.
- Trigger and actions are deterministic.
- Reproducibility or auditability is served by the same graph running every
  time.

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
- Agent with workflow tools: the user asks for actions that should also be
  reusable, callable manually, or run outside the agent; or an action the
  agent invokes is itself a deterministic multi-step procedure.

**Context continuity** (step 0): inside a workflow build, a request to insert
a scoring step stays a bounded LLM step, not a new agent. Inside an agent
build, a request to post an update on completion is a new tool on that
agent, not a spawned workflow. Only cross into the other primitive when the
incremental request itself carries its own anchor signal — and even then,
prefer asking before switching paradigm if it isn't clearly load-bearing.

**Clarify triggers**: rule-based vs judgment-based (what defines "important"
or "urgent"?), scope/autonomy (act on its own vs draft for review),
interaction mode (one-shot vs chat). Do not clarify when the criterion could
defensibly go either way — that is a genuine tie, name both readings
instead.

**False friends — not signals**:

- Surface vocabulary: "agent", "assistant", "bot", "workflow", "automate" in
  the request text carry no weight. Classify the shape, not the words.
- Step count and tool count: long linear pipelines and high tool counts are
  not agentic. Seven deterministic steps with zero branches is still a
  workflow.

## Examples

- "Every day at 6pm, pull today's Shopify order count and post it to a
  Discord channel." -> **workflow-anchored**, `embeds_other: false`: fixed
  schedule, source, and destination.
- "When a new Jira issue is created, classify it as bug/feature/question and
  route it to the matching Discord channel." -> **workflow-anchored**,
  `embeds_other: false`: bounded classification feeding fixed routing (would
  have been **hybrid** under the old taxonomy).
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
- "Build an agent that drafts replies to Notion comment threads and sharpens
  its sense of our tone the more we correct it." -> **agent-anchored**,
  `embeds_other: false`: skill accretion from feedback is first-class.
- "Put an agent in charge of coordinating our office relocation — track
  vendors, follow up with each team lead, and send reminders through our
  existing reminder workflow when a task stalls." -> **agent-anchored**,
  `embeds_other: true`: long-running coordination invoking a workflow tool.
- "Configure an AI agent to send me a nightly digest of new GitHub stars."
  -> **workflow-anchored**, `embeds_other: false`: fixed schedule and action
  despite the word "agent" — a false friend.
- "Spin up a lightweight workflow that talks to shoppers on our storefront
  and handles their product questions." -> **agent-anchored**: chat-based
  Q&A means the LLM owns turn-by-turn control despite the word "workflow" —
  a false friend in the other direction.
- "Post every new Airtable record to a Discord channel, and separately set up
  an agent that handles customer refund requests end-to-end." -> two parts,
  joined only by topic, not data or trigger: "Airtable-to-Discord posting"
  (**workflow-anchored**, `embeds_other: false`) and "refund-handling agent"
  (**agent-anchored**, `embeds_other: true`).
- "Transcribe my sales calls and chase the deals that go quiet." -> two
  parts despite the plain single sentence: transcription is a bounded
  per-call pipeline (**workflow-anchored**, `embeds_other: false`), while
  chasing stalled deals is an ongoing judgment-driven automation with its
  own lifecycle (**agent-anchored**).
- "Set up a research helper capable of searching the web, querying our
  internal wiki, pulling numbers from Google Analytics, and drafting a slide
  deck that summarizes the findings." -> one part, **agent-anchored**,
  `embeds_other: true`: many tools but one lifecycle — do not split on tool
  count.
- "Tell me when something important happens with our shipments." ->
  **needs-clarification**: "important" is undefined; ask whether concrete
  rules exist or this needs judgment-based triage.

## Gotchas

- Do not label a request agent-anchored just because it is long, multi-step,
  or mentions AI.
- Do not label classify-then-route as agent-anchored unless the model
  repeatedly decides the next action after observing prior results.
- Do not force vague prompts into an anchor; ask when an anchor-deciding
  axis is missing.
- Never default `embeds_other` to `false` without checking both directions:
  an agent step hiding inside a workflow, and a workflow acting as an
  agent's tool.
- Never split a compound request on tool or step enumeration alone — split
  only on separate lifecycles.
- Unnecessary agency adds latency, cost, and compounding error risk — do not
  reach for an agent when a bounded workflow fully satisfies the request.
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
Next step: <build workflow / build workflow with embedded agent step / design agent (workflows as tools where actions should be reusable) / ask clarification / answer directly>
```

For build requests, do not expose this format unless the user asks for
classification. Instead, proceed according to the selected next step. When
the user asks for classification in a specific format, such as a JSON block,
follow that format and map the vocabulary accordingly (workflow-anchored,
agent-anchored, needs-clarification, out-of-scope, and their equivalents).
For compound requests, output one classification block per part.
