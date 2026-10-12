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
instance missed, and one `cumulative` point as always. Across a gap the `daily`
series is the authoritative one: the two cumulative samples around the gap sit
more than 24 hours apart, so their difference covers the whole outage. A missed
day with no executions is reported as `0`, so a gap in the series always means
"not reported", never "nothing ran". The one exception: missed days before the
first `insights` data are not reported at all.

The first report works the same way: it carries a `daily` point for every day
from the first `insights` data to yesterday. It carries no past `cumulative`
values, since those are unknown. Days before the first `insights` data are not
sent. A report reads only hourly `insights` data, because only hourly rows
split exactly into UTC days. `insights` folds hours older than 90 days (by
default) into daily rows, so a report never carries a day older than 89 days.
Inside the sent range, a day without data is `0`.
[RETRIES.md](./RETRIES.md#type-2-missed-day-backfill) gives the exact rules.

Insights data only has a `billable` number on instances that run 2.40.0 or
higher. Before then, only the `total` number is available. The first day with
`billable` data is not a full 24-hour window on 2.40.0 or higher, so instance
reports send the `total` number for that day and every day before it. Every
later day sends the `billable` number, also when it is `0`.

Known limits:

- If `insights` was disabled for a time between its first data and the first
  report, those days are sent as `0`.
- After this instance's database is restored from a backup, the days since the
  backup are sent again, as `0` or as a lower value. Consumers of the receiver's
  export must use the highest value for each instance, metric and day.
  `insights` stores no row for a day without executions, so a day lost in the
  restore looks the same as a day when nothing ran. If `insights` stored an
  explicit `0` for each day it ran, the lost days could be left out, and only
  the backup day would be sent again.
- On Postgres, `insights` compacts in the session's time zone. When that time
  zone is not UTC, two cases put executions on the wrong UTC day:
  - Daily rows inside the sent range. They occur only if
    `N8N_INSIGHTS_COMPACTION_HOURLY_TO_DAILY_THRESHOLD_DAYS` was lower before.
    Each daily row holds a local day, and the report puts it on one UTC day.
  - A time zone with a half-hour offset, such as `Asia/Kolkata`. Hourly rows
    then start at 30 minutes past the UTC hour, so the row that holds UTC
    midnight counts on one day only.

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
| `sending` | One main holds the report while it sends a request |
| `delivered` | The receiver answered 201 |
| `skipped_after_max_retries` | The instance stopped delivering that day: after three failed attempts, because the report's own slot passed before it landed, or because the receiver rejected the payload (`400` or `413`) |

A skipped report is **not** lost data. Only a delivered report crosses a day
off, so the days a skipped report covered are measured again and sent by the
next one.

`attempts` and `lastAttemptAt` hold the budget and the pacing, rather than the
scheduler holding them in memory. A restart therefore resumes the same report's
three attempts instead of granting three more, and waits out the rest of the
five minutes since the last attempt before trying again — otherwise a crash loop
would spend the whole budget in seconds. `InstanceReportingTask` keeps no
attempt state of its own.

The delivery retry above and the missed-day backfill are two separate
mechanisms. [RETRIES.md](./RETRIES.md) explains each one, how they connect,
and where the logic lives.

## Scheduling

`InstanceReportingTask` checks the stored report time every 15 minutes. Changes
to that time apply on the next pass without a restart or a schedule update. A
report can start up to 15 minutes after its UTC slot. A pass sends a new report
for the latest slot at or before its time, unless the day of that slot is
settled. Yesterday's slot stays due for one hour, so a slot late in the UTC day
is sent after midnight. That report is still dated by its slot and ends on the
day before it.

With `N8N_SCHEDULER_ENABLED` and `N8N_SCHEDULER_SYSTEM_TASKS_ENABLED` enabled,
any main can claim the durable task. With either flag disabled, the shared
system task runner uses the leader's in-memory timer. It also runs a catch-up
pass at startup and on leader takeover. The runner starts after the server.

The report row owns retries in both modes. Each scheduler occurrence has one
attempt. A delivery failure is recorded as a failed occurrence. Later passes
read the report row and wait at least five minutes before retrying. During normal
operation, retries run on the next 15-minute pass. After three
failed deliveries, the row is skipped. At the pending row's next daily slot,
a new report replaces it even if the retry delay has not elapsed. A `sending`
row stays active until its request finishes. A stopped main's claim expires
after two minutes.

The unique `reportDate` key allows one report row per UTC day. Concurrent
creators cannot send different measurements for that day. Retries use the
persisted data and `batchId`. If delivery succeeds before a main stops, a repeat
uses that same batch. The receiver answers `409`, which counts as delivery.
A database claim lets only one main send a pending row at a time. Claim age
uses the database clock. A failure write must match the active claim timestamp.
A late `201` or `409` marks any undelivered row as delivered, even if another
main reclaimed or skipped it. Further results leave a delivered row and its
attempt count unchanged.

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
| `N8N_INSTANCE_REPORTING_BASE_URL` | `''` | Base URL of the receiver. The report is POSTed to `<base>/api/v1/instance-reports`. Left unset, the module loads but warns and never sends: it registers no reporting task and claims no report time. |
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
