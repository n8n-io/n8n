# @n8n/scheduler

The pure engine for n8n's durable scheduler: dependency-light domain logic with no
runtime wiring (no database, DI or cli coupling), so it stays leaf-level and
publishable.

## Scope

The durable scheduler runs scheduled work reliably across every n8n main instance,
exactly once per occurrence, surviving restarts and crashes. This package owns its
pure logic:

- **Coordination** (the core): claim, lease and fence each unit of work to a single
  main, and reap work whose owner has died.
- **Recurrence**: compute the next occurrence of a cron, interval or one-off
  schedule. All timezone and DST handling lives here.
- **Ports**: the storage and handler-registry contracts the engine runs against.

Persistence, configuration and lifecycle wiring live in other packages; this one
stays free of them.

## Status

Early foundation, part of the Durable Scheduler project. Today it ships the domain
types, the schedule math and a thin storage port; the coordination loops land in
later milestones.
