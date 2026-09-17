# Use cases: Product & Design

Role id: `product-design`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Feedback channel to a database

- Trigger: Slack message in the feedback channel
- Tools: chat (Slack), AI model (OpenAI), docs (Notion)
- Category: product.feedback-management

Extracts the request, tags it by product area with an AI model, and adds it to the Notion feedback database with a link to the message.

## 2. Weekly feature request digest

- Trigger: Schedule, weekly
- Tools: help desk (Intercom), docs (Notion), AI model (OpenAI), chat (Slack)
- Category: product.feedback-analytics

Clusters new Intercom conversations and Notion feedback by theme with an AI model and posts a ranked digest to Slack.

## 3. Design comments to the issue tracker

- Trigger: Figma file comment
- Tools: design tool (Figma), issue tracker (Jira)
- Category: product-design.design-handoff

Creates a Jira sub-task for comments that mention the dev handle and posts the link back as a reply.

## 4. User interview scheduling

- Trigger: Calendly invitee created
- Tools: scheduling (Calendly), email (Gmail), docs (Notion), chat (Slack)
- Category: product-design.user-research

Sends the consent form, creates the Notion interview page from a template, and reminds the interviewer in Slack an hour before.

## 5. Interview notes summarizer

- Trigger: New file in a Google Drive folder
- Tools: file storage (Google Drive), AI model (OpenAI), docs (Notion)
- Category: product-design.user-research.synthesis

Transcribes the recording, summarizes insights and quotes with an AI model, and appends them to the Notion research repository.

## 6. Release announcement draft

- Trigger: Jira version released
- Tools: issue tracker (Jira), AI model (OpenAI), chat (Slack)
- Category: product.release-communication

Collects the shipped issues, drafts an announcement in the product voice with an AI model, and posts it for review in Slack.

## 7. NPS follow-ups

- Trigger: Typeform NPS response
- Tools: form (Typeform), email (Gmail), help desk (Zendesk), spreadsheet (Google Sheets)
- Category: product.customer-feedback.nps

Thanks promoters with a review link, creates a Zendesk ticket for detractors with their comment, and logs everything in Google Sheets.

## 8. Roadmap updates to stakeholders

- Trigger: Notion roadmap item status change
- Tools: docs (Notion), chat (Slack), email (Gmail)
- Category: product.roadmap-communication

When an item moves to In progress or Shipped, posts an update to the stakeholders' Slack channel and emails the customers who asked for it.
