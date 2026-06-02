# TRUST-145 — Spike: skills-based eval creation for Instance AI

> Status: spike output (recommendation). No production code changed.
> Ticket: https://linear.app/n8n/issue/TRUST-145
> Related: INS-280 (skill loading, done), INS-342 (workflow-builder skill, in PR #31312), INS-282 (eval coverage)

## TL;DR

**Recommendation: HYBRID — move the procedure into a `skills/eval-setup/SKILL.md`
loaded by the orchestrator, keep the tools/services as the execution surface,
and delete the `eval-setup` background sub-agent.**

The single biggest cause of poor end-to-end quality is not the node-wiring
knowledge — it is that **the orchestrator is never told to use the eval tools at
all.** `evals`, `eval-setup-with-agent`, and `eval-data` are registered, but
`src/agent/system-prompt.ts` contains **zero** eval instructions. There is no
offer-after-build, no metric flow, no "populate then run" loop. The capability
is effectively dark: it only fires if the model improvises the tool sequence.

A skill is the right fix because the missing piece *is* procedure, and a skill
is procedure loaded into the orchestrator's own context — the same move INS-342
makes for `workflow-builder`. This also lets us add the post-build **offer** and
the missing **run/verify** step in one coherent procedure instead of scattering
prompt fragments.

---

## 1. Root cause — where eval creation breaks down (Q1)

Traced through the current path:
`evals(offer → recommend-metric / select-metrics → propose)` →
`eval-setup-with-agent` (background sub-agent, prompt in
`eval-setup-agent.prompt.ts`) → `eval-data` (synchronous). Findings, highest
leverage first:

| # | Failure mode | Evidence | Skill-fixable? |
|---|---|---|---|
| **F1** | **No orchestrator-level procedure.** The agent is never instructed to offer evals after a build, nor how to sequence offer → metric → propose → populate → run. | `grep -n "eval" src/agent/system-prompt.ts` → no matches. Tools registered in `tools/index.ts` but unreferenced by any prompt. | **Yes** — this is exactly what a skill is. |
| **F2** | **No execution step.** There is no "run eval / verify setup" tool. The sub-agent prompt explicitly says *"Do NOT run the workflow"* (validation is structural only). The loop ends at "nodes wired", leaving the user to find and run the EvaluationTrigger. | `eval-setup-agent.prompt.ts:241`; no `run-eval` in `tool-ids.ts`. | Partly — skill defines the step, but a **new tool/service** is needed (see Q4). |
| **F3** | **Cross-boundary context loss.** Wiring knowledge lives in a 240-line detached sub-agent prompt; the orchestrator hands off a formatted task string (`format-eval-setup-task.ts`) and gets back a one-line summary. The orchestrator cannot inspect, repair, or explain the topology, and the sub-agent cannot see the conversation beyond the briefing. | `eval-setup-agent.tool.ts` spawns a detached background agent; `propose` returns `shouldDelegateToEvalSetupAgent`. | **Yes** — in-context skill removes the boundary. |
| **F4** | **Metric vocabulary drift.** Orchestrator-facing catalog has 4 LLM-judge metrics (`correctness`, `relevance`, `tool_use`, `helpfulness`); the node layer wires 6 (`stringSimilarity`, `categorization`, `toolsUsed`, …). They are bridged by a `cannedMetricKey` mapping (`relevance → categorization`) split across `metric-catalog.ts` and `eval-setup-agent.prompt.ts`. | `metric-catalog.ts` (4 ids) vs prompt canned-key mapping (`eval-setup-agent.prompt.ts:170-175`). | Partly — skill can centralize the mapping doc; the catalog stays code. |
| **F5** | **Topology correctness is fragile & invisible.** `checkIfEvaluating` slot 0/1, AI-judged metrics needing a second `ai_languageModel` connection, PRODUCTION ADAPTER `$json` vs `$('Agent').item.json` rewrites — all silently fail when wrong, and the only check is the sub-agent's own one-shot structural assert. | `eval-setup-agent.prompt.ts:41-241`. | **Yes** for the knowledge; needs a real verify step (F2) to catch behavioural failures. |
| **F6** | **Dataset quality is capped by ground truth.** `eval-data` pulls history rows (≥10) or generates synthetic **input-only** rows, deliberately leaving expected-output columns empty (correct — avoids self-consistency scoring), but nothing closes the loop to get the user to fill them before a run. | `eval-data-agent.tool.ts:146-163, 220`. | **Yes** — skill owns the "ask user to fill ground truth, then run" step. |

**Conclusion:** F1/F3/F5/F6 are *procedure & context* problems a skill fixes
directly. F2 needs a small new tool. F4 is a code-hygiene cleanup. None of the
top failures are "the sub-agent's LLM isn't smart enough" — they are
architectural.

## 2. Skill fit (Q2)

Relocating the wiring knowledge into `skills/eval-setup/SKILL.md` loaded by the
orchestrator plausibly fixes F1, F3, F5, F6:

- **F1** disappears by definition — the skill is the procedure, with the
  description triggering it on "after a workflow with AI nodes is created/edited"
  and on explicit "add evals / test cases" requests.
- **F3** disappears — wiring happens in the orchestrator's own turn via the
  native `workflows` tool (exactly how INS-342 moved builder saves in-context),
  so it can inspect, repair, and explain.
- **F5** improves — the topology rules become reference material the orchestrator
  consults inline and can re-check after a real run.
- **F6** improves — the skill mandates the "fill ground truth → run → report"
  close-out.

What a skill will **not** fix on its own: the missing execution tool (F2) and the
metric mapping living in two places (F4). Those are tool/data work, sequenced as
follow-ups.

## 3. Boundary — tools/services vs. skill procedure (Q3)

Mirrors INS-342: **knowledge → skill, mechanism → tools.**

### Keep as tools / services (the execution surface)

These are deterministic, testable, and have no place in a prompt:

- `evals` tool actions `offer` / `recommend-metric` / `select-metrics` /
  `propose` — keep. They own eligibility detection, the HITL widgets, DataTable
  creation/linking, and column inference. (Drop only the
  `shouldDelegateToEvalSetupAgent` contract — see below.)
- `eval-data` tool — keep as-is. Synchronous history extraction + synthetic row
  generation is pure mechanism.
- All `src/tools/evals/*.service.ts` and detectors
  (`ensure-eval-data-table`, `eval-data-requirements`, `detect-ai-nodes`,
  `detect-agent-named-refs`, `detect-tool-refs`, `analyze-agent-input-columns`,
  `column-ref-utils`, `apply-pin-data`, `generate-sample-rows`,
  `extract-rows-from-history`, `generate-tool-ref-pin-data`,
  `describe-metric-for-workflow`) — keep.
- `metric-catalog.ts` — keep (data).
- The native `workflows` tool — becomes the eval-node write surface, replacing
  the sub-agent's gated `workflows` clone.

### Move into the skill (authored procedure)

- The entire body of `eval-setup-agent.prompt.ts` (240 lines): data-flow
  semantics, EvaluationTrigger / Evaluation(checkIfEvaluating/setOutputs/
  setMetrics) wiring, AI-judged-metric `ai_languageModel` connection rule,
  PRODUCTION ADAPTER handling, required topology diagrams, structural assertions.
- The **missing** orchestrator procedure: when to `offer`, how to drive
  recommend→propose, when to call `eval-data`, when to run, how to report.

### Delete

- `eval-setup-agent.tool.ts` (`createEvalSetupAgentTool` / `eval-setup-with-agent`)
  and the background spawn (`startEvalSetupAgentTask`, `buildEvalSetupTools`).
- `eval-setup-agent.prompt.ts` (`EVAL_SETUP_AGENT_PROMPT`) — content migrates to
  the skill.
- `format-eval-setup-task.ts` — the task-spec string only existed to brief a
  detached agent; in-context the skill reads the same data directly. Re-evaluate
  during implementation: some column/namedRef formatting may still be useful as a
  helper the skill calls, but the "task spec for a sub-agent" framing goes.
- `propose`'s `shouldDelegateToEvalSetupAgent` / `task` return fields and the
  `MAX_STEPS.EVAL_SETUP` constant.

### Delete / keep summary

| Path | Action |
|---|---|
| `orchestration/eval-setup-agent.tool.ts` | **Delete** |
| `orchestration/eval-setup-agent.prompt.ts` | **Delete** (migrate to skill) |
| `evals/format-eval-setup-task.ts` | **Delete or downgrade to helper** |
| `evals/evals.tool.ts` (`propose`) | **Keep**, drop delegate fields |
| `orchestration/eval-data-agent.tool.ts` (`eval-data`) | **Keep** |
| `evals/*.service.ts`, detectors, `metric-catalog.ts` | **Keep** |
| `skills/eval-setup/SKILL.md` | **New** |
| `run-eval` tool (new) | **New** (Q4) |

## 4. Execution gap — add a first-class run/verify step (Q4)

**Yes.** Without it the loop never closes (F2) and topology errors (F5) stay
invisible. INS-342 already added "preview opening/running, workflow execution"
verification to the builder path — eval setup should match.

Proposed: a `run-eval` action (own tool, or an action on `evals`/`executions`)
that runs the workflow via the EvaluationTrigger over the populated DataTable,
waits for completion, and returns per-metric scores + a pass/fail-style summary.
The skill's mandatory process ends with: **wire → populate → (ask user to fill
ground truth if synthetic) → run → report scores → offer to iterate.** This is
out of scope for the spike to build; it is the highest-value follow-up.

## 5. Measuring improvement (Q5) — tie-in with INS-282

INS-282 establishes the pattern for `data-table-manager`: unit coverage for
skill list/load, an eval/scenario requiring the skill, a regression assertion
that full skill bodies are not in the initial prompt, and a regression assertion
that the request does **not** route through the removed sub-agent path. Reuse it
verbatim for `eval-setup`:

1. Scenario: "I built an AI workflow, now add test cases" must (a) load
   `eval-setup`, (b) wire valid topology, (c) populate the DataTable, (d) run and
   report scores — without spawning a background sub-agent.
2. Regression: `eval-setup-with-agent` tool is gone; `evals(propose)` no longer
   returns `shouldDelegateToEvalSetupAgent`.
3. Topology assertions (lifted from the old sub-agent's self-check) become eval
   fixtures on 1–2 representative workflows (one direct, one PRODUCTION ADAPTER).
4. Metric: % of eval-setup runs that reach a successful `run-eval` with non-empty
   scores (the end-to-end success rate F2 currently makes unmeasurable).

---

## Proposed `skills/eval-setup/SKILL.md` (draft outline)

> Embedded as a draft so the runtime registry
> (`src/skills/runtime-skills.ts` auto-globs `skills/`) does **not** pick up a
> half-built skill during the spike. Promote to a real file in the implementation
> ticket. Structure mirrors `workflow-builder` (frontmatter → Stop First →
> Default Procedure → Load Detail → Non-Negotiables → Completion) and reuses the
> section names already proven in `eval-setup-agent.prompt.ts`.

```markdown
---
name: eval-setup
description: >-
  Creates evaluations for an n8n workflow that contains AI/agent nodes: builds or
  links a test dataset (Data Table), wires the evaluation nodes (EvaluationTrigger
  → agent → checkIfEvaluating → setOutputs/setMetrics), runs the eval, and reports
  scores. Use after building or editing a workflow with AI nodes (offer test
  cases), and on explicit requests to add evals, test cases, metrics, or measure
  workflow quality. Do not use for the TRUST eval framework or CI harness.
recommended_tools:
  - evals
  - eval-data
  - workflows
  - run-eval        # new (Q4); until it lands, executions(action="run")
  - data-tables
  - nodes
  - ask-user
platforms:
  - daytona
---

# Eval Setup

## Stop First
Only for workflows that contain AI/agent nodes. If `evals(action="offer")` returns
`{ eligible: false }` (no AI nodes, or evals already configured), stop and do not
wire anything. If there are multiple AI nodes and none is named, ask once which
agent to evaluate.

## When to Offer (post-build)
After a successful build/edit of a workflow with AI nodes, call
`evals(action="offer")`. When eligible, output the returned `message` verbatim and
end the turn so the user replies naturally. Do not invent the offer copy.

## Default Procedure
1. Offer: `evals(action="offer", workflowId)`. Eligible → emit message, end turn.
2. Choose metrics: `evals(action="recommend-metric")` FIRST (approve/deny widget).
   On deny → `evals(action="select-metrics")`. Map approved ids straight into
   propose.
3. Dataset + topology: `evals(action="propose", metrics, datasetChoice)`. This
   creates/links the Data Table and returns its id and the resolved input/output
   columns. Then wire the eval nodes directly via the `workflows` tool (see
   references/eval-node-wiring.md) — do NOT delegate to a sub-agent.
4. Populate: `eval-data(workflowId)`. If it reports
   `expectedOutputsNeedUserReview`, tell the user which columns to fill with
   ground-truth answers before running.
5. Run: `run-eval(workflowId)` (until it lands, run via the EvaluationTrigger).
   Wait for completion.
6. Report: per-metric scores + dataset summary. Offer to iterate (adjust prompt,
   add rows, change metrics) and re-run.

## Eval Node Wiring  (→ references/eval-node-wiring.md)
Full migrated body of the old eval-setup sub-agent prompt: data-flow semantics,
EvaluationTrigger (typeVersion 4.7, dataTable resourceLocator), Evaluation node
operations (setInputs/setOutputs/setMetrics, typeVersion 4.8), checkIfEvaluating
slot 0 (eval) / slot 1 (production side-effects), the AI-judged-metric second
`ai_languageModel` connection rule, and both required topology diagrams.

## Production Adapter  (→ references/production-adapter.md)
When the agent reads from named upstream nodes, follow the adapter rules
verbatim: Set node upstream of the agent, `$json.<column>` for the agent target,
`{{ $('<Agent>').item.json.<column> }}` for sub-components (memory/tools/parsers).
EvaluationTrigger connects directly to the agent as a second `main` input.

## Metric Mapping
Orchestrator catalog ids → evaluation-node metric:
correctness→correctness, helpfulness→helpfulness, tool_use→toolsUsed,
relevance→categorization. correctness/helpfulness are AI-judged (need the
`ai_languageModel` connection); the rest are deterministic.

## Validation
After wiring, re-read the workflow and assert the topology (EvaluationTrigger→
agent direct; agent→checkIfEvaluating; slot 0→setOutputs→setMetrics; slot 1→
original downstream; AI-judged metrics have the judge LLM connection). One repair
cycle, then report the specific failure if still broken. Prefer a real `run-eval`
over structural-only checks.

## Non-Negotiables
- Never delegate eval setup to a background sub-agent.
- Never overwrite a ground-truth column with setOutputs — always a new
  `actual_*` column.
- Side-effect nodes (sends, writes, HTTP POST) reachable ONLY via slot 1.
- Never auto-fill expected-output ground truth with model guesses.
- Destructive/mutating tools show their own approval UI — call them, respect the
  result, don't ask in chat first.

## Completion
One sentence: dataset name + row count, metrics configured, and the run result
(scores) or the concrete blocker. Offer one next step (iterate or run).
```

Reference splits (mirroring `workflow-builder/references/`):
`references/eval-node-wiring.md`, `references/production-adapter.md`.

---

## Migration sketch

1. Add `skills/eval-setup/SKILL.md` + `references/*` (content from
   `eval-setup-agent.prompt.ts`).
2. Add the orchestrator hook: in `system-prompt.ts` Post-build flow, after
   verification/setup, load `eval-setup` and call `evals(action="offer")` (one
   line, matching how `data-table-manager` is referenced).
3. Change `evals(action="propose")`: keep DataTable + column logic, drop
   `shouldDelegateToEvalSetupAgent` / `task`; the skill wires via `workflows`.
4. Add the `run-eval` tool/service.
5. Delete `eval-setup-with-agent` tool, `eval-setup-agent.prompt.ts`,
   `format-eval-setup-task.ts` (or downgrade), `MAX_STEPS.EVAL_SETUP`.
6. Eval/regression coverage per INS-282.
7. Validate exactly as INS-342 did: "done only once the Instance AI E2E flow
   passes cleanly and the eval-setup eval surface stays non-regressing."

## Follow-up tickets

| Ticket | Scope | Est |
|---|---|---|
| **T1** | Author `skills/eval-setup/SKILL.md` + references; wire post-build `offer` into orchestrator prompt; load skill in eval paths. | M |
| **T2** | Add `run-eval` tool/service (run via EvaluationTrigger, return per-metric scores). Close the loop (F2). | M |
| **T3** | Delete `eval-setup` sub-agent path; migrate `propose` to in-context wiring; remove `shouldDelegateToEvalSetupAgent`. | S–M |
| **T4** | Eval + regression coverage (INS-282 pattern): scenario requires skill, no sub-agent route, topology fixtures, end-to-end success-rate metric. | M |
| **T5** | Metric-mapping cleanup (F4): single source of truth for catalog↔node mapping. | S |

Suggested order: T1 → T2 → T3 → T4, with T5 folded into T1/T3.
