# @n8n/frontend-module-icon-parameter

Owns the **`icon` parameter input** — the icon and emoji picker the NDV draws for a
node parameter of `type: 'icon'`. The module claims that type through the
`parameterInputs` field of its descriptor; the shell resolves it by `parameter.type`
at render time and holds no import of the component.

It contributes nothing else: no route, no store, no settings page, and no backend
half. `registerModuleParameterInputs` does not gate on `isModuleActive`, because a
parameter input is a render primitive rather than a feature — a gated renderer would
leave the field with nothing to draw it.

The shell keeps expression rendering, the from-AI override and the drop target for
this type, so the contribution declares no capabilities.

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-icon-parameter
pnpm turbo lint --filter=@n8n/frontend-module-icon-parameter
pnpm turbo test --filter=@n8n/frontend-module-icon-parameter
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

`@vitejs/plugin-vue` is already wired into `vite.config.ts`, so a `.vue` file
compiles in tests without further setup. Route components must load lazily —
see the note in `src/icon-parameter.module.ts`.
