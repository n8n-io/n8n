# Run leases as an opt-in backend module behind an always-available service

Date: 2026-11-19

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

Leases coordinate work between instances through the database. Code in several parts of the
cli registers lease kinds and reports changes. Leases must stay off until an operator turns them
on. Backend modules are the way to turn a feature on or off in the cli. Default modules load
unless `N8N_DISABLED_MODULES` lists them. Any other module loads only when `N8N_ENABLED_MODULES`
lists it, and a module that does not load runs none of its code.

## Decision

Leases run behind the `leases` backend module. The module is not in the default modules, and
`N8N_ENABLED_MODULES` turns it on. Engine v2 uses the same shape.

Consumers inject `DurableLeaseService`, which is always in DI. When DI creates the service, the
service builds its database provider if the `leases` module is enabled. Without the module, the
service has no provider: `registerKind`, `changed` and `syncAll` do nothing, and `status` throws an
error.

The main reason for the module is that backend modules are the pattern that n8n follows from now on.
A feature does not manage its own enable flag and settings outside the module system. The service
builds its own provider so that no call can arrive before the provider exists, and no call can
replace it.

## Alternatives Considered

1. **An enable flag for leases in `@n8n/config`.** We rejected it because each feature would manage
   its own flag, apart from the module system that turns the other features on and off.
2. **A service that exists only when the module is active.** We rejected it because code outside the
   module could not inject the service. Each consumer would need its own check before it resolves
   the service.
3. **The module gives the service its provider when the module initialises.** We rejected it because
   a call before that point finds no provider, and a second call can replace the provider.

## Consequences

1. Operators turn leases on with `N8N_ENABLED_MODULES=leases`. No separate enable flag exists.
2. A consumer checks `DurableLeaseService.isActive()` before it relies on leases.
3. Without the module, `registerKind`, `changed` and `syncAll` log at debug level and return.
   `status` throws, so a consumer does not call it before it checks that the service is active.
4. A kind can register at any time, also before the `leases` module initialises.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261117-register-lease-kinds-and-report-changes-through-lease-service
