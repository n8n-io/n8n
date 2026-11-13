# Keep the leases package free of runtime dependencies

Date: 2026-11-13

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-750

## Context

`@n8n/leases` holds the contracts for leases: the `LeaseProvider` port and the `Lease`,
`LeaseFence`, `LeaseHandler`, and `LeaseSource` types. A consumer, such as a trigger service,
implements handlers and sources. A backend implements the provider.

A fence check runs inside a transaction of the consumer. A write that depends on a lease then
commits only while this process holds the lease. So the contracts must carry a transaction handle.
In the cli, business logic passes its transaction as an `OperationContext`. Another backend or
consumer can use a different handle.

## Decision

`@n8n/leases` has no runtime dependencies. It imports no database, dependency injection,
scheduler, or other n8n code. Its source imports only its own files.

Every type that touches a transaction takes the transaction handle of the consumer as the type
parameter `TTransaction`. The package passes the handle through and never looks inside it. The cli
binds `TTransaction` to its `OperationContext`.

The main reason is that consumers and backends can change independently of each other.

## Alternatives Considered

1. **Contracts typed on the `OperationContext` of `@n8n/db`.** We rejected it because the package
   would then depend on the persistence layer. Every consumer and every test would load that
   layer. A backend on a different store could not implement the port.
2. **Contracts inside the cli lease backend.** We rejected it because consumers would import the
   backend to get the types. A change to the backend would then reach every consumer.

## Consequences

1. A test can run the contracts against an in-memory provider, with no database.
2. A consumer and a backend must agree on one `TTransaction` type. The compiler checks that they
   agree.
3. The package cannot hold logic that needs a database. That logic lives in the backend.
4. A test of the package checks that its manifest has no runtime dependencies and that its source
   imports only relative paths.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: -
