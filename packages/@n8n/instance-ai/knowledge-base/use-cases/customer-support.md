# Use cases: Customer support

Role id: `customer-support`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Re-engagement emails after sign-up

- Trigger: Schedule, daily
- Tools: spreadsheet (Google Sheets), notification (Gmail)
- Category: sales-and-marketing.lead-acquisition.nurture-and-reengagement
- Template: templates/customer-support-re-engagement-emails-after-sign-up.workflow.ts

Reads the sign-up list every morning, emails the people who signed up 3 or 7 days ago and have not received that step yet, and marks the step as sent.

## 2. Unassign form tickets in the help desk

- Trigger: Schedule, hourly
- Tools: help desk (Intercom)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/customer-support-unassign-form-tickets-in-the-help-desk.workflow.ts

Lists the open conversations, keeps the tickets of a given type that sit with one agent and puts them back in the unassigned queue.

## 3. Payment notifications to invoices and a ledger

- Trigger: Webhook from the payment provider
- Tools: Webhook, HTTP Request, spreadsheet (Google Sheets)
- Category: finance.payments-and-ar
- Template: templates/customer-support-payment-notifications-to-invoices-and-a-ledger.workflow.ts

Receives each payment result, logs rejected payments, splits the approved amount into net and tax, creates the electronic invoice and appends the accounting entry to the ledger sheet.

## 4. AI ticket routing in the help desk

- Trigger: Webhook from the help desk on a new ticket
- Tools: Webhook, help desk (Gorgias), AI model (Google Gemini)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/customer-support-ai-ticket-routing-in-the-help-desk.workflow.ts

Asks an AI model for the contact reason and the right team of each new ticket, writes the reason to a custom field and assigns the ticket to the sales or post-purchase team.

## 5. Knowledge base refresh from a table

- Trigger: Schedule, daily
- Tools: database (Airtable), HTTP Request
- Category: generic-automation.rag-and-knowledge-tooling
- Template: templates/customer-support-knowledge-base-refresh-from-a-table.workflow.ts

Fetches the reference records from the table, renames the fields and uploads them as one table document to the assistant's knowledge base, replacing the previous version.
