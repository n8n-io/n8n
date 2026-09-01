# Project-Level Execution Limits (PoC)

## Problem

Admins have no way to cap how many workflow executions a project consumes in
a given period, and no way to see consumption against a limit. This is one of
the highest-volume asks in the Insights/Initiatives feedback data — regulated
and multi-team customers (BMW, Trade Republic, Autodesk, CrowdStrike, Sixt,
ABL Bank among others) repeatedly ask for execution rate limits, quotas, and
"prevent one team from consuming all executions" style governance. Several of
these are already tracked as initiatives ("Project & instance policies -
limits", "Worker Isolation, Priorities & Governance") but none are built.

This is a PoC, not a mergeable feature — it demonstrates a working mechanism
end to end (data model, enforcement hook, license-quota resolution, UI) using
the same patterns n8n already uses for other numeric license quotas, framed
the same way as the prior `poc-workflow-tests` PoC (draft PR, not to merge
as-is).

## Goals

1. An instance admin can set an execution limit for a project, scoped to a
   period (day / week / month) — not a lifetime cap.
2. A project member can see their project's limit and current consumption for
   the active period.
3. Executions are hard-rejected once a project's quota for the current period
   is exceeded (no queueing, no overage grace buffer).
4. The quota's notion of "an execution" uses the same mode-based inclusion
   rules as the existing Insights module, so the two numbers agree for the
   same project/period except for one documented edge case (canceled runs,
   see "Consistency with Insights").
5. A workflow whose execution volume spikes far beyond its own historical
   norm is flagged (not blocked) so an admin can act on it manually.

## Non-Goals

- Worker-level limits (no job-routing/worker-affinity infrastructure exists
  today — `scaling.service.ts` uses a single shared queue; this is a
  separate, much larger initiative).
- Instance-level limits as a standalone concept (only per-project, admin-set).
- ML/statistical anomaly detection — the spike-guard is a fixed-multiplier
  flag, not a learned baseline.
- Billing/overage mechanics — this is a governance block, not metered billing.
- Queueing or auto-throttling executions when a quota is hit.

## Design

### Data Model

Two new tables, isolated from `Project` and `ExecutionEntity` (no migration
risk to core entities):

```typescript
// project_execution_quota — one row per configured project.
// No row = falls back to license quota / tier default (unlimited in PoC).
{
  projectId: string;      // FK -> project.id, PK
  limit: number;
  periodUnit: 'day' | 'week' | 'month';
  createdAt: Date;
  updatedAt: Date;
}

// execution_counter — live, fast-incrementing counter.
// One row per (project, workflow, period bucket).
{
  id: string;
  projectId: string;
  workflowId: string;
  periodUnit: 'day' | 'week' | 'month';
  periodStart: Date;      // bucket start, e.g. 2026-09-01T00:00:00Z for 'day'
  count: number;
  updatedAt: Date;
}
```

`execution_counter` is deliberately workflow-grained, not just
project-grained: the project quota check is `SUM(count) WHERE projectId = X
AND periodUnit = ... AND periodStart = <current bucket>`, and the same rows
give the spike-guard its per-workflow daily counts for free — one table, two
features, no duplicated tracking.

### License Quota Resolution

New `resolveProjectExecutionQuota(projectId)` in a new
`packages/cli/src/execution-quota/project-execution-quota.helper.ts`,
copying the existing precedence chain from
`evaluation-concurrency.helper.ts:resolveEvaluationConcurrencyLimit()`
(env var override → license quota → plan-tier default):

1. A `project_execution_quota` row for this project, if present.
2. `LICENSE_QUOTAS` entry `quota:executions:maxPerProjectPerPeriod` (new),
   read via `LicenseState` following the `getMaxTeamProjects()` /
   `getMaxUsers()` typed-getter pattern.
3. `UNLIMITED_LICENSE_QUOTA` sentinel (`-1`) if neither is set.

In the local PoC demo there is no real license server, so step 2 always
resolves to a hardcoded tier default — the shape is what would ship, the
value is stubbed.

### Enforcement

Hooked into `ActiveExecutions.add()` (`packages/cli/src/active-executions.ts`),
the same point where `ConcurrencyCapacityReservation` already reserves
capacity before a run proceeds:

1. Resolve the execution's project via `SharedWorkflow`.
2. Compute the current period bucket for that project's configured
   `periodUnit`.
3. Check `SUM(execution_counter.count)` for that project + bucket against
   `resolveProjectExecutionQuota(projectId)`.
4. If at or over the limit: reject immediately with a new
   `ProjectExecutionQuotaExceededError`, surfaced to whatever triggered the
   run (manual run, webhook, trigger).
5. If allowed: upsert-increment the `execution_counter` row for
   `(projectId, workflowId, periodUnit, periodStart)` — same call, same
   transaction.

No queueing, no soft-then-hard grace buffer — a rejected execution simply
does not start, matching the "prevent," not "meter," framing the customer
asks use.

### Consistency with Insights

`insights-collection.service.ts` decides what counts as a countable execution
using two filters: `shouldSkipMode()` (manual and agent-mode executions are
excluded; evaluation-mode is included) and `shouldSkipStatus()` (only
`success`/`crashed`/`error` are countable; `canceled`/`new`/`running`/
`unknown`/`waiting` are not). Insights applies both because it only writes a
row once an execution has *finished* (`workflowExecuteAfter`).

The quota gate fires *before* an execution starts (`ActiveExecutions.add()`),
so it can only know the mode at that point, not the eventual status. The
`execution_counter` increment therefore applies `shouldSkipMode()` only.

**Known gap, documented rather than hidden:** an execution that starts,
increments the counter, and then ends in a status Insights would skip (most
notably `canceled`) will count against the project's quota without ever
appearing in Insights. This is the one case where the two numbers can
diverge. A production version of this feature would need to decrement the
counter on cancellation to close the gap; the PoC documents it instead of
solving it.

**Reconciliation check (part of the test plan, not a runtime assertion):**
for executions that reach a countable terminal status (success/crashed/
error), once Insights' compaction has caught up, `SUM(execution_counter.count)`
for a project+period must equal what
`insights.service.ts:getInsightsSummary({user, projectId, startDate, endDate})`
reports for the same window. The PoC test seeds only clean-completing
executions (no cancellations) so the comparison is exact for that scenario.

**Second known exception — workflow deletion:** `project_execution_counter`
has a `CASCADE` foreign key on `workflowId` (and on `projectId`), so deleting
a workflow (or its project) deletes its counter rows outright. Insights'
metadata table (`InsightsMetadata`) instead does `SET NULL` on workflow
deletion by design, so a deleted workflow's historical Insights rows survive
(orphaned but intact) while its quota-counter rows do not. For any window
that includes a workflow later deleted, `SUM(execution_counter.count)` and
the equivalent Insights query can therefore diverge — not because either
number is wrong, but because they encode different retention intents
(fast-moving enforcement state vs. durable reporting history). As with the
canceled-executions exception above, the PoC documents this rather than
reconciling the two tables' deletion semantics.

### Spike-Guard (flag only)

Computed on demand (no new scheduled job for the PoC) when a project's
consumption view is queried:

1. For each workflow in the project, take today's `execution_counter.count`.
2. Compute the trailing 7-day daily average for that workflow from
   `InsightsByPeriod` **hour-unit** rows (joined through `InsightsMetadata`
   on `workflowId`), summed per calendar day and averaged over the trailing
   7 days, excluding today. Day-unit rows are not usable here: hour→day
   compaction only runs for data older than `compactionHourlyToDailyThresholdDays`
   (default 90 days), so day rollups don't exist yet for recent activity in
   any realistic PoC timeframe. Hour rollups compact on every cycle with no
   age threshold, so they're always available.
3. Flag the workflow if today's count > 5x that average.

Flags are informational only — returned alongside the consumption data, never
gating `ActiveExecutions.add()`. This mirrors the one working precedent found
in market research (Zapier's Flood Protection holds for human confirmation
rather than auto-blocking) rather than attempting real baseline learning.

### API Surface

- `GET /projects/:id/execution-quota` → `{ limit, periodUnit, consumed,
  remaining, resetsAt }`
- `PUT /projects/:id/execution-quota` → set/update `{ limit, periodUnit }`,
  gated by a project-admin scope (new `project:manageExecutionQuota` scope,
  following the pattern in `project-scopes.ee.ts`)
- `GET /projects/:id/execution-quota/spikes` → `[{ workflowId, workflowName,
  todayCount, baseline, multiplier }]`

### Frontend

- New "Execution limits" section in project settings — numeric input +
  period-unit dropdown, following the existing modal-form pattern in
  `WorkflowSettings.vue`. Visible/editable only with the new scope.
- A consumption card on the project view: used / limit progress bar +
  period reset countdown, reusing the project-filtered Insights query
  pattern already used for KPI cards.
- A spike badge next to any flagged workflow in the project's workflow list.

## Testing Plan

- Unit tests for `resolveProjectExecutionQuota()` (override → license →
  default precedence) and the enforcement check in `ActiveExecutions.add()`.
- Unit test for the Insights-consistency reconciliation described above.
- A Playwright demo script (mirroring `demo-walkthrough.mjs` from
  `poc-workflow-tests`): seed a project with a small quota (e.g. 3/day), run
  executions past it, capture the block and the consumption UI, capture a
  seeded spike being flagged.

## Out of Scope / Future Work

- Worker-level limits (needs job-routing/worker-affinity infra first).
- True anomaly detection (baseline learning, seasonality) vs. fixed
  multiplier.
- Auto-throttle-on-sustained-spike (currently flag-only).
- Billing/overage integration.
- Admin-configurable spike multiplier (fixed 5x default for the PoC).

## Open Questions (resolved)

| Question | Decision |
|---|---|
| Behavior when a project exceeds its quota mid-period | Reject immediately, no queueing, no grace buffer |
| Spike-guard trigger | Fixed default multiplier (5x trailing 7-day average), not admin-configurable in the PoC |
| Should manual/test executions count toward quota? | No — match Insights' existing `shouldSkipStatus`/`shouldSkipMode` exclusions, for numeric consistency with Insights |
