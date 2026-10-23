# Postgres and SQLite compatibility

Applies to: `packages/@n8n/db/src/migrations/**`.

A migration in `common/` runs on both engines. Judge them separately. A change
that is safe on Postgres can lose data on SQLite.

## The CASCADE trap on SQLite

Six DSL helpers recreate the table on SQLite: `addColumns`, `dropColumns`,
`addNotNull`, `dropNotNull`, `addEnumCheck`, `dropEnumCheck`. TypeORM copies the
rows to a temp table, drops the original and renames. If another table has an
incoming `ON DELETE CASCADE` foreign key, that `DROP` **deletes its rows**.

This is the most valuable check on any SQLite migration. The
`{ recreatesOnSqlite: true }` argument is an acknowledgement, not a fix. Check the
target table for incoming CASCADE foreign keys. If it has them, the migration
needs a `sqlite/` subclass with `withFKsDisabled = true as const`, or raw
`ALTER TABLE ADD COLUMN` when every new column is nullable or has a default. Say
so if you cannot check.

## Everything else

In a `common/` migration, flag Postgres-only SQL — `ALTER COLUMN … TYPE`,
expression indexes, `gen_random_uuid()` — raw SQL that assumes one engine's
boolean literal or quoting, and `INSERT OR REPLACE` where `ON CONFLICT DO NOTHING`
was meant. `varchar(N)` enforcement, transactional DDL, JSON and timestamp
handling, and NULL in unique constraints all differ.

A dialect migration belongs in `postgresdb/` or `sqlite/`. Read the DSL source
before you claim how a helper behaves.
