# Use cases: IT

Role id: `it`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. New hire account setup

- Trigger: New employee in BambooHR
- Tools: HR system (BambooHR), user directory (Google Workspace Admin), chat (Slack), email (Gmail)
- Category: it.identity.onboarding

Creates the Google Workspace account, adds the user to the right Slack channels and Google Groups, and emails the manager the checklist.

## 2. Employee offboarding

- Trigger: BambooHR termination
- Tools: HR system (BambooHR), user directory (Google Workspace Admin), chat (Slack), code hosting (GitHub), spreadsheet (Google Sheets)
- Category: it.identity.offboarding

Suspends the Google Workspace account, removes the user from Slack and GitHub, transfers Drive files to the manager, and logs each step in Google Sheets.

## 3. Help desk ticket from chat

- Trigger: Slack slash command
- Tools: chat (Slack), issue tracker (Jira)
- Category: it.helpdesk.intake

Opens a Jira Service Management ticket from the command text, replies with the ticket link, and updates the thread when the status changes.

## 4. Password reset requests

- Trigger: n8n Form submission
- Tools: form (n8n Form), identity provider (Okta), email (Gmail)
- Category: it.helpdesk.self-service

Verifies the requester against the directory, triggers the Okta reset, and notifies the user by email.

## 5. Software license audit

- Trigger: Schedule, monthly
- Tools: identity provider (Okta), spreadsheet (Google Sheets), email (Gmail)
- Category: it.asset-management.licenses

Lists Okta app assignments, compares them with the license counts in Google Sheets, and emails a report of unused seats.

## 6. Device compliance reminders

- Trigger: Schedule, daily
- Tools: HTTP Request, chat (Slack)
- Category: it.endpoint-management

Pulls devices out of compliance from the device management API, matches them to owners in the directory, and sends each owner a Slack reminder.

## 7. Access request approvals

- Trigger: Google Forms submission
- Tools: spreadsheet (Google Sheets), chat (Slack), user directory (Google Workspace Admin)
- Category: it.identity.access-requests

Posts the request to the approver in Slack with approve and deny buttons, grants the Google Group membership on approval, and records the decision in Google Sheets.

## 8. Weekly outage report

- Trigger: Schedule, weekly
- Tools: HTTP Request, chat (Slack), docs (Notion)
- Category: it.reporting

Reads the week's incidents from the status page API and posts a summary with total downtime to Slack and Notion.
