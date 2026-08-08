---
name: n8n:human-like-code-review
description: Reviews a GitHub pull request like a thoughtful human reviewer and writes the feedback to a markdown file. Prioritizes context, architecture fit, solution complexity, bugs, security edge cases, and missing tests. Use when given a PR URL to review, or when the user says /human-like-code-review.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Glob, Grep
---

# Human-Like Code Review

Review a GitHub pull request with a code-review mindset and produce a copy/paste-friendly
markdown file of feedback. Context is the foundation: understand the problem, intended
solution, and surrounding architecture before judging the diff. Findings are the primary
focus: prioritize architecture, over-complexity, bugs, regressions, security edge cases,
and missing tests. Do not make code changes unless the user explicitly asks for them.

## Input

The user must provide a **GitHub pull request URL** (e.g. `https://github.com/n8n-io/n8n/pull/1234`).

If not provided, ask for it before proceeding.

Extract the PR number and repository from the URL and use the `gh` CLI to fetch the PR diff and metadata.

## Workflow

1. Parse the PR URL to get owner, repo, and PR number.
2. Fetch the PR diff: `gh pr diff <number> --repo <owner>/<repo>`
3. Fetch PR metadata: `gh pr view <number> --repo <owner>/<repo>`
4. Fetch existing review comments: `gh api repos/<owner>/<repo>/pulls/<number>/comments`
5. If the PR description mentions a Linear issue, pull the ticket context with
   `n8n:linear-issue` before reviewing the diff. Use the ticket description,
   comments, linked GitHub issues/PRs, media, related issues, affected node
   popularity, and effort estimate as review context. If the skill is not
   available, fetch the same Linear context through the active Linear MCP or ask
   the user to provide the ticket details before continuing.
6. Build a short context model: what problem is being solved, what behavior is
   expected, which packages or systems are affected, and what constraints come
   from the PR description, Linear ticket, linked issues, specs, or existing
   code.
7. Review the diff thoroughly with a critical, code-review mindset.
8. Produce a new `.md` file named `review-<repo>-<number>.md` inside the repo's gitignored `tmp/` folder, so it is never committed (the `tmp` folder is listed in `.gitignore`). Create the folder if needed (`mkdir -p tmp`) and write to `tmp/review-<repo>-<number>.md`. Print the path to the file when done so the user can open it.
9. If a point was already raised in existing PR comments, check whether it's still valid - if resolved, confirm it's fixed; if still open, expand on it or add context instead of repeating it.
10. Before finishing, clean up any scratch files created during review. The only
   file that should remain in `tmp/` from this skill run is the final
   `tmp/review-<repo>-<number>.md` review file.

## Temporary file hygiene

Prefer reading `gh` output directly instead of writing extra files. If you need
scratch files for a complex review (for example, a saved diff or extracted file
contents), remove them before you finish. Do not leave `tmp/pr-*.diff`,
extracted source files, or empty temporary files behind.

## Context-first review

Do not start from the changed lines alone. First understand the problem being
solved, the exact behavior promised by the PR/ticket/spec, which architectural
layer should own it, which existing patterns or helpers it should fit, and the
important edge cases: security, permissions, malformed input, compatibility,
persistence, concurrency, and rollback behavior.

If the context is missing or contradictory, say so in `## General` and review
the diff with that uncertainty explicit instead of inventing requirements.

## What to prioritize

Findings must be the primary focus, ordered by severity (most severe first):

1. **Architecture fit** - behavior in the wrong package/layer, duplicated ownership, leaky contracts, bypassed services, missing authorization boundaries, or changes that do not fit the larger system.
2. **Solution complexity** - too much code for the problem, speculative abstraction, or custom logic where an existing helper, API, or simpler approach would solve it.
3. **Bugs and behavioral regressions** - logic errors, off-by-one, null/undefined handling, incorrect conditions, changed defaults, altered output shape, or broken existing workflows.
4. **Security edge cases** - injection, auth/authorization gaps, unsafe input handling, secret exposure, SSRF/path traversal risks, privilege escalation, unbounded resource use, and missing validation at trust boundaries.
5. **Code quality** - unclear contracts, brittle coupling, weak typing, needless casts, duplicated code, error handling that hides failures, or deviation from established patterns.
6. **Missing tests** - missing coverage for the actual change, important edge cases, or the behavior promised by the PR/ticket.

Style, naming, and minor nits come last, and only if they genuinely matter.

## Architecture and complexity checks

For non-trivial changes, compare nearby implementations and shared utilities.
Ask whether the behavior belongs in the node, controller, service, repository,
frontend store, shared API type, or existing workflow utility. If 100 lines
could reasonably be 10, explain the simpler shape and why it is safer or easier
to maintain. Do not flag complexity just because the diff is large; flag it when
the extra code creates risk, duplicate behavior, or avoidable maintenance cost.

## Backward compatibility

Especially when nodes are changed, check that the change does not break backward
compatibility for existing users' workflows (renamed/removed parameters, changed
defaults, altered output shape, different behavior for the same input).

If there's a risk of broken backward compatibility, consider node versioning and
leave this inside the comments - point out the risk and suggest a new node version
(or a versioned default) rather than changing existing behavior in place.

## Review checklist

Use this checklist while reviewing. Do not force comments for every category,
but make sure the diff has been checked against these common failure modes.

### Memory leaks

- Event listeners / subscriptions added without a corresponding remove/unsubscribe
- Timers (`setInterval`, `setTimeout`) that are never cleared
- Closures that capture large objects and outlive their scope
- Caches or Maps that grow without eviction logic
- Streams or file handles opened but not closed on all code paths, including error paths
- Class fields holding references that should be nulled on `dispose()`/`destroy()`
- **Streams**: `.write()` return value ignored (missing `drain` await), `.pipe()` used instead of `pipeline()`, missing `AbortSignal` for teardown, `objectMode` streams with untuned `highWaterMark`, Transform streams without asymmetric buffer limits.

### Edge cases

- `null` / `undefined` inputs - are they guarded or documented as preconditions?
- Empty collections - does the code handle `[]` and `{}`?
- Off-by-one errors in loops and slices
- Concurrent / re-entrant calls - are async methods safe to call twice in flight?
- Race conditions between async operations that share mutable state, cursors, locks, polling, or background tasks
- Integer overflow / precision loss for numeric fields
- Partial failure in multi-step operations - is state left consistent?
- Missing `default` in `switch` statements over union types

### Persistence / API contracts

- Migrations, foreign keys, rollback behavior, and entity fields line up
- Resource ownership and project/user scoping are enforced in services, not just routes
- Authenticated controller routes use `@ProjectScope` or `@GlobalScope`
- Package boundaries are respected; `cli` or n8n-specific concepts should not leak into generic SDK packages

### Readability

- Method names that don't match what the method does
- Boolean parameters that obscure call-site intent (prefer objects or overloads)
- Deep nesting (> 3 levels) - early returns or extraction help
- Magic numbers / strings without named constants
- Comments that restate the code instead of explaining *why*
- Inconsistent naming conventions within the same file or module
- Too many type assertions instead of type guards

### Method / function size

- Flag any method over ~100 lines for a refactor suggestion
- Flag methods that are growing toward complexity: many parameters (> 4), deeply nested conditions, multiple levels of abstraction mixed together
- Suggest extraction by responsibility: setup, core logic, teardown - each can be its own well-named helper
- For complex switch/if-chains, suggest a dispatch table or strategy pattern where it simplifies future extension

## Severity and priority definitions

| Severity | Meaning |
|---|---|
| Critical | Data loss, crash, security hole, or resource leak that will occur in production |
| High | Likely to cause bugs or silent failures under realistic inputs |
| Medium | Reduces robustness or will cause problems as the code grows |
| Low | Style, readability, or minor improvement |

| Priority | Meaning |
|---|---|
| P1 | Must fix before merge |
| P2 | Should fix in this PR or as immediate follow-up |
| P3 | Nice to have, can be filed as a task |

## Output format

The markdown file must contain:

- A header with the PR title, URL, and date of review.
- A `## Hints for a reviewer` section (see below).
- A `## General` section (see below).
- A `## Comments` section with a list of review comments in this format:

`file name + line number + comment`

- A plain-text `## Issue Summary` section at the end of the review (omit
  categories with no issues).

Comments should be easy to copy/paste. Do not quote comments using `>` - just write them directly.

It's totally okay to have no line comments. Do not force findings or point out
minor things just to have something to say. In those cases, prefer an empty
comments list and a short positive `## General` comment.

When a comment suggests something different, be precise about it. Either propose the actual code change (a short snippet or `suggestion` block the author can apply directly) or, if a full snippet isn't practical, state the concrete direction (which function/value/approach to use) rather than a vague hint. Avoid comments like "this could be cleaner" with no actionable next step.

### Issue summary

After the prose review, always end with a plain-text `## Issue Summary` section. If there are no issues in a category, skip that category rather than
adding empty headings.

Use this format:

```markdown
## Issue Summary

1. Critical / P1 / Memory leak
   Location: `path/to/file.ts:42`
   `setInterval` in constructor is never cleared.

2. High / P2 / Edge case
   Location: `path/to/service.ts:100`
   No guard for empty array - crashes on `arr[0].id`.

3. Medium / P3 / Method size
   Location: `path/to/handler.ts:buildFoo()`
   80-line method mixes validation, mapping and I/O; suggest splitting into three helpers.
```

### Hints for a reviewer

Right after the header, include a `## Hints for a reviewer` section to orient the
human reviewer before they read the diff:

- A short reason why the PR was created (the problem it solves or the goal).
- A few basic words explaining the solution, without overcomplication.
- If it's a community PR, mention it briefly. You can usually spot this from
  `authorAssociation` or a fork-prefixed branch like `random-fork-owner:fix-node-option`.

Keep it to a couple of sentences. It's about saving the reviewer time, not a
detailed write-up.

### General summary comment

Before the line-by-line comments, include a `## General` section that can be
pasted as the review summary. Make it sound human and natural - it is okay to
start with something short and friendly like "Hey, nice job on this" when the
change deserves it. Then add any top-level, PR-wide feedback that doesn't belong
on a single line - e.g. design or architecture concerns, an implicit/type-unsafe
contract between files, repeated patterns, scope, or missing test coverage of
the actual change.

- Keep it short and conversational. Don't repeat or summarize the individual line comments here.
- The exception is a big design issue with the overall solution: when the whole approach is wrong or has a structural problem, explain the overall idea here rather than scattering it across individual comments.
- If there's genuinely nothing PR-wide to raise, write a short positive review
  summary and move on - do not pad it.

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
- For line comments, avoid filler like "Nice work!", "Looks great!", or "Good job here." - keep them actionable or questioning.

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

The very last sentence of your reply must be a clickable Markdown link to the
review file, so the user can open it from the agent chat immediately. Use this
format: `[tmp/review-<repo>-<number>.md](tmp/review-<repo>-<number>.md)`.
Nothing should come after the link.
