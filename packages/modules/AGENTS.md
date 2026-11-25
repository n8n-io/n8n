# AGENTS.md

Rules for feature modules in `packages/modules/<name>`.
Read the root `AGENTS.md` first. This file adds module-specific boundaries and points you to the guides to read.

## Frontend modules: `<name>/frontend`

- Read `packages/frontend/AGENTS.md`. Its rules apply to every module frontend.
- Read `packages/@n8n/module-cli/frontend-module-guide.md`.
- A module must never import `@/…`, because `@/…` is the `editor-ui` shell.
- A module must never import another `@n8n/frontend-module-*`.

## Backend modules: `<name>/backend`

- Read `packages/cli/AGENTS.md`.
- Read `docs/backend/how-to/build-a-backend-module.md`.
- A module must never import `packages/cli`.

`packages/modules/README.md` tells how n8n loads the modules and how CI tests them.
