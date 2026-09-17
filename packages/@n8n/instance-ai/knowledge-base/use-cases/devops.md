# Use cases: DevOps

Role id: `devops`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Website health check

- Trigger: Schedule, every 5 minutes
- Tools: HTTP Request, chat (Slack)
- Category: devops.service-monitoring

Calls each site in a list, checks the status and response time, and sends a Slack alert with the failing URL when a check fails twice in a row.

## 2. Certificate expiry alerts

- Trigger: Schedule, daily
- Tools: HTTP Request, chat (Slack)
- Category: devops.service-monitoring.certificates

Queries an SSL check API for each domain and posts a Slack warning 30, 14 and 7 days before a certificate expires.

## 3. Release notifications

- Trigger: GitHub release published
- Tools: code hosting (GitHub), chat (Slack), issue tracker (Jira)
- Category: devops.ci-cd.notifications

Posts the release notes to Slack, creates the Jira version, and marks the linked issues as released.

## 4. Failed CI runs to the on-call channel

- Trigger: GitHub Actions run failed
- Tools: code hosting (GitHub), AI model (OpenAI), chat (Slack)
- Category: devops.ci-cd.failure-alerts

Fetches the failing job log, summarizes the error with an AI model, and posts it to Slack with a link to the run.

## 5. Incident channel setup

- Trigger: PagerDuty incident triggered
- Tools: incident alerting (PagerDuty), chat (Slack), issue tracker (Jira)
- Category: devops.incident-management

Creates a Slack channel for the incident, invites the on-call engineers, posts the runbook link, and opens a Jira incident ticket.

## 6. Cloud cost report

- Trigger: Schedule, daily
- Tools: AWS, spreadsheet (Google Sheets), chat (Slack)
- Category: devops.cost-management

Pulls yesterday's AWS cost by service, appends it to Google Sheets, and alerts in Slack when spend is above the daily budget.

## 7. Backup verification

- Trigger: Schedule, daily
- Tools: file storage (AWS S3), email (Gmail)
- Category: devops.backups

Lists yesterday's backup files in S3, checks their size and age, and emails the team when a backup is missing or too small.

## 8. Error tracker issues to the issue tracker

- Trigger: Sentry alert
- Tools: error tracking (Sentry), issue tracker (Jira)
- Category: devops.error-tracking

Groups new Sentry issues by fingerprint, creates a Jira bug for new groups, and comments on the existing issue for repeats.
