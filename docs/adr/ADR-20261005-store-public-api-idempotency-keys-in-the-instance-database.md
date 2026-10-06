# Store Public API idempotency keys in the instance database

Date: 2026-10-05

Status: Active

Decision Owner: API & OEM

Source: https://linear.app/n8n/issue/API-386

## Context

A dropped connection can make a client send the same Public API POST twice.
The second call can create a second workflow, credential, or execution. The
client sends an Idempotency-Key header so a retry returns the first result.

The record must survive a process restart and stay unique across mains. A
flush or eviction drops a Redis row. A lost row lets the POST run again. The
record holds a status and a response for hours.

## Decision

We store each key in the instance database, in the table `idempotency_key`.
Postgres and SQLite both receive the table.

1. The unique key is `(userId, idempotencyKey)`. Two API keys of the same user
   share one namespace. Two users may send the same key.
2. The row stores the fingerprint and the status (`processing` or
   `completed`). It also stores the response status and the response body.
   Those two columns stay empty while the handler runs. The stored response
   includes a 4xx or a 5xx. The replay rules are in
   ADR-20261005-replay-the-first-public-api-response-for-an-idempotency-key.
3. `userId` references `user.id`. Deleting the user deletes that user's keys.
4. A row expires 12 hours after `createdAt`. The read path treats an older row
   as a miss. A changed TTL applies to rows that already exist, because expiry
   is `createdAt` plus the TTL.
5. A system task deletes expired rows. It runs on an interval, on the leader
   only, and it deletes in batches. It follows the JTI cleanup task.

## Alternatives Considered

1. **Redis for the key store.** A flush or eviction drops the row, and the POST
   can run again. The instance database keeps the row for the full retention
   window.
2. **A 24 hour window, as Stripe uses.** The dropped-connection case lasts
   seconds to minutes. 12 hours covers same-day recovery.
3. **A 6 hour window.** A late-day retry of a morning write misses the stored
   response.
4. **Crontab for cleanup.** The instance already runs leader-only system tasks.
   A crontab adds a second scheduler for the same job.

## Consequences

1. A keyed write takes the SQLite writer lock. A client that sends a key on
   every request should use Postgres.
2. The same key can run the operation again after the row expires.
3. A create response can be as large as the request. Express already caps that
   size. Many keyed creates hold that payload until cleanup.
4. The request contract is recorded in
   ADR-20261005-replay-the-first-public-api-response-for-an-idempotency-key.

## Links

RFC: https://app.notion.com/p/n8n/Public-API-idempotency-3d55b6e0c94f816cb074fef7efcb6280

Documentation: https://linear.app/n8n/issue/API-386

Related ADRs: ADR-20261005-replay-the-first-public-api-response-for-an-idempotency-key
