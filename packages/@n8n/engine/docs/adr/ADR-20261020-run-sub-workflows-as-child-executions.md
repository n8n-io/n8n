# Run sub-workflows as child executions

Date: 2026-10-20

Status: Active

Decision Owner: Catalysts

Source: https://linear.app/n8n/issue/CET-292

## Context

In engine v1 the Execute Sub-workflow node asks the control plane to run the child. The
control plane loads the workflow, checks the caller policy and the credentials, and runs it.
A parent that waits for the child parks on a sentinel date, and the child's completion
resumes it.

Engine v2 cannot do this today. The shim has no `executeWorkflow`, and it fails a step that
waits for a sub-execution. The engine cannot load a workflow or build a graph
(ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution). A step cannot block
for the length of a child run
(ADR-20260828-obtain-trigger-output-before-creating-the-execution). The caller policy and
the credential checks read control-plane state.

## Decision

1. **A sub-workflow call is a wait.** The engine suspends the step before it starts the
   child and resumes it when the child ends, as it suspends and resumes a waiting step
   (ADR-20260902-steps-declare-waits). The step does not declare a wait. It asks for a
   child, and the engine suspends it on that child. On resume the Execute Sub-workflow node
   runs again, and the call returns the child's result. This holds for that node because
   its work before the call has no side effects. A fire-and-forget call does not suspend,
   but the child still records its parent.
2. **The control plane resolves the child, and the engine starts it.** When a node asks
   for a sub-workflow, the shim calls the control plane. The control plane looks up the
   workflow, applies the caller policy and the credential checks, and returns the graph.
   The engine then starts the child itself as it processes the step result. Starting it in
   the engine keeps admittance and the parent link in one place.
3. **Suspend before start.** The engine suspends the parent step before it starts the
   child, so the child cannot end before the parent can resume. When the start fails,
   reconciliation recovers the waiting step.
4. **The child returns all its terminal branches, concatenated.** The branches are ordered
   as engine v1 orders execution, by canvas position from top to bottom, and then by run.
   Engine v1 returns the output of the last node that ran. This is a breaking change for a
   child with several end branches.
5. **Cancellation cascades.** Cancelling a parent cancels its children, awaited or not. A
   timeout that ends the parent does the same, once engine v2 has timeouts.
6. **Dropped features.** The "run once for each item" mode and the inline, local file and
   URL sources are refused. A v2 parent calls v2 children only.

## Alternatives Considered

- **The control plane starts the child.** Rejected. The child starts before the parent step
  is suspended, and the data plane asks the control plane to start an execution in the data
  plane.
- **A native step type that the converter builds.** The converter cannot resolve the
  expressions that choose the workflow. The option stays available for a static native node
  later.
- **Keep the v1 result rule.** Which branch wins depends on execution order. Concatenation
  is deterministic.

## Consequences

- The wait ADR's rule that no node code runs on a resume holds for deadline and request
  resumes only.
- A caller with side effects before its `executeWorkflow` call cannot use the replay. The
  AI Agent tools need their own design (CET-291).
- The child row carries a parent link that the engine alone sets. The read path can show
  parent and sub-execution links.
- A parent that awaits a child reports `waiting`. Engine v1 reports `running`.
- Fire-and-forget children stop with the parent. Engine v1 lets them run on.
- Reconciliation repairs a waiting step whose child never started, and an ended child whose
  parent still waits.
- Engine v2 has no timeout yet, so a child outlives a parent that v1 would have timed out.

## Links

RFC: -

Documentation: https://app.notion.com/p/n8n/Engine-v2-Sub-workflows-3ff5b6e0c94f80219bbaed7bcf2453fd

Related ADRs: ADR-20260902-steps-declare-waits, ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution, ADR-20260828-obtain-trigger-output-before-creating-the-execution
