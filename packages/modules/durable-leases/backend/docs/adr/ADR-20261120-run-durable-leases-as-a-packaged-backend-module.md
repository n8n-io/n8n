# Run durable leases as a packaged backend module

Date: 2026-11-20

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

`@n8n/leases` defines the lease service contract and stores nothing. Leases coordinate work between
instances, so the cli needs an implementation on database storage. Leases must stay off until an
operator turns them on. Backend modules are the way to turn a feature on or off in the cli. A
packaged backend module is a workspace package that the cli loads only when the module is enabled.

## Decision

The `durable-leases` backend module, in the `@n8n/backend-module-durable-leases` package, holds the
lease logic: `DurableLeaseService`, the database lease provider and the session manager. The lease
tables and their repositories stay in `@n8n/db`. The module is not in the default modules, and
`N8N_ENABLED_MODULES=durable-leases` turns it on. Consumers check
`ModuleRegistry.isActive('durable-leases')` before they use `DurableLeaseService`.

The main reason is that most new backend features are built as modules, and a new module lives in
its own package (`docs/backend/how-to/build-a-backend-module.md`).

## Alternatives Considered

1. **An enable flag for leases in `@n8n/config`.** We rejected it because each feature would manage
   its own flag, apart from the module system that turns the other features on and off.
2. **A module that only switches on a service in the core cli.** We rejected it because the module
   would turn on code that lives outside it, instead of the lease feature as a whole.
3. **A service always in DI that the module gives its provider when the module initialises.** We
   rejected it because a call before that point would find no provider, and a second call could
   replace the provider.

## Consequences

1. Operators turn durable leases on with `N8N_ENABLED_MODULES=durable-leases`.
2. The module initialises on main instances only. `ModuleRegistry.isActive('durable-leases')` is
   true only after it initialises, so it stays false on workers and webhook instances, and a
   consumer that runs before that point finds leases off.
3. The lease timing settings keep the `N8N_LEASES_*` names, because they apply to any lease backend.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261119-keep-a-lease-valid-while-the-session-of-its-holder-is-valid, ADR-20261117-register-lease-kinds-and-report-changes-through-lease-service
