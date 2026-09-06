# Store the workflow revision that ran with the execution

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

Before a workflow is sent for execution to engine v2, it is transformed to a minimal "run graph": disabled and unreachable nodes are removed, presentational items (e.g. notes, positions) are removed & format is transformed from engine v1 to engine v2. In contrast, UI needs "display projection" of a workflow (`id`, `name`, `nodes`, `connections`, `settings` and `nodeGroups`) to render it and attach the run data to the nodes.

Engine v2 keeps no execution row on the control plane (CP), and data plane (DP) keeps only the "run graph" instead of full workflow definition. Currently there is no way to get the "display projection" of a "run graph".


## Decision

CP sends the display projection with the start request, together with the graph. DP stores it with the execution, immutable, and reports it on the execution read.

The display projection is opaque to DP. The engine stores it and reports it. It never reads a field out of it. This is the same treatment a step's config gets.

Display projections are not deduplicated. That is a future optimization if needed.

## Alternatives Considered

- **Rebuild the workflow from the graph.**
  The graph is lossy. It drops certain fields mentioned in the Context, so it would not be possible to render it properly.
- **Send a workflow version ID to the DP.**
  Each workflow's edit history is already stored in the `workflow_history` table with a unique ID. However:
  - History table is missing workflow's `settings`
  - This would make DP read depend on a CP table
  - This would couple CP history retention & pruning to DP
- **Keep the copy on the control plane, keyed by the execution id.**
  This would split one execution's truth across CP and DP, with no transaction between them.
- **Share one copy between executions**
  Similar to "Send a workflow version ID to the DP" but introduce a new table and identify workflow's by hashing the workflow contents. This could be considered later on.
- **Replicate all workflows from CP to DP**
  DP would have all workflows it needs to execute. However, replication is complex and eventually consistent. Not all workflow history versions are executed.

## Consequences

- Start execution command payload grows.
- The same workflow needs to be sent in every command. Runs of an unchanged production workflow do not share a copy.
- DP stores data it does not itself need.
- The graph and the document are captured in one request, and execution cannot be created without both.
- Sub-workflow and error-workflow executions are unsolved. The data plane cannot build a graph, so a child still needs the control plane to produce both its run graph and display projection.
- Retention is unsolved. The document lives as long as the execution row.

## Links

RFC: -
Documentation: https://linear.app/n8n/issue/CAT-4341
Related ADRs: -
