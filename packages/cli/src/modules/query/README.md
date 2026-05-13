# Query Module

A read-only SQL query layer over n8n's execution data, exposed as `POST /rest/query`. Compiles user SQL into dialect-specific parameterized SQL, runs it against the live `DataSource`, and returns shaped rows.

The dashboard feature is the first consumer; the future public API and AI assistant can mount the same `QueryService` without changes.

## Overview

```
SQL text                                                              rows
   │                                                                    ▲
   ▼                                                                    │
┌──────────┐  ┌──────────┐  ┌──────────────────┐  ┌─────────────────────┐
│  Lexer   │─▶│  Parser  │─▶│ Validator → IR   │─▶│ Compiler + executor │
└──────────┘  └──────────┘  └──────────────────┘  └─────────────────────┘
                                     │                       │
                                     ▼                       ▼
                              permission check           streaming reads
                              field whitelisting         early projection
                              aggregate whitelisting     statement timeout
```

Five stages, each cleanly testable in isolation. Once SQL text reaches the IR stage, every downstream component operates on validated structured data — there's no string interpolation of user input from that point on.

## Architecture

```
modules/query/
   engine/                       # pure-ish — files here import only from engine/
      lexer.ts                   # SQL string → typed tokens
      parser.ts                  # tokens → AST (recursive descent)
      validator.ts               # AST → IR; permission + field whitelist checks
      ir.ts                      # intermediate representation types
      ast.ts                     # AST types
      schema-map.ts              # SchemaMap contract
      errors.ts                  # EngineError + typed code enum
      compiler/
         index.ts                # ExecutionStrategy + dispatcher
         executions.ts           # `executions` source compiler (Path A)
         workflows.ts            # `workflows` source compiler (Path A)
         helpers.ts              # shared SQL builders + ParamList

   query.service.ts              # orchestrates lex → parse → validate → compile → execute
   query.executor.ts             # runs ExecutionStrategy via DataSource; timeout + truncation
   query.controller.ts           # POST /rest/query — maps engine errors to HTTP
   schema-map.builder.ts         # workflow name→id + accessible-id set per user
   query.module.ts               # @BackendModule registration

   dto/
      run-query.dto.ts           # request body shape (zod)

   __tests__/                    # unit + snapshot tests, mirror src/ layout
```

### The IR (intermediate representation)

A plain typed object produced by the validator. It captures *what the query asks for* with everything already checked: field names whitelisted, workflow references permission-checked, aggregate functions constrained to a known enum. Downstream code operates only on the IR — never on SQL text or raw AST. Three reasons it exists:

1. **Single security choke point** — all validation runs once, in `validator.ts`.
2. **Grammar decoupled from execution** — parser changes don't touch the compiler; execution changes don't touch the parser.
3. **Reusable across surfaces** — a future visual query builder can produce IR directly, skipping SQL.

The IR is private to the engine: never serialized, never stored, never returned.

### Path A vs Path B

Compiler picks one of two strategies based on `IRSource.kind`:

- **Path A — full SQL pushdown.** Sources `executions` and `workflows`. The IR translates to a single parameterized query against typed/JSON columns of `execution_entity` / `workflow_entity`. DB does WHERE, GROUP BY, ORDER BY, LIMIT, aggregates.
- **Path B — SQL + JS residual.** Source `nodeOutput`. Can't push field filters into the DB because `execution_data.data` is `text` + flatted-encoded. SQL fetches the matching executions with metadata filters pushed down; JS deserializes each blob, extracts the node's items, applies remaining filters/joins/aggregates.

**Path B is not yet implemented** (post-v1). Calling it returns `Node-output queries are not yet supported`.

## API endpoint

### `POST /rest/query`

Authenticated; scoped by `workflow:read` access (enforced inside the compiler as a `WHERE workflowId IN (...accessibleIds)` clause baked into every generated query).

Request body (zod-validated):

```ts
{
   query: string;        // SQL text
   timeoutMs?: number;   // statement timeout, default 10000
}
```

Success response:

```ts
{
   columns: string[];                       // ordered result column names
   rows: Array<Record<string, unknown>>;    // typed by driver
   durationMs: number;
   truncated: boolean;                      // true when rows.length >= LIMIT
}
```

Errors are mapped from engine error codes to HTTP classes:

| Engine code | HTTP | Class |
|---|---|---|
| `PARSE_ERROR`, `JOINS_NOT_SUPPORTED`, `ALIASES_NOT_SUPPORTED`, `UNKNOWN_FIELD`, `UNKNOWN_SOURCE`, `UNKNOWN_WORKFLOW`, `AGGREGATE_IN_WHERE`, `INVALID_WINDOW` | 400 | `BadRequestError` |
| `FORBIDDEN_WORKFLOW` | 403 | `ForbiddenError` |
| `DB_UNSUPPORTED`, `STATEMENT_TIMEOUT`, `EXECUTION_FAILED`, `RESULT_TOO_LARGE` | 500 | `InternalServerError` |

The engine code is prefixed onto the message (`"PARSE_ERROR: Unexpected character '@' at position 7"`) so the frontend can branch on it.

## Supported SQL grammar

```sql
SELECT  <col | agg_fn(col)> [, ...]  |  *
FROM    <system-table-name>                       -- 'executions' or 'workflows'
   |    '<workflow-name>'.'<node-name>'           -- nodeOutput (Path B, not yet)
        [ LAST <n> | SINCE '<iso>' | EXECUTION '<id>' ]
[WHERE   <predicate>]
[GROUP BY <col>, ...]
[HAVING  <agg-predicate>]
[ORDER BY <col | agg> [ASC|DESC], ...]
[LIMIT   <n>]
```

Operators: `=`, `!=`, `<>`, `<`, `>`, `<=`, `>=`, `IN (...)`, `LIKE`, `IS NULL`, `IS NOT NULL`, `AND`, `OR`, `NOT`. Aggregates: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.

### v1 restrictions

The parser rejects these at the grammar level with a specific code:

- **`JOIN` clauses** → `JOINS_NOT_SUPPORTED` (post-v1, `LEFT JOIN` only when added)
- **`AS` aliases** (on columns or sources) → `ALIASES_NOT_SUPPORTED`

The validator rejects these:

- **Unknown system table name** → `UNKNOWN_SOURCE`
- **Unknown column on `executions` / `workflows`** → `UNKNOWN_FIELD`
- **Aggregates in `WHERE`** → `AGGREGATE_IN_WHERE` (use `HAVING`)
- **Window (`LAST`/`SINCE`/`EXECUTION`) on a system table** → `INVALID_WINDOW`
- **DB other than `postgresdb` or `sqlite`** → `DB_UNSUPPORTED`

## Whitelisted columns

| `executions` | Notes |
|---|---|
| `id` | |
| `workflowId` | |
| `workflowName` | joined from `workflow_entity.name` |
| `status` | success / error / crashed / waiting / running |
| `mode` | manual / webhook / trigger / … |
| `startedAt`, `stoppedAt` | |
| `duration_ms` | derived (`stoppedAt - startedAt`); dialect-specific expression |
| `retryOf` | |

| `workflows` | |
|---|---|
| `id`, `name`, `active`, `createdAt`, `updatedAt` | |

For `nodeOutput` sources, field names are **not whitelisted** — they come from the node's runtime output. Accept any identifier; runtime returns `null` for missing keys.

## Permission scope

Every generated SQL query has a permission filter baked in:

```sql
WHERE e."workflowId" IN ($1, $2, ...)   -- on executions
WHERE w."id" IN ($1, $2, ...)            -- on workflows
```

The list comes from `WorkflowSharingService.getSharedWorkflowIds(user, { scopes: ['workflow:read'] })`, gathered once per request by `SchemaMapBuilder`. If the user has zero accessible workflows, the clause collapses to `WHERE 1=0` — the query is structurally valid but returns nothing.

`SchemaMapBuilder` also resolves `'workflow-name'.'node-name'` references — but only against the accessible set. A workflow that exists by name but isn't accessible resolves to `null`, so the validator throws `UNKNOWN_WORKFLOW` (not `FORBIDDEN_WORKFLOW`). This is deliberate — same outcome as "doesn't exist", no info leak.

## Dialects

Postgres and SQLite only. The compiler emits dialect-specific SQL for:

- **Parameter placeholders**: `$1`, `$2` (Postgres) vs `?` (SQLite)
- **`duration_ms`**: `EXTRACT(EPOCH FROM ...)` (Postgres) vs `julianday(...)` (SQLite)

MySQL / MariaDB are not supported. The validator emits `DB_UNSUPPORTED` immediately if the dialect is anything else.

## Extending the module

### Add a new column to an existing system table

1. Add the column to `EXECUTIONS_COLUMNS` (or `WORKFLOWS_COLUMNS`) in `validator.ts`.
2. Add the column expression in `compiler/executions.ts` (or `workflows.ts`) `columnExpr()`. Handle dialect differences explicitly if needed.
3. Add the column to `ALL_*_COLUMNS` if `SELECT *` should include it.
4. Update the README whitelist table above.
5. Run snapshot tests — review and accept new snapshots.

### Add a new system table source

1. Extend `IRSource` in `ir.ts`.
2. Add the table name + column set to the validator's `validateSource` and `makeColumnCheck`.
3. Add a new compiler file under `compiler/` mirroring `executions.ts` / `workflows.ts`.
4. Wire it into the `compile()` dispatcher in `compiler/index.ts`.
5. Add a test file mirroring the existing compiler tests.

### Implementing Path B (`nodeOutput`)

See [`../../.claude/plans/configurable-dashboards-plan.md`](../../../.claude/plans/configurable-dashboards-plan.md) §6.3 — Path B compiler decomposition. The compiler dispatcher currently throws; replace with a real implementation that returns a `sql+js` strategy. The executor will need a streaming variant: open a cursor, parse flatted blobs one at a time, run JS residual filters/aggregates over the streamed rows.

## Tests

```bash
pnpm --filter=n8n test src/modules/query
```

| Suite | Tests | Notes |
|---|---|---|
| lexer | 72 | Pure unit tests on token output |
| parser | 62 | Pure unit tests; AST shape + grammar rejection codes |
| validator | 49 | Per-source field whitelists, permission cases |
| schema-map.builder | 13 | Mocks `WorkflowRepository` + `WorkflowSharingService` |
| compiler/executions | 64 | Snapshot tests, both dialects |
| compiler/workflows | 62 | Snapshot tests, both dialects |
| query.executor | 14 | Mocks `DataSource` |
| query.service | 11 | Mocks builder + executor, real engine pipeline |
| query.controller | 18 | Mocks service, asserts every error→HTTP mapping |

122 snapshots cover the per-dialect SQL output. Review by reading `__snapshots__/*.snap` next to each test file.

## Module registration

The module loads automatically on n8n startup — it's in `MODULE_NAMES` (allowlist) and `defaultModules` (auto-enabled) in `packages/@n8n/backend-common/src/modules/`. To disable: `N8N_DISABLED_MODULES=query`.

## Out of scope (v1)

- Writes of any kind (`INSERT`/`UPDATE`/`DELETE` are not in the grammar)
- `JOIN` of any flavour (deferred; `LEFT JOIN` only when added)
- Subqueries, CTEs, `UNION`, window functions
- Node-output queries (Path B; see follow-up plan)
- Boolean/date literal types — values flow through as the SQL standard treats them (strings for dates, numbers for booleans)
- Statement timeout via DB-side cancellation — we use `Promise.race` so the DB query keeps running server-side until the connection is closed by the pool
- Result streaming — Path A queries are LIMIT-capped (default 1000) so the whole result fits in memory
