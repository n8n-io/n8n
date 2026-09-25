# Video runbook: first instance report carries the insights history

Dry-run on 2026-09-25 against branch `api-196-send-historic-metric-data`
(HEAD `c798951a9c4`). The scripts start n8n from `packages/cli/dist`, so run
`pnpm build` in `packages/cli` again after you change the branch.

All dates below are from the dry run. The seed is relative to today, so read
your own numbers from `./show-insights.sh` before you record.

## Screen layout

```
┌──────────────────────────┬──────────────────────────┐
│ A: n8n log               │ B: commands              │
│ ./start-n8n.sh [...]     │ ./seed-insights.sh, ...  │
│                          ├──────────────────────────┤
│                          │ C: receiver log          │
│                          │ ./start-receiver.sh      │
└──────────────────────────┴──────────────────────────┘
```

## Before you record (off camera)

1. Record after **03:01 UTC**. `force-report-now.sh` refuses to run earlier.
2. `./setup-instance.sh`: creates a fresh n8n home with one workflow.
3. Pane C: `./start-receiver.sh fresh`. Wait for `Server listening at http://127.0.0.1:3456`.
4. Optional rehearsal: run scenes 2 to 4 once, then `./setup-instance.sh` and
   `./start-receiver.sh fresh` again for a clean take.

## Scene 1: the problem (30 s, talk only)

- Air-gapped customers turn on instance reporting long after they installed n8n.
- Until now the first report sent **yesterday only**. Everything insights already
  knew was lost for billing. After downtime, a report caught up at most 30 days.
- Now the first report carries every day that insights holds with an exact
  per-day value, and a catch-up after downtime has no 30-day limit.

## Scene 2: an existing instance with history (1.5 min)

1. Pane A: `./start-n8n.sh`. Reporting is **off**; only insights runs.
   The one demo setting: compaction every minute instead of every hour.
2. Pane B: `./seed-insights.sh`. It adds 200 days of production executions of
   "Nightly CRM sync": about 32 a weekday, 6 a weekend day, and nothing on three
   days in the middle of September.
3. Wait for pane A to print `Compacted 500 raw data to hourly aggregates`, then
   `... daily data to weekly aggregates` (about a minute).
4. Pane B: `./show-insights.sh`. Explain the three bucket sizes:

   ```
   week  6    2026-03-09  2026-03-23   <- older than 180 days: weekly totals only
   day   134  2026-03-29  2026-06-26   <- 90 to 180 days: one row a day
   hour  302  2026-06-27  2026-09-24   <- last 90 days: one row an hour
   ```

   A weekly total cannot say how many executions ran on which day, so the
   report must not use those days. Exact days start on the Monday after the
   newest weekly row: `2026-03-30`. Write down `first_day`, the day count,
   `executions` and `cumulative`.

## Scene 3: turn instance reporting on for the first time (1 min)

1. Pane A: stop n8n (Ctrl-C).
2. Pane B: `./force-report-now.sh`. Normally the first report goes out at a
   random time after 03:00 UTC. This sets the time to 03:00 so the report goes
   out at boot.
3. Pane A: `./start-n8n.sh reporting`. Point at the two log lines:

   ```
   Reporting days missed since the last delivered instance report
     { "firstDay": "2026-03-30", "lastDay": "2026-09-24", "count": 179 }
   Sent instance report { "batchId": "6e184194-..." }
   ```

4. Pane C shows the `POST /api/v1/instance-reports` answered with `201`.

## Scene 4: what the receiver stored (1.5 min)

1. Pane B: `./show-receiver.sh` (reads the receiver's export, `GET /api/v1/report`):

   ```
   cumulative:  5015
   daily:       179 points, 2026-03-30 .. 2026-09-24
   sum(daily):  4484
   zero days:   2026-09-13, 2026-09-14, 2026-09-15
   ```

2. Tie it back to scene 2:
   - It starts on the first exact day, not in March's weekly totals.
   - It ends **yesterday**. Today is not over yet, so it is never reported.
   - `sum(daily)` equals the `executions` from `./show-insights.sh`.
   - Only the quiet days are `0`. A day inside the history without executions
     is a real zero; nothing is sent for days before the history starts.
   - `cumulative` is higher than `sum(daily)`: it is the lifetime total,
     including the weeks that only exist as weekly totals.
3. Optional: `./show-receiver.sh all` and scroll through the weekday/weekend pattern.
4. `./show-n8n-reports.sh`: the instance's own record, `delivered`, 1 attempt.
5. Pane A: Ctrl-C, `./start-n8n.sh reporting` again. No second report today.

## Scene 5: other cases (pick what fits)

Stop n8n (Ctrl-C) before each case script, then start it with
`./start-n8n.sh reporting`, then run `./show-receiver.sh`.

| Case | Script | Expected | Why show it |
|---|---|---|---|
| 45 days of downtime after a delivered report | `./case-downtime.sh` | `count: 45`, `2026-08-11 .. 2026-09-24`, zeros on the quiet days | Recommended. The old code stopped at 30 days |
| Brand-new instance, no history | see below | 1 point: yesterday = `0`, cumulative `0` | Recommended. A new instance shows up on day one, and nothing is invented |
| First report was skipped (receiver down) | `./case-skipped-first-report.sh` | Same 179 days as scene 4 | Optional. A skipped report never shortens the history. The result looks like scene 4, so it only works with narration |

Brand-new instance, in its own home and with its own label (stop the other n8n first):

```bash
export DEMO_HOME=$PWD/n8n-home-new DEMO_LABEL=new-instance
./setup-instance.sh && ./force-report-now.sh && ./start-n8n.sh reporting
# other pane, same two exports:
./show-receiver.sh
```

## Questions viewers may ask

- **Why not 2026-03-29? It has a daily row.** Compaction folded Monday to
  Saturday of that week into a weekly total and left Sunday. The report starts
  at the next Monday, so it never sends a day whose executions are partly in a
  weekly total.
- **What if insights was off for a while?** Those days, after the first insights
  data, are sent as `0`. The README lists this as a known limit.
- **How big can the first report get?** At most 730 days, less than 70 KB.

## Clean up

```bash
pkill -f "packages/cli/bin/n8n start"   # or Ctrl-C in pane A
# Ctrl-C in pane C
rm -rf n8n-home n8n-home-new receiver.sqlite*
```
