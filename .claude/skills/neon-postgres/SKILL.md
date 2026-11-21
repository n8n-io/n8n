---
name: neon-postgres
description: >-
  Guides and best practices for working with Lakebase Postgres on Neon:
  connections, pooled vs direct, schema migrations, branching, autoscaling,
  scale-to-zero, instant restore, read replicas, IP allow lists, logical
  replication, and Lakebase Search. Use when the work is an existing
  DATABASE_URL, SQL, schema, inspect, or search. New backends, Auth, files,
  Functions, and LLM calls go to the parent `neon` skill. Live queries, reactive
  UIs, and realtime data go to `neon-realtime`. Also use for
  "@neondatabase/serverless", "@neondatabase/neon-js", "neon inspect db",
  "semantic search", "vector search", "full-text search", "BM25", or
  "hybrid search".
metadata:
  parent: neon
  source: https://github.com/neondatabase/agent-skills/tree/main/skills/neon-postgres
---

**FIRST**: Use the parent `neon` skill for a Neon overview, getting started with Neon, Neon development best practices, and more.

If the `neon` skill is not installed, fetch it from https://neon.com/docs/ai/skills/neon/SKILL.md or install it with:

```bash
neon skills -s neon -y
```

# Lakebase Postgres

Lakebase Postgres is the database at the core of Neon. It runs on the lakebase architecture — OLTP built directly on cloud object storage — which decouples storage from compute to offer autoscaling, branching, instant restore, and scale-to-zero. It's fully compatible with Postgres and works with any language, framework, or ORM that supports Postgres.

It is the same database whether you reach it through Neon or through Databricks; this skill covers the Neon access path.

Login, users, sessions, and `@neondatabase/auth` belong in `neon-auth`.

Live queries, reactive UIs, and realtime data belong in `neon-realtime`.

## Setup Flow

### 1. Select the organization and project

If a `DATABASE_URL` is already supplied (prompt, environment, or repo) or a `.neon` file points at a project, use it. Do not list organizations or create a second project for schema work.

Otherwise use the CLI (default) or MCP server to list organizations and projects. Let the user select an existing project or create a new one.

### 2. Get the connection string

If a `DATABASE_URL` is already supplied, use it. Do not fetch another through the CLI or MCP.

Otherwise use the CLI (default), `neon env pull`, or the MCP server to get the connection string. Store it in `.env` as `DATABASE_URL`. Read the file first before modifying it, to avoid overwriting existing values.

#### When to use pooled vs direct connections

| Use case                                 | Connection type  |
| ---------------------------------------- | ---------------- |
| Web applications, serverless functions   | Pooled (-pooler) |
| Schema migrations                        | Direct           |
| pg_dump / pg_restore                     | Direct           |
| Logical replication                      | Direct           |
| Long-running analytics with temp tables  | Direct           |
| Admin tasks needing SET or session state | Direct           |
| LISTEN / NOTIFY                          | Direct           |

### 3. Pick the connection method and driver

Preserve the existing ORM and driver. For new TypeScript schema work with no established choice, Drizzle is a suggestion: https://neon.com/docs/guides/drizzle.md. Refer to the connection methods guide to pick the correct driver based on how the runtime treats your code: https://neon.com/docs/connect/choose-connection.md.

Driver notes:

- On Vercel, use `node-postgres` (`npm install pg`) with Vercel Fluid compute and `import { attachDatabasePool } from "@vercel/functions";`
- On Cloudflare, use `node-postgres` with Cloudflare Hyperdrive
- On Neon Functions, use `node-postgres`, as the functions are long-running and reuse the pool across requests.
- Use the `@neondatabase/serverless` driver for serverless and edge environments (for example, when using Netlify) — HTTP transport for one-shot queries, WebSocket for transaction support. Link: https://neon.com/docs/serverless/serverless-driver.md

### 4. Set up the schema

Manage schemas and migrations as code. Avoid running ad hoc schema migrations against your database, since they're hard to manage.

If you're using an ORM, follow your ORM's best practices to manage schemas and migrations. For example, if using Drizzle, only use Drizzle for schema and migration management unless instructed otherwise.

## Branching

Use this when the user is planning isolated environments, schema migration testing, preview deployments, or branch lifecycle automation.

Key points:

- Branches are instant, copy-on-write clones (no full data copy).
- Each branch has its own compute endpoint.
- Use the neon CLI or MCP server to create, inspect, and compare branches.

Link: https://neon.com/docs/introduction/branching.md

For detailed branch creation workflows (normal vs schema-only branches, reset-from-parent, CLI/MCP selection), use the `neon-postgres-branches` skill. If it isn't installed, fetch it from https://neon.com/docs/ai/skills/neon-postgres-branches/SKILL.md or install it with:

```bash
neon skills -s neon-postgres-branches -y
```

## Migrations

Test a migration on a branch of production, against production-like data, before applying it to production.

Use a **direct (non-pooled)** connection string when you run the migration, not a pooled one. `neon connection-string` returns the direct string by default; make sure the hostname does not include the `-pooler` suffix.

## Troubleshooting and Neon-Specific Performance

Use Neon's predefined, read-only diagnostics before writing catalog queries by hand. The Neon CLI `neon inspect db` subcommands and the Neon MCP server's `inspect_database` tool run the same checks.

This section covers Neon-specific diagnostic tools, compute cache behavior, and platform signals. When the evidence points to generic Postgres work such as rewriting a query, choosing an index, changing a schema, or interpreting plan nodes, load the [`postgres-best-practices`](https://github.com/neondatabase/postgres-skills/tree/main/skills/postgres-best-practices) skill and carry the diagnostic evidence into that workflow.

Docs:

- CLI: https://neon.com/docs/cli/inspect.md
- Query performance: https://neon.com/docs/postgresql/query-performance.md
- `pg_stat_statements`: https://neon.com/docs/extensions/pg_stat_statements.md
- Neon Local File Cache: https://neon.com/docs/extensions/neon.md

### Choose CLI or MCP

Prefer the Neon CLI when terminal access and authentication are available:

```bash
neon inspect db <check>
```

The CLI resolves the project and branch from the current Neon context. Use `--project-id`, `--branch`, and `--database-name` to override it. Omit `--database-name` to inspect every database on the branch. Use `--db-url` only when inspecting a Postgres database directly instead of resolving it through the Neon API.

When using Neon MCP, call `inspect_database` with `projectId` and one `check`. Pass `branchId`, `databaseName`, or `computeId` only when needed. Omit `databaseName` to inspect all databases on the branch. Increase `limit` only when the result says it was truncated.

### Pick the Diagnostic

| Symptom or question                            | Checks                               |
| ---------------------------------------------- | ------------------------------------ |
| Which relations consume storage?               | `table-sizes`, `index-sizes`         |
| Is an index unused or a table scanned heavily? | `unused-indexes`, `seq-scans`        |
| What has run for 5+ minutes or holds locks?    | `long-running-queries`, `locks`      |
| Which queries consume the most total time?     | `outliers`                           |
| Which queries run most often?                  | `calls`                              |
| Does the active data fit in compute cache?     | `lfc-hit-rate`, `working-set`        |
| Is autovacuum behind or is space wasted?       | `vacuum-stats`, `bloat`              |
| Is logical replication healthy?                | `replication-slots`, `subscriptions` |

Do not confuse these checks:

- `long-running-queries` reports statements running **right now** for more than five minutes.
- `outliers` ranks the top queries by cumulative execution time since statistics were reset. It does not rank by mean latency.
- `calls` ranks by execution count over the same statistics history.

`outliers` and `calls` require `pg_stat_statements`. `lfc-hit-rate` and `working-set` require the `neon` extension. If a check reports a missing extension, ask before running the suggested `CREATE EXTENSION` statement because installing an extension modifies the database.

### Interpret Results Safely

- Treat `unused-indexes` as a candidate list, not permission to drop indexes. Confirm the observation window, constraints, and workload before removal.
- A sequential scan can be correct for a small table or a query reading much of a table. Check table size, selectivity, and the query plan before adding an index.
- `bloat` is a statistical estimate. Confirm the impact and plan locks or maintenance before `VACUUM FULL`, `REINDEX`, or similar remediation.
- Cache and Postgres statistics reset when compute restarts, including scale-to-zero suspension. Run a representative workload before interpreting fresh `lfc-hit-rate`, `working-set`, `vacuum-stats`, or `pg_stat_statements` results.
- Compute-wide checks (`lfc-hit-rate`, `working-set`, and `replication-slots`) run once even when inspecting every database.
- One failing database can fail an all-databases inspection; retry the relevant check with an explicit `databaseName` to isolate it.

### Inspect Neon Cache Behavior Per Query

Standard `EXPLAIN (ANALYZE, BUFFERS)` reports Postgres shared-buffer activity, but it does not show Neon's Local File Cache (LFC) or page prefetching. For a safe read-only query, add Neon's `FILECACHE` and `PREFETCH` options:

```sql
EXPLAIN (ANALYZE, BUFFERS, PREFETCH, FILECACHE)
SELECT ...;
```

- `File cache: hits` counts pages found in the compute's LFC.
- `File cache: misses` counts pages not found in the LFC and fetched from database storage.
- `Prefetch: hits`, `misses`, `expired`, and `duplicates` show how effectively Neon fetched pages before the executor requested them.

`FILECACHE` and `PREFETCH` provide metrics for this query and do not require the `neon` extension. By contrast, `neon inspect db lfc-hit-rate` and `working-set` provide compute-wide statistics and do require the extension.

The MCP `explain_sql_statement` tool can produce a standard plan but does not expose `FILECACHE` or `PREFETCH` options. To collect those Neon-specific metrics through MCP, use `run_sql` with the explicit, read-only `EXPLAIN` statement above.

Because `ANALYZE` executes the statement, use it only when execution is safe; do not run it autonomously for mutating SQL. Compare cold- and warm-cache runs carefully because the first execution can populate the cache and materially change later results.

### Performance Workflow

1. Reproduce the symptom and note its time window.
2. Run the smallest relevant `inspect` checks from the table above.
3. Identify a specific query before changing schema or compute. Use MCP `explain_sql_statement` for a standard plan, or the Neon-specific `EXPLAIN` above when LFC or prefetch behavior matters.
4. If the bottleneck is query shape, indexing, schema, locking, or vacuum behavior, load `postgres-best-practices` and carry forward the inspection results and query plan. Keep Neon compute, cache, connection, and platform decisions in this skill.
5. Re-run the same check and workload to verify the change.

Use MCP `list_slow_queries` instead of `inspect_database` when the user specifically needs queries ranked by average execution time with a custom threshold and limit. Outside the explicit `EXPLAIN` case above, use `run_sql` only for read-only diagnostic SQL when the predefined checks do not answer the question.

## Autoscaling

Use this when the user needs compute to scale automatically with workload and wants guidance on CU sizing and runtime behavior.

Link: https://neon.com/docs/introduction/autoscaling.md

## Scale to Zero

Use this when optimizing idle costs and discussing suspend/resume behavior, including cold-start trade-offs.

Key points:

- Idle computes suspend automatically after a default of 5 minutes; the timeout is configurable, and suspension can only be disabled on the Launch and Scale plans.
- First query after suspend typically has a cold-start penalty (around hundreds of ms)
- Storage remains active while compute is suspended.

Link: https://neon.com/docs/introduction/scale-to-zero.md

## Instant Restore

Use this when the user needs point-in-time recovery or wants to restore data state without traditional backup restore workflows.

Key points:

- History windows for instant restore depend on plan limits.
- Users can create branches from historical points-in-time.
- Time Travel queries can be used for historical inspection workflows.

Link: https://neon.com/docs/introduction/branch-restore.md

## Read Replicas

Use this for read-heavy workloads where the user needs dedicated read-only compute without duplicating storage.

Key points:

- Replicas are read-only compute endpoints sharing the same storage.
- Creation is fast and scaling is independent from primary compute.
- Typical use cases: analytics, reporting, and read-heavy APIs.

Link: https://neon.com/docs/introduction/read-replicas.md

## Connection Pooling

Use this when the user is in serverless or high-concurrency environments and needs safe, scalable Postgres connection management.

Key points:

- Neon pooling uses PgBouncer.
- Add `-pooler` to endpoint hostnames to use pooled connections.
- Pooling is especially important in serverless runtimes with bursty concurrency.

Link: https://neon.com/docs/connect/connection-pooling.md

## IP Allow Lists

Use this when the user needs to restrict database access by trusted networks, IPs, or CIDR ranges.

Link: https://neon.com/docs/introduction/ip-allow.md

## Logical Replication

Use this when integrating CDC pipelines, external Postgres sync, or replication-based data movement.

Key points:

- Neon supports native logical replication workflows.
- Useful for replicating to/from external Postgres systems.

Link: https://neon.com/docs/guides/logical-replication-guide.md

## Lakebase Search

Use Lakebase Search for semantic, full-text, and hybrid search:

- For semantic search, including generating embeddings with the Neon AI Gateway, read [Vector search](references/vector-search.md).
- For full-text search with BM25 ranking, read [Full-text search](references/full-text-search.md).
- For combining semantic and lexical results with fusion or reranking, read [Hybrid search](references/hybrid-search.md).
- For managing any of the above through Drizzle ORM, read [Managing Lakebase Search with Drizzle](references/lakebase-search-drizzle.md).

Links:

- [Get started with Lakebase Search](https://neon.com/docs/ai/lakebase-search-get-started)
- [`lakebase_vector` reference](https://neon.com/docs/extensions/lakebase-vector)
- [`lakebase_text` reference](https://neon.com/docs/extensions/lakebase-text)

## Gotchas

### Pooled vs direct connections: use the direct URL for migrations, dumps, and replication

Neon gives you two connection strings for the same database: a **pooled** one (hostname with the `-pooler` suffix) and a **direct/unpooled** one (no `-pooler` suffix). `neon env pull` writes them as `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. The pooled connection routes through PgBouncer in transaction mode, which doesn't support session-level operations. Choose the right one:

- **Pooled (`DATABASE_URL`)** — your application's normal query traffic, especially serverless and connection-per-request workloads.
- **Direct (`DATABASE_URL_UNPOOLED`)** — schema migrations (Prisma Migrate, Drizzle Kit, Alembic, and others), `pg_dump` / `pg_restore`, logical replication, `LISTEN`/`NOTIFY`, and anything relying on `SET` or other session state.

Running migrations, dumps, or replication over the pooled connection can fail, and never in a way that names pooling: `prepared statement "s0" already exists` from Prisma Migrate, a `SET search_path` that doesn't persist past its own transaction so the next query reports `relation "mytable" does not exist`, or a write intermittently hitting a read-only transaction (`SQLSTATE 25006`) that a pooled backend inherited from an earlier client. Migration tools generally take both strings at once — Prisma's `directUrl` alongside `url` — so point that at the direct one rather than swapping `DATABASE_URL` and losing pooling for the application. See https://neon.com/docs/connect/connection-pooling.md.
