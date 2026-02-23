# Golden Rules

Mechanical, opinionated rules that keep the codebase consistent for both
humans and AI agents. Each rule has a corresponding lint rule or structural
test — violations are caught automatically, not by code review.

> **For agents:** When a lint rule fires, the error message tells you what's
> wrong, why, and how to fix it. Follow the message.

---

## 1. No `any` type

**Use proper types or `unknown` — never `any`.**

- **Enforced by:** `@typescript-eslint/no-explicit-any` = `error` in base config
- **Applies to:** All packages (frontend and backend)
- **Fix:** Replace `any` with the actual type, a generic, or `unknown`

## 2. No type casting with `as`

**Use type guards or type predicates instead of `as` assertions.**

- **Enforced by:** `@typescript-eslint/consistent-type-assertions` with
  `assertionStyle: 'never'` = `warn` in base config
- **Applies to:** All non-test code. In test files, `as` is acceptable.
- **Fix:** Write a type guard function or narrow the type with control flow

## 3. Shared interfaces in `@n8n/api-types`

**Define FE/BE shared types in `@n8n/api-types`, not in individual
packages.**

- **Enforced by:** Convention (not lintable — requires import-boundary
  analysis)
- **Fix:** Move shared types to `packages/@n8n/api-types`

## 4. No `ApplicationError` — use specific error classes

**`ApplicationError` is deprecated. Use `UnexpectedError`,
`OperationalError`, or `UserError` instead.**

- **Enforced by:** `n8n-local-rules/no-plain-errors` = `error` (detects both
  `throw new Error()` and `throw new ApplicationError()`)
- **Applies to:** All non-test code
- **Fix:** Import and throw the appropriate error class:
  - `UnexpectedError` — bugs, invariant violations, "this should never happen"
  - `OperationalError` — infrastructure/external failures (disk, network, etc.)
  - `UserError` — invalid user input or configuration

## 5. All UI text via i18n

**Never hardcode user-visible strings. Use `$t('key')` or
`i18n.baseText('key')`.**

- **Enforced by:** `n8n-local-rules/no-hardcoded-ui-text` = `warn` in
  frontend config
- **Applies to:** Vue template attributes (`label`, `placeholder`, `title`,
  `description`, `tooltip`, etc.)
- **Fix:** Add the string to `@n8n/i18n` and reference it via `$t('key')`

## 6. Use CSS variables, never hardcode px

**Use design-system CSS variables for spacing, typography, and colors.**

- **Enforced by:** Convention (no stylelint integration yet)
- **Applies to:** All frontend CSS/SCSS
- **Fix:** Replace `margin: 8px` with `margin: var(--spacing--2xs)`. See
  `packages/frontend/AGENTS.md` for the full variable reference.

## 7. `data-testid` must be a single value

**No spaces in `data-testid` attribute values.**

- **Enforced by:** `n8n-local-rules/no-invalid-data-testid` = `error` in
  frontend config
- **Applies to:** Vue templates
- **Fix:** Use `data-testid="my-element"` not `data-testid="my element"`

## 8. Use workflow traversal utilities

**Use `getParentNodes`, `getChildNodes`, `mapConnectionsByDestination` from
`n8n-workflow` — don't write custom traversal logic.**

- **Enforced by:** Convention (not lintable)
- **Fix:** Import from `n8n-workflow` and use the exported utilities. See
  `AGENTS.md` for code examples.

## 9. Respect package boundaries

**Packages must not import from layers above them in the dependency graph.**

```
@n8n/api-types ─┐
n8n-workflow ────┤  (foundation — no upward imports)
                ↓
n8n-core ───────┤  (can import workflow, not cli/frontend)
                ↓
n8n (cli) ──────┤  (orchestrator — can import most things)
                ↓
n8n-editor-ui   │  (frontend — no backend imports except types/workflow)
@n8n/design-system (pure UI — no backend imports at all)
```

- **Enforced by:** Structural test in
  `packages/@n8n/eslint-config/src/architecture.test.ts`
- **Applies to:** All packages. The test validates 6 boundaries across the
  monorepo.
- **Fix:** Move the shared code down to the appropriate layer, or extract it
  into a shared package like `n8n-workflow` or `@n8n/api-types`.
- **Known violations:** 3 files in `nodes-base` import from `n8n-core`
  (baselined — tracked for cleanup, but new violations are blocked).

---

## Enforcement Summary

| # | Rule | Severity | Enforcement |
|---|------|----------|-------------|
| 1 | No `any` | `error` | `@typescript-eslint/no-explicit-any` |
| 2 | No `as` casting | `warn` | `@typescript-eslint/consistent-type-assertions` |
| 3 | Shared types in api-types | convention | — |
| 4 | No ApplicationError | `error` | `n8n-local-rules/no-plain-errors` |
| 5 | i18n for UI text | `warn` | `n8n-local-rules/no-hardcoded-ui-text` |
| 6 | CSS variables only | convention | — |
| 7 | Single data-testid | `error` | `n8n-local-rules/no-invalid-data-testid` |
| 8 | Traversal utilities | convention | — |
| 9 | Package boundaries | `error` | `architecture.test.ts` (structural test) |

Rules at `warn` are for gradual adoption on existing code. New code must
comply. Rules will be promoted to `error` once existing violations are
addressed.
