# Replay the first Public API response for an Idempotency-Key

Date: 2026-10-05

Status: Active

Decision Owner: API & OEM

Source: https://linear.app/n8n/issue/API-294

## Context

The Public API accepts an Idempotency-Key header on a POST that creates a
resource or starts work. The client opts in by sending the header. A request
with no header keeps today's behaviour and does no store I/O.

PUT, PATCH, and DELETE already return the same outcome on a repeat. The store
ignores the header on those routes, and on GET and HEAD.

A handler can save a resource and then fail. The status code does not show
whether that save happened. The credential create handler inserts the row,
then loads the owning project. A failure in that later step returns 500, and
the credential already exists.

## Decision

We keep the first finished response and return it when the same user sends the
same key and the same fingerprint again. The stored response includes 4xx and
5xx. The handler runs only for the first request. The client sends a new key
after a real failure.

1. Compare the fingerprint first. It is a hash of the method, the path, and
   the body. The same key with a different fingerprint returns 422. This
   applies while the first request is `processing` and after it completes.
   The handler does not run. The client sends a new key.
2. The same key and the same fingerprint replay the stored response. A retry
   while that request is still `processing` returns 409 Conflict. A completed
   row returns the stored response, including a stored 400.
3. The key is an opaque string. We compare it exactly after trim. The length
   is 1 to 128 characters, and the characters are visible ASCII. A longer value
   or a disallowed character returns 400. An empty value, or a value that is
   only whitespace, is the same as no header.
4. The middleware registers once on the public API controller registry. Every
   public handler uses that registry before the middleware is added.
5. The internal `/rest` API stays out of this version. The store has no HTTP
   types, so `/rest` can mount later.

## Alternatives Considered

1. **Wait for the in-flight request, then return its response.** Waiting needs
   coordination across mains. A 409 tells the client to retry later.
2. **Return only the new resource id when the body is large.** The same POST
   would then have two response shapes.
3. **Apply the store on every request.** Clients that send no key would pay for
   a store read. The header stays opt-in.
4. **Mount the store on `/rest` in this version.** `/rest` has different auth,
   a higher write volume, and existing version checks.
5. **Release the key when the handler returns an error.** A later retry would
   run the handler again. A 500 can follow a committed write, so that retry
   can create a second resource. The stored error blocks that second write.

## Consequences

1. If the process dies after the claim and before it stores the response, a
   later retry with the same fingerprint receives 409 until the row expires.
2. An instance setting can turn the feature off. While it is off, the header is
   ignored and the store is idle.
3. Idempotency leaves version checks unchanged. `forceSave` still works as it
   does today.
4. The stored row is defined in
   ADR-20261005-store-public-api-idempotency-keys-in-the-instance-database.
5. After an error, the same fingerprint returns the stored response until the
   row expires. A bug fix does not change the stored response. A new key runs
   the handler again.

## Links

RFC: https://app.notion.com/p/n8n/Public-API-idempotency-3d55b6e0c94f816cb074fef7efcb6280

Documentation: https://linear.app/n8n/issue/API-294

Related ADRs: ADR-20261005-store-public-api-idempotency-keys-in-the-instance-database
