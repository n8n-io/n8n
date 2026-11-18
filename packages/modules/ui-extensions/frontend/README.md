# @n8n/frontend-module-ui-extensions

The side panel of the editor, and the pages of the main sidebar.

- Each tab of the panel is a view: one of the built-in views (Recent runs,
  Service data, Arcade), or a view that an MCP client made with the
  `create_side_panel_view` tool.
- Each page shows in its own group of the main sidebar, under Inbox, and opens
  at `/extensions/pages/<id>` (`UiExtensionPageView.vue`). It is one of the
  built-in pages, or a page that an MCP client made with the
  `create_custom_page` tool.
  - The Automation dashboard shows the success rate and the run times of the
    newest runs, the workflows that fail, and the services that the workflows
    connect to.
  - Notion docs shows how a page can bring a service into n8n. It renders
    documents from a Notion workspace. The documents are sample data in the
    page, so it needs no account and makes no network call.

Views and pages are one record type with a `kind`. Each one runs in a sandboxed
iframe on the view runtime (`@n8n/ui-extension-runtime`) and gets the page
context over a `MessagePort`. A view from an MCP client sees a workflow only
when the workflow is available in MCP (`ui-extensions.context.ts`). A page
always gets the `other` context, so a page from an MCP client sees no workflow.
Only built-in views and pages get data, strings and the open actions.

A user removes a view or a page that they added with the `x` on its tab or its
sidebar item, after a confirmation (`useRemoveUiExtension`). An MCP client
removes one with `delete_ui_extension`. The server pushes each change to every
open editor of the user. A user on a removed page goes to `/`.

The shell provides a `UiExtensionsHost` with `UI_EXTENSIONS_HOST_KEY`
(`editor-ui/src/app/composables/useUiExtensionsHost.ts`): the runtime, which it
loads once for the panel and the pages, the locale, the overview data and the
open actions. The panel host (`editor-ui/src/app/components/app/AppSidePanel.vue`)
computes the page context and renders `loadSidePanel`. `ProjectNavigation.vue`
renders `loadPagesNav`.

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

Read the full guide at `packages/@n8n/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-ui-extensions
pnpm turbo lint --filter=@n8n/frontend-module-ui-extensions
pnpm turbo lint:styles --filter=@n8n/frontend-module-ui-extensions
pnpm turbo test --filter=@n8n/frontend-module-ui-extensions
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
`src/ui-extensions.module.ts`.
