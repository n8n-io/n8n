---
name: n8n-refactor
description: Behavior-preserving refactors in the n8n pnpm/Turbo monorepo — renames, moves, extractions, dedupes, and library/SDK swaps. Use when restructuring existing code without changing behavior, or when replacing one dependency or API with another across packages.
---

# n8n Refactor

A refactor changes structure, not behavior. The result must be observably identical to the starting point. Keep genuine behavior changes out of the refactor and land them separately.

## 1. Map the full surface first

Before editing anything, find every place the target is used:

- Call sites, imports, and re-exports across **all** packages — search the whole repo, not just the package you start in.
- Types, interfaces, and DTOs, including `@n8n/api-types` shapes that cross frontend/backend.
- Tests, mocks, and fixtures that reference it.
- Dependency declarations: each `package.json`, `pnpm` `catalog:` entries, and root `overrides` / `patchedDependencies` in the top-level `package.json`.

List the surface before touching it. A missed call site is the usual way a refactor silently breaks a consumer.

## 2. Establish a green baseline

Run the affected packages' checks before changing anything, so you know the starting state and can prove behavior is preserved.

```bash
pnpm --filter <package-name> test
pnpm --filter <package-name> typecheck
```

If a surface has no test coverage, add a characterization test first, then refactor.

## 3. Change in small, reversible steps

- One logical move per step (rename → extract → update callers), not all at once.
- Reuse existing primitives instead of introducing new ones (see `n8n-reuse-first`).
- Update **every** reference from step 1: imports, re-exports, types, tests, mocks, and dependency manifests.
- Keep the diff mechanical. No opportunistic reformatting or cleanup outside the refactor's scope.

## 4. Swapping a library or SDK

- Add/remove deps the way the package already does it: `catalog:` for shared versions, root `overrides` for pinning. Match the existing declaration style.
- Map the old API to the new one and confirm feature parity (auth, streaming, errors, tool/function calling, model names) before deleting the old path.
- Migrate one package at a time; keep each package green before moving to the next.

## 5. Verify behavior is unchanged

Re-run the baseline checks — the same tests must still pass. After a contract change, verify producer **and** consumer packages in dependency order (`n8n-cross-package`, `testing-verification`). Report exactly what ran and what remains unverified.

## Defer to

- `n8n-change-workflow` — package boundaries and core implementation rules.
- `n8n-cross-package` — `api-types → cli → frontend` order and rebuild traps.
- `git-hygiene` — scoped commits; never fold unrelated changes into a refactor.
- `n8n-pr-readiness` — pre-PR checks and review subagents.
