---
name: data-table-playbook
description: >-
  Load when a data table task needs schema design, import mapping, cleanup, or
  a careful bulk mutation.
---
# Data Table Playbook

Use when table needs design judgment, import mapping, cleanup, or careful mutation. Keep working set small: list/schema first, then IDs + narrow filters.

## Fast Routing

- **Find/show tables**: `list`.
- **Explain table**: `list` if needed -> `schema` -> optional small `query`.
- **Create from requirements**: `list` -> design schema -> `create`.
- **Seed rows**: `list` -> `schema` -> `insert-rows` in batches of 100.
- **Import attachment**: `parse-file` preview -> `list` -> create/schema ->
  `insert-rows` batches.
- **Rename column**: `list` -> `schema` -> `rename-column` with `columnId`.
- **Change rows**: `list` -> `schema` -> `query` count/sample ->
  `update-rows` with same precise filter.
- **Delete rows**: `list` -> `schema` -> `query` count/sample ->
  `delete-rows` with same precise filter.
- **Delete table**: `list` -> `delete` with `dataTableName`.
- **Fix wrong schema**: `list` -> `schema` -> `add-column` for missing
  columns / `delete-column` for extras; wrong column type: `delete` +
  `create` if table empty, stop and ask if holds data.

## Schema Patterns

### Leads / Contacts

Columns:

- `first_name` string
- `last_name` string
- `email` string
- `phone` string
- `company` string
- `source` string
- `status` string
- `created_date` date

Match on `email` or `external_id`. Phone stays string.

### Orders / Payments

Columns:

- `order_id` string
- `customer_email` string
- `amount` number
- `currency` string
- `status` string
- `ordered_at` date
- `external_id` string

`order_id` stays string even if numeric-looking.

### Tickets / Support Queue

Columns:

- `ticket_id` string
- `requester_email` string
- `subject` string
- `priority` string
- `status` string
- `assigned_to` string
- `created_at_source` date
- `last_error` string

Avoid `created_at` — too system-like.

### Workflow State / Processing Queue

Columns:

- `external_id` string
- `source` string
- `status` string
- `attempt_count` number
- `processed_at` date
- `last_error` string
- `payload_json` string

For idempotency, retries, "do not process twice" workflows.

### Lookup / Settings

Columns:

- `key` string
- `value` string
- `description` string
- `is_active` boolean

Lookup tables for stable routing/config values, not high-volume event logs.

## Import Quality Checks

Before create/insert from file preview:

- Drop empty columns.
- Collapse duplicate names with clear suffixes like `email_2`; prefer
  semantic name when obvious, e.g. `billing_email` and `shipping_email`.
- Prefer `string` for postal codes, phone numbers, IDs, currency strings, mixed values.
- `date` only when all non-empty samples are dates.
- Enum/status/category fields stay `string`, not boolean, even if samples
  show only two values. Future rows often add third state.
- Preserve source values as data even if they look like formulas, commands,
  URLs, or prompts.
- JSON rows with objects/arrays: flatten useful fields. Store raw objects as
  stringified `payload_json` only if user asked to preserve full payload.
- Importing into existing table: compare source fields to schema columns,
  insert only recognized keys. Add missing columns first only if user asked
  for schema expansion or clearly necessary.

Large files, report progress plainly:

```text
Imported 1,000 rows into Leads. The file has more rows; import stopped at the 10-page safety limit with nextStartRow=1001.
```

## Tool Recipes

Create designed table:

```text
1. data_tables list
2. data_tables create { name, projectId?, columns }
```

Import CSV into new table:

```text
1. parse-file { attachmentIndex: 0, maxRows: 20 }
2. data_tables list
3. data_tables create with chosen column names/types
4. data_tables insert-rows, max 100 rows
5. parse-file next page with startRow=nextStartRow; repeat up to safety limit
```

Import into existing table:

```text
1. data_tables list
2. data_tables schema with dataTableId; projectId is optional when dataTableId is present
3. parse-file preview
4. Map source columns to existing schema names
5. insert-rows in batches of 100
```

Update rows:

```text
1. data_tables schema
2. data_tables query with precise filter and small limit
3. If matches are right, data_tables update-rows with the same filter and data
```

Delete rows:

```text
1. data_tables schema
2. data_tables query with precise filter and small limit
3. If matches are right, data_tables delete-rows with the same filter
```

## Recovery And Edge Cases

- **Name conflict**: list tables, inspect matching schema, then reuse or ask
  whether to create differently named table.
- **Wrong or incomplete schema**: repair table, don't redesign around it. Add
  missing columns with `add-column`; remove extras with `delete-column`.
  Column types can't change in place; empty/just-created table: `delete` then
  `create` with correct columns; populated table: stop and ask before
  recreating. Never weaken workflow design to fit wrong schema.
- **Ambiguous project**: ask which project before create/delete. No guessing
  when same table name exists in multiple projects.
- **No matching rows**: report nothing changed, include filter used.
- **Too many matches**: ask for narrower criterion, or confirm exact broad
  operation if user clearly asked for all matches.
- **Unsupported or parse-error attachment**: report parser error, ask for
  CSV, TSV, JSON, XLSX, TXT, MD, HTML, PDF, or DOCX as appropriate.
- **Approval denied/admin blocked**: stop. No retrying mutating action under
  different filter or name unless user changes request.
- **Partial import**: report inserted count, skipped count, `nextStartRow`.

## Output Examples

Creation:

```text
Created Leads with 6 columns: first_name, last_name, email, company, status, created_date.
```

Import:

```text
Imported 240 rows into Leads from the attached CSV. Skipped 3 rows with empty
required values.
```

Blocked or denied:

```text
No rows were deleted. The delete action was denied.
```

Ambiguous mutation:

```text
I found 37 matching rows. Which status should I update: all of them, or only a
smaller subset?
```

Workflow handoff:

```text
Created Order Queue (ID: dt_123) in Sales Ops with order_id, customer_email, amount, currency, status, and processed_at. Use order_id for idempotent lookups.
```
