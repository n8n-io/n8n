# Observation log storage

Observational memory requires a `BuiltObservationLogStore` backend. The backend
must implement `commitObservationLogBatch`. The observer does not fall back to
separate observation and cursor writes.

## Batch contract

`ObservationLogBatch` contains these fields:

- `observationScopeId`: The source history stream.
- `expectedCursor`: The complete stored cursor, or `null` if none exists.
- `nextCursor`: The proposed history boundary. Its `updatedAt` is the batch time.
- `entries`: Prepared observations with a marker, redacted text, token count,
  creation time, and `parentIndex`. A parent index must reference an earlier
  entry in the same batch. Use `null` for a root entry.

The backend compares all expected cursor fields, including `updatedAt`. It must
not move the message boundary backwards. Compare message timestamps first, then
message IDs. An unchanged message boundary is valid when observations need to be
rebuilt.

On success, the backend writes every entry and the next cursor atomically. It
sets the cursor's `updatedAt` to the greater of the batch time and the previous
value plus one millisecond. This revision prevents a successful rebuild from
being replayed under a fixed clock.

Return `committed` after the complete batch is saved. Return `stale` without
writes when the expected cursor does not match or the message boundary moves
backwards. Propagate other persistence errors. A failed write must leave both
observations and the cursor unchanged. A valid empty batch can advance the cursor
without adding entries.

The observer reports a stale batch as a completed model call with no observations
written and no cursor advance. It reports model usage even if persistence fails.
It does not retry a prepared batch or repeat its model call automatically.

The append and cursor-setter APIs remain available for other callers. They do not
provide this atomic guarantee. Older observer runners also use separate writes.
