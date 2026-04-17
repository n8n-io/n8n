---
description: >
  Create, inspect, and populate n8n data tables. Use when the user
  wants to create a table, add rows, rename columns, or manage
  structured data in n8n.
argument-hint: "[describe what to do with which table]"
---

# Manage Data Table

Manage n8n data tables: "$ARGUMENTS"

## Builder-flag dependency

`create_data_table` requires a `projectId`. Project discovery via
`search_projects` is a builder tool, so on a builder-disabled
instance the skill falls back to asking the user for a project ID
directly.

## Flow

1. **Understand the request.** Classify as one of:
   - **Create** a new table (need: project, name, columns with types)
   - **Add rows** to an existing table
   - **Modify structure** (add / rename / delete column, or rename
     table)
   - **Search** for an existing table

2. **Resolve the table (for all non-create ops).** Call
   `search_data_tables` with the user's query. If multiple match,
   ask the user to pick one by name.

3. **Resolve the project (for create).** Call `search_projects` if
   available. If not, ask:

   > I can't list projects on this instance. Paste the `projectId`
   > you want the table in — you can copy it from the project URL
   > in your n8n UI.

4. **Execute the right tool:**

   | Intent | Tool | Notes |
   |---|---|---|
   | Create | `create_data_table` | columns must have `name` + `type` (`string`/`number`/`boolean`/`date`); at least 1 column |
   | Rename table | `rename_data_table` | |
   | Add column | `add_data_table_column` | |
   | Rename column | `rename_data_table_column` | |
   | Delete column | `delete_data_table_column` | **destructive** — confirm first |
   | Add rows | `add_data_table_rows` | max 1000 rows per call; batch if more |

5. **Report.** Confirm what changed. For create, show the table
   structure (columns + types). For add-rows, show the
   `insertedCount`.
