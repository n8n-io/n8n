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
  agent, one-off questions or reports that need external systems you cannot
  query directly, and requests that need clarification before an anchor can
  be chosen, before choosing workflow-builder, planning, or an agent-oriented
  design.
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
agent-anchored (a tool-use loop), `ask-user` for needs-clarification, or answer
directly for out-of-scope.

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
  at runtime. n8n Agents are not chat-only: besides chat sessions, they run
  recurring objectives on a cron schedule (**tasks**) and keep memory across
  sessions and runs — so recurring or scheduled duties do not disqualify this
  anchor.
- **needs-clarification**: the request is under-specified on an
  anchor-deciding axis.
- **out-of-scope**: not a build intent at all. Covers meta or product
  questions (e.g. asking what the assistant is capable of building) and
  one-off content tasks with no trigger, no persistence, and no reuse intent
  (summarize, translate, or draft something once) — answer or do these
  directly instead of building an automation. This bucket only applies when
  you can actually do the task directly: a one-off question or report that
  needs external systems you have no ad-hoc access to (a private issue
  tracker, wiki, or CRM) is not out-of-scope — classify it, and when
  answering requires judgment-driven navigation of those systems it is
  agent-anchored (see Signals). Requests to operate on existing resources
  (debugging a failed execution, listing or managing workflows or agents,
  querying data) are not classified by this skill at all — route them
  through their normal paths.

**2. Embeds other** — whether the other primitive appears inside the anchor:

- workflow-anchored + `true`: an agent embedded as a workflow step (e.g. a
  scheduled pipeline whose middle step is open-ended investigation).
- agent-anchored + `true`: workflows invoked as tools of the agent; see Adding
  tools to an agent to distinguish them from direct tools.
- `n/a` for needs-clarification and out-of-scope.

**Migration from the old taxonomy**: old **hybrid** → workflow-anchored,
`embeds_other: false`. Old **single AI task** → out-of-scope when it is a
one-off request (do the task directly); workflow-anchored with one LLM step
only when the user wants a persistent, triggerable automation. Old
**ambiguous** → needs-clarification. Old **workflow** and **agent** map
directly onto the matching anchor value.

## Adding tools to an agent

After choosing an agent-anchored design, decide whether each capability should
be a direct agent tool or a workflow tool:

- **Direct agent tools are the default.** Forward requests to add capabilities
  to `build-agent` near-verbatim so the delegated builder can choose MCP,
  node-backed, provider, or custom tools. One node-backed capability or
  multiple independent node tools stay on the agent build path with
  `embeds_other: false`.
- Use a **workflow tool** only when one agent tool call must run an ordered
  multi-node procedure, or when the user explicitly needs that workflow
  reusable, manually callable, or usable outside the agent. Build the workflow
  first, pass it to `build-agent` via `workflowContext`, and set
  `embeds_other: true`.

Count the nodes required inside one tool invocation, not the total number of
tools on the agent. For example, looking up and inserting Data Table rows are
two direct node tools; an atomic lookup-transform-write procedure is one
workflow tool.

## Decision Steps

0. If the user is mid-build on an existing workflow or agent, apply context
   continuity (see Signals) before anything else — an incremental request
   normally extends the current primitive.
1. **Explicit artifact requests.** When the user names the deliverable —
   "build me an agent/assistant that…", "create a workflow that…" — the
   named primitive is a routing instruction, not surface vocabulary.
   Classify by it unless the described behavior is unambiguously the other
   primitive's shape (e.g. "an agent" whose behavior is a fixed
   schedule-fetch-notify pipeline). Even then, never switch silently:
   propose the reclassified design and say you are deviating from the named
   primitive, grounding the choice in the task's shape. The false-friends
   rule applies to task descriptions, not to an explicitly requested
   artifact.
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
5. Otherwise, test the workflow conditions. If all of them hold, classify
   **workflow-anchored**.
6. Decide `embeds_other` in both directions: does an agent step appear inside
   this workflow, or does this agent invoke workflows as tools?
7. **Degenerate-shell check.** If a workflow-anchored design reduces to a
   trigger plus a single open-ended agent step that does all the work — no
   deterministic steps earning the shell — the anchor is wrong: reclassify
   **agent-anchored** and build an n8n Agent (an on-demand duty becomes the
   agent's chat use; a scheduled duty becomes a task on the agent). Re-run
   this check while building: when fixed nodes prove unusable and the work
   migrates into one embedded agent step, stop and re-anchor instead of
   finishing the degenerate workflow.
8. If the request is under-specified on an anchor-deciding axis (rule-based
   vs judgment-based, scope/autonomy, interaction mode), classify
   **needs-clarification** and name the missing axis instead of guessing.
9. If both anchors are genuinely defensible, apply the growth tiebreaker:
   prefer whichever primitive scales with likely complexity growth — usually
   agent-anchored when novel situations, longer horizons, or learning are
   implied. The tiebreaker applies only to genuine ties: when a bounded
   workflow reading fully satisfies the request, prefer it. If it is a real
   toss-up, say so and name both readings instead of feigning certainty.
   The workflow preference applies to task-shaped requests; it never
   overrides an explicitly requested agent artifact (step 1).

## Signals

**Agent-anchored** (any one is enough):

- Reasoning dominates the flow: investigate, decide, act, iterate.
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
agent with a scheduled task. Default to the workflow shell for a standalone,
single-duty job: a deterministic trigger and delivery around one open-ended
step keeps auditability and avoids unnecessary agency. Choose an agent with a
task instead when the duty belongs to an agent the user also interacts with
or that has other duties, when it needs memory across runs (tracking open
threads, "what did I flag last time"), or when the user explicitly asked for
an agent. A recurring duty added to an agent mid-build is always a task on
that agent, never a spawned workflow.

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
- For an agent with workflow tools, apply Adding tools to an agent.

**Context continuity** (step 0): inside a workflow build, a request to insert
a scoring step stays a bounded LLM step, not a new agent. Inside an agent
build, a request to post an update on completion is a new tool on that
agent, not a spawned workflow — and a recurring duty ("also send me a Monday
summary") is a scheduled task on that agent, not a new scheduled workflow.
Only cross into the other primitive when the
incremental request itself carries its own anchor signal — and even then,
prefer asking before switching paradigm if it isn't clearly load-bearing.

**Clarify triggers**: rule-based vs judgment-based (what defines "important"
or "urgent"?), scope/autonomy (act on its own vs draft for review),
interaction mode (one-shot vs chat). Do not clarify when the criterion could
defensibly go either way — that is a genuine tie, name both readings
instead.

**False friends — not signals**:

- Surface vocabulary: "agent", "assistant", "bot", "workflow", "automate"
  in a *task description* carry no weight — classify the shape, not the
  words. An explicit artifact request ("build me an agent that…") is not a
  false friend; see Decision Step 1.
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
  despite the word "agent" — a false friend. When the user instead
  explicitly asks to *build an agent* around a fixed pipeline like this,
  keep the workflow classification but say so rather than switching
  silently (step 1).
- "Spin up a lightweight workflow that talks to shoppers on our storefront
  and handles their product questions." -> **agent-anchored**: chat-based
  Q&A means the LLM owns turn-by-turn control despite the word "workflow" —
  a false friend in the other direction.
- "Build me an agent that answers customer questions from our docs." ->
  **agent-anchored**, `embeds_other: false`: explicit agent artifact
  request plus chat-shaped open-ended Q&A. The deliverable is an n8n Agent
  — not a workflow with a Chat Trigger and an AI Agent node.
- "Give me a chat box where I paste a company name and it runs our
  enrichment steps and replies with the result." -> **workflow-anchored**,
  `embeds_other: false`: chat is merely the manual trigger for a fixed
  graph — the one case where a Chat Trigger workflow is the right build.
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
- "Tell me how the platform team is progressing against their cycle goals —
  current status is in our issue tracker, the goals are on our internal
  wiki." -> **agent-anchored**, `embeds_other: false`: an on-demand judgment
  report over external systems you cannot query directly. The artifact is an
  agent with tracker and wiki tools the user can ask again anytime — not a
  manual-trigger workflow whose only real step is an embedded agent with
  those same tools. If the user later wants it every Friday, that becomes a
  scheduled task on the same agent, not a conversion to a workflow.
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
  reach for an agent when a bounded workflow fully satisfies a task-shaped
  request. This is not a license to override an explicit agent request.
- Never satisfy an **agent-anchored** classification with a workflow
  containing a Chat Trigger + AI Agent node. Agent-anchored requests
  produce an n8n Agent artifact via the agent build path; the AI Agent
  *node* exists only for `embeds_other: true` steps inside a genuinely
  workflow-anchored pipeline. A Chat Trigger workflow is correct only when
  chat is merely the manual trigger for a fixed graph.
- Do not demote an explicitly requested agent to an embedded AI Agent step
  inside a workflow — workflow-anchored with `embeds_other: true` is for
  agent steps inside a pipeline the user described as a pipeline.
- A workflow whose only real step is one embedded agent doing all the work
  is an agent wearing a workflow costume — the mirror image of the Chat
  Trigger gotcha above. Apply the degenerate-shell check (step 7) and
  re-anchor instead of shipping trigger + AI Agent node.
- Do not treat a cron schedule as a workflow signal by itself — agents run
  scheduled tasks. Classify by the body of each run, and when a one-off
  question can't be answered directly, do not fall back to "build a workflow
  or do it yourself": an agent with the right tools is usually the missing
  option.
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
