---
name: intent-recognition
description: >-
  Load before building any new kept workflow or Agent. Decides which to build,
  or what to ask first. Classifies automation requests with two decisions:
  anchor (which primitive owns top-level control flow — workflow-anchored,
  agent-anchored, needs-clarification, out-of-scope) and embeds_other (whether
  other primitive embedded inside — agent step in workflow, or workflow as
  agent tool). Must use whenever current turn requires choosing or
  reconsidering intent of automation request, incl. compound requests,
  independent automations introduced mid-build, one-off questions/reports
  needing external systems you cannot query directly, and requests needing
  clarification before anchor chosen. Explicit Agent request routes to
  agent-builder before workflow_builder_ask_user. Don't load for routine
  edits/extensions when conversation already targets workflow or Agent.
---
# Intent recognition

## Purpose

Use skill when automation request still needs classification before design/build, or when new turn may require reconsidering current artifact. Don't reload for routine edit/extension when conversation already targets workflow or Agent, unless user introduces independent automation or new request carries own anchor signal. Deciding question not single "workflow or agent" label — two questions: who owns top-level control flow, and does other primitive show up inside that flow.

If user asked to build, route on result: workflow-builder for workflow-anchored (bounded LLM step = AI node in graph; embedded agent = AI Agent step inside it), agent-oriented design for agent-anchored (tool-use loop), `workflow_builder_ask_user` for needs-clarification, or answer directly for out-of-scope.

## Inputs

- User's request or scenario prompt.
- Whether user mid-build on existing workflow or agent in this conversation — incremental requests default to extending that primitive.
- Whether editor/canvas context conversation opened from shows existing **agent** or existing **workflow** (or both). Existing agent in context that user asks to change = agent-anchored request — see Context continuity and Existing-agent modification.
- Any explicit constraints: determinism, auditability, latency, cost, compliance, reusability, allowed tools.
- If user didn't explicitly select Agent and request underspecified on anchor-deciding axis, ask for missing detail, don't guess. Explicit Agent request already decides anchor. Leave missing setup and implementation details to Agent Builder.

## Decisions

Two orthogonal decisions per request, or per part for compound requests:

**1. Anchor** — which primitive owns top-level control flow:

- **workflow-anchored**: outer shell is workflow graph. May include LLM steps as bounded transformers (classify, extract, summarize, score, single decision feeding fixed branches).
- **agent-anchored**: agent owns flow; LLM decides next step at runtime or owns ongoing role requiring judgment. n8n Agents not chat-only: besides chat sessions, run recurring objectives on cron schedule (**tasks**) and keep memory across sessions and runs — recurring or scheduled duties don't disqualify this anchor.
- **needs-clarification**: request under-specified on anchor-deciding axis.
- **out-of-scope**: not build intent. Covers meta/product questions (e.g. asking what assistant can build) and one-off content tasks with no trigger, no persistence, no reuse intent (summarize, translate, draft something once) — answer/do directly instead of building automation. Bucket applies only when you can actually do task directly: one-off question or report needing external systems you lack ad-hoc access to (private issue tracker, wiki, CRM) not out-of-scope — classify it; when answering requires judgment-driven navigation of those systems, agent-anchored (see Signals). Requests to operate on existing resources (running/triggering user's existing workflow, debugging failed execution, listing/managing workflows or agents, querying data) not classified by this skill — route through normal paths. Per system prompt's "Existing Resources" section, check `workflow_builder_workflows(action="list")` before reading "trigger my X" as build: workflow's own name can contain build verb ("X — Create"), and link to service you integrate with is input value, not request to build integration. Finally, one-off task with concrete external *effect* (export/copy data somewhere once, migration, backfill) is **workflow-anchored**, not out-of-scope — workflow just the vehicle. Classify by shape (bounded data already in hand, imperative ask, no trigger/schedule/reuse vocabulary) — users rarely say "one-off" explicitly. Load `one-off-operations` skill before building and pass `executionIntent: "one-off"` to `workflow_builder_build_workflow`; completion criterion then = live run with read-back instead of simulated verification.

**2. Embeds other** — whether other primitive appears inside anchor:

- workflow-anchored + `true`: agent embedded as workflow step (e.g. scheduled pipeline whose middle step is open-ended investigation).
- agent-anchored + `true`: workflows invoked as agent tools; see Agent tool shape to distinguish from direct tools.
- `n/a` for needs-clarification and out-of-scope.

**Migration from the old taxonomy**: old **hybrid** → workflow-anchored, `embeds_other: false`. Old **single AI task** → out-of-scope when one-off (do task directly); workflow-anchored with one LLM step only when user wants persistent, triggerable automation. Old **ambiguous** → needs-clarification. Old **workflow** and **agent** map directly to matching anchor value.

## Agent tool shape

After choosing agent-anchored design, decide per capability: direct agent tool or workflow tool:

- **Direct agent tools are the default.** One node-backed capability or multiple independent node tools stay on Agent build path with `embeds_other: false`.
- Use **workflow tool** only when one agent tool call must run ordered multi-node procedure, or user explicitly needs that workflow reusable, manually callable, or usable outside agent. Build workflow first, attach to Agent as workflow tool, set `embeds_other: true`.

Count nodes required inside one tool invocation, not total tools on agent. E.g. looking up and inserting Data Table rows = two direct node tools; atomic lookup-transform-write procedure = one workflow tool.

After choosing agent-anchored design, load `agent-builder` before first `agent_builder_*` call. It owns targeting, prerequisite creation, Agent build.

## Decision Steps

0. If user mid-build on existing workflow or agent, apply context continuity (see Signals) first — incremental request normally extends current primitive.
1. **Explicit artifact requests.** "Build me an Agent/assistant that…" selects Agent artifact and decides anchor. Don't ask user to reconsider during intent recognition. Don't silently substitute workflow, even if it could implement same behavior. May explain simpler workflow alternative, but switch only after user chooses it. Route missing setup and implementation choices to Agent Builder. Immediate next routing action: load `agent-builder`. Don't call `workflow_builder_ask_user` between classification and that handoff. Forward request without selecting services, tools, topics, schedules, or other implementation details. Agent Builder owns those questions. Explicit workflow request selects workflow, unless it fits row in Close pairs. Then word "workflow" or named workflow nodes don't settle choice: ask that row's question before building either. False-friends rule applies to task descriptions, not explicit Agent request.
2. If request not build intent — meta/product question, or one-off content task with no trigger or reuse — classify **out-of-scope** and answer/do directly.
3. Split request into parts only if it contains multiple independent automations with separate lifecycles (unrelated triggers, audiences, cadences). Markers like numbering or "and separately" are giveaway but not required — single plain sentence can contain two automations. Don't split single automation that merely enumerates many tools or steps. Run steps 4-9 on each part.
4. Test agent signals. If any one holds, classify **agent-anchored**.
5. Before selecting workflow, verify request supplies or clearly entails every workflow condition. Don't invent fixed sequence, decision policy, or bounded LLM task from generic outcome. If missing anchor-defining detail could make work judgment-driven, classify **needs-clarification** and ask only for that detail.
6. Otherwise, test workflow conditions. If all hold, classify **workflow-anchored**.
7. Decide `embeds_other` both directions: agent step inside this workflow, or this agent invokes workflows as tools?
8. **Degenerate-shell check.** If workflow-anchored design reduces to trigger plus single open-ended agent step doing all work — no deterministic steps earning shell — anchor wrong: reclassify **agent-anchored** and build n8n Agent (on-demand duty → agent's chat use; scheduled duty → task on agent). Re-run check while building: when fixed nodes prove unusable and work migrates into one embedded agent step, stop and re-anchor instead of finishing degenerate workflow.
9. If both anchors genuinely defensible, apply growth tiebreaker: prefer primitive scaling with likely complexity growth — usually agent-anchored when novel situations, longer horizons, or learning implied. Tiebreaker only for genuine ties: when bounded workflow reading fully satisfies request, prefer it. If real toss-up, say so and name both readings instead of feigning certainty. Workflow preference applies to task-shaped requests; never overrides explicitly requested agent artifact (step 1).

## Close pairs

Some artifacts look alike. Each row names pair, signal that request fits both, and one question telling them apart. When user names one side and signal fits other side too, ask row's question with `workflow_builder_ask_user`, then build what user picks. Don't build either side first. Explicit Agent request doesn't use this table (step 1). New artifact type adds row here.

| Pair | The request fits both when | Question |
| --- | --- | --- |
| Agent, or a workflow with a Chat Trigger or AI Agent node | People send it messages over time (a chat window, DMs, a messaging channel), and each reply needs judgment, memory of the person, or actions on their behalf. | Should it hold a conversation with each person and decide its replies, or run the same fixed steps on every message? |

## Signals

**Agent-anchored** (any one is enough):

- Reasoning dominates flow: investigate, decide, act, iterate.
- Persistent delegated role: user gives analyst, coordinator, receptionist, researcher, or similar role continuing responsibility for changing domain. Role must require judgment: choosing what matters, selecting tools, following up, adapting actions. Role noun alone not enough.
- On-demand question or report requiring judgment-driven navigation of external systems (which items matter, how they map to goals) that can't be answered directly with your own tools — user effectively already chatting with automation they need. Artifact = agent with those tools, askable again anytime, not manually triggered workflow.
- Multi-session or long-running: coordination across days, tracked open threads, daily check-ins.
- Proactive or recurring on its own: wakes on heartbeat or scheduled task, checks state, decides what to do each run. Per-run judgment is signal, not cadence — schedule alone anchor-neutral (see Scheduled judgment work).
- Self-improving or skill accretion first-class: learns from feedback over time, improves at task.
- Chat or session-based interaction. Workflow with Chat Trigger not substitute — signal holds unless chat merely triggers fixed pipeline (see Gotchas).
- Cross-session memory.

**Workflow-anchored** (all must hold):

- Structure is graph of enumerable steps.
- Any LLM use is bounded transformer: fixed-label classify, extract, summarize, or single decision.
- Trigger and actions deterministic. Cron schedule satisfies this but never decides anchor alone — agents run scheduled tasks too; body of each run must be deterministic.
- Reproducibility or auditability served by same graph running every time.

**Scheduled judgment work** (recurring cadence + open-ended body): both primitives can own it — workflow shell with embedded agent step, or agent with scheduled task. Default to Agent task when open-ended duty is whole outcome and workflow shell would only trigger duty and deliver result. Use workflow shell when its deterministic collection, gating, transformation, branching, or delivery steps independently meaningful and agent owns only one bounded stage. Choose Agent when duty belongs to persistent role, needs memory across runs, supports user interaction, or has other duties. Explicit Agent request remains binding. Recurring duty added to agent mid-build always task on that agent, never spawned workflow.

**Embeds-other signals**:

- Workflow with embedded agent: step in otherwise fixed pipeline is open-ended ("figure out why", "investigate", "decide what to do about it") while trigger and surrounding steps stay deterministic.
- Embedding often implicit — request never says "agent". Ask of each step: could fixed-instruction transform do it (enumerable labels, one bounded rewrite), or does doing it well require gathering and weighing per-item context, then producing judgment? Nightly job drafting tailored renewal pitch per account from usage history embeds agent; nightly job condensing each ticket into two-sentence summary doesn't.
- For agent with workflow tools, apply Agent tool shape.

**Context continuity** (step 0): inside workflow build, request to insert scoring step stays bounded LLM step, not new agent. Inside agent build, request to post update on completion = new tool on that agent, not spawned workflow — and recurring duty ("also send me a Monday summary") = scheduled task on that agent, not new scheduled workflow. Only cross into other primitive when incremental request carries own anchor signal — even then, prefer asking before switching paradigm if not clearly load-bearing.

**Existing-agent modification**: context continuity extends to agent user didn't build in this conversation but opened in editor. When editor/canvas context shows existing agent and user asks to change, add, or remove its configuration or capabilities (instructions, model, tools, skills, tasks, channels, memory, sub-agents), classify **agent-anchored** and build that agent with `agent-builder` skill. Don't route to `workflow-builder`, don't treat as workflow change even when workflow also in context, unless user explicitly names workflow as target. Capability agent can't have is still agent-anchored — handle per Unsupported capabilities below, don't reclassify as workflow.

**Mixed agent + workflow context**: when both agent and workflow in context and request ambiguous about which to change, classify **needs-clarification** and ask which target — don't assume workflow. Once user names target, follow context continuity for that primitive.

**Unsupported capabilities**: when user names specific channel or capability for agent (e.g. "Instagram", "Messenger"), call `agent-context` with `type: "capabilities"` before classifying. If named channel absent, not native agent channel. Don't classify as workflow substitute, don't add platform as agent tool, don't claim channel configurable. Explain limitation, then offer agent behind `agent-entrypoint` bridge workflow (platform trigger sends each message to Message an Agent, as agent-builder describes) or supported channel tool returned (with its `capabilities`). Build standalone workflow only if user asks. Agent-anchored request, not workflow-anchored.

**Clarify triggers**: rule-based vs judgment-based (what defines "important" or "urgent"?), scope/autonomy (act alone vs draft for review), interaction mode (one-shot vs chat). Clarify when missing answer changes anchor. When request supplies enough evidence and both designs remain valid, apply growth tiebreaker instead of asking theoretical preference. Until anchor chosen, word question plainly: ask about result, once now vs on repeat, and whether people chat with it. Don't call it workflow or Agent, don't ask about triggers, nodes, or steps.

**False friends — not signals by themselves**:

- Surface vocabulary: "agent", "assistant", "bot", "workflow", "automate" in *task description* carries no weight — classify shape, not words. Persistent delegated role combines role with ongoing judgment, so real Agent signal. Explicit artifact request ("build me an agent that…") binding; see Decision Step 1.
- Step count and tool count: long linear pipelines and high tool counts not agentic. Seven deterministic steps, zero branches = still workflow.

## Examples

- "Every day at 6pm, pull today's Shopify order count and post it to a Discord channel." -> **workflow-anchored**, `embeds_other: false`: fixed schedule, source, destination.
- "When a new Jira issue is created, classify it as bug/feature/question and route it to the matching Discord channel." -> **workflow-anchored**, `embeds_other: false`: bounded classification feeding fixed routing (**hybrid** under old taxonomy).
- "Every night, gather the day's failed background jobs, dig into the logs and recent deploys to work out why each one failed, and post a write-up to a Notion page." -> **workflow-anchored**, `embeds_other: true`: schedule and destination fixed; "work out why" open-ended investigation, best as embedded agent step.
- "Give me a chat window where I can ask about our expense-reporting rules and get answers pulled from the finance handbook." -> **agent-anchored**, `embeds_other: false`: chat interaction, LLM decides what to look up each turn.
- "Build an ops agent that can check server health, restart services via our runbook, and file a Jira ticket if it can't resolve things — the restart and ticket-filing should also be triggerable manually elsewhere." -> **agent-anchored**, `embeds_other: true`: explicitly reusable actions = workflows agent calls as tools.
- "Have an agent keep an eye on our AWS spend throughout the day and flag me before we blow through budget, without me asking it to check." -> **agent-anchored**, `embeds_other: false`: proactive, heartbeat-driven, no fixed check schedule.
- "Build an agent that drafts replies to Notion comment threads and sharpens its sense of our tone the more we correct it." -> **agent-anchored**, `embeds_other: false`: skill accretion from feedback first-class.
- "Put an agent in charge of coordinating our office relocation — track vendors, follow up with each team lead, and send reminders through our existing reminder workflow when a task stalls." -> **agent-anchored**, `embeds_other: true`: long-running coordination invoking workflow tool.
- "Every night, fetch the day's new GitHub stars and send me a digest." -> **workflow-anchored**, `embeds_other: false`: fixed schedule, source, transform, delivery; no Agent artifact or judgment requirement.
- "Build me an agent that fetches new GitHub stars each night and sends me a digest." -> **agent-anchored**, `embeds_other: false`: user selected Agent; recurring duty = scheduled task on it. Workflow can be offered as alternative, can't silently replace requested artifact.
- "Set up a daily market analyst. It should research market changes, decide which developments matter, and send me a briefing each morning." -> **agent-anchored**, `embeds_other: false`: analyst owns persistent, judgment-driven role; morning cadence = task on that Agent.
- "Spin up a lightweight workflow that talks to shoppers on our storefront and handles their product questions." -> **needs-clarification**: user named workflow, but shoppers chat with it, so fits first Close pairs row. Ask that row's question before building either.
- "Build me an agent that answers customer questions from our docs." -> **agent-anchored**, `embeds_other: false`: explicit agent artifact request plus chat-shaped open-ended Q&A. Deliverable = n8n Agent — not workflow with Chat Trigger and AI Agent node.
- "Give me a chat box where I paste a company name and it runs our enrichment steps and replies with the result." -> **workflow-anchored**, `embeds_other: false`: chat merely manual trigger for fixed graph — only case where Chat Trigger workflow is right build.
- "Post every new Airtable record to a Discord channel, and separately set up an agent that handles customer refund requests end-to-end." -> two parts, joined only by topic, not data or trigger: "Airtable-to-Discord posting" (**workflow-anchored**, `embeds_other: false`) and "refund-handling agent" (**agent-anchored**, `embeds_other: true`).
- "Transcribe my sales calls and chase the deals that go quiet." -> two parts despite plain single sentence: transcription = bounded per-call pipeline (**workflow-anchored**, `embeds_other: false`); chasing stalled deals = ongoing judgment-driven automation with own lifecycle (**agent-anchored**).
- "Set up a research helper capable of searching the web, querying our internal wiki, pulling numbers from Google Analytics, and drafting a slide deck that summarizes the findings." -> one part, **agent-anchored**, `embeds_other: true`: many tools, one lifecycle — don't split on tool count.
- "Tell me how the platform team is progressing against their cycle goals — current status is in our issue tracker, the goals are on our internal wiki." -> **agent-anchored**, `embeds_other: false`: on-demand judgment report over external systems you can't query directly. Artifact = agent with tracker and wiki tools user can ask again anytime — not manual-trigger workflow whose only real step is embedded agent with same tools. If user later wants it every Friday, becomes scheduled task on same agent, not conversion to workflow.
- "Tell me when something important happens with our shipments." -> **needs-clarification**: "important" undefined; ask whether concrete rules exist or this needs judgment-based triage.
- "Ingest each cybersecurity alert, analyze it, and take actions depending on the finding." -> **needs-clarification**: ask whether fixed rules select actions or investigator must choose and adapt them.
- "Build me an agent that triages our customers' Instagram messages." -> **agent-anchored** (explicit agent artifact + chat interaction), but call `agent-context` with `type: "capabilities"` first: Instagram absent, so not native agent channel. Ask whether to connect agent to Instagram through `agent-entrypoint` bridge workflow or use supported chat channel tool returned. Don't build standalone Instagram workflow instead, don't claim channel configured.
- (An existing agent is open in the editor.) "Make it also file a Linear ticket when it can't resolve an issue." -> **agent-anchored**: open agent is target; build that agent with `agent-builder` skill to add capability. Don't start workflow build, even though workflow could also file ticket — user asked to change agent.
- (Both an agent and a workflow are open.) "Add a daily summary of new signups to the data warehouse." -> **needs-clarification**: ask whether summary belongs to agent (scheduled task on it) or workflow (new branch in graph); don't assume workflow.

## Gotchas

- Don't label request agent-anchored just because long, multi-step, or mentions AI.
- Don't label classify-then-route agent-anchored unless model repeatedly decides next action after observing prior results.
- Don't force vague prompts into anchor; ask when anchor-deciding axis missing.
- Never default `embeds_other` to `false` without checking both directions: agent step hiding inside workflow, and workflow acting as agent's tool.
- Never split compound request on tool or step enumeration alone — split only on separate lifecycles.
- Unnecessary agency adds latency, cost, compounding error risk — don't reach for agent when bounded workflow fully satisfies task-shaped request. Not license to override explicit agent request.
- Unnecessary workflow shells hide Agent intent. Don't wrap open-ended delegated duty in workflow when shell only supplies schedule and destination.
- Never satisfy **agent-anchored** classification with workflow containing Chat Trigger + AI Agent node. Agent-anchored requests produce n8n Agent artifact via agent build path; AI Agent *node* exists only for `embeds_other: true` steps inside genuinely workflow-anchored pipeline. Chat Trigger workflow correct only when chat merely manual trigger for fixed graph.
- Never improvise workflow substitute for unsupported agent channel or capability. When user names channel not returned by `agent-context`, explain limitation and offer supported alternatives — don't add workflow nodes faking channel or silently translate request into workflow change.
- Don't demote explicitly requested agent to embedded AI Agent step inside workflow — workflow-anchored with `embeds_other: true` is for agent steps inside pipeline user described as pipeline.
- Workflow whose only real step is one embedded agent doing all work = agent wearing workflow costume — mirror of Chat Trigger gotcha above. Apply degenerate-shell check (step 8) and re-anchor instead of shipping trigger + AI Agent node.
- Don't treat cron schedule as workflow signal alone — agents run scheduled tasks. Classify by body of each run; when one-off question can't be answered directly, don't fall back to "build a workflow or do it yourself": agent with right tools usually the missing option.
- Don't use agent when progress can't be verified: if path can't be scripted and result can't be checked, design not ready.
- Respect current build context: incremental request stays on active primitive unless it carries own anchor signal.
- Keep n8n framing clear: agents operate inside workflow guardrails; don't replace workflow engine.

## Output Format

Return concise classification and reason:

```text
Anchor: workflow-anchored | agent-anchored | needs-clarification | out-of-scope
Embeds other: true | false | n/a
Reason: <one or two sentences citing the deciding signals>
Next step: <build workflow / build workflow with embedded agent step / build n8n Agent artifact (agent build path; recurring duties as scheduled tasks on the agent) / ask clarification / answer directly>
```

For build requests, don't expose this format unless user asks for classification. Instead, proceed per selected next step. When user asks for classification in specific format, e.g. JSON block, follow that format and map vocabulary accordingly (workflow-anchored, agent-anchored, needs-clarification, out-of-scope, and equivalents). For compound requests, output one classification block per part.