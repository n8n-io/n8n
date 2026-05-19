---
name: n8n-build-e2e
description: End-to-end Playwright flow scaffold for n8n features. Use when the user asks to "add e2e", "playwright test", "verify end-to-end", or wants Playwright coverage for a UI flow.
---

# n8n Build E2E

## Before writing

1. Read `packages/testing/playwright/AGENTS.md`. It overrides this skill where they conflict.
2. List existing tests that touch the same area in `packages/testing/playwright/tests/` and reuse fixtures and page objects rather than re-creating them.

## Test design

- Identify the user-visible critical path. Don't test internals.
- Pick selectors via `data-testid` only. Never select on raw DOM text or class names.
- Keep `data-testid` values as single strings (no spaces). If the production component is missing one, add it before writing the test.
- Use page objects from `packages/testing/playwright/pages/`. If a page object doesn't exist for the feature, create one and put the selectors there, not in the test.
- Seed required state via the existing fixtures (`packages/testing/playwright/fixtures/`). Don't reach directly into the DB from a test.

## Hard rules

- No `expect(true).toBe(true)`-style placeholder assertions.
- No tests that depend on real network calls — mock HTTP via `route`.
- Each test file targets one feature/flow. Co-locate happy path + 1–2 failure cases; split if the file gets long.
- Tests must run locally without paid licenses unless explicitly tagged.

## Run the suite

```bash
pnpm --filter=n8n-playwright test:local
```

Then run janitor for static analysis:

```bash
pnpm --filter=n8n-playwright janitor
```

Janitor flags dead helpers, unused page objects, and architecture violations. Fix what it finds before opening the PR.

## When to use this skill

- You added a new user-visible flow that warrants regression coverage.
- You touched a critical-path UI and want to lock in the contract.
- The user explicitly asks for e2e coverage.

When the change is internal-only (DB shape, util refactor) prefer Vitest/Jest unit tests instead.
