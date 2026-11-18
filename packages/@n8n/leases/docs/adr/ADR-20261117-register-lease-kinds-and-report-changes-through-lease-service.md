# Register lease kinds and report changes through LeaseService

Date: 2026-11-17

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-757

## Context

A lease kind is a family of leases with one handler, for example the triggers of published
workflows. A consumer registers its kinds and tells the backend when the leases it wants change.
The `LeaseProvider` port is the contract that a backend implements. The port takes options as
given and does not check kind names.

Each kind needs a name that is safe to store and to show, and options that are complete. Several
consumers and possibly several backends use the port.

## Decision

Consumers register lease kinds and report changes through `LeaseService`. They never call the
`LeaseProvider` directly.

`LeaseService` owns the rules for a kind. It rejects a name that does not match the name rule or
that is already registered. It rejects an option that is not valid. It merges the kind's options
over the defaults. The service then gives the provider the source of the kind, its complete
options and its handler. `MAX_LEASE_KIND_LENGTH` and `DEFAULT_LEASE_KIND_OPTIONS` hold the limit
and the defaults.

The main reason is that consumers are not coupled to the backend contract. A backend can change,
or be swapped for another backend, without a change to any consumer.

## Alternatives Considered

1. **Consumers call the `LeaseProvider` directly.** We rejected it because consumers would be
   coupled to the backend contract. A change to the backend, or a swap to another backend, would
   reach every consumer.

## Consequences

1. A backend gets only valid names and valid, complete options. It does not check them again.
2. `LeaseService` rejects a call for a kind that is not registered, before the call reaches the
   backend.
3. `LeaseService` keeps the registered kinds in memory. Each process registers its kinds when it
   starts.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261113-add-a-dependency-free-leaf-package-for-lease-contracts
