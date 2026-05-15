---
name: n8n-change-workflow
description: Guides implementation and verification of code changes in the n8n pnpm/Turbo monorepo. Use when editing n8n packages, API contracts, backend modules, frontend UI, or cross-package behavior.
---

# n8n Change Workflow

## Before Editing

1. Read the root `AGENTS.md` and the nearest package-level `AGENTS.md`.
2. Identify the affected package boundary: `api-types`, `workflow`, `cli`, `frontend`, `nodes-base`, or another `packages/@n8n/*` package.
3. Search nearby callers, tests, and shared exports before adding new abstractions.

## Implementation

- Use `pnpm` only.
- Keep changes package-scoped unless a shared contract requires cross-package edits.
- Put frontend text in `@n8n/i18n`; do not hardcode UI copy.
- Keep API shapes in `packages/@n8n/api-types` when the shape crosses frontend/backend.
- Use n8n error classes rather than generic errors.

## Verification

Start with the narrowest useful check:

```bash
pnpm --filter <package-name> lint
pnpm --filter <package-name> typecheck
pnpm --filter <package-name> test
```

Broaden when the change touches shared types, workflow execution, migrations, or package exports. Report exactly which checks ran and what remains unverified.
