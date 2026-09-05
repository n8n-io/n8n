# ADR-2026-09-04: Store the workflow that ran with the execution

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

An execution read must report the workflow that ran. The editor draws the
execution canvas from it, and attaches the run data to the nodes on that canvas.

Engine v2 keeps no execution row on the control plane. The data plane owns the
run. The execution record already holds the graph, captured at start and
immutable for the life of the execution.

The graph is not the workflow. It holds step nodes and edges. It does not hold
node positions, notes, credential references, node groups, the workflow name or
the workflow settings. It also drops disabled nodes, and it rewrites structure
for batch and loop nodes.

So the read reported the graph from the run and the workflow from the control
plane, as it is now. A rename of a node after the run made the two disagree. The
run data named one node and the canvas drew another.

In this ADR, the workflow document means the projection an execution read
reports: `id`, `name`, `nodes`, `connections`, `settings` and `nodeGroups`. It is
the same projection the v1 read path reports.

## Decision

The control plane sends the workflow document with the start request, beside the
graph. The data plane stores it with the execution, immutable for the life of the
execution, and reports it on the execution read. The execution read no longer
loads the live workflow.

The document is opaque. The engine stores it and reports it. It never reads a
field out of it. This is the same treatment a step's config gets.

Anything the engine must act on stays a separate, engine-shaped field. The
document carries `settings`, but no engine behaviour reads them. A timeout, a
timezone or a failure handler must still arrive as its own field.

The document is a copy, not a source. Nothing on the data plane may serve it as a
workflow definition, and nothing may write to it.

## Alternatives Considered

- **Rebuild the workflow from the graph.** The graph is lossy. It drops disabled
  nodes, positions, notes, credential references, node groups, the workflow name
  and its settings. The canvas would draw wrong.
- **Point at a workflow version instead of copying the document.** A version id
  and a workflow history table already exist. This makes a data plane read depend
  on a control plane table, history retention is configurable and lossy, and an
  unsaved manual run has no version at all.
- **Keep the copy on the control plane, keyed by the execution id.** This splits
  one execution's truth across two databases, with no transaction between them.
  The data plane owns the run.
- **Store the whole workflow and narrow it on read, as v1 does.** v1 stores a wide
  row and narrows it when it serves it. v2 narrows at write time instead. Less
  crosses the plane boundary, and the data plane never holds static data or
  pinned data.
- **Share one copy between executions**, by content addressing or a revision
  store. A later option. The v1 path already pays for one copy for each run.

## Consequences

- One copy for each execution. Runs of an unchanged production workflow do not
  share a copy.
- The data plane stores what it does not run: node positions, notes and
  credential references. The graph never carried credential references. The
  document does. v1 stores the same beside its executions, so this is parity, but
  it is new for the engine's database.
- A workflow definition now sits on the plane that does not own definitions.
- The graph and the document are captured in one request. That is what keeps the
  run data and the canvas in agreement. A future path that sets one without the
  other brings the mismatch back.
- The start request now carries a whole workflow, so the engine raises its body
  limit above the default.
- The document is required on the start request. An older control plane gets a
  400 from a newer engine. Lockstep deployment is assumed at this stage.
- The read path decides what an unusable document means. The engine promises only
  that the document is JSON. The control plane reader rejects one it cannot draw.
- Sub-workflow and error-workflow children are unsolved. The data plane cannot
  build a graph, so a child still needs the control plane to produce both its
  graph and its document.
- Retention is unsolved. The document lives as long as the execution row.

## Links

RFC: -
Documentation: https://linear.app/n8n/issue/CAT-4341
Related ADRs: ADR-2026-08-28-trigger-settlement-before-execution.md
