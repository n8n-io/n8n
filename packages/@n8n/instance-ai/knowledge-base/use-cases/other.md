# Use cases: Other

Role id: `other`. Ranked by how common the automation is, 1 is the most common. This file also serves users who did not pick a role.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Job vacancies to the careers website

- Trigger: Schedule, hourly
- Tools: HTTP Request
- Category: hr.recruitment.candidate-processing
- Template: templates/other-job-vacancies-to-the-website.workflow.ts

Fetches the open vacancies from the HR system API, compares them with the job posts on the website CMS, and creates or updates a post for each vacancy that changed.

## 2. Tracking events into a database and an analytics tool

- Trigger: Webhook, called by the website or the app for each event
- Tools: Webhook, database (Postgres), HTTP Request
- Category: generic-automation.data-movement
- Template: templates/other-tracking-events-into-a-database.workflow.ts

Receives a tracking event, inserts it into a database table, and forwards it to the analytics tool API in the shape that tool expects.

## 3. Accounting expenses into a database

- Trigger: Schedule, every 2 hours
- Tools: accounting (QuickBooks), database (Postgres)
- Category: finance.transactions-and-balances
- Template: templates/other-accounting-expenses-into-a-database.workflow.ts

Loads the purchases and bills changed since the last run from the accounting tool, maps them to one row shape, and upserts them into a database table for reporting.

## 4. Mark issues as released

- Trigger: Schedule, every 15 minutes
- Tools: code hosting (GitHub), issue tracker (Linear)
- Category: engineering.unclassified
- Template: templates/other-mark-issues-as-released.workflow.ts

Checks for releases published since the last run, extracts the issue ids from the release notes, and comments on each issue with the release version.

## 5. Workflow backups to a Git repository

- Trigger: Schedule, every 12 hours
- Tools: n8n API, code hosting (GitHub)
- Category: devops.unclassified
- Template: templates/other-workflow-backups-to-git.workflow.ts

Lists the workflows of this n8n instance, compares each one with the file in the repository, and commits the changed and new ones as JSON files.

## 6. Asset inventory report to file storage

- Trigger: Schedule, twice a day
- Tools: HTTP Request, file storage (Box)
- Category: it.device-management
- Template: templates/other-asset-inventory-report-to-file-storage.workflow.ts

Fetches the hardware and the users from the asset management API, joins them into one row per device, and uploads the result as a CSV file to file storage.

## 7. Sales report in a spreadsheet

- Trigger: Schedule, daily in the morning
- Tools: database (MySQL), spreadsheet (Google Sheets)
- Category: ecommerce.sales-reporting
- Template: templates/other-sales-report-in-a-spreadsheet.workflow.ts

Queries the sales and payments of the previous day from the shop database and appends or updates the daily row in a report spreadsheet.

## 8. CRM deals updated from the data warehouse

- Trigger: Schedule, daily at 05:00
- Tools: data warehouse (Snowflake), CRM (HubSpot), notification (Slack)
- Category: sales-and-marketing.crm-operations
- Template: templates/other-crm-deals-from-the-data-warehouse.workflow.ts

Queries the deal values from the data warehouse, updates each deal in the CRM, and posts a summary with the update and failure counts to a chat channel.

## 9. Daily BI report export to file storage

- Trigger: Schedule, daily at 05:00
- Tools: HTTP Request, file storage (Box)
- Category: generic-automation.data-movement
- Template: templates/other-bi-report-export-to-file-storage.workflow.ts

Runs a saved report in the BI tool through its API, removes the test rows, converts the result to a CSV file, and uploads it to file storage.

## 10. Import files into the app database

- Trigger: Schedule, every 4 hours
- Tools: app builder (Bubble), HTTP Request
- Category: sales-and-marketing.crm-operations
- Template: templates/other-import-files-into-the-app.workflow.ts

Finds the pending import records in the app database, downloads and parses each uploaded file, creates one record per row, and marks the import as done.
