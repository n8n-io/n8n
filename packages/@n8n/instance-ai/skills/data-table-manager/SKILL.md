---
name: data-table-manager
description: >-
  Load before calling the data table tools or parse-file. Use for natural standalone
  requests like "what data tables do I have?", "show/list my tables", or "what
  columns are in this table?", and whenever the user asks to list, show,
  create, inspect, import, seed, query, update, clean up, rename columns in, or
  delete data tables and rows, especially from CSV/XLSX/JSON attachments. Also
  load before building or planning workflows that create or write to Data
  Tables (then load workflow-builder before workflow_builder_build_workflow).
recommended_tool_groups:
  - data_tables
platforms:
  - daytona
---

# Data Table Manager

## Routing

For workflow builds that create or write Data Tables, load this skill, then
`workflow-builder`, before `workflow_builder_build_workflow`.

Use this skill to build and maintain n8n Data Tables in the current turn with
the data table tools (`list_data_tables`, `get_data_table_schema`,
`query_data_table`, `create_data_table`, `insert_data_table_rows`, and so on)
and, for attachments, `parse-file`. Do not spawn another agent for
data-table-only work.

Also load this skill before building a workflow whose trigger, processing
steps, or outputs create, inspect, or write Data Table records, then pass the
relevant schema/row-handling guidance to the builder.

n8n Data Tables are flat, workflow-friendly stores. Design them so future
workflow expressions can read predictable field names and so updates/deletes
can target rows with narrow filters.

## Default Procedure

1. Classify the job: inspect, design/create, import, seed, query, schema
   change, row mutation, row delete, table delete, or cleanup.
2. Resolve the target first. Run `list_data_tables` through `call_tool` before creating
   a table, acting on a table name, or choosing a project. If there is more
   than one plausible match, ask one concise clarification.
3. Use table IDs after discovery. Include `projectId` whenever list results or
   the user identify a project. Pass `dataTableName` on mutating calls when you
   know it so approval cards show a recognizable label.
4. Inspect schema before writes, deletes, column changes, imports into an
   existing table, and workflow-facing summaries.
5. Execute the smallest direct tool sequence. Prefer read -> decide -> write.
6. Close with facts: table name, table ID when available, project if relevant,
   columns changed, row counts inserted/updated/deleted, skipped rows, and any
   approval or permission blocker.

## Design Rules

- Use stable lowercase `snake_case` column names: `customer_email`,
  `order_total`, `processed_at`. Data Tables accept alphanumeric names and
  underscores; avoid spaces, punctuation, and display-only labels.
- Prefer a narrow schema over a junk drawer. Use explicit columns for values
  workflows will filter, branch, map, or show to users.
- Use only supported types: `string`, `number`, `boolean`, `date`. Infer
  them conservatively.
- Add operational columns when they help workflows: `status`, `source`,
  `external_id`, `processed_at`, `last_error`, `attempt_count`, `created_date`.
- Reuse an existing matching table when its schema fits. Do not create
  near-duplicates because of capitalization or pluralization.

## File Imports

Use `parse-file` for attached CSV, TSV, JSON, and XLSX files.

1. Preview first with `maxRows=20`, unless the user named the structure
   exactly.
2. Use the parser's normalized column names as the starting point, then improve
   ambiguous names before creating a new table.
3. For a new table, create columns from the chosen schema before inserting.
4. For an existing table, map imported fields to existing column names.
5. Insert rows in batches of at most 100, page by page.

## Query, Mutate, Delete

- Query filters support `eq`, `neq`, `like`, `ilike`, `gt`, `gte`, `lt`, `lte`
  joined by `and` or `or`. Use `limit` and `offset` for paging; tools return
  at most 100 rows per query.
- Keep every query targeted, with a narrow filter and a small `limit`.
- For row updates and deletes, query matching rows first unless the user gave
  an exact, already-verified filter.
- If a table's columns do not match what is required, repair the table. Never
  redesign or weaken the surrounding workflow to fit a wrong schema.

## Workflow Boundary

- If the user is building or editing a workflow and tables are only supporting
  infrastructure, pass table requirements to the workflow builder task instead
  of creating a standalone table yourself.
- Never change a workflow's design to accommodate a wrong or incomplete table
  schema. Fix the table to match the spec, or stop and ask the user.
- If the user explicitly asks to create/import/clean a table now, do it here
  with direct tools, then summarize table details the workflow builder can use:
  table name, ID, project, and column names.

## More Detail

Load the `data-table-playbook` reference for tool recipes, schema patterns,
import edge cases, and output examples.
