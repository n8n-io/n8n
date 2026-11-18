# Register lease kinds and report changes through LeaseService

Date: 2026-11-17

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-757

## Context

A lease kind is a family of leases with one handler, for example the triggers of published
workflows. A consumer registers its kinds and tells the backend when the leases it wants change.
The `LeaseProvider` port is the contract that a backend implements. Several consumers use leases.

## Decision

Consumers register lease kinds and report changes through `LeaseService`. They never call the
`LeaseProvider` directly. `LeaseService` is the only code that calls the provider.

The main reason is maintainability through separation of concerns. A consumer owns which leases
it wants and how it holds them. `LeaseService` owns the interface that consumers use and the
registration of a kind. The backend owns how leases are claimed, renewed and synced.

## Alternatives Considered

1. **Consumers call the `LeaseProvider` directly.** We rejected it because each consumer would mix
   its own logic with the registration of a kind, such as the order of the provider calls.
2. **Each backend implements the API that consumers call.** We rejected it because each backend
   would hold the consumer interface and the registration of a kind next to the management of
   leases.

## Consequences

1. Consumers depend only on `LeaseService`. Only `LeaseService` calls the `LeaseProvider` port.
2. The registration of a kind, with its checks, lives in `LeaseService` and not in consumers or
   backends.
3. `LeaseService` keeps the registered kinds in memory. Each process registers its kinds when it
   starts.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261113-add-a-dependency-free-leaf-package-for-lease-contracts
