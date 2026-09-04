# RFCs

An RFC makes a decision arguable in writing before it is expensive in code. It carries the problem,
every live option steelmanned, a trade-off table, one recommendation and the open questions. The RFC
argues; the Operator decides; an ADR in `docs/adrs/` records the ruling.

## Conventions

- Filename `NNNN-slug.md`, four digits, allocated in order and never reused.
- `Status:` is one of `Draft`, `In review`, `Decided`, `Superseded by RFC-NNNN`.
- `Class:` sizes the process — 1 two-way door (a paragraph in the issue is usually enough),
  2 expensive to reverse (RFC + a 2-day window), 3 one-way door (RFC + a 3-day window + explicit
  Operator sign-off).
- The comment window is in the header and is defended. An RFC without a clock is a parking lot.
- Superseded RFCs stay in the repo with a pointer forward. The archive is the point.

## Index

| # | Title | Status | Class | Decided |
|---|---|---|---|---|
| [0001](./0001-design-system-external-install-weight.md) | Cut the external install weight of `@n8n/design-system` | Draft — awaiting decision | 2 | — |

## Note on numbering

This is the first repo-level RFC or ADR archive. Two earlier sequences exist outside it and do not
share its numbers: `packages/frontend/@n8n/design-system/vite.config.mts:140` cites an unfiled
`ADR-0002`, and `packages/@n8n/instance-ai/docs/` cites `ADR-002` and `ADR-003` for that package
only. Neither has a filed record here. When those are backfilled, renumber them into this sequence
rather than adopting their old numbers.
