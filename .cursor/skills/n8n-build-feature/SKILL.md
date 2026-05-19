---
name: n8n-build-feature
description: Fully autonomous orchestrator for shipping a feature in the n8n monorepo. Use when the user asks to "build a feature", "implement this", or "ship X". Plans, implements, and verifies end-to-end without prompting for confirmation between phases.
---

# n8n Build Feature

You are running this skill because the user asked for a feature to be implemented end-to-end. You should plan, implement, and verify without asking for confirmation between phases. The only stop conditions are:

- A hard ambiguity that genuinely requires a product decision (e.g. two valid cross-package contracts and the user did not specify) — ask one focused question.
- A destructive git action that `git-hygiene` blocks (force push, hard reset, dropping unrelated changes).

Everything else is your responsibility.

## Before editing

1. Read the root `AGENTS.md` and the nearest package-level `AGENTS.md` for every package you will touch.
2. Search the repo for existing primitives before creating new ones. Specifically:
   - Frontend components: `packages/frontend/@n8n/design-system/src/components/`, feature-local components (e.g. `InsightsChart*`, `InsightsSummary`, `InsightsDataRangePicker`, `ChatInputBase`, `ChatMarkdownChunk`, `ChatTypingIndicator`).
   - Shared API shapes: `packages/@n8n/api-types/src/schemas/` and `dto/`.
   - Backend services: `packages/cli/src/modules/<feature>/` and `packages/cli/scripts/backend-module/backend-module-guide.md`.
3. Branch from `hsaab-master` unless the user names a different base. Use the Linear branch suggestion only if it does not reveal a security issue.

## Implementation order

Always work in dependency order so consumers don't typecheck against stale shapes:

```
@n8n/api-types  →  packages/cli  →  packages/frontend/editor-ui  →  @n8n/i18n  →  tests
```

Within each package:

- Define / extend the contract first.
- Use `@Env` + `@Config` for env vars; never read `process.env` directly outside of `@n8n/config`.
- Frontend: route → store → component, in that order. Keep Pinia state narrow.
- All UI text via `@n8n/i18n`. Always wrap placeholders in `interpolate: { … }` — a top-level `{ key }` second arg silently breaks substitution.
- `data-testid` is a single string, no spaces.

## Hard rules

- No `any`. No `as` casts outside tests.
- No hardcoded `px`/`rem` in editor-ui SCSS — use semantic tokens from `_tokens.scss`/`_primitives.scss`.
- No imports from `_tokens.legacy.scss`.
- No deprecated icons (`updatedIconSet` only).
- REST handlers carry `@ProjectScope` or `@GlobalScope`. Public routes need `skipAuth: true` plus a comment.
- LLM features must default to a deterministic fallback if no key is configured (see `n8n-demo-feature` and `n8n-llm-feature`).

## Verification (run before commit, in this order)

After every cross-package change:

```bash
pnpm --filter @n8n/api-types build
pnpm --filter n8n typecheck
pnpm --filter n8n-editor-ui typecheck
pnpm --filter <package-you-changed> lint
pnpm --filter <package-you-changed> test
```

For UI changes that you also need to smoke-test via the built app (`pnpm start`):

```bash
pnpm --filter @n8n/api-types build
pnpm --filter n8n build
pnpm --filter n8n-editor-ui build
pnpm start
```

Use `http://localhost:5678` for the built app, not `:8080`. `:8080` is the Vite dev server (`pnpm dev:fe`) and only works when every workspace dependency builds cleanly.

## PR

Create a draft PR via `n8n:create-pr` (or `gh pr create --draft` if no skill). PR description must include:

- Linear ticket link.
- Rebuild order if api-types or cli changed.
- Env vars introduced.
- Manual demo steps.
- "Bugbot rules expected to flag this PR" if the implementation knowingly hits one (e.g. Opus default).

## Auto-cite when relevant

Read these as you go — do not announce them, just follow them:

- `n8n-change-workflow`
- `n8n-pr-readiness`
- `design-system`
- `protect-endpoints`
- `content-design`
- `n8n-llm-feature` (LLM-backed features)
- `n8n-demo-feature` (demo-gated features)
- `n8n-rebuild-doctor` (when the UI doesn't reflect the change)
