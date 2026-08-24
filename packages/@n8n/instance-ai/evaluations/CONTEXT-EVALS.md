# Context evals — recipe card

Everything you need to measure a context-management idea. **~5 minutes to read.**

> [!IMPORTANT]
> **Branch off `context-hack-eval-prep`, not `master`.** None of this exists on master and
> the PR is never merging. `git fetch origin && git checkout -b my-idea origin/context-hack-eval-prep`

---

## 1. Read this first: measurement is three numbers, not one

The most likely way to mismeasure your own work is to run the suite, look at one aggregate
pass rate, and conclude nothing changed.

| Number | What it tells you |
|---|---|
| **Red baseline moves** | Your idea worked. 4 cases that cannot pass today. |
| **Guards stay green** | You didn't break anything. ~14 cases the agent already passes. |
| **Cost drops at equal quality** | Still a win. Tokens + tool calls are recorded per case. |

Why guards matter as much as the baseline: a context change is at least as likely to
**break** a working capability as to add one. Aggressive compression that loses multi-run
aggregation, or a retrieval layer that only surfaces the latest record, would show up
nowhere else.

---

## 2. If you're testing X, run Y, watch Z

```bash
cd packages/@n8n/instance-ai
pnpm eval:instance-ai --tier memory --iterations 5
```

`--filter` takes **comma-separated substrings** matched against the case filename — not globs.
`--filter across-a-session-boundary` selects the whole red family; `--exclude` works the same way.

| Testing… | Run | Watch |
|---|---|---|
| **Cross-session memory, preference store** | `--filter across-a-session-boundary` (4 cases) | Do they turn **green**? This is the before/after. |
| **Retrieval over instance state** | `--tier memory` | `retrieval-gap` → your problem. `context-ignored` → not a retrieval problem. |
| **Compression / summarisation** | `--tier memory` + lowered thresholds (§3) | Guards stay green; tool-call count. |
| **Cheaper context, same quality** | two runs → `build-cost-report` (§4) | cost per **green** iteration. |
| **External docs / search** | `--source langtracer --suite baseline --filter researches-keyless-api-before-building,honest-when-web-search-denied` | quality **and** cost. |
| **Execution history** | `--filter diagnoses-the-last-run-instead-of-asking,checks-the-record-before-accepting-a-false-premise,finds-the-failure-pattern-across-several-runs` | multi-record retrieval still happening? |

**The red baseline, explicitly** — 4 cases, `retrieval-gap` in 8/8 iterations. A preference is
stated in a *prior session*; every memory tier is thread-scoped, so it cannot reach the graded
turn. The agent behaves correctly in all 8 (it asks rather than inventing), so **only real
persistence can flip these**:

```
carries-a-standing-preference-across-a-session-boundary   #ops-escalations
routes-through-the-house-gateway-across-a-session-boundary gw.internal.acme
applies-the-house-naming-prefix-across-a-session-boundary  ACME-OPS-
tags-work-for-review-across-a-session-boundary             needs-review
```

---

## 3. Setup

```bash
# Node 24 is a hard gate — bin/n8n exits below it, no bypass.
node --version   # must be >= 24

# Source the env. Keys only — never print a value.
set -a
. packages/cli/.env
. packages/@n8n/instance-ai/.env
set +a

# Local licence can't mint an Instance AI proxy token; this forces direct mode.
export N8N_AI_ASSISTANT_BASE_URL=""

./packages/cli/bin/n8n start   # comes up on 5678
```

`N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true` must be set **on the backend** — everything that
grades context state degrades to `incomplete` without it (with an explicit reason, not a
silent pass).

**To make compression actually fire** (it never does at defaults — Observer 30K, Reflector
40K, and no case gets close):

```bash
export N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS=2000
export N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS=500
```

Verify: memory jobs log `outcome: "ran"` instead of `"skipped"`.

---

## 4. Comparing two arms on cost

```bash
pnpm tsx evaluations/cli/build-cost-report.ts \
  --results runs/before/eval-results.json \
  --results runs/after/eval-results.json \
  --label before --label after
```

Reports cost per build **and cost per green iteration** — the second is the one that matters,
because a cheap arm that fails everything is not cheap.

Cache classes are kept separate on purpose. One real build: **365,573 cache-read tokens
against 16 uncached.** A single "input tokens" figure hides the term your change actually moves.

---

## 5. Five gotchas that will cost you a day

1. **Compression never fires at defaults.** See §3. Every observational-memory task logs
   `skipped` until you lower the thresholds.
2. **Pick the right `anchor`.** A claim about a fact *carried in* grades at `probe` (default);
   a claim about something the agent *fetched during the turn* must be `anchor: "turn-end"`.
   Tool calls land after the request arrives, so a retrieval claim at `probe` **can never
   pass**. This silently inverted one case's conclusion from "build retrieval" to "retrieval
   already works".
3. **Assert identifiers, not dates or quantities.** Exact matching can't see paraphrase. One
   case passed 10/10 twice while the same fact appeared as `2026-03-01T00:00:00Z` in one run
   and as prose in the other — the literal assertion would have passed one and failed the
   other on identical behaviour.
4. **`--iterations` defaults to 1, and n=3 is not enough.** The same unchanged case produced
   a genuine failure 3-of-3 one day and 1-of-3 the next. Use **≥5** for anything you quote.
5. **The Brave key has no `N8N_` prefix** — `INSTANCE_AI_BRAVE_SEARCH_API_KEY`. The prefixed
   spelling binds to nothing and degrades silently to "search disabled".

---

## 6. What we already know (so you don't re-derive it)

- **Retention is not the bottleneck.** 83/83 context claims pass, at depths 1 → 21 turns.
  Facts inside a thread are simply present.
- **Most failures are about *use*, not retrieval.** The agent asks for what it already has,
  applies one half of a two-part instruction, fetches sibling workflows then ignores their
  retry settings. **A memory system moves none of these.**
- **Cross-session is the only real deficit.** That's where memory work pays, and it's the one
  place with a genuine red baseline.
- **Denying context cost 33% *more*** at worse quality — the starved agent improvises around
  the block, and improvising is expensive. Not a quality/cost tradeoff.
- **The agent misreports its own sources under deprivation** — it claimed it had checked docs
  it never read. That's the signal your change most needs us to be able to trust.

**Still blocked:** volume/eviction. The sliding window the docs describe doesn't exist in
code — the whole thread loads every run. The `limit` plumbing is already implemented in both
stores and simply never called (~1–3 days to wire). See CONTEXT-82.

---

## Deeper reading

- [`AGENTS.md`](./AGENTS.md) — for agents, and for the full inventory + external links
- [`README.md`](./README.md) — the harness itself: authoring rules, expectation kinds
