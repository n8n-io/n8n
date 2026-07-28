# Architecture Decision Records

An ADR records a decision **that was actually made** — the context that made it
reasonable, the options that were genuinely live, and the costs we accepted. The
point is that nobody pays for the same lesson twice.

## Index

| #                                                         | Title                                          | Date       | Status   | Tags                            |
| --------------------------------------------------------- | ---------------------------------------------- | ---------- | -------- | ------------------------------- |
| [0001](0001-design-system-ships-as-a-compiled-package.md) | @n8n/design-system ships as a compiled package | 2026-07-28 | accepted | frontend, packaging, publishing |
| [0002](0002-per-file-declarations-for-design-system.md)   | Per-file declarations for @n8n/design-system   | 2026-07-28 | accepted | frontend, typescript, build     |

## Conventions

- **Filename:** `NNNN-kebab-slug.md`, sequential, never reused.
- **Sections:** Context · Decision · Considered options · Consequences ·
  Revisit triggers.
- **The "Bad" consequences are mandatory.** An ADR with only upside is a press
  release, and it makes the revisit triggers meaningless.
- **Revisit triggers are written at filing time**, while judgment is cold and
  nobody is invested in the outcome yet.
- **ADRs are append-only.** Never edit a record's substance to match new
  reality — that turns the archive into retroactive fiction. Changed your mind?
  New ADR with `Supersedes: NNNN`; the old one gets `Superseded by: NNNN` and its
  status flips. Typo and link fixes are fine.
- **Statuses:** `proposed` → `accepted` → `superseded` | `deprecated`.
- **Cross-link both ways.** The PR that implements a decision links to the ADR;
  the ADR links back.

## Scope

This directory holds decisions that reach past a single package — anything a
future reader might hit from a different part of the repo. Decisions confined to
one module may live beside that module instead; those are numbered
independently and are not indexed here. Existing example:
`packages/cli/src/modules/promotion-review-prototype/docs/adr/`.

When answering "why is it built this way?", answer with the link first and the
summary second. An archive nobody searches is a diary.
