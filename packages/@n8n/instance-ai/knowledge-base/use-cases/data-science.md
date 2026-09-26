# Use cases: Data science

Role id: `data-science`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way.

## 1. Help desk ticket for each new table request

- Trigger: New record in Airtable
- Tools: database (Airtable), help desk (Zendesk)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/data-science-help-desk-ticket-for-each-new-table-request.workflow.ts

Creates a help desk ticket for each request logged in the table and writes the ticket id back to the record.

## 2. Creative preview refresh in a spreadsheet

- Trigger: Schedule, hourly
- Tools: spreadsheet (Google Sheets), HTTP Request
- Category: sales-and-marketing.content.creative-assets
- Template: templates/data-science-creative-preview-refresh-in-a-spreadsheet.workflow.ts

Finds the ad rows whose preview screenshot is missing or failed, renders up to ten of them through a screenshot service and writes the image links back.

## 3. Bug tickets into a triage table

- Trigger: Webhook from the help desk on a tagged ticket
- Tools: Webhook, help desk (Zendesk), database (Airtable)
- Category: product-design.feature-request-triage
- Template: templates/data-science-bug-tickets-into-a-triage-table.workflow.ts

Receives the tickets tagged as product issues, stores the bug details in the triage table and marks the ticket as reported.

## 4. Hold notice for requests assigned in the table

- Trigger: Record assigned in Airtable
- Tools: database (Airtable), help desk (Zendesk)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/data-science-hold-notice-for-requests-assigned-in-the-table.workflow.ts

When a request gets an assignee, puts its ticket on hold with an internal note, creates the ticket first if the record has none, and stamps the acknowledgment time.

## 5. Ticket updates and team alerts from a table

- Trigger: Record answered in Airtable
- Tools: database (Airtable), help desk (Zendesk), notification (Slack)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/data-science-ticket-updates-and-team-alerts-from-a-table.workflow.ts

When a request is answered, reopens its ticket with the answer as an internal note, alerts the team when the ticket is already closed, and records when the agent was informed.
