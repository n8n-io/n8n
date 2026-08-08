# Database

n8n persists its state in a relational database, accessed through TypeORM. The
schema supports both SQLite (the default) and PostgreSQL, and is defined by the
**migrations** in `@n8n/db` rather than the entities (entities run with
`synchronize: false`).

## Schema reference

Auto-generated documentation of the schema, one set per supported database:

- [SQLite](./generated/sqlite-schema/README.md)
- [PostgreSQL](./generated/postgres-schema/README.md)

Each set lists every table with its columns, types, defaults, indexes, and
foreign keys, plus a Mermaid ER diagram of the relationships. The two differ
where the column types do (e.g. `datetime` vs `timestamptz`, `text`/`simple-json`
vs `json`/`jsonb`, `boolean` representation).

### How it's generated

The generator spins up an empty database, runs the full `@n8n/db` migration set
against it, and points [tbls](https://github.com/k1LoW/tbls) at the result.
SQLite uses a throwaway file; PostgreSQL uses a throwaway testcontainer, so
**Docker is required**.

```bash
# Regenerate both (requires Docker; tbls locally via `brew install tbls`)
pnpm db:schema:docs

# Verify the committed docs match the current migrations
pnpm db:schema:check
```

The schema reference is **auto-generated — do not edit by hand.** CI fails when
a migration changes the schema but the docs weren't regenerated; when that
happens, run `pnpm db:schema:docs` and commit the result.
