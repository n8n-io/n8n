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

**One deliberate exception:** `ctx-iterative-build-gate-once` runs a real
build with several follow-up changes (director-scripted, one message at a
time) to prove the gate fires exactly once and the approach stays stable
across an iterative build — plan amendments alone can't exercise that. It
carries an outcome expectation so the "loaded only once" verdict can't pass
vacuously when no changes actually landed.

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
sandbox-staging temp dir.
