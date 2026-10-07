# @n8n/frontend-module-inbox

The shared Inbox lists workflow reviews and saved Assistant results. Review details, comments, and decisions live in `src/reviews`. The editor supplies only the workflow diff renderer through the SDK component registry. Backend services keep their existing access rules and actions.

Open has two groups: Waiting for review and Authored by you. Assistant results go
in Waiting for review. Each group has its own cursor, Load more button, and retry.
Closed is a flat list with infinite scroll. Group collapse state persists per user.

After the user loads older pages, automatic refresh keeps that group in place.
Other groups, counts, and the selected detail continue to refresh. The Refresh
button reloads the first page of each active group and starts new cursor chains.

Self-healing detail UI remains gated by the disabled-by-default self-healing rollout. AST-1518 replaces the explicit unavailable detail state.

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

Read the full guide at `packages/@n8n/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-inbox
pnpm turbo lint --filter=@n8n/frontend-module-inbox
pnpm turbo lint:styles --filter=@n8n/frontend-module-inbox
pnpm turbo test --filter=@n8n/frontend-module-inbox
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
`src/inbox.module.ts`.
