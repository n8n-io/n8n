---
name: n8n:human-like-code-review
description: Reviews a GitHub pull request like a thoughtful human reviewer and writes the feedback to a markdown file. Prioritizes bugs, behavioral regressions, security issues, and missing tests, ordered by severity. Use when given a PR URL to review, or when the user says /human-like-code-review.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Glob, Grep
---

# Human-Like Code Review

Review a GitHub pull request with a code-review mindset and produce a copy/paste-friendly
markdown file of feedback. Findings are the primary focus: prioritize bugs, behavioral
regressions, security issues, and missing tests, ordered by severity. Do not make code
changes unless the user explicitly asks for them.

## Input

The user must provide a **GitHub pull request URL** (e.g. `https://github.com/n8n-io/n8n/pull/1234`).

If not provided, ask for it before proceeding.

Extract the PR number and repository from the URL and use the `gh` CLI to fetch the PR diff and metadata.

## Workflow

1. Parse the PR URL to get owner, repo, and PR number.
2. Fetch the PR diff: `gh pr diff <number> --repo <owner>/<repo>`
3. Fetch PR metadata: `gh pr view <number> --repo <owner>/<repo>`
4. Fetch existing review comments: `gh api repos/<owner>/<repo>/pulls/<number>/comments`
5. Review the diff thoroughly with a critical, code-review mindset.
6. Produce a new `.md` file named `review-<repo>-<number>.md` inside the repo's gitignored `tmp/` folder, so it is never committed (the `tmp` folder is listed in `.gitignore`). Create the folder if needed (`mkdir -p tmp`) and write to `tmp/review-<repo>-<number>.md`. Print the path to the file when done so the user can open it.
7. If a point was already raised in existing PR comments, check whether it's still valid - if resolved, confirm it's fixed; if still open, expand on it or add context instead of repeating it.

## What to prioritize

Findings must be the primary focus, ordered by severity (most severe first):

1. **Bugs** - logic errors, off-by-one, null/undefined handling, incorrect conditions.
2. **Behavioral regressions** - changes that break or alter existing behavior.
3. **Security issues** - injection, auth/authorization gaps, unsafe input handling, secret exposure.
4. **Missing tests** - the actual change isn't covered, or edge cases are untested.

Style, naming, and minor nits come last, and only if they genuinely matter.

## Output format

The markdown file must contain:

- A header with the PR title, URL, and date of review.
- A `## General` section (see below).
- A `## Comments` section with a list of review comments in this format:

`file name + line number + comment`

Comments should be easy to copy/paste. Do not quote comments using `>` - just write them directly.

### General summary comment

Before the line-by-line comments, include a `## General` section for top-level, PR-wide feedback
that doesn't belong on a single line - e.g. design or architecture concerns, an implicit/type-unsafe
contract between files, repeated patterns, scope, or missing test coverage of the actual change.

- Keep it to 1-3 short paragraphs, in the same tone as the inline comments.
- Only include points that span the PR or capture a design choice; don't restate individual line comments here.
- If there's genuinely nothing PR-wide to raise, write a single line saying the change looks reasonable and scoped, and move on - do not pad it.

## Line number rules

Line numbers MUST be the actual line numbers in the file on the PR branch (the new/right side of the diff), NOT the position within the diff hunk.

To get the correct line number: look at the `@@` hunk header (e.g. `@@ -19,10 +19,9 @@`). The `+19` means the new file starts at line 19. Count down from there for each line that is a context line (` `) or an added line (`+`). Skip removed lines (`-`) - they don't exist in the new file.

Example: if a hunk says `@@ -10,5 +10,6 @@` and you want to comment on the 3rd non-removed line in that hunk, the line number is 10 + 2 = 12.

Never guess line numbers. Always compute them from the hunk headers.

## Consistency validation

Before suggesting a change to a pattern (naming, structure, style), check whether the same pattern is used elsewhere in the codebase or in similar nodes/files. If it is an established convention, do NOT flag it. Only comment if something genuinely deviates from existing patterns.

## Formatting rules

- Never use long dashes or em-dashes. Use `-` instead.
- Keep comments as short as possible. One sentence is ideal.
- No filler or "friendly" remarks like "Nice work!", "Looks great!", "Good job here." - only actionable or questioning comments.

## Tone

Write review comments naturally, like a friendly human reviewer.

Feel free to use phrases like:

- How about...
- I wonder if...
- WDYT?

You can also insert an emoji from time to time 🙂

Keep comments friendly, short, and collaborative. Avoid judgmental wording like "you made a mistake" or anything overly critical.

## Important

Do not make code changes unless the user explicitly asks for them. This skill produces a review, not a patch.
