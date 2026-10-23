# Episodic capture storage

Capture-capable memory backends must implement `EpisodicMemoryCaptureMethods`.
This includes `getEntriesByContentHashes(scope, contentHashes)`.
Recall-only backends do not need this method.

The lookup returns exact content-hash matches from the scope used for writes.
Return all matching statuses, including dropped and superseded entries.
Include each entry's embedding and embedding model when available.
Do not widen the lookup to other scopes available for recall.
Return an empty array when there are no matches.

The candidate processor reuses non-empty, finite embeddings from the configured
model. It embeds each remaining content hash once per batch. Each candidate still
saves its source evidence and completes through the existing processing path.

`saveEntryWithSources` must keep the entry and its sources in one transaction.
On a content-hash conflict, keep the stored entry ID, content, creation time, and
metadata. Reactivate the entry and update its sighting and mutation timestamps.
Replace embedding fields when the caller supplies them. Keep stored embedding
fields when the caller omits them. Replayed source links must not create new rows.

The lookup is an optimization, not a reservation. Concurrent processors can both
embed content that is not stored yet. Database uniqueness and transactional writes
remain the final guard against duplicate entries and partial source writes.
