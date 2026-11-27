# @n8n/frontend-module-api-keys

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

This module holds the "n8n API" settings page (`/settings/api`), its key table and the
modal that creates, edits and shows API keys.

## This module is never active

No backend module has the id `api-keys`. API keys are a service in `packages/cli`. So
`settingsStore.isModuleActive('api-keys')` is always false. The shell hides some surfaces
of an inactive module, so this module does not use them:

- The route has no `'custom'` middleware. The module availability check does not run, and
  the page opens for every signed-in user, as before the extraction.
- The descriptor has no `settingsPages`. The shell keeps the "n8n API" sidebar link in
  `editor-ui/src/app/composables/useSettingsItems.ts`. The link shows when the public API
  is enabled.

Do not add `'custom'`, `settingsPages`, `pushHandlers` or `placeholderPage` to the
descriptor. If you do, the page disappears for all users. `src/api-keys.module.test.ts`
and the shell's `moduleInitializer.test.ts` fail first.

## Shell actions

The modal opens, closes and prefetches through capabilities that the shell provides:
`modalOpeners`, `modalCloser` and `modalPrefetch`. In a test, provide a stub for each one
and call `capabilityRegistry.clear()` after each test.

## Public entry

The shell imports the descriptor from `@n8n/frontend-module-api-keys/api-keys.module`.
The package root exports `ScopesSelector` and the scope utils for the MCP OAuth consent
screen in the shell (`editor-ui/src/app/views/OAuthConsentView.vue`).

This is a known debt. A module must not import another module. If the consent screen
moves into the `mcp` module, first move `ScopesSelector` to a shared package.

Read the full guide at `packages/@n8n/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-api-keys
pnpm turbo lint --filter=@n8n/frontend-module-api-keys
pnpm turbo lint:styles --filter=@n8n/frontend-module-api-keys
pnpm turbo test --filter=@n8n/frontend-module-api-keys
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
`src/api-keys.module.ts`.
