---
name: n8n:mutate-changed
description: Run Stryker mutation testing on the source files changed in the current branch (vs origin/master). One command for "did my work hold up under mutation?" before pushing. Triages on the side which files dropped below threshold and offers to invoke n8n:strengthen-tests on them. Use when the user says /mutate-changed, "mutate what I changed", "check my changes", or has just finished writing a feature and wants pre-merge feedback. Phase 1 scope: only packages/workflow/src/** changes are mutated.
---

# Mutate what I changed

Closes the local dev loop. Single command to run Stryker against every source file the current branch touched (vs `origin/master`), then point at any reds that need strengthening.

## When to use

- User says `/mutate-changed`, "mutate the files I changed", "check my changes", "did my tests stick"
- Mid-feature: dev wants pre-merge feedback before pushing
- Pre-PR: cheaper than waiting for the nightly cron

**Don't** use:
- For a single specific file (`/n8n:mutation-test <path>` is faster)
- For non-`packages/workflow` changes — those are out of scope until Phase 2 rollout
- After the user already ran `/n8n:strengthen-tests` (which calls mutation-test internally for verification — running both again is wasted compute)

## Inputs

- **Default base**: `origin/master`. Override with `--base <ref>` if comparing against another branch (e.g. `--base HEAD~5`).
- **Default scope**: `packages/workflow/src/**/*.ts`. Phase 1 only.

## Steps

### 1. Identify changed source files

```bash
git diff --name-only origin/master...HEAD -- 'packages/workflow/src/**/*.ts'
```

(`...` is correct — three-dot means "since the branch diverged from base," which is what we want.)

If `git fetch` hasn't been run recently, suggest the user `git fetch origin master` first; otherwise the base ref is stale.

Filter out:
- `**/*.d.ts` (declarations, no behaviour)
- `**/*.stories.ts` (Storybook scaffolding, not present in workflow but defensive)
- `index.ts` files (barrels)
- `interfaces.ts`, `types.ts`, `constants.ts` (same low-value filter as `seed-ledger.mjs`)

### 2. Surface the plan to the user

Print the filtered list before running anything. Each Stryker run is 1–5 minutes; the user should confirm if there are many.

```
Found N changed source files to mutate:
  - packages/workflow/src/foo.ts
  - packages/workflow/src/bar.ts
  ...

Estimated runtime: ~M-K minutes (M minutes minimum if every Stryker run is fast).
Proceed? (skill default: yes if N ≤ 3, ask if N > 3)
```

If the filtered list is empty: report "No source files under packages/workflow/src/** changed vs $base — nothing to mutate." and stop. Exit cleanly.

If N > 8: refuse and ask the user to narrow scope (a different base ref, or invoke per-file). Running 8+ mutations sequentially is a 30+ minute session that should be a deliberate choice.

### 3. Run mutation testing per file

For each file in the plan, invoke `pnpm --filter=n8n-workflow mutate <package-relative-path>`. The `summary.json` and other artefacts get overwritten on each run, so capture the score per file as you go.

After each run completes, print one line:

```
✓ src/foo.ts   95.12% (39/41 killed)   GREEN
✗ src/bar.ts   54.83% (17/31 killed)   RED  — 13 survivors, top: ConditionalExpression, EqualityOperator
```

If a Stryker run hard-fails (exit 3, no `summary.json`), print `! src/foo.ts  Stryker failed — see stderr` and continue to the next file. Don't abort the whole batch.

### 4. Summary table

After all files have been mutated, print one compact table:

```
=== Mutation results: N files, M green, K red, J failed ===
| File                        | Score   | Verdict | Survivors |
|-----------------------------|---------|---------|-----------|
| src/foo.ts                  |  95.12% | GREEN   |         2 |
| src/bar.ts                  |  54.83% | RED     |        13 |
| src/baz.ts                  |    n/a  | FAILED  |         - |
```

### 5. Offer the strengthen step on the worst red file

If any file came back red:

> The lowest-score red file is `src/bar.ts` (54.83%, 13 survivors). Run `/n8n:strengthen-tests` to triage them and write assertion changes? (suggesting; don't auto-invoke)

Only suggest one file at a time — `n8n:strengthen-tests` caps at 5 survivors per invocation, and re-running this skill after edits is cheap.

If everything is green: report it and stop. No follow-up needed.

## Output shape

Three deliverable sections per invocation:

1. **Plan** (before running) — list of files, estimated runtime
2. **Per-file progress** (during) — one line per file as it completes
3. **Summary table + recommendation** (after) — compact view

Don't dump full `summary.json` payloads — the per-file mutate runs already write them to disk under `packages/workflow/reports/mutation/` (overwriting each time, since the orchestrator uses fixed filenames). The user can read the latest one if they want detail.

## Constraints

- **Hardcoded to `packages/workflow`.** When Phase 2 lands, generalise.
- **Max 8 files per invocation.** Above that, ask user to narrow.
- **Don't auto-invoke `/n8n:strengthen-tests`.** Suggest, don't act. Same reasoning as the other skills: each pass should be a deliberate human-approved step.
- **No commits.** Edits land in working tree; user reviews.
- **No fabricated scores.** If a Stryker run fails, mark FAILED in the table — never guess a value.

## Common follow-ups

- "strengthen them all" → loop the user through `/n8n:strengthen-tests`, one file at a time
- "what changed?" → `git diff origin/master...HEAD -- <file>` for the file in question
- "ignore <pattern>" → re-run with the user's exclude added to the filter

## Related

- `n8n:mutation-test` — single-file version of this skill
- `n8n:strengthen-tests` — the natural next step when reds show up
- DEVP-176 — Phase 1.5 local developer loop
