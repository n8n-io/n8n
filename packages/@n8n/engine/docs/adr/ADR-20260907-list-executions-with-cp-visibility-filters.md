# List executions with control-plane visibility filters

Date: 2026-09-07

Status: Active

Decision Owner: Catalysts

## Context

Engine v2 stores executions in the data plane (DP). The control plane (CP)
owns workflows, users, projects, and sharing. One workflow can have executions
in both engines. The editor must list both sources with the same access rules.

Sharing is many-to-many. A workflow can be visible through a project that does
not own it. The DP cannot derive visibility from the opaque caller context.

## Decision

Use option A: the CP supplies an opaque workflow visibility filter to the DP.
The CP resolves `workflow:read` and workflow-attribute filters on each request.
The DP applies the resulting workflow IDs with its execution filters.
It does not learn why a workflow is visible.

An authenticated, read-only `POST /api/workflow-executions/search` accepts the
filter in its body. Explicit lists contain at most 10,000 workflow IDs. The CP
deduplicates larger sets, searches disjoint batches, and merges their results.
At most four batch requests run concurrently. Permissions are not cached.

Users with global `workflow:read` can send `workflowIds: 'all'` when no workflow
attribute restricts the query. This release assumes a dedicated DP database
for each CP. It does not add tenant isolation. Under this assumption, `all`
means the whole DP database. A shared DP requires tenant scoping before use.
The authenticated CP is trusted to supply the visibility decision.

The DP selects seven summary columns. It does not load the execution graph,
workflow document, trigger outputs, or caller context. The CP supplies current
workflow names. A missing workflow name does not remove an execution from an
unrestricted administrator result.

The editor uses an opaque, versioned cursor with one position per source.
The CP sorts v1 rows by start time, with creation time as a fallback. The DP
sorts by creation time. Each source uses its native ID as a descending tie
breaker. For equal timestamps across sources, v2 comes first. The cursor
advances only for rows that reach the response. UUID mint time does not define
the DP order: the CP can mint an ID before the DP creates the row.

The default view reports current executions separately from completed pages.
Only completed rows determine the count and continuation cursor. Counts omit
cursor bounds. DP counts are exact. The CP preserves the v1 estimate flag and
unknown-count sentinel. Polling keeps the continuation for the oldest loaded
page. These are live reads, not a snapshot across status or sharing changes.

Mode filters pass through unchanged. The DP compares the string with its
stored mode. A mode it does not yet store returns no matches. Summary display
keeps the existing reader mapping. CP-only execution filters exclude v2.

## Alternatives Considered

- **CP index of immutable execution facts (B1).** It could help authorize a
  single read before fetching data. It cannot supply current status for lists.
  It adds a dual write and does not remove the need for the DP search.
- **CP status mirror (B2).** Lifecycle events are at-most-once freshness signals.
  A status mirror needs reconciliation and monotonic updates.
- **DP project column (C).** One project cannot represent many-to-many sharing.
  Project moves would also require updates to stored executions.
- **Token visibility grants (D).** Defer until a non-CP client needs them.
  Large workflow sets do not fit in identity tokens. The filter contract leaves
  room for a future grant mechanism.
- **DP callbacks to the CP (E).** They reverse the read dependency and make page
  filling depend on repeated authorization calls.
- **Replicated sharing tables (F).** They duplicate CP state and make access
  changes eventually consistent.
- **CP ID pages hydrated by the DP (G).** They cannot page current and completed
  executions correctly without first knowing their status.

## Consequences

- Sharing changes apply on the next request. Cursor contents never grant access.
- Large member scopes require repeated ID payloads, SQL filtering, and counts.
  Batching bounds each request but does not remove this cost.
- An enabled DP failure fails the list request. A disabled module contributes
  an empty source. Partial pages must not look complete after a DP failure.
- Internal REST pagination changes from `firstId`/`lastId` to `cursor` and
  `nextCursor`. Both editor consumers change together. MCP and public API
  contracts do not change.
- This work does not add tenant scoping, public API v2 reads, a CP index,
  retention, or stop/retry/delete/annotation support. Existing action controls
  can expose operations that v2 does not support. Action changes are deferred.

## Links

Issue: https://linear.app/n8n/issue/CAT-4434

Related ADR: [Store the workflow revision that ran with the execution](ADR-20260904-store-the-workflow-with-the-execution.md)
