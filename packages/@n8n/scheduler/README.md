# @n8n/scheduler

Durable, multi-main scheduling for n8n. Upcoming work is recorded in storage
before it runs, then claimed, fired and recovered under leases and epoch
fencing, so each occurrence executes once across the cluster and survives
restarts and failovers. Occurrences are dispatched to handlers by `taskType`;
the Schedule Trigger node is the first consumer. Everything sits behind
`N8N_SCHEDULER_ENABLED` (default off) while the legacy engine stays in place.

## Surface

The package is pure logic, with no DI and no database. It exposes exactly two
things (plus the types their signatures reach):

- **`Scheduler`**: `registerTaskHandler` plus one accessor per pass
  (`materialize`, `execute`, `reap`, `prune`, `stop`). The host drives each
  pass on its own cadence.
- **`createScheduler(deps)`**: composes the internal algorithms (materializer,
  executor, reaper, retention) into a `Scheduler`.

The host binds `deps`: a task store and a transaction runner (the `@n8n/db`
repositories satisfy the store contracts structurally, so no adapters are
needed), optional per-pass tuning, and an `onEvent` sink for described
incidents. In n8n that host is the cli's `DurableScheduler`
(`packages/cli/src/scheduling/`), which wires DI, config and instance identity,
and routes events to the logger.

## Status

Early foundation. The algorithms, schedule math and composition surface are in
place; the driver that runs the passes on their cadences in the main process
lands in later milestones.
