# Add a dependency-free leaf package for lease contracts

Date: 2026-11-13

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-750

## Context

A lease gives one resource, such as the trigger of a published workflow, to exactly one main in a
cluster, with no leader. Two sides use leases. A consumer says which leases it wants and holds the
ones that this main gets. A backend decides which main holds each lease. The two sides live in
different places and change at different times, so they need a shared contract that belongs to
neither of them.

A fence check runs inside a transaction of the consumer, so the contract must carry a transaction
handle. In the cli, business logic passes its transaction as an `OperationContext`.

## Decision

Add `@n8n/leases`, a leaf package that holds only the lease contracts: the lease types, the
`LeaseProvider` port that a backend implements, and `LeaseEndedError`. Consumers and backends
depend on this package, not on each other.

The package has no runtime dependencies. It imports no database, dependency injection, scheduler,
or other n8n code. Its source imports only its own files.

The main reason is that consumers and backends can change independently of each other.

## Alternatives Considered

1. **Contracts typed on the `OperationContext` of `@n8n/db`.** We rejected it because the package
   would then depend on the persistence layer. Every consumer and every test would load that
   layer. A backend on a different store could not implement the port.
2. **Contracts inside the cli lease backend.** We rejected it because consumers would import the
   backend to get the types. A change to the backend would then reach every consumer.

## Consequences

1. The package cannot name the transaction type of the consumer. Every type that touches a
   transaction takes the handle as the type parameter `TTransaction`, and the package never looks
   inside it. The cli binds `TTransaction` to its `OperationContext`.
2. A consumer and a backend must agree on one `TTransaction` type. The compiler checks that they
   agree.
3. The package cannot hold logic that needs a database. That logic lives in the backend.
4. A test of the package checks that its manifest has no runtime dependencies and that its source
   imports only files inside the package source.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: -
