# Use cases: Sales & Marketing

Role id: `sales-and-marketing`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Website leads into the CRM

- Trigger: Typeform submission
- Tools: form (Typeform), CRM (HubSpot), chat (Slack)
- Category: sales-and-marketing.lead-acquisition.form-and-inbox-capture

When a visitor submits the contact form, creates or updates the contact in HubSpot, scores it from the answers, and posts a summary in the sales Slack channel.

## 2. Lead emails parsed into the CRM

- Trigger: Gmail email with a lead label
- Tools: email (Gmail), CRM (HubSpot), email marketing (ConvertKit)
- Category: sales-and-marketing.lead-acquisition.form-and-inbox-capture

Reads lead notification emails from listing portals, extracts name, phone and interest, creates or updates the HubSpot contact, and tags it in ConvertKit.

## 3. Weekly pipeline digest

- Trigger: Schedule, Monday 8:00
- Tools: CRM (Pipedrive), chat (Slack), spreadsheet (Google Sheets)
- Category: sales-and-marketing.pipeline-reporting

Pulls open deals by stage from Pipedrive, computes the weekly movement, and posts a digest to Slack and a Google Sheets tab.

## 4. Enrich new leads before outreach

- Trigger: New row in Google Sheets
- Tools: spreadsheet (Google Sheets), Clearbit, Lemlist
- Category: sales-and-marketing.lead-enrichment

Looks up company size and industry with Clearbit, writes them back to the sheet, and adds the lead to the matching Lemlist campaign.

## 5. Newsletter from this week's posts

- Trigger: Schedule, Friday
- Tools: RSS, AI model (OpenAI), email marketing (Mailchimp)
- Category: sales-and-marketing.content.newsletter

Collects the posts published this week from the blog RSS feed, drafts a newsletter with an AI model, and creates a Mailchimp campaign draft for review.

## 6. Social posts from new articles

- Trigger: RSS feed new item
- Tools: RSS, AI model (OpenAI), chat (Slack), social (LinkedIn), social (X)
- Category: sales-and-marketing.content.social-distribution

Writes three post variants with an AI model, asks for approval in Slack, and publishes the approved ones on LinkedIn and X.

## 7. Webinar registrants to CRM and calendar

- Trigger: Zoom webinar registration
- Tools: Zoom, CRM (HubSpot), calendar (Google Calendar), chat (Slack)
- Category: sales-and-marketing.events.registration-sync

Adds each registrant to a HubSpot list for the webinar, sends a Google Calendar invite, and posts the daily registrant count to Slack.

## 8. Stale deals reminder

- Trigger: Schedule, daily
- Tools: CRM (HubSpot), chat (Slack)
- Category: sales-and-marketing.pipeline-hygiene

Finds HubSpot deals with no activity for 14 days and sends the owner a Slack reminder with the deal link.

## 9. Ad campaign performance report

- Trigger: Schedule, daily
- Tools: Google Ads, Facebook Graph API, spreadsheet (Google Sheets), chat (Slack)
- Category: sales-and-marketing.analytics.ad-reporting

Pulls yesterday's spend and conversions from Google Ads and Facebook Ads, appends them to Google Sheets, and flags campaigns whose cost per lead is above target in Slack.
