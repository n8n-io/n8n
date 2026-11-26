# Keep runtime credentials separate from dynamic credentials

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

Dynamic credentials store a secret for each user, refresh it, and check the identity of the user
through a resolver. Runtime credentials carry a value that the caller sends for one execution.

Both overlay data in `CredentialsHelper.getDecrypted`. Both use the context establishment hooks and
read the headers of the trigger item. A resolver could in principle return the request token as its
secret, so one mechanism might serve both.

## Decision

We keep two mechanisms. They share the execution context and the hook mechanism. They use
different fields of the execution context: `credentials` for dynamic credentials and
`secureArtifacts` for runtime credentials.

A credential is one kind or the other. `getDecrypted` takes the runtime branch first, for a row
with `isRuntime` set. It never runs the dynamic resolver for such a row.

The product rule is one question: who owns the token. For dynamic credentials, n8n stores it. For
runtime credentials, the caller sends it.

## Alternatives Considered

We rejected a passthrough resolver for four reasons. The context `credentials` field holds one
identity string, so the token would sit in a field that holds the identity of a user. The
resolver storage interface would stay unused. The per-user connect UI would show for a credential
with nothing to connect. A resolver also sees the whole credential context and not the request, so
it cannot pick a field for each rule.

We rejected one merged mechanism. Per-user storage, the connect UI, and path rules would
compete. The change would also need a large migration.

## Consequences

The code has two paths, and two hooks can act on the same header. The hook phases in
ADR-20261118-clear-request-values-after-the-node-configured-hooks-run settle the order.

Only dynamic credentials set the redaction flag and the resolved user. A stub does not, so the
execution data of a run that uses a stub stays readable.

A customer who needs n8n to verify the caller uses the OAuth resolver on the same webhook. The
runtime rule then names a different field.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-feed-a-request-value-to-a-credential-without-verifying-it, ADR-20261118-clear-request-values-after-the-node-configured-hooks-run
