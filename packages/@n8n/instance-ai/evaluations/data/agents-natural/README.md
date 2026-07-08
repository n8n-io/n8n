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

**Faster iterations — local-process lanes.** A natural-arm case-run is a real
build turn (~2–2.5 min), so wall time is dominated by parallelism. After
`pnpm build`, boot extra lanes from the same dist (no docker) and fan out:

```bash
./scripts/boot-local-eval-lanes.sh 2            # lanes on :5682/:5684, seeded
pnpm eval:agents-natural --iterations 3 \
  --base-url http://localhost:5680,http://localhost:5682,http://localhost:5684 \
  --concurrency 9
./scripts/boot-local-eval-lanes.sh --teardown   # when done
```

Keep `LANGSMITH_API_KEY` set — the work-stealing lane allocator only runs on
the LangSmith path (the direct loop pins each case to a single lane). Watch
for Anthropic 429s beyond ~3 lanes on one key. For docker lanes from a built
`n8nio/n8n:local` image, use `scripts/run-eval-lanes.sh` instead.

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

Arm A (exam tier, same 7 siblings, N=1, LangSmith mode) for comparison: every
explanation expectation passed, skill-load passed 5/7 (the trivial weather case
and the meta case made zero tool calls) — and **zero `intent:` exact-match
verdicts were produced**. Root cause: the LangSmith `evaluate()` path judges
expectations inside `getOrBuild` (`cli/index.ts`), which was never wired to
`gradeIntentExpectation` — the deterministic grader only runs in the direct
loop (`harness/runner.ts`). With a LANGSMITH key in env (the CI norm), the
exam tier's headline metric silently disappears. The natural arm is immune by
construction: it uses only `processExpectations`/`outcomeExpectations`, which
every grading path already handles.

## Intent-gate experiment (system-prompt routing change, same branch)

The smoke exposed *why* the skill never loads on real requests: the system
prompt's routing table sends any build phrasing straight to `workflow-builder`
("Default path for all single-workflow work"), has **no routing bullet for
agent builds at all** (`agent_builder` appears only in a negative fence), and
that fence keys on surface vocabulary ("when the user asked for a workflow").
The change (module-gated, in `src/agent/system-prompt.ts`): the intent hint
becomes an explicit **intent gate** for new-automation builds, an
agent-build routing bullet is added, and the fence keys on the gate's
classification instead of the word "workflow". Post-change natural-arm run
(N=1, 2026-07-08):

- **Skill-load 1/6 → 6/6.** Every routing case now loads intent-recognition
  before choosing a path.
- **`nat-adv-says-wf-is-agent` fixed** — takes the agent-builder route instead
  of building a chat-trigger workflow.
- **`nat-adv-says-agent-is-wf` fixed at the anchor level** (builds a scheduled
  workflow, does not create an agent) — but the workflow still embeds an AI
  Agent node ('Write Weather Summary') for what is a bounded summarization
  step, so the embeds outcome expectation stays red. The vocabulary prior
  survives *inside* workflow-builder at node-choice level: routing
  classification alone doesn't reach it. Follow-up: the bounded-transformer vs
  embedded-agent distinction needs to land in workflow-builder guidance, not
  only in intent-recognition.
- All other cases stayed green (17/18 units). The remaining red is kept red —
  it is the finding.
