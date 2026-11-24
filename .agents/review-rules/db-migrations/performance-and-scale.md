# Performance and scale

Applies to: `packages/@n8n/db/src/migrations/**`.

A busy table can hold millions of rows, or the app writes to it often.
`DEFAULT_BUSY_TABLES` in
`packages/quality/policy/code-health/src/rules/migration-busy-table.rule.ts`
lists the busy tables, for example `execution_entity` and `workflow_entity`.
Never assume a table is small.

Flag:

- an unbounded `SELECT` into Node. Use `runInBatches`;
- a `runInBatches` query with no `ORDER BY` on a unique column, or one that
  filters on the column the batch writes. Its offset skips rows;
- row-by-row updates where one `UPDATE … FROM` does the work;
- a dataset in memory that grows with the table;
- a table rewrite on a busy table: `ALTER … TYPE`, `SET NOT NULL`, SQLite
  recreation;
- the same SQLite table recreated more than once in one migration;
- an index built on a busy table with no measured build time in the PR;
- a `LIKE '%…%'` scan over a JSON column;
- a large blob column added to a busy table.

Every index slows every write, so an index with no query to serve is a finding.
But grep for the table and column first. Without that grep, say the query pattern
is unverified.

A nullable column with no backfill is cheap on Postgres. Do not comment on it.
On SQLite it is cheap only when added with raw `ALTER TABLE ADD COLUMN`. The DSL
`addColumns` recreates the whole table. On a busy table, flag that.
