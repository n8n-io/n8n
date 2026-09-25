# Retries

The module has two retry mechanisms. The code keeps them separate. Both feed
the same state machine on `instance_monitoring_report`: a row goes from
`pending` to `delivered`, or from `pending` to `skipped_after_max_retries`.

- **Type 1, delivery retry.** Resend the pending row until it lands, its budget
  runs out, or its own next slot passes. It continues across the UTC midnight
  boundary.
- **Type 2, missed-day backfill.** Put every day without a delivered row into
  the next report.

Type 2 decides how many days the next `pending` row must cover. Type 1 then
takes over and delivers that row.

## The send decision

`start()` fires the first `tick()` (on `server-started`, or on leader takeover).
Every pass then re-arms the next with `setTimeout`, so the loop drives itself.
Each pass makes one choice, from `findPending()` — the newest row, and only if
that row is still pending:

```mermaid
flowchart TD
    S(["start(): server-started / leader takeover"]) --> T
    T["tick()"] --> P{"waiting between retries?<br/>(up to 5 min, but not past its slot)"}
    P -- yes --> ARM
    P -- no --> L["report = findPending()"]
    L --> Q1{"is there a report to resume?"}
    Q1 -- yes --> Q1b{"too old to still send?"}
    Q1b -- no --> R["resend it — retry, even past midnight"]
    Q1b -- yes --> SK["mark it skipped"] --> Q2
    Q1 -- "no — delivered, skipped, or none" --> Q2{"reached today's report time?"}
    Q2 -- no --> N["do nothing — wait"]
    Q2 -- yes --> Q3{"already reported today?"}
    Q3 -- yes --> N
    Q3 -- no --> C["create a new report"]
    R --> ARM
    C --> ARM
    N --> ARM
    ARM["scheduleNext() — arms setTimeout(tick)"] -. re-arms .-> T
```

## Type 1: delivery retry

Scope: the newest row while it is `pending`, whose last delivery attempt failed.
It can come from an earlier slot, so the retry crosses midnight. Once its own
next slot has passed, the retry stops: the row is marked
`skipped_after_max_retries` and a new report covers its day instead.

- The row is created once, as `pending`, with its data points already
  measured. A retry changes only `attempts`, `lastAttemptAt`, `lastError` and,
  in the end, `status`. The data points and the `batchId` stay the same.
- `InstanceReportingService.msUntilRetryAllowed()` reads `lastAttemptAt` from
  the row. The scheduler waits `RETRY_DELAY_MS` (5 minutes) between attempts.
- The budget is `MAX_ATTEMPTS` (3). The attempt that spends the last one flips
  the row to `skipped_after_max_retries` at once. There is no fourth attempt,
  and no new row for today.
- A response of `201` flips the row to `delivered`. A `409` means the receiver
  already holds this `batchId`, so the row is marked `delivered` as well.
- A response of `400` (the report fails the receiver's schema) or `413` (the
  report is over the receiver's size limit) flips the row to
  `skipped_after_max_retries` at once and logs an error. The payload of a
  pending row does not change between attempts, so a retry cannot succeed.
  The next slot measures its days again in a new report.

Type 1 alone decides whether the row lands. Because the budget and the
pacing live on the row, a restart resumes them. A fresh process does not get
three new attempts, and it waits out the rest of the five minutes before it
tries again.

## Type 2: missed-day backfill

Scope: no `pending` row is the newest, but one or more calendar days have no
`delivered` row.

- `InstanceMonitoringReportRepository.findLastCoveredDay()` counts only
  `delivered` rows. A day whose row was skipped, or a day the instance was down
  for, is still owed.
- `InstanceReportingService.missedDays()` walks back from yesterday to the day
  after the last delivered day. It stops at `MAX_BACKFILL_DAYS` (30) because
  `insights` buckets a longer range by week, which cannot fill a daily point.
  Older days are dropped.
- The next report creates one new row. It carries one `daily` point for every
  missed day and one `cumulative` point. The cumulative point is a fresh
  lifetime total, not one per missed day.
- That new row is then subject to type 1 if its own delivery fails.

Type 2 is the catch-up layer. It reacts to type 1 giving up, and to any other
gap in delivered rows.

## How the two connect

```mermaid
flowchart TD
    subgraph T1["Type 1: delivery retry (max 3 attempts, 5 min apart, crosses midnight)"]
        A["Newest row is pending\n+ measured data points"] --> B["POST attempt"]
        B -->|"201 / 409"| C["delivered"]
        B -->|"failure"| D["attempts++\nlastAttemptAt, lastError"]
        D --> R{"400 / 413?"}
        R -- yes --> G
        R -- no --> E{"attempts >= 3?"}
        E -- no --> F["wait 5 min"] --> B
        E -- yes --> G["skipped_after_max_retries"]
    end

    C --> H["Day counts as covered\n(findLastCoveredDay)"]
    G --> I["Day stays uncovered\n(not delivered)"]

    subgraph T2["Type 2: missed-day backfill"]
        J["Next cycle: newest row not pending"] --> K["missedDays() = every day after\nlast DELIVERED day, up to 30"]
        K --> L{"any missed days?"}
        L -- no --> M["nothing to send"]
        L -- yes --> N["new row: one daily point per\nmissed day + 1 cumulative point"]
        N --> A
    end

    I --> K
```
