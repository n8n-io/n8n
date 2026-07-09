# Experiment log — intent-resolution suite (historical, throwaway)

> **This file is a dev-process log**, kept only as evidence for the design
> discussion around #33843 / #33862 (exam-graded vs behavior-graded intent
> evals, and the plan-first pivot). Nothing in it is needed to run, author,
> or maintain the suite — `README.md` covers that. **Safe to delete** once
> the approach discussion is settled.

## Plan-first pivot (2026-07-09)

After PM/eng discussion: the agent-building process is about to be redesigned
(a dedicated build sub-agent), so the suite no longer exercises builds or
inspects build tooling. Cases elicit a **proposed approach** (plan-first
suffix + a director that declines all approvals) and grade the proposal.
Verified across three N=3 validations: **0 builds in 126 runs**, ~12 min per
N=3 sweep on three lanes. Proposals name node choices explicitly, so the
node-level bias findings below stay detectable without builds; the
workflow-builder guidance follow-up remains open.

Plan-first initially bypassed the intent gate (skill engaged on only 44% of
plan-phrased requests — and **all** substantive misroutes occurred in
iterations where it skipped; when it engaged, proposals were correct 16/16).
Closed by refining the gate in `system-prompt.ts`: it applies whenever the
assistant **commits to an automation design** (including laying out the
approach before building) and explicitly does **not** apply to
product/capability questions or ops on existing resources — the meta/ops
cases guard that non-application empirically. Post-refinement N=3:
skill-load fails 20 → 2, all misroutes gone, 10/14 cases pass^3 = 100%,
meta/ops unaffected.

Known environment limitation (won't-fix by decision): running multiple
**bare-process** n8n instances on one host collides on the shared
`os.tmpdir()/n8n-snapshot-context-<ver>` staging dir (~7% of runs crash as a
no-response turn — #33342 covers only in-process races). Don't do that: use
a single instance, or dockerized lanes (`scripts/run-eval-lanes.sh`), whose
isolated filesystems are unaffected — as are CI containers and normal
production deployments.

## Experiment log (2026-07-08) — evidence behind this suite's design

Both corpora ran side by side on shared utterances (N=3, three local lanes):

- **This suite: 14/14 pass@3 = 100%, 13/14 pass^3 = 100%.** Exam corpus: 7/7
  pass@3, 6/7 pass^3 (its meta case flips on the skill-load expectation the
  preamble forces).
- **Stated ≠ enacted.** Unprimed, intent-recognition loaded on 1/6 build
  requests and both vocabulary false friends misrouted — all invisible to the
  exam (green explanations throughout). The system-prompt **intent gate**
  added on this branch fixed routing: skill-load 3/3 everywhere, false
  friends correct at anchor level, and the ops/continuity/meta cases prove it
  does not over-fire (once per new automation; silent on edits 3/3, ops
  questions 3/3, capability questions 0 loads).
- **One recurrent red, kept red:** when the request literally says "AI
  agent", the builder embeds an Agent node for a bounded summary step (2/3
  iterations) while "assistant"/tool-count/draft phrasings stay bounded 3/3 —
  the word alone drives the node choice. Follow-up: bounded-transformer
  guidance in workflow-builder.
- **Parity audit (all shared pairs):** every exam expectation maps to a
  behavioral proof or a documented transformation — anti-vocabulary
  assertions became artifact negatives; "the agent explains…" assertions were
  dropped (building ≠ lecturing); the clarify bucket asserts real asking
  instead of the exam's forbidden-to-ask variant. One known gap:
  the tutor case's strict `{agent, embeds: false}` gold doesn't yet assert
  "no workflow tools attached" (assertable from config writes; needs
  calibration). Agent-side continuity cases (real prior agent) are also
  pending.
- **Exam grader gap:** `intentExpectation` grading runs only in the direct
  loop (`harness/runner.ts`); the LangSmith `evaluate()` path
  (`getOrBuild` in `cli/index.ts`) never calls it — with a LangSmith key set,
  exam runs emit zero `intent:` verdicts (reproduced at N=1 and N=3).
