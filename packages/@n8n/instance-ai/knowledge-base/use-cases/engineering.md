# Use cases: Engineering

Role id: `engineering`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.
`Template:` names a workflow source in `templates/` to start the build from; swap the tool nodes marked with the family comment. A `notification` family (send a message or mail) means the template holds one ready node per tool behind its `NOTIFY` constant; an `email` family (read a mailbox) with an `INBOX` constant and a `spreadsheet` family with a `SPREADSHEET` constant work the same way. `rank.sh` prints `[set NAME=key]` for these swaps.

## 1. Pull request review reminders

- Trigger: Schedule, weekday mornings
- Tools: code hosting (GitHub), notification (Slack)
- Category: engineering.code-review
- Template: templates/engineering-pull-request-review-reminders.workflow.ts

Lists GitHub pull requests waiting for review for more than 24 hours and pings the reviewers in Slack.

## 2. Ticket from a chat message

- Trigger: Slack emoji reaction
- Tools: chat (Slack), issue tracker (Jira)
- Category: engineering.task-intake
- Template: templates/engineering-ticket-from-a-chat-message.workflow.ts

When someone reacts with the ticket emoji, creates a Jira issue from the message text and replies in the thread with the issue link.

## 3. Release notes draft

- Trigger: GitHub tag pushed
- Tools: code hosting (GitHub), AI model (OpenAI)
- Category: engineering.release-management
- Template: templates/engineering-release-notes-draft.workflow.ts

Collects the pull requests merged since the last tag, drafts release notes with an AI model, and opens a GitHub release draft.

## 4. Third-party API change alerts

- Trigger: Schedule, daily
- Tools: HTTP Request, n8n Data Table, notification (Slack)
- Category: engineering.dependency-monitoring
- Template: templates/engineering-third-party-api-change-alerts.workflow.ts

Fetches the OpenAPI spec of a third-party API, diffs it with yesterday's copy stored in a data table, and posts the changes to Slack.

## 5. Standup summary

- Trigger: Schedule, daily 9:00
- Tools: code hosting (GitHub), issue tracker (Jira), notification (Slack)
- Category: engineering.team-rituals
- Template: templates/engineering-standup-summary.workflow.ts

Collects yesterday's GitHub commits and Jira transitions per team member and posts a standup summary to Slack.

## 6. Flaky test tracker

- Trigger: CI webhook
- Tools: Webhook, database (Postgres), issue tracker (Jira)
- Category: engineering.test-quality
- Template: templates/engineering-flaky-test-tracker.workflow.ts

Records failed test names per run in Postgres, flags tests that both failed and passed on the same commit, and opens a Jira task for tests flaky three times in a week.

## 7. Developer onboarding checklist

- Trigger: New row in Google Sheets
- Tools: spreadsheet (Google Sheets), code hosting (GitHub), docs (Notion), notification (Slack)
- Category: engineering.developer-onboarding
- Template: templates/engineering-developer-onboarding-checklist.workflow.ts

Sends the GitHub organization invitation, creates a Notion onboarding page from a template, and posts a Slack welcome message with the first tasks.

## 8. Dependency vulnerability digest

- Trigger: Schedule, weekly
- Tools: code hosting (GitHub), notification (Slack)
- Category: engineering.security-hygiene
- Template: templates/engineering-dependency-vulnerability-digest.workflow.ts

Reads Dependabot alerts from GitHub for all repositories, groups them by severity, and posts a digest to Slack with the oldest open alerts.
