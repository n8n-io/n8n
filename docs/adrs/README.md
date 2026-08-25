# ADRs

An ADR records a decision **after** it has been made — what was decided, by whom, why, and the
consequences, good and bad. Decisions taken against a recommendation are recorded with the same care,
with the reasoning and a revisit trigger. So are decisions *not* to do something.

## Conventions

- Filename `NNNN-slug.md`, four digits, allocated in order and never reused. The sequence is shared
  with nothing else; see the numbering note in `../rfcs/README.md`.
- Nygard format: Context · Decision · Consequences (good and bad) · Revisit trigger.
- Filed within a day of the decision, never a week. Paperwork never blocks the work.
- **ADRs are immutable.** A decision that changes gets a new ADR that supersedes the old one; the old
  record keeps its text and gains a `Superseded by ADR-NNNN` line. Never edit an ADR's substance —
  an edited record is a record that lies about what was known at the time.
- Claims are labelled `verified`, `inferred` or `assumed`, with the source. Dissent is preserved, not
  smoothed over.

## Index

*Empty. RFC-0001 is awaiting a ruling; its ADR is filed when the ruling lands.*
