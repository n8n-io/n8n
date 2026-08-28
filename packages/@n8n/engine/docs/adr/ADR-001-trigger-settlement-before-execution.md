# ADR-001: Settle the trigger before the execution starts

Date: 2026-08-28
Status: Active
Decision Owner: Catalysts

## Context

The engine takes the trigger's output in the start request and records the
trigger as an already completed step. It runs no trigger code. v1 does this only
for production executions. For manual executions v1 runs the trigger inside the
graph traversal.


## Decision

We settle the trigger before we create the execution, outside the engine. The
caller runs the trigger and passes its output to the engine. This applies to
every mode, manual executions from the UI included.


## Alternatives Considered

- **Run the trigger in the engine for manual mode, as v1 does.** Gives the
  engine connections and credentials for one mode only.
- **Run the trigger as a normal step.** A step is one call that returns output.
  A trigger stays open, can emit more than once, and needs teardown.
- **Let the engine pull the output at start.** Adds a callback to the host and
  makes the execution record incomplete.


## Consequences

- The engine core stays free of trigger code, connections and credentials.
- One path for all modes. The trigger is always a completed step at start.
- The control plane must run the trigger first, also for manual runs.
- A failed trigger produces no execution. The caller must report the failure.
- The caller owns teardown after the run or a cancellation.
- Trigger time is outside the execution.


## Links

RFC: -
Implementation: `src/execution/start-execution.service.ts`, `src/execution/execution-start-handler.ts`
Documentation: https://app.notion.com/p/n8n/34b5b6e0c94f81feba4bdb59a65d55dc
Related ADRs: -
