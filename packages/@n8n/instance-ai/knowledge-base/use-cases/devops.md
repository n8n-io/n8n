# Use cases: DevOps

Role id: `devops`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way. `rank.sh` prints `[set NAME=key]` for these swaps.

## 1. CSV export endpoint for a business system

- Trigger: Webhook, a GET request with the export id
- Tools: Webhook, HTTP Request
- Category: generic-automation.data-serving
- Template: templates/devops-csv-export-endpoint-for-a-business-system.workflow.ts

Serves one URL that fetches the records of a business system and returns them as a CSV download, so other tools can import them on a schedule.

## 2. Changed rows copy between databases

- Trigger: Schedule, daily
- Tools: database (Postgres)
- Category: generic-automation.data-movement
- Template: templates/devops-changed-rows-copy-between-databases.workflow.ts

Reads the rows changed in the last two days from the source database and upserts them into the target database.

## 3. Audit submissions into a database and a task board

- Trigger: Webhook from the audit app
- Tools: Webhook, database (Postgres), task manager (Monday.com)
- Category: knowledge.task-project-management
- Template: templates/devops-audit-submissions-into-a-database-and-a-task-board.workflow.ts

Stores each submitted audit in a database table and creates a task board item in the group that matches the audit type.

## 4. Campaign plan sync between spreadsheets

- Trigger: Schedule, every 12 hours
- Tools: spreadsheet (Google Sheets)
- Category: sales-and-marketing.analytics.campaign-performance
- Template: templates/devops-campaign-plan-sync-between-spreadsheets.workflow.ts

Copies the budget, dates and KPI targets of each campaign from the planning sheet into the report sheet, matched by campaign id.

## 5. Catalog sync per configuration entry

- Trigger: Schedule, hourly
- Tools: n8n sub-workflow
- Category: generic-automation.data-movement
- Template: templates/devops-catalog-sync-per-configuration-entry.workflow.ts

Holds the list of catalogs to sync in one place and runs the sync sub-workflow for each entry every hour.
