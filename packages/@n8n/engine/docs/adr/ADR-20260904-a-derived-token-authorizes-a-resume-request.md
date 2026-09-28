# A derived token authorizes a resume request

Date: 2026-09-04

Status: Active

Decision Owner: Catalysts

Source: CAT-2928

## Context

A caller outside n8n ends a wait that accepts a resume request. The caller can be a webhook client,
a person who submits a form, or a person who approves a message. That caller uses a URL. The URL
travels through channels that the engine does not control. It stays available for the length of the
wait, which can be several months.

The data plane verifies the request (ADR-20260902-steps-declare-waits, decision 5). The control
plane forwards the request and reads none of its own tables. Therefore the token is the only control
between an unknown caller and a paused workflow.

The engine has two kinds of shared-secret token. Neither kind fits. `IDENTITY_TOKEN` goes from the
control plane to the data plane. `ACTION_TOKEN` goes from the data plane to the control plane. Their
issuer and audience values are opposite. This prevents the replay of one token at the endpoints of
the other. Both tokens live for 60 seconds. That length is correct for a call between two services.
It is too short for a URL in an email.

Engine v1 holds a random `resumeToken` in the data of the execution. It compares the token with a
timing-safe equality check. The check is optional. An execution without a stored token accepts any
caller.

Engine v1 also signs the resume URL itself. `getSignedResumeUrl` builds a path from the execution id
and the node id, adds the parameters that the node needs, and then signs the path and the parameters
together. It signs with a separate HMAC secret. The signature therefore covers the parameters that a
node puts in an approval URL, and a holder of the cross-plane secret cannot build a URL. Engine v1
derives that secret from the encryption key of the instance, so the control plane can build a URL.

The data plane can run as its own process. That process has no access to the database or the
encryption key of the control plane. Node code runs in the data plane, so every node builds its
resume URLs there. The control plane verifies one resume request in engine v1: the Slack and
Telegram approval callback, which carries a signed reference in the request body to a fixed URL.

## Decision

A **separate kind of capability token** authorizes a resume request. The engine derives the token
from a secret that only the data plane holds, and does not store the token.

The bar this decision must meet is parity with engine v1: a resume URL is as hard to forge here as
it is there. The derived token in the form below does not meet that bar. The consequences name the
gap. Where the planes run as separate processes, the token goes past v1, because the control plane
cannot build a URL.

The decision is also not a claim that this is the final shape. A later decision supersedes this one
when the trust layer between the planes settles, or when a requirement arrives that the derived form
cannot meet. Per-URL revocation is the most likely of those.

1. **The token has its own spec.** A third `SharedSecretTokenSpec` holds its own issuer and
   audience. Therefore a caller cannot replay a resume token at the existing endpoints of either
   plane. A caller also cannot replay either existing token at the resolve endpoint.
2. **The engine derives the token and does not persist it.** The engine calculates the token from
   the execution id and the resume secret. It does this each time it needs a URL. This needs no
   column and no migration. Any data-plane code that holds the execution id can build the URL. The
   send-and-wait nodes need this when they compose the message that they send.
3. **The claims name the execution.** The claims hold the execution id. A resume URL is built before
   the step that waits exists: `$execution.resumeUrl` is evaluated by whichever node reads it, and
   the usual pattern sends the URL from a node that runs before the wait. There is no step id to
   name at that point. The data plane therefore picks the waiting step of the execution when the
   request arrives. Engine v1 keys its resume URL by execution for the same reason.
4. **The token does not expire.** The status of the step is the control. The token shows which
   caller can make the request. The compare-and-set that every other transition uses decides if the
   request still applies. `resumeStep` moves a step out of `waiting`, or it does nothing. A token
   for a wait that is already resolved, timed out, or cancelled has no effect.
5. **The data plane owns the resume secret.** The resume secret is not the shared secret of the two
   planes, and the control plane never holds it. The data plane mints every resume token and
   verifies every resume request. The control plane forwards a resume request without reading its
   token. The engine does not start without the resume secret.
6. **A rolling rollout rotates the resume secret.** A rotation rejects no valid token and does not
   stop an open resume URL. Processes with the old configuration and the new configuration can run
   side by side.
7. **The control plane sends each resume request to the engine that runs the execution.** It picks
   engine v1 or engine 2.0, and it does not read the token to do so.

## Alternatives Considered

- **Add a scope to `ActionScope`.** This option reuses the action token. The audience of that token
  is the control plane, but the data plane verifies a resume request. Its 60-second lifetime also
  needs an override. Almost none of the existing spec would remain. The shared enum would also tell
  a reader that the replay guarantee still applies, which would be false.
- **Mint the token at suspension and store it on the step row.** This option can revoke one wait
  without a change to the secret. The derived token cannot do this. The option needs a column. It
  also makes the shim read the row again to build a message URL. No requirement asks for this
  revocation path.
- **Set the expiry to the deadline of the wait.** This option gives the shortest window for a wait
  that has a deadline. A wait that only a resume request ends has no deadline. Therefore the option
  needs a second rule for that case. Two rules for one question increase the risk of a gap in the
  check.
- **Use one long lifetime, for example ninety days.** This option limits the damage from a URL that
  leaks. It does not depend on the declaration. It also sets a maximum wait length that no other
  part of the engine sets. It converts a secret-management problem into a product limit.
- **Copy engine v1: store a random token per wait and compare it.** This option is known and it can
  revoke one wait. It needs the column that the derived token avoids. The optional check of v1 is
  also a failure mode to avoid: with no stored token, v1 makes no check.
- **Derive the resume secret from the encryption key, as engine v1 does.** We rejected it for two
  reasons. A separate data-plane process does not hold the encryption key of the control plane. The
  control plane could also build a URL. This option would need no new configuration where both
  planes run in one process.
- **Accept one resume secret only.** We rejected it because a rotation would need a restart of every
  process at the same moment, and each open resume URL would stop working. This option would need a
  simpler configuration.
- **Sign the token with the shared secret of the two planes.** We rejected it for two reasons. The
  control plane holds that secret, so the control plane could build a URL. A rotation of it would
  also invalidate every open resume URL. This option would need no new secret.

## Consequences

- The claims name the execution and no request parameters. Engine v1 signs the parameters of a
  resume URL as well, so a node can put a value in the URL and then trust that value when the
  request returns. To reach the parity bar, the claims must cover the parameters that the resolve
  endpoint accepts.
- Every data-plane process needs the resume secret, and all of them must use the same value. The
  operator sets it in every deployment that enables engine 2.0, also where both planes run in one
  process. The engine does not generate it. A process without it fails at start, so a resume request
  never fails without a log entry.
- Where both planes run in one process, the control plane can read the resume secret. The control
  plane is excluded only where the planes run as separate processes.
- The Slack and Telegram approval callback reaches a fixed URL, with its signed reference in the
  request body. Engine v1 verifies that reference in the control plane. Here the data plane verifies
  it. The control plane reads only the execution id in the reference, to pick the engine, and
  forwards the body.
- The control plane picks the engine by the shape of the execution id, as its other execution routes
  do. Therefore the resume URL carries the execution id in its path, and the approval callback
  carries it in its reference. An id of the wrong shape reaches an engine that rejects the token.
- The engine cannot revoke one resume URL. A URL stops working when the step leaves the `waiting`
  status, or when its secret leaves the accepted set.
- The data plane signs with one secret and accepts every secret in a configured set. A token names
  the secret that signed it, so the verifier finds the secret without a trial of each one.
- A rotation takes two rollouts. The first adds the new secret to the accepted set. The second makes
  it the signing secret. A rotation does not invalidate an open resume URL.
- The token does not expire, so an old secret stays in the accepted set while a wait that it signed
  is open. The removal of a secret from the set makes every open resume URL that it signed stop
  working. That removal is the only way to revoke resume URLs.
- The token authenticates the request. It does not authorize the workflow. Who can resume a given
  wait is a separate decision, if that rule becomes narrower than "the caller that holds the URL".
- One token covers every wait of the execution, not one wait. Engine v1's per-execution
  `resumeToken` does the same, so the bar is unchanged. An execution with two waits open at once is
  ambiguous, and the resolve path answers 409. Engine v1 has the same single-wait limit. A
  `webhookSuffix` is the natural way to tell two apart if that limit ever lifts.
- A send-and-wait node builds its URL inside the node that waits, where the step is known. Those
  URLs could carry the step id, which would mean two claim shapes rather than one. This record does
  not choose between them.
- The verification of the token shows which execution the caller means. It does not show that a step
  still waits. Therefore the resolve path reads the step row in all cases. The token does not remove
  a database read. It decides if the request can continue.
- A rotation of the shared secret of the two planes does not affect open resume URLs.
- A derived token without an expiry needs a change to the token primitive. `signSharedSecretToken`
  always sets `expiresIn`, and `verifySharedSecretToken` always passes `maxAge`. Both values come
  from the spec. Therefore the change is to make the lifetime optional in the spec.
- A resume request can still arrive before the engine records the suspension
  (ADR-20260902-steps-declare-waits). At this endpoint, that window appears as a valid token for a
  step that does not yet hold the `waiting` status.

## Links

RFC: -

Documentation: Engine 2.0 — Detailed Design, §3.3 https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc

Related ADRs: ADR-20260902-steps-declare-waits
