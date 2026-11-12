---
name: n8n:migrate-module
description: >-
  Plans and carries out the move of a backend module from
  packages/cli/src/modules/<name> into its own workspace package at
  packages/modules/<name>/backend. Use when the user wants to extract,
  migrate or package a backend module, remove cli dependencies from a module,
  or move a cli service into @n8n/backend-services so that modules can use it.
---
# Migrate a backend module out of cli

The goal: a package at `packages/modules/<name>/backend` that does not import
cli. Read `scripts/backend-module/backend-module-guide.md` for the module
structure. This skill covers how to get there in small PRs.

Pitfalls with PR examples: [reference.md](reference.md).

## 1. Take inventory

1. List each cli import in the production files of the module:
   ```bash
   grep -rhoE "from '@/[^']+'" packages/cli/src/modules/<name> \
     --include='*.ts' --exclude='*.test.ts' | sort | uniq -c | sort -rn
   ```
2. List the cli files outside the module that import it. These need a
   public entry point after the move.
3. For each dependency, look in `@n8n/backend-services`,
   `@n8n/backend-common`, `@n8n/db` and `@n8n/decorators` first. Many shared
   services and proxies are already there (`ProjectScopeService`,
   `NodeTypesProxy`, `WorkflowProjectService`, `getN8nVersion()`, …).
4. Check the Linear project "Backend Modularization" for open tickets and
   earlier plans. Do not make a ticket without approval.

## 2. Choose a fix for each dependency

Use the first option that applies:

| Situation | Fix |
|---|---|
| A shared package already has it | Import it from there |
| Only this module uses it | Move it into the module |
| Two or more modules use it, and it has no `@/` imports | Move it to `@n8n/backend-services` |
| The module calls one or two methods of a large cli service | Add a narrow port: a `*Proxy` in `@n8n/backend-services` that cli registers, or one small method on a shared service |
| The module only tells cli that something happened | Emit an event; a cli listener does the work |

Prefer a narrow port to moving a large cli service. Moves of `ProjectService`,
`OwnershipService` and `userHasScopes` stalled. A narrow port such as
`ProjectScopeService.hasScopes` merged in one PR.

Put REST, express and cache code in `@n8n/backend-services`, not in
`@n8n/backend-common`. `n8n-core` and `@n8n/db` depend on
`@n8n/backend-common`, so they would load that code too.

## 3. Plan the stack

- Remove one cli dependency in each PR. Extract the package in the last PR.
- To change a shared API, use three PRs: add the new API, migrate the
  callers, remove the old API.
- When you find an existing bug, fix it in a separate PR with a follow-up
  ticket. Keep the move PR on the move.
- Show the plan to the user before you write code.

## 4. Rules for each PR

**Layers**
- Controllers call services. Services call repositories. A controller must
  not inject a repository.
- Put access checks in the service, not in a free function that calls
  `Container.get`.
- Put TypeORM operators in use-case repository methods. Pass
  `OperationContext`, not `EntityManager`. See the persistence section of the
  root `AGENTS.md`.
- Do not make a folder layout mandatory (for example `database/`). The
  `typeorm-persistence-boundary` code-health rule enforces the boundary.

**Moves**
- Move files with `git mv`. Rewrite all imports in the same PR. Do not keep
  re-exports in the old location. Then git shows renames, not new files.
- After a codemod, run `biome format --write` on the changed files and
  typecheck cli before you push. A codemod can add duplicate imports or
  remove imports that are still in use.
- Declare each import in the `package.json` of the package that uses it. Put
  type packages that appear in the published `.d.ts` files in
  `dependencies`.
- Move docs and tests together with the code.

**Proxies**
- Throw a dedicated error class when no provider is registered. Rethrow that
  class in each existing `catch` that now calls the proxy.
- Let the real service register itself on the proxy in its own `init`. A
  `Container.get` in `BaseCommand.init` breaks the command tests, because cli
  tests mock some services automatically.

**Tests**
- Before you delete a test, find its new location. Compare the coverage
  before and after the move.
- When you move a query into a repository, test the exact filter. Do not
  assert `expect.any(Object)` for `In()` or `IsNull()`.
- Keep authorization filters in SQL. Compare the old and the new query for
  allow, deny and not-found cases.
- Set global state (for example `setN8nVersion`) in each test that needs it.

**After the move**, search the repo for the old path and the moved symbol
names. Old references often stay in `OWNERS`,
`scripts/lint-parity/samples.json`, `packages/cli/oxlint.config.mts`,
`packages/cli/eslint.config.mjs`, `.code-health-baseline.json` and package
READMEs.

## 5. Extraction PR checklist

- [ ] Create the package with
      `pnpm n8n-module-sdk create <name> --stack=backend`, then `git mv` the
      module files into it.
- [ ] Production files import no `@/` path and no `n8n` (cli) symbol.
- [ ] `package.json` exports `.`, `./module` and `./testing`. Each target is
      in `dist`, and `files` publishes `dist`. Copy the shape of
      `packages/modules/data-table/backend/package.json`.
- [ ] The root entry exports only what cli uses. Do not export repositories
      or entities. Put test helpers in `./testing`.
- [ ] Add the module to `packages/cli/src/modules/modules.manifest.ts`.
- [ ] Add the package to `packages/cli/package.json` and the cli
      `tsconfig.json` references.
- [ ] Add a `test:postgres` script and `vitest.config.postgres.ts`. The DB
      workflow runs `test:postgres` for each `packages/modules/*/backend`.
- [ ] Update `OWNERS`, `ownership-transfer.manifest.json` and the
      cli test server module setup if they name the module.
- [ ] Add a lint-parity sample only if the package has an ESLint config.
- [ ] Run the focused tests, the package typecheck and lint, and the cli
      typecheck.

## 6. PR description

- Name the modules that the PR unblocks.
- If the PR only moves code, say so.
- Keep the title and description current after each push.
- Do not request reviewers automatically.
