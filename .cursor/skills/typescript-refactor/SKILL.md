---
name: typescript-refactor
description: Behavior-preserving refactors in TypeScript repositories — renames, moves, extractions, dedupes, and library/SDK swaps, in single packages or monorepos. Use when restructuring existing code without changing behavior, or when replacing one dependency or API with another across a codebase.
---

# TypeScript Refactor

A refactor changes structure, not behavior. The result must be observably identical to the starting point. Keep genuine behavior changes out of the refactor and land them separately.

Adapt the commands below to the repo's package manager and test runner — check `packageManager` in `package.json` and the lockfile (`pnpm` / `npm` / `yarn` / `bun`) before running anything.

## 1. Map the full surface first

Before editing anything, find every place the target is used:

- Call sites, imports, re-exports, and barrel files (`index.ts`) across the whole repo — in a monorepo, search every workspace, not just the one you start in.
- Types, interfaces, and DTOs, including shared/contract packages consumed by both sides of a boundary.
- Tests, mocks, and fixtures that reference it.
- Dependency declarations: each `package.json`, the lockfile, and any workspace-level pinning (`pnpm` `catalog:` / `overrides`, npm `overrides`, yarn `resolutions`).

List the surface before touching it. A missed call site is the usual way a refactor silently breaks a consumer.

## 2. Establish a green baseline

Run the affected scope's checks before changing anything, so you know the starting state and can prove behavior is preserved.

```bash
<pkg-manager> run typecheck   # or: npx tsc --noEmit
<pkg-manager> test
```

In a monorepo, scope to the affected package(s) first (e.g. `pnpm --filter <pkg> test`, `npm test -w <pkg>`, `turbo run test --filter <pkg>`). If a surface has no test coverage, add a characterization test first, then refactor.

## 3. Change in small, reversible steps

- One logical move per step (rename → extract → update callers), not all at once.
- Reuse existing primitives instead of introducing new ones — search before you add.
- Update **every** reference from step 1: imports, re-exports, barrels, types, tests, mocks, and dependency manifests.
- Let the compiler drive: lean on `tsc` errors to find missed references after a rename or signature change.
- Keep the diff mechanical. No opportunistic reformatting or cleanup outside the refactor's scope.

## 4. Swapping a library or SDK

- Add/remove deps the way the repo already does it (workspace catalog, root `overrides`/`resolutions`, or direct `package.json`). Match the existing declaration style and keep the lockfile consistent.
- Map the old API to the new one and confirm feature parity (auth, streaming, errors, pagination, tool/function calling, resource or model names) before deleting the old path.
- In a monorepo, migrate one package at a time; keep each package green before moving to the next.

## 5. Verify behavior is unchanged

Re-run the baseline checks — the same tests must still pass. After a contract change, typecheck **both** the producer and every consumer (a green producer does not guarantee consumers compile); in a monorepo, build shared packages before typechecking dependents. Report exactly what ran and what remains unverified.

## Commit hygiene

- Keep the commit scoped to the refactor. Never fold unrelated working-tree changes into it.
- Separate any unavoidable behavior change into its own commit with a clear message.
