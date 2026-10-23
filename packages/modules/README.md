# Modules

Feature modules carved out of `packages/frontend/editor-ui`. Each one is a workspace package at
`<name>/frontend`: source-only (`main: "src/index.ts"`, no `dist`), consumed by the editor-ui shell
through Vite aliases.

Backend modules can be built workspace packages at `<name>/backend`. Add each packaged backend
module to `packages/cli/src/modules/modules.manifest.ts`. The manifest uses lazy imports so a
disabled module does not load its package. Backend modules that have not moved to a package still
load from `packages/cli/src/modules/<name>`.

`packages/modules` itself stays tracked even when it holds nothing: turbo rejects a `--filter`
whose directory does not exist.

CI splits the two halves by path. The frontend jobs select `packages/modules/*/frontend`. The backend
jobs exclude that same path instead of all of `packages/modules`, so a `<name>/backend` package gets
backend CI on the day it appears. Both filters live in the root `test:ci:*` scripts and in the two
backend jobs in `.github/workflows/test-unit-reusable.yml`.
