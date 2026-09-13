# @n8n/frontend-module-instance-registry

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-instance-registry
pnpm turbo lint --filter=@n8n/frontend-module-instance-registry
pnpm turbo test --filter=@n8n/frontend-module-instance-registry
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## Import rules

- Depend on foundation and platform packages only (`@n8n/design-system`,
  `@n8n/stores`, `@n8n/composables`, `@n8n/i18n`, `@n8n/rest-api-client`,
  `@n8n/api-types`, `@n8n/frontend-module-sdk`). Never import another
  `@n8n/frontend-module-*`, and never import `@/…` from the shell.
- `@n8n/stores` and `@n8n/composables` are **subpath-only** — import
  `@n8n/stores/settings.store`, not `@n8n/stores`.
- The no-cross-module rule is enforced. `eslint.config.mjs` extends
  `frontendModuleConfig` from `@n8n/eslint-config/frontend-module`, which bans a
  sibling module and the `@/` shell alias at error level. Only
  `@n8n/frontend-module-sdk` and this package's own name stay legal.
