# Modules

Feature modules carved out of `packages/frontend/editor-ui`. Each one is a workspace package at
`<name>/frontend`: source-only (`main: "src/index.ts"`, no `dist`), consumed by the editor-ui shell
through Vite aliases.

## Naming: two classes of module

A **feature module** owns a product area — routes, views, stores, a settings page. Its `<name>` must
equal its backend module directory name under `packages/cli/src/modules/`, because
`isModuleActive(id)` tests the descriptor `id` against `activeModules` from `/rest/module-settings`.
A prefix would break its route guard and its settings toggle, so a feature module carries **no
prefix**: `otel`, `instance-registry`.

A **contribution-only module** has no backend half. Its id never reaches `/rest/module-settings`, so
the id is free — and it takes a **prefix naming the descriptor contribution point it feeds**:
`parameter-input-icon` feeds `parameterInputs`.

    <contribution-point>-<what-it-renders>       parameter-input-icon
    <backend module directory name>              otel

So the directory name answers "does this have a backend half?" without opening a file, and every
sorted list — this directory, the `modulePackages` table in `@n8n/frontend-vite-config`, the `paths`
in `editor-ui/tsconfig.json`, `OWNERS` — groups the classes.

Both classes keep the `@n8n/frontend-module-` package prefix. The planned cross-module boundary rule
pattern-matches it.

`<name>/backend` is a reserved path rather than a workspace package — the backend runtime discovers
modules under `packages/cli/src/modules/<name>`. The extra nesting level is what lets both halves of
a module sit together later.

The directory is empty until the first module lands, and tracked in the meantime because turbo
rejects a `--filter` whose directory does not exist. The root `test:ci:*` scripts and the two
backend jobs in `.github/workflows/test-unit-reusable.yml` all name `packages/modules/**`.
