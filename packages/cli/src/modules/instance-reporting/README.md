# Instance Reporting

Reports this instance's billable execution numbers to a central usage-monitoring
receiver, once a day.

Each report carries two data points for the previous completed UTC day:

- a `daily` billable-execution count, from the `insights` module
- a `cumulative` lifetime total, from the license metrics repository

Every report is persisted in `central_instance_monitoring_report` before it is
sent, so a retry resends the exact same measurement under the same `batchId`
rather than taking fresh numbers — the cumulative total's day-to-day diff is
only meaningful while every sample sits a fixed 24 hours apart.

## Scheduling

The daily fire is driven by `InstanceReportingScheduler`, a leader-gated
in-process timer (the same pattern as execution pruning and workflow history
compaction) rather than the durable scheduler: that framework has no
first-class support yet for system-owned jobs like this one, only for
workflow-triggered jobs, and this module is meant to move onto it once it does.

In multi-main, only the leader holds the timer, so a cluster reports once
rather than once per main; leadership handover moves the timer along with it.
In place of the durability a scheduler-backed job would give:

- **Catch-up.** Every tick asks the database whether today's report was
  delivered, rather than trusting a timer fired at the right moment — so a
  restart, or a leadership handover, that straddles the report time still
  reports that day.
- **Bounded retry.** A failed delivery is retried a few times, a few minutes
  apart, before the day is left to the next slot.

## Enabling

Opt-in and main-only. Add it to `N8N_ENABLED_MODULES`:

```
N8N_ENABLED_MODULES=instance-reporting
N8N_INSTANCE_REPORTING_BASE_URL=https://monitoring.example.com
```

The `insights` module must stay enabled, since the daily figure comes from
there.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `N8N_INSTANCE_REPORTING_BASE_URL` | `''` | Base URL of the receiver. The report is POSTed to `<base>/api/v1/instance-reports`. Left unset, the module loads but warns and never sends. |
| `N8N_INSTANCE_REPORTING_IDENTIFIER` | `''` | Sent as `label` in the payload, when set. |
| `N8N_INSTANCE_REPORTING_AUTH_TOKEN` | `''` | Sent as `Authorization: Bearer …`, when set. |

## Report time

Each instance reports at a random time of day, persisted once in the `settings`
table (`features.centralInstanceMonitoring`) on first boot and left unchanged
afterwards — this spreads a fleet's requests across the day instead of every
instance calling at the same minute. The time is always UTC and never before
03:00, so the day being reported has had time to be compacted by `insights`
first; it shifts itself later, logging a warning, if
`N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES` is raised enough to require it.

See [.agents/specs/central-instance-monitoring.md](../../../../../.agents/specs/central-instance-monitoring.md)
for the full design.
