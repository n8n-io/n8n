# @n8n/frontend-module-otel

Frontend feature module for the OpenTelemetry settings page. Consumed from source
by the editor-ui shell through `src/app/modules.manifest.ts`; there is no build
step and no `dist`.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-otel
pnpm turbo lint --filter=@n8n/frontend-module-otel
pnpm turbo test --filter=@n8n/frontend-module-otel
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## What this module contributes

This is the first extracted module with a UI surface. Its descriptor declares a
lazy route (`SettingsOpenTelemetryView`) and a `settingsPages` entry. The shell
gates both on `isModuleActive('otel')`; the sidebar item additionally gates on
the `otel:manage` scope, which the entry declares as `requiredScopes`.

The entry declares its label as `labelKey`, not as a translated string, and its
scope gate as data. `ui.store`'s `settingsSidebarItems` resolves both. That is
why `otel.module.ts` imports only the SDK — a descriptor that translates its own
label has to import `@n8n/i18n` as a value, and one that checks its own scope has
to import an RBAC store.

The route name is owned here (`OTEL_SETTINGS_VIEW` in `otel.constants.ts`), not
by the shared `VIEWS` enum. `assertUniqueRouteNames` in `@n8n/frontend-module-sdk`
keeps the names collision-free.

Strings still live in the central `@n8n/i18n` `en.json` under
`settings.opentelemetry.*`. Per-module locales are a later wave.

## Import rules

- Depend on foundation and platform packages only (`@n8n/design-system`,
  `@n8n/stores`, `@n8n/composables`, `@n8n/i18n`, `@n8n/rest-api-client`,
  `@n8n/frontend-module-sdk`). Never import another `@n8n/frontend-module-*`,
  and never import `@/…` from the shell.
- `@n8n/stores` and `@n8n/composables` are **subpath-only** — import
  `@n8n/stores/settings.store`, not `@n8n/stores`.
- The no-cross-module rule is currently a convention: the shared tsconfig base
  omits sibling modules from `paths`, which blocks an accidental import but not
  a deliberate one (declaring the dependency makes it typecheck clean). The
  ESLint rule that actually enforces it is CAT-3692.
