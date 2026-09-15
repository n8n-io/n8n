# @n8n/frontend-module-type-availability-policies

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

Read the full guide at `packages/@n8n/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

## Status

Descriptor only. The module is registered with the shell and declares no surface, so
nothing renders and no request is made.

The module id must stay the same as the backend module id
(`packages/cli/src/modules/type-availability-policies`). The module is license-gated on
`feat:nodeTypePolicies` and it is not a default module. To see it in a dev instance, start
with `N8N_ENABLED_MODULES=type-availability-policies`.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-type-availability-policies
pnpm turbo lint --filter=@n8n/frontend-module-type-availability-policies
pnpm turbo test --filter=@n8n/frontend-module-type-availability-policies
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
  a deliberate one (declaring the dependency makes it typecheck clean). The
  ESLint rule that actually enforces it is CAT-3692.

## Adding UI

`vite.config.ts` carries `@vitejs/plugin-vue` only, so a `.vue` file compiles in
tests. Rendering a design-system component needs three more pieces, which the
scaffolder writes and this package dropped while it has no UI:

- the `@n8n/design-system` dependency.
- `unplugin-icons` and `vite-svg-loader` in `vite.config.ts`, for the
  `~icons/lucide/*` virtual modules and the `custom/*.svg` icon components
  behind `N8nIcon`. Without `svgLoader` an `.svg` import is a data-URI string,
  which Vue renders as a tag name.
- `stylelint.config.mjs` plus the `lint:styles` scripts, for SCSS in a scoped
  `<style lang="scss">` block.

Copy them from `packages/modules/otel/frontend`, which renders UI. Route
components must load lazily — see the note in
`src/type-availability-policies.module.ts`.
