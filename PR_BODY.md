Title: feature/ecommerce-shopify-automation — Shopify order automation (n8n)

Summary:

- Adds n8n workflows to automate Shopify "New Order" events: record orders to Google Sheets, send confirmation email to customer, notify Slack for high-value orders, and an alternative billing flow (CSV export / QuickBooks placeholder).
- Includes fixtures `n8n/fixtures/order-normal.json` and `n8n/fixtures/order-highvalue.json` for testing.
- `.env.example` documents required environment variables; do NOT commit secrets.
- `n8n/README.md` includes quickstart steps and curl commands to simulate webhooks.

Files changed:

- n8n/design.md (design and variables)
- n8n/workflows/shopify-new-order.json (main workflow)
- n8n/workflows/shopify-billing.json (billing alternative)
- n8n/fixtures/* (example payloads)
- n8n/.env.example
- n8n/README.md
- n8n/ops/monitoring.md

Testing steps (manual):

1. Copy `n8n/.env.example` to `.env` and fill values (Google service account JSON, sheet ID, SMTP, Slack webhook, SUPPORT_EMAIL).
2. Start n8n locally (docker or `n8n start`).
3. Import workflows: `n8n import:workflow --input=n8n/workflows/shopify-new-order.json`
4. Send fixture:
   `curl -H "Content-Type: application/json" --data @n8n/fixtures/order-normal.json http://localhost:5678/webhook/shopify-new-order`
5. Verify Google Sheet row and email delivery.

Notes for reviewers:
- No secrets are included. The `n8n/` folder is an embedded repo; workflows are exportable and importable into any n8n instance.
- QuickBooks integration is provided as an optional placeholder requiring OAuth credentials configured in n8n UI.


