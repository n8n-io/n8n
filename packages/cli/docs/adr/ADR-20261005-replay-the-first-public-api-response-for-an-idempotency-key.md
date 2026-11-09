# Replay the first Public API response for an Idempotency-Key

Date: 2026-10-05

Status: Active

Decision Owner: API & OEM

Source: https://linear.app/n8n/issue/API-294

## Context

The Public API accepts an Idempotency-Key header on a POST that creates a
resource or starts work. The client opts in by sending the header. A request
with no header keeps today's behaviour and does no store I/O.

PUT and PATCH return the same outcome on a repeat. A second DELETE can return
404 after the first returns 200. The record stays deleted. The store ignores
the header on those routes, and on GET and HEAD.

A handler can save a resource and then fail. The status code does not show
whether that save happened. The credential create handler inserts the row,
then loads the owning project. A failure in that later step returns 500, and
the credential already exists.

## Decision

We keep the first successful response and return it when the same user sends
the same key and the same fingerprint again. We do not store an error. When
the handler returns an error, we release the key. The same key runs the
handler again.

1. Compare the fingerprint first. It is a hash of the method, the path, the
   query string, and the body. The path is the request path. It includes the
   public API prefix and the version, for example `/api/v1/workflows`. It
   excludes the scheme and the host. The query string is the raw text after
   `?`, without that `?`. No query is an empty string. The body is the raw
   JSON text. A retry must send the same characters. For
   `POST /api/v1/workflows?source=api` with body `{"name":"Hello"}`, the hash
   covers `POST`, `/api/v1/workflows`, `source=api`, and `{"name":"Hello"}`.
   The same key with a different fingerprint returns 422. This applies while
   the first request is `processing` and after a success. The handler does
   not run. The client sends a new key.
2. The same key and the same fingerprint replay the stored success. A retry
   while that request is still `processing` returns 409 Conflict. An error
   deletes the processing row. The next request with that key can claim it.
3. The key is an opaque string. We compare it exactly after trim. The length
   is 1 to 128 characters, and the characters are visible ASCII. A longer value
   or a disallowed character returns 400. An empty value, or a value that is
   only whitespace, is the same as no header.
4. The internal `/rest` API stays out of this version. The store has no HTTP
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
5. **Store the error and replay it.** A retry would return the stored 4xx or
   5xx until the row expires. The client would send a new key to run the
   handler again. A stored 500 would block a second write when the handler
   committed and then failed. We reject this. A failed POST stays retryable
   with the same key.

## Consequences

1. If the process dies after the claim and before it stores the response, a
   later retry with the same fingerprint receives 409 until the row expires.
2. An instance setting can turn the feature off. While it is off, the header is
   ignored and the store is idle.
3. Idempotency leaves version checks unchanged. `forceSave` still works as it
   does today.
4. The stored row is defined in
   ADR-20261005-store-public-api-idempotency-keys-in-the-instance-database.
5. A retry after an error runs the handler again. When the handler committed a
   write and then returned 500, that retry can create a second resource. After
   a success, the same fingerprint returns the stored response until the row
   expires. A bug fix does not change that stored response.

## Links

RFC: https://app.notion.com/p/n8n/Public-API-idempotency-3d55b6e0c94f816cb074fef7efcb6280

Documentation: https://linear.app/n8n/issue/API-294

Related ADRs: ADR-20261005-store-public-api-idempotency-keys-in-the-instance-database
