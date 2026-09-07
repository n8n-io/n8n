# @n8n/module-cli

Interactive scaffolder for n8n modules.

```bash
pnpm n8n-module-sdk create                    # prompts for name and stack
pnpm n8n-module-sdk create my-feature --stack=frontend
```

`create` writes `packages/modules/<name>/<frontend|backend>`.

## Frontend

A real, resolvable workspace package: source-only (`main: "src/index.ts"`, no
`dist`), consumed by the editor-ui shell through Vite aliases. Scaffolding it
also makes the four registrations outside the package that a module needs
before the shell can see it — the `modulePackages` table in
`@n8n/frontend-vite-config`, editor-ui's dependency entry, editor-ui's tsconfig
`paths`, and `modules.manifest.ts`. Re-running after a partial failure adds no
second copy of any of them.

Biome runs over the new package and over every edited file at the end, because
a registration line can be longer than the 100-column limit. Without that step
the next `format:check` in CI fails on a module nobody touched by hand.

## Running a module's checks

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-<name>
pnpm turbo lint --filter=@n8n/frontend-module-<name>
pnpm turbo test --filter=@n8n/frontend-module-<name>
```

Go through turbo, not the bare `pnpm --filter <pkg> <task>` form. A frontend module
is consumed from source, so nothing builds its platform dependencies for it: on a cold
tree `pnpm --filter <pkg> test` fails to resolve `n8n-workflow` and
`@n8n/vitest-config/frontend`. Turbo builds them first. The generated README repeats
this for the new package.

## Backend

**A placeholder. Nothing loads it.** The backend runtime discovers modules
under `packages/cli/src/modules/<name>`, which is where every real backend
module lives; `packages/modules/<name>/backend` reserves the path for the day
the two halves sit together and gets a README saying so. To create a backend
module that runs, use `pnpm setup-backend-module`.

## No build step

Plain ESM, run straight from `src/`. A `dist` would mean building the
scaffolder before you can scaffold with it, which breaks on day one of a new
machine.
