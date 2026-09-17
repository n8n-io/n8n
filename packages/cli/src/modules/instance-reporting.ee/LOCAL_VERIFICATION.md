# Local verification plan

How to prove, on one machine, that a dev n8n instance reports to a local
instance-reporting receiver on `http://127.0.0.1:3456`, and that the two data
points hold the numbers from `insights` and `workflow_statistics`.

The daily timer makes an unassisted end-to-end run take up to 24 hours. The
plan removes the wait: the scheduler re-derives "is a report due" from the
database on every tick, so a report time in the past plus a restart forces the
report immediately (the catch-up path). Nothing in the module is changed for
the test.

## 0. Prerequisites

- The receiver runs on `http://127.0.0.1:3456` and answers `POST
  /api/v1/instance-reports` with **201** on success. Any other status counts as
  a rejection.
- The receiver accepts `Authorization: Bearer testing`.
- Keep the receiver's request log visible. You must see the raw body.
- `sqlite3` is installed. The dev instance uses SQLite at
  `~/.n8n/database.sqlite` unless you set another database.
- An n8n owner account exists on the instance (the report reads insights as the
  instance owner). Complete the setup screen first if this is a fresh
  `~/.n8n`.

```bash
export N8N_DB=~/.n8n/database.sqlite   # used by the snippets below
```

## 1. Start the instance

```bash
cd packages/cli

export N8N_ENABLED_MODULES=instance-reporting
export N8N_INSTANCE_REPORTING_BASE_URL=http://127.0.0.1:3456
export N8N_INSTANCE_REPORTING_AUTH_TOKEN=testing
export N8N_INSTANCE_REPORTING_LABEL=local-dev

# Compact insights quickly, so raw rows reach insights_by_period in a minute.
export N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES=1
export N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS=5

export N8N_LOG_LEVEL=debug
export N8N_LOG_SCOPES=instance-reporting

pnpm dev
```

Expected on the first boot:

- No warning about `N8N_INSTANCE_REPORTING_BASE_URL` being unset.
- The log line `Started the instance reporting timer`.
- A `Resolved the instance reporting time` line with a random `HH:mm` at or
  after `03:00`.

Note: `N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES=1` does not move the report
time, because the floor stays at 03:00 UTC. Do not raise that variable above
90 minutes unless you want to test the shift behaviour (step 6).

Check the persisted time:

```bash
sqlite3 "$N8N_DB" \
  "SELECT value FROM settings WHERE key = 'features.centralInstanceMonitoring';"
```

## 2. Create numbers to report

The report covers the **previous completed UTC day**, so executions you run
today do not appear in the daily point. Produce both parts:

1. **Real executions (for `workflow_statistics`).** In the editor, build a
   trivial workflow (Manual/Schedule trigger + Set node), activate it or call
   its production webhook, and run it a few times in production mode. Manual
   runs do not count.

   Check the cumulative source:

   ```bash
   sqlite3 "$N8N_DB" \
     "SELECT SUM(rootCount) FROM workflow_statistics
      WHERE name IN ('production_success', 'production_error');"
   ```

   That number is exactly what the `cumulative` / `billableExecutions` point
   must carry.

2. **Insights rows dated yesterday (for the daily point).** Wait about a minute
   for compaction, then confirm the executions reached `insights_by_period`:

   ```bash
   sqlite3 "$N8N_DB" \
     "SELECT type, periodUnit, periodStart, value FROM insights_by_period
      ORDER BY periodStart DESC LIMIT 10;"
   ```

   Then backdate those rows one day, so they fall inside the reported window
   (`type` 2 = success, 3 = failure; the daily point is their sum):

   ```bash
   sqlite3 "$N8N_DB" \
     "UPDATE insights_by_period
      SET periodStart = datetime(periodStart, '-1 day');"
   ```

   Record the expected daily total:

   ```bash
   sqlite3 "$N8N_DB" \
     "SELECT SUM(value) FROM insights_by_period
      WHERE type IN (2, 3)
        AND periodStart >= date('now', '-1 day')
        AND periodStart <  date('now');"
   ```

   Use two different counts (for example 5 production executions but only 3
   backdated) so a swap of the two data points is visible.

## 3. Force the report now

Set the report time to a minute that already passed today, then restart the
instance. The first tick sees the slot passed and no delivered row for today,
so it reports at once.

```bash
sqlite3 "$N8N_DB" \
  "UPDATE settings SET value = '{\"reportTime\":\"03:00\"}'
   WHERE key = 'features.centralInstanceMonitoring';"
```

Restart `pnpm dev`. Run the test after 03:00 UTC, otherwise 03:00 is still
ahead and the tick correctly skips.

## 4. Verify one successful report

**Receiver side.** The receiver must log one `POST /api/v1/instance-reports`
with:

- header `Authorization: Bearer testing`
- `instanceId`: a 64-character hex string, equal to the instance id in
  `~/.n8n/config`
- `batchId`: a UUID-like id, equal to the row id from the query below
- `label`: `local-dev`
- `n8nVersion`: the version in `packages/cli/package.json`
- `dataPoints`: exactly two entries —
  - `{ "kind": "cumulative", "name": "billableExecutions", "value": <step 2.1> }`
  - `{ "kind": "daily", "name": "billableExecutions", "value": <step 2.2>,
    "date": "<yesterday, YYYY-MM-DD>" }`

Confirm the numbers match what you recorded in step 2, and that `date` is
yesterday's UTC date, not today's.

**n8n side.**

```bash
sqlite3 -header "$N8N_DB" \
  "SELECT id, createdAt, deliveredAt, attempts, lastError, dataPoints
   FROM instance_monitoring_report ORDER BY createdAt DESC LIMIT 5;"
```

Expected: one row, `deliveredAt` set, `attempts` = 1, `lastError` NULL, and
`dataPoints` identical to the payload the receiver logged. The log shows `Sent
instance report` with the same `batchId`.

## 5. Verify the surrounding behaviour

Run these after step 4. Each is short.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 5.1 | No second report the same day | Restart the instance | No new request, no new row. `hasDeliveredToday` short-circuits the tick |
| 5.2 | Retry resends the same measurement | Make the receiver answer 500. Delete today's delivered row, then restart | Request arrives, `lastError` holds `rejected with status 500`, `deliveredAt` NULL, `attempts` grows. Retries land ~5 minutes apart, 3 attempts in total, then `Giving up on the instance report for today`. Every retry carries the **same** `batchId` and the same values — no re-measurement |
| 5.3 | Recovery keeps the pending row | During 5.2, switch the receiver back to 201 before the third attempt | The next attempt reuses the pending row and marks it delivered. No second row for the day |
| 5.4 | Wrong token | Set `N8N_INSTANCE_REPORTING_AUTH_TOKEN=wrong`, clear today's row, restart | The receiver answers 401/403, delivery fails, `lastError` names the status. Nothing is marked delivered |
| 5.5 | Non-201 success code is a failure | Make the receiver answer 200 | Treated as a rejection: `Instance report was rejected with status 200` |
| 5.6 | Receiver down | Stop the receiver, clear today's row, restart | Delivery fails with a connection error in `lastError`; the instance stays healthy and keeps serving |
| 5.7 | Redirect is not followed | Make the receiver answer 302 to another local port | The report is rejected with status 302. The second port never sees the bearer token |
| 5.8 | Base URL unset | Unset `N8N_INSTANCE_REPORTING_BASE_URL`, restart | Warning `enabled but N8N_INSTANCE_REPORTING_BASE_URL is unset`; no timer, no request |
| 5.9 | Insights disabled | `N8N_DISABLED_MODULES=insights`, restart | Startup fails with the `UserError` that names both variables |
| 5.10 | Trailing slash in the base URL | Use `http://127.0.0.1:3456/`, clear today's row, restart | The path is still `/api/v1/instance-reports`, with no double slash |
| 5.11 | Slot still ahead | Set `reportTime` to a time later today, clear today's row, restart | No request. The log shows the timer armed for the remaining interval |

`clear today's row` means:

```bash
sqlite3 "$N8N_DB" "DELETE FROM instance_monitoring_report;"
```

## 6. Optional: compaction-window healing

Set `N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES=240` (floor becomes 480 minutes
= 08:00 UTC) with a stored `reportTime` of `03:30`, then restart. Expected: the
warning `Moved the instance reporting time later so it clears the insights
compaction window`, and the settings row now holds a time at or after `08:00`.
Reset the variable afterwards.

## 7. Cleanup

```bash
sqlite3 "$N8N_DB" "DELETE FROM instance_monitoring_report;"
sqlite3 "$N8N_DB" "DELETE FROM settings WHERE key = 'features.centralInstanceMonitoring';"
```

Unset the `N8N_INSTANCE_REPORTING_*` and `N8N_INSIGHTS_*` variables, or start a
new shell. The backdated `insights_by_period` rows stay wrong for the Insights
UI; drop them, or use a throwaway `N8N_USER_FOLDER` for the whole test if you
want your dev data untouched.

## Notes and known limits

- **Local receiver and SSRF.** The module requests with
  `useDefaultSsrfPolicy: 'unsafe'`, because the operator sets the receiver URL.
  A loopback address therefore works without extra configuration.
- **UTC everywhere.** The report time, the slot maths and the reported date are
  all UTC. Convert before you read the local clock.
- **Multi-main.** Only the leader holds the timer. A single dev instance is
  always the leader, so this plan cannot show handover. To cover it, run two
  mains against the same Postgres with `N8N_MULTI_MAIN_SETUP_ENABLED=true` and
  confirm only one request arrives per day, and that the follower starts the
  timer after the leader stops.
- **Request timeout.** Delivery gives up after 30 seconds. A receiver that
  sleeps longer is a way to check the timeout path in 5.6.
