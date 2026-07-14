# Schedule Trigger on the durable scheduler: what changes

Plain-language companion to `__tests__/schedule-trigger-job-registrar.deviations.test.ts`.
It explains, for a regular user, how a Schedule Trigger behaves once the durable
scheduler is turned on (`N8N_SCHEDULER_ENABLED=true`). Most schedules behave
exactly as before. The differences below are the exceptions.

## Quick summary

| # | What you might notice | When it applies | Old behavior | New behavior |
|---|---|---|---|---|
| 1 | Schedules survive a restart | Always | Timers reset; a run due during downtime was lost | The next run is remembered and a missed run can still fire |
| 2 | Each run happens once across all instances | Multi-instance setups | Every instance could fire the same schedule | Exactly one instance fires it |
| 3 | A run may start a few seconds late | Always | Fired at the exact instant | Checked every few seconds, so it can be slightly delayed (the cadence stays correct) |
| 4 | "Every N seconds/minutes" is measured from activation, not the clock | Only in `new` mode | Fired on clock boundaries (e.g. :00/:30) | Fires every N from when you activated (e.g. :07/:37) |
| 5 | "Every N seconds/minutes" is perfectly steady | Only in `new` mode | Had a small gap each minute for values that don't divide 60 (e.g. every 7s) | Exactly every N, no gap |
| 6 | Rare calendar edge cases are more correct | Every N hours/days/weeks/months | Could misfire around leap years, week 53, and daylight-saving changes | Handled correctly |

## A little more detail

**1. Your schedules survive restarts.** Scheduled runs are stored in the
database, so restarting n8n no longer resets them. A run whose time passed while
n8n was down can still be picked up afterwards.

**2. One run per schedule, even with several instances.** If you run more than
one n8n main instance, a schedule now fires on exactly one of them instead of on
each. This is the main reason the durable scheduler exists.

**3. Runs may be a few seconds late.** The durable scheduler looks for due runs
on a short cycle (about every 5 seconds by default), so a run can start a little
after its scheduled time. How often it runs (the cadence) does not change.

**4 and 5. "Every N seconds / minutes" (the `new` mode only).** By default
(`N8N_SCHEDULER_TRIGGER_NODE_MODE=legacy`) this timing is unchanged. If you
switch to `new`:

- Runs are spaced from the moment you activated the workflow, not from the
  clock. "Every 30 seconds" might land at :07 and :37 rather than :00 and :30.
- The spacing is exact. In the old behavior, an interval like "every 7 seconds"
  reset at each minute, producing a short 4-second gap once a minute. In `new`
  mode it is a steady 7 seconds throughout.

`new` is the more accurate reading of "every N" and is the intended future
default; `legacy` keeps the clock-aligned behavior during rollout.

**6. Calendar schedules (every N hours/days/weeks/months).** For everyday use
these fire the same as before. A few uncommon edge cases (leap years, the 53rd
week of a year, and daylight-saving transitions) are now handled correctly,
where the old scheduler could be off by one period.

## Not user-configurable, but worth knowing

- "Every 1 hour/day/week/month" and a custom cron expression are unaffected by
  the mode setting; they always fire as before.
- The mode setting only ever changes the "seconds" and "minutes" fields.
