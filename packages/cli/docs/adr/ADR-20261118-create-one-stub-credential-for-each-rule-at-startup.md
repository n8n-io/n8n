# Create one stub credential for each rule at startup

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A builder picks a credential in a node. The node stores the credential id in its parameters. A
request value has no credential row, so the builder has nothing to pick. The credential must exist
before a workflow uses it, and it must exist on every main of a cluster.

n8n already has one credential with no row: the Gateway credits marker. It needs special
handling in the credential code.

## Decision

n8n creates one stub credential for each rule that names a credential type. The stub is a normal
row in `credentials_entity` with `isRuntime` set.

- Every main creates the stubs at startup. The insert ignores a row that exists, so no leader gate
  is needed.
- The id derives from the alias of the rule: `runtime-` and the first 16 hex characters of the
  SHA-256 hash of the alias. The id binds the stub to its rule.
- The stub is global and has no owner project. Every project can use it.
- The stub holds encrypted placeholder data, `{}`. n8n never reads the placeholder as a secret.
- The create credential API does not accept `isRuntime`. Only the seeder sets it.
- A rule with an unknown credential type logs a warning and creates no stub.
- A removed rule leaves its stub in place, because workflows reference it.

## Alternatives Considered

We rejected a credential that the user creates by hand and flags. It needs manual work, and a
wrong type or a missing flag fails at run time.

We rejected a synthetic credential with no row. It would need special handling in the credential
list, the permission checks, the editor, and the export paths.

We rejected a new row for each execution. It would write a row for each request. It would also
put a secret at rest, which the feature avoids.

## Consequences

A stub has no owner row, so permission checks that need an owner row do not find it. Users see
it in the list but cannot edit it. ADR-20261118-lock-stub-credentials-against-user-changes covers
this.

The alias is the identity of the rule. A new alias makes a new stub. The old stub stays.

A workflow that uses the stub of a removed rule fails at run time with a clear error. It cannot be
published until a rule exists again.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-lock-stub-credentials-against-user-changes, ADR-20261118-store-rules-in-the-environment-and-the-database
