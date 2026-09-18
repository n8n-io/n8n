# Use cases: Product and design

Role id: `product-design`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way. `rank.sh` prints `[set NAME=key]` for these swaps.

## 1. Alert log and chat notification

- Trigger: Webhook, called by a monitoring tool when an alarm fires
- Tools: Webhook, database (Microsoft SQL), notification (Microsoft Teams)
- Category: devops.service-monitoring
- Template: templates/product-design-alert-log-and-notification.workflow.ts

Receives an alarm from a monitoring tool, stores it as a row in a database table, and posts a summary to a chat channel.

## 2. Web page change tracker

- Trigger: Schedule, every 4 hours
- Tools: HTTP Request, notification (Slack)
- Category: generic-automation.content-aggregation
- Template: templates/product-design-web-page-change-tracker.workflow.ts

Fetches a web page, extracts the links, keeps the ones not seen in earlier runs, and posts each new one to a chat channel.

## 3. Member bookings into a spreadsheet

- Trigger: Schedule, daily
- Tools: spreadsheet (Google Sheets), HTTP Request
- Category: customer-support.assistant-chatbots.booking-reservation-management
- Template: templates/product-design-bookings-into-a-spreadsheet.workflow.ts

Reads the member list from a spreadsheet, fetches the bookings of each member from the booking system API, and writes the attendance flags back to the member row.

## 4. Webhook messages into help desk tickets

- Trigger: Webhook, called by an external app or a form
- Tools: Webhook, help desk (Zendesk)
- Category: customer-support.multichannel-ticketing-and-sla
- Template: templates/product-design-webhook-to-help-desk-ticket.workflow.ts

Receives a message from an external app, maps it to a ticket, creates the ticket in the help desk, and returns the ticket id to the caller.

## 5. Interview cost update after an interview

- Trigger: Webhook, called by the interview tool when an interview ends
- Tools: Webhook, database (Postgres)
- Category: hr.recruitment.interview-coordination
- Template: templates/product-design-interview-cost-update.workflow.ts

Looks up the interview and the interviewer rates in a database, calculates the cost, the incentive, and the deduction for late feedback, and inserts a cost history row.
