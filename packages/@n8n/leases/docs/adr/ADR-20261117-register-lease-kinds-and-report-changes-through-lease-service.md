# Register lease kinds and report changes through LeaseService

Date: 2026-11-17

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-757

## Context

A lease kind is a family of leases with one handler, for example the triggers of published
workflows. A consumer registers its kinds and tells the backend when the leases it wants change.
The `LeaseProvider` port is the contract that a backend implements. Several consumers use leases,
and the backend behind the port can change or be replaced.

## Decision

Consumers register lease kinds and report changes through `LeaseService`. They never call the
`LeaseProvider` directly. `LeaseService` is the only code that calls the provider.

The main reason is that consumers are not coupled to the backend contract. A backend can change,
or be swapped for another backend, without a change to any consumer.

## Alternatives Considered

1. **Consumers call the `LeaseProvider` directly.** We rejected it because consumers would be
   coupled to the backend contract. A change to the backend, or a swap to another backend, would
   reach every consumer.
2. **Each backend implements the API that consumers call.** We rejected it because the consumer
   API would then belong to the backend. Consumers would be coupled to the backend that runs, and
   a swap to another backend could change what consumers see.

## Consequences

1. A change to the `LeaseProvider` port changes `LeaseService` and the backends, not the
   consumers.
2. A new backend implements only the `LeaseProvider` port. Consumers and `LeaseService` do not
   change.
3. Behaviour that does not depend on the backend, such as the checks on a kind, lives in
   `LeaseService`. A backend does not repeat it.
4. `LeaseService` keeps the registered kinds in memory. Each process registers its kinds when it
   starts.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261113-add-a-dependency-free-leaf-package-for-lease-contracts
