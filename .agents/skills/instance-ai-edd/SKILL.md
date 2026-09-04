---
name: n8n:instance-ai-edd
description: >-
  Eval-driven development for an Instance AI change — state a falsifiable claim,
  find or author the unit that guards it, baseline the unchanged tree, make the
  change, and measure before/after locally with `eval:compare-local`. Use when
  changing Instance AI behaviour (prompts, tools, subagents, skills, routing,
  the workflow loop), when asked "will this regress anything", "how do I test
  this change", or "prove this change works".
---

# Eval-driven development for an Instance AI change

Instance AI has no compilable spec. A unit test can tell you a function returns
what you typed into it; nothing but an eval can tell you the agent still builds
the right workflow. So a behavioural change is only finished when you can say
**which measured unit moved, in which direction, and what else moved with it.**

This skill drives that loop. It does not teach you to write a case — that's
[`n8n:create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md), which this
skill hands off to at exactly one gate.

> **Never export `LANGSMITH_API_KEY` anywhere in this loop.**
>
> It is a single switch with four effects: it flips the CLI to the LangSmith
> driver, records an experiment, **writes your throwaway run into the shared
> dataset**, and (per `lang-tracer/docs/eval-dispatchers.md`) turns on builder
> trace capture. Leave it unset and every command below runs on the direct
> driver, entirely locally. `cli/index.ts` selects the driver on
> `Boolean(process.env.LANGSMITH_API_KEY)` — nothing else.

## When this applies — and when it doesn't

**Applies** when the diff touches a path the PR gate watches *and* you can name
a behaviour that should change:

```
packages/@n8n/instance-ai/src/**            packages/cli/src/modules/instance-ai/**
packages/@n8n/instance-ai/skills/**         packages/core/src/execution-engine/eval-mock-helpers.ts
packages/@n8n/instance-ai/knowledge-base/** packages/@n8n/agents/src/**
```

**Does not apply** to a pure refactor, a type-only change, or plumbing with no
behavioural claim. Say so and stop — `pnpm test` is the right instrument, and
running a build eval to confirm nothing changed burns ~3 minutes and a sandbox
per case to learn nothing. A skill that demands an eval for every diff gets
ignored for the diffs that need one.

Changes to `evaluations/**` itself are a **different** loop (you'd be proving
your harness change does *not* alter verdicts on a frozen case set). Not covered
here.

## The loop

Gates 1, 5 and 6 are the driver's calls, not yours to make silently: gate 1
decides whether a case gets authored, gate 5 decides whether the change ships,
gate 6 decides what a red *means*. Propose and confirm at those three; flow
through the rest.

### 0. State the claim

One falsifiable sentence naming an observable behaviour:

> *"After this change the builder stops adding a Set node when the trigger
> already emits the field."*

Not "improves node selection" — you can't measure that. If you can't write the
sentence, go back to **When this applies**.

### 1. Find the unit that guards the claim

A *unit* is what the comparison actually grades: one execution scenario
(`file/scenario`) or one evaluated build expectation
(`file#expectation:text`). Look for one whose verdict flips on your claim:

- **lang-tracer suites** — the durable home of the corpus
  (`--source langtracer --suite baseline`); search there first.
- **`evaluations/data/workflows/*.json`** — local disk cases (since the corpus
  migration this holds only the `agents` tier and `replay`-seeded cases).
- **`evaluations/discovery/`** — routing cases, if the claim is about which path
  the agent takes.

Three outcomes:

| What you find | Do |
|---|---|
| A unit that is **already red** for your reason | That red is your target. Go to gate 2. |
| A unit that is green and would **stay** green either way | It does not guard the claim. Treat it as absent. |
| Nothing | **Author one now, before touching `src/`** — hand off to [`create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md). |

**Write the case against the failure, not against your fix.** A case authored
after the fix encodes the fix's shape: it passes because your code is what it
was written to describe, and it will not catch the next regression. This is the
one genuinely test-first move in the loop and it is where the loop earns its
keep.

*If the fix is already in your working tree* — the common case — don't skip the
gate. Stash it, capture the red, restore it:

```bash
git stash push -- packages/@n8n/instance-ai/src
# ...author the case, run it, confirm it is red for the right reason...
git stash pop
```

A case you never saw fail is a case you have no evidence guards anything.

### 2. Baseline the unchanged tree

Same instance, same model, same session as the "after" run will be. A baseline
captured last week under a different model is not a baseline.

```bash
cd packages/@n8n/instance-ai
# with your usual env loaded and LANGSMITH_API_KEY unset

# routing / skill-loading claim — in-process, no instance, no sandbox
pnpm eval:discovery --filter <slug> --trials 5 --output-dir .output/edd/before

# built-workflow claim — needs a running instance with a working sandbox
pnpm eval:instance-ai --filter <slug> --iterations 3 --output-dir .output/edd/before
```

`--output-dir` is the part that matters: it writes the `eval-results.json`
gate 4 compares. `.output/` is gitignored, so these artifacts never reach a
commit.

Pick the lane by claim type before you pick N — a routing claim graded by
`eval:discovery` costs a fraction of a build, and needs only
`ANTHROPIC_API_KEY`. See [`coverage-map.md`](coverage-map.md).

**Choosing N.** See [Reading a comparison](#reading-a-comparison) for why this
matters more than it looks:

| Claim | N |
|---|---|
| The build fails outright / a deterministic structural check | 1 is honest |
| Any behavioural claim | **3 minimum** |
| Something you'll cite as evidence in review | 5+ |

**Smoke the environment with one case first.** If a single case crashes at
execution — especially with an error you'd expect on every case — fix that
before spending a batch. The failure shapes and their fixes (stale dist,
out-of-sync `node_modules`) are catalogued under *"A red is signal → first rule
out the environment"* in [`create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md).

### 3. Make the change — then rebuild **and restart**

```bash
cd packages/@n8n/instance-ai && pnpm build   # tsc && tsc-alias
kill "$(lsof -t -iTCP:<port>)"               # the real PID — an env-var pattern match misses it
# ...restart the instance...
```

The running node process holds the old dist in memory. Rebuilding on disk
changes nothing until the restart, and a "no measurable effect" result from a
stale process is the most demoralising way to waste an hour.

### 4. Measure

Same command, same N, same instance — only the output dir changes:

```bash
pnpm eval:instance-ai --filter <slug> --iterations 3 --output-dir .output/edd/after
pnpm eval:compare-local --before .output/edd/before --after .output/edd/after
```

`eval:compare-local` keys and grades units with the same `comparison/` code the
CI PR comment uses, so a local read and a CI read can't drift about what a unit
*is*. It needs no LangSmith and no workspace build — it depends only on `zod`
and node builtins, so it still runs in a half-broken checkout.

Three readings, in priority order:

1. **Target unit moved the way you claimed** — the claim is supported.
2. **Something you weren't aiming at moved** — that's the blast radius, and it
   is the whole reason to run a before/after rather than just running the new
   case. Account for every line under `WORSE AFTER` before you push.
3. **Target unit didn't move** — the claim is unproven. Your change may be a
   no-op on measured behaviour, or the unit doesn't guard what you thought
   (back to gate 1). Do not talk yourself into shipping on a green that was
   already green.

Also read `ONLY IN AFTER` / `ONLY IN BEFORE`. A non-empty list means the two
runs covered different cases and the units you care about may not have been
compared at all.

### 5. Blast radius

Widen before opening the PR. Scope it deliberately rather than maximally —
`coverage-map.md` covers how to find the cases that share your code path:

```bash
pnpm eval:instance-ai --filter <case-a>,<case-b>,<case-c> --iterations 3 --output-dir .output/edd/after-wide
```

Reserve `--tier pr` for a genuinely broad change. **The build is capped at 4
concurrent builds per instance**, and a case queued behind that cap reports
`BUILD FAILED: Run timed out` — a capacity artifact, not a defect. If you see
that, re-run the suspect solo (`--concurrency 1`) before believing it.

You'll want a matching before-side. Either capture one at gate 2 with the wider
filter, or re-run the wide set on the stashed tree.

### 6. Classify what's still red

Every remaining red is one of three things — real capability gap, harness
limitation, or genuine non-determinism. The taxonomy, the `Harness note:` /
`Capability-gap finding:` description prefixes, and the Linear-ticket step for a
real gap all live in *"A red is signal — surface it, don't work around it"* in
[`create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md). Follow it there.

The rule that matters most here: **never weaken a case to make your change look
clean.** If you catch yourself editing a case so that the pre-change build would
now pass, stop.

### 7. Write the EDD summary

Paste into the PR body. This is the auditable trace — it's what lets a reviewer
tell measurement from vibes:

```
### EDD summary

Claim:  builder stops adding a redundant Set node when the trigger already emits the field
Unit:   set-node-redundancy/happy-path  [authored in this PR — confirmed red before the fix]
Lane:   eval:instance-ai --filter set-node-redundancy --iterations 3  (direct driver, no LangSmith)

Before → After
  set-node-redundancy/happy-path                       0/3 → 3/3   +100.0pp   ← target
  set-node-redundancy#expectation:no redundant Set     0/3 → 3/3   +100.0pp
  webhook-digest/happy-path                            3/3 → 2/3    -33.3pp   ← see below

Blast radius:  --filter set-node-redundancy,webhook-digest,slack-alert  N=3 — 5 units, 3 moved
Collateral:    webhook-digest lost one trial of three. Not significant at N=3; re-ran at
               N=5 → 5/5, treating as noise.
Kept reds:     none
```

State N. State what you did about anything under `WORSE AFTER` — "not
significant" is an acceptable answer only with the re-run that supports it.

## Reading a comparison

The `verdict` column is the CI-grade statistical tier, and **at local N most
real movement does not reach it.** Measured against the actual classifier:

| Movement | N=3 verdict | N=5 verdict |
|---|---|---|
| 3/3 → 0/3 (total flip) | `hard_regression` | `hard_regression` |
| 3/3 → 1/3 | `soft_regression` | — |
| 3/3 → 2/3 (lost one trial) | **`stable`** | — |
| 5/5 → 3/5 | — | `watch` |
| 5/5 → 4/5 (lost one trial) | — | **`stable`** |

A unit that loses a single trial grades `stable` at any N you can afford
locally. That is correct behaviour — one trial in three is genuinely weak
evidence — but it means **you read the counts, not the verdict.** The verdict
becomes the thing to read on the CI run, at its higher N.

This cuts both ways. A local `stable` is not proof you broke nothing, and a
single red trial is not proof you did. When a collateral line matters, the
answer is more iterations on that one unit, not a longer argument about it.

## What this skill does not cover

- **Authoring or calibrating a case** — [`create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md).
- **Running mechanics, env, sandbox, parallel lanes** — [`running-evals.md`](../create-instance-ai-eval/running-evals.md).
- **The PR gate.** `ci-instance-ai-evals.yml` delegates to
  `test-evals-instance-ai.yml` with `secrets: inherit`, and that workflow *does*
  set `LANGSMITH_API_KEY` — its baseline comparison is LangSmith-side. Nothing
  in your local loop touches it; it is simply not the same instrument, and its
  numbers come from a different N against a pinned baseline.
- **Recording the run anywhere durable.** Today the loop is local and its
  artifacts are gitignored; the EDD summary block is the only thing that
  survives. Dispatching the same case set through a personal lang-tracer
  dispatcher would give it run history, a version matrix and a revision trail —
  worth doing once this loop has proven itself, but not part of it today.
