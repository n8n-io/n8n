# User needs: workflow builders handing off to agents

**Date:** 2026-06-11
**Feeds:** workflow-context-for-agents POC. Built on `2026-06-11-workflow-context-observed-behaviour.md` (forum + telemetry evidence) and team domain knowledge.
**User framing:** Agent owner and workflow builder are practically the same person today (project-scoped agents, single-builder reality) — needs are defined for the **workflow builder adding an agent step**, with an expert/production sub-cohort whose needs conflict. The agent-owner-as-separate-person needs are parked as future.

## Prioritised needs (importance × how badly served today)

| # | Job story | Type | Confidence | Currently served? |
| --- | --- | --- | --- | --- |
| N1 | When my workflow reaches an agent step that needs data from earlier nodes, I want the agent to act on the right workflow data without me hand-assembling it, so the step works on the first try. | Functional | Observed | Badly — expression-stuffing + JSON.stringify folklore |
| N2 | When my workflow processes multiple items or grows deep, I want the agent's context to stay correct as the workflow scales, so behaviour doesn't silently degrade. | Functional | Observed (staff-confirmed first-item limit t/75602; depth failure t/160343) | Badly — failures are silent |
| N3 | When upstream data is large, I want only a bounded, relevant slice to reach the model, so token limits and answer quality hold. | Functional | Observed (t/63179, t/177160, t/264845) | Partially — manual curation, experts only |
| N4 | When the agent's answer looks wrong, I want to see what context it actually received, so I can tell a data problem from a reasoning problem. | Functional + emotional | Inferred (from "[object Object]" discovery threads) | Partially — toolCalls output, execution logs |
| N5 | When I can't predict at build time what context each request will need, I want the agent to determine and fetch what it needs, so I don't have to enumerate every case. | Functional | Assumed→Inferred — POC premise; never voiced by users; adjacent power-user signal only (t/246140) | Not served |

## Emotional and social needs

- **E1** — When wiring data into an agent, I want to feel confident I'm doing it "right", so I'm not anxious shipping it. *(Inferred — recurring how-do-I threads are anxiety artifacts.)* Feeds surface: feedback/affordances that show what the agent can see.
- **S1** — When colleagues or clients consume my automation's answers, I want them correct about *their* request, so the automation reflects competence on me. *(Inferred.)* Wrong-context answers are publicly embarrassing — raises the stakes of N2's silent failures.

## Expert/production builder sub-cohort

- **X1** — When I run agents in production, I want deterministic control over exactly what enters model context, so cost, quality, and exposure stay predictable. *(Observed — currently WELL served; the risk is the new feature un-serving it.)*
- **X2** — When an agent pulls data, I want enforced budgets, so one tool call can't blow my token spend. *(Observed — POC caps serve this directly.)*

## Named contradiction

**N5 vs X1:** ambient zero-config pull vs deterministic explicit control. The POC's always-on default serves N1/N5 and violates X1. Resolution (defaults + override, opt-out, per-node toggle) is strategy / conceptual-model work — named here, not resolved.

## Parked (future)

When agent owner ≠ workflow builder (team projects): "know and bound what workflows feed my agent" — governance need, compounded by tool results persisting in agent thread memory.

## Gaps / validation plan

1. **N5 is the load-bearing unvalidated premise.** Cheapest validation: the push-vs-pull experiment the POC enables (same workflow, message-only vs message+tool, compare answer quality).
2. **Trust:** does the N1 cohort trust agent-fetched context, or does invisibility create new anxiety (E1 inverted)? Dogfooding observation question.
3. **Prevalence** unquantifiable from telemetry (params privacy-stripped) — 6–10 JTBD interviews with builders who added agent steps.

## Filter notes

- N1 was originally phrased "without fighting expressions" — solution sneaking in; restated as motivation.
- "Users want the agent to see everything" was considered and **rejected** — contradicted by evidence (experts curate; security users want control).
