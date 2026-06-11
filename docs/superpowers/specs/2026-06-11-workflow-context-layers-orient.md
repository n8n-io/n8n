# Layers Orient: Workflow context for agents (Message an n8n Agent)

**Date:** 2026-06-11
**Feature:** `fetch_workflow_context` tool + prompt guidance injected when a workflow messages an agent (POC implemented on `burivuhster/message-agent-fetch-context-poc`)
**Stage:** Early exploration — working POC, no product decisions committed
**Design challenge:** Is it a good idea? What use cases can it power? What are the gaps?

## Decision landscape

| Layer | State | Notes |
| --- | --- | --- |
| Observed behaviour | Weak | Intuition only; no telemetry/forum/support evidence. `MessageAnAgent` is a hidden node → direct telemetry thin by construction; adjacent evidence exists (AI Agent node prompting patterns, expression mapping). |
| The domain | Partial | n8n data-flow (push-through-connections): strong. Context engineering for agents: emerging, partially understood. Push-vs-pull tension first surfaced by this POC. |
| User needs | Assumed | Articulated job: "when my workflow hands off to an agent, get the right context across without me needing to know what 'right context' is." Team-derived, untested. Dangerously compelling. |
| Product & service strategy | Not started | Exploratory by choice; no target outcome or stated bet. No scoring criteria for "is it a good idea". |
| Conceptual model | Partial | POC-expedient decisions: pull-not-push, always-on, current-execution-only, last-run-only, 20-item/50KB caps. Latent undecided: privacy semantics (workflow data vs agent owner's entitlement), temporal semantics (tool results persist in agent thread memory across pinned sessions), scope of "context" (run data vs workflow structure vs parameters). |
| Interaction structure | Partial | Builder journey zero-config; agent two-step tool contract works. Undesigned: visibility/debugging, failure paths, consent. |
| Surface | Not started | Appropriately deferred. Incidental visibility via `toolCalls` + session history only. |

## Bottleneck

**Observed behaviour.** The stated challenge is a problem-space question; everything above sits on intuition. Mechanism proven; demand and use-case shape unproven.

**Flagged assumption — User needs:** the articulated need is solution-agnostic, the POC is not. "Users craft context badly" admits ≥3 solutions: pull tool (built), automatic push (inject context summary, no tool), better mapping UX. Evidence about *how* users currently fail discriminates between them.

**Tradeoff:** the POC is itself an evidence instrument (dogfooding answers "does an agent use the tool well?") — feasibility, not demand. Demand is the cheaper next check.

## Recommendation

Run `/layers-observed-behaviour`, grounded with:

- **n8n-forum-search** — qualitative demand: passing workflow data to agents, prompt-stuffing patterns, "agent doesn't know workflow state" complaints
- **Hex** — AI Agent node prompt-field expression usage referencing upstream nodes (the manual workaround in the wild); MessageAnAgent adoption

Output feeds `/layers-user-needs` job stories if signal exists.
