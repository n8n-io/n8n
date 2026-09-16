# @n8n/frontend-module-type-availability-policies

Frontend module for node type availability policies. The editor-ui shell consumes it from
source through `src/app/modules.manifest.ts`, so there is no build step and no `dist`.

The descriptor `id` must match the backend module id
(`packages/cli/src/modules/type-availability-policies`). Both `settings.activeModules` and
`/rest/module-settings` are keyed by that string, and a mismatch fails silently.

The module is license-gated on `feat:nodeTypePolicies` and is not a default module. Enable it
in a dev instance with `N8N_ENABLED_MODULES=type-availability-policies`.

`useTypeAvailabilityPoliciesStore` answers whether a project may use a node type. The store is
passive: it does not watch the route or the active project, because the projects store lives in the
shell. The shell calls `fetchForProject(projectId)` when a workflow opens or the active project
changes. When the module is off, the request fails, a request is in flight for a different project,
or nothing has loaded yet, every lookup reports "available".

```bash
pnpm turbo typecheck lint test --filter=@n8n/frontend-module-type-availability-policies
```

Use turbo and not `pnpm --filter`: this package reads its platform dependencies from source,
and on a cold tree turbo builds them first.

`packages/@n8n/module-cli/frontend-module-guide.md` holds the descriptor contract, the
registration points, the import boundaries and the setup a module needs to render UI.
