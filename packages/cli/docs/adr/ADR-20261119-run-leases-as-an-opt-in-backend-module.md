# Run leases as an opt-in backend module

Date: 2026-11-19

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

Leases coordinate work between instances through the database. Leases must stay off until an
operator turns them on. Backend modules are the way to turn a feature on or off in the cli. Default
modules load unless `N8N_DISABLED_MODULES` lists them. Any other module loads only when
`N8N_ENABLED_MODULES` lists it, and a module that does not load runs none of its code.

## Decision

Leases run behind the `leases` backend module. The module is not in the default modules, and
`N8N_ENABLED_MODULES` turns it on. Engine v2 uses the same shape.

The main reason is that backend modules are the pattern that n8n follows from now on. A feature does
not manage its own enable flag and settings outside the module system.

## Alternatives Considered

1. **An enable flag for leases in `@n8n/config`.** We rejected it because each feature would manage
   its own flag, apart from the module system that turns the other features on and off.

## Consequences

1. Operators turn leases on with `N8N_ENABLED_MODULES=leases`. No separate enable flag exists.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261117-register-lease-kinds-and-report-changes-through-lease-service, ADR-20261120-build-the-lease-provider-inside-the-always-available-lease-service
