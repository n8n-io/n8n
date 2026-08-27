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
| **Folder / instance structure** | `--tier folders` (4 cases) | expectation pass rate **and** tokens — the fix cut both ways. Needs `feat:folders` licensed. |

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

### A worked example: the `folders` tier

Four cases (`--tier folders`) measuring whether the agent can read what is inside an n8n
folder the user names. They are the template for a two-arm capability experiment:

- **One binary, two arms.** `N8N_INSTANCE_AI_FOLDER_CONTEXT_ENABLED=false` removes
  `folderPath`/`folderId` from the advertised `workflows(list)` schema and suppresses folder
  attribution. The gate is read by the **server**, so switching arms means restarting it.
- **Make the wrong heuristic fail.** In every case the in-folder workflow names share no
  token with the folder name, and a same-named non-member sits outside it. A name filter
  therefore returns precisely the wrong set instead of accidentally the right one.
- **Grade on a value only the right path produces.** The disambiguation case asserts a node
  name unique to the in-folder workflow, and `mustAppear: false` on one unique to the decoy.
  Node names only enter context once a workflow is opened, so this separates "opened the
  right one" from "listed both".
- **`seed.workflows[].folder`** places a seeded workflow in a folder (slash path, created on
  restore). Folder creation is idempotent — folder names are *not* uniquified per run the way
  workflow names are, so without reuse `--iterations 5` leaves five identically named folders
  and the case's own folder resolves as ambiguous.

Result: 38/80 → 80/80 expectation-runs at n=5, tokens −50%.

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

### Env vars that matter

All of these normally already live in `packages/cli/.env` or
`packages/@n8n/instance-ai/.env` — check there before setting anything by hand. **Look for
keys, never print values.**

**Required, or nothing runs**

| Var | Why |
|---|---|
| `N8N_ENABLED_MODULES` | must include `instance-ai` — the module is off by default, and without it there are no `/rest/instance-ai/*` routes to talk to |
| `N8N_LICENSE_ACTIVATION_KEY` | Instance AI is licensed |
| `N8N_INSTANCE_AI_MODEL` + `N8N_INSTANCE_AI_MODEL_API_KEY` | the builder's own model. No key, no build |
| `ANTHROPIC_API_KEY` *(or `N8N_AI_ANTHROPIC_KEY`)* | the **judges** run on this, separately from the builder |
| `N8N_EVAL_EMAIL` + `N8N_EVAL_PASSWORD` | the harness logs into the instance as a real user |

**Required for anything that grades context**

| Var | Why |
|---|---|
| `N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true` | **on the backend.** This is what captures the context state. Without it every `memoryExpectation` and `contextAssertion` degrades to `incomplete` — with an explicit reason rather than a silent pass, but you get no signal |

**Sandbox — needed because builds execute code**

| Var | Why |
|---|---|
| `N8N_INSTANCE_AI_SANDBOX_ENABLED` | on |
| `DAYTONA_API_KEY` + `DAYTONA_API_URL` | direct mode reads Daytona creds straight from env. Confirm with `Sandbox: enabled=true provider=daytona (from env)` in the backend log |

**Optional but useful**

| Var | Effect |
|---|---|
| `LANGSMITH_API_KEY` (+ `LANGSMITH_ENDPOINT`) | experiment tracking and a comparison URL per run. Without it a simpler direct loop runs — fine locally, but you lose the baseline diff |
| `INSTANCE_AI_BRAVE_SEARCH_API_KEY` | web search. **No `N8N_` prefix** — see gotcha 5. Without it, search-dependent cases can't pass |
| `N8N_INSTANCE_AI_SEARXNG_URL` | alternative to Brave; no API key needed |
| `N8N_EVAL_BASE_URL` | defaults to `http://localhost:5678` |
| `N8N_INSTANCE_AI_EVAL_MODEL` | run the **judges** on a different model from the builder. Unset → falls back to `N8N_INSTANCE_AI_MODEL`, then to Sonnet |
| `N8N_INSTANCE_AI_REASONING_EFFORT` | builder reasoning effort |
| `N8N_EVAL_VERIFIER_DEBUG` | dumps the verifier's exact request — useful when a judge verdict looks wrong |

**Tuning — the knobs you'll actually experiment with**

| Var | Default | Note |
|---|---|---|
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | 30,000 | **never reached by any case** |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | 40,000 | same |

**To make compression actually fire:**

```bash
export N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS=2000
export N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS=500
```

Verify: memory jobs log `outcome: "ran"` instead of `"skipped"`. At defaults you get
`0 ran / N skipped`, which is why nothing in the suite exercised Tier 3 before.

> There is **no** window/last-messages knob, despite `docs/memory.md` documenting
> `N8N_INSTANCE_AI_LAST_MESSAGES`. It is bound to nothing. See §6.

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

## 5. Building your own case — what the harness gives you

16 declarable fields. The ones you'll reach for when measuring context:

**Establishing the state before the graded turn** — all under `seed`

| Field | Does |
|---|---|
| `seed.messages` | prior conversation, carried in the case body |
| `seed.workflows` | up to 50 workflows on the instance (names get a ` [seed <8hex>]` suffix) |
| `seed.dataTables` | tables, with schema and rows |
| `seed.agents` | up to 5 configured agents |
| `seed.sessionBoundary` | put the seeded history in a **separate thread** — artifacts cross, conversation doesn't |
| `seed.priorRuns` | **execute** seeded workflows before the turn, so execution history exists. `hints` steers success/failure |
| `seed.mode: 'replay'` | reconstruct a real conversation from its LangSmith trace instead of authoring one |
| `credentials` / `credentialFixture` | pin the credential view; opt into a browser lane |

**Grading**

| Field | Judged on | Use for |
|---|---|---|
| `processExpectations` | the transcript | behaviour — did it ask, disclose, avoid inventing |
| `outcomeExpectations` | the built workflow | did the artifact come out right |
| `memoryExpectations` | **captured context only** | did the fact reach the model. Takes `anchor` |
| `contextAssertions` | captured context, exact match | a literal value, no LLM, untruncated. Takes `anchor` and `mustAppear` |
| `executionScenarios` | a real run after the build | does the thing work |
| `messageBudget` | — | cap the multi-turn proxy |

**Steering the fake user.** Multi-turn cases are driven by a user-proxy LLM. A
`[Director note …]` in a turn instructs it — reject approvals, refuse to repeat a
detail, deny network access. That's how the deny-web-search arm works without a
provider.

**What you get back per iteration:** every verdict with its reason, the
context/build classification, cache-aware token totals, tool-call count, and the
captured context state itself.

Start by copying the case closest to your shape from `data/workflows/` — the
descriptions explain *why* each is built the way it is.

---

## 6. What the harness cannot do today

Worth knowing before you design an experiment around it.

| Gap | Consequence |
|---|---|
| **No window / eviction control** | You cannot ask "what happens when context is too big". The sliding window in `docs/memory.md` doesn't exist in code; the whole thread loads every run. ~1–3 days to wire — CONTEXT-82 |
| **Binary pass/fail, no rubric** | "Almost right" scores the same as "completely wrong", and partial credit is invisible. Contributes to the run-to-run variance in gotcha 4 — CONTEXT-76 |
| **No cross-thread context** | Only *one* boundary, and only between two threads. "You built this for me in another chat last week" is not expressible — and it's the next real red baseline |
| **Executions are run, not seeded** | Establishing 6 prior runs costs 6 real executions. Fine for a handful, too slow for hundreds |
| **No multi-user or cross-project context** | Everything is one user, one project |
| **Presence, not attention** | We can prove a fact was in the context window. We cannot show the model *attended* to it — "had it and ignored it" is inferred by crossing verdicts, not observed |
| **No automatic cost gate** | Token and tool-call numbers are recorded and can be compared, but nothing fails a run for costing more |
| **Memory tier isn't in CI** | `--tier memory` is local-only; the env passthrough was deferred — CONTEXT-77 |
| **Judges are non-deterministic** | Same case, same code, 3-of-3 one day and 1-of-3 the next. Use n≥5 and treat single runs as samples |

---

## 7. Five gotchas that will cost you a day

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

## 8. What we already know (so you don't re-derive it)

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

**Biggest open gap:** volume/eviction — see §6. The `limit` plumbing is already implemented
in both stores and simply never called, so wiring it is ~1–3 days (CONTEXT-82).

---

## Deeper reading

- [`AGENTS.md`](./AGENTS.md) — for agents, and for the full inventory + external links
- [`README.md`](./README.md) — the harness itself: authoring rules, expectation kinds
