# Community PR Readiness Check — checks

The full ruleset for the auto-rejection screen and the five readiness checks. Loaded when the skill is mid-review.

## Contents

- Step 2.5 — Auto-rejection screening
  - Typo-only PR
  - New-node PR
- The five checks (run after auto-rejection screen clears)
  - A. CLA signed
  - B. PR title format
  - C. PR description completeness
  - D. Tests
  - E. cubic-dev-ai issues

---

## Step 2.5 — Auto-rejection screening

Before running the five checks, screen for PRs that the project policy in [`CONTRIBUTING.md`](../../../../../../CONTRIBUTING.md) (section "Community PR Guidelines") says should be rejected outright. If a PR matches one of these patterns, skip the five checks and recommend a polite close instead.

### Typo-only PR

The diff consists **entirely** of:

- Spelling fixes in code comments, error messages, or user-visible description strings.
- No new tests, no logic changes, no behaviour changes, no config changes.

Per CONTRIBUTING.md: *"Typos are not sufficient justification for a PR and will be rejected."* Use `gh pr diff <number>` to verify the diff is purely text-edit. A PR that mixes a typo fix with a real logic fix is **not** typo-only — review it normally.

### New-node PR

The diff adds a new node entry: a new `*.node.ts` (and usually a sibling credentials file) under `packages/nodes-base/nodes/<NewNode>/` or `packages/@n8n/nodes-langchain/nodes/<NewNode>/`, with no corresponding node already existing in the codebase.

Per CONTRIBUTING.md: *"PRs that introduce new nodes will be auto-closed unless they are explicitly requested by the n8n team."* If the user calling the skill states the n8n team has agreed to take this node, proceed with the normal review; otherwise flag for close with a pointer to the [Community Nodes](https://docs.n8n.io/integrations/creating-nodes/overview/) flow.

### When a screen matches

Skip the five checks. Set `checks.AutoReject` in the JSON output to `"typo-only"` or `"new-node"` and proceed to action path 7D in SKILL.md (close the PR).

---

## The five checks

Run these in order when step 2.5 clears (`AutoReject` is `null`).

### A. CLA signed

Check the PR `labels` returned from `gh pr view`:

- `cla-signed` label present → ✅ signed
- `cla-signed` label missing → ❌ not signed

### B. PR title format

The authoritative title rules live in [`.github/pull_request_title_conventions.md`](../../../../../../.github/pull_request_title_conventions.md). Read that file at the start of the check — the allowed `type` list and scope rules come from there, not from this skill.

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

The PR template at [`.github/pull_request_template.md`](../../../../../../.github/pull_request_template.md) is the **source of truth** for what a complete PR description looks like. Read it at the start of the check — sections and checklist items shouldn't be hardcoded here.

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
