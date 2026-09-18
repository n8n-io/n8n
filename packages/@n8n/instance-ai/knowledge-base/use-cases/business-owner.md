# Use cases: Business owner

Role id: `business-owner`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way. `rank.sh` prints `[set NAME=key]` for these swaps.

## 1. Product listings feed to file storage

- Trigger: Schedule, every 30 minutes
- Tools: HTTP Request, file storage (AWS S3)
- Category: ecommerce.catalog-and-listings
- Template: templates/business-owner-product-listings-feed-to-file-storage.workflow.ts

Fetches the current listings from the source API, converts them to the XML feed format a partner portal expects and uploads the file to a bucket.

## 2. Overdue task reminders from a database

- Trigger: Schedule, hourly
- Tools: database (MySQL), notification (Gmail)
- Category: other.education-operations
- Template: templates/business-owner-overdue-task-reminders-from-a-database.workflow.ts

Queries the database for items past their deadline, sends each owner a personal reminder and posts one summary for the team.

## 3. New client document alerts from the CRM

- Trigger: Schedule, every 15 minutes
- Tools: HTTP Request, notification (Slack)
- Category: sales-and-marketing.crm-operations
- Template: templates/business-owner-new-client-document-alerts-from-the-crm.workflow.ts

Polls the CRM activity feed for newly uploaded client documents, skips the ones already seen and alerts the team with a link to each new file.

## 4. Unread mail triage for phishing

- Trigger: Schedule, hourly
- Tools: email (Gmail), HTTP Request
- Category: security.threat-detection-response
- Template: templates/business-owner-unread-mail-triage-for-phishing.workflow.ts

Reads the unread messages, sends each one to an analyzer endpoint and labels it as phishing or legitimate in the mailbox.

## 5. Inbox summary by AI

- Trigger: Schedule, daily
- Tools: email (Gmail), AI model (OpenAI), notification (Gmail)
- Category: knowledge.email-management
- Template: templates/business-owner-inbox-summary-by-ai.workflow.ts

Collects the messages received during the day, asks an AI agent for a short bulleted summary and sends it to you.
