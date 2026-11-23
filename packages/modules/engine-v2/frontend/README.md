# @n8n/frontend-module-engine-v2

Frontend module for engine v2. The editor-ui shell consumes it from source through
`src/app/modules.manifest.ts`, so there is no build step and no `dist`.

The descriptor `id` must match the backend module id (`packages/cli/src/modules/engine-v2`).
`settings.activeModules` is keyed by that string, and a mismatch fails silently. The module is
not a default module. Enable it in a dev instance with `N8N_ENABLED_MODULES=engine-v2`.

## Compatibility check

The module tells the editor if the open workflow can run on engine v2. Every answer is
"compatible" unless the `engine-v2` module is active and the workflow setting `engineType` is
`'v2'`. The rules live in `@n8n/workflow-engine-check`. This module only shows their result.

- `src/engineV2Check.ts` is the only file that imports `@n8n/workflow-engine-check`. The rest of
  the module uses its names, so a change to the package contract changes this file only.
- `isNodeTypeSupported` asks the package's `isNodeTypeSupported`, which applies the same
  node-type rule as the workflow check. The node creator uses it before the node exists.
- `useEngineV2Compatibility` takes getters for the nodes, the connections and the settings of the
  workflow, because the document store belongs to the shell. It returns the reasons, the blocking
  reasons and `isNodeTypeIncompatible`.
- `EngineV2CompatibilityButton` shows the number of reasons, with a red icon when one blocks and a
  yellow icon when all are warnings. The shell puts it above the node creator toolbar on editable
  canvases, and at the top right on read-only canvases. A click opens
  `EngineV2CompatibilityDialog`, which lists the blocking reasons first, then the warnings. The
  list scrolls inside the dialog. Each entry's icon depends on its severity only, so a new reason
  code needs no icon.
- `src/engineV2ReasonText.ts` gives the text of each reason:
  - `REASON_TEXT_KEYS` has an entry for every code of the package, so the typecheck fails when
    the package adds a code. An entry is a key in `en.json`, one key for each `kind` when a code
    has two meanings, or `null`. A `temporary` reason adds "Run this workflow on Engine v1 for
    now." Codes with the same text share a key.
  - A `null` code shows the English `message` of the package. Use `null` when the `message` holds
    details that a fixed string can't, such as a second node or a count. The dialog then shows no
    node name before the `message` when the `message` already names the node.
  - When the package adds a code, add its entry, and its key to `en.json` unless the entry is
    `null`. When a package rule changes what its `message` says, change the string in the same
    PR, or set the entry to `null`.
- Tests replace the check with `mockEngineV2Compatibility` from
  `@n8n/frontend-module-engine-v2/__tests__/mocks`.

## Checks

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-engine-v2
pnpm turbo lint --filter=@n8n/frontend-module-engine-v2
pnpm turbo lint:styles --filter=@n8n/frontend-module-engine-v2
pnpm turbo test --filter=@n8n/frontend-module-engine-v2
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## Import rules

- Depend on foundation and platform packages only (`@n8n/design-system`,
  `@n8n/stores`, `@n8n/composables`, `@n8n/i18n`, `@n8n/rest-api-client`,
  `@n8n/api-types`, `@n8n/permissions`, `n8n-workflow`,
  `@n8n/frontend-module-sdk`). Never import another
  `@n8n/frontend-module-*`, and never import `@/…` from the shell.
- `@n8n/stores` and `@n8n/composables` are **subpath-only** — import
  `@n8n/stores/settings.store`, not `@n8n/stores`.
- The no-cross-module rule is currently a convention: the shared tsconfig base
  omits sibling modules from `paths`, which blocks an accidental import but not
  a deliberate one (declaring the dependency makes it typecheck clean). No
  rule enforces it yet. CAT-3692 tracks the Oxlint rule that will.

## Adding UI

`vite.config.ts` already carries the three plugins a design-system consumer
needs, so a `.vue` file compiles in tests without further setup:

- `@vitejs/plugin-vue` — single-file components.
- `unplugin-icons` — the `~icons/lucide/*` virtual modules behind `N8nIcon`.
- `vite-svg-loader` — design-system's `custom/*.svg` icon components. Without
  it an `.svg` import is a data-URI string, which Vue renders as a tag name.

`src/__tests__/design-system-icons.test.ts` renders one icon of each kind, so a
plugin dropped from `vite.config.ts` fails this package's own suite. Keep that
test while the module renders any design-system component.

SCSS goes in a scoped `<style lang="scss">` block, with tokens from
design-system — `stylelint.config.mjs` holds this package to the same rules the
shell uses. Route components must load lazily — see the note in
`src/engine-v2.module.ts`.
