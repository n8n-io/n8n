# Run sub-workflows as child executions

Date: 2026-10-20

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-292

## Context

In engine v1 the Execute Sub-workflow node asks the control plane to run the child. The
control plane loads the workflow, checks the caller policy and the credentials, and runs it.
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

1. **A sub-workflow call is a wait.** The engine suspends the step before it starts the
   child and resumes it when the child ends, as it suspends and resumes a waiting step
   (ADR-20260902-steps-declare-waits). The step does not declare a wait. It asks for a
   child, and the engine suspends it on that child. A fire-and-forget call does not suspend,
   but the child still records its parent.
2. **The resume runs the node's execute method again.** When the child ends, the engine
   dispatches the step to the executor once more. The node runs from the start, and its
   `executeWorkflow` call returns the child's result instead of asking for a child. The code
   after that call is what shapes the node's output: paired items, the sub-execution
   metadata, `continueOnFail`, and the error output per node version. On engine v2 that
   code cannot run in the dispatch that made the call, because a step returns before the
   child runs. Running the node again keeps its behaviour without a copy of it in the shim.
   It is safe for the Execute Sub-workflow node because its work before the call has no
   side effect, and it holds for that node only. The second run re-evaluates expressions,
   so the shim answers the call from the recorded child whatever the node asks for this
   time: an expression that resolves differently cannot start another child, it can only
   mislabel the one that ran. This supersedes, for a child resume, the
   wait ADR's rule that the engine never runs the node's execute method again; the rule
   stands for deadline and request resumes, and that ADR stays as written. A later change
   to the node interface can split the node into a call phase and a resume phase, as the
   Wait node has for a request, and then the second run goes.
3. **The control plane resolves the child, and the engine starts it.** When a node asks
   for a sub-workflow, the shim calls the control plane. The control plane looks up the
   workflow, applies the caller policy and the credential checks, and returns the graph.
   The engine then starts the child itself as it processes the step result. Starting it in
   the engine keeps admittance and the parent link in one place.
4. **Suspend before start.** The engine suspends the parent step before it starts the
   child, so the child cannot end before the parent can resume. When the start fails,
   reconciliation recovers the waiting step.
5. **The child returns all its terminal branches, concatenated.** The branches are ordered
   as engine v1 orders execution, by canvas position from top to bottom, and then by run.
   Engine v1 returns the output of the last node that ran. This is a breaking change for a
   child with several end branches.
6. **Cancellation cascades.** Cancelling a parent cancels its children, awaited or not. A
   timeout that ends the parent does the same, once engine v2 has timeouts.
7. **Dropped features.** The "run once for each item" mode and the inline, local file and
   URL sources are refused. A v2 parent calls v2 children only.

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
  is deterministic.

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

## Links

RFC: -

Documentation: https://app.notion.com/p/n8n/Engine-v2-Sub-workflows-3ff5b6e0c94f80219bbaed7bcf2453fd

Related ADRs: ADR-20260902-steps-declare-waits, ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution, ADR-20260828-obtain-trigger-output-before-creating-the-execution
