# Instance Reporting

Reports this instance's billable execution numbers to a central usage-monitoring
receiver, once a day.

Each report carries two data points for the previous completed UTC day:

- a `daily` billable-execution count, from the `insights` module
- a `cumulative` lifetime total, from the license metrics repository

Every report is persisted in `instance_monitoring_report` before it is
sent, so a retry resends the exact same measurement under the same `batchId`
rather than taking fresh numbers — the cumulative total's day-to-day diff is
only meaningful while every sample sits a fixed 24 hours apart.

A report that follows downtime carries one `daily` point for each day the
instance missed, up to 30 days, and one `cumulative` point as always. Across a
gap the `daily` series is the authoritative one: the two cumulative samples
around the gap sit more than 24 hours apart, so their difference covers the
whole outage. A missed day with no executions is reported as `0`, so a gap in
the series always means "not reported", never "nothing ran". A gap longer than
30 days is unrecoverable, since `insights` buckets a longer range by week; the
oldest days are dropped and logged.

**A day is reported once, and 201 is what decides it.** The receiver answers 201
only once it has saved the report, so anything else means nothing was saved and
the day is still owed. A day is crossed off only by a delivered report, which is
why a failed day is simply covered again by the next one — even under a new
`batchId`, since the first attempt left nothing behind.

## Retry state

A report row carries its own retry state, so `status` says where it stands
without reading this document:

| `status` | Meaning |
|---|---|
| `pending` | Not delivered yet, and attempts remain |
| `delivered` | The receiver answered 201 |
| `skipped_after_max_retries` | The instance stopped delivering that day, either after three failed attempts or because the report's own slot passed before it landed |

A skipped report is **not** lost data. Only a delivered report crosses a day
off, so the days a skipped report covered are measured again and sent by the
next one.

`attempts` and `lastAttemptAt` hold the budget and the pacing, rather than the
scheduler holding them in memory. A restart therefore resumes the same report's
three attempts instead of granting three more, and waits out the rest of the
five minutes since the last attempt before trying again — otherwise a crash loop
would spend the whole budget in seconds. `InstanceReportingScheduler` keeps no
attempt state of its own.

The delivery retry above and the missed-day backfill are two separate
mechanisms. [RETRIES.md](./RETRIES.md) explains each one, how they connect,
and where the logic lives.

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

The instance must hold a license certificate, unless
`N8N_INSTANCE_REPORTING_AUTH_TOKEN` is set. Reporting is for licensed
instances, and the certificate is how the receiver knows that, see
[Authentication](#authentication). Without a credential the module loads but
warns and never sends, exactly as without a receiver.

## Authentication

There are two credentials. The token wins when it is set.

**License certificate (default).** Every report carries the instance's license
certificate, the string `License.loadCertStr()` returns (`N8N_LICENSE_CERT`,
or the persisted certificate of an activated license), as the `licenseCert`
field of the body. The receiver verifies that the certificate was issued by
n8n and then discards it; nothing from it is stored. There is no token to
configure or distribute.

The certificate is read fresh for every report, so a renewed license is sent
as soon as it is stored. An expired certificate is still sent and still
accepted: the receiver checks the issuer, not the validity period.

It travels in the body, not in an `Authorization` header, because a
certificate is several KB and grows with the license, which is more than
common reverse proxies allow per header.

**Bearer token.** When `N8N_INSTANCE_REPORTING_AUTH_TOKEN` is set, every
report carries it as `Authorization: Bearer …` and the body has no
`licenseCert` field. The certificate is not read at all, so an unlicensed
instance can report with a token.

Redirects are never followed, so either credential reaches only the configured
host.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `N8N_INSTANCE_REPORTING_BASE_URL` | `''` | Base URL of the receiver. The report is POSTed to `<base>/api/v1/instance-reports`. Left unset, the module loads but warns and never sends: it starts no scheduler and claims no report time. |
| `N8N_INSTANCE_REPORTING_LABEL` | `''` | Sent as `label` in the payload, when set. |
| `N8N_INSTANCE_REPORTING_AUTH_TOKEN` | `''` | Sent as `Authorization: Bearer …`, when set. Replaces the license certificate as the credential; `licenseCert` is then omitted from the body. |
| `N8N_LICENSE_CERT` | `''` | Not owned by this module. Its value, or the persisted certificate of an activated license, is sent as `licenseCert` and is the credential the receiver checks, unless a token is set. |

## Report time

Each instance reports at a random time of day, persisted once in the `settings`
table (`features.centralInstanceMonitoring`) on first boot and left unchanged
afterwards — this spreads a fleet's requests across the day instead of every
instance calling at the same minute. The time is always UTC and never before
03:00, so the day being reported has had time to be compacted by `insights`
first; it shifts itself later, logging a warning, if
`N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES` is raised enough to require it.

## Client settings

`GET /rest/module-settings` carries an `instance-reporting` key when the module
is enabled on this instance:

```json
{
  "instance-reporting": {
    "enabled": true,
    "reportTime": "07:42"
  }
}
```

`enabled` says whether a receiver is configured and a credential (an auth
token or a license certificate) is present. Without either the key reads
`{ "enabled": false }` and carries no
`reportTime`, since no time is claimed. A missing key means the module is not
enabled at all.

These settings are built once, during module init, and served from a cache
afterwards, so they carry only values that stay the same for the lifetime of
the process.

## Reporting status

`GET /rest/instance-reporting/status` answers with the UTC instant the receiver
last accepted a report, or `null` when it never did:

```json
{ "lastSuccessfulReport": "2026-03-25T07:42:13.000Z" }
```

The route exists whenever the module is loaded, including without a receiver — the client decides whether to ask by reading `enabled` from the client settings.

See [.agents/specs/central-instance-monitoring.md](../../../../../.agents/specs/central-instance-monitoring.md)
for the full design.
