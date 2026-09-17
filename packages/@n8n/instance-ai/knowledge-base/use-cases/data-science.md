# Use cases: Data science

Role id: `data-science`. Ranked by how common the automation is, 1 is the most common.
Tools are listed as family (example): any tool of the same family works, for example Outlook instead of Gmail.

## 1. Daily data quality checks

- Trigger: Schedule, daily
- Tools: database (Postgres), chat (Slack)
- Category: data-science.data-quality

Runs row-count and null-rate queries on Postgres tables, compares them with yesterday, and alerts in Slack when a metric moves more than 20 percent.

## 2. Refresh a warehouse table from an API

- Trigger: Schedule, hourly
- Tools: HTTP Request, data warehouse (Google BigQuery)
- Category: data-science.data-pipeline

Pulls new records from a REST API with pagination, removes duplicates, and appends them to a BigQuery table.

## 3. Experiment results digest

- Trigger: Schedule, Monday
- Tools: spreadsheet (Google Sheets), chat (Slack)
- Category: data-science.experimentation

Reads A/B test results from Google Sheets, computes lift and significance in a Code node, and posts a digest to Slack.

## 4. Label training data with an AI model

- Trigger: New rows in Airtable
- Tools: database (Airtable), AI model (OpenAI)
- Category: data-science.labeling

Sends unlabeled text rows to an AI model with the labeling guide, writes the label and confidence back, and flags low-confidence rows for review.

## 5. Model drift alert

- Trigger: Webhook from the prediction service
- Tools: Webhook, database (Postgres), issue tracker (Jira)
- Category: data-science.ml-ops.monitoring

Stores prediction summaries in Postgres, computes weekly distribution shifts, and opens a Jira ticket when the drift crosses the threshold.

## 6. Weekly KPI report

- Trigger: Schedule, weekly
- Tools: data warehouse (Snowflake), QuickChart, email (Gmail)
- Category: data-science.reporting

Queries Snowflake for the weekly KPIs, renders a chart image, and emails the report to stakeholders with Gmail.

## 7. Competitor price tracker

- Trigger: Schedule, daily
- Tools: HTTP Request, HTML, spreadsheet (Google Sheets), chat (Slack)
- Category: data-science.data-collection

Fetches product pages, extracts prices with the HTML node, stores them in Google Sheets, and alerts in Slack on changes.

## 8. Survey responses to a clean dataset

- Trigger: Typeform submission
- Tools: form (Typeform), AI model (OpenAI), database (Postgres)
- Category: data-science.data-preparation

Normalizes the answers, maps free text to categories with an AI model, and inserts the row into Postgres.
