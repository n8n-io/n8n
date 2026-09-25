# Community PR Readiness Check — checks

The full ruleset for the auto-rejection screen and the readiness checks. Loaded when the skill is mid-review.

## Contents

- Step 2.5 — Auto-rejection screening
  - Typo-only PR
  - New-node PR
  - Low-value / automated PR
- The readiness checks (run after auto-rejection screen clears)
  - A. CLA signed
  - B. PR title format
  - C. PR description completeness
  - D. Tests
  - E. cubic-dev-ai issues
  - F. Linked issue or forum discussion
  - G. Size (single logical change)

---

## Step 2.5 — Auto-rejection screening

Before running the readiness checks, screen for PRs that the project policy in `CONTRIBUTING.md` (section "Community PR Guidelines") says should be rejected outright. If a PR matches one of these patterns, skip the readiness checks and recommend a polite close instead.

### Typo-only PR

The diff consists **entirely** of:

- Spelling fixes in code comments, error messages, or user-visible description strings.
- No new tests, no logic changes, no behaviour changes, no config changes.

Per CONTRIBUTING.md: *"Typos are not sufficient justification for a PR and will be rejected."* Use `gh pr diff <number>` to verify the diff is purely text-edit. A PR that mixes a typo fix with a real logic fix is **not** typo-only — review it normally.

### New-node PR

The diff adds a new node entry: a new `*.node.ts` (and usually a sibling credentials file) under `packages/nodes-base/nodes/<NewNode>/` or `packages/@n8n/nodes-langchain/nodes/<NewNode>/`, with no corresponding node already existing in the codebase.

Per CONTRIBUTING.md: *"PRs that introduce new nodes will be auto-closed unless they are explicitly requested by the n8n team."* If the user calling the skill states the n8n team has agreed to take this node, proceed with the normal review; otherwise flag for close with a pointer to the [Community Nodes](https://docs.n8n.io/integrations/creating-nodes/overview/) flow.

### Low-value / automated PR

CONTRIBUTING.md §6 lists low-value and automated PRs as close-on-sight. Match **only** when the diff, read via `gh pr diff <number>`, is **entirely** one of these with no functional change and no rationale in the description:

- Whitespace, formatting, or pure reordering with no functional reason.
- Mass find-and-replace or renames submitted with no rationale.
- A dependency bump with no explanation of why the bump is needed.
- README badges, comment-only tweaks, or restating the obvious.
- Bulk or scripted submissions spanning many unrelated files.

Be conservative — this is a close, so bias toward *not* matching. If any part of the diff changes behaviour, adds a test, or the description gives a genuine reason, do **not** match; run the readiness checks instead. Contribution-farming intent (e.g. Hacktoberfest with no real change) reinforces a match but is never the sole basis — the diff must already be low-value.

### When a screen matches

Skip the readiness checks. Set `checks.AutoReject` in the JSON output to `"typo-only"`, `"new-node"`, or `"low-value"` and proceed to action path 7D in SKILL.md (close the PR).

---

## The readiness checks

Run these in order when step 2.5 clears (`AutoReject` is `null`).

### A. CLA signed

Check the PR `labels` returned from `gh pr view`:

- `cla-signed` label present → ✅ signed
- `cla-signed` label missing → ❌ not signed

### B. PR title format

The authoritative title rules live in `.github/pull_request_title_conventions.md`. Read that file at the start of the check — the allowed `type` list and scope rules come from there, not from this skill.

The matching regex below is a cached extraction of those rules. If the conventions file disagrees with the regex (a new type, a different scope syntax), trust the file and flag the divergence in your output.

For all types except `revert`:

```
^(feat|fix|perf|test|docs|refactor|build|ci|chore)(\([a-zA-Z0-9 ]+( Node)?\))?!?: [A-Z].+[^.]$
```

For `revert` titles, the summary is the original commit header (which starts with a lowercase type), so capitalization is not enforced:

```
^revert(\([a-zA-Z0-9 ]+( Node)?\))?!?: .+[^.]$
```

Quick recap of what the regex enforces (full detail in the conventions file):

- Type must be one of: `feat fix perf test docs refactor build ci chore revert`.
- Scope is optional, in parentheses; characters limited to `[a-zA-Z0-9 ]` — hyphens like `(nodes-base)` fail.
- Breaking changes: `!` before the colon.
- Summary: starts with capital letter (lowercase allowed for `revert:`), no trailing period.
- No Linear ticket IDs in the title (e.g. `N8N-1234`).

### C. PR description completeness

The PR template at `.github/pull_request_template.md` is the **source of truth** for what a complete PR description looks like. Read it at the start of the check — sections and checklist items shouldn't be hardcoded here.

Procedure:

1. Read the template file and extract:
   - Every `## Heading` (the expected section list).
   - Every `- [ ]` checkbox item under the `## Review / Merge checklist` heading.
2. For each `## Heading` from the template, check the PR body contains a heading with the same text. Treat headings case-insensitively but require the exact text — `## Related Issue` does **not** satisfy `## Related Linear tickets, Github issues, and Community forum posts`.
3. For the `## Summary` heading specifically, require non-empty content below it (the HTML comment placeholder doesn't count as content).
4. For the checklist, require every extracted checkbox item to appear in the PR body. Match by the item text (after stripping `- [ ]` / `- [x]`); the boxes can be checked or unchecked — community PRs commonly leave them unchecked, which is fine.
5. For the "Related tickets" section: if the heading is present, accept any of these as content: a URL (`http`), a GitHub closing keyword (`closes #N`, `fixes #N`, `resolves #N`), or empty (only the HTML comment). Only flag if the heading is missing entirely.

When the check fails, report **which** section or checkbox item is missing — that's what the contributor message includes.

### D. Tests

Skip this check entirely if the PR type (from the title) is `docs`, `ci`, `chore`, or `build`.

Otherwise:

1. Identify source files changed: non-test files under `packages/` from the `files` list.
2. If there are source file changes, read the diff via `gh pr diff`:
   ```bash
   gh pr diff <number> --repo n8n-io/n8n
   ```
3. Use the diff to judge whether the changes introduce logic that warrants tests (new functions, bug fixes, behaviour changes, data transformations). Pure config changes, type-only changes, and trivial renames do not require tests.
4. Look for matching test files (`*.test.ts`, `*.spec.ts`, files inside `__tests__/`) among the changed files.
5. For a **bug fix** (`fix` type), CONTRIBUTING.md §3 asks for a regression test that fails against `master` without the change. You can't run it here, so confirm the PR both adds/updates a test that exercises the fixed path **and** the description says how to see it fail. A `fix` PR with no test covering the bug, or a test that clearly doesn't touch the changed path, is ❌ even if unrelated tests exist.

**Fallback only if needed**: if the diff alone is insufficient (e.g. you need to read the full surrounding function body to assess whether a refactor preserved behaviour), check out a temporary worktree:

```bash
git fetch origin pull/<number>/head:pr/<number>
git worktree add /tmp/pr-<number>-review pr/<number>
# … inspect files …
git worktree remove /tmp/pr-<number>-review --force
git branch -D pr/<number>
```

Always clean up the worktree afterwards. In sub-agent contexts, `git fetch` and `git worktree add` are often denied by the sandbox — that's fine, the `gh pr diff` path handles almost every PR on its own.

Report:

- ✅ Tests present, or change does not require tests
- ❌ Source logic changed but no test files found

### E. cubic-dev-ai issues

Fetch the PR review comments:

```bash
gh api --paginate "repos/n8n-io/n8n/pulls/<number>/comments" \
  --jq '.[] | select(.user.login == "cubic-dev-ai[bot]") | {body: .body, path: .path}'
```

`cubic-dev-ai[bot]` leaves a comment for every issue it finds. An issue is **resolved** if its comment body contains an "addressed in commit" marker — typically `✅ Addressed in [<sha>]` or `Addressed in <sha>`. Resolved issues count as if they were never raised.

- No comments, every comment explicitly states no issues were found, or every issue is marked addressed → ✅
- One or more unresolved comments → ❌ report the unresolved count and priority breakdown (e.g. "3 unresolved issues: 1× P1, 1× P2, 1× P3")

### F. Linked issue or forum discussion

CONTRIBUTING.md §1 moves the quality gate before the code: bug fixes need a tracked issue, features and refactors need prior discussion. Gate by PR type (from the title):

- **Skip** (auto-pass) for `docs`, `ci`, `chore`, `build`, and `test` types — housekeeping doesn't need a prior issue.
- **`fix`** — require a linked GitHub issue: a closing keyword (`fixes/closes/resolves #N`) or an `github.com/n8n-io/n8n/issues/N` URL in the body (i.e. `relatedIssueTickets` from step 5b is non-empty, or the raw reference is present).
- **`feat`, `refactor`, `perf`** — require prior discussion: either a linked GitHub issue (as above) **or** a `community.n8n.io` forum link in the body.

Report:

- ✅ Required link present, or type is skipped
- ❌ `fix` with no linked issue, or `feat`/`refactor`/`perf` with no linked issue or forum link

A ❌ here is a **return**, not a close: it sets `readyForReview` false and drives a path-C contributor comment asking for the issue or forum topic (see SKILL.md). This is a heuristic — if the PR body clearly describes a tracked discussion by other means, use judgement.

### G. Size (single logical change)

CONTRIBUTING.md §6: a PR should add no more than **1000 lines** and cover one logical change. Compute the line count from the per-file `additions` in the `files` list fetched in step 2 (each entry has `path` and `additions`) — not the aggregate `additions` from `gh pr view`, which can't be filtered:

- Sum `additions` across the `files` list, **skipping** obvious lockfiles and generated/vendored files (e.g. `pnpm-lock.yaml`, generated API clients). Set `Oversized` true when that filtered sum is `> 1000` — a large lockfile diff alone is not "oversized".
- `Oversized` true is a **return**, not a close: `readyForReview` becomes false and path C asks the contributor to split the PR into focused pieces.

This is advisory-strength: a single cohesive change that genuinely needs >1000 lines (e.g. one sanctioned node) can be waved through by the human reviewer, so phrase the comment as a request to split *if the work is separable*.
