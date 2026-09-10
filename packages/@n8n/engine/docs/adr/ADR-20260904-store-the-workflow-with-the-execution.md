# Store the workflow revision that ran with the execution

Date: 2026-09-04

Status: Active

Decision Owner: Catalysts

## Context

In engine v1, we store the full workflow definition that is executed in the `execution_entity` table. That definition includes everything that is needed to render the workflow in the UI.

In engine v2, executions are stored in the data plane (DP). The control plane (CP) owns the workflow definitions. Only the minimal executable graph ("run graph") is sent from CP to DP, which means disabled nodes, node positions, etc. are removed. This means a workflow can't be fully rendered in the UI just from the "run graph".

We have to decide between 1) keeping a single copy of the data in the CP or 2) duplicate it into the data plane.


## Decision

We keep an immutable, opaque snapshot of the workflow in the data plane, along the execution itself. The snapshot is sent as part of the start execution request.

By making it an immutable, opaque snapshot we don't take "ownership" of the underlying data. And by keeping it alongside the execution, we reduce the amount of complicated cross-plane access.

This moves in the direction of a generic "opaque metadata attached by the caller, to be used later by the caller".

We believe we can mitigate possible performance concerns in the future, for example by storing the workflow once and content-addressing it across executions.


## Alternatives Considered

- **Rebuild the workflow from the run graph.**
  The graph is lossy and can't represent the original workflow.
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
