# Count executions in one ledger, with a summary table for each feature

Date: 2026-10-22

Status: Active

Decision Owner: Governance & Observability

Source: https://app.notion.com/p/dcc5b6e0c94f834295d301724c58b0a3

## Context

n8n counts executions in three places. Each count has its own storage and its own rules:

- The licence count folds `workflow_statistics_delta` rows into `workflow_statistics` every
  5 s. It keeps lifetime totals for each workflow, with no project and no period.
- Insights keeps runs in a memory buffer, writes them to `insights_raw` every 30 s, and compacts
  them into `insights_by_period`. A crash loses the buffer. An admin can turn the module off.
- The Cloud quota keeps a monthly counter in a file on the instance.

The counts disagree, because their rules differ. Execution limits need a count for each project,
at run start, that includes agent messages. None of the three counts has this data.

## Decision

Every count of executions reads one append-only table, `execution_ledger`. Each feature keeps its
own summary table, and a fold step fills it from the ledger.

1. The ledger stores facts, not counts. One row records one event of one run: `started` or
   `ended`, with the project at the time of the event, the mode, the source, the outcome and the
   reason for a block. Workflow runs and agent messages use the same table.
2. Every run writes a `started` row in the same transaction as its execution row, and an `ended`
   row when it ends. One event writes one row. No run updates a row that other runs also update.
3. A fold runs every 5 s. It claims a batch of rows, runs every fold step in one transaction, and
   deletes the claimed rows. A failed fold delays the counts. It does not lose them.
4. Each feature keeps the summary table that fits its reads. `workflow_statistics` and
   `insights_by_period` stay. Only their writer changes, so the licence numbers do not change.
5. One file in `@n8n/backend-services` holds every counting rule, for example
   `isBillableExecution`. Every fold step uses it. No fold step keeps its own copy of a rule.
6. A feature that must decide at the moment of an event reads at record time, beside the ledger
   insert. A feature that accepts about 5 s of delay reads its summary table.

The main reason: one record of the facts lets every feature count the same runs. No feature needs
its own write path, and no run waits on a shared row.

## Alternatives Considered

1. **One generic summary table for all features**, with the rules applied when a feature reads.
   We rejected it for three reasons. The licence count would move to a new table, so it would
   need a baseline and weeks of parity checks. A limit check on each run would sum the table. In
   a prototype, this cost 377% Postgres CPU on one busy workflow at 1,500 runs/s. The table would
   also keep lifetime totals, so it could not be pruned. Its one benefit: a new feature could read
   old data.
2. **A separate counter for limits, with its own database write.** We rejected it because it would
   add a write on every run, and a fourth number to explain.
3. **Build on Insights.** We rejected it because Insights can lose its buffer, an admin can turn it
   off, and it moves history when a workflow moves to another project. It also does not store
   manual runs, sub-workflows or `internal` runs. The licence count needs all of these, for the
   lifetime of the instance.
4. **Write into the totals directly, with no ledger.** We rejected it because every run would
   update the same rows. On Postgres this blocks runs on one row lock and uses every database
   connection. `workflow_statistics_delta` exists to avoid this.

## Consequences

1. Counts are up to about 5 s late. An exact limit needs an atomic counter beside the ledger
   insert. The ledger stays the record, and it can fill the counter again.
2. A summary table that a feature adds later starts with no history, because the fold deletes the
   ledger rows.
3. Every run writes two rows. In a prototype, the `started` row added about 300 B of WAL for each
   run.
4. The licence count and Insights fold in the same transaction, so they always count the same set
   of runs. A failing fold step delays every other step. The fold needs bounded retries, and a way
   to set the rows of a failing step aside without losing them.
5. A fold step does only small upserts on small tables. It makes no network call.
6. On SQLite, `workflow_statistics` updates up to 5 s after a run ends. The fold holds the write
   lock for a few milliseconds every 5 s.
7. Engine v2 runs live in the data-plane database, which the control plane cannot read. They need
   their own path into the ledger.
8. On Postgres, a deleted ledger row frees its space only after autovacuum. The ledger needs the
   same autovacuum settings as `workflow_statistics_delta`.
9. A change to a counting rule applies to new runs only. A change to a past number needs a
   migration of that summary table.

## Links

RFC: https://app.notion.com/p/dcc5b6e0c94f834295d301724c58b0a3

Documentation: https://app.notion.com/p/3fb5b6e0c94f813cacacef938bc0bd8c

Related ADRs: -
