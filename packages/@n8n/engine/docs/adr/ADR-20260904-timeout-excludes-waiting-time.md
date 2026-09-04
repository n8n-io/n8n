# The execution timeout does not run while an execution waits

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

A workflow can have an execution timeout. The timeout stops a running
execution after a given length of time. Engine v2 does not apply timeouts yet.
The value reaches the data plane with the other settings of the workflow.

Waits make the rule unclear for the first time. An approval can stay
unanswered for several weeks. A scheduled wait can name a date several months
in the future. Therefore the answer decides if a user can use a timeout and a
wait in the same workflow.

In engine v1 a user can use both, because a waiting execution does not run.
Engine v1 writes the execution to the database and removes it from the list of
active executions. The poller then starts the execution again when the wait
ends. The timeout applies to each active period. It does not apply to the pause
between two active periods. No one designed this behaviour. It is a result of
the way engine v1 implements a wait.

## Decision

The execution timeout measures the time in which the execution can run. It does
not measure the clock time. Time in which the execution reports the `waiting`
status does not count.

This keeps the behaviour of engine v1. It also makes the timeout do what users
expect. The timeout protects against an execution that cannot make progress. It
does not protect against an execution that a workflow pauses on purpose.

## Alternatives Considered

- **Measure the clock time from the start of the execution.** This option is
  the simplest to implement and to explain. It also makes a timeout
  incompatible with a wait that is longer than the timeout. A workflow with a
  timeout of one hour and a wait of one day could never finish. The result
  would look like a timeout and not like a configuration error.
- **Let the timeout also limit the wait.** This option treats two questions as
  one. The first question is how long an execution can work. The second is how
  long an execution can stay paused. The two questions have different answers.
  A wait also has its own deadline.

## Consequences

- No component applies this rule yet. The ADR records the rule for the work
  that adds timeouts. The rule is about time accounting and not about waits, so
  it belongs to that work.
- A single deadline that the engine calculates at the start cannot apply this
  rule. The work needs one of two other methods. It can add up the time of each
  period in which the execution can run. It can also calculate a new deadline
  each time the execution stops waiting.
- The timeout never stops an execution that waits without an end. No component
  can use the timeout to limit a wait. A wait that must end needs its own
  deadline.
- The derived `waiting` status (ADR-20260902, decision 6) is the signal that the
  time accounting reads. An execution with one waiting branch and one running
  branch reports `running`. Its time therefore counts, which is correct, because
  the execution can make progress.

## Links

RFC: -
Tickets: -
Related ADRs: ADR-20260902-steps-declare-waits
