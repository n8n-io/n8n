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

Send-and-wait nodes also need credentials (CAT-2880). Time waits and webhook
waits need none.

In engine v2, an execution is a set of step rows. Events move each row from one
status to the next. A step is one call that returns output
(ADR-20260828-trigger-settlement-before-execution). Therefore a step executor
cannot stay blocked for the length of the wait. A pause must be a status of the
step row. It must not be a state of a process.

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
6. **The execution stores a `waiting` status.** An execution reports `waiting`
   when every step it still owes is suspended. It reports `running` when one of
   its steps can still run. The step rows decide the status, and the execution
   row records it. After a step changes state, the engine calculates the status
   from the steps again. A new `step:waiting` lifecycle event shows the paused
   step in the UI.

## How the design doc's model maps onto this one

The detailed design, §3.3, sketches a `WaitStepConfig` with an `until` of four
kinds, an optional `action`, and a `timeout`. This ADR keeps the intent and needs fewer
parts. The mapping matters, because the doc is what the team reviewed.

- **`duration` and `timestamp` both become a deadline.** The shim resolves a
  duration to an absolute instant, because v1 gives it a `Date` and not a
  length of time. One field, `resumeAt`, covers both kinds.
- **`webhook` and `signal` both become a resume request.** In the doc they
  differ by who registers the wait: a webhook registers a path with the control
  plane, and a signal hands out an opaque token. Decision 5 registers nothing,
  so the difference disappears. Every resume request reaches the same resolve
  endpoint with the execution id and a signed token. The kind of caller changes
  the payload only. A webhook client, a form, and a person who approves a
  message all reach the same endpoint. The resume method of the node reads the
  payload.
- **`action` is not needed.** In the doc, the engine performs the action, so the
  engine needs a vocabulary of actions to perform. Decision 1 runs the node's
  own code instead, and that code already sends the message. The doc calls the
  `WaitAction` set the largest open question in the design. This decision
  removes the question. It does not answer it.
- **`timeout` becomes a deadline with a resume request.** A declaration can
  carry both, and then the first of the two ends the wait. One behaviour does
  change: the doc makes a timeout fail the step, and this ADR emits the
  captured outputs instead. Engine v1 continues past an expired wait limit, so
  a failure would be a new behaviour, not a preserved one.

The `wait` step type in the graph stays unused. A wait now enters through the
step result contract, so no node needs to convert to a different step type.

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
- **Delegate the time waits to the control plane.** This option breaks
  standalone mode. It also adds cross-plane requests for a timer that the data
  plane can fire against its own database.
- **Derive the `waiting` status on read.** This option stores nothing and
  cannot go stale. Every list query must then join the step rows to learn the
  status of each execution. `queued` and `running` are stored, so this option
  also makes `waiting` the one status a reader computes for itself.
- **Register the wait channels with the control plane at suspension.** This
  option adds a cross-plane API. It also adds a deregistration step to every
  cancel path and every timeout path. It keeps a second copy of the wait state.
  A route that always accepts requests keeps the wait state in the data plane
  only.

## Consequences

- The engine core holds no v1 concepts. Wait knowledge enters through the step
  result contract at the executor seam.
- The wait declaration is a contract between the engine and the shim. It is not
  a contract for node authors. A later and separate decision can make it one.
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
- A time wait under 65 seconds does not reach the engine. The Wait node sleeps
  in the process for those waits and then returns normally. The shim runs that
  node code unchanged, so the engine never sees a declaration. Node-level
  waiting stays node behaviour. The floor applies to the `timeInterval` and
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
- The control plane maps the new status to the `waiting` status of v1. The
  executions list and its filters continue to work. An execution with one
  waiting branch and one running branch reports `running`.
- A wait can outlive the control-plane state that it started with. A user can
  move the workflow, unshare a credential, or remove access. The resume path
  reads no control-plane state, so it cannot detect these changes. Whether a
  resume must fail for these reasons is a product decision. To apply that
  decision, the engine needs a cross-plane check. This design has no such
  check.
- Data-plane pruning must exclude the waiting executions. By age, a paused
  execution looks the same as a finished one. If the engine prunes a paused
  execution, it destroys a workflow run.
- The `specificTime` mode of the Wait node resolves its target time in the
  timezone of the workflow. The shim does not receive that timezone, so the mode
  resolves the time in the default timezone. This does not affect durations. The
  execution row now holds a workflow snapshot
  (ADR-20260904-store-the-workflow-with-the-execution), so the data is in the
  data plane. The gap closes when the executor request carries the settings from
  that snapshot.

## Links

RFC: -
Documentation: Engine 2.0 — Detailed Design, §3.3
https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc
Tickets: CAT-2881, CAT-2927, CAT-2928, CAT-2929
Related ADRs: ADR-20260828-trigger-settlement-before-execution,
ADR-20260904-store-the-workflow-with-the-execution,
ADR-20260904-resume-urls-carry-a-derived-token
