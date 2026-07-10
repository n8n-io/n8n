# `recurring_cron`: deliberate behavioral deviations

> **Temporary review document.** This file exists to make the behavioral deviations of the
> `recurring_cron` schedule kind explicit for review of the `recurrence-in-scheduler` branch.
> It is not long-lived documentation and should be deleted once project is completed and documented.

The `recurring_cron` kind reproduces the legacy Schedule Trigger recurrence semantics
(`recurrenceCheck` in `packages/nodes-base/nodes/Schedule/GenericFunctions.ts`): a cron anchor
thinned by an every-Nth-period gate that passes when `elapsedPeriods === 0` (same-period
multi-anchor) or `elapsedPeriods >= size` (catch-up, no permanent skip). Within that contract,
the following points deviate on purpose, either from the legacy node or from the C2 branch's
first implementation.

## 1. Legacy arithmetic bugs are fixed, not reproduced

The legacy gate stores period *labels* and compares them with modular arithmetic. The domain
math uses real calendar diffs instead (`src/core/recurrence/periods.ts`). Consequences:

| Legacy formula | Bug | New behavior |
|---|---|---|
| `(dayOfYear - last + 365) % 365` | Day 366 of a leap year collides with Jan 1; Dec-to-Jan spans in leap years are off by one | Calendar-day diff in the schedule timezone; pinned by `counts correctly across a leap-year boundary` (periods.test.ts) |
| `(hour - last + 24) % 24` | Cannot represent a gap of 24h or more; a 27-hour gap reads as 3 | Unbounded wall-clock hour count; pinned by `does not wrap at a day boundary (27 hours later reads 27, not 3)` (periods.test.ts) |
| `(week - last + 52) % 52` | Week 53 squashed at year boundaries | Sunday-start calendar-week diff; pinned by `counts week boundaries across a year boundary` (periods.test.ts) |
| `month === (size + last) % 12` (historical) | "Every 12 months" never fired again | Absolute month count (`year*12 + month`), already fixed on legacy HEAD and reproduced here; pinned by `counts absolutely across year boundaries, so sizes of 12 and beyond work` (periods.test.ts) |

A schedule that legacy misfired (or permanently stalled) around these edges fires correctly
under `recurring_cron`. That is a behavior change for the affected instants, by design.

## 2. Week boundaries are pinned to Sunday-start

Legacy used moment's `.week()`, which is locale-dependent. On the default en locale weeks start
on Sunday, and `recurring_cron` pins that definition explicitly (`startOfSundayWeek` in
`periods.ts`). An instance that ran moment with a Monday-start locale would have had its
week boundaries one day later; such setups see the boundary shift. One documented definition
replaces an implicit locale-dependent one.

## 3. The same-period pass (`elapsed === 0`) applies to all units

Legacy allowed a same-period refire only for weeks (`week === lastExecution`, so "every 2 weeks
on Mon AND Wed" fires both days of a fire-week). The domain gate applies `elapsed === 0` to
hours, days, weeks, and months uniformly.

For node-generated schedules this is unobservable: only the weeks unit produces anchors with
more than one position per period (a weekday set). Hours/days/months anchors fire at most once
per period, so the branch never triggers. A hand-written domain schedule with a multi-position
anchor (say two times of day with a days gate) would fire all its positions on a fire-day. This
is the sensible generalization of the weeks rule, but it is a semantic superset of legacy.

## 4. Hours count wall-clock steps, not elapsed physical time

Deviation from the C2 branch's cadence math, which counted real elapsed hours. `recurring_cron`
counts clock-label steps in the schedule timezone (23:30 to 01:30 is 2 hours regardless of DST).

Why: the node keeps a `*/N` step cron AND an active gate for divisible hour strides (24 % N == 0).
Across spring-forward, the anchor's 00:30-to-06:30 gap is only 5 physical hours; a real-elapsed
size-6 gate would wrongly skip that candidate. Wall-clock counting matches the legacy label
semantics and keeps the redundant case correct. The flip side: "every 5 hours" can be 4 or 6
physical hours across a DST transition. Pinned by the two `redundant divisible hours` tests and
`every 5 hours on an hourly expression: five clock hours apart` (next-run.test.ts), plus the
spring-forward/fall-back cases in periods.test.ts. Safe on fall-back because cron-parser fires a
repeated local time once.

## 5. A stride of 1 is rejected

`recurrenceSize` must be an integer >= 2 (`src/core/recurrence/validate.ts`). A size-1 gate is
the anchor's own cadence, i.e. a plain `cron`, and the node never activates recurrence for
N == 1 (nor does the C2 registrar persist it). Rejecting it keeps one representation per
schedule. Pinned by `rejects a stride of 1 (that is a plain cron) and other non-strides`
(validate.test.ts). C2 allowed size 1 through as a keep-everything gate.

## 6. Pathological anchor/gate pairings error instead of spinning

`computeNextRunAt` scans at most 10,000 anchor candidates for one on-cadence fire, then throws
`InvalidScheduleError` (an every-second anchor gated to every 3 weeks would otherwise scan
~1.8M candidates per advance). Not reachable from node-generated schedules; a domain-level
safety bound. Pinned by `throws when no candidate lands on cadence within the scan bound`
(next-run.test.ts).

## Non-deviations worth stating

- First fire of a fresh rule is ungated (next anchor instant), exactly like legacy
  `lastExecution === undefined`. The domain exposes this as `computeFirstRunAt`, the one
  seeding API, so job writers cannot gate the first fire by accident.
- Catch-up after downtime (`elapsed >= size` passes) matches legacy HEAD's self-healing
  comparison; there is no permanent skip and no reliance on workflow staticData.
- The gate is an elapsed-period gate, not a keep-1-of-N candidate counter, which is what keeps
  the redundant divisible cases (`*/6` hours, `*/3` months with an active gate) correct.
