---
description: Run Stryker mutation testing on a single source file and return a structured, token-frugal report that's pipeable to a follow-up "strengthen tests" loop. Use when the user says /mutant-score, "mutation test this file", or has just edited tests and wants to verify they actually assert behaviour. Per-file only — full-package mutation runs are out of scope.
---

# Mutation testing — single file

Wraps `pnpm mutate <file>` and parses `summary.json` into a compact, structured shape suitable for downstream "strengthen the surviving mutants" iteration. Works for any vitest package — `pnpm mutate` infers the package from the path.

## When to use

- User explicitly invokes: `/mutant-score <path>`, "mutation test this file", "check my test effectiveness on X"
- User has just edited a test file and wants to know if their assertions are load-bearing
- Follow-up loop after a `red` verdict — feed the structured output back to a "fix" iteration

**Don't** use this skill for:
- Whole-package or whole-repo mutation runs — single file only
- Coverage % questions (use the existing coverage workflow)
- **jest** packages (`nodes-base`, `cli`, `db`) — Stryker's vitest-runner only covers vitest packages
- `@n8n/expression-runtime` — it's the isolated-vm engine (blocked on DEVP-257)

## Inputs

One required argument: the source file to mutate. Prefer a **repo-relative path** — the package is inferred from it:

- `packages/workflow/src/cron.ts` (package inferred)
- `packages/@n8n/crdt/src/utils.ts` (package inferred)

A bare package-relative path (`src/cron.ts`) is ambiguous — pass the repo-relative path, or add `--package-dir <pkg>`. Don't guess the package.

## Steps

1. **Resolve the target.** Any vitest package works; `pnpm mutate` infers the package from a repo-relative path. If the file is in a jest package or `@n8n/expression-runtime`, say so and stop — don't fabricate output.

2. **Run Stryker with trimmed output:**
   ```bash
   pnpm mutate <repo-relative-file> 2>&1 | tail -40
   ```
   `tail -40` discards the Stryker progress bar spam; the relevant numbers + survivor list always land in the last ~30 lines. Exit codes: `0` = pass, `1` = below threshold (still valid, summary.json exists), `2` = usage error, `3` = Stryker failure (no summary.json).

3. **If exit code 3**, surface the trimmed tail to the user, suggest checking that workspace deps are built (`pnpm build`), and stop. Don't fabricate a report.

4. **Read the package's `reports/mutation/summary.json`** (e.g. `packages/workflow/reports/mutation/summary.json`) — never `raw.json`. raw.json is 600KB+ and not needed for the strengthen loop. summary.json already contains every surviving mutant with its location, replacement, mutator name, and the names of tests that covered the line.

5. **Cap covering_tests at 3 per survivor.** If a mutant was covered by more than 3 tests, keep the first 3 and append `+N more` as a count. Names beyond 3 add tokens without adding actionable signal — the strengthen loop only needs to know *which test* to extend, not all of them.

6. **Compute `minimum_kills_needed`** to reach the threshold:
   ```
   killed_now = summary.overall.counts.killed + summary.overall.counts.timeout
   valid_total = killed_now + summary.overall.counts.survived + summary.overall.counts.noCoverage
   needed = ceil((threshold/100) * valid_total) - killed_now
   ```
   This tells the next loop the minimum number of survivors it has to kill to flip `red` → `green`. Cap at the number of survivors.

7. **Output the structured shape** described below. Keep prose to one headline line; the rest is the JSON block.

## Output shape

One headline line, then a fenced JSON block. Nothing else — no preamble, no per-survivor commentary, no risk triage (that's the next loop's job).

````
[red|green] <score>% (threshold <T>%) — <N> survivors; need to kill ≥<K> to flip green.

```json
{
  "verdict": "red",
  "target": "packages/workflow/src/augment-object.ts",
  "package": "n8n-workflow",
  "score": 76.74,
  "threshold": 80,
  "delta_to_threshold": 3.26,
  "minimum_kills_needed": 5,
  "counts": {
    "killed": 99,
    "survived": 28,
    "no_coverage": 2,
    "timeout": 0
  },
  "survivors": [
    {
      "id": "77",
      "mutator": "ConditionalExpression",
      "location": "src/augment-object.ts:95:6",
      "original": "value === null",
      "replacement": "false",
      "covering_tests": [
        "augmentObject should handle null values",
        "augmentObject should handle nested nulls"
      ],
      "covering_tests_overflow": 0
    }
  ]
}
```
````

Order the survivors array by `location` (ascending line number, then column) so the strengthen loop processes them top-to-bottom of the file.

## Constraints

- **No raw.json** — never read or surface it. summary.json is the only input.
- **No HTML report** — don't `open` raw.html or paste links to it. If the user wants visual exploration they'll ask.
- **No automatic triage** — don't categorise survivors by "real bug" vs "refactor insurance." That's a separate analysis step that should happen on demand, not by default. Keeps token cost predictable.
- **No "I'll regenerate tests for you now"** — this skill reports the gap. Use `n8n:mutant-fix` if you want assertion edits.

## Common follow-ups (don't do unless asked)

- User says "fix these" → start a strengthen loop using the JSON output as input. Read covering_tests source, propose changes per mutant, run the skill again to verify.
- User says "explain survivor #N" → fetch that mutant from summary.json, show its surrounding ~5 lines from the source file, no analysis beyond what summary.json contains.
- User says "what's the threshold?" → 80% provisional; see `scripts/mutation-health/README.md` for the rationale.
- User says "run it on the changed files" → use `n8n:mutant-diff` (mutates the diff vs origin/master).

## Related

- `scripts/mutation-health/README.md` — the broader BQ-backed observability story
- `scripts/mutation-health/stryker.default.mjs` — the default Stryker config; a package may override with its own `stryker.config.mjs` (e.g. `packages/workflow` carves out the isolated-vm engine)
- `n8n:mutant-fix` — the strengthen-the-survivors counterpart
