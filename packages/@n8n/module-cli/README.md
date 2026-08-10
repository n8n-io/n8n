# @n8n/module-cli

Interactive scaffolder for n8n modules. Replaces `pnpm setup-frontend-module`.

**Writing a module? Read [`frontend-module-guide.md`](./frontend-module-guide.md)** — the
descriptor contract, the import rules, the traps. This file only covers the CLI itself.

```bash
pnpm n8n-module-sdk create                    # prompts for name and stack
pnpm n8n-module-sdk create my-feature --stack=frontend
```

`create` writes `packages/modules/<name>/<frontend|backend>`.

## Frontend

A real, resolvable workspace package: source-only (`main: "src/index.ts"`, no
`dist`), consumed by the editor-ui shell through Vite aliases. Scaffolding it
also makes the four registrations outside the package that a module needs
before the shell can see it — the Vite alias table, editor-ui's dependency
entry, editor-ui's tsconfig `paths`, and `modules.manifest.ts`. Every one is
idempotent, so re-running after a partial failure is safe.

## Backend

**A placeholder. Nothing loads it.** The backend runtime discovers modules
under `packages/cli/src/modules/<name>`, which is where all 34 real backend
modules live; `packages/modules/<name>/backend` reserves the path for the day
the two halves sit together and gets a README saying so. To create a backend
module that runs, use `pnpm setup-backend-module`.

## No build step

Plain ESM, run straight from `src/`. The scaffolder it replaces skipped `zx`
so it would work on a fresh checkout, and a `dist` would put that back — a
scaffolder you have to build before you can scaffold with it is a scaffolder
that breaks on day one of a new machine.
