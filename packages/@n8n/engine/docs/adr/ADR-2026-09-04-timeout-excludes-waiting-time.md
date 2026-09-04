# ADR-2026-09-04: The execution timeout does not run while an execution waits

Date: 2026-09-04
Status: Active
Decision Owner: Catalysts

## Context

A workflow can carry an execution timeout, after which a running execution is
stopped. Engine v2 does not enforce timeouts yet; the value will reach the data
plane with the rest of the workflow's settings.

Waits make the question ambiguous for the first time. An approval can sit
unanswered for weeks and a scheduled wait can name a date months out, so
whether that time counts against the timeout decides whether timeouts and waits
can be used together at all.

In v1 they can, because a waiting execution is not running: it is serialized to
the database and taken off the active list, and the poller starts it again as a
fresh execution when the wait ends. The timeout applies to each active stretch,
never to the pause between them. No one designed that; it fell out of how
waiting was implemented.

## Decision

The execution timeout measures time the execution was **runnable**, not wall
clock. Time an execution spends reporting `waiting` does not count against it.

This keeps v1's observable behaviour, and it is what makes a timeout mean what
users take it to mean: a guard against an execution that is stuck doing
something, not against one that is deliberately paused.

## Alternatives Considered

- **Wall clock from the execution's start.** The simplest thing to implement and
  the easiest to explain, and it makes any timeout incompatible with any wait
  longer than it. A workflow with a one-hour timeout and a one-day wait could
  never finish, and the failure would look like a timeout rather than a
  misconfiguration.
- **Let the timeout bound the wait too.** Treats "how long may this execution
  work" and "how long may this execution be paused" as one limit. They are
  different questions with different right answers, and a wait already carries
  its own deadline.

## Consequences

- Nothing enforces this yet. It records the rule for whoever implements
  timeouts, and it is a rule about accounting rather than about waits, so it
  belongs to that work.
- Enforcement cannot be a single deadline computed at start. It needs either
  elapsed time accumulated across runnable stretches, or a deadline recomputed
  each time an execution stops waiting.
- An execution that waits forever is never stopped by its timeout. Nothing
  should rely on the timeout to bound a wait; a wait that must end needs a
  deadline of its own.
- The derived `waiting` status (ADR-2026-09-02, decision 6) is the signal the
  clock reads. An execution with one waiting branch and one executing branch
  reports `running`, so its clock runs — which is correct, since it is working.

## Links

RFC: -
Tickets: -
Related ADRs: ADR-2026-09-02-steps-declare-waits
