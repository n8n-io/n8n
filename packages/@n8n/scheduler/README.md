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

## Schedule kinds

A scheduled job says *when* something should run. There are four kinds:

| Kind | Meaning | Example |
|---|---|---|
| `cron` | Fires at fixed clock times, written as a cron expression. | `0 0 9 * * 1` = every Monday at 09:00 |
| `interval` | Fires every N seconds of elapsed time. | every 3600s = once an hour |
| `one_off` | Fires once, at a single instant, then never again. | fire at 2026-01-01 00:00 |
| `recurring_cron` | A cron *anchor* thinned by an "every N periods" gate, for cadences plain cron cannot express. | every 3 weeks on Monday |

### Why `recurring_cron`?

Plain cron can say "every Monday", but not "every *third* Monday".
`recurring_cron` builds that from two parts:

- an **anchor**: a normal cron that lists candidate dates (often too many),
- a **gate**: keeps a candidate only once at least `recurrenceSize` periods of
  `recurrenceUnit` (`hours` / `days` / `weeks` / `months`) have passed since the
  last kept fire.

"Every 3 weeks on Monday" = anchor "every Monday" + gate "1 per 3 weeks":

```
Anchor (every Monday):  M   M   M   M   M   M   M
Gate (1 per 3 weeks):   ✓   ✗   ✗   ✓   ✗   ✗   ✓
Fires:                  M           M           M
```

The gate looks only at the previous fire, with no stored counter. So any
instance in the cluster can compute the next run, and a restart never loses the
cadence.

## Status

Early foundation. The algorithms, schedule math and composition surface are in
place; the driver that runs the passes on their cadences in the main process
lands in later milestones.
