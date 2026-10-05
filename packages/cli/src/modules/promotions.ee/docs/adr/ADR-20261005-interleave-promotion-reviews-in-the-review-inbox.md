# Interleave Promotion Reviews with other reviews in the Review Inbox

Date: 2026-10-05

Status: Proposed (to be confirmed after we see the inbox source contract from ASS-1517; the POC builds on it meanwhile)

Decision Owner: Lifecycle & Governance

Source: https://linear.app/n8n/issue/LIGO-1231

## Context

The Review Inbox lists Workflow Reviews. The POC adds Promotion Reviews (GitLab
merge requests opened by a Promotion Run). The Assistant team adds a third type
(ASS-1517, self-healing fixes) and has written down that each source keeps its
own section and pagination, and that there is no merged feed.

Promotion Reviews and Workflow Reviews are both tasks an instance admin must
act on. Grouping by source would rank them by origin, not by urgency.

## Decision

We interleave Promotion Reviews with Workflow Reviews in the same list, ordered
by creation time, under the same Open and Closed tabs.

Each source keeps its own API, store, pagination cursor, permissions, detail
view, and actions. The inbox view merges the sources on the client with a
k-way merge: it emits an item only when every non-exhausted source has loaded
items at least as old as that item. The POC loads all open Promotion Reviews
in one request (admin-only, small count) and merges them into the first page.
The cursor-aware merge is v1 work.

Main reason: the admin reads the inbox as one task list. The type of review
is a property of the row, not a heading.

## Alternatives Considered

- **Grouped section per source** (what ASS-1517 plans). Keeps sources
  independent and avoids the merge. Rejected: it ranks tasks by origin and
  hides older high-priority items under a later heading.
- **Merged server-side query.** One endpoint over all review tables. Rejected:
  three permission models in one query, and the Assistant team rejected a
  merged feed on the backend.
- **Separate view for Promotion Reviews.** Rejected: users learn a second
  place; question 1 of the POC ("is the synced MR acceptable") needs the
  review to sit where reviews live.

## Consequences

- The row must carry a `kind` discriminator and a per-kind row renderer.
  Rows show the type with an icon and a short label so the action behind
  the click is predictable.
- Counts in the Open and Closed badges sum across sources.
- A correct interleave needs a merge that respects each source's cursor.
  Until then, Promotion Reviews older than the first loaded page of Workflow
  Reviews can appear out of order.
- The decision diverges from ASS-1517. We tell the Assistant team before they
  build the shared source contract so that the contract supports both a
  grouped and an interleaved presentation.

## Links

RFC: -

Documentation: packages/cli/src/modules/promotions.ee/CONTEXT.md

Related ADRs: -
