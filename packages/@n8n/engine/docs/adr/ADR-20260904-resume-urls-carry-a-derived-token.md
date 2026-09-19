# Resume URLs carry a derived capability token

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

A caller outside n8n ends a wait that accepts a resume request. The caller can
be a webhook client, a person who submits a form, or a person who approves a
message. That caller uses a URL. The URL travels through channels that the
engine does not control. It stays available for the length of the wait, which
can be several months.

The data plane verifies the request
(ADR-20260902-steps-declare-waits, decision 5). The control
plane forwards the request and reads none of its own tables. Therefore the
token is the only control between an unknown caller and a paused workflow.

The engine has two kinds of shared-secret token. Neither kind fits.
`IDENTITY_TOKEN` goes from the control plane to the data plane.
`ACTION_TOKEN` goes from the data plane to the control plane. Their issuer and
audience values are opposite. This prevents the replay of one token at the
endpoints of the other. Both tokens live for 60 seconds. That length is correct
for a call between two services. It is too short for a URL in an email.

Engine v1 holds a random `resumeToken` in the data of the execution. It
compares the token with a timing-safe equality check. The check is optional. An
execution without a stored token accepts any caller.

Engine v1 also signs the resume URL itself. `getSignedResumeUrl` builds a path
from the execution id and the node id, adds the parameters that the node needs,
and then signs the path and the parameters together. It signs with a separate
HMAC secret. The signature therefore covers the parameters that a node puts in
an approval URL, and a holder of the cross-plane secret cannot build a URL.

## Decision

A **separate kind of capability token** authorizes a resume request. The engine
derives the token and does not store it.

The bar this decision must meet is parity with engine v1: a resume URL is as
hard to forge here as it is there, and no harder. The derived token in the form
below does not meet that bar. The consequences name the two gaps.

The decision is also not a claim that this is the final shape. A later decision
supersedes this one when the trust layer between the planes settles, or when a
requirement arrives that the derived form cannot meet. Per-URL revocation is
the most likely of those.

1. **The token has its own spec.** A third `SharedSecretTokenSpec` holds its own
   issuer and audience. Therefore a caller cannot replay a resume token at the
   existing endpoints of either plane. A caller also cannot replay either
   existing token at the resolve endpoint.
2. **The engine derives the token and does not persist it.** The engine
   calculates the token from the execution id, the step id, and the shared
   secret. It does this each time it needs a URL. This needs no column and no
   migration. Any code that holds the two ids can build the URL. The
   send-and-wait nodes need this when they compose the message that they send.
3. **The claims name one step.** The claims hold the execution id and the step
   id. Therefore a token for one step cannot resolve the wait of a different
   step.
4. **The token does not expire.** The status of the step is the control. The
   token shows which caller can make the request. The compare-and-set that every
   other transition uses decides if the request still applies. `resumeStep`
   moves a step out of `waiting`, or it does nothing. A token for a wait that is
   already resolved, timed out, or cancelled has no effect.

## Alternatives Considered

- **Add a scope to `ActionScope`.** This option reuses the action token. The
  audience of that token is the control plane, but the data plane verifies a
  resume request. Its 60-second lifetime also needs an override. Almost none of
  the existing spec would remain. The shared enum would also tell a reader that
  the replay guarantee still applies, which would be false.
- **Mint the token at suspension and store it on the step row.** This option
  can revoke one wait without a change to the secret. The derived token cannot
  do this. The option needs a column. It also makes the shim read the row again
  to build a message URL. No requirement asks for this revocation path.
- **Set the expiry to the deadline of the wait.** This option gives the
  shortest window for a wait that has a deadline. A wait that only a resume
  request ends has no deadline. Therefore the option needs a second rule for
  that case. Two rules for one question increase the risk of a gap in the check.
- **Use one long lifetime, for example ninety days.** This option limits the
  damage from a URL that leaks. It does not depend on the declaration. It also
  sets a maximum wait length that no other part of the engine sets. It converts
  a secret-management problem into a product limit.
- **Copy engine v1: store a random token per wait and compare it.** This option
  is known and it can revoke one wait. It needs the column that the derived
  token avoids. The optional check of v1 is also a failure mode to avoid: with
  no stored token, v1 makes no check.

## Consequences

- The claims name the two ids and no request parameters. Engine v1 signs the
  parameters of a resume URL as well, so a node can put a value in the URL and
  then trust that value when the request returns. To reach the parity bar, the
  claims must cover the parameters that the resolve endpoint accepts.
- The resume token uses the shared secret of the two planes. Engine v1 signs a
  resume URL with a secret that the data plane holds alone. To reach the parity
  bar, the resume token needs its own secret.
- The engine cannot revoke one resume URL. A URL stops working when the step
  leaves the `waiting` status, and not before. A change of the shared secret
  makes all open resume URLs invalid at the same time.
- The token authenticates the request. It does not authorize the workflow. Who
  can resume a given wait is a separate decision, if that rule becomes narrower
  than "the caller that holds the URL".
- The claims name a step, and a step can hold more than one wait in sequence. A
  step can suspend, resume on a request, and then suspend again with a new
  declaration. The same token applies to each of those waits. To make a token
  apply to one wait only, the engine must add a suspension counter to the claims
  and to the compare-and-set. The counter must be on the step row, so this
  changes decision 2 in part. No v1 node reaches this case, because
  `putExecutionToWait` is on `IExecuteFunctions` and not on
  `IWebhookFunctions`. Therefore the resume method of a node cannot suspend the
  step again.
- The verification of the token shows which step the caller means. It does not
  show that the step still waits. Therefore the resolve path reads the step row
  in all cases. The token does not remove a database read. It decides if the
  request can continue.
- The shared secret now protects three kinds of token. A rotation of that
  secret therefore also invalidates every open resume URL.
- A derived token without an expiry needs a change to the token primitive.
  `signSharedSecretToken` always sets `expiresIn`, and `verifySharedSecretToken`
  always passes `maxAge`. Both values come from the spec. Therefore the change
  is to make the lifetime optional in the spec.
- A resume request can still arrive before the engine records the suspension
  (ADR-20260902-steps-declare-waits). At this endpoint, that window appears as
  a valid token for a step that does not yet hold the `waiting` status.

## Links

RFC: -
Documentation: Engine 2.0 — Detailed Design, §3.3
https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc
Tickets: CAT-2928
Related ADRs: ADR-20260902-steps-declare-waits
