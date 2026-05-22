---
name: n8n:strengthen-tests
description: Take a Stryker summary.json (from n8n:mutation-test), triage the surviving mutants by user-reachable-behaviour risk, write minimal assertion changes to kill the top 3-5 highest-leverage survivors, then verify by re-running n8n:mutation-test. Use when the user has just run mutation testing and wants to strengthen the test suite, or says "kill the survivors / strengthen tests / fix the red." Pairs with n8n:mutation-test as the inner write side of a single iteration.
---

# Strengthen tests — kill the highest-leverage survivors

The other half of the local mutation-testing loop. `n8n:mutation-test` reports which mutations escaped the tests; this skill picks the ones that matter and writes minimal assertion changes to kill them.

## When to use

- User has just run `/n8n:mutation-test <file>` and the verdict was `red`
- User says: "strengthen tests", "kill the survivors", "fix the red", "iterate on the tests for X"
- Mid-loop: this skill's verify step calls `n8n:mutation-test` again, so the loop closes here

**Don't** use this skill:
- Before any mutation testing has been run for the target file (no `summary.json` to triage)
- For a `green` verdict — there's nothing to strengthen; if user insists, push back and ask which file actually needs work
- To bulk-kill every survivor — explicitly capped at 5 per invocation. Re-invoke for more.

## Inputs

- **Default**: read `packages/workflow/reports/mutation/summary.json` (the last `n8n:mutation-test` run's output).
- **Override**: `--summary <path>` to point at a different summary file.

## Steps

### 1. Read the summary

`packages/workflow/reports/mutation/summary.json`. Already compact (~50 KB). Pull:
- `files[0].file` — the source file under test
- `files[0].score` — current mutation score
- `files[0].survivors[]` — every surviving (and no-coverage) mutant with location, replacement, covering test names

If `summary.json` is missing, stop. Tell the user to run `n8n:mutation-test` first.

### 2. Read the source under test, sparingly

Read the source file referenced in `summary.json`. Read **once**, the whole file (typical n8n-workflow source files are 50-500 lines; the cost is bounded). This is the only file read; don't load test files yet.

### 3. Triage the survivors

Categorise each survivor into one of three buckets. Use the rubric below — don't apply it mechanically, but lean on it.

**HIGH leverage — "real regression vector":** mutant guards behaviour that real users actually hit through the public API surface.

- Type checks against shapes user data routinely takes: `null`, `undefined`, `Date`, `Buffer`, `Uint8Array`, `Array`, plain objects with arbitrary keys
- Conditional branches that gate critical fall-through (e.g. "if this returns early, the wrong code path runs")
- Code paths that handle user-controlled flow: expressions, Code-node behaviour, binary item handling, deep-clone semantics
- Mutants on guard clauses that prevent crashes (`if (value == null) return ...`)

**MODERATE leverage — "user-observable invariant":** real but lower-frequency user impact.

- Proxy traps that change `Object.keys` / `in` / `hasOwnProperty` semantics after mutation
- Set-then-delete / re-set-after-delete sequences (Code-node assignment patterns)
- Treating `undefined` assignment as deletion (`obj.foo = undefined` → key removed)
- Edge cases that only fire under specific iteration patterns

**LOW leverage — "refactor insurance" or noise:** skip these. Document the skip in the output but don't write tests for them.

- Constructor property checks (`arr.constructor === Array`) unless production code is known to rely on them
- Idempotency invariants only triggered by other library code (Lodash, native spread)
- Equivalent mutants — mutations that produce semantically identical code (e.g. swapping an unused conditional)
- Mutants on internal helpers users can't reach through any public API

If the summary lists `noCoverage` survivors, treat them as their own bucket: "the test suite doesn't even execute these lines." Triage them by the same rubric, but flag separately since they need a new test case rather than an assertion extension.

### 4. Pick the work set: up to 5 mutants

Order: all HIGH first, then MODERATE if budget remains, never LOW. Hard cap at 5 total. If HIGH alone exceeds 5, pick the 5 most distinct (don't pick 5 mutants on the same line — they probably share a fix; pick representatives across the file).

If fewer than 3 HIGH+MODERATE candidates exist, just do what's there. Don't pad with LOW just to hit a number.

Write up the work set to the user **before editing**:

```
Picked N survivors to address (M skipped as refactor-insurance / low-leverage):
  1. [HIGH] location — original → replacement
     plan: assert <X> in <covering test name>
  2. [HIGH] ...
  3. [MODERATE] ...
  ...
```

This is the user's chance to redirect. Don't write code yet.

### 5. Read covering tests for the picked survivors

For each picked survivor, the summary lists the test names that covered the line. Find those tests in the test file (usually `packages/<pkg>/test/<source-basename>.test.ts`, but check) and read **just the relevant `test('...')` blocks** — not the whole file. Use `Grep` + `Read` with line offsets to keep token cost down.

Goal: understand what the existing test asserts so the new assertion is additive, not contradictory.

### 6. Write the changes

Constraints:
- **Prefer extending an existing covering test** over adding a new one. Lower file churn, easier review.
- **Match the existing style** — same assertion library, same matcher idioms (`.toBe` vs `.toEqual` vs `.toStrictEqual`).
- **Minimal additions** — one or two assertions per mutant, not a new it-block per mutant.
- **No fabrication** — only assert what the source code actually does. If you can't tell from the source, stop and ask the user.
- **For `noCoverage` survivors**, add a new test case named after the behaviour being pinned. Place it next to related tests.

Use `Edit` with exact-string matches. Never rewrite entire test files.

### 7. Verify

Re-invoke `n8n:mutation-test` on the same source file. Report:

```
Before:  red 76.74% (28 survivors)
After:   green 82.34% (22 survivors)
Killed:  6 of 5 targeted (1 bonus — fix for #77 also killed #78)
Still surviving: 22 — re-invoke /n8n:strengthen-tests for another batch.
```

If the score went UP but threshold still not met: the iteration is working, recommend another pass.
If the score went DOWN or stayed the same: at least one new test isn't asserting what we think it asserts. Surface the diff to the user and stop — do not auto-revert.
If a test now fails (not survives — actually fails): we asserted something the code doesn't do. Revert that specific assertion, leave the rest, report which one was wrong.

## Output shape

Each invocation produces:

1. **Work plan** (before edits) — the picked survivors and the plan for each
2. **Diffs** (during edits) — Edit tool calls, visible in transcript
3. **Verify** (after) — re-run + before/after comparison

Keep prose minimal between sections. The plan and verify steps are the structured outputs; everything else is mechanical.

## Constraints

- **5 mutants max per invocation.** Re-invoke for more. Prevents runaway sessions on 30-survivor files.
- **Never fabricate assertions.** If the source doesn't clearly do X, don't claim it does.
- **No new test files unless absolutely necessary.** Extend the existing covering test file.
- **No reverting other people's tests.** Only edit tests in the package being mutated.
- **No re-running mutation-test more than once per invocation.** That's the verify step. Don't loop within a single invocation; let the user re-invoke.
- **No commits.** Edits land in the working tree; user reviews and commits.

## Common follow-ups

- User says "go again" → re-invoke this skill. The summary.json now reflects the post-edit state.
- User says "why was #N classified as LOW?" → explain the rubric application for that specific mutant, no re-triage of others.
- User says "kill #N specifically" → override the triage for that mutant, treat it as picked.
- User says "skip the verify step" → don't; the verify step is the contract that the edits actually moved the score.

## Related

- `n8n:mutation-test` — the read side of this loop
- DEVP-176 — Phase 1.5 of the broader observability project
- `scripts/mutation-health/README.md` — the BQ-backed observability story this slots into
