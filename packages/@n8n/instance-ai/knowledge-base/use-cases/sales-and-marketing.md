# Use cases: Sales and marketing

Role id: `sales-and-marketing`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Inbox leads into the CRM

- Trigger: New email from a form or lead provider
- Tools: email (Gmail), CRM (HubSpot), email marketing (ConvertKit)
- Category: sales-and-marketing.lead-acquisition.form-and-inbox-capture
- Template: templates/sales-and-marketing-inbox-leads-into-the-crm.workflow.ts

Watches the inbox for lead notification emails, parses the contact fields out of the email body, upserts the contact in the CRM, and tags the subscriber in the email marketing tool.

## 2. Calendar events into timesheets

- Trigger: Schedule, daily at 06:00
- Tools: calendar (Google Calendar), CRM (Salesforce)
- Category: hr.employee-lifecycle.time-and-attendance
- Template: templates/sales-and-marketing-calendar-events-into-timesheets.workflow.ts

Reads the calendar events of the previous day, matches the billable ones to the open projects in the CRM, and upserts one timesheet record per event.

## 3. AI review of support interactions

- Trigger: Schedule, every 2 hours
- Tools: spreadsheet (Airtable), AI model (OpenAI)
- Category: customer-support.interaction-analytics
- Template: templates/sales-and-marketing-ai-review-of-support-interactions.workflow.ts

Loads the support interactions not yet reviewed from a base, asks an AI model for the sentiment and a summary of each one, and writes the result back to the record.

## 4. Webhook events into a database with a follow-up workflow

- Trigger: Webhook, called by an external app for each event
- Tools: Webhook, database (Supabase)
- Category: generic-automation.data-movement
- Template: templates/sales-and-marketing-webhook-events-into-a-database.workflow.ts

Stores each incoming event as a database row, checks a status row to see whether a processing run is already active, and starts the processing sub-workflow when it is not.

## 5. Website uptime check

- Trigger: Schedule, every 30 minutes
- Tools: HTTP Request, notification (Slack)
- Category: devops.service-monitoring
- Template: templates/sales-and-marketing-website-uptime-check.workflow.ts

Requests every URL in a list, treats an error or a non-200 status as down, and posts a chat alert for each URL that failed.
