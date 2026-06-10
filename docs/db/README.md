# Database schema documentation

Auto-generated documentation of the n8n database schema, one set per supported
database:

- [SQLite](./sqlite/README.md)
- [PostgreSQL](./postgres/README.md)

Each set lists every table with its columns, types, defaults, indexes, and
foreign keys, plus a Mermaid ER diagram of the relationships. The two differ
where the column types do (e.g. `datetime` vs `timestamptz`, `text`/`simple-json`
vs `json`/`jsonb`, `boolean` representation).

## How it's generated

The schema is defined by the **migrations**, not the entities (entities run with
`synchronize: false`). The generator spins up an empty database, runs the full
`@n8n/db` migration set against it, and points [tbls](https://github.com/k1LoW/tbls)
at the result. SQLite uses a throwaway file; PostgreSQL uses a throwaway
testcontainer, so **Docker is required**.

```bash
# Regenerate both (requires Docker; tbls locally via `brew install tbls`)
pnpm db:schema:docs

# Verify the committed docs match the current migrations
pnpm db:schema:check
```

These docs are **auto-generated — do not edit by hand.** CI fails when a
migration changes the schema but the docs weren't regenerated; when that
happens, run `pnpm db:schema:docs` and commit the result.
