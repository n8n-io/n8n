# Use cases: Security

Role id: `security`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Reference data sync to an app backend

- Trigger: Schedule, daily at 06:00
- Tools: HTTP Request
- Category: generic-automation.data-movement
- Template: templates/security-reference-data-sync.workflow.ts

Requests a report from a source system API, waits until the report is ready, downloads the rows, and posts them in batches to the app backend that consumes them.

## 2. HR records into a reporting database

- Trigger: Schedule, every 2 hours
- Tools: HTTP Request, database (Supabase)
- Category: hr.employee-lifecycle.compensation-and-records
- Template: templates/security-hr-records-into-a-reporting-database.workflow.ts

Exports the records changed since the last run from the HR system API, normalizes the fields, and upserts them into a reporting database table.

## 3. Timed SMS and email follow-ups for new prospects

- Trigger: Schedule, every 30 minutes
- Tools: spreadsheet (Google Sheets), SMS (Twilio), notification (Gmail)
- Category: sales-and-marketing.lead-acquisition.nurture-and-reengagement
- Template: templates/security-timed-follow-ups.workflow.ts

Reads the prospect queue from a spreadsheet, finds the prospects due for the 4 hour or the 24 hour reminder that did not progress, sends the SMS or the email, and marks the reminder as sent.

## 4. Contract change validation and HR system update

- Trigger: Schedule, hourly
- Tools: spreadsheet (Google Sheets), HTTP Request
- Category: hr.employee-lifecycle.compensation-and-records
- Template: templates/security-contract-change-validation.workflow.ts

Reads the pending contract change requests from a spreadsheet, checks each one against the current contract in the HR system, applies the valid ones through the API, and logs the result for each request.

## 5. Dashboard data API from the data warehouse

- Trigger: Webhook, called by a dashboard with a header token
- Tools: Webhook, data warehouse (Google BigQuery)
- Category: hr.unclassified
- Template: templates/security-dashboard-data-api.workflow.ts

Validates the caller and the requested query name, runs the matching query in the data warehouse, and returns the rows as the webhook response.
