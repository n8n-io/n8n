# Deployable is a transport-neutral, content-addressed snapshot

A **deployable** is an immutable, content-addressed snapshot of a workflow and
its dependency closure, frozen when a user "marks for deployment". A
**promotion request** references it by content hash + a transport locator and
carries only the manifest (workflow names, credential requirements, summary) —
not the workflow artifact bytes, which are fetched on demand for diff/apply.

Because the deployable is content-addressed and transport-neutral, *where it
physically lives during review is a property of the transport*, not the request:
served by the producing instance (direct transport, v1), or published to an
intermediary where it lives between the instances (shared store / git). The
consuming side always reads it as a buffer and runs the existing
`ImportPipeline` `plan` / `apply`, so the transport choice never reaches the
engine.

## Status

accepted

## Considered options

- **Intent-only request, artifacts fetched separately:** too thin — the staging
  area can't show credential gaps or a diff without an extra round-trip per
  request.
- **Self-contained request (artifacts embedded inline):** heavy inbox, transfers
  bytes that may never be reviewed, and double-stores under git/shared-store
  transports (the transport already holds the bytes).
- **Intent + manifest, artifacts on demand:** chosen. Renders the staging list
  cheaply and stays transport-neutral.

## Consequences

- Immutability gives reproducible promotions, no TOCTOU between review and
  apply, and a content hash that anchors the consuming instance's audit record
  (and future rollback / "already applied" detection).
- Freezing at mark time means stale deployables accumulate on the producing side
  — cleanup is a deferred concern.
- The same deployable model supports project/folder granularity later by
  changing only how the closure root is selected.
