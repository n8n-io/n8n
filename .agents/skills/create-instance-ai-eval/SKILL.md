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

> **Committing new case JSONs into the repo is no longer the recommended
> approach.** Author the file locally (uncommitted), calibrate it against a real
> build, then **push it to a curated lang-tracer suite** with
> `eval:langtracer-push` (see [Push to a lang-tracer suite](#push-to-a-lang-tracer-suite)).
> The suite is the home for the case; the eval CLI reads it back via
> `--source langtracer`. You still write the JSON file — it's just the input to
> the push, not a committed artifact.
>
> **Exception — seeded cases.** The case-write API can't hold any seeding mode, so
> seeded cases are never pushed. A `seedThread` case is a local throwaway (don't
> commit it either — it dies when its trace is pruned); a `seedFile` or
> `priorConversation` case isn't transient and has no suite home, so it's the one
> sanctioned exception — it lives as committed JSON. See [`case-shapes.md`](case-shapes.md).

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
5. **Calibrate — sharpen assertions; never dull them to force a green.** Fix
   assertions that are genuinely mis-sized: relax one that pins a choice the
   conversation left open (so a valid *alternative* build wrongly fails), tighten
   one a wrong build would slip past, and phrase `executionScenarios` to match how
   the workflow runs on mocked data. But when a scenario goes red because the
   build has a real gap, or because the harness can't exercise it, **that red is
   the result — keep it and surface why** (see "A red is signal", below). Never
   delete a scenario, weaken an assertion, or drop to build-only just to make the
   run green.
6. **Push to the suite — do NOT commit the JSON.** Once calibrated, push the case
   into its curated lang-tracer suite with `eval:langtracer-push` (see
   [Push to a lang-tracer suite](#push-to-a-lang-tracer-suite)); the suite is the
   case's home, not the repo. Leave the `data/workflows/*.json` file uncommitted
   (or delete it once it's in the suite). Committing new case JSONs into the repo
   is no longer the approach. (Exception: seeded cases can't be pushed — a
   `seedFile`/`priorConversation` case stays committed JSON, a `seedThread` case is
   a local throwaway; see [`case-shapes.md`](case-shapes.md).)

`--iterations N` is available to measure flakiness (pass@k / pass^k) — reach for
it when you suspect a case is non-deterministic or before promoting it to a
gated tier, not as a routine step (each iteration is a full build + execution).

Gut-check: if you can't picture a plausible *wrong* build that this case
reliably turns **red**, the assertions are too loose to guard anything.

**Confirm the precondition fired, not just the green.** For any *conditional*
assertion — "when X happened, the agent did Y" (most `processExpectations`, and
any behaviour case) — a pass has two readings: the agent did Y, or **X never
happened** and the assertion passed vacuously. A behaviour case that hinges on
the mock producing a specific failure (e.g. an AI node simulated to empty so a
downstream parse node fails) is the classic trap: if the mock instead returns
parseable data, the failure never occurs and the case guards nothing while
showing green. Calibration must read the execution trace and the agent's
`finalText` (`buildTrace.finalText` in the verifier snapshot, or the HTML report)
and verify X actually materialised — the direct-loop `eval-results.json` does not
persist per-expectation judge reasoning, so pass/fail alone can't tell you which
reading you got.

**A sourced failure that no longer reproduces is still worth keeping — it's now a
regression guard.** When you encode a real failure and calibration shows the
current build handling it correctly (behaviour drifts across versions), the case
doesn't lose value: it flips from *capability-gap* (currently red) to *regression
guard* (currently green, catches a re-introduction). Keep it — but only after the
non-vacuous check above proves it *would* turn red on the bad behaviour, else the
"guard" guards nothing.

## A red is signal — surface it, don't work around it

Calibration exists to right-size assertions, **not** to make a case pass. When a
run turns a scenario or expectation red, classify the red first — then keep it:

- **Real build / capability gap** — the agent's workflow is wrong or missing
  something the user asked for (a miswired branch, a missing retry, wrong field
  keys). This is exactly what the eval is for. **Keep it red.** Don't loosen the
  assertion or drop the scenario; a currently-red gap is the capability signal
  today, and a re-introduction guard once the builder improves.
- **Harness limitation** — the build is correct but the mock/execution layer
  can't exercise the path (see "Known harness limitations", below). **Keep the
  scenario and say so in its `description`** — that this red is harness-caused,
  not a build defect — so nobody misreads it as a product bug. Keep it out of
  gated tiers if it hard-fails every run; when the harness gains the capability it
  starts earning its keep with no re-authoring.
- **Genuine non-determinism** — the *same* build flips green/red across runs.
  This is the only real "noise". Confirm it with `--iterations N` before calling
  it flaky, then de-tier and note it; deletion is the last resort.

The one move to never make is **working around a red by weakening what the case
checks** — deleting a failing scenario, loosening an assertion until a wrong
build would pass, or quietly converting to build-only. That makes the suite look
greener than the product is, which is the opposite of the eval's job: bugs and
harness gaps are the deliverable, so **highlight them, don't engineer around
them**. If you catch yourself editing a case so that a known-bad build would now
pass, stop.

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
- **Data Table *reads* are pinned to the scenario.** A read op (`get` /
  `rowExists` / `rowNotExists`) is treated as the scenario's "stored state" and
  pinned with data derived from your `dataSetup`, so change-detection / dedup /
  "last seen" scenarios *can* be exercised — describe the stored rows in
  `dataSetup`. Two caveats: the pinned rows are LLM-generated (steered, not
  byte-exact — don't assert exact values off them), and *writes/inserts* aren't
  pinned (they hit the real per-thread table, recreated schema-only with **no
  rows**), so read-after-write within one run isn't faithful — the read reflects
  `dataSetup`, not what the run just wrote.
- Don't assert exact counts that depend on mock generation ("exactly 7 posts").
  Say "fewer than the original 10".

### Known harness limitations that turn scenarios red regardless of the build

These produce a **reliable** red on a *correct* build. Don't engineer around them
— write the scenario for the behaviour you want and note in `description` that the
red is harness-caused (per "A red is signal", above):

- **Resource-locator fields left empty for setup** (Google Sheets / Drive /
  Calendar and similar node pickers). The agent legitimately leaves the
  document/folder/calendar ID blank for the user to pick at setup; the mock
  substitutes `__evalMockResource`, and the node then crashes looking it up
  ("Sheet with ID __evalMockResource not found", or "Cannot read properties of
  undefined"). Any scenario whose success path runs *through* such a node
  hard-fails before anything downstream executes.
- **Trigger and Data-Table-read pin data is *LLM-generated*, so not byte-exact.**
  Both are steered by your `dataSetup` (see the mock-layer section above — you
  *can* influence what a trigger emits or what a stored-row read returns), but
  because the values are generated, a scenario that asserts exact values or counts
  off them is flaky. Assert shape/branch/relative facts, not exact figures. (The
  residual hard red here: polling / form triggers still occasionally fail to load
  entirely — "workflow not found".)
- **Mock response shape** — for a less-common API the LLM-generated response can
  omit the real envelope (e.g. Gemini's top-level `candidates`), crashing a
  downstream parse/format node.
- **A build can time out and produce no scored result at all** — the run reports
  `BUILD FAILED: Run timed out` and zero graded expectations. Don't assume "spec
  too big": the more common cause is a **single-prompt case where the agent asks
  a clarifying `ask-user` question** and the build hangs on the unanswered
  question until the per-iteration timeout (see [`case-shapes.md`](case-shapes.md)
  — only confirmations auto-approve). Before treating a timeout as spec size,
  **classify it**: read the agent's final response in the report / trace (did it
  ask a question? flag an infeasibility? or genuinely churn through a huge
  build?), and **re-run the case solo (`--concurrency 1`)** — concurrency makes a
  stalled build hit the cap and masks the real reason, which a solo run surfaces
  in seconds. Fix per cause: a clarifying-question stall → author multi-turn with
  a director note that pre-answers it; a genuine infeasibility → it's an
  infeasibility/honesty behaviour case (`processExpectations`), not a build case;
  a true oversized spec → the timeout is itself a finding, but note it so the
  zero isn't mistaken for a scored failure.

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
- **Harness limitations (surface them, don't hide them).** Some paths hard-fail
  on a correct build regardless of `dataSetup` — empty resource-locator fields
  that crash Sheets/Drive/Calendar nodes, polling triggers failing to load (see
  "Known harness limitations" above). (State-bearing Data Table *reads* are no
  longer in this bucket — they're pinned from `dataSetup`; only the write path and
  exact-value assertions stay unreliable.) The fix is to *document*, not to *work
  around*: note the limitation in `description` and keep a hard-failing scenario
  out of gated tiers.
  Only when a scenario flips **non-deterministically** run to run is it genuine
  noise worth removing — a scenario that reliably fails for a documented harness
  reason is a standing record of what the harness can't yet test, and stays.

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

## Push to a lang-tracer suite

Once a case is calibrated, push it (and any others) up into a curated lang-tracer
suite instead of committing the JSON. `eval:langtracer-push` **upserts** over the
REST API: it creates cases missing from the suite, updates ones whose content
drifted, leaves the rest unchanged, and never prunes. It's the inverse of
`--source langtracer` (which pulls a suite down).

```bash
cd packages/@n8n/instance-ai
# preview first — no writes:
dotenvx run -f .env.eval -- pnpm eval:langtracer-push --suite workflow-building --dry-run --changed
# then push (drop --dry-run):
dotenvx run -f .env.eval -- pnpm eval:langtracer-push --suite workflow-building --changed
```

- **Selectors** (at least one required — no accidental push-all): positional
  `<slugs...>` (exact file slugs), `--changed` (new/untracked + staged + modified
  `data/workflows/*.json`, ideal right after authoring an uncommitted case),
  `--filter`/`--tier` (with `--exclude` as a modifier).
- **Env:** `LANGTRACER_URL` + `LANGTRACER_API_KEY` (an `lt_` bearer; one key works
  for MCP + REST) — put them in `.env.eval` and run under `dotenvx`.
- **Options:** `--set-kind regression|capability_gap` (default `regression`, must
  match the suite's kind), `--contains-user-data` (default is `synthetic`).
- **Limitation:** `executionScenarios` are written on **create** only — the update
  path patches case-level fields but not scenario rows (so scenario-only edits to
  an existing case aren't re-synced; remove+re-push or edit in the lang-tracer UI).
- **Seeded cases can't be pushed:** the case-write API rejects every seeding mode
  (`seedThread` / `seedFile` / `priorConversation`), so the push lists them under
  `skipped:` and they never reach the suite. A `seedThread` case shouldn't be
  committed either — it dies when its trace is pruned or deleted — so derive a
  durable synthetic case as the artifact instead. A `seedFile`/`priorConversation`
  case isn't transient and has no suite home, so it's the one exception to
  "don't commit the JSON" — it lives as a committed artifact.

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
