# n8n Schedule Control Panel

This README is the guide for the Schedule change and the document that should accompany the pull request. It explains what the extension adds, what is intentionally included in V1, where the implementation lives, which limitations remain, and what a real V2 would require.

## Why This Exists

The goal was not to build a separate dashboard next to n8n. The goal was to add schedule visibility to the place where operators already inspect production behavior: the native Insights experience.

The result is a Schedule tab that behaves like part of Insights instead of a parallel product surface.

## What The Extension Adds

The Schedule feature ships as a native extension inside the existing Insights shell.

It adds:

- a native `Schedule` tab in the Insights summary strip
- a Schedule control panel rendered inside the existing Insights page shell
- a forecast-oriented `custom` mode for current workflow definitions
- a historical `n8n` mode for actual workflow starts from executions
- 15-minute slot charts, grouped tables, settings, filters, and timezone context

## Product Shape In V1

### Custom mode

`custom` mode is forecast-first.

- It reads the current workflow definitions.
- It parses schedule-aware trigger nodes.
- It calculates expected activations in 15-minute slots.
- It renders one or more day panels depending on the selected preset.
- It keeps the grouped table at trigger level.

Custom mode supports three window presets:

- `today`
- `nextSevenDays`
- `todayPlusMinusThree`

Custom mode also supports two time bases:

- `calculated`: forecast-only for the full window
- `realTime`: completed slots are replaced with actual workflow starts while the current and future slots remain predicted

The `nextSevenDays` preset intentionally stays forecast-only.

### n8n mode

`n8n` mode is historical V1.

- It reuses the visible native Insights date range.
- It fetches executions from `/executions`.
- It keeps only runs for schedule-aware workflows with execution mode `trigger`.
- It buckets actual workflow starts into 15-minute slots.
- It renders historical charts and a workflow-level historical table.

This is intentionally honest historical V1. It does not claim trigger attribution.

## Scope Of This Change

The current change includes:

- native Schedule route and shell integration inside Insights
- custom forecast windows for `today`, `nextSevenDays`, and `todayPlusMinusThree`
- 15-minute charts and multi-day day panels
- compact, expanded, and manual density handling
- persisted chart cap, density, filters, and column widths
- grouped trigger tables with workflow and trigger status kept separate
- `calculated` versus `realTime` behavior in custom mode
- workflow-timezone-aware trigger placement with instance-time rendering
- server-time and UTC KPI cards
- current-slot highlighting
- partial-data warnings when the current frontend execution fetch cap truncates historical results

## Implementation Shape

The feature extends the real n8n fork and keeps almost all new logic inside the Schedule folder.

### Native Insights touchpoints

- `packages/frontend/editor-ui/src/features/execution/insights/insights.constants.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/module.descriptor.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/components/InsightsSummary.vue`
- `packages/frontend/editor-ui/src/features/execution/insights/components/InsightsDashboard.vue`
- `packages/frontend/@n8n/i18n/src/locales/en.json`

### Schedule feature files

- `packages/frontend/editor-ui/src/features/execution/insights/schedule/components/ScheduleControlPanel.vue`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/composables/useScheduleData.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/lib/types.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/lib/schedule.utils.ts`

### Test files covering this change

- `packages/frontend/editor-ui/src/features/execution/insights/components/InsightsSummary.test.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/components/InsightsDashboard.test.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/components/ScheduleControlPanel.test.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/composables/useScheduleData.test.ts`
- `packages/frontend/editor-ui/src/features/execution/insights/schedule/lib/schedule.utils.test.ts`

## Key Product Decisions

### No parallel dashboard

The Schedule feature is intentionally part of the existing Insights shell. This keeps routing, layout, and operator workflow native.

### Forecast remains frontend-led in V1

The custom forecast path is still calculated from the current workflow definitions in the frontend. That was the smallest implementation that could ship useful schedule visibility without backend work.

### Historical V1 stays workflow-level

Historical V1 uses actual workflow starts, but only at workflow level. That boundary is deliberate because current APIs do not provide reliable trigger attribution for past runs.

### Time handling stays operator-facing

The final time behavior is:

- trigger placement respects each workflow's effective timezone
- charts, labels, and tables render in instance time
- a separate UTC KPI stays visible for comparison
- the grouped custom table shows compact timezone labels such as `EDT (-4)`

### Table filters are table-only

The persisted filters for unpublished workflows, disabled triggers, and zero-hit rows only affect row visibility. KPI cards and charts continue to use the full collected dataset.

## Current Limitations

The current implementation is complete for the intended first phase, but several boundaries are deliberate.

### Not part of V1

- trigger-attributed historical schedule data
- trigger-level historical grouped tables
- a dedicated backend schedule-history endpoint
- a durable schedule fact store
- historical reconstruction from past workflow versions
- exact attribution for multi-trigger workflows

### Practical limitations in the shipped version

- historical V1 depends on a frontend fetch cap for `/executions`
- the UI warns when results are partial, but it still cannot exceed that cap
- historical slot detail is intentionally limited to short windows
- V1 only knows the current workflow definition, not the historical definition at run time

## Validation Status

Validation for the touched area is focused instead of monorepo-wide.

The Schedule change is covered by focused tests around:

- native tab and route integration
- schedule parsing and slot bucketing
- forecast and historical data loading
- panel rendering, filters, settings, density behavior, and warnings

The current restored implementation was revalidated with the focused Schedule and Insights test set and the changed files are clean in the editor diagnostics.

## What V2 Actually Means

V2 is not “more frontend inference”. V2 is backend work.

The core requirement is exact trigger-attributed historical schedule data.

That requires:

- trigger-attributed schedule execution facts, or an equivalent durable history model
- a dedicated backend schedule-history endpoint
- explicit handling of unattributed executions instead of guessing
- optional hybrid-today behavior on top of trigger-attributed actuals

V2 must explicitly avoid:

- guessing which trigger fired from the current workflow definition
- duplicating one execution across multiple schedule triggers
- hiding unattributed executions
- replacing a backend history model with execution-detail fan-out in the frontend

## Recommended V2 Direction

The next real extension step is:

1. Collect schedule execution facts on the backend.
2. Expose a dedicated schedule-history endpoint.
3. Switch `n8n` mode from workflow-level history to trigger-attributed history.
4. Add hybrid-today behavior only after trigger-attributed history exists.

Until that exists, the current V1 should stay honest about what it can and cannot know.