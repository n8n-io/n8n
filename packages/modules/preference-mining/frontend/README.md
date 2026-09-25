# Preference mining frontend

This module adds the Preference mining project tab. Enable the backend module
with `N8N_ENABLED_MODULES=preference-mining`.

See [the spike guide](../../../cli/scripts/preference-mining/README.md) for setup,
approaches, source limits, and the manual comparison procedure.

The editor loads this module from source. Routes load the view on demand. The
module uses shared API types, design-system components, and i18n messages.

After building shared packages, run these checks from this directory:

```sh
pnpm typecheck
pnpm lint
pnpm lint:styles
pnpm test
```
