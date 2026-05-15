---
name: n8n-pr-readiness
description: Checks n8n branches before PR creation or review. Use when preparing a pull request, reviewing a branch, or deciding which n8n checks and subagents to run.
---

# n8n PR Readiness

## Review Pass

1. Inspect status, diff, and commits since the base branch.
2. Confirm every changed package followed its nearest `AGENTS.md`.
3. Check whether API types, migrations, i18n, docs, or Playwright janitor rules were required.
4. Run targeted verification before broad checks.

## Useful Subagents

- `pr-readiness-reviewer`: overall merge readiness.
- `regression-hunter`: behavioral regression search across package boundaries.
- `accessibility-reviewer`: changed frontend UI surfaces.
- `ui-smoke-test`: browser-level smoke test for changed UI paths.
- `node-change-reviewer`: built-in node, credential, polling, and webhook changes.

## Verification Guidance

Prefer package-scoped checks first:

```bash
pnpm --filter <package-name> lint
pnpm --filter <package-name> typecheck
pnpm --filter <package-name> test
```

Run repo-wide checks only when the blast radius justifies it or when preparing a final PR.
