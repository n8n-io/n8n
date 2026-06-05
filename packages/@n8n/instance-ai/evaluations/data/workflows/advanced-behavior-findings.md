# Advanced user-behavior test cases — findings (TRUST-108)

Four multi-turn cases that probe behaviours the existing `conversation` field
*can* express but hadn't been tested with, using `UserProxyLlm` unchanged. The
deliverable is calibration: does the proxy reproduce each scripted pattern, or
normalise it into cooperative behaviour?

## How the harness actually drives a build (the constraints these cases live under)

- **Only `conversation[0].text` is sent to the orchestrator** (`harness/runner.ts:223`).
  The agent generates its own turns live; it is never replayed a scripted side.
- **Later turns are reference for the proxy only** — fed in as the `## Script`
  (`utils/user-proxy/prompts.ts:90`). The proxy surfaces them at its own
  discretion, mediated by what the agent asks. They flip multi-turn mode on
  (`isMultiTurnConversation`, length > 1) but are not deterministic.
- **The agent asks via structured confirmations, not free-text chat** — primarily
  `answer_questions` (multiple-choice: `selectedOptions[]` + optional `customText`)
  and `approve_or_reject` (plan-review / free-text). The proxy responds with a
  structured action (`utils/user-proxy/tools.ts:18`).
- **The proxy is cooperative-biased**: it is told to answer every question with a
  plausible value, "invent rather than skip" (`tools.ts:59`), and after an approved
  build to `declare_done` rather than volunteer late script content (`prompts.ts:82`).

Consequence for authoring: these cases use **all-`user` scripts with the behaviour
front-loaded into turn 0** (no fake assistant turns). The only levers are the
opening message and the proxy — so each case is really a probe of whether the
proxy preserves the front-loaded behaviour or smooths it back to cooperative.

| File | Front-loaded pattern |
|------|----------------------|
| `user-gives-wrong-answer.json` | Opening targets an email where a Slack channel belongs; a later turn corrects it |
| `user-self-corrects.json` | Opening states #news / top-1 / daily; a later turn changes mind to #engineering / top-3 |
| `user-impatient.json` | Opening + reinforcement: "build it however makes sense, sensible defaults, don't ask me" |
| `user-requests-post-build-change.json` | Opening is a full build; a later turn asks to change the schedule to hourly after it's built |

## Hypotheses (pre-registered against the code)

- **wrong-answer** — the wrong value can only reach the agent if the proxy delivers
  it, but the proxy has the correction in its script and is biased to plausible
  values. Prediction: the wrong email never reaches the agent; the proxy normalises
  straight to #standups. Success criterion still asserts the build must not contain
  the email — so a "pass" means the wrongness was correctly dropped, and the
  *finding* is that the pattern wasn't exercised, not that it was handled.
- **self-corrects** — the correction is "Stated" script content and maps onto the
  proxy's primary lever (plan rejection / follow-up). Most likely to reproduce.
  Watch whether it reads as a coherent mind-change or a silent value swap.
- **impatient** — highest tension. The proxy's core directive is to answer every
  question concretely. Prediction: if the agent asks anything, the proxy invents
  specifics instead of holding the "use sensible defaults" line.
- **post-build-change** — `buildFollowUpPrompt` tells the proxy to `declare_done`
  after an approved build. Prediction: the post-build turn is **not** delivered via
  `send_follow_up_message`, so the follow-up loop may not fire — the most likely
  case to require a change.

## How to run

From `packages/@n8n/instance-ai/` against a live instance (see `evaluations/README.md`):

```bash
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter user-gives-wrong-answer --verbose
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter user-self-corrects --verbose
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter user-impatient --verbose
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter user-requests-post-build-change --verbose
```

For each run, capture the **actual transcript** the proxy produced (not just
pass/fail) and the proxy decision stats — the calibration question is whether the
proxy reproduced the scripted shape, not whether the scenario passed.

## Results (local run, 2026-06-04, Sonnet 4.6 proxy, N=1)

| Case | Pattern reproduced? | What the proxy actually did | Scenario |
|------|--------------------|------------------------------|----------|
| self-corrects | **Yes** | Steered the correction through plan **rejection** (`rejection=8, questions=3, approval=1`). Built "Daily Hacker News Top **3** to Slack" → corrected count + #engineering, not #news. | PASS (2/2) |
| wrong-answer | **No (normalised, as predicted)** | The wrong email never reached the agent; proxy resolved straight to #standups. Build contains no email node. The "pass" means the error was dropped, not that an error was handled. | PASS (1/1) |
| impatient | **Inconclusive from pass/fail** | Build succeeded with defaults. Note: the scenario only asserts the payload is stored, so PASS does **not** confirm the proxy held the "use defaults" line — it answers the agent's questions concretely (`answer_questions`), which is cooperative. Read the transcript to judge whether impatience survived. | PASS (1/1) |
| post-build-change | **No — change can't be timed** | A follow-up *does* fire (`send_follow_up_message`: "Change the schedule to run hourly…"), but at the **first** decide opportunity — right after plan approval, **before** `build-workflow` runs — so the change is folded into the initial build, not applied as a post-build edit. The PASS only proves the final schedule is hourly; it can't distinguish "built hourly from the start" from "built daily, then edited." | PASS (1/1) — but doesn't prove post-build timing |

### Notes
- **post-build-change** — the scenario PASS is misleading and the earlier "hypothesis overturned" read was wrong. Per-turn transcript (`workflow-eval-…15-19-49`):
  - Turn 1: opener → `submit-plan` → plan **approved** (no `build-workflow` yet).
  - Turn 2: the follow-up "Change the schedule to run hourly" lands **in the same turn** as the first `build-workflow` call.
  So the modification arrives pre-build and gets folded in. Verify order via the transcript step view (`build-workflow` tool-call position vs the follow-up `userMessage` turn).
- **Two structural causes** (both confirmed against the code):
  1. The multi-turn loop is `settle → decide → (send | done)` with no wait/defer (`harness/chat-loop.ts:200`), so the proxy can't hold a message for a later condition.
  2. The proxy is **state-blind**: `ingestEvents` receives the full SSE stream but keeps only agent **text** (`utils/user-proxy/index.ts:93`), so it has no "is the workflow built yet?" signal to gate on.
  - Inline script directions (parenthetical notes / screenplay beats) are reliably stripped but not enacted — notation isn't the lever; the decision logic is.
- **wrong-answer / impatient**: a scenario PASS is necessary but not sufficient to show the *behaviour* was exercised — both can pass while the proxy normalises the pattern. The calibration signal is the **transcript + proxy decision stats**, not pass/fail. A behaviour-judge grader (TRUST-93) would close this gap.
- Earlier post-build-change drafts using Google Sheets / empty-array edge cases failed on orthogonal build-quality issues (unfilled `<__PLACEHOLDER_VALUE__…>` sheet name; HTTP `[]` → 0 items skips downstream nodes). Switched to HTTP-fetch + Slack and scoped to the single behaviour-proving scenario so the case isn't masked by unrelated builder flake.
- Harness fix required to run at all: the eval generated `eval-${uuid}` thread IDs, which the server now rejects (`POST /rest/instance-ai/threads` validates `threadId` as a bare UUID). Fixed in `harness/runner.ts`.

## Decision (per TRUST-108)

- **self-correct → no schema change.** A mid-build change of mind is delivered by the proxy (via plan rejection) and applied by the agent. Authorable with the `conversation` field as-is.
- **post-build timing → proxy-prompt/loop work + the state-control spike.** The change can't be timed today; the follow-up always fires at the first opportunity and is folded into the initial build. Not a `WorkflowTestCase` schema gap — the fix is in the proxy/loop. (Verifying change-after-build order is already free via the transcript step view.)
- **wrong-answer / impatient**: expressible in `conversation[0]`, but whether the cooperative proxy *preserves* them can only be judged from the transcript — the behaviour-judge grader's job (TRUST-93), not a new field. Adding fields to `WorkflowTestCase` is out of scope for this ticket.

### Recommendations
1. **Give the proxy build-state awareness** — surface a timeline from the events it already receives (reuse `buildTranscriptFromEvents`), and teach `decideFollowUp` to honor timing directions.
2. **For true post-build timing, add a `defer` decision to the loop** — gated on a quick spike: does the planned build self-progress as a tracked background task, or only fire when the user speaks? (Overlaps the deterministic replay / state-control ticket, TRUST-149.)

_Verdict (N=1, needs repeats to firm up): self-correct reproduces with the existing `conversation` field — no change needed. Post-build timing is genuinely broken (folded-in, not deferred) and needs proxy-prompt/loop work (rec. 1) plus the state-control spike (rec. 2). wrong-answer normalises away and impatient can't be confirmed from pass/fail; both await TRUST-93 behaviour grading rather than a schema change._
