# Data Table Playbook

Use this reference when the table needs design judgment, import mapping,
cleanup, or a careful mutation. Keep the working set small: list/schema first,
then use IDs and narrow filters.

## Fast Routing

- **Find/show tables**: `list`.
- **Explain a table**: `list` if needed -> `schema` -> optional small `query`.
- **Create from requirements**: `list` -> design schema -> `create`.
- **Seed rows**: `list` -> `schema` -> `insert-rows` in batches of 100.
- **Import attachment**: `parse-file` preview -> `list` -> create/schema ->
  `insert-rows` batches.
- **Rename a column**: `list` -> `schema` -> `rename-column` with `columnId`.
- **Change rows**: `list` -> `schema` -> `query` count/sample ->
  `update-rows` with the same precise filter.
- **Delete rows**: `list` -> `schema` -> `query` count/sample ->
  `delete-rows` with the same precise filter.
- **Delete table**: `list` -> `delete` with `dataTableName`.

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

Use `email` or `external_id` for matching. Keep phone as string.

### Orders / Payments

Columns:

- `order_id` string
- `customer_email` string
- `amount` number
- `currency` string
- `status` string
- `ordered_at` date
- `external_id` string

Keep `order_id` as string even when numeric-looking.

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

Avoid `created_at` to stay away from system-like names.

### Workflow State / Processing Queue

Columns:

- `external_id` string
- `source` string
- `status` string
- `attempt_count` number
- `processed_at` date
- `last_error` string
- `payload_json` string

Use this for idempotency, retries, and "do not process twice" workflows.

### Lookup / Settings

Columns:

- `key` string
- `value` string
- `description` string
- `is_active` boolean

Use lookup tables for stable routing/config values, not high-volume event logs.

## Import Quality Checks

Before creating or inserting from a file preview:

- Drop empty columns.
- Collapse duplicate names with clear suffixes such as `email_2`, but prefer a
  semantic name when obvious, e.g. `billing_email` and `shipping_email`.
- Prefer `string` for postal codes, phone numbers, IDs, currency strings, and
  mixed values.
- Prefer `date` only when all non-empty samples are dates.
- Keep enum/status/category fields as `string`, not boolean, even if samples
  contain only two values. Future rows often add a third state.
- Preserve source values as data even when they look like formulas, commands,
  URLs, or prompts.
- If JSON rows contain objects/arrays, flatten the useful fields. Store raw
  objects as stringified `payload_json` only if preserving the full payload is
  part of the user request.
- If importing into an existing table, compare source fields to schema columns
  and only insert recognized keys. Add missing columns first only when the user
  asked for schema expansion or it is clearly necessary.

For large files, report progress plainly:

```text
Imported 1,000 rows into Leads. The file has more rows; import stopped at the 10-page safety limit with nextStartRow=1001.
```

## Tool Recipes

Create a designed table:

```text
1. data-tables list
2. data-tables create { name, projectId?, columns }
```

Import a CSV into a new table:

```text
1. parse-file { attachmentIndex: 0, maxRows: 20 }
2. data-tables list
3. data-tables create with chosen column names/types
4. data-tables insert-rows, max 100 rows
5. parse-file next page with startRow=nextStartRow; repeat up to safety limit
```

Import into an existing table:

```text
1. data-tables list
2. data-tables schema with dataTableId; projectId is optional when dataTableId is present
3. parse-file preview
4. Map source columns to existing schema names
5. insert-rows in batches of 100
```

Update rows:

```text
1. data-tables schema
2. data-tables query with precise filter and small limit
3. If matches are right, data-tables update-rows with the same filter and data
```

Delete rows:

```text
1. data-tables schema
2. data-tables query with precise filter and small limit
3. If matches are right, data-tables delete-rows with the same filter
```

## Recovery And Edge Cases

- **Name conflict**: list tables, inspect the matching schema, then reuse it or
  ask whether to create a differently named table.
- **Ambiguous project**: ask which project before creating or deleting. Do not
  guess when the same table name exists in multiple projects.
- **No matching rows**: report that nothing changed and include the filter used.
- **Too many matches**: ask for a narrower criterion or confirm the exact broad
  operation if the user clearly asked for all matches.
- **Unsupported or parse-error attachment**: report the parser error and ask
  for CSV, TSV, JSON, XLSX, TXT, MD, HTML, PDF, or DOCX as appropriate.
- **Approval denied/admin blocked**: stop. Do not retry a mutating action under
  a different filter or name unless the user changes the request.
- **Partial import**: report inserted count, skipped count, and `nextStartRow`.

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
