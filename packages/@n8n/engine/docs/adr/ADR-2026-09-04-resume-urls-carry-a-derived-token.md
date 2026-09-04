# ADR-2026-09-04: Resume URLs carry a derived capability token

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

A wait that ends on a resume request is ended by someone outside n8n: a
webhook caller, a form submitter, a person clicking Approve in an email. The
URL they use travels through channels the engine does not control and sits
there for as long as the wait lasts, which can be months. Whatever authorizes
that request has to survive the same journey.

The data plane verifies the request (ADR-2026-09-02, decision 5): the control
plane forwards it without consulting its own tables, so the token is the only
thing standing between a stranger and someone else's paused workflow.

The engine already has two shared-secret token kinds, and neither fits.
`IDENTITY_TOKEN` runs control plane to data plane, `ACTION_TOKEN` runs data
plane to control plane, and their swapped issuer and audience exist precisely
to stop one being replayed where the other belongs. Both live 60 seconds,
which is right for a machine-to-machine call and wrong for a link in an inbox.

v1 stores an opaque `resumeToken` on the execution's data and compares it with
a timing-safe equality check, optionally — an execution without one accepts any
caller.

## Decision

A resume request is authorized by a **capability token of its own kind**,
derived rather than stored.

1. **Its own token spec.** A third `SharedSecretTokenSpec` with its own issuer
   and audience, so a resume token cannot be replayed at either plane's
   existing endpoints and neither of theirs can be replayed at the resolve
   endpoint.
2. **Derived, not persisted.** The token is computed from the execution id, the
   step id and the shared secret whenever a URL is needed. No column, no
   migration, and any code holding the two ids can produce the URL — which is
   what send-and-wait nodes need when they compose the message they send.
3. **Bound to one step.** The claims name the execution and the step, so a
   token for one wait cannot resolve another.
4. **No expiry; the step's status is the gate.** The token proves who may ask.
   Whether the ask still applies is decided by the same compare-and-set every
   other transition uses: `resumeStep` moves a step out of `waiting` or does
   nothing. A token for a wait already resolved, timed out or cancelled buys
   nothing.

## Alternatives Considered

- **Add a scope to `ActionScope`.** Reuses the existing action token, but that
  token's audience is the control plane and the data plane is what verifies a
  resume request. Its 60-second lifetime would have to be overridden too, so
  almost nothing of the existing spec would survive — while the shared enum
  would suggest to a reader that the replay guarantee still holds.
- **Mint at suspension and store the token on the step row.** Allows revoking
  one wait without touching the secret, which the derived form cannot. Costs a
  column, and makes the shim read the row back to build a message URL, for a
  revocation path nothing has asked for.
- **Bind expiry to the wait's own deadline.** Tightest available window for a
  wait that has a deadline. A wait ended only by a resume request has none, so
  it needs a second rule anyway, and two rules for one question is how a
  security check acquires a hole.
- **A fixed long lifetime, for example ninety days.** Bounds the damage from a
  leaked URL without depending on the declaration. Also imposes a ceiling on
  how long a workflow may wait, which nothing else in the engine imposes, and
  turns a leaked-secret problem into a product limit.
- **Copy v1: a random token stored per wait, compared timing-safely.** Known
  quantity, and revocable per wait. Needs the column the derived form avoids,
  and v1's own optionality — no stored token means no check — is the failure
  mode worth not reproducing.

## Consequences

- A resume URL cannot be revoked individually. It stops working when the step
  leaves `waiting`, and not before. Rotating the shared secret invalidates
  every outstanding resume URL at once.
- The token authenticates the request; it does not authorize the workflow. Who
  is allowed to resume a given wait, if that ever becomes narrower than "whoever
  holds the URL", is a separate decision.
- Verifying the token proves which step is meant but not that the step is still
  waiting, so the resolve path reads the step row regardless. The token saves no
  round trip; it decides whether the round trip is allowed.
- The shared secret now protects three token kinds. Giving resume tokens their
  own secret would confine a rotation to them, and is available later without
  changing this decision.
- Deriving a token with no expiry needs the token primitive to accept an absent
  lifetime: `signSharedSecretToken` sets `expiresIn` unconditionally today, and
  `verifySharedSecretToken` passes `maxAge`. Both take the lifetime from the
  spec, so the change is confined to making it optional.
- A resume request can still arrive before the suspension is recorded
  (ADR-2026-09-02). A valid token for a step that is not yet `waiting` is the
  shape that window takes at this endpoint.

## Links

RFC: https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc (§3.3)
Tickets: CAT-2928
Related ADRs: ADR-2026-09-02-steps-declare-waits
