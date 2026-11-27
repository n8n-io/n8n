# @n8n/backend-module-durable-leases

Backend feature module that implements the lease service contract of `@n8n/leases` on database storage. The n8n runtime loads the module through the lazy import in `packages/cli/src/modules/modules.manifest.ts`.

The module is opt-in. Enable it with `N8N_ENABLED_MODULES=durable-leases`. It loads on main instances only.

Code outside the module checks `ModuleRegistry.isActive('durable-leases')`, then uses `DurableLeaseService` from this package. The service builds the database lease provider when the module initialises. The lease timing settings are `N8N_LEASES_LEASE_SECONDS`, `N8N_LEASES_RENEW_SECONDS` and `N8N_LEASES_MARGIN_SECONDS`.

`LeaseSessionManager` keeps one `lease_session` row alive for one lease kind on this instance. It inserts the row, renews it on a beat, and drops it when a deadline passes or a renewal finds it expired.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-durable-leases
pnpm turbo lint --filter=@n8n/backend-module-durable-leases
pnpm turbo test --filter=@n8n/backend-module-durable-leases
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `docs/backend/how-to/build-a-backend-module.md` for the module lifecycle and the testing patterns.
