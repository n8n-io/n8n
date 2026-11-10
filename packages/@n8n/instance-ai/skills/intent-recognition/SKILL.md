---
name: intent-recognition
description: >-
  Load before you build any new kept workflow or Agent, to choose which one to
  build or what to ask first. Load it again when a request mid-build adds an
  independent automation or carries its own anchor signal, and for one-off
  questions that need external systems you cannot query directly. An explicit
  Agent request routes to agent-builder before ask_user. Do not load it for
  routine edits or extensions of the workflow or Agent the conversation
  already targets, or to run or manage existing resources.
policy:
  lifetime: turn
---

# Intent recognition

Make two decisions for each request, or for each part of a compound request,
then route on them.

**1. Anchor**: which primitive owns the top-level control flow.

- **workflow-anchored**: a graph of fixed steps. LLM steps are bounded
  transformers (classify, extract, summarize, one decision that feeds fixed
  branches).
- **agent-anchored**: the LLM chooses the next step at run time, or owns an
  ongoing role that needs judgment. n8n Agents also run scheduled **tasks** and
  keep memory across sessions, so a recurring duty can be an Agent.
- **needs-clarification**: a detail that decides the anchor is missing.
- **out-of-scope**: not a build. Meta or product questions, and one-time tasks
  you can do directly. Requests to run, debug, list or manage existing
  workflows, agents or data use their normal paths, not this skill.

**2. Embeds other**: does the other primitive appear inside the anchor?

- workflow + `true`: one step of a fixed pipeline is open-ended (an AI Agent
  step). The request often does not say "agent": ask whether a
  fixed-instruction transform can do the step, or whether it must gather and
  weigh context that differs per item.
- agent + `true`: the agent calls workflows as tools. Direct node tools are the
  default; a workflow tool is for one call that runs an ordered multi-node
  procedure, or that the user wants reusable outside the agent.
- `n/a` for needs-clarification and out-of-scope.

## Decision steps

0. **Context continuity.** Mid-build, an incremental request extends the
   current workflow or agent unless it carries its own anchor signal. An agent
   opened in the editor that the user asks to change is agent-anchored. When
   both an agent and a workflow are in context and the target is unclear, ask.
1. **Explicit artifact.** "Build me an agent/assistant that…" decides the
   anchor: load `agent-builder` next. An explicit workflow request selects a
   workflow, unless it fits a Close pairs row.
2. **Not a build?** Classify out-of-scope and answer or do it directly.
3. **Split** only on separate lifecycles (unrelated triggers, audiences or
   cadences). Run steps 4–9 on each part.
4. **Agent signals.** If any one holds, classify agent-anchored.
5. **Missing detail.** If the request does not supply every workflow
   condition, and the missing detail could make the work judgment-driven,
   classify needs-clarification and ask only for that detail.
6. **Workflow conditions.** If all hold, classify workflow-anchored.
7. **Embeds other.** Check both directions.
8. **Degenerate shell.** A workflow that reduces to a trigger plus one agent
   step that does all the work is an Agent. Re-anchor, also mid-build.
9. **Tiebreaker.** Only for a real tie: prefer the bounded workflow when it
   fully satisfies the request; prefer an Agent when novel situations, long
   horizons or learning are implied. For a true toss-up, name both readings.
   Never override an explicit Agent request.

## Signals

**Agent-anchored** (any one is enough):

- Reasoning drives the flow: investigate, decide, act, iterate.
- A persistent delegated role that needs judgment (choose what matters,
  follow up, adapt). A role noun alone is not enough.
- An on-demand question over external systems you cannot query, which needs
  judgment to answer. The user can ask the agent again.
- Multi-session or long-running coordination, tracked threads, check-ins.
- Proactive: wakes on a heartbeat or task and decides what to do each run.
- Learns from feedback over time.
- Chat or session interaction, unless chat only starts a fixed graph.
- Cross-session memory.

**Workflow-anchored** (all must hold):

- A graph of steps you can list.
- LLM use is a bounded transformer.
- The trigger and the body of each run are deterministic. A schedule alone
  never decides the anchor.
- The same graph each run serves reproducibility or auditability.

**Scheduled judgment work** (a cadence plus an open-ended body): default to an
Agent task when the duty is the whole outcome. Use a workflow shell when its
fixed collection, gating, transformation or delivery steps matter on their
own and the agent owns one bounded stage.

**Clarify** only when the answer changes the anchor: rules vs judgment (what is
"important"?), act alone vs draft for review, one-shot vs chat.

## Close pairs

When the user names one side of a pair and the signal fits the other side too,
ask the row's question with `ask_user` before you build either. An explicit
Agent request skips this table.

| Pair | The request fits both when | Question |
| --- | --- | --- |
| Agent, or a workflow with a Chat Trigger or AI Agent node | People send it messages over time (a chat window, DMs, a messaging channel), and each reply needs judgment, memory of the person, or actions on their behalf. | Should it hold a conversation with each person and decide its replies, or run the same fixed steps on every message? |

## Routing

- workflow-anchored → `workflow-builder`; a one-time task with an external
  effect → also `one-off-operations`.
- agent-anchored → load `agent-builder` before the first `agent_builder_*`
  call. It owns targeting, prerequisites and the build.
- needs-clarification → `ask_user`.
- out-of-scope → answer directly.

Load the `intent-examples` reference when a request is hard to classify and you
want worked examples.

## Output format

For build requests, do not show the classification unless the user asks;
follow the next step. When the user asks for it, use this form (or the format
they ask for), one block for each part:

```text
Anchor: workflow-anchored | agent-anchored | needs-clarification | out-of-scope
Embeds other: true | false | n/a
Reason: <one or two sentences citing the deciding signals>
Next step: <build workflow / build workflow with embedded agent step / build n8n Agent / ask clarification / answer directly>
```
