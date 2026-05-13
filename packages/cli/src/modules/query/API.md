# Query API — Frontend Integration Guide

Companion to [README.md](./README.md) (internals). This doc is for whoever's wiring the dashboard UI (or any other consumer) to the `/rest/query` endpoint.

## Endpoints

Two routes, same engine, slightly different wire format:

| Endpoint | Auth | Response wrap |
| --- | --- | --- |
| `POST /rest/query` | Session cookie (`n8n-auth` + `browser-id` header) | `{"data": {columns, rows, ...}}` |
| `POST /api/v1/query` | `X-N8N-API-KEY` header | `{columns, rows, ...}` (bare) |

Both are scoped by the user's `workflow:read` access — queries can only return data from workflows the user can read.

The dashboard UI should use `/rest/query` (cookie auth is already there). External integrations (the N8n node, third-party scripts) use `/api/v1/query` with an API key.

## Request

```ts
type RunQueryRequest = {
  query: string;        // SQL text — required, non-empty
  timeoutMs?: number;   // per-request statement timeout, default 10000
};
```

```js
await fetch('/rest/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',          // sends the n8n-auth cookie
  body: JSON.stringify({ query: 'SELECT id, name FROM workflows LIMIT 10' }),
});
```

## Success response (HTTP 200)

```ts
type RunQueryResponse = {
  data: {
    columns: string[];                       // ordered result column names
    rows: Array<Record<string, unknown>>;    // each keyed by column
    durationMs: number;                      // server-side query time
    truncated: boolean;                      // true when rows.length >= LIMIT
  };
};
```

Notes on the shape:
- `columns` is the rendering order — useful for tables where order matters.
- `rows` keys match `columns`; values are pass-through from the driver (sqlite booleans surface as `0`/`1`, timestamps as ISO strings, arrays as JS arrays).
- `truncated: true` means *either* the user's `LIMIT` was hit *or* the default cap of 1000 kicked in. If your widget specified `LIMIT 50`, treat `truncated: true` as a soft "might be more" signal.

## Error response (HTTP 4xx / 5xx)

```ts
type RunQueryErrorResponse = {
  code: number;                  // HTTP status (400, 403, 500)
  message: string;               // "<ENGINE_CODE>: <human-readable explanation>"
  stacktrace?: string;           // dev mode only
};
```

The engine code is **prefixed onto the message**. Parse it with a `split(': ', 1)` to branch on intent without string-matching the human-readable part.

```js
const [code, ...rest] = response.message.split(': ');
const detail = rest.join(': ');
// code === 'PARSE_ERROR', detail === "Unexpected character '@' at position 7"
```

### Error codes you'll see

| HTTP | Engine code | When |
|---|---|---|
| 400 | `PARSE_ERROR` | Bad SQL syntax. The message includes the position. |
| 400 | `JOINS_NOT_SUPPORTED` | `JOIN` / `LEFT JOIN` / etc. — not in v1. |
| 400 | `ALIASES_NOT_SUPPORTED` | `AS alias` on a column or source — not in v1. |
| 400 | `UNKNOWN_FIELD` | Column not in the source's whitelist (only fires for system tables). |
| 400 | `UNKNOWN_SOURCE` | Bare name in `FROM` that isn't `executions` or `workflows`. |
| 400 | `UNKNOWN_WORKFLOW` | Quoted workflow name doesn't resolve (or the user can't read it — no info leak). |
| 400 | `AGGREGATE_IN_WHERE` | `COUNT(*)`/`SUM(...)`/etc. in `WHERE` — use `HAVING`. |
| 400 | `INVALID_WINDOW` | `LAST`/`SINCE`/`EXECUTION` on a system table — windows only on node-output. |
| 403 | `FORBIDDEN_WORKFLOW` | Defense-in-depth; in practice the validator collapses this into `UNKNOWN_WORKFLOW`. |
| 500 | `DB_UNSUPPORTED` | Server is on MySQL/MariaDB — we only support PG + SQLite. |
| 500 | `STATEMENT_TIMEOUT` | Query exceeded `timeoutMs`. Same-request retry usually doesn't help. |
| 500 | `EXECUTION_FAILED` | DB error during query execution. Check server logs. |

Suggested UI behavior:
- **400s** → show the message (or its tail after the code prefix) inline next to the query editor.
- **403** → "this workflow isn't accessible" toast.
- **500s** → "something went wrong, try again" toast + log to telemetry.

---

## Query examples

### Executions dashboard

```sql
-- Failed executions today
SELECT id, workflowName, status, startedAt
FROM   executions
WHERE  status = 'error'
   AND startedAt > '2024-01-15'
ORDER BY startedAt DESC
LIMIT  20
```

```sql
-- Count by status (last 7 days requires a date filter on startedAt)
SELECT   status, COUNT(*)
FROM     executions
GROUP BY status
```

```sql
-- Slowest workflows by average duration
SELECT   workflowName, AVG(duration_ms)
FROM     executions
WHERE    status = 'success'
GROUP BY workflowName
ORDER BY AVG(duration_ms) DESC
LIMIT    10
```

```sql
-- Workflows with > 10 failures
SELECT   workflowName, COUNT(*)
FROM     executions
WHERE    status = 'error'
GROUP BY workflowName
HAVING   COUNT(*) > 10
ORDER BY COUNT(*) DESC
```

```sql
-- Webhook-mode failures last hour
SELECT id, workflowName, error
FROM   executions
WHERE  mode = 'webhook' AND status = 'error'
   AND startedAt > '2024-01-15T10:00:00'
ORDER BY startedAt DESC
```

### Workflows

```sql
-- Active workflows alphabetically
SELECT id, name, createdAt
FROM   workflows
WHERE  active = 1
ORDER BY name ASC
```

```sql
-- Recently created workflows
SELECT id, name, createdAt
FROM   workflows
ORDER BY createdAt DESC
LIMIT  5
```

```sql
-- Search by name
SELECT id, name
FROM   workflows
WHERE  name LIKE 'crm%'
```

### Node-output queries

These read items emitted by a specific node in a workflow's recent successful executions. **Default window is `LAST 10` successful executions** — explicitly set otherwise if you need more or fewer.

```sql
-- Latest 10 form submissions from a single node
SELECT *
FROM 'crm-sync'.'Get users'
```

```sql
-- Just one most recent execution
SELECT *
FROM 'crm-sync'.'Get users'
LAST 1
```

```sql
-- 100 most recent executions
SELECT name, email
FROM 'crm-sync'.'Get users'
LAST 100
```

```sql
-- Since a date
SELECT name, email
FROM 'crm-sync'.'Get users'
SINCE '2024-01-01'
```

```sql
-- A specific execution
SELECT *
FROM 'crm-sync'.'Get users'
EXECUTION '12345'
```

```sql
-- Filter on item fields (uses the JS residual evaluator)
SELECT name, salary
FROM 'crm-sync'.'Get users'
LAST 50
WHERE salary > 70000
ORDER BY salary DESC
```

```sql
-- Field names with spaces / special chars — use double quotes
SELECT "Number Field", "Text Field"
FROM 'form simple'.'On form submission'
WHERE "Number Field" > 0
```

### Injected meta columns on node-output rows

Every row from a node-output query has these added automatically:

| Column | Type | Notes |
|---|---|---|
| `_execution_id` | string/number | which execution this row came from |
| `_executed_at` | timestamp string | when the execution started |

Useful for:

```sql
-- Most recent items across executions, oldest first
SELECT *
FROM 'crm-sync'.'Get users'
LAST 50
ORDER BY _executed_at ASC
```

---

## Syntax reference (v1)

The full grammar in one block:

```sql
SELECT   <select_item> [, <select_item>]*   |   *
FROM     <source> [<window>]
[WHERE   <predicate>]
[GROUP BY <column> [, <column>]*]
[HAVING  <agg_predicate>]
[ORDER BY <order_item> [, <order_item>]*]
[LIMIT   <integer>]

<select_item>   := *  |  <column>  |  <aggregate>
<column>        := <identifier>
<aggregate>     := COUNT(*)  |  COUNT(<column>)  |  SUM|AVG|MIN|MAX(<column>)

<source>        := <identifier>                            -- system table
                 | '<string>' . '<string>'                 -- workflow.node

<window>        := LAST <integer>
                 | SINCE '<iso_date>'
                 | EXECUTION '<id>'

<predicate>     := <atom>
                 | <predicate> AND <predicate>
                 | <predicate> OR  <predicate>
                 | NOT <predicate>
                 | ( <predicate> )

<atom>          := <column> <cmp> <literal>
                 | <column> IN ( <literal> [, <literal>]* )
                 | <column> LIKE '<pattern>'
                 | <column> IS NULL
                 | <column> IS NOT NULL

<agg_predicate> := <atom>  |  <aggregate> <cmp> <literal>  |  AND/OR/NOT/parens as above

<order_item>    := <column> [ASC|DESC]  |  <aggregate> [ASC|DESC]

<cmp>           := =  |  !=  |  <>  |  <  |  >  |  <=  |  >=

<literal>       := <number>  |  '<string>'  |  NULL
<identifier>    := bare_ident  |  "double-quoted text"
```

### `SELECT`

```sql
SELECT *                                  -- all columns from the source
SELECT id                                 -- one column
SELECT id, name, status                   -- ordered list
SELECT COUNT(*)                           -- aggregate
SELECT COUNT(*), status                   -- mixed with a group-by column
SELECT SUM(duration_ms)
SELECT AVG(duration_ms), MIN(duration_ms), MAX(duration_ms)
```

Aggregate functions accept either `*` (only valid for `COUNT`) or a single column. Column order in `SELECT` determines the `columns` array in the response. Aggregates get auto-generated aliases:

| Aggregate | Result column name |
| --- | --- |
| `COUNT(*)` | `count` |
| `COUNT(id)` | `count_id` |
| `SUM(duration_ms)` | `sum_duration_ms` |
| `AVG(duration_ms)` | `avg_duration_ms` |

Duplicates get suffix-numbered: `COUNT(*), COUNT(*)` → `count`, `count_2`.

### `FROM`

Three forms. Pick exactly one:

```sql
FROM executions                           -- system table (no quotes)
FROM workflows                            -- system table
FROM 'crm-sync'.'Get users'               -- node output (two single-quoted strings, dot-separated)
```

Anything else → `UNKNOWN_SOURCE`. Quoting is single-quote-only — `"executions"` is an identifier, not a string, so `FROM "executions"` doesn't work.

### Window clauses (node-output only)

Apply only on node-output sources. Using a window with a system table → `INVALID_WINDOW`.

```sql
FROM 'crm-sync'.'Get users' LAST 10              -- N most recent SUCCESSFUL executions
FROM 'crm-sync'.'Get users' SINCE '2024-01-01'   -- executions started after this date
FROM 'crm-sync'.'Get users' EXECUTION 'abc123'   -- a single specific execution
```

If no window is specified on a node-output source, **`LAST 10` is the default**. Show this in your UI so users know what they're seeing.

`LAST` only counts executions where `status = 'success'`. `SINCE` and `EXECUTION` don't filter by status — they pass the matching executions through directly. The window N is independent of the query's `LIMIT` (window N caps how many *executions* are scanned; `LIMIT` caps how many *output rows* are returned).

### `WHERE`

Predicates are atoms joined by `AND` / `OR` / `NOT` with parentheses for grouping.

**Atoms — all six comparison operators:**

```sql
WHERE status = 'error'
WHERE status != 'success'
WHERE status <> 'success'       -- alias for !=
WHERE duration_ms < 1000
WHERE duration_ms > 1000
WHERE duration_ms <= 5000
WHERE duration_ms >= 100
```

**Set membership:**

```sql
WHERE status IN ('error', 'crashed')
WHERE id IN ('wf-1', 'wf-2', 'wf-3')
```

**String pattern matching:**

```sql
WHERE name LIKE 'crm%'                 -- starts with crm
WHERE name LIKE '%form%'               -- contains form
WHERE name LIKE 'a_c%'                 -- _ matches single char
```

LIKE wildcards: `%` = any-length, `_` = single-char. Patterns are passed through as-typed.

**Null checks:**

```sql
WHERE retryOf IS NULL                  -- this is not a retry
WHERE retryOf IS NOT NULL              -- this is a retry
```

**Boolean composition + parens:**

```sql
WHERE status = 'error' AND mode = 'webhook'
WHERE status = 'error' OR status = 'crashed'
WHERE NOT status = 'success'
WHERE (status = 'error' OR status = 'crashed') AND mode = 'webhook'
```

Precedence: `NOT` binds tightest, then `AND`, then `OR`. Use parens to override.

**What's rejected in `WHERE`:**
- Aggregates: `WHERE COUNT(*) > 5` → `AGGREGATE_IN_WHERE`. Use `HAVING` instead.
- Subqueries, arithmetic, function calls beyond aggregates.

### `GROUP BY`

```sql
GROUP BY status                          -- single column
GROUP BY status, mode                    -- multiple columns
```

Only column references (no expressions). Allowed on system tables; **not yet supported on node-output sources** (planned for the next slice).

### `HAVING`

Filters post-aggregation results. Same predicate forms as `WHERE`, plus aggregates allowed on the comparison left-hand side.

```sql
HAVING COUNT(*) > 5
HAVING AVG(duration_ms) > 1000
HAVING COUNT(*) > 10 AND AVG(duration_ms) > 500
```

### `ORDER BY`

```sql
ORDER BY startedAt                       -- default ASC
ORDER BY startedAt DESC
ORDER BY status ASC, startedAt DESC      -- multi-key
ORDER BY COUNT(*) DESC                   -- aggregate ordering (after GROUP BY)
ORDER BY _executed_at DESC               -- meta columns work too (node-output)
```

Direction defaults to `ASC` when omitted.

### `LIMIT`

```sql
LIMIT 50
LIMIT 1000
```

Integer literal only. If omitted, the engine applies a default of **1000**. The response always includes `truncated: rows.length >= LIMIT`.

### Identifiers

Two forms — both produce the same internal token, but the rules differ:

**Bare identifiers** — letters, digits, underscores. Case-preserving.

```sql
SELECT id, status, duration_ms, _execution_id FROM executions
```

**Double-quoted identifiers** — anything except an unescaped double-quote. Use these for column names with spaces, punctuation, or that collide with SQL keywords.

```sql
SELECT "Number Field", "Some Special-Field"
FROM 'form simple'.'Form'

SELECT "select" FROM 'wf'.'node'         -- legal: "select" is an identifier here
SELECT "a""b" FROM 'wf'.'node'           -- doubled inner quote → identifier named a"b
```

Identifier case is **always preserved**. `"Status"` and `"status"` are different identifiers on node-output sources.

### Literals

Three kinds:

```sql
'a string'           -- single quotes; doubled inner quote escapes: 'it''s'
42                   -- integer
3.14                 -- decimal
NULL                 -- the null literal
```

No booleans (`true`/`false`) in v1 — use `1` / `0` for sqlite booleans or compare via `IS NULL`. No negative literal syntax — write `0 - 5` if you need it (or just don't, in practice you'd compare to `0` against a stored signed column).

### Keywords

Case-insensitive: `SELECT`, `select`, `Select`, `SeLeCt` all parse as the same `SELECT` keyword. Use whatever style your UI prefers.

Full keyword set: `SELECT FROM WHERE AND OR NOT ORDER BY GROUP HAVING LIMIT ASC DESC IS NULL IN LIKE LAST SINCE EXECUTION COUNT SUM AVG MIN MAX JOIN LEFT RIGHT INNER FULL CROSS OUTER ON AS`.

The last set (`JOIN LEFT RIGHT INNER FULL CROSS OUTER ON AS`) is recognised only so the parser can reject them with a clear error.

### Comments

**Not supported in v1.** Don't include `--` or `/* */` in queries — they'll cause a parse error. If you need to annotate a stored query, do it outside the SQL (e.g. a separate description field on the widget).

### Explicitly rejected (with their error codes)

| Syntax | Error code |
| --- | --- |
| `... JOIN ... ON ...` | `JOINS_NOT_SUPPORTED` |
| `... LEFT JOIN ...`, `INNER JOIN`, `RIGHT JOIN`, `FULL JOIN`, `CROSS JOIN` | `JOINS_NOT_SUPPORTED` |
| `SELECT col AS alias ...` | `ALIASES_NOT_SUPPORTED` |
| `FROM source AS s ...` | `ALIASES_NOT_SUPPORTED` |
| Aggregate in `WHERE` | `AGGREGATE_IN_WHERE` |
| Window on `executions` / `workflows` | `INVALID_WINDOW` |
| Unknown column on a system table | `UNKNOWN_FIELD` |
| Bare table name other than `executions` / `workflows` | `UNKNOWN_SOURCE` |
| Quoted workflow name not in user's accessible set | `UNKNOWN_WORKFLOW` |

### Not in v1 (future scope)

- `JOIN` (planned: `LEFT JOIN` only, after the dashboard demo)
- `AS` aliases
- `GROUP BY` / `HAVING` / aggregates on node-output sources
- Subqueries, CTEs (`WITH`), `UNION`
- Window functions (`OVER (...)`)
- Date/string functions (`SUBSTR`, `LOWER`, `NOW`, etc.)
- Arithmetic in expressions (`salary * 1.1`)
- `CASE WHEN ... THEN ...`
- `DISTINCT`
- `INSERT`/`UPDATE`/`DELETE` (read-only by design)

---

## Whitelisted columns

The validator rejects unknown columns on system tables with `UNKNOWN_FIELD`. Use these:

### `executions`

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `workflowId` | string | |
| `workflowName` | string | joined from `workflow_entity.name` |
| `status` | string | `success` / `error` / `crashed` / `waiting` / `running` |
| `mode` | string | `manual` / `webhook` / `trigger` / … |
| `startedAt` | timestamp string | |
| `stoppedAt` | timestamp string | nullable for running |
| `duration_ms` | number | derived (`stoppedAt - startedAt`) |
| `retryOf` | string \| null | execution id of original on retries |

### `workflows`

| Column | Type |
|---|---|
| `id` | string |
| `name` | string |
| `active` | number (0/1 on sqlite, boolean on postgres) |
| `createdAt` | timestamp string |
| `updatedAt` | timestamp string |

### Node-output

**No whitelist** — keys are whatever the node produced at runtime. Reference unknown keys safely:
- `SELECT made_up_field` → returns `null` for that column on every row
- `WHERE made_up_field = 'x'` → matches no rows (predicate sees `undefined`)

---

## Gotchas

1. **Default `LIMIT` is 1000.** If you want all rows for a small dataset, that's fine. For node-output queries, also remember the `LAST 10` default on executions (so up to 10 executions × items_per_execution rows, capped at 1000).
2. **`truncated: true` doesn't always mean "data was lost".** It only means `rows.length >= LIMIT`. If your widget asked for `LIMIT 50` and got 50 rows, treat the flag as soft.
3. **Permission scope is invisible.** If the user has zero accessible workflows, every query returns no rows (the SQL `WHERE workflowId IN (...)` becomes `WHERE 1=0`). Show an empty-state UI; don't say "your query is wrong."
4. **Workflow-not-found and forbidden return the same `UNKNOWN_WORKFLOW`.** This is deliberate (no info leak). The UI shouldn't claim the workflow exists.
5. **Field names are case-sensitive on node-output sources.** `"Number Field"` ≠ `"number field"`. Bare identifiers preserve case too.
6. **Boolean values on sqlite are `0` / `1`.** If you need true booleans for the UI, normalize client-side: `Boolean(row.active)`.
7. **Date values come back as strings** in whatever format the driver returns. Don't compare them as numbers; use `Date.parse` or pass them through a date library.
8. **Statement timeout is server-best-effort.** If a query times out, the DB-side work may still be running until the connection pool reaps it. Don't hammer-retry timed-out queries.

---

## Working curl recipes

These all assume you have the n8n cookie and browser-id stashed.

```bash
# Executions dashboard
curl -X POST http://localhost:5678/rest/query \
  -H "Content-Type: application/json" \
  -H "browser-id: $BROWSER_ID" \
  -H "Cookie: $N8N_AUTH" \
  -d '{"query":"SELECT status, COUNT(*) FROM executions GROUP BY status"}' | jq

# Node-output with quoted field
curl -X POST http://localhost:5678/rest/query \
  -H "Content-Type: application/json" \
  -H "browser-id: $BROWSER_ID" \
  -H "Cookie: $N8N_AUTH" \
  -d '{"query":"SELECT \"Number Field\" FROM '\''form simple'\''.'\''On form submission'\'' WHERE \"Number Field\" > 0"}' | jq

# With explicit timeout
curl -X POST http://localhost:5678/rest/query \
  -H "Content-Type: application/json" \
  -H "browser-id: $BROWSER_ID" \
  -H "Cookie: $N8N_AUTH" \
  -d '{"query":"SELECT * FROM executions ORDER BY startedAt DESC LIMIT 100","timeoutMs":2000}' | jq
```

---

## Frontend integration checklist

- [ ] Send `Content-Type: application/json` and `credentials: 'include'` (or your auth headers).
- [ ] Treat any non-200 as an error; split `message` on `': '` to get the engine code, branch on that.
- [ ] When showing tables, use `columns` for column order — `Object.keys(row)` order isn't guaranteed across drivers.
- [ ] When `truncated: true`, hint at the user (badge / footnote) but don't block.
- [ ] For node-output widgets with no LAST/SINCE/EXECUTION specified, surface the implicit `LAST 10` in the UI so users know what they're seeing.
- [ ] Cache the column list per query — schema can change between executions (form-field renames, etc.) but is stable across consecutive runs.
- [ ] When rendering a SQL editor: there's no autocomplete/intellisense yet. Future enhancement — for now, link users to this doc.
