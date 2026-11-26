# Lock stub credentials against user changes

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A stub credential comes from a rule that an admin owns. The seeder re-creates a deleted stub at
the next start. A user who edits or deletes a stub would break workflows or see the change undone.
A stub also holds only placeholder data, so a test of the stub, a share, or an OAuth action has no
meaning.

## Decision

A user cannot change a stub. Each service path that updates, deletes, shares, transfers, tests, or
clears OAuth data on a credential rejects a stub with a `BadRequestError`. The message is "This
credential is created from run-time input rules and cannot be changed." The public API update path
has the same guard.

Source control export skips stubs. Package export excludes the `isRuntime` field. A credential
response and the default list select include `isRuntime`, so the editor can label a stub.

## Alternatives Considered

We rejected the option to allow edits and re-create the stub at startup. This option would let a
rename or a delete cause an unexplained change at the next restart.

We rejected a new scope for stub management. Only the seeder and the rules API create or remove
stubs, so no user needs the right.

We rejected hiding stubs from the list. A builder must see a stub to pick it in a node.

## Consequences

The guard is the second line of defence. The first is the owner row: a stub has none. Edit,
delete, and transfer answer 404 for every caller, including the instance owner. A share request
reaches the guard and answers 400.

The credential list with `includeGlobal` returns the stub to every user. The editor does not open
a stub for editing.

A new operation that changes a credential must call `assertNotRuntime`.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-create-one-stub-credential-for-each-rule-at-startup
