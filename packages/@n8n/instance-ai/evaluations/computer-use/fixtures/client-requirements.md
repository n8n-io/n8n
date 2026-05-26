# Client Requirements — Lead Notification Workflow

## Goal

When a new contact is submitted via our website form, the team should
receive a Slack notification in `#sales-leads` within one minute.

## Trigger

The website form posts to a webhook (POST). Payload shape:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Corp",
  "message": "interested in enterprise plan"
}
```

## Notification

Slack message in `#sales-leads`:

> 🚨 New lead: Jane Doe (jane@example.com) from Acme Corp
> "interested in enterprise plan"

## Acceptance criteria

- The workflow runs on every webhook submission.
- A Slack message is posted to `#sales-leads`.
- The message contains the contact's name, email, and company.
- If Slack posting fails, the failure is logged but the webhook still
  returns 200 OK so the form doesn't show an error to the user.

## Non-goals

- We are not storing leads in a database for this iteration.
- We are not sending email notifications.
