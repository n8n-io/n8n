# Run leases as an opt-in backend module behind an always-available service

Date: 2026-11-19

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

Leases coordinate work between main instances through the database. Code in several parts of the
cli registers lease kinds and reports changes. Leases must stay off until an operator turns them
on. Backend modules are the way to turn a feature on or off in the cli: `N8N_ENABLED_MODULES`
lists the modules that load, and a module that is not listed loads none of its code.

## Decision

Leases run as the `leases` backend module. The module is not in the default modules, and
`N8N_ENABLED_MODULES` turns it on. Engine v2 uses the same shape.

Consumers inject `DurableLeaseService`, which is always in DI. When the module is active, it gives
the service its database provider. Without the module, the service has no provider and its calls
do nothing.

The main reason is that backend modules are the pattern that n8n follows from now on. A feature
does not manage its own enable flag and settings outside the module system.

## Alternatives Considered

1. **An enable flag for leases in `@n8n/config`.** We rejected it because each feature would
   manage its own flag, apart from the module system that turns the other features on and off.
2. **A service that exists only when the module is active.** We rejected it because code outside
   the module could not inject the service. Each consumer would need its own check before it
   resolves the service.

## Consequences

1. Operators turn leases on with `N8N_ENABLED_MODULES=leases`. No separate enable flag exists.
2. A consumer checks `ModuleRegistry.isActive('leases')` before it relies on leases.
3. Without the module, `registerKind`, `changed` and `syncAll` log at debug level and return.
4. Default modules initialise before `leases`. A kind that a default module registers during its
   own initialisation gets no provider.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261117-register-lease-kinds-and-report-changes-through-lease-service
