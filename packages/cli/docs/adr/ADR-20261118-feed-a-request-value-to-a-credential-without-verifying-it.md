# Feed a request value to a credential without verifying it

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A caller sends a third-party access token with a request, for example as a bearer header on a
webhook. The workflow must call an app such as Gmail as that caller. A node that uses a credential
type cannot take a raw string. A builder must use an HTTP Request node and loses the operations of
the app node.

End-user credentials solve a different problem. For them, n8n stores one token for each user and
checks who the user is. Here the caller holds the token and sends it with each request.

## Decision

A value in the request becomes the secret of a credential for one execution. The caller brings the
token. n8n does not verify the token, exchange it, or check its scope or audience. n8n passes it to
the app, and the app accepts or rejects it.

The token authenticates the caller to the app. It does not authenticate the caller to the workflow.
A webhook that must reject unknown callers uses its own authentication. n8n documents this and does
not enforce it.

n8n does not store the token in a credential row. n8n does not block any node type from using the
credential.

## Alternatives Considered

We rejected on-behalf-of with token exchange and verification. This option would need an identity
provider, a trust relationship per customer, and an exchange step. A customer who needs n8n to
verify the caller already has the OAuth resolver of end-user credentials. That resolver keeps
its own storage.

We rejected webhook authentication that the feature enforces. This option would tie the feature to
each trigger type. A builder can already set the authentication of the trigger.

We rejected a node blocklist for Code and AI nodes. A credential in n8n is readable by any node
that the builder gives it to. A blocklist for one credential kind would add a special case.

## Consequences

Any caller who can reach the trigger can make the workflow call the app with a token that the
caller holds. The token limits what the caller can do. When the app rejects the token, the node
shows the error of the app.

n8n does not refresh or expire the token. A token that expires during a run fails the call.

n8n removes the value from only the paths that a rule names. A copy in another part of the request
stays in the trigger output. Each token needs one delivery path.

An expression that reads a matched path sees a marker instead of the value.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-keep-runtime-credentials-separate-from-dynamic-credentials
