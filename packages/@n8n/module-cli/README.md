# @n8n/module-cli

Interactive scaffolder for n8n modules.

```bash
pnpm n8n-module-sdk create                    # prompts for name and stack
pnpm n8n-module-sdk create my-feature --stack=frontend
pnpm n8n-module-sdk create my-feature --stack=backend
```

`create` writes `packages/modules/<name>/<frontend|backend>`.

Then read [frontend-module-guide.md](./frontend-module-guide.md). It gives the descriptor
contract, the import boundaries, the registration points and the problem in each one.

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

## Backend

The scaffolder creates a built workspace package at `packages/modules/<name>/backend`. It also
adds the runtime dependency to `packages/cli/package.json`, adds a lazy import to
`packages/cli/src/modules/modules.manifest.ts`, and adds the module id to the validated list in
`@n8n/backend-common`. The generated entrypoint is empty. Add only the lifecycle methods that the
module needs. Read `scripts/backend-module/backend-module-guide.md` for backend patterns.

## No build step

Plain ESM, run straight from `src/`. A `dist` would mean building the
scaffolder before you can scaffold with it, which breaks on day one of a new
machine.
