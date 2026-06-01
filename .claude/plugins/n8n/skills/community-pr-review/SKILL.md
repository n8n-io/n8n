---
description: >-
  Checks if a community pull request is ready for human review. Verifies CLA
  signature, PR title format, description completeness, test coverage, and
  cubic-dev-ai issues. Use when given a PR number or branch name to review,
  or when the user says /community-pr-review, /pr-review, or asks to check if
  a PR is ready for review.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Glob, Grep
---

# Community PR Review

Given a PR number or branch name, determine whether it is ready for human review.

## Steps

### 1. Resolve the PR

If given a branch name, find the PR number first:
```bash
gh pr view <branch> --repo n8n-io/n8n --json number --jq .number
```

### 2. Fetch PR data

```bash
gh pr view <number> --repo n8n-io/n8n \
  --json number,title,body,author,headRefName,headRefOid,files,isDraft,state
```

Fetch in parallel:

```bash
# CLA commit status (primary signal) — statuses are newest-first; use the first returned entry
gh api --paginate "repos/n8n-io/n8n/commits/<headRefOid>/statuses" \
  --jq '[.[] | select(.context == "license/cla") | {state, description}] | first'

# CLAassistant issue comment (fallback when no commit status) — use the last returned entry
gh api --paginate "repos/n8n-io/n8n/issues/<number>/comments" \
  --jq '[.[] | select(.user.login == "CLAassistant") | .body] | last'

# cubic-dev-ai PR review comments (streamed so results concatenate cleanly across pages)
gh api --paginate "repos/n8n-io/n8n/pulls/<number>/comments" \
  --jq '.[] | select(.user.login == "cubic-dev-ai[bot]") | {body: .body, path: .path}'
```

### 3. Run the five checks

#### A. CLA signed

Check the `license/cla` commit status first; fall back to the CLAassistant comment if no status exists.

**Commit status** (`context == "license/cla"`):
- `state: "success"` → ✅ signed
- `state: "failure"` or `state: "error"` → ❌ not signed
- `state: "pending"` → ⏳ pending
- Not present → fall back to comment

**CLAassistant issue comment** (fallback):
- Body contains `"All committers have signed the CLA."` → ✅ signed
- Body contains `"not signed"` or a link to sign → ❌ not signed
- No comment → ❌ treat as not signed

#### B. PR title format

For all types except `revert`, the title must match:
```
^(feat|fix|perf|test|docs|refactor|build|ci|chore)(\([a-zA-Z0-9 ]+( Node)?\))?!?: [A-Z].+[^.]$
```

For `revert` titles, the summary is the original commit header (which starts with a lowercase type), so capitalization is not enforced:
```
^revert(\([a-zA-Z0-9 ]+( Node)?\))?!?: .+[^.]$
```

- Type must be one of: `feat fix perf test docs refactor build ci chore revert`
- Scope is optional, in parentheses e.g. `(editor)` or `(Slack Node)`
- Breaking changes: `!` before the colon
- Summary: starts with capital letter (lowercase allowed for `revert:`), no trailing period
- No Linear ticket IDs in the title (e.g. `N8N-1234`)

#### C. PR description completeness

1. **Summary** (`## Summary`) — must have non-empty content below the heading (not just the HTML comment).
2. **Related tickets** (`## Related Linear tickets, Github issues, and Community forum posts`) — acceptable content: a URL (`http`), a GitHub closing keyword (`closes #N`, `fixes #N`, `resolves #N`, etc.), or empty. Only flag if the section heading is missing entirely.
3. **Checklist** (`## Review / Merge checklist`) — all four items must be present. Unchecked checkboxes are expected for community PRs; do **not** flag them as missing.

#### D. Tests

Skip this check if the PR type (from the title) is `docs`, `ci`, `chore`, or `build`.

Otherwise:
1. Identify source files changed: non-test files under `packages/` from the `files` list.
2. If there are source file changes, check out the PR in a temporary worktree:

```bash
git fetch origin pull/<number>/head:pr/<number>
git worktree add /tmp/pr-<number>-review pr/<number>
```

3. Read the changed source files from the worktree to understand whether the changes introduce logic that warrants tests (new functions, bug fixes, behaviour changes, data transformations). Pure config changes, type-only changes, and trivial renames do not require tests.
4. Look for matching test files (`*.test.ts`, `*.spec.ts`, files inside `__tests__/`) among the changed files.
5. **Always clean up the worktree**, even if a previous check failed:

```bash
git worktree remove /tmp/pr-<number>-review --force
git branch -D pr/<number>
```

Report:
- ✅ Tests present, or change does not require tests
- ❌ Source logic changed but no test files found

#### E. cubic-dev-ai issues

Review the PR review comments fetched in step 2. `cubic-dev-ai[bot]` leaves comments for every issue it finds.

- No comments from `cubic-dev-ai[bot]`, or every comment explicitly states no issues were found → ✅
- Any other comment → ❌ report the total count and priority breakdown (e.g. "3 issues: 1× P1, 1× P2, 1× P3")

### 4. Output

Always output valid JSON in this exact shape:

```json
{
  "readyForReview": <true if all passing checks allow merge, false otherwise>,
  "messageForUser": "<Human-readable summary of what needs to change, written as if posted directly to the PR contributor. 'N/A' if nothing is needed.>",
  "checks": {
    "CLA": <true if signed, false if not signed or pending>,
    "Title": <true if title matches convention, false otherwise>,
    "Description": <true if all three template sections are complete, false otherwise>,
    "TestsNeeded": <true if the code changes require tests, false if not applicable>,
    "TestsIncluded": <true if test files are present in the PR, false otherwise>,
    "CubicIssues": <true if cubic-dev-ai raised issues, false if no issues>
  }
}
```

`readyForReview` is `true` only when: `CLA`, `Title`, and `Description` are all `true`; `CubicIssues` is `false`; and either `TestsNeeded` is `false` or `TestsIncluded` is `true`.

`messageForUser` should be a short, friendly message directed at the contributor listing exactly what they need to address. If `readyForReview` is `true`, set it to `"N/A"`.

Output nothing other than the JSON block.

## Notes

- Draft PRs — report all findings but note the PR is a draft.
- If the PR is already merged or closed, say so and skip the checks.
- Always remove the worktree even if earlier checks failed.
