# Steps declare waits; the engine owns suspension and resume

Date: 2026-09-02
Status: Active
Decision Owner: Catalysts

## Context

Workflows can pause and then resume. Two things end a pause. A deadline ends a
time-based wait. An incoming request ends a webhook wait, a form wait, or a
human-in-the-loop approval. An approval differs by sending a message first, not
by how it resumes. Engine v2 must support both.

A third kind of pause ends by neither. A parent execution that waits for a
sub-workflow parks on a sentinel date that the poller never fires, and the
child's completion resumes it. That pause is out of scope here, because a
sub-workflow is its own step type.

In engine v1, the node starts the pause. The node calls `putExecutionToWait`.
The engine then writes the full execution to the database. A poller or a
waiting-webhook route reads the execution again later. Approximately fifteen
node types call `putExecutionToWait`. They include the Wait node and all
send-and-wait nodes. Their wait parameters are frequently expressions. The node
resolves those expressions at run time.

Send-and-wait nodes need credentials to send their message (CAT-2880). A
webhook wait can need them too: the Wait node accepts basic or header
authentication on the resume request. A time wait needs none.

In engine v2, an execution is a set of step rows. Events move each row from one
status to the next. A step is one call that returns output
(ADR-20260828-trigger-settlement-before-execution). Therefore a step executor
cannot stay blocked for the length of a wait that reaches the engine. A pause
must be a status of the step row. It must not be a state of a process. A wait
that the Wait node sleeps through never reaches the engine, and stays a state of
a process for that reason.

## Decision

A step execution can return a **wait declaration** in place of outputs. The
declaration tells the engine when to resume the step. A declaration can name a
deadline, or accept a resume request, or do both. When it does both, the first
of the two ends the wait.

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
   `queued`. The engine records what ended the wait on the row, with the
   payload when a request ended it. The step then takes the normal worker path.
   For a deadline resume, the engine emits what the declaration captured in
   `outputsAtDeadline`. The Wait node returns its input unchanged, so those
   outputs are the step's input passed through, as in v1. Engine v1 also
   continues past an expired wait limit, and the node offers no setting that
   fails instead. For a request resume, the control plane runs the node's
   resume method, because that method reads the request and writes the
   response, and it must answer inside the request. A re-dispatch through the
   queue answers too late. The control plane sends what the method produced to
   the data plane, which records it as the resume payload and moves the step to
   `queued`. The worker that takes the step emits that payload as the step's
   outputs. The engine never runs the node's execute method again. No component
   completes a waiting step directly.
4. **An engine-internal sweep fires the time waits.** The sweep resumes the
   waiting steps whose deadline has passed, with the same status-conditioned
   update that every other transition uses. It selects no deadline that is still
   in the future. A wait still fires at its deadline, because the sweep sleeps
   until the earliest deadline it can see rather than to the end of a fixed
   interval. The step row holds the deadline in every case, so only the firing
   belongs to the sweep, and another mechanism could replace the sweep without
   moving the deadline off the row.
5. **A waiting step is discoverable from its own row.** The control plane keeps
   no copy of the wait state, and it needs no endpoint to register a pause
   with. A resume request therefore reaches a data-plane endpoint that always
   accepts it, and the data plane validates the request against the waiting
   step. How a request authorizes itself is a separate decision.
6. **The execution stores a `waiting` status.** An execution reports `waiting`
   when every step it still owes is suspended. It reports `running` when one of
   its steps can still run. The step rows decide the status, and the execution
   row records it. After a step changes state, the engine calculates the status
   from the steps again. A new `step:waiting` lifecycle event shows the paused
   step in the UI.

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
  correct primitive. It needs a task store in the data plane. We defer that
  adapter until the sweep shows that we need it. The change stays inside the
  firing mechanism.
- **Delegate the time waits to the control plane.** Standalone mode has no
  control plane, so a timer that lives there leaves an engine that cannot fire
  a time wait at all. This package's own integration tests run that way. The
  option also adds cross-plane requests for a timer that the data plane can
  fire against its own database.
- **Derive the `waiting` status on read.** This option stores nothing and
  cannot go stale. Every list query must then join the step rows to learn the
  status of each execution. `queued` and `running` are stored, so this option
  also makes `waiting` the one status a reader computes for itself.
- **Register the wait channels with the control plane at suspension.** This
  option adds a cross-plane API. It also adds a deregistration step to every
  cancel path and every timeout path. It keeps a second copy of the wait state.
  It widens the window in which a resume request arrives too early: the window
  closes when the registration call returns rather than when the step row is
  written, and a control plane that does not hold the channel yet has to refuse
  the request. A route that always accepts requests keeps the wait state in the
  data plane only, and leaves that window to the resolve path.

## Consequences

- The engine core holds no v1 concepts. Wait knowledge enters through the step
  result contract at the executor seam.
- The wait declaration is a contract between the engine and the shim. It is not
  a contract for node authors. A later and separate decision can make it one.
- The graph does not mark a step as a wait. The engine learns about a wait only
  when the step runs. Therefore the engine cannot make start-time checks that
  need this knowledge. For example, it cannot refuse a wait in a mode that
  cannot hold one, such as a lightweight mode that keeps the step state in
  memory. To refuse one, the converter must mark the step, and what that mark
  looks like is a later decision. Nothing needs it until a mode that cannot
  hold a wait exists.
- The graph's step types include `wait`, and nothing builds one. A wait enters
  through the step result contract instead, so the converter never turns a node
  into a different step type.
- The node's resume method runs on the control plane, so its credentials
  resolve there. A Wait node that authenticates a resume request needs nothing
  from credential support in the data plane.
- A waiting step does not settle. The completion count must treat the step as
  expected but not yet settled, or the execution finishes while a step still
  owes an outcome. The planning rules read the same status, so a waiting step
  counted as settled would also let the steps behind it run.
- The step row holds the resume payload. The payload gets the same size
  handling as the step outputs.
- A resolve request can arrive before the engine records the suspension. The
  resolve path must handle this window. It must not refuse the request.
- A time wait under 65 seconds does not reach the engine. The Wait node sleeps
  in the process for those waits and then returns normally. The shim runs that
  node code unchanged, so the engine never sees a declaration. The engine
  therefore cannot make such a wait durable, cancel it, or report it: to the
  engine the step is only slow. Those waits behave on engine v2 exactly as they
  do on engine v1, including being lost if the worker stops while one sleeps.
  That 65-second minimum is the floor, and it applies to the `timeInterval` and
  `specificTime` modes only. A `webhook` wait and a `form` wait return earlier
  in the node, and no floor applies to them.
- A wait with a `limitWaitTime` can fire up to one sweep interval after its
  limit. That parameter has no minimum. The limit can therefore fall due before
  the next pass of the sweep, and the sweep finds it on that pass. Every other
  wait fires at its deadline. The sweep schedules its next pass from the
  earliest deadline it can see, and a `timeInterval` or `specificTime` wait
  that reaches the engine is at least 65 seconds out. Engine v1 is late for the
  same waits and for no others. The same node path sets `waitTill` with no
  floor, and the 60-second poll of v1 cannot adapt to it. Parity is the bar
  here, so the engine keeps the same bound and not a shorter interval.
- A wait that sleeps in the process ignores execution cancellation. The node
  registers a handler through `onExecutionCancellation`, which needs an abort
  signal that the shim does not supply yet (CAT-4526). Nothing observes this
  until an execution can be cancelled (CAT-3990).
- One statement must calculate the status of the execution and write it. Two
  statements are not enough. A step could change between the read and the
  write. The write would then store the older status.
- `running` and `waiting` are both live statuses. Only an execution that ended
  stops a step transition. A waiting execution continues when one of its steps
  runs again, so the engine must let that step run. The execution keeps the
  `waiting` status until the resumed step settles.
- The executions list and its filters continue to work, because the new status
  has a v1 counterpart to map onto. An execution with one waiting branch and
  one running branch reports `running`.
- A wait can outlive the control-plane state that it started with. A user can
  move the workflow, unshare a credential, or remove access. The unshared
  credential matters once a resumed step can use one, which is CAT-2880. The
  resume path reads no control-plane state, so it cannot detect these changes.
  Whether a resume must fail for these reasons is a product decision. To apply
  that decision, the engine needs a cross-plane check. This design has no such
  check.
- The executor request carries the workflow settings that a node needs to
  resolve its parameters. The `specificTime` mode of the Wait node resolves its
  target time in the timezone of the workflow. The node converts it and hands
  over an absolute instant, so nothing in the data plane converts a time, and
  durations are not affected. The execution row holds a workflow snapshot
  (ADR-20260904-store-the-workflow-with-the-execution), but the execution path
  does not read that document, so the settings travel as their own field. Until
  the shim work carries them, the node falls back to the default timezone and
  the instant it produces is wrong by that offset.

## Links

RFC: -
Documentation: Engine 2.0 — Detailed Design, §3.3
https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc
Tickets: CAT-2881, CAT-2927, CAT-2928, CAT-2929
Related ADRs: ADR-20260828-trigger-settlement-before-execution,
ADR-20260904-store-the-workflow-with-the-execution
