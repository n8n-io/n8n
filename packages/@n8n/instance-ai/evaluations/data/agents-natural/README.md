# agents-natural — natural-arm intent-routing cases (A/B vs `data/agents/`)

The `data/agents/` tier grades intent classification as an **exam**: a loader
preamble tells the agent it is classifying a hypothetical request, hands it the
anchor/`embeds_other` taxonomy, forbids clarifying questions, and requires a
fenced ```` ```intent ```` JSON block that `build-expectations/intent.ts`
exact-matches. That design measures rubric-following under exam framing — the
agent knows it is being tested, which plausibly changes behavior (observer
effect), and the fenced-block protocol had to leak into product prompts to work.

This directory is the **A/B counterpart**: the *same utterances* sent as plain
build requests, graded on what the agent actually **does** — all of it
observable in the transcript and artifacts since the agent-builder port
(PR #33384):

| Exam gold (`intentExpectation`) | Natural-arm observable |
| --- | --- |
| `{anchor: wf}` | builds via the workflow-building tools (`build_workflow`) |
| `{anchor: agent}` | takes the agent-builder route (`agent-builder` skill, `agent_builder`/`create_agent`) |
| `{anchor: clarify}` | asks a clarifying question before building (multi-turn director script declines, so the run ends cleanly) |
| `{anchor: out-of-scope}` | answers directly, no build activity |
| `embedsOther: true/false` | AI Agent node present/absent in the workflow JSON; workflow tools attached to the created agent |

## Authoring contract

- File slug is `nat-<exam-slug>`; the opening utterance is **byte-identical**
  to the exam sibling's (enforced by `__tests__/data-agents-natural.test.ts`).
- No `intentExpectation`, no preamble — routing is asserted through
  `processExpectations` (+ `outcomeExpectations` for embeds checks on the
  workflow JSON). Cases keep the sibling's tags/complexity so slice
  comparisons line up.
- **Gold stays aligned with the exam sibling even where the product might
  legitimately disagree** (e.g. chat Q&A built as a chat-trigger workflow with
  an AI Agent node vs the taxonomy's "agent-anchored"). A red here against a
  green exam run is the experiment's output — evidence of exam-framing bias or
  a taxonomy/product mismatch. Inspect it; don't re-tune the case to green.
- Clarify-bucket cases must be **multi-turn** with a director script that
  declines to elaborate — a single-turn case hangs on the unanswered ask-user
  question until the iteration timeout.

## Running the A/B

Both arms need a backend with the agents module: `N8N_ENABLED_MODULES=agents,instance-ai`
(the agent-builder route additionally needs a working sandbox workspace).

```bash
cd packages/@n8n/instance-ai

# Arm A (exam): the 7 paired siblings from the exam tier.
# --filter is comma-separated SUBSTRING matching on file slugs; the nat-* files
# also match these substrings but --tier agents drops them after load.
pnpm eval:agents --filter wf-schedule-weather-slack,adv-says-agent-is-wf,adv-says-wf-is-agent,agent-tutor-with-memory,we-daily-error-scan,clarify-important-emails,meta-what-can-you-build --iterations 3

# Arm B (natural): this tier
pnpm eval:agents-natural --iterations 3
```

Compare per paired case across iterations:

1. **Decision agreement** — exam `intent:` exact-match verdict vs the natural
   route expectation verdict. Divergence buckets to watch: `false-friend`
   (exam coaches "shape, not words" in-context; natural does not) and
   `under-specified` (the exam forbids asking; natural rewards it).
2. **Skill-load rate** — the shared "calls load_skill with intent-recognition"
   expectation. The exam's ~100% is preamble-forced; the natural rate measures
   the real routing mechanism.
3. **Noise** — per-case verdict variance across iterations, per arm.

Round 2 (after the smoke run): compound + inline-context buckets, and a small
offline compare script if manual tables stop scaling.

## Smoke status (2026-07-08, N=1 per case, directional)

All 7 cases ran end-to-end on a dedicated :5680 instance (this branch,
`N8N_ENABLED_MODULES=agents,instance-ai`): every route signature was observable
and judge-gradeable (agent-builder tool calls confirmed in the transcript for
the tutor case), the clarify director script terminated cleanly, no timeouts.
Early signal — to be confirmed with Arm A + `--iterations 3`:

- Anchor routing matched exam gold 6/7; `nat-adv-says-wf-is-agent` built a
  chat-trigger + Agent-node workflow instead of taking the agent-builder route.
- `nat-adv-says-agent-is-wf` embedded an unnecessary AI Agent node in an
  otherwise fixed weather→email pipeline (embeds mismatch — the false friend
  bites at the embeds level when unprimed).
- intent-recognition skill loaded in only 1/6 cases asserting it — the agent
  goes straight to `workflow-builder`. The exam arm's ~100% load rate is a
  preamble artifact, not product behavior.
