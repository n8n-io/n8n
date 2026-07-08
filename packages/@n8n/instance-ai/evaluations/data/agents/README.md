# Intent-resolution evals (`--tier agents`)

Cases in this directory are **plain build requests** graded on what the
assistant actually does — the routing decision is asserted from observable
behavior, not from a stated classification. Requires
`N8N_ENABLED_MODULES=agents,instance-ai` and a working sandbox.

| Decision (per the intent-recognition taxonomy) | Enacted as |
| --- | --- |
| workflow-anchored | builds via the workflow-building tools |
| agent-anchored | takes the agent-builder route (`agent_builder`/`create_agent`) |
| `embeds_other`, both directions | AI Agent node present/absent in the workflow JSON; workflow tools on the agent |
| needs-clarification | asks a clarifying question before building |
| out-of-scope / meta | answers directly, zero build-path activity |
| ops on existing resources | routes through normal paths, no classification |
| context continuity | a mid-build increment stays on the current primitive |

Grading uses ordinary `processExpectations` / `outcomeExpectations` only — no
bespoke schema fields, graders, or CLIs. Every routing case asserts both the
path taken and that `load_skill(intent-recognition)` ran before the decision;
the ops/meta/continuity cases guard the opposite direction (the intent gate
must not fire on non-build messages or re-fire on edits).

## Authoring

- Keep conversations in the user's voice; assert the route and the artifact,
  not one run's incidental choices. Clarify-bucket cases must be multi-turn
  with a director script that declines to elaborate — a single-turn case
  hangs on the unanswered ask-user question until the iteration timeout.
- Cases whose gold legitimately tolerates two shapes say so in one
  expectation ("either … or …"); compound requests assert each automation
  separately.
- Most utterances are shared with the exam-style corpus in
  [`../agents-exam`](../agents-exam) (see below), which keeps the two
  gradable side by side. Where a case here has no exam counterpart
  (continuity needs a real prior build; ops routing isn't classified at all),
  the case description says so.

## Running

```bash
cd packages/@n8n/instance-ai
pnpm eval:agents --iterations 3
```

A case-run is a real build turn (~2–2.5 min), so wall time is dominated by
parallelism — and concurrency on a single instance saturates. Boot extra
local lanes from the branch dist and fan out with comma-separated
`--base-url` (the work-stealing allocator needs the LangSmith path, i.e.
`LANGSMITH_API_KEY` set; watch for Anthropic 429s beyond ~3 lanes per key):

```bash
# per extra lane (port P, broker P+1), then seed users via POST :P/rest/e2e/reset:
screen -dmS n8n-lane-P bash -lc 'cd packages/cli/bin && npx dotenvx run -f ../../../.env.local -- env N8N_PORT=P N8N_USER_FOLDER=/tmp/n8n-lane-P E2E_TESTS=true N8N_RUNNERS_BROKER_PORT=P+1 N8N_ENABLED_MODULES=agents,instance-ai node ./n8n start > /tmp/n8n-lane-P.log 2>&1'

pnpm eval:agents --iterations 3 --base-url http://localhost:5678,http://localhost:P --concurrency 6
```

For docker lanes from a built `n8nio/n8n:local` image use
`scripts/run-eval-lanes.sh` (a `--local` mode there is the proper follow-up
for the recipe above).

## Relationship to `../agents-exam`

The exam-style corpus grades a *stated* classification: a loader preamble
injects the taxonomy, forbids building and clarifying questions, and requires
a fenced ```` ```intent ```` block that `build-expectations/intent.ts`
exact-matches. It is ~10× cheaper per run (nothing is built) and remains
useful as a skill-iteration dev loop via `--tier agents-exam` +
`pnpm eval:intent-slices`. This directory is the tracked suite: same
utterances, graded on behavior.

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
