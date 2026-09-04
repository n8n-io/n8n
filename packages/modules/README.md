# Modules

Feature modules carved out of `packages/frontend/editor-ui`. Each one is a workspace package at
`<name>/frontend`: source-only (`main: "src/index.ts"`, no `dist`), consumed by the editor-ui shell
through Vite aliases.

Each module lints its own styles: a `lint:styles` / `lint:styles:fix` script pair and a
`stylelint.config.mjs`. Nothing outside the package covers its SFCs, so
`pnpm check:lint-styles-coverage` fails the build if a package that owns `.vue`/`.scss` files
declares no script.

`<name>/backend` is a reserved path rather than a workspace package — the backend runtime discovers
modules under `packages/cli/src/modules/<name>`. The extra nesting level is what lets both halves of
a module sit together later.

The directory is empty until the first module lands, and tracked in the meantime because turbo
rejects a `--filter` whose directory does not exist. The root `test:ci:*` scripts and the two
backend jobs in `.github/workflows/test-unit-reusable.yml` all name `packages/modules/**`.
