# Use cases: Customer support

Role id: `customer-support`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Triage new tickets with AI

- Trigger: Zendesk new ticket
- Tools: help desk (Zendesk), AI model (OpenAI), chat (Slack)
- Category: customer-support.ticket-triage

Classifies each new ticket by topic and urgency with an AI model, sets the Zendesk tags and priority, and routes urgent tickets to a Slack channel.

## 2. Daily ticket summary

- Trigger: Schedule, daily
- Tools: help desk (Intercom), chat (Slack)
- Category: customer-support.reporting

Counts yesterday's Intercom conversations by topic and first response time and posts a summary to Slack.

## 3. Coaching notes for support agents

- Trigger: Schedule, daily
- Tools: database (Airtable), AI model (OpenAI)
- Category: customer-support.interaction-analytics

Reviews the day's ticket summaries in Airtable, spots repeated mistakes in agent replies with an AI model, and writes short coaching notes back to Airtable.

## 4. Draft answers to FAQ emails

- Trigger: Gmail email in the support inbox
- Tools: email (Gmail), docs (Notion), AI model (OpenAI)
- Category: customer-support.auto-reply

Matches the question against a Notion FAQ database, drafts a reply with an AI model, and saves it as a Gmail draft for a person to send.

## 5. Low satisfaction alerts

- Trigger: Typeform survey response
- Tools: form (Typeform), spreadsheet (Google Sheets), chat (Slack)
- Category: customer-support.customer-feedback

Stores each survey response in Google Sheets and alerts the team lead in Slack when the score is 2 or lower, with the ticket link.

## 6. Bug reports to the engineering board

- Trigger: Zendesk ticket tagged bug
- Tools: help desk (Zendesk), issue tracker (Jira)
- Category: customer-support.escalation

Creates a Jira issue with the ticket details, links it in Zendesk, and posts the issue key as an internal note.

## 7. Refund requests to finance

- Trigger: Freshdesk ticket with a refund keyword
- Tools: help desk (Freshdesk), e-commerce (Shopify), chat (Slack)
- Category: customer-support.order-support

Looks up the order in Shopify, posts the refund request with the amount to a Slack approval channel, and updates the ticket when it is approved.

## 8. Weekly knowledge-base gaps

- Trigger: Schedule, weekly
- Tools: help desk (Zendesk), AI model (OpenAI), docs (Notion)
- Category: customer-support.knowledge-management

Clusters the week's Zendesk ticket subjects with an AI model, lists the topics without a help article, and creates Notion tasks to write them.
