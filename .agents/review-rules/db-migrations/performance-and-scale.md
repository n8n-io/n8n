# Performance and scale

Applies to: `packages/@n8n/db/src/migrations/**`.

`execution_entity` and `workflow_entity` hold millions of rows. Never assume a
table is small.

Flag:

- an unbounded `SELECT` into Node. Use `runInBatches`;
- row-by-row updates where one `UPDATE … FROM` does the work;
- a dataset in memory that grows with the table;
- a table rewrite on a hot table: `ALTER … TYPE`, `SET NOT NULL`, SQLite
  recreation;
- an index built on a huge table;
- a `LIKE '%…%'` scan over a JSON column;
- a large blob column added to a hot row.

Every index slows every write, so an index with no query to serve is a finding.
But grep for the table and column first. Without that grep, say the query pattern
is unverified.

A nullable column with no backfill is cheap on Postgres. Do not comment on it.
On SQLite it is cheap only when added with raw `ALTER TABLE ADD COLUMN`. The DSL
`addColumns` recreates the whole table. On a hot table, flag that.
