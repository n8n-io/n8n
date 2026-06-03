---
description: Run Stryker mutation testing on the source files changed in the current branch (vs origin/master) across vitest packages. One command for "did my work hold up under mutation?" before pushing. Triages which files dropped below threshold and offers to invoke n8n:mutant-fix on them. Use when the user says /mutant-diff, "mutate what I changed", "check my changes", or has just finished writing a feature and wants pre-merge feedback.
---

# Mutate what I changed

Closes the local dev loop. Single command to run Stryker against every changed source file the current branch touched (vs `origin/master`) in a mutation-eligible package, then point at any reds that need strengthening.

## When to use

- User says `/mutant-diff`, "mutate the files I changed", "check my changes", "did my tests stick"
- Mid-feature: dev wants pre-merge feedback before pushing
- Pre-PR: cheaper than waiting for the nightly cron

**Don't** use:
- For a single specific file (`/n8n:mutant-score <path>` is faster)
- After the user already ran `/n8n:mutant-fix` (which calls mutant-score internally for verification — running both again is wasted compute)

Changed files in **jest** packages (`nodes-base`, `cli`, `db`, …) and in `@n8n/expression-runtime` are skipped automatically — see step 1.

## Inputs

- **Default base**: `origin/master`. Override with `--base <ref>` if comparing against another branch (e.g. `--base HEAD~5`).
- **Default scope**: `packages/**/src/**/*.ts`, narrowed to mutation-eligible (vitest) packages in step 1.

## Steps

### 1. Identify changed, eligible source files

```bash
git diff --name-only origin/master...HEAD -- 'packages/**/src/**/*.ts'
```

(`...` is correct — three-dot means "since the branch diverged from base," which is what we want.)

If `git fetch` hasn't been run recently, suggest the user `git fetch origin master` first; otherwise the base ref is stale.

Filter out:
- `**/*.d.ts` (declarations, no behaviour)
- `**/*.stories.ts` (Storybook scaffolding)
- `index.ts` files (barrels)
- `interfaces.ts`, `types.ts`, `constants.ts` (low-value, same filter the picker uses)
- **files in non-eligible packages**: for each changed file, find its package (nearest ancestor dir with a `package.json`). Keep the file only if that package has a `vitest.config.*` **and** is not `@n8n/expression-runtime` (it's the isolated-vm engine — blocked on DEVP-257). Drop jest packages with a one-line note: `skipped (jest): packages/cli/src/...`.

### 2. Surface the plan to the user

Print the filtered list before running anything. Each Stryker run is 1–5 minutes; the user should confirm if there are many.

```
Found N changed source files to mutate (J skipped: jest / expression-runtime):
  - packages/workflow/src/foo.ts
  - packages/@n8n/crdt/src/bar.ts
  ...

Estimated runtime: ~M-K minutes (M minutes minimum if every Stryker run is fast).
Proceed? (skill default: yes if N ≤ 3, ask if N > 3)
```

If the filtered list is empty: report "No mutation-eligible source files changed vs $base — nothing to mutate." and stop. Exit cleanly.

If N > 8: refuse and ask the user to narrow scope (a different base ref, or invoke per-file). Running 8+ mutations sequentially is a 30+ minute session that should be a deliberate choice.

### 3. Run mutation testing per file

For each file in the plan, invoke `pnpm mutate <repo-relative-path>` (the package is inferred from the path). Capture the score per file from the `✓ / ✗` summary line mutate.mjs prints to stderr — don't re-read `summary.json` (it's overwritten per run, and lives in that file's own package).

After each run completes, print one line:

```
✓ packages/workflow/src/foo.ts        95.12% (39/41 killed)   GREEN
✗ packages/@n8n/crdt/src/bar.ts       54.83% (17/31 killed)   RED  — 13 survivors, top: ConditionalExpression, EqualityOperator
```

If a Stryker run hard-fails (exit 3, no `summary.json`), print `! <file>  Stryker failed — see stderr` and continue to the next file. Don't abort the whole batch.

### 4. Summary table

After all files have been mutated, print one compact table:

```
=== Mutation results: N files, M green, K red, J failed ===
| File                            | Score   | Verdict | Survivors |
|---------------------------------|---------|---------|-----------|
| packages/workflow/src/foo.ts    |  95.12% | GREEN   |         2 |
| packages/@n8n/crdt/src/bar.ts   |  54.83% | RED     |        13 |
| packages/workflow/src/baz.ts    |    n/a  | FAILED  |         - |
```

### 5. Offer the strengthen step on the worst red file

If any file came back red:

> The lowest-score red file is `packages/@n8n/crdt/src/bar.ts` (54.83%, 13 survivors). Run `/n8n:mutant-fix <file>` to triage them and write assertion changes? (suggesting; don't auto-invoke)

Only suggest one file at a time — `n8n:mutant-fix` caps at 5 survivors per invocation, and re-running this skill after edits is cheap.

If everything is green: report it and stop. No follow-up needed.

## Output shape

Three deliverable sections per invocation:

1. **Plan** (before running) — list of eligible files (+ skipped count), estimated runtime
2. **Per-file progress** (during) — one line per file as it completes
3. **Summary table + recommendation** (after) — compact view

Don't dump full `summary.json` payloads — each mutate run writes one to `<package>/reports/mutation/` (overwritten per run). The user can read the latest one if they want detail.

## Constraints

- **Vitest packages only.** Jest packages and `@n8n/expression-runtime` are filtered out in step 1, not mutated.
- **Max 8 files per invocation.** Above that, ask user to narrow.
- **Don't auto-invoke `/n8n:mutant-fix`.** Suggest, don't act. Same reasoning as the other skills: each pass should be a deliberate human-approved step.
- **No commits.** Edits land in working tree; user reviews.
- **No fabricated scores.** If a Stryker run fails, mark FAILED in the table — never guess a value.

## Common follow-ups

- "strengthen them all" → loop the user through `/n8n:mutant-fix`, one file at a time
- "what changed?" → `git diff origin/master...HEAD -- <file>` for the file in question
- "ignore <pattern>" → re-run with the user's exclude added to the filter

## Related

- `n8n:mutant-score` — single-file version of this skill
- `n8n:mutant-fix` — the natural next step when reds show up
