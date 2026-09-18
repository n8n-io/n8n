# Use cases: IT

Role id: `it`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way. `rank.sh` prints `[set NAME=key]` for these swaps.

## 1. Missing house number check on new orders

- Trigger: New order in Shopify
- Tools: e-commerce (Shopify), notification (Gmail)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/it-missing-house-number-check-on-new-orders.workflow.ts

Checks the shipping address of each new order and asks the customer for the house number when the address has none.

## 2. Tasks from labeled mail into a docs database

- Trigger: Schedule, every 30 minutes
- Tools: email (Gmail), AI model (OpenAI), docs (Notion)
- Category: knowledge.task-project-management
- Template: templates/it-tasks-from-labeled-mail-into-a-docs-database.workflow.ts

Reads the unread mails with the task label, turns each into a short task title with AI, adds it to the task database and marks the mail as read.

## 3. Workflow backups to a Git repository

- Trigger: Schedule, every 12 hours
- Tools: n8n API, code hosting (GitHub)
- Category: devops.unclassified
- Template: templates/other-workflow-backups-to-git.workflow.ts

Exports every workflow of the instance and commits the changed or new ones as JSON files to a repository.

## 4. Firewall allow-list refresh with the current IP

- Trigger: Schedule, hourly
- Tools: HTTP Request, notification (Gmail)
- Category: devops.unclassified
- Template: templates/it-firewall-allow-list-refresh-with-the-current-ip.workflow.ts

Looks up the public IP of the instance, adds an allow rule for it in the firewall and confirms the new rule by mail.

## 5. Card statements from the inbox to file storage

- Trigger: Schedule, hourly
- Tools: email (Gmail), file storage (Google Drive)
- Category: finance.document-capture.receipts-expenses
- Template: templates/it-card-statements-from-the-inbox-to-file-storage.workflow.ts

Reads the unread mails with the card statement label, uploads their attachments to the statements folder and marks the mails as read.
