# Intent-resolution evals (`--tier agents`)

Cases in this directory are **user-voiced build requests asked plan-first**
("walk me through how you'd set this up first" — a constant suffix on every
build-request utterance) and graded on the approach the assistant
**proposes**. The build is never exercised: a director turn declines every
plan/setup approval. Two reasons for that shape: it keeps runs fast
(~30–60s/case — nothing gets built), and it decouples the suite from the
agent-build tool surface, which is being redesigned (dedicated build
sub-agent) — expectations name no build tools; only
`load_skill(intent-recognition)` is asserted by name. Requires
`N8N_ENABLED_MODULES=agents,instance-ai`.

| Decision (per the intent-recognition taxonomy) | Graded from the proposal |
| --- | --- |
| workflow-anchored | proposes a workflow (fixed trigger + steps) |
| agent-anchored | proposes a standalone n8n Agent |
| `embeds_other`, both directions | proposal embeds an open-ended agent step / attaches workflows as Agent tools |
| needs-clarification | asks a clarifying question before proposing a design |
| out-of-scope / meta | answers directly, zero build-path activity |
| ops on existing resources | routes through normal paths, no classification |
| context continuity | a follow-up amendment stays on the proposed automation |

Grading uses ordinary `processExpectations` only — no bespoke schema fields,
graders, or CLIs, and no `outcomeExpectations` (there is no built artifact to
judge). Every routing case asserts both the proposed approach and that
`load_skill(intent-recognition)` ran before the decision; the
ops/meta/continuity cases guard the opposite direction (the intent gate must
not fire on non-build messages or re-fire on amendments).

## Authoring

- Keep conversations in the user's voice. Build-request cases carry the
  constant plan-first suffix on turn 1 and a director turn that **never
  approves** a plan, setup card, or build confirmation — that is what keeps
  the build from being exercised. Cases whose gold is a question (clarify)
  direct the proxy to decline answering and end.
- **Name no build tools in expectations.** The agent-build path is being
  redesigned; assert the *proposed approach* ("proposes a workflow…",
  "proposes an n8n Agent…"), never the tools used to realize it. The one
  named surface is `load_skill(intent-recognition)` — the mechanism under
  test.
- **"Agent" is three different things — never use it bare in the artifact
  sense.** Unqualified "the agent" always means the assistant. For the
  first-class resource write "an n8n Agent" (a standalone Agent the assistant
  proposes or creates); for the workflow node write "AI Agent node". The
  judge prompt carries a matching glossary
  (`system-prompts/build-expectations-verify.ts`) so verdicts key on the
  substance, not the word.
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

Plan-first case-runs are cheap (~30–60s — nothing is built), so a single
local instance handles N=3 comfortably. For larger sweeps, boot extra local
lanes from the branch dist and fan out with comma-separated `--base-url`
(the work-stealing allocator needs the LangSmith path, i.e.
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

Residual known reds (~7% of runs): an Instance AI server-side crash —
`ENOTEMPTY` rmdir race on the shared `os.tmpdir()/n8n-snapshot-context-<ver>`
cache when multiple lanes run on one host (the Jul-1 staging fix #33342
covers in-process races; the cross-process cleanup-vs-staging variant
remains) — surfaces as a no-response turn. Ticket-worthy; CI containers are
isolated and unaffected.

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
