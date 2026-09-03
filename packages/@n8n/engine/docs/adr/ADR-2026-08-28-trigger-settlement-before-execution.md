# ADR-2026-08-28: Obtain trigger output before creating the execution

Date: 2026-08-28
Status: Active
Decision Owner: Catalysts

## Context

Triggers are the entrypoints to workflow executions. Workflow executions
start with the trigger output, and execution flows onwards along the workflow
graph. Triggers can be executed both manually by a user, or on the background
for production executions.

The v1 engine runs triggers during manual executions as part of the graph
traversal, and production executions before the graph traversal starts.

In this ADR, a settled trigger means that the caller has received the emission
that starts the execution. It does not mean that the engine has already created
the completed trigger step.

## Decision

In engine v2, all triggers are to be executed outside the engine.
Engine v2 receives the trigger output as part of the execution requests.
This applies to all modes.

The engine creates the execution and then records a completed trigger step from
the supplied output. It does this before it plans any successor steps.

## Alternatives Considered

- **Run the trigger in the engine for manual mode, as v1 does.** This gives the
  engine connections and credentials for one mode only.
- **Run the trigger as a normal step.** A step is one call that returns output.
  A trigger stays open, can emit more than once, and needs teardown.
- **Let the engine pull the output at start.** This adds a callback to the host
  and makes the execution record incomplete.

## Consequences

- The engine core stays free of trigger code, connections and credentials.
- One path applies to all modes. The trigger is completed before the engine
  plans its successors.
- The control plane owns the pre-execution trigger attempt for manual runs. It
  must let the UI cancel this attempt before an execution ID exists.
- A failed or cancelled trigger produces no execution. The caller must report
  the outcome and release resources for the manual trigger attempt.
- A successful trigger can still produce no execution if graph validation or
  admittance rejects the start request. The caller must report the rejection
  and release resources for the manual trigger attempt.
- The caller owns teardown for a manual trigger attempt. It must start teardown
  after the first emission, a trigger failure or cancellation, or a rejected
  start request. A trigger can defer cleanup until the execution acknowledges
  its emission.
- A production trigger remains open across emissions and executions. The caller
  tears it down only when the workflow is deactivated or the trigger host stops.
- Trigger time is outside the execution.

## Links

RFC: -
Documentation: https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc
Related ADRs: -
