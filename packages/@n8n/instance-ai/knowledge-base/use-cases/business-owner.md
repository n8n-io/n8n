# Use cases: Business owner

Role id: `business-owner`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Overdue invoice reminders

- Trigger: Schedule, daily
- Tools: accounting (QuickBooks), email (Gmail), chat (Slack)
- Category: finance.accounts-receivable

Finds overdue invoices in QuickBooks, sends a friendly reminder email per customer, and posts the total overdue amount in Slack.

## 2. New customer welcome sequence

- Trigger: Stripe payment succeeded
- Tools: payments (Stripe), email marketing (Mailchimp), docs (Notion)
- Category: sales-and-marketing.customer-lifecycle.onboarding

Adds the customer to Mailchimp, sends the welcome email with the getting-started guide, and creates a day-7 follow-up task in Notion.

## 3. Daily sales summary

- Trigger: Schedule, evening
- Tools: e-commerce (Shopify), chat (Telegram)
- Category: business.reporting.daily-sales

Totals the day's Shopify orders and refunds and sends a short Telegram message with revenue and top products.

## 4. Bookings to calendar and CRM

- Trigger: Calendly invitee created
- Tools: scheduling (Calendly), calendar (Google Calendar), CRM (HubSpot), SMS (Twilio)
- Category: business.scheduling

Adds the event to Google Calendar, creates or updates the contact in HubSpot, and sends a confirmation SMS with Twilio.

## 5. Review requests after purchase

- Trigger: Shopify order fulfilled
- Tools: e-commerce (Shopify), email (Gmail), spreadsheet (Google Sheets)
- Category: sales-and-marketing.reputation

Waits five days, then emails the customer a review link and logs the request in Google Sheets.

## 6. Receipts to bookkeeping

- Trigger: Gmail email with an attachment
- Tools: email (Gmail), AI model (OpenAI), file storage (Google Drive), spreadsheet (Google Sheets)
- Category: finance.bookkeeping

Extracts the vendor, date and amount from receipt attachments with an AI model, saves the file to Google Drive, and adds a row to the expenses sheet.

## 7. Contact form to inbox and CRM

- Trigger: Webflow form submission
- Tools: form (Webflow), email (Gmail), CRM (Pipedrive)
- Category: sales-and-marketing.lead-acquisition.form-and-inbox-capture

Emails the owner, creates the lead in Pipedrive, and sends the visitor an acknowledgement.

## 8. Brand mentions monitor

- Trigger: Schedule, hourly
- Tools: social (X), social (Reddit), AI model (OpenAI), chat (Slack)
- Category: sales-and-marketing.brand-monitoring

Searches X and Reddit for the brand name, filters noise with an AI model, and posts relevant mentions to Slack.
