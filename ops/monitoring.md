# Monitoring & Backups for n8n Shopify Automation

Recommendations:

- Export workflows regularly and store them in source control (daily cron): `n8n export:workflow --id=<id>`. Keep backups in secure storage.
- Monitor n8n health endpoints and restarts. Use process supervisor (systemd/docker restart policies).
- Alerts to configure:
  - Failed executions > X per hour → Pager/Email
  - Repeated errors on billing nodes → Alert to finance ops
  - Google Sheets API quota errors → Alert to devops
- Backup Google Service Account credentials securely (vault) and rotate keys quarterly.
- Log retention: store n8n execution logs externally (e.g., ELK/CloudWatch) for 30–90 days.

Restore steps (quick):
1. Recreate n8n instance and restore `.n8n` directory if available.
2. Re-import workflows from `n8n/workflows/`.
3. Recreate credentials in n8n GUI (Google, SMTP, Slack, QuickBooks).



