---
name: n8n:create-instance-ai-eval
description: >-
  Authors a new Instance AI workflow eval case in
  packages/@n8n/instance-ai/evaluations/data/workflows — build cases,
  behaviour/process cases, credential cases, and seeded (mid-conversation)
  cases — with intent-driven expectations calibrated against a real build. Use
  when adding or changing an Instance AI workflow eval, or debugging why one is
  flaky.
---

# Create an Instance AI workflow eval

Each eval is **one JSON file** in
`packages/@n8n/instance-ai/evaluations/data/workflows/`. The loader
auto-discovers `*.json` and validates against
[`schema.ts`](../../../packages/@n8n/instance-ai/evaluations/data/workflows/schema.ts)
(`.strict()` — unknown keys fail at load). No registration step. The eval
[README](../../../packages/@n8n/instance-ai/evaluations/README.md) is the
exhaustive field reference; this skill is the opinionated *how*.

## Where the best cases come from

The strongest cases encode a **real** failure, not an invented premise. Two
connections help you find and verify one: **LangTracer** clusters real
conversations into capability-gap themes (discover what actually fails, at
scale), and **LangSmith** holds the raw traces (verify exactly what happened in a
run). LangTracer is the discovery layer; the durable artifact is almost always a
synthetic case you author from what you learn (use `seedThread` only per
[`case-shapes.md`](case-shapes.md)). See
[`sourcing-cases.md`](sourcing-cases.md) for connecting the MCPs and the
discover → verify → encode workflow.

## Pick the case shape first

The corpus is four archetypes. Decide which you're writing before you draft — it
determines the fields, the grading, and how you validate. They compose (a seeded
case can still assert outcome), but the primary shape drives the work.

| Archetype | Question it answers | Primary fields |
|---|---|---|
| **Build** (default) | Does the workflow the agent builds actually *work*? | `outcomeExpectations` + `executionScenarios` |
| **Behaviour / process** | Does the agent *converse* correctly (ask the right clarifying question, not re-ask, honour a correction, respect plan approval)? | `processExpectations` + multi-turn director script; often **build-only** |
| **Credential** | Does the build behave correctly given a specific credential view? | `credentials[]` |
| **Seeded** | Reproduce a conversation mid-thread and drive the turn under test | `seedThread` / `priorConversation` / `seedFile` |

**Build** is documented in full below. The other three, the director-script
vocabulary, and the seeding modes are in [`case-shapes.md`](case-shapes.md).

## Core principle (all shapes)

**Write expectations from intent, then calibrate against a real build.** Decide
up front what makes *any* correct solution correct — the must-haves implied by
what the user actually said — then build the workflow once for real to calibrate
granularity: loosen what's over-specified, confirm the must-haves are
achievable, and catch requirements the agent legitimately satisfies a different
way. Don't transcribe one observed build into assertions — that overfits the
eval into "did the agent reproduce that run" instead of "did it solve the
problem."

**Keep the conversation in the user's voice.** State the goal and real
constraints the way a user would — don't name node types, wire up the structure,
or restate your `outcomeExpectations` in the prompt. If the conversation spells
out the build, the case only tests whether the agent can follow instructions and
the expectations become tautological; the gap between what the user asks for and
how a correct workflow realizes it is the capability under test. Even when the
anchor *is* honoring a user's stated technical preference, phrase it as their
need + constraint ("I need field X and the built-in node doesn't expose it, so
pull it straight from the API") — not as an implementation spec ("use an HTTP
Request node").

## Workflow

1. **State the must-haves first.** From the conversation alone, list what every
   correct workflow must do (trigger type, essential operations, gating
   condition) — those become draft `outcomeExpectations`. Required fields:
   `conversation` (≥1 turn, first `user`), `complexity`, `tags`, and **at least
   one** of `executionScenarios` / `processExpectations` / `outcomeExpectations`.
2. **Draft the case** from the template below; validate it loads (see
   "Validate").
3. **Build it once** against a running instance (see
   [`running-evals.md`](running-evals.md)) with `--keep-workflows` so the built
   workflow stays for inspection.
4. **Inspect** — read the built workflow (the run prints `BUILT (<id>)`; fetch
   via `GET /rest/workflows/<id>`) and the HTML report's transcript to see what
   the agent actually did.
5. **Calibrate** — relax any assertion the build satisfied a valid-but-different
   way, tighten any a wrong build would have slipped past, and phrase
   `executionScenarios` to match how the workflow runs on mocked data.

`--iterations N` is available to measure flakiness (pass@k / pass^k) — reach for
it when you suspect a case is non-deterministic or before promoting it to a
gated tier, not as a routine step (each iteration is a full build + execution).

Gut-check: if you can't picture a plausible *wrong* build that this case
reliably turns **red**, the assertions are too loose to guard anything.

## Example

Minimal build case:

```json
{
  "description": "What this case tests.",
  "conversation": [{ "role": "user", "text": "<the build prompt>" }],
  "complexity": "medium",
  "tags": ["build", "<nodes>", "<concepts>"],
  "triggerType": "schedule",
  "outcomeExpectations": ["<a must-have any correct workflow satisfies>"],
  "executionScenarios": [
    {
      "name": "happy-path",
      "description": "<what this run exercises>",
      "dataSetup": "<what the external services return>",
      "successCriteria": "<observable proof the run succeeded>"
    }
  ]
}
```

A fuller case with a multi-turn director script (withhold a value until asked,
push back on a wrong plan):

```json
{
  "description": "Scheduled GitHub-bugs digest to Slack. Repo and channel are withheld until the agent asks; the plan must filter to the 'bug' label before it's approved.",
  "conversation": [
    { "role": "user", "text": "Every weekday at 9am, fetch this week's open bugs from our GitHub repo and post a short summary to Slack." },
    { "role": "assistant", "text": "Which repo and which Slack channel should I use?" },
    { "role": "user", "text": [
        "[Withhold the repo and channel until the agent asks; then say the repo is 'acme/widgets' and the channel is '#eng-bugs'.",
        "When the agent shows a plan or setup card, reject it unless it filters issues to the 'bug' label — a digest of ALL issues is wrong. Once it filters to bugs, approve.]"
    ] }
  ],
  "messageBudget": 8,
  "complexity": "medium",
  "tags": ["behaviour", "build", "schedule", "http-request", "slack"],
  "triggerType": "schedule",
  "processExpectations": [
    "The agent asked for the repo and Slack channel before building, since the prompt named neither.",
    "The agent's final plan filtered issues to the 'bug' label — if its first attempt didn't, it corrected after the user pushed back rather than summarizing all issues."
  ],
  "outcomeExpectations": [
    "A Schedule Trigger runs the workflow on a recurring weekday-morning cadence.",
    "Open issues are fetched from GitHub (HTTP Request or GitHub node) and filtered to the 'bug' label before the summary is built.",
    "One Slack message summarizing the fetched bugs is posted to the #eng-bugs channel the user gave."
  ],
  "executionScenarios": [
    {
      "name": "posts-bug-digest",
      "description": "Three open bugs are returned; a summary is posted to Slack",
      "dataSetup": "The GitHub issues request returns three open issues labelled 'bug' ('Login 500', 'Timezone off by one', 'CSV export truncates'). The Slack postMessage call returns { \"ok\": true, \"ts\": \"1700000000.0003\" }.",
      "successCriteria": "The run completes without errors and posts one Slack message to #eng-bugs that references the three fetched bug titles."
    }
  ]
}
```

What each piece is doing:

- **`conversation[0]` is sent to the builder raw.** The opening turn is the real
  prompt — never put a `[director note]` in it (it would leak verbatim).
- **The `[bracketed]` turn is a director script** for the user-proxy — behaviour,
  never spoken. Here it withholds values until asked and rejects a plan that
  misses the label filter. Keep the whole script in one turn and encode ordering
  inside it (don't fabricate assistant "done" turns to sequence steps — see
  [`case-shapes.md`](case-shapes.md)). `applies-each-change-when-asked` is a good
  real example.
- **`dataSetup` describes only what external services return.** That's the layer
  the harness controls (below).

## `dataSetup` and the mock layer

The harness mocks by **intercepting outbound HTTP requests to external services**
and having an LLM answer them from the node's config and API docs. It does **not**
let you set a node's output directly, and it does **not** mock n8n internals
(Code/Set/Merge/IF/Switch run for real on the mocked data; triggers and DB
nodes get LLM-generated pin data). So:

- Write `dataSetup` as **what each external service returns** ("the GitHub
  request returns three issues labelled bug"), not as node outputs or internal
  state.
- The strongest scenarios exercise **external-service responses** — that's what
  the harness reproduces most faithfully.
- **Data tables are never mocked.** Any scenario that reads a stored value and
  compares (change-detection, dedup, "last seen") is unreliable — see "harness
  flakiness" below.
- Don't assert exact counts that depend on mock generation ("exactly 7 posts").
  Say "fewer than the original 10".

## outcomeExpectations vs processExpectations

Both are natural-language assertions graded by the same Sonnet judge, and each
**counts as a pass-rate unit**. They judge different surfaces:

- **`outcomeExpectations`** — the **resulting workflow**, judged from the
  workflow JSON. Assert node choices and configuration, connection topology and
  branch wiring, data/expression references, trigger cadence, gating conditions.
  They run everywhere, including prebuilt/MCP runs (no transcript needed).
- **`processExpectations`** — **how the agent behaved during the build**, judged
  from the transcript. Assert clarifying questions asked (or not re-asked),
  tool-call behaviour, plan/approval handling, batching, honouring a correction,
  ordering. They need a transcript, so they're **skipped in prebuilt/MCP runs**.

Rule of thumb: an assertion about *the artifact* is an outcome expectation; an
assertion about *the conversation or the agent's choices along the way* is a
process expectation. A case with **no** `executionScenarios` is a valid
**build-only** case, graded by these expectations plus the workflow checks.

## Sizing each assertion

Right-size against **what the agent was actually told**. An assertion is
well-sized when every correct build passes it and a wrong or lazy build fails
it — and it holds the agent only to what the conversation specified, not to one
run's arbitrary choices. Two failure modes:

- **Too tight** — pins a choice the conversation *left open*. If the prompt never
  named a vendor, "calls flightaware.com" fails a valid build that used a
  different source. **But if the conversation specified it, pin it** — when the
  user said "email me via Gmail," "sends via a Gmail node" is correct and
  *required*, not too tight.
- **Too loose** — a non-solution would also pass. "Fetches data from somewhere"
  passes a workflow that fetches but never compares — it doesn't prove the
  change-detection the prompt asked for.

Quick check — the *substitution test*: would a reasonable alternative
implementation *of what the user asked for* still pass? Examples (flight-status
case, where the source and channel were **left unspecified**):

| Verdict | Assertion | Why |
|---|---|---|
| ❌ too tight | "Has an HTTP Request node calling `flightaware.com`" | Vendor was unspecified; a valid AeroDataBox build fails. (If the user *had* said "scrape FlightAware", this would be correct.) |
| ❌ too loose | "Fetches flight data from somewhere" | A workflow that fetches but never compares passes — doesn't prove change-detection. |
| ✅ right | "Persists the previously-seen status and compares it to the freshly-fetched one" | The defining behaviour; substitution-proof across vendors and storage choices. |
| ✅ right | "Alert is sent only on the change-detected branch, gated by a conditional" | Proves the gate without pinning node or channel. |

Put intent the conversation only *implied* (a preferred but unstated channel) in
`processExpectations`, not `outcomeExpectations`.

## Robust design vs harness flakiness

Two different things — keep them apart:

- **Robust assertion design (always do this).** The agent's unspecified choices
  vary run to run. Source-agnostic `outcomeExpectations` for an unspecified
  source aren't a concession to flakiness — they're the *correct* assertion.
- **Harness flakiness (a defect — mitigate, don't accept).** The mock layer
  doesn't reliably honour `dataSetup` for **state-bearing reads** (a data-table
  "previous value"), so change-detection scenarios can flip run to run. When you
  hit it: tighten `dataSetup`, move the fragile intent to a `processExpectation`,
  or keep the scenario out of gated tiers — and note it in `description`. A
  scenario whose pass/fail is noise is worse than no scenario.

## Negative execution scenarios

Don't stop at the happy path — but only assert graceful handling the prompt
actually implied. Most agent-built workflows don't add error handling by
default, so "the workflow crashes on bad input" is a legitimate builder finding,
not a test-case bug. Where graceful handling *is* expected, phrase
`successCriteria` as the *absence* of the wrong action ("no alert is sent", "run
completes without error") as much as the presence of the right one: empty /
not-found source, source error / timeout, malformed response.

## Relationship to the always-on workflow checks

Every successful build is also graded by ~28 always-on binary checks across 7
dimensions (structure, topology, parameter correctness, intent, AI wiring,
craftsmanship, security) —
[`binaryChecks/checks/`](../../../packages/@n8n/instance-ai/evaluations/binaryChecks/checks).
Those are broad and low-visibility. **Writing a targeted expectation for your
specific case is still worth it even when a binary check nominally covers it** —
a named case-level assertion gives far better visibility into *this* behaviour
than one row buried in a 28-check rubric. Don't skip an assertion just because a
generic check exists.

When a scenario fails, the verifier tags a **failure category** (`builder_issue`,
`mock_issue`, `framework_issue`, `verification_failure`, `build_failure`). Treat
it as a **hint, not ground truth** — we've seen a genuine node misconfiguration
tagged `mock_issue`, and a real mock problem tagged as a build error. Open the
HTML report and check the actual execution and the generated workflow before
concluding whether the failure is your case, the build, or the harness.

## Outputs of a run

- **`workflow-eval-report.html`** (in the run's `.data/` dir) — the highest-value
  view: full conversation transcript with tool calls, per-node execution traces,
  the exact intercepted requests and the mock responses, Phase-1 hints, verifier
  reasoning, and the workflow-check rubric. Human-oriented; start here when
  debugging.
- **`eval-results.json`** — structured results (the machine-readable artifact;
  the direct loop produces this even with no LangSmith). Good for an LLM or
  script to parse.
- **`eval-pr-comment.md`** — the rendered PR comment (aggregate + regression
  comparison), always written.

## Validate (before running)

```bash
cd packages/@n8n/instance-ai
npx tsx -e "import {loadWorkflowTestCasesWithFiles} from './evaluations/data/workflows/index.ts'; console.log(loadWorkflowTestCasesWithFiles('<slug>')[0].fileSlug)"
```

## Running

You need a running n8n instance with Instance AI enabled and a working sandbox;
point the eval at it. The harness runs in three modes — **direct loop** (no
LangSmith; `eval-results.json` only), **LangSmith** (also records an experiment
+ regression comparison), and **prebuilt** (`--prebuilt-workflows`, score
existing workflows). Narrow a run with `--filter <slug>` / `--tier <name>` /
`--exclude`. See [`running-evals.md`](running-evals.md) for the run recipes,
parallel lanes, tiers, and baselines, and the
[README](../../../packages/@n8n/instance-ai/evaluations/README.md) for the full
flag list.

## Other eval harnesses (not this skill)

This skill is for `data/workflows/` cases. Three siblings exist with their own
data dirs and CLIs: **`eval:subagent`** (workflow-build compatibility corpus,
binary-check scored), **`eval:discovery`** (asserts first-hop tool/dispatch
routing, no n8n server), **`eval:pairwise`** (head-to-head build comparison vs
`ai-workflow-builder.ee`). Authoring them is out of scope here — see the README
sections of the same names.
