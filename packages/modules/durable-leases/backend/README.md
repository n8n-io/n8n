# @n8n/backend-module-durable-leases

Backend feature module that implements the lease service contract of `@n8n/leases` on database storage. The n8n runtime loads the module through the lazy import in `packages/cli/src/modules/modules.manifest.ts`.

The module is opt-in. Enable it with `N8N_ENABLED_MODULES=durable-leases`. It loads on main instances only.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-durable-leases
pnpm turbo lint --filter=@n8n/backend-module-durable-leases
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `docs/backend/how-to/build-a-backend-module.md` for the module lifecycle and the testing patterns.
