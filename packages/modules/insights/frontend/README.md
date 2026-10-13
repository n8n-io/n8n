# @n8n/frontend-module-insights

Frontend feature module. Consumed from source by the editor-ui shell; there is no
build step and no `dist`.

## Two entry points, on purpose

- `@n8n/frontend-module-insights` — `useInsightsStore` and `InsightsSummary`, for
  the shell views that show the summary widget. Every one of them reaches it
  through a lazy `import()`.
- `@n8n/frontend-module-insights/insights.module` — the descriptor, for
  `src/app/modules.manifest.ts`.

The split is measured, not stylistic. The manifest is imported eagerly at boot,
and `InsightsSummary` is an SFC. With both behind one entry, the SFC becomes
statically reachable from the boot chunk: `pnpm build` put `InsightsSummary`'s JS
**and a render-blocking stylesheet** into `dist/index.html` (353 `modulepreload`
entries against 346, and 99 stylesheet links against 98). Keep component code out
of the descriptor's entry.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-insights
pnpm turbo lint --filter=@n8n/frontend-module-insights
pnpm turbo test --filter=@n8n/frontend-module-insights
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## Import rules

- Depend on foundation and platform packages only (`@n8n/design-system`,
  `@n8n/stores`, `@n8n/composables`, `@n8n/i18n`, `@n8n/rest-api-client`,
  `@n8n/api-types`, `@n8n/permissions`, `@n8n/frontend-constants`,
  `@n8n/utils`, `@n8n/frontend-module-sdk`). Never import another
  `@n8n/frontend-module-*`, and never import `@/…` from the shell.
- `@n8n/stores` and `@n8n/composables` are **subpath-only** — import
  `@n8n/stores/settings.store`, not `@n8n/stores`.
- The no-cross-module rule is currently a convention: the shared tsconfig base
  omits sibling modules from `paths`, which blocks an accidental import but not
  a deliberate one (declaring the dependency makes it typecheck clean). The
  ESLint rule that actually enforces it is CAT-3692.

## Adding UI

`@vitejs/plugin-vue`, `unplugin-icons` and `vite-svg-loader` are wired into
`vite.config.ts`, so a `.vue` file that renders a design-system component
compiles in tests without further setup. All three are needed: the design-system
icon set imports `~icons/lucide/*` and `./custom/*.svg`, and without the icon
plugins an icon resolves to a URL string and rendering throws. Route components
must load lazily — see the note in `src/insights.module.ts`.

## Test harness

`src/__tests__/render.ts` is this package's own renderer (i18n, pinia,
design-system, a telemetry stub). It is deliberately not the shell's
`@/__tests__/render`, which also provides the workflow document store and the
touch-events directive — editor-core concerns no insights component reads. The
shared harness (`@n8n/vitest-config/setup/frontend`) cannot host a Vue renderer:
it must not import vue, pinia or i18n, or the turbo graph gains a cycle.

Store-level fixtures that several packages need live next to the store instead:
`@n8n/stores/__tests__/defaultSettings` and `@n8n/stores/__tests__/mockedStore`.
