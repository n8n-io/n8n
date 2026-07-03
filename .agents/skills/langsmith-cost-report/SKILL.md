---
name: n8n:langsmith-cost-report
description: >-
  Compares token usage, prompt-cache metrics, and cost across two or more
  LangSmith instance-ai eval experiments: downloads per-thread data, enriches it
  with tokens/cache/cost, verifies it against LangSmith, and prints a markdown
  report. Use when the user asks to compare experiment costs, analyze cache hit
  rates, or build a cost report from LangSmith experiment/session URLs or IDs.
---

# LangSmith experiment cost report

Given 2+ experiments on the `instance-ai-evals` dataset, produce a verified
cost/cache comparison. One experiment works too (skip the report or pass it
twice), but the report is designed for baseline-vs-candidate.

## Committed baseline

The current baseline is committed at
`baselines/iai-opus-cache-cost-10-f3e390c4-threads.json` (relative to this
skill). Unless the user names a different baseline, compare candidates against
it — only the candidate experiments need to be fetched/enriched/verified.

To promote a new baseline: run the full workflow on the experiment, move the
verified JSON into `baselines/`, update the path above, and commit both.

## Prerequisites

- `LANGSMITH_API_KEY` and `LANGSMITH_ENDPOINT` (EU: `https://eu.api.smith.langchain.com`)
  — both live in `.env.local`, so run every script through
  `pnpm dotenvx run -f .env.local -- node scripts/...`.
- Session IDs: in a compare URL like
  `.../datasets/<datasetId>/compare?selectedSessions=<sessionId>`, the session
  ID is the `selectedSessions` value. Experiment names work too.

## Rate limiting

LangSmith 429s easily. Rules that have worked:

- Keep `--delay-ms 6000` (the default 3000 can survive but 6000 is safe).
- Process experiments **sequentially**, never in parallel.
- Always pass `--checkpoint` so an aborted run resumes without re-fetching.
- A 60-thread experiment takes ~7 minutes to enrich and ~7 to verify. Run the
  commands in the background and poll the log; do not shorten the delay to
  speed it up.

## Workflow

For **each** experiment (sequentially), from the repo root:

```bash
# 1. Download: thread skeleton grouped by eval + iteration
pnpm dotenvx run -f .env.local -- node scripts/fetch-experiment-threads.mjs \
  --session <sessionId> --out <experiment>-threads.json

# 2. Enrich: add input/output tokens, cache read/write, hit rate, cost per thread
pnpm dotenvx run -f .env.local -- node scripts/enrich-thread-cost-json.mjs \
  --input <experiment>-threads.json \
  --checkpoint .cache/<experiment>-checkpoint.json --delay-ms 6000

# 3. Verify: re-fetch and confirm every thread matches LangSmith exactly
pnpm dotenvx run -f .env.local -- node scripts/verify-thread-cost-json.mjs \
  --input <experiment>-threads.json \
  --checkpoint .cache/<experiment>-verify-checkpoint.json --delay-ms 6000
```

Verify must end with `Result: N/N threads match LangSmith exactly` (exit code
0). If it reports diffs, delete the stale entries from the enrich checkpoint
and re-run step 2.

Then compare (first file = baseline):

```bash
# 4. Report: markdown overview + per-eval cost table with % deltas
node scripts/report-thread-cost-json.mjs \
  .agents/skills/langsmith-cost-report/baselines/iai-opus-cache-cost-10-f3e390c4-threads.json \
  <candidate>-threads.json [more...]
```

## Conventions

- Name candidate output files `<experiment-name>-threads.json` in the repo
  root (untracked scratch); checkpoints and logs go in `.cache/` (gitignored).
  Only promoted baselines get committed, under `baselines/` in this skill.
- The JSON shape (`evals` grouped by test case + flat `rows`) is what enrich,
  verify, and report all consume — don't restructure it.
- Present the report's markdown to the user; add a one-line takeaway
  (e.g. avg cost/thread delta and cache hit rate change).
