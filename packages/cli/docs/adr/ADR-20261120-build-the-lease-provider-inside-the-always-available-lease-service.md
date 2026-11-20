# Build the lease provider inside the always-available lease service

Date: 2026-11-20

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-760

## Context

Code in several parts of the cli registers lease kinds and reports changes. The `leases` backend
module decides whether leases are on. Code that uses leases must not depend on the order in which
modules and services start.

## Decision

Consumers inject `DurableLeaseService`, which is always in DI. When DI creates the service, the
service builds its database provider if the `leases` module is enabled. Without the module, the
service has no provider: `registerKind`, `changed` and `syncAll` do nothing, and `status` throws an
error.

The main reason is that no call can arrive before the provider exists, and no call can replace the
provider.

## Alternatives Considered

1. **A service that exists only when the module is active.** We rejected it because code outside the
   module could not inject the service. Each consumer would need its own check before it resolves
   the service.
2. **The module gives the service its provider when the module initialises.** We rejected it because
   a call before that point finds no provider, and a second call can replace the provider.

## Consequences

1. A consumer checks `DurableLeaseService.isActive()` before it relies on leases.
2. Without the module, `registerKind`, `changed` and `syncAll` log at debug level and return.
   `status` throws, so a consumer does not call it before it checks that the service is active.
3. A kind can register at any time, also before the `leases` module initialises.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261119-run-leases-as-an-opt-in-backend-module, ADR-20261117-register-lease-kinds-and-report-changes-through-lease-service
