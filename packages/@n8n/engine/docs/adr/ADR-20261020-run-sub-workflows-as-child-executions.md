# Run sub-workflows as child executions

Date: 2026-10-20

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-292

## Context

In engine v1 the Execute Sub-workflow node asks the engine to run the child directly in-line.
The engine loads the workflow, checks the caller policy and the credentials, and runs it.
A parent that waits for the child parks on a sentinel date, and the child's completion
resumes it.

Engine v2 cannot do this today. The shim has no `executeWorkflow`, and it fails a step that
waits for a sub-execution. ADR-20260902-steps-declare-waits left that pause out of scope and
expected a step type of its own to carry it; this ADR takes a different route, below. The
engine cannot load a workflow or build a graph
(ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution). A step cannot block
for the length of a child run
(ADR-20260828-obtain-trigger-output-before-creating-the-execution). The caller policy and
the credential checks read control-plane state.

## Decision

1. **A sub-workflow call uses a similar mechanism to wait-resume.** We receive the
   child execution request in the shim and return a `child` declaration, similar to `wait`.
   The engine is responsible for persisting the child declaration: suspending the parent,
   running the child, and resuming the parent when the child is complete.
2. **We re-invoke the execute method when the parent is resumed.** On the second
   invocation, the shim answers the `executeWorkflow` call with the output of the child
   execution. Then all of the existing post-processing is automatically applied. This
   decision supersedes the decision in ADR-20260902-steps-declare-waits which states that
   we do not re-invoke execute. That decision still holds for waiting, but not sub-workflows.
3. **An explicit suspend-action-response mechanism is planned future work.** We would prefer
   a more explicit method by which the node can request some action ("execute a sub-workflow"),
   have the engine invoke the action (run the sub-workflow), and pass the results back to the
   node for processing (post-processing with paired items). This would not rely on the fact
   that the code before `executeWorkflow` is idempotent, for example, and would be a clearer 
   interface. We plan to tackle this future work in the context of the AI agent node, which 
   will require it. At that time, we may refactor the execute re-invocation and also revisit
   the way wait-resume is implemented, to have a single unified mechanism.
4. **We reject `executeWorkflow` outside of the `Execute Workflow` node.** There are other
   nodes that use the method. We know it is safe for the `Execute Workflow` node
   implementation. We should be explicit about the cases where we do and do not support it,
   and reject by default. 
5. **The control plane resolves the child, and the engine starts it.** When a node asks
   for a sub-workflow, the shim calls the control plane. The control plane looks up the
   workflow, applies the caller policy and the credential checks, and returns the graph.
   The engine then starts the child itself as it processes the step result. Starting it in
   the engine keeps admittance and the parent link in one place.
6. **Suspend before start.** The engine suspends the parent step before it starts the
   child, so the child cannot end before the parent can resume. When the start fails,
   reconciliation recovers the waiting step.
7. **The child returns all its terminal branches, concatenated.** The branches are ordered
   as engine v1 orders execution, by canvas position from top to bottom, and then by run.
   Engine v1 returns the output of the last node that ran. This is a breaking change for a
   child with several end branches. We may revisit this decision when we look at backwards
   compatible execution order in https://linear.app/n8n/issue/CET-460.
8. **Cancellation cascades.** Cancelling a parent cancels its children, awaited or not. A
   timeout that ends the parent does the same, once engine v2 has timeouts. We may later
   introduce a sub-workflow execution mode that detaches the child fully from the parent.
9. **Dropped or postponed features.** The "run once for each item" mode and the inline,
   local file and URL sources are refused. v1-v2 cross-engine sub-workflow executions are
   not supported.

## Alternatives Considered

- **The control plane starts the child.** Rejected. The child starts before the parent step
  is suspended, and the data plane asks the control plane to start an execution in the data
  plane.
- **A native step type that the converter builds.** The converter cannot resolve the
  expressions that choose the workflow. The option stays available for a static native node
  later.
- **Shape the resumed output in the shim, without running the node.** Keeps the wait ADR's
  rule intact. Rejected because the shim would carry a copy of the node's output shaping,
  for every node version, and keep it in step with the node.
- **Keep the v1 result rule.** Which branch wins depends on execution order. Concatenation
  is deterministic. We may revisit this if we find that the breaking change blocks adoption.
- **Implement a 2-phase suspend/resume.** This would let us avoid re-invoking the `execute`
  method. We will do this as a follow-up, but we defer for now to unblock the remainder of
  the sub-workflow work.

## Consequences

- The wait ADR's rule that the engine never runs the node's execute method again holds
  for deadline and request resumes only.
- A caller with side effects before its `executeWorkflow` call cannot have its node run
  again. The AI Agent tools need their own design (CET-291).
- The child row carries a parent link that the engine alone sets. The read path can show
  parent and sub-execution links.
- A parent that awaits a child reports `waiting`. Engine v1 reports `running`.
- Fire-and-forget children stop with the parent. Engine v1 lets them run on.
- Reconciliation repairs a waiting step whose child never started, and an ended child whose
  parent still waits.
- Engine v2 has no timeout yet, so a child outlives a parent that v1 would have timed out.
  When we implement timeouts, they will cascade.

## Links

RFC: -

Documentation: https://app.notion.com/p/n8n/Engine-v2-Sub-workflows-3ff5b6e0c94f80219bbaed7bcf2453fd

Related ADRs: ADR-20260902-steps-declare-waits, ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution, ADR-20260828-obtain-trigger-output-before-creating-the-execution
