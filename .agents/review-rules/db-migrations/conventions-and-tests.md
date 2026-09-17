# Migration conventions and tests

Applies to: `packages/@n8n/db/src/migrations/**`, `packages/cli/test/migration/**`.

`.agents/skills/db-migrations/SKILL.md` is the standard; prefer it over your
priors. Read a recent migration for the local idiom.

Flag:

- a hand-written table prefix or quoted identifier. Use `escape.tableName()` and
  `escape.columnName()`;
- `queryRunner.query()` where `runQuery()` belongs, or `console.log` where the
  context `logger` belongs;
- a value import of an entity, or a cross-package import;
- a timestamp that is not above every existing migration;
- a hand-edited generated index file;
- an 80-line `up()` that needs named private methods.

Precedent beats generic style opinion, but it is not a defence. An older migration
doing it wrong makes the finding informational.

## Tests

A data migration needs an integration test. Reading cannot verify its assumptions
about row shape, JSON and NULLs. Say so when there is none. A good test sets up
with `initDbUpToMigration`, runs with `runSingleMigration`, and covers both
engines, `down()`, and dirty rows. A happy-path test, on a migration that claims
to handle bad data, is worth a comment. For a schema-only migration the DSL calls
are enough, so a missing test is informational.

Regenerate the migration index files and the schema docs in `docs/generated/` when
the schema changes. Check the changed file list before you call one stale.
