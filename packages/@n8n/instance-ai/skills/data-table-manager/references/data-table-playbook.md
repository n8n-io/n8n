---
name: data-table-playbook
description: >-
  Load when a data table task needs schema design, import mapping, cleanup, or
  a careful bulk mutation.
---

# Data Table Playbook

Use this reference when the table needs design judgment, import mapping,
cleanup, or a careful mutation. Keep the working set small: list/schema first,
then use IDs and narrow filters. Every write is a change in a
`change_data_tables` call, shown below as `action(table, ...)`.

## Fast Routing

- **Find/show tables**: `list_data_tables`.
- **Explain a table**: `list_data_tables` if needed -> `get_data_table_schema`
  -> optional small `query_data_table`.
- **Create from requirements**: `list_data_tables` -> design every table and
  its seed rows -> one call with all `create` and `insert-rows` changes.
- **Seed rows**: `list_data_tables` -> `get_data_table_schema` ->
  `insert-rows` changes of at most 100 rows each.
- **Import attachment**: `parse-file` preview, or without `parse-file`,
  `import-files` and a preview in the sandbox -> see Tool Recipes.
- **Rename a column**: `list_data_tables` -> `get_data_table_schema` ->
  `rename-column`.
- **Change or delete rows**: `list_data_tables` -> `get_data_table_schema` ->
  `query_data_table` count/sample -> `update-rows` or `delete-rows` with the
  same precise filter.
- **Delete table**: `list_data_tables` -> `delete`.
- **Fix a wrong schema**: follow the skill's Fixing A Wrong Schema rules.

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

Create designed tables with seed rows in one call:

```text
1. list_data_tables
2. change_data_tables {
     projectId: "<optional>",
     changes: [
       { action: "create", name: "Customers",
         columns: [{ name: "customer_id", type: "string" }, { name: "tier", type: "string" }] },
       { action: "create", name: "Orders",
         columns: [{ name: "order_id", type: "string" }, { name: "customer_id", type: "string" },
                   { name: "amount", type: "number" }] },
       { action: "insert-rows", table: "Customers",
         rows: [{ customer_id: "c_1", tier: "gold" }] }
     ]
   }
```

Later, add rows to a table you created in this conversation (no new approval card):

```text
change_data_tables { changes: [
  { action: "insert-rows", table: "<Orders ID>", rows: [{ order_id: "o_1", customer_id: "c_1", amount: 40 }] }
] }
```

Import a CSV into a new table:

```text
1. parse-file { maxRows: 20 } with the file field of the parse-file schema (fileId or attachmentIndex)
2. list_data_tables
3. change_data_tables with a create change and the first insert-rows (max 100 rows)
4. parse-file next page with startRow=nextStartRow; insert-rows for each page, up to the safety limit
```

Without `parse-file`, use the sandbox for the same steps:

```text
1. import-files with the fileId; then print the header and the first 20 rows in the workspace
2. list_data_tables
3. change_data_tables with a create change and the first insert-rows (max 100 rows)
4. a script prints the next page of 100 rows as JSON objects; insert-rows for each page, up to the safety limit
```

Import into an existing table:

```text
1. list_data_tables
2. get_data_table_schema with dataTableId; projectId is optional when dataTableId is present
3. parse-file preview
4. Map source columns to existing schema names
5. insert-rows changes of at most 100 rows each
```

Update or delete rows:

```text
1. get_data_table_schema
2. query_data_table with precise filter and small limit
3. If matches are right, an update-rows (filter and data) or delete-rows change with the same filter
```

## Recovery And Edge Cases

- **Name conflict**: list tables, inspect the matching schema, then reuse it or
  ask whether to create a differently named table.
- **Wrong or incomplete schema**: follow the skill's Fixing A Wrong Schema rules.
- **Failed change**: follow the skill's Planning Writes rules.
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
