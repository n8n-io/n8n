# Instance Reporting

Reports this instance's billable execution numbers to a central usage-monitoring
receiver, once a day, as a durable scheduler job.

Each report carries two data points for the previous completed UTC day:

- a `daily` billable-execution count, from the `insights` module
- a `cumulative` lifetime total, from the license metrics repository

Every report is persisted in `central_instance_monitoring_report` before it is
sent, so a retry resends the exact same measurement under the same `batchId`
rather than taking fresh numbers — the cumulative total's day-to-day diff is
only meaningful while every sample sits a fixed 24 hours apart.

## Enabling

Opt-in and main-only. Add it to `N8N_ENABLED_MODULES`:

```
N8N_ENABLED_MODULES=instance-reporting
N8N_SCHEDULER_ENABLED=true
N8N_INSTANCE_REPORTING_BASE_URL=https://monitoring.example.com
```

The durable scheduler (`N8N_SCHEDULER_ENABLED`) is a hard requirement — the
daily job runs on it, so module init fails fast if it's off. The `insights`
module must also stay enabled, since the daily figure comes from there.

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
