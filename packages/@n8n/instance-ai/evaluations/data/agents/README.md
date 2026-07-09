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

Plan-first case-runs are cheap (~30–60s — nothing is built), so a **single
local instance** handles N=3 comfortably; that is the recommended local
setup. For larger sweeps use dockerized lanes from a built `n8nio/n8n:local`
image via `scripts/run-eval-lanes.sh` (comma-separated `--base-url`; the
work-stealing allocator needs `LANGSMITH_API_KEY` set). Do **not** run
multiple bare-process instances on one host — they collide on a shared
sandbox-staging temp dir (details in [EXPERIMENT-LOG.md](EXPERIMENT-LOG.md)).

## Relationship to `../agents-exam`

The exam-style corpus grades a *stated* classification: a loader preamble
injects the taxonomy, forbids building and clarifying questions, and requires
a fenced ```` ```intent ```` block that `build-expectations/intent.ts`
exact-matches. It is ~10× cheaper per run (nothing is built) and remains
useful as a skill-iteration dev loop via `--tier agents-exam` +
`pnpm eval:intent-slices`. This directory is the tracked suite: same
utterances, graded on behavior.

## Handover: remaining migration from `../agents-exam`

12 of the 38 exam cases are migrated (shared slug = shared opening utterance,
minus the plan-first suffix). Remaining 26, by bucket — same conversion
recipe per case (plan-first suffix + declining director + proposal-graded
expectations; see Authoring above):

- **wf (no embed):** `wf-rss-summary-linkedin`, `wf-payroll-net-pay`,
  `wf-long-linear-order-fulfillment`, `wf-fixed-label-classifier`,
  `wf-ticket-classify-route`, `wf-review-sentiment-routing`,
  `wf-lead-score-route`
- **wf + embedded agent:** `we-ticket-branch-agent`,
  `we-lead-personalized-outreach`, `we-weekly-feedback-investigation`
- **agent axes:** `agent-chat-hr-policy`, `agent-proactive-oncall-burnout`,
  `agent-long-running-launch`, `agent-self-improving-code-review`
- **agent + wf-tools:** `at-support-agent`, `at-research-agent`
- **tolerance:** `agent-incident-investigator`, `agent-sales-prospecting`,
  `agent-research-report`
- **clarify:** `clarify-inbox-handling`, `clarify-meeting-summary-followup`
  (compound-partial)
- **compound:** `compound-ingest-and-sdr-agent`
- **meta:** `meta-wf-vs-agent`
- **inline-context:** `ctx-inline-wf-add-classifier`,
  `ctx-inline-agent-add-slack`, `ctx-inline-wf-agentic-request` — these need
  real prior context (`ctx-followup-schedule-edit` shows the plan-first
  pattern for the workflow side; the agent side needs a prior agent design in
  the conversation)

Dev-process history (A/B evidence, pivot rationale, run results) lives in
[EXPERIMENT-LOG.md](EXPERIMENT-LOG.md) — throwaway, safe to delete once the
approach discussion is settled.
