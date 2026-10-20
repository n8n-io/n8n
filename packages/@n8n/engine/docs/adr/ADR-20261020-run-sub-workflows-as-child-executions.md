# Run sub-workflows as child executions

Date: 2026-10-20

Status: Active

Decision Owner: Catalysts

Source: https://linear.app/n8n/issue/CET-292

## Context

The Execute Sub-workflow node calls `executeWorkflow` on its execution context. In engine v1
the control plane loads the child workflow, checks the caller policy and the credential
permissions, and runs the child. With "wait for completion" on, the parent parks on a sentinel
date and the child's completion patches the parent and resumes it. With it off, the call
returns the child id at once. The child's result is the output of the last node that ran.

Engine v2 has none of this. The shim marks `executeWorkflow` unimplemented and fails a step
that waits on the sub-execution sentinel. ADR-20260902-steps-declare-waits left the pause out
of scope. ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution notes that the
data plane cannot build a graph, so the control plane must produce it.

Four constraints shape the design:

1.  The engine holds no v1 concepts. It cannot load a workflow or evaluate an expression, and
   the node decides which workflow to call at run time.
2.  The caller policy and the credential checks read control-plane state and stay there.
3.  A step is one call that returns
   (ADR-20260828-obtain-trigger-output-before-creating-the-execution). A step cannot block
   for the length of a child run.
4.  The product plan limits the first slice. Only "run once for all items" is supported. Only
   the database source is supported. Cancellation reaches the children in both modes. A child
   with several end branches returns all of them.

## Decision

1.  **A spawn is a step result.** `StepExecutionResult` gains a variant for an awaited child.
   A completing result can also carry detached spawns next to its outputs. A spawn names the
   child execution id, which the producer mints, the workflow id, the graph, the workflow
   document, and the trigger outputs. An awaited spawn stands alone, because it suspends the
   step. Detached spawns ride on outputs, so a fire-and-forget node reports the child id in its
   items as it does on v1.
2.  **The control plane resolves. The engine starts.** The shim's `executeWorkflow` calls a
   resolve endpoint on the control plane, modelled on credential resolution. The endpoint picks
   the revision by the v1 rule (draft for manual and chat runs, published otherwise), runs the
   caller policy and credential checks, refuses local file, URL and inline sources, runs the
   Execute Workflow Trigger's input mapping to shape the trigger outputs, converts the
   workflow, and returns the contents of the spawn. It starts nothing. The engine starts the
   child through its own `StartExecutionService`, so validation, admittance and the parent
   link apply in one place. The step worker calls the service directly. If admittance later
   needs state that cannot live on a worker, the worker calls the start API instead.
3.  **Suspend before start.** On an awaited spawn the step-ready handler moves the step to
   `waiting` with a child condition first, then starts the child. The child cannot complete
   before the parent step can be resumed. A crash between the two writes leaves a waiting step
   whose child row does not exist. Reconciliation fails that step. The step row does not carry
   the graph.
4.  **The child row links to its parent.** The execution row gains the parent execution id,
   the parent step id, and whether the parent awaits the child. Only the engine's start path
   sets the link. The HTTP start route does not accept one, so no caller outside the engine
   can claim a parent. The child inherits the parent's mode and caller context. The response
   expectation does not transfer: a child never answers the parent's webhook.
5.  **The child's completion resumes the parent.** The branch that wins the child's
   `finishExecution` compare-and-set reads the parent link. For an awaited child it builds the
   child result, moves the parent step from `waiting` to `queued` with a child resume cause
   (`{ kind: 'child', executionId, status, result }`), and publishes `step:ready`. Nothing
   polls and nothing watches the children. A waiting step is owed but not settled, so the
   existing rules neither plan behind it nor finish the parent past it.
6.  **A child resume runs the node again.** A deadline or request resume emits recorded
   outputs and runs no node code. A child resume dispatches the step to the executor with the
   resume cause attached. The node runs again. When it calls `executeWorkflow`, the shim
   returns the recorded child result instead of resolving a new spawn. The node's own code
   shapes the output: paired items, `metadata.subExecution`, `continueOnFail`, and the error
   output per node version. The code the node runs before the call reads parameters and
   resolves expressions, and has no side effect worth protecting. A failed or cancelled child
   surfaces as an error from `executeWorkflow`, so the node's error handling applies as on v1.
7.  **The child result is the output of its terminal steps.** The engine collects the output
   slots of every completed step whose node has no outgoing edge, in graph order and then by
   iteration, and concatenates them per slot. v1 returns the runs of the last node that
   executed. When one terminal branch fires, the two rules agree. When several fire, v2
   returns all of them. This is a deliberate change, because the v1 rule depends on execution
   order. The result keeps each terminal step's items apart, so the shim can apply the
   trigger's "last run only" option when it shapes the output.
8.  **Cancellation cascades.** `CancelExecutionService.cancel` cancels every live child
   through the parent link, awaited or detached. A parent that fails cancels its children too.
   A child cancelled on its own resumes its awaiting parent with status `cancelled`, and the
   step fails. A fire-and-forget child therefore stops with its parent, which it does not do
   on v1. Engine v2 has no execution timeout yet. When one ends the parent as cancelled, the
   cascade covers it, and replaces v1's rule that a child's deadline is the earlier of the
   parent's and its own.
9.  **Refusals.** The "run once for each item" mode and the inline, local file and URL sources
   fail the step with a clear error. The v3 migration moves the "each" mode to Loop Over
   Items. A child whose settings do not select engine v2 is refused too. Mixed engines are a
   fast-follow.

```mermaid
sequenceDiagram
    participant S as Shim (step worker)
    participant R as Resolve endpoint (control plane)
    participant E as Engine
    participant C as Child execution
    S->>R: resolve(workflow id, inputs, parent context)
    R-->>S: graph, workflow, trigger outputs
    S->>E: step result { spawn }
    E->>E: suspend parent step (running -> waiting)
    E->>C: start with parent link
    C->>C: runs; terminal steps settle
    C->>E: finishExecution wins
    E->>E: resume parent step with child cause (waiting -> queued)
    E->>S: step:ready, node runs again
    S->>S: executeWorkflow returns the recorded result
    S->>E: step result { outputs }
```

## Alternatives Considered

1.  **The control plane starts the child.** The shim asks the control plane, which resolves
   the child and calls the engine's start route with a parent link. Rejected. The child
   starts before the parent step is suspended, so the resume must handle a child that has
   already ended. The start route must accept a parent link from any control-plane caller.
   And the data plane asks the control plane to start an execution in the data plane, which
   is two hops for one start.
2.  **A native `subworkflow` step type that the converter builds.** The converter runs before
   execution and cannot resolve expression-valued parameters, such as which workflow to call.
   The option stays available for a static native node later, on top of this mechanism.
3.  **Shape the resumed output in the shim without running the node.** This keeps the wait
   ADR's rule that no node code runs on a resume. Rejected because the shim would
   re-implement the node's per-version output shaping, paired items, `continueOnFail` and
   error output, and keep them in sync with the node.
4.  **Resume the parent from the control plane, as the v1 wait tracker does.** The control
   plane would have to watch child completions, and lifecycle events are best effort. It would
   also hold a copy of the wait state, which the wait ADR avoids.
5.  **The shim blocks until the child ends.** Rejected by the wait ADR. A pause is a status of
   a row, not a state of a process.

## Consequences

- The wait ADR's rule that no node code runs on a resume now holds for deadline and request
  resumes only. A child resume runs the node again, and the shim must answer `executeWorkflow`
  from the recorded result on that pass.
- The step result contract carries a graph and a workflow document. They get the same size
  handling as step outputs.
- The parent link costs three columns and two indexes. The read path can report parent and
  sub-execution links from the row, and the executions list can filter by parent.
- A parent that awaits a child reports `waiting`, as it does for any suspended step. v1 reports
  `running`, because the child runs inside the parent. The control-plane reader can map it
  back if the product prefers.
- A waiting parent holds no worker. v1 holds the parent's slot for the length of the child.
- Standalone mode tests the whole primitive with a fake executor that returns a spawn with an
  inline graph. The resolve endpoint is needed in integrated mode only.
- Reconciliation gets two windows to repair: a waiting step with a child condition and no child
  row, and an ended awaited child whose parent step still waits.
- The node's `getExecutionDataById` reads the child's run data to trace paired items through
  the child. The data plane has no v1 run data for a child yet, so paired items fall back to
  index matching until the shim can read a child's steps.
- Engine v2 has no execution timeout. Until it exists, a child outlives a parent that v1 would
  have timed out.
- The AI Agent "Call n8n Workflow" tool and the retriever call the same `executeWorkflow`
  helper, so they inherit the mechanism. Their outputs are not covered here.

## Links

RFC: -

Documentation: https://app.notion.com/p/n8n/Engine-v2-Sub-workflows-3ff5b6e0c94f80219bbaed7bcf2453fd

Related ADRs: ADR-20260902-steps-declare-waits, ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution, ADR-20260828-obtain-trigger-output-before-creating-the-execution
