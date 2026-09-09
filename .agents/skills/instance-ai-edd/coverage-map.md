# Coverage map — picking the lane and scoping the blast radius

Two jobs: **which instrument grades your claim**, and **which cases share your
code path** so gate 5 can be scoped deliberately instead of maximally.

Every command below assumes `LANGSMITH_API_KEY` is unset and `cd
packages/@n8n/instance-ai`.

## What counts as an Instance AI change

The PR gate's own path filter (`.github/workflows/ci-instance-ai-evals.yml`) is
the authoritative list:

```
packages/@n8n/instance-ai/src/**
packages/@n8n/instance-ai/skills/**
packages/@n8n/instance-ai/knowledge-base/**
packages/@n8n/instance-ai/evaluations/**
packages/cli/src/modules/instance-ai/**
packages/core/src/execution-engine/eval-mock-helpers.ts
packages/@n8n/agents/src/**
```

## Pick the lane by what your claim is about

Cost is the point of this table. A routing claim graded by a full workflow eval
costs a sandbox build per case to learn something the in-process discovery lane
answers in a fraction of the time.

| Your claim is about | Lane | Command | What it costs |
|---|---|---|---|
| Which tool/subagent the agent reaches for first; whether a skill loads | **discovery** | `pnpm eval:discovery --filter <slug> --trials 5 --output-dir .output/edd/before` | In-process orchestrator. **No n8n instance, no build, no sandbox — only `ANTHROPIC_API_KEY`.** Cheapest by far. |
| One subagent's behaviour given correct input | **subagent** | `pnpm eval:subagent --filter <slug> --verbose` | Needs a running instance. One build per case. **Writes no artifact — not comparable.** |
| The built workflow's structure, or how it executes on mocked data | **workflow** | `pnpm eval:instance-ai --filter <slug> --iterations 3 --output-dir .output/edd/before` | ~3 min build + execution per iteration, per case, plus a sandbox. The expensive one. |
| Agent-tier behaviour | **agents** | `pnpm eval:agents --filter <slug>` | Pinned to `--source langtracer --suite agents --tier agents`. |

**`--output-dir` is what makes a lane measurable.** Discovery and the workflow
lane both write an `eval-results.json` there, and `eval:compare-local` reads
either — a discovery scenario reports as one unit keyed
`<slug>/tool-discovery`. The subagent lane writes nothing, so a claim routed
there has no before/after tooling; prefer discovery or the workflow lane when
you need a measured delta.

Not in this table: `eval:pairwise`. It imports the LangSmith client at module
load and its default dataset is a LangSmith dataset, so it is out of scope for
this loop by construction.

**Escalate, don't start wide.** If a discovery case can express your claim, use
it and stop. Reach for the workflow lane when the claim is genuinely about what
got built or whether it runs.

## Where the cases live

| Set | Location | Count today |
|---|---|---|
| Discovery (routing / skill loading) | `evaluations/data/discovery/*.json` | 18 |
| Subagent | `evaluations/data/subagent/*.json` | 11 |
| Workflow, on disk | `evaluations/data/workflows/*.json` | 7 — the `agents` tier and `replay`-seeded cases only |
| Workflow, the corpus | lang-tracer suites (`--source langtracer --suite baseline`) | the bulk of it |

Since the corpus migration, `data/workflows/` is **not** the suite. A new case
is authored there as a local file and then pushed to a lang-tracer suite — see
[`create-instance-ai-eval`](../create-instance-ai-eval/SKILL.md).

## Scoping gate 5

There is no static map from a source path to the cases that exercise it, and a
hand-maintained one would rot within a release. Use the artifacts instead:

1. **Grep the local case sets** for what your change touches — a tool name, a
   node type, a skill id:

   ```bash
   grep -rl "data-table" evaluations/data/discovery evaluations/data/subagent
   grep -rl "n8n-nodes-base.httpRequest" evaluations/data/workflows
   ```

2. **Query the suite** for corpus cases (lang-tracer MCP or REST) on the same
   terms — tags, node types, the case's conversation text.

3. **Let the first comparison tell you.** A `WORSE AFTER` line on a case you
   didn't expect *is* the coverage map, discovered empirically. Add it to the
   filter and re-run.

4. **`--tier pr`** only for a genuinely broad change. It is the curated set the
   gate runs, and at `--iterations 3` on one instance it is a long wall-clock
   run — the build is capped at **4 concurrent builds per instance**, and a case
   queued behind that cap reports `BUILD FAILED: Run timed out`, which is a
   capacity artifact and not a defect. Re-run a suspect solo with
   `--concurrency 1` before believing it.

The honest default is a hand-picked `--filter a,b,c` of three to six cases:
your target, plus the nearest neighbours from steps 1–2.

## Tiers

A case's `datasets` array is free-form. The two that matter:

- **`pr`** — the curated thin set the gate runs. High baseline reliability plus
  capability diversity. Only promote a case here after `--iterations 5+` shows
  it reliably green; a flaky case in the gate poisons it.
- **`full`** — everything, for nightly and full-suite runs.
