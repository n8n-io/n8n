# @n8n/backend-module-execution-ledger

Owns the `execution_ledger` table: one row when a run starts and one when it ends. It also owns
`execution_ledger_parked`, which holds the rows that a fold step could not fold. Fold steps
from other modules read the rows through the contract in `@n8n/db`. The module is opt-in: enable
it with `N8N_ENABLED_MODULES=execution-ledger`.

Core code records runs through the `ExecutionLedger` service in `@n8n/backend-services`. At init, the module
binds `ExecutionLedgerRowWriter` to that service. When the module is off, the service does
nothing. The writer records workflow runs only (`entityType = workflow`). Agent messages have no
execution row and get their own hook in a later ticket.

A row has a null `projectId` when the workflow has no owner project. The `ExecutionLedger` service
also logs an error for it. A fold step that counts for each project must skip the row. A fold step
that counts for the instance must include it.

Every 5 seconds, the `execution-ledger-fold` system task claims a batch of rows and runs every
registered fold step on it, in one transaction with a savepoint for each step. When no step is
registered, the fold does not claim rows.

## When a fold step fails

- The fold runs the failing step again at once, in the same transaction. A deadlock or a
  short lock wait does not park rows.
- If the step fails again, the fold copies the batch to `execution_ledger_parked` with the
  name of the step, and commits the other steps. The parked step does not run its
  after-commit work. A failing step thus never stops the other steps.
- If two steps fail on the same batch, the batch is parked one time for each step, in the
  same run.
- A row that is already parked for a step is not parked again for it.
- A row with a value that this version does not know (for example, a new `outcome` from a newer
  main during a rolling upgrade) is parked with the step name `_unreadable`. The other rows of
  the batch are folded.
- The park is in the fold transaction. If the transaction is lost, or the park fails, nothing
  is parked and the rows stay in the ledger.

Parked rows stay in the table until a replay gives them to the step again. Do not delete them
by hand: no step has counted them.

## Writing a fold step

A throw parks the full batch for the step, up to 5,000 rows. Most bad data affects one row
only, so the step must handle it. Obey these rules:

- Do not throw for one bad row. Skip the row, count it, and log it.
- Do not add a foreign key from a fold table to a workflow or a project. The workflow or
  the project can be deleted before the fold runs, or before a replay.
- Group the rows by key before an upsert. On Postgres, one `INSERT ... ON CONFLICT DO UPDATE`
  cannot change the same row two times.
- Sort the keys before you write them. Two writers that lock rows in the same order cannot
  deadlock.
- Read and write only through `ctx`. A query outside the fold transaction can wait for a
  connection that the fold holds.
- Do not fill an in-memory cache in `fold()`. A rollback can undo the rows that the cache
  points to. Fill the cache in the after-commit work.
- Keep values in the range of their columns. Round values for integer columns, and use
  `bigint` for sums.

The n8n runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-execution-ledger
pnpm turbo lint --filter=@n8n/backend-module-execution-ledger
pnpm turbo test --filter=@n8n/backend-module-execution-ledger
pnpm --filter @n8n/backend-module-execution-ledger test:postgres   # needs Docker
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `scripts/backend-module/backend-module-guide.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Monitoring

Set `N8N_METRICS=true` and `N8N_METRICS_INCLUDE_EXECUTION_LEDGER_METRICS=true`. Only main
instances report these metrics, and only when the module is on. The default prefix is `n8n_`.

| Metric | Type | What it shows |
|---|---|---|
| `execution_ledger_backlog_rows` | gauge | Upper-bound estimate of the rows that no fold has claimed yet, at the last refresh. |
| `execution_ledger_backlog_oldest_row_age_seconds` | gauge | Age of the oldest unclaimed row. 0 when the ledger is empty. |
| `execution_ledger_fold_last_success_timestamp_seconds` | gauge | Last fold that held the lock and committed. |
| `execution_ledger_fold_rows_total` | counter | Rows claimed, parked rows included. Its rate is the fold throughput. A step that parks every batch shows in `fold_step_failures_total`, not here. When `backlog_rows` grows while the rate stays flat, the fold does not keep up. |
| `execution_ledger_fold_step_failures_total{step}` | counter | Failed fold attempts for each step. |

The backlog gauges read only the primary key, so the query stays cheap at any backlog size.
The count comes from the id range. Each run that rolled back since the fold last caught up
adds one to it, so a long stall with many rollbacks can overstate the backlog. The result
is cached for 60 seconds and shared by all mains, so it can lag behind new rows.

Any main can run the fold, so a main that stopped folding keeps its old fold metrics. Aggregate across mains: `max()` for the timestamp, `sum()` for counters.

When the fold parks a batch for a failing step, it logs one error in the `execution-ledger`
scope with `step`, `firstLedgerId`, `rows` and `error`. It also reports a
`FoldStepFailedError` to Sentry, with the name and message of the step error in `extra` and a
`foldStep` tag. Sentry drops a repeat of the same error in the same process, so do not count
parks in Sentry: use the logs or `fold_step_failures_total`.

When the fold parks rows that it cannot read, it logs one error with `rows` only.

Suggested alert rules:

```promql
# Fold lag: no successful fold for 2 minutes.
time() - max(n8n_execution_ledger_fold_last_success_timestamp_seconds) > 120
# Same signal from the database. It still works after a restart or when another main takes over.
max(n8n_execution_ledger_backlog_oldest_row_age_seconds) > 300
# A step failed. Each park adds 2 failures, a retry that worked adds 1.
sum by (step) (increase(n8n_execution_ledger_fold_step_failures_total[5m])) >= 2
```

When the module is on but no fold step is registered, the fold claims nothing and the lag
alert fires. Treat this as a configuration error.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
  Importing the entrypoint runs the `@BackendModule` decorator.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
- Keep TypeORM imports in entity and repository files. A repository composes a
  file-private `BaseRepository` table and exposes only use-case methods. It does
  not extend `BaseRepository`.
