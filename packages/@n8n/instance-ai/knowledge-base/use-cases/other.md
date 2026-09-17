# Use cases: Other roles

Role id: `other`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Save email attachments to cloud storage

- Trigger: Gmail email with an attachment
- Tools: email (Gmail), file storage (Google Drive), spreadsheet (Google Sheets)
- Category: generic-automation.file-management

Saves attachments to a Google Drive folder named by sender and month and logs the file link in Google Sheets.

## 2. Webhook events to a database

- Trigger: Webhook
- Tools: Webhook, database (Supabase)
- Category: generic-automation.data-movement

Stores each incoming event in Supabase and starts a processing sub-workflow when none is running.

## 3. Daily calendar briefing

- Trigger: Schedule, 7:00
- Tools: calendar (Google Calendar), task manager (Todoist), chat (Telegram)
- Category: productivity.personal-assistant

Lists today's Google Calendar events and open Todoist tasks and sends a briefing to Telegram.

## 4. Timesheet from calendar events

- Trigger: Schedule, 6:00
- Tools: calendar (Google Calendar), docs (Notion), CRM (Salesforce)
- Category: hr.employee-lifecycle.time-and-attendance

Takes yesterday's billable Google Calendar events, matches them to client projects, and logs time entries in Notion and the CRM.

## 5. Sync two spreadsheets

- Trigger: Schedule, hourly
- Tools: spreadsheet (Google Sheets), chat (Slack)
- Category: generic-automation.data-sync

Copies new and changed rows from one Google Sheet to another, keyed by an id column, and posts the number of changes to Slack.

## 6. Summarize long emails

- Trigger: Gmail email above a length threshold
- Tools: email (Gmail), AI model (OpenAI), chat (Slack)
- Category: productivity.email

Summarizes the email in three bullets with an AI model and forwards the summary to Slack.

## 7. Form to PDF and email

- Trigger: n8n Form submission
- Tools: form (n8n Form), docs (Google Docs), email (Gmail), file storage (Google Drive)
- Category: generic-automation.document-generation

Fills a Google Docs template, exports it as PDF, emails it to the requester, and stores it in Google Drive.

## 8. Feed digest in team chat

- Trigger: Schedule, daily
- Tools: RSS, chat (Slack)
- Category: productivity.information-monitoring

Collects new items from a list of RSS feeds, removes duplicates, and posts a morning digest to Slack.
