# Steps declare waits; the engine owns suspension and resume

Date: 2026-09-02
Status: Active
Decision Owner: Catalysts

## Context

Workflows can pause and then resume. There are three kinds of pause. A
time-based wait ends at a given time. A webhook wait ends when a caller sends a
request. A human-in-the-loop approval sends a message and then waits for a
response. Engine v2 must support all three kinds.

In engine v1, the node starts the pause. The node calls `putExecutionToWait`.
The engine then writes the full execution to the database. A poller or a
waiting-webhook route reads the execution again later. Approximately fifteen
node types call `putExecutionToWait`. They include the Wait node and all
send-and-wait nodes. Their wait parameters are frequently expressions. The node
resolves those expressions at run time.

In engine v2, an execution is a set of step rows. Events move each row from one
status to the next. A step is one call that returns output (ADR-20260828).
Therefore a step executor cannot stay blocked for the length of the wait. A
pause must be a status of the step row. It must not be a state of a process.

## Decision

A step execution can return a **wait declaration** in place of outputs. The
declaration tells the engine when to resume the step. A declaration can name a
deadline, or accept a resume request, or do both.

1. **The shim produces the declaration.** The v1 node code does not change. The
   shim's execution context receives the node's `putExecutionToWait` call. The
   shim translates the call into a wait declaration. The shim returns the
   declaration as the step result. The converter does not rewrite wait nodes.
   This one mechanism covers the Wait node, all send-and-wait nodes, and
   expression-valued wait parameters.
2. **The engine suspends the step.** A step that returns a declaration moves to
   the new `waiting` status. `waiting` is not a settled status. Therefore the
   existing settlement rules stop the engine from planning the steps behind it.
   The steps in other branches continue to run.
3. **A resume re-dispatches the step.** A resume moves the step back to
   `queued`. The engine stores the resume payload on the row. The step then
   takes the normal worker path. For a channel resume, the shim runs the node's
   resume method with the payload. For a deadline resume, the engine emits the
   outputs that the declaration holds. Those outputs are the node's pass-through
   output, as in v1. The engine never runs the node's execute method again. No
   component completes a waiting step directly.
4. **An engine-internal sweep fires the time waits.** A periodic scan finds the
   waiting steps whose deadline is in the past. The scan resumes them with the
   same status-conditioned update that every other transition uses. Only the
   firing mechanism belongs to the sweep. The step row holds the deadline in all
   cases.
5. **Resume requests arrive on a control-plane route that always accepts them.**
   The resume URL holds the execution id and a signed resume token
   (ADR-20260904-resume-urls-carry-a-derived-token). The control plane sends the
   request to the data-plane resolve endpoint. The data plane verifies the
   token. The data plane then validates the request against the waiting step.
   The engine does not register wait channels with the control plane.
6. **The execution reports a derived `waiting` status.** The execution reports
   `waiting` when one or more of its steps wait, and no step runs or can run. In
   all other cases the execution reports `running`. The engine calculates the
   status again at each step transition. A new `step:waiting` lifecycle event
   shows the paused step in the UI.

## Alternatives Considered

- **Translate the v1 Wait node into a declarative wait step at conversion
  time.** Conversion runs before execution. Therefore the converter cannot
  resolve expression-valued parameters. It also cannot translate send-and-wait
  nodes at all, because the node code sends the message. This option stays
  available for static configurations and for native wait nodes. It needs the
  mechanism in this ADR in either case.
- **Complete the waiting step directly from the resolver.** This option does
  not run the node's resume code. That code does the approval parsing, the form
  handling, and the response validation. Only a pure time wait would be
  correct.
- **Fire the time waits through `@n8n/scheduler`.** `OneOffSchedule` is the
  correct primitive. We defer it until the observed requirements of the sweep
  justify a data-plane task-store adapter. The change stays inside the firing
  mechanism.
- **Delegate the time waits to the control plane.** This option breaks
  standalone mode. It also adds cross-plane requests for a timer that the data
  plane can fire against its own database.
- **Register the wait channels with the control plane at suspension.** This
  option adds a cross-plane API. It also adds a deregistration step to every
  cancel path and every timeout path. It keeps a second copy of the wait state.
  A route that always accepts requests keeps the wait state in the data plane
  only.

## Consequences

- The engine core holds no v1 concepts. Wait knowledge enters through the step
  result contract at the executor seam.
- The wait declaration is a contract between the engine and the shim. It is not
  a contract for node authors. To make it one is a separate and later decision.
- The graph does not mark a step as a wait. The engine learns about a wait only
  when the step runs. Therefore the engine cannot make start-time checks that
  need this knowledge. For example, it cannot refuse a wait in lightweight mode
  without a hint from the converter.
- A waiting step does not settle. The completion count must treat the step as
  expected but not yet settled.
- The step row holds the resume payload. The payload gets the same size
  handling as the step outputs.
- A resolve request can arrive before the engine records the suspension. The
  resolve path must handle this window. It must not refuse the request.
- The sweep interval sets the timer resolution. Engine v1 resolves waits on a
  60-second poll, so the two are equivalent.
- Short waits become durable. Engine v1 sleeps in the process for a wait below
  65 seconds. Engine v2 suspends every wait. This changes the timing of short
  waits.
- The control plane maps the new status to the `waiting` status of v1. The
  executions list and its filters continue to work. An execution with one
  waiting branch and one running branch reports `running`.
- Send-and-wait nodes need credentials in engine v2 to work end to end
  (CAT-2880). Time waits and webhook waits do not need them.
- A wait can outlive the control-plane state that it started with. A user can
  move the workflow, unshare a credential, or remove access. The resume path
  reads no control-plane state, so it cannot detect these changes. Whether a
  resume must fail for these reasons is a product decision. To apply it needs a
  cross-plane check that this design does not have.
- Data-plane pruning must exclude the waiting executions. By age, a paused
  execution looks the same as a finished one. To prune a paused execution
  destroys a workflow run.
- The `specificTime` mode of the Wait node resolves its target time in the
  timezone of the workflow. The shim does not yet receive that timezone, so the
  mode resolves the time in the default timezone. This does not affect
  durations. The gap closes when the workflow settings reach the data plane.

## Links

RFC: https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc (§3.3)
Tickets: CAT-2881, CAT-2927, CAT-2928, CAT-2929
Related ADRs: ADR-20260828-trigger-settlement-before-execution,
ADR-20260904-resume-urls-carry-a-derived-token,
ADR-20260904-timeout-excludes-waiting-time
