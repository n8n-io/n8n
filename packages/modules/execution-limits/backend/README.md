# @n8n/backend-module-execution-limits

Backend feature module. The n8n runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-execution-limits
pnpm turbo lint --filter=@n8n/backend-module-execution-limits
pnpm turbo test --filter=@n8n/backend-module-execution-limits
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `docs/backend/how-to/build-a-backend-module.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Licence

The module has no licence flag. Its `init` registers the fold step that counts runs in
`execution_limit_usage`, and that step must run on every instance. Gate each licensed part
(a controller, the limit check) with `@Licensed` or `LicenseState`.

## Usage reads

Read usage through `ExecutionUsageService` only, so each reader sees the same count.

- `getCachedUsage(scope)` reads memory. Use it at an execution start. `null` means that
  the usage is not known, for example for a scope that has no limit.
- `getUsage({ scope, period, at })` reads the database. Use it for a report.

A period is a sum of UTC days. A week starts on Monday. Main and webhook processes hold
the usage in memory, and a timer reloads it every 5 seconds. The count can be up to
about 10 seconds old. If a reload fails, the last count stays in use until a reload
succeeds or the period ends, so it can be older.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
  Importing the entrypoint runs the `@BackendModule` decorator.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
- Keep TypeORM imports in entity and repository files. A repository composes a
  file-private `BaseRepository` table and exposes only use-case methods. It does
  not extend `BaseRepository`.
