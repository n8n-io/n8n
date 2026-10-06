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

This record uses these terms:

- **Resume request:** a request that ends a wait. It carries a token.
- **Execution-bound resume URL:** a resume URL that names the execution and no step.
  `$execution.resumeUrl`, `$execution.resumeFormUrl`, and `$resumeWebhookUrl` hold it. Any node can
  read it, also before the step that waits exists. Its caller chooses the query and the body.
- **Step-bound resume URL:** a resume URL that names one step. The waiting node builds it with
  `getSignedResumeUrl` while its step runs. The node fixes its query, for example `approved=true`.
- **Approval callback:** a step-bound resume request that Slack or Telegram sends to one fixed URL
  when a person presses a button. The reference that names the step is in the request body.
- **Execution-bound wait:** a wait that accepts an execution-bound resume URL, for example the Wait
  node in webhook or form mode.
- **Step-bound wait:** a wait that accepts a step-bound resume URL or an approval callback, for
  example a send-and-wait node.

ADR-20260902-steps-declare-waits sends every resume request to a data-plane endpoint that checks it
against the waiting step. That endpoint accepts every request, so the request must authorize itself.
A resume request also runs the `webhook` method of the node that waits. That method needs the HTTP
request and the HTTP response, and only the control plane holds them.

The engine has two kinds of shared-secret token. Neither kind fits. `IDENTITY_TOKEN` goes from the
control plane to the data plane. `ACTION_TOKEN` goes from the data plane to the control plane. Their
issuer and audience values are opposite. This prevents the replay of one token at the endpoints of
the other. Both tokens live for 60 seconds. That length is correct for a call between two services.
It is too short for a URL in an email.

In engine v1, `$execution.resumeUrl` and `$execution.resumeFormUrl` carry a random `resumeToken`
from the data of the execution. Engine v1 compares it with a timing-safe equality check. The check
is optional: an execution without a stored token accepts any caller.

In engine v1, `getSignedResumeUrl` builds a URL whose path holds the execution id and the node id,
and whose query holds the parameters that the node sets. Engine v1 signs the path and the query
together with an HMAC secret, so a caller cannot change a parameter. Engine v1 derives that secret
from the encryption key of the instance, so the control plane can build a URL. The node id in the
path also selects the webhook of the waiting node. Therefore the URL from `$execution.resumeUrl`
cannot end the wait of a send-and-wait node.

The data plane can run as its own process. That process has no access to the database or the
encryption key of the control plane. Node code runs in the data plane, so every node builds its
resume URLs there. The control plane verifies one resume request in engine v1: the approval callback
of Slack and Telegram. It carries a signed reference in the request body to a fixed URL, and
Telegram limits that reference to 64 bytes.

## Decision

A **separate kind of capability token** authorizes a resume request. The engine derives the token
from a secret that only the data plane holds, and does not store the token. The token is the only
control between an unknown caller and a paused workflow. Therefore every resume request carries a
token, and the data plane rejects a request without one. Engine v1 skips its check for executions
from before it stored tokens. Engine v2 has no such executions.

The bar this decision must meet is parity with engine v1: a resume request is as hard to forge here
as it is there. The decision meets that bar. It goes past v1 in two places. No control-plane code
can build a token. A step-bound resume URL and an approval callback end one wait only.

1. **The token has its own spec.** A third `SharedSecretTokenSpec` holds its own issuer and
   audience. Therefore a resume token is not valid at the other endpoints of either plane, and the
   tokens of those endpoints are not valid at the resume endpoint.
2. **The engine derives the token and does not persist it.** The engine calculates the token from
   its claims and the resume secret. It does this each time it needs a token. This needs no column
   and no migration. Any data-plane code that holds the claims can build the token. The
   send-and-wait nodes need this when they compose the message that they send.
3. **The claims name what the builder knows.** An execution-bound resume URL names the execution.
   Whichever node reads `$execution.resumeUrl` or `$execution.resumeFormUrl` evaluates it, usually
   before the step that waits exists. The data plane therefore picks the waiting step of the
   execution when the request arrives, as engine v1 does. A step-bound resume URL and an approval
   callback name the step. The waiting node builds them while its step runs, so they end that wait
   and no other.
4. **The token states its kind.** A token is an execution-bound resume URL, a step-bound resume URL,
   or an approval callback, and the data plane applies the rule of that kind. A request resumes a
   step only if the wait of the step is bound the same way as its token. An execution-bound wait
   accepts an execution-bound resume URL. A step-bound wait accepts a step-bound resume URL and an
   approval callback.
5. **The token binds what the node fixed.** A step-bound resume URL binds its path and its query, so
   a caller cannot change, add, or remove a parameter. An approval callback binds its decision. An
   execution-bound resume URL binds only the execution. Its caller chooses the query and the body,
   because a webhook caller sends its data that way.
6. **The token does not expire.** The status of the step is the control. The token shows which
   caller can make the request. The compare-and-set that every other transition uses decides if the
   request still applies. `resumeStep` moves a step out of `waiting`, or it does nothing. A token
   for a wait that is already resolved, timed out, or cancelled has no effect.
7. **The data plane owns the resume secret.** The resume secret is not the shared secret of the two
   planes, and no control-plane code reads it. The data plane mints every resume token and verifies
   every resume request. No node code runs for a resume request before the data plane accepts its
   token. The control plane passes the token to the data plane and does not read it. The engine does
   not start without the resume secret.
8. **A rolling rollout rotates the resume secret.** A rotation rejects no valid token. Processes
   with the old configuration and the new configuration can run side by side. An outstanding resume
   URL keeps working until the operator removes the secret that signed it.
9. **The control plane sends each resume request to the engine that runs the execution.** It picks
   engine v1 or engine v2, and it does not read the token to do so.

## Alternatives Considered

- **Add a scope to `ActionScope`.** We rejected it because almost none of the spec of the action
  token would remain. The audience of that token is the control plane, but the data plane verifies a
  resume request, and its 60-second lifetime would need an override. The shared enum would also tell
  a reader that each token is still valid at one endpoint only, which would be false. This option
  would reuse an existing token.
- **Mint the token at suspension and store it on the step row.** We rejected it because it would
  need a column, and the shim would read the row again to build a message URL. No requirement asks
  for the revocation path that it would give. This option could revoke one wait without a change to
  the secret.
- **Set the expiry to the deadline of the wait.** We rejected it because a wait that only a resume
  request ends has no deadline, so this option would need a second rule for that case. Two rules for
  one question increase the risk of a gap in the check. This option would give the shortest window
  for a wait that has a deadline.
- **Use one long lifetime, for example ninety days.** We rejected it because it would set a maximum
  wait length that no other part of the engine sets. It would turn a secret-management problem into
  a product limit. This option would limit the damage from a URL that leaks, and it would not depend
  on the declaration.
- **Copy engine v1: store a random token per wait and compare it.** We rejected it for two reasons.
  It would need the column that the derived token avoids. The optional check of v1 is also a failure
  mode to avoid: with no stored token, v1 makes no check. This option is known, and it could revoke
  one wait.
- **Name the execution in every token.** We rejected it because an approval from an earlier
  iteration of a loop would end a later wait. This option would need one claim shape only.
- **Let the URL decide the kind, as engine v1 does.** We rejected it because the rule would then
  depend on the path and on the configuration of the workflow, not on what the token proves. A
  change to either would change the check. This option would need no kind in the token.
- **Bind the query of every resume URL.** We rejected it because a webhook caller sends its data in
  the query, and such a request would fail. This option would need one binding rule only.
- **Derive the resume secret from the encryption key, as engine v1 does.** We rejected it for two
  reasons. A separate data-plane process does not hold the encryption key of the control plane. The
  control plane could also build a URL. This option would need no new configuration where both
  planes run in one process.
- **Accept one resume secret only.** We rejected it because a rotation would need a restart of every
  process at the same moment, and each outstanding resume URL would stop working. This option would
  need a simpler configuration.
- **Sign the token with the shared secret of the two planes.** We rejected it for two reasons. The
  control plane holds that secret, so the control plane could build a URL. A rotation of it would
  also invalidate every outstanding resume URL. This option would need no new secret.
- **Sign with an asymmetric key.** We did not select it because the data plane is the only party
  that signs and verifies a token, and an asymmetric signature does not fit in the 64 bytes of an
  approval callback. This option would let other parties verify a token without being able to sign
  one.

## Consequences

- A step-bound resume URL binds its query as the node built it, without the token parameter. The
  data plane compares the same string when the request arrives. It does not rebuild the query from
  parsed values, because two different queries can parse to the same values.
- Every data-plane process needs the resume secrets. A process signs only with a secret that every
  other process accepts. The operator sets them in every deployment that enables engine v2, also
  where both planes run in one process. The engine does not generate them. A process without them
  fails at start, so a resume request never fails without a log entry.
- The Slack and Telegram approval callback reaches a fixed URL, with its signed reference in the
  request body. Engine v1 verifies that reference in the control plane. Here the data plane verifies
  it. The control plane reads only the id in the reference, to pick the engine, and forwards the
  body.
- The approval callback must fit in 64 bytes, the limit of Telegram. Therefore it carries its claims
  in a compact signed form instead of the format of the resume token. Nothing is stored.
- The control plane picks the engine by the shape of the id in the request, as its other execution
  routes do. A v1 id is numeric, and a v2 id is a UUID. Therefore an execution-bound resume URL
  carries the execution id in its path, and a step-bound resume URL and an approval callback carry
  the step id. An id of the wrong shape reaches an engine that rejects the token.
- Every resume request also carries the identity token of the control plane that forwards it, like
  every other call from the control plane to the data plane. The data plane resumes an execution
  only if the execution belongs to the tenant of that identity token. The trust layer between the
  planes specifies that check.
- The engine cannot revoke one resume URL. A URL stops working when the step leaves the `waiting`
  status, or when its secret leaves the accepted set.
- The data plane signs with one secret and accepts every secret in a configured set.
- A rotation takes two rollouts. The first adds the new secret to the accepted set. The second makes
  it the signing secret. The order matters, because during a rolling rollout a process that has not
  updated yet must already accept the new secret. A third rollout removes the old secret, when the
  operator chooses.
- The token does not expire, so an old secret stays in the accepted set while a step that it signed
  still waits. The removal of a secret from the set makes every outstanding resume URL that it
  signed stop working. That removal is the only way to revoke resume URLs.
- The token authenticates the request. It does not authorize the workflow. Who can resume a given
  wait is a separate decision, if that rule becomes narrower than "the caller that holds the URL".
- An execution-bound resume URL covers every wait of the execution, not one wait. A request resumes
  the wait that the execution is in when the request arrives. In a loop, the same URL resumes the
  wait of every iteration, also a URL that a node sent in an earlier iteration. Engine v1 does the
  same, so the bar is unchanged. An execution with two waits at the same time is ambiguous for an
  execution-bound resume URL, and the resolve path answers 409. Engine v1 has the same single-wait
  limit. A `webhookSuffix` is the natural way to tell two apart if that limit ever lifts.
- The verification of the token shows which execution or step the caller means. It does not show
  that a step still waits. Therefore the resolve path reads the step row in all cases. The token
  does not remove a database read. It decides if the request can continue.
- A rotation of the shared secret of the two planes does not affect outstanding resume URLs.
- The token primitive must allow a token without an expiry. Therefore the lifetime is optional in
  the token spec.
- A resume request can still arrive before the engine records the suspension
  (ADR-20260902-steps-declare-waits). At this endpoint, that window appears as a valid token for a
  step that does not yet hold the `waiting` status.

## Links

RFC: -

Documentation: Engine v2 — Detailed Design, §3.3 https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc; Engine v2: Trust Layer: CP ↔ DP — Design Overview https://app.notion.com/p/n8n/3725b6e0c94f8077a562cb2e2c821e9c

Related ADRs: ADR-20260902-steps-declare-waits
