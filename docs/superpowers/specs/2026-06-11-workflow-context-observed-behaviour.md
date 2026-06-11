# Observed behaviour: how users get workflow data into agent context

**Date:** 2026-06-11
**Feeds:** workflow-context-for-agents POC (`2026-06-11-message-an-agent-workflow-context-design.md`); follows the orient audit (`2026-06-11-workflow-context-layers-orient.md`)
**Sources:** n8n community forum (17 queries, 14 threads read in full) + BigQuery telemetry via Hex ([thread](https://eu.hex.tech/n8n/thread/019eb796-6ae3-7207-95de-b9dd8243d905))

## Key observations

**Qualitative (forum):**

1. **Expression-stuffing is the canonical pattern**, taught in nearly every community answer: `{{ JSON.stringify($('Node').item.json) }}` pasted into prompt fields. ([t/95132](https://community.n8n.io/t/95132) — 2,937 views; [t/235201](https://community.n8n.io/t/235201) — accepted answer is a hand-built prompt template)
2. **Staff-confirmed structural ceiling:** *"it's not possible to refer to inputs from previous nodes as expressions when there are multiple items… it will always refer to the first item"* ([t/75602](https://community.n8n.io/t/75602)).
3. **Signature failure pair recurs monthly:** model sees `[object Object]` → fix is `JSON.stringify` ([t/108537](https://community.n8n.io/t/108537): Gemini literally replied "I need the content of the two JSON objects").
4. **Expression references degrade with workflow depth:** identical expression works 4 nodes after a webhook, returns `undefined` 13 nodes later ([t/160343](https://community.n8n.io/t/160343)).
5. **Dump-everything failures:** 140 items → 128k-token overflow ([t/63179](https://community.n8n.io/t/63179)); 20k Postgres rows → "very lagg" ([t/177160](https://community.n8n.io/t/177160)); repeated tool calls → prompt-limit hit ([t/264845](https://community.n8n.io/t/264845)).
6. **Zero explicit feature requests** for "agent fetches workflow/execution data" — demand is implicit, expressed as recurring "how do I pass data to the agent" questions since Nov 2023.
7. **Power users converge on agent-pulls-on-demand independently:** Agent Skills / progressive disclosure FR ([t/246140](https://community.n8n.io/t/246140)); community-built ContextBudget sub-workflow ([t/294955](https://community.n8n.io/t/294955)).
8. **Counter-signal:** the most-upvoted best-practice advice is deterministic pre-fetch + curation, *against* letting agents pull bulk data ([t/264845](https://community.n8n.io/t/264845)); security-minded users want explicit control over what enters agent context ([t/296349](https://community.n8n.io/t/296349)).
9. One accepted workaround for sharing workflow data with an agent was standing up a **vector store** ([t/104979](https://community.n8n.io/t/104979)) — heavy improvisation signals a real need.

**Quantitative (telemetry):**

10. AI Agent node baseline is enormous: ~17.9M workflows / ~5.3M instances (lifetime) contain it.
11. `messageAnAgent` is essentially unused: ~32 workflows / ~22 instances lifetime (hidden node) — **no behaviour to observe on the exact node the POC targets**.
12. **Telemetry gap (finding):** node-parameter telemetry is privacy-stripped (`node_graph` redacts params) — promptType share and expression-stuffing prevalence are *unmeasurable* in the warehouse.
13. Context-length errors: 0.05% of 2.18M agent manual-exec errors (0.27% for agentTool) in 90 days — low share, large absolute counts; silent quality degradation from overstuffing is invisible to this proxy. Second gap: production (non-manual) langchain-agent errors don't land in `workflow_execution_errored`.

## Patterns

- **P1 — The universal workaround breaks at three boundaries:** multi-item inputs (first-item-only), workflow depth (expression resolution fails), payload size (token overflow). Hand-wiring works for the demo case and fails as workflows grow.
- **P2 — Pain is fragmented, not organized:** steady trickle of low-engagement threads (100–600 views each), continuous since 2023. Each author thinks their failure is idiosyncratic. Classic unarticulated need.
- **P3 — Experts push the opposite direction:** curate *less* into context, deterministically. Context budgets are community best practice. Any pull-tool must enforce budgets to be credible (the POC's caps are load-bearing, not polish).
- **P4 — The POC's exact mechanism is independently emerging** among power users (progressive disclosure, skills, context budgeting) but is never requested for workflows-calling-agents.

## Candidate job stories

| # | Job story | Confidence |
|---|---|---|
| 1 | When I add an agent step that needs upstream data, I want to get that data into the agent without fighting expression syntax and stringification, so the agent answers about the right things. | **Observed** |
| 2 | When my workflow handles multiple items or grows deep, I want context wiring that keeps working, so I don't silently get first-item-only or `undefined` context. | **Observed** (staff-confirmed limitation) |
| 3 | When upstream data is large, I want to bound what enters the agent's context, so I don't blow token limits or degrade answer quality. | **Observed** |
| 4 | When I hand off to an agent, I want the agent to determine what context it needs, so I don't have to know what "right context" is. | **Inferred** — the POC's premise; users never say this; adjacent power-user signal only |
| 5 | ~~Users want the agent to see everything~~ | **Contradicted** — users want bounded, controllable context |

## Read for the POC

The evidence **reframes** the feature's value proposition. The headline isn't "agents lack context" — it's *"hand-wiring context breaks at predictable boundaries, and the pull-tool dissolves exactly those boundaries"*: fetch-by-node-name is depth-proof (no expression fragility), exposes real multi-item data (not first-item-only), and enforces budgets (the community's own best practice). The counter-signal sets a hard design constraint: experts will demand curation/control and will reject an unbounded context dump — always-on must coexist with explicit-control affordances when this graduates.

## Research gaps

1. **Prevalence is unquantifiable from telemetry** (params stripped). Options: privacy-safe boolean event (prompt-contains-expression), or 6–10 JTBD interviews with workflow+agent builders.
2. **No observable behaviour on `messageAnAgent` itself** (~32 workflows). Dogfooding / design partners are the only route to observing the actual handoff behaviour.
3. **Does agent-pull beat hand-crafted push on answer quality?** Nobody knows — the POC enables exactly this experiment (same workflow, message-only vs message+tool).
4. Telemetry bugs worth filing: production langchain-agent errors missing from `workflow_execution_errored`; overstuffing-induced *quality* degradation invisible to error proxies.
