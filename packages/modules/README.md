# Modules

Feature modules carved out of `packages/frontend/editor-ui`. Each one is a workspace package at
`<name>/frontend`: source-only (`main: "src/index.ts"`, no `dist`), consumed by the editor-ui shell
through Vite aliases.

`<name>/backend` is a reserved path rather than a workspace package — the backend runtime discovers
modules under `packages/cli/src/modules/<name>`. The extra nesting level is what lets both halves of
a module sit together later.

`packages/modules` itself stays tracked even when it holds nothing: turbo rejects a `--filter`
whose directory does not exist.

CI splits the two halves by path. The frontend jobs select `packages/modules/*/frontend`. The backend
jobs exclude that same path instead of all of `packages/modules`, so a `<name>/backend` package gets
backend CI on the day it appears. Both filters live in the root `test:ci:*` scripts and in the two
backend jobs in `.github/workflows/test-unit-reusable.yml`.
