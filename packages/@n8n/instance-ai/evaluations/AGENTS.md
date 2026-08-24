# AGENTS.md — context evals

Guidance for agents working on the Instance AI **context evaluation** suite. Read
[`CONTEXT-EVALS.md`](./CONTEXT-EVALS.md) first if you only need to *run* something; this file
is the full inventory, the design rules, and the traps.

> [!IMPORTANT]
> **Branch off `context-hack-eval-prep`, not `master`.** None of this exists on master, and
> the PR is deliberately never merging.
> ```bash
> git fetch origin && git checkout -b my-idea origin/context-hack-eval-prep
> ```
> CI on that branch fails **PR Size Limit** and **Required PR Quality Checks**. Both are
> expected consequences of one large PR. Do **not** try to fix, override or split them. Local
> gates still apply: `pnpm typecheck`, `pnpm lint`, `pnpm vitest run evaluations` before every
> commit.

---

## What this suite is for

Measure whether a change to how the agent **gets, keeps, or uses context** made things better,
worse, or only cheaper. It does not tune the agent. If a piece of work doesn't make a context
change measurable, it's out of scope here.

## External sources

| Where | What's there |
|---|---|
| [Linear project: Context — Update AIA eval suite](https://linear.app/n8n/project/context-update-aia-eval-suite-for-measuring-context-907b1cdb3ae0) | Every ticket, with per-run numbers and the reasoning in comments. **The durable record** — this branch never merges, so the tickets outlive it. |
| [GitHub PR #36739](https://github.com/n8n-io/n8n/pull/36739) | The whole diff, draft, with a written summary per capability. |
| [Notion: Context team](https://app.notion.com/p/n8n/Context-team-3b55b6e0c94f802eaafcce206a2b3b6d) | Team mission, metric planning, *Measuring impact of context*. |
| `CONTEXT-82` / `CONTEXT-83` | Product/docs findings handed off — the missing window knob, and the agent re-asking for what it already has. |

Ticket map: **67** context-state grading · **68** per-case cost · **69** forced compression
(parked) · **70** external docs · **71** needle probes · **72** stale facts · **73** session
boundary · **74** execution history · **75** cross-workflow · **78** present-vs-used ·
**79** grading anchor · **80** red baseline · **81** coverage gaps.

---

## What was built

Four grading and reporting capabilities, each independent of the workflow judge, so a miss is
attributable to **recall** rather than to the build.

**`memoryExpectations`** — judged claims about context state. Deliberately does **not** receive
the transcript: the transcript contains turns long since evicted, so grading against it would
satisfy "the agent still knew X" from the moment X was first *said*. Context the agent fetched
through tools is included, rendered in full, because a retrieval system's whole output arrives
as tool results.

**`contextAssertions`** — deterministic substring checks. No LLM, so no hallucination and no
rubric, and it searches the **untruncated** context at both levels the judge's view is capped
(per-tier limits *and* the per-tool-payload limit).

**`anchor: 'probe' | 'turn-end'`** — which moment a claim is about. `probe` = state when the
request arrived, for *retention* claims. `turn-end` = for *within-turn retrieval*. Claims are
grouped by anchor and judged one call per group, so the judge is never asked to infer which
moment a claim meant.

**Context × build classification** — `working` / `unattributed-success` / `context-ignored` /
`retrieval-gap`, derived from stored verdicts, so past runs reclassify without re-running.

**Per-case cost** — cache-aware tokens and tool calls, plus a two-arm report priced locally.

**Seeding primitives** — `seed.sessionBoundary` (history in a separate thread; artifacts cross,
conversation doesn't) and `seed.priorRuns` (execute seeded workflows *before* the graded turn,
so execution history exists to ask about).

---

## Case inventory — and what each family is *for*

Not every case is a baseline. Trying to make them all red would be the wrong fix.

### Red baselines (4) — pass-rate moves when your idea works

`*-across-a-session-boundary` — a standing preference stated in a prior session. Every memory
tier is thread-scoped, so it cannot reach the graded turn. `retrieval-gap` 8/8, and the process
expectation passes in all 8: **the agent behaves correctly and only the memory is missing.**
That's deliberate — a red baseline where the agent also misbehaves would conflate a memory gap
with an honesty gap, and fixing either would flip it.

### Regression guards (~14) — catch a change that *breaks* something

| Family | Cases | Measured |
|---|---|---|
| `recalls-*` needle probes | 6 | 83/83 context claims pass, depths 1→21 |
| `discloses-*` stale facts | 4 | 96/99; genuine over-trust survives |
| execution history | 3 | multi-record aggregation works (lists 6, debugs 2 non-latest) |
| cross-workflow conventions | 1 | 88%, `context-ignored` — fetches siblings, drops their retry settings |

### Cost baselines — the second axis at quality ceiling

Every case records tokens and tool calls. The external-docs A/B is the worked example: denying
the source was **33% more expensive** at worse quality.

---

## Authoring rules, each learned from a real run

1. **Anchor retrieval claims at `turn-end`.** Tool calls land at step 2+; the probe snapshot is
   step 1. A retrieval claim at `probe` fails every time regardless of whether retrieval worked.
2. **Assert identifiers, not dates or quantities.** Exact matching can't see paraphrase.
3. **Assert something only the target surface can contain.** For execution history, `failedNode`
   is a field of the executions debug payload — it cannot come from the workflow definition, so
   its presence *proves* the record was read.
4. **A red baseline is worth more when the agent behaves correctly.** Isolate one deficit.
5. **Name all three tiers** when claiming a fact is in context. Compression doesn't run at
   default thresholds, so a claim naming only the observation block is unpassable.
6. **Never put a stage direction in a turn that also carries user content**, or in the opening
   turn. Both fail silently — the proxy reads the whole turn as instruction and drops the content.
7. **`priorRuns.hints` steers a failure's nature, not its literal body.** A hinted
   `quota_exceeded` came back as "The service is receiving too many requests from you".
8. **Seeding renames artifacts** — a ` [seed <8hex>]` suffix is appended, so an authored name
   never matches the instance name.

## Where a measurable deficit actually exists

A case can only be red for a *context* reason if it needs context the product **cannot obtain**:

| Deficit | Covered |
|---|---|
| Cross-session persistence | ✅ the red family |
| **Cross-thread prior work** | ❌ best next candidate — guaranteed red, no product change needed |
| Volume / eviction | ❌ blocked on CONTEXT-82 |
| Systems outside n8n | ~ partly, the docs deny arm |

Anything else asks whether the agent *uses* what it already has. Diagnostic, but a memory system
won't move it.

---

## Two things that will mislead you

**A grader that is wrong returns a number, not an error.** Four measurement bugs on this branch
each produced a plausible, publishable-looking finding *about the agent*. Fixing them moved
three cases from 0%, 0% and 63% to 100%, 100% and 88% **with no product change**. So: every
harness fix ships with a test verified by putting the bug back and watching it fail. Ask "could
the harness be producing this?" before writing a finding down.

**Judges describe causes confidently and can be wrong about them.** One said a failure was
"blocked by the build guard"; the seed proved the agent had changed the setting itself. Check
the state a judge describes, not just its wording.

**Numbers measured before 2026-08-21 are retracted.** Don't quote them.

---

## Conventions

- New JSON in `data/workflows/` needs no registration — the directory auto-loads.
- Always set `datasets: ["memory"]`, so cases run only under `--tier memory` and can't pollute
  `full`/`pr`.
- No ticket IDs in code, comments, filenames or test names.
- Env values are never printed. Source the file, check presence and length, pass secrets via
  stdin rather than argv.
