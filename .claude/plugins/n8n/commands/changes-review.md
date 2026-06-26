---
description: Multi-discipline parallel sub-agent review of the local working-tree / branch changes in an n8n checkout (no PR needed)
---

Run a multi-discipline review of the **local changes** by fanning out specialized `n8n:autodev-*` sub-agents in parallel plus an independent second opinion, then synthesizing. Same lenses as a PR review, but on your working tree / branch (e.g. a worktree) instead of a PR.

## READ-ONLY by default

This command **explores and reviews only** — unless I explicitly tell you to make a change:
- By default: never edit, commit, push, checkout, stage, or otherwise modify any code, file, or git state; never open or touch a PR.
- Use only read-only git inspection (`git diff`, `git status`, `git log`).
- Sub-agents inherit this constraint: review only and report back, never edit files or touch git/GitHub.
- The sole output is the synthesized review. Only act (apply a fix, commit) when I explicitly instruct it, doing exactly that and nothing more.

## Step 1 — Gather the diff

No PR required. Determine the base ref: if `$ARGUMENTS` names one, use it; otherwise detect the default branch.

```bash
base=$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p'); base="${base:-master}"
echo "base: $base"
git diff "$base"...HEAD    # committed on this branch since it forked from base
git diff HEAD              # uncommitted changes (staged + unstaged)
git status -s
```

The change set under review is the union of *committed-since-base* and *uncommitted* changes. If there are no changes, say so and stop.

## Step 2 — Fan out reviewers (parallel)

Dispatch **in a single message** so they run concurrently. Give each the diff, the changed-file list, and a one-line summary of intent (infer it from the diff/commits). Each returns findings tagged `[BLOCKER]` / `[MAJOR]` / `[MINOR]` with `file:line` and a concrete fix. Always run the first four; add the fifth only when the diff touches frontend code (`.vue`, `packages/frontend/**`, `editor-ui`, or `@n8n/design-system`):

- **`n8n:autodev-architecture-reviewer`** (fallback `architecture-auditor`) — boundaries, coupling, abstractions, data flow, consistency with the n8n structure.
- **`n8n:autodev-security-reviewer`** (fallback `security-auditor`) — input validation, authn/authz, injection, secrets, unsafe deserialization, SSRF, path traversal, dependency risk, data exposure.
- **`n8n:autodev-conventions-reviewer`** (fallback `code-reviewer` + the `n8n:conventions` skill) — n8n coding standards, patterns, conventions, general code-quality and best-practice issues.
- **`n8n:autodev-test-reviewer`** (fallback `expert-test-developer`) — test coverage of the change, high-value missing tests, quality of new/existing tests. **Critically, flag meaningless or made-up tests** that don't exercise real behavior (assertions on mocks/stubs rather than the code under test; tautologies; "renders / doesn't throw" stand-ins; tests re-implementing production logic; coverage-padding). Treat these as `[BLOCKER]` or `[MAJOR]` — a misleading test is worse than no test.
- **`n8n:autodev-vue-reviewer`** *(only if frontend files changed)* (fallback `expert-vue3-developer` + the `n8n:design-system` skill) — Vue 3 + Pinia reactivity, design-system & i18n conventions, a11y, component health. Skip if no frontend files changed, and note it.
- **Simplicity / over-engineering (ponytail)** — the orchestrator runs `/ponytail-review` on the diff itself (a skill, not a sub-agent — agents can't load it). Flag speculative abstractions, needless config/flexibility, error handling for impossible cases, and code that could be inlined or deleted; tag `[MINOR]`–`[MAJOR]` and fold into the synthesis.

Also run an **independent second-opinion pass** over the diff when available (e.g. `codex review`, or a `cubic` / `/run-review` pass) and fold its findings in as another lens.

## Step 3 — Synthesize

1. **Verdict** — one line: looks-good / fix-before-PR / needs-work, plus the single most important reason.
2. **`[BLOCKER]` & `[MAJOR]`** — deduplicated across disciplines, each with discipline tag, `file:line`, and suggested fix.
3. **`[MINOR]`** — grouped, terse.
4. **Coverage note** — which reviewers ran, which were skipped and why.

Deduplicate overlapping findings and resolve contradictions, flagging any unresolved. Output the synthesis as your final message. Modify code only if I explicitly ask afterward.
