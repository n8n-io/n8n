# Use cases: Engineering

Role id: `engineering`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Status counts into a totals table

- Trigger: Schedule, hourly
- Tools: spreadsheet (Airtable)
- Category: finance.reporting
- Template: templates/engineering-status-counts-into-a-totals-table.workflow.ts

Counts the records in the open, overdue and ready-to-bill views of a base every hour and writes each count to the row of that metric in a totals table.

## 2. Power outage roll call from chat statuses

- Trigger: Schedule, hourly
- Tools: chat (Slack), notification (Slack)
- Category: hr.employee-lifecycle.time-and-attendance
- Template: templates/engineering-power-outage-roll-call-from-chat-statuses.workflow.ts

Lists the chat workspace users every hour, keeps the ones whose status says they have a power outage, and posts one roll call of who is out and until when to a channel.

## 3. Form feedback into the CRM as notes

- Trigger: Webhook from the form tool
- Tools: Webhook, HTTP Request, CRM (HubSpot)
- Category: customer-support.feedback-handling
- Template: templates/engineering-form-feedback-into-the-crm-as-notes.workflow.ts

Receives each product feedback submission from a form webhook, picks the contact, category, section and comment fields, and logs the feedback as a note on the CRM contact and as a history entry in the internal CRM.

## 4. Daily lead report from the CRM

- Trigger: Schedule, daily at 17:00
- Tools: CRM (Salesforce), notification (Gmail)
- Category: sales-and-marketing.analytics.campaign-performance
- Template: templates/engineering-daily-lead-report-from-the-crm.workflow.ts

Queries the CRM every day at 17:00 for the leads a partner source created the day before, converts them to a CSV file, and sends the report with the file attached.

## 5. Incident alerts from notification emails

- Trigger: New email from the monitoring senders
- Tools: email (Gmail), AI model (OpenAI), HTTP Request
- Category: devops.incident-analysis
- Template: templates/engineering-incident-alerts-from-notification-emails.workflow.ts

Watches the inbox for mails from the monitoring senders, keeps the ones that mention an incident or an outage and are not replies, asks an AI model for a title and a summary, and posts the structured alert to a webhook.
