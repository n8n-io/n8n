# Use cases: Security

Role id: `security`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Phishing report triage

- Trigger: Gmail email in the phishing report inbox
- Tools: email (Gmail), VirusTotal, issue tracker (Jira)
- Category: security.email-security

Extracts the sender, links and attachments, checks the URLs with VirusTotal, and opens a Jira ticket with the verdict.

## 2. New admin role alerts

- Trigger: Okta system log event
- Tools: identity provider (Okta), chat (Slack)
- Category: security.identity.privilege-monitoring

Posts each admin role grant to Slack with who did it and asks the security lead to confirm it.

## 3. Vulnerability scan digest

- Trigger: Schedule, daily
- Tools: HTTP Request, issue tracker (Jira)
- Category: security.vulnerability-management

Fetches new findings from the scanner API, removes the ones already in Jira, and creates tickets for critical and high findings.

## 4. Leaked credentials watch

- Trigger: Schedule, daily
- Tools: HTTP Request, email (Gmail), chat (Slack)
- Category: security.threat-intelligence

Checks the company domains against a breach database API, emails affected users reset instructions, and posts a summary to the security Slack channel.

## 5. Quarterly access review

- Trigger: Schedule, quarterly
- Tools: identity provider (Okta), spreadsheet (Google Sheets), email (Gmail)
- Category: security.compliance.access-reviews

Exports Okta group memberships to Google Sheets, emails each owner a review link, and tracks confirmations until all are done.

## 6. Suspicious login alerts

- Trigger: Auth0 log stream event
- Tools: Webhook, email (Gmail), chat (Slack)
- Category: security.identity.anomaly-detection

Flags logins from new countries or impossible travel, notifies the user by email, and posts the event to the SOC Slack channel.

## 7. Security questionnaire answers

- Trigger: New row in Google Sheets
- Tools: spreadsheet (Google Sheets), docs (Notion), AI model (OpenAI)
- Category: security.compliance.vendor-questionnaires

Drafts answers from the policy documents in Notion with an AI model and writes them back to the sheet for review.

## 8. Cloud misconfiguration alerts

- Trigger: AWS Security Hub finding
- Tools: AWS, chat (Slack), issue tracker (Jira)
- Category: security.cloud-security

Enriches the finding with the resource owner from a tag, posts it to Slack, and creates a Jira ticket for high severity.
