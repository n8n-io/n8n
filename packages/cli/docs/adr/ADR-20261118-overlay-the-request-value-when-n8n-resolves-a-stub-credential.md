# Overlay the request value when n8n resolves a stub credential

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

Every node credential lookup goes through `CredentialsHelper.getDecrypted`. At that point n8n has
the execution context of the run, which holds the encrypted request values. The credential row
holds only placeholder data. Engine v2 resolves credentials in a control plane request that has
no execution context.

## Decision

For a stub, `getDecrypted` builds the credential data in this order: the placeholder data with the
defaults, overwrites, and expressions of the credential type, then the request data. The request
value is plain data. n8n never evaluates it as an expression, and never writes it to a row.

- A missing value fails the node. n8n never falls back to the placeholder.
- A rule that gave different values for one execution fails the node. The message names the rule
  and the path. It never contains a value.
- A stub whose rule is gone, or whose rule has another credential type, fails with a clear error.
- OAuth token write-back returns early for a stub, so a refresh never writes to the shared row.
- The dynamic resolver does not run for a stub.
- The overlay does not set `currentNodeUsedDynamicCredentials`. A stub is not an end-user
  credential. The flag would redact the execution data and show the end-user label.
- A request-fed policy check runs first, so a denied type fails before n8n reads any value.
- Engine v2 fails closed. The control plane request has no execution context, so the stub has no
  value and the step fails.

## Alternatives Considered

We rejected a fallback to the placeholder for a missing value. A call with fake data would fail
at the app with an error that hides the real cause.

We rejected the first of several values. The choice would depend on item order and could pick
the wrong caller token.

We rejected a refresh with write-back. A refreshed token of one caller must not reach a row that
other callers use.

## Consequences

A manual run has no request, so a stub fails with the message "This credential gets its value from
the incoming request. Run the workflow through its trigger."

The data of a stub is plain in memory for the length of the node call, like other credential
data.

Engine v2 cannot run a workflow that uses a stub. This changes only if the engine passes the
execution context to the control plane.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-create-one-stub-credential-for-each-rule-at-startup, ADR-20261118-match-request-values-by-key-path-with-linear-time-globs, ADR-20261118-govern-request-fed-credential-types-with-a-policy-kind
