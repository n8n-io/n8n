# ADR-2026-09-02: Steps declare waits; the engine owns suspension and resume

Date: 2026-09-02
Status: Active
Decision Owner: Catalysts

## Context

Workflows pause and resume: time-based waits, waits for a webhook call, and
human-in-the-loop approvals where a node sends a message and waits for a
response. All three are in scope for engine v2.

In the v1 engine, the node drives the pause. Node code calls
`putExecutionToWait`, the engine serializes the whole execution to the
database, and pollers and waiting-webhook routes thaw it later. Around fifteen
node types use this call, including the Wait node and every send-and-wait
node. Their wait parameters are frequently expressions, resolved by the node
at run time.

In engine v2, an execution is step rows advanced by events. A step is one call
that returns output (ADR-2026-08-28); a step executor cannot block for the
wait duration. A pause must therefore be a state of the step row, not a state
of any process.

## Decision

A step execution may return a **wait declaration** instead of outputs. The
declaration states when to resume: at a deadline, on a resume request, or
whichever comes first.

1. **The shim produces the declaration.** v1 node code runs unchanged; the
   shim's execution context translates the node's `putExecutionToWait` call
   into a wait declaration and returns it as the step result. The converter
   does not rewrite wait nodes. One mechanism covers the Wait node, all
   send-and-wait nodes, and expression-valued wait parameters.
2. **The engine suspends the step.** A step that returns a declaration
   transitions to a new `waiting` status. `waiting` is not a settled status:
   planning stalls behind the step by the existing settlement rules, while
   other branches keep executing.
3. **Resume re-dispatches the step.** Resolving a wait transitions the step
   back to `queued` with the resume payload stored on the row. The step
   re-enters the normal worker path. On a channel resume the shim runs the
   node's resume method with the payload; on a deadline resume it emits the
   outputs captured in the declaration (the node's pass-through output,
   matching v1). It never re-runs the node's execute method. Nothing
   completes a waiting step directly.
4. **An engine-internal sweep fires time waits.** A periodic scan resumes
   waiting steps whose deadline has passed, using the same status-conditioned
   update as every other transition. Only the firing mechanism is
   sweep-specific; the step row carries the deadline regardless.
5. **Resume requests arrive on an always-accepting control-plane route.** The
   resume URL carries the execution id and a signed action token. The control
   plane forwards the request to the data-plane resolve endpoint; the data
   plane verifies the token and validates the request against the waiting
   step. The engine does not register wait channels with the control plane.
6. **The execution reports a derived `waiting` status** when at least one step
   is waiting and no step is running or runnable, and `running` otherwise. The
   status is recomputed on step transitions. A new `step:waiting` lifecycle
   event surfaces the paused step to the UI.

## Alternatives Considered

- **Translate the v1 Wait node into a declarative wait step at conversion
  time.** Conversion runs before execution, so expression-valued parameters
  cannot be resolved, and send-and-wait nodes cannot be translated at all —
  the message send is node logic. Remains available later for static
  configurations and native wait nodes; it requires this ADR's mechanism
  either way.
- **Complete the waiting step directly from the resolver.** Skips the node's
  resume code. Approval parsing, form handling, and response validation live
  there; only pure time waits would be correct.
- **Fire time waits through `@n8n/scheduler`.** The right primitive
  (`OneOffSchedule`), deferred until the sweep's observed requirements justify
  a data-plane task-store adapter. The swap is confined to the firing
  mechanism.
- **Delegate time waits to the control plane.** Breaks standalone mode and
  adds cross-plane round-trips for a timer the data plane can fire against its
  own database.
- **Register wait channels with the control plane at suspension.** Adds a
  cross-plane API, a deregistration lifecycle for every cancel and timeout
  path, and a second copy of wait state to keep consistent. The always-open
  route keeps the data plane the single source of truth.

## Consequences

- The engine core stays free of v1 concepts. Wait knowledge enters through
  the step result contract at the executor seam.
- The wait declaration is a contract between the engine and the shim. It is
  not a public node-author contract; exposing it to node authors is a
  separate, later decision.
- Nothing in the graph marks a step as a wait; the engine learns of a wait
  only when the step runs. Start-time checks that depend on knowing about
  waits (for example, refusing waits in lightweight mode) are not possible
  without a converter-side hint.
- A waiting step does not settle. Execution completion accounting must treat
  it as expected but pending.
- The resume payload is part of the step row and is subject to the same size
  handling as step outputs.
- A resolve request can arrive before the step's suspension is recorded. The
  resolve path must handle this window rather than reject the request
  outright.
- Timer resolution equals the sweep interval. v1 resolves waits on a
  60-second poll, so parity holds.
- Short waits become durable. v1 sleeps in-process below 65 seconds; v2
  suspends every wait, which changes timing characteristics for short waits.
- The control plane maps the new status to v1's `waiting`, keeping the
  executions list and its filter behavior. An execution with one waiting
  branch and one executing branch reports `running`.
- Send-and-wait nodes need credentials in v2 before they work end to end
  (CAT-2880). Time and webhook waits do not.
- A wait can outlive the control-plane state it started with: the workflow may
  be moved, a credential unshared, access revoked. The resume path reads no
  control-plane state, so it cannot detect any of this. Whether a resume should
  be refused on those grounds is a product decision, and taking it would need a
  cross-plane check this design does not have.
- Waiting executions must be excluded from data-plane pruning. A paused
  execution is indistinguishable by age from a finished one, and pruning it
  destroys a workflow mid-run.
- The Wait node's `specificTime` mode resolves its target against the
  workflow's timezone, which the shim does not yet receive, so it resolves in
  the default zone instead. Durations are unaffected. The gap closes when
  workflow settings reach the data plane.

## Links

RFC: https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc (§3.3)
Tickets: CAT-2881, CAT-2927, CAT-2928, CAT-2929
Related ADRs: ADR-2026-08-28-trigger-settlement-before-execution,
ADR-2026-09-04-resume-urls-carry-a-derived-token,
ADR-2026-09-04-timeout-excludes-waiting-time
