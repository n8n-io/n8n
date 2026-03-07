# PR: feature/ecommerce-shopify-automation

Resumen:

- Añade workflows n8n para automatizar pedidos nuevos de Shopify: registro en Google Sheets, envío de email al cliente, notificación Slack para pedidos de alto valor y flujo alternativo de facturación (CSV / QuickBooks placeholder).
- Fixtures para testing manual en `n8n/fixtures/`.
- `n8n/.env.example` con variables requeridas.
- Documentación de importación y pruebas en `n8n/README.md`.

Checklist de prueba (manual / local):

1. Copiar `n8n/.env.example` a `.env` y completar valores (no commitear `.env`).
2. Arrancar n8n localmente (docker / n8n CLI). Ejemplo rápido:
   - `docker run --rm -it -p 5678:5678 --env-file .env -v $PWD:/data n8nio/n8n:latest`
3. Importar workflows:
   - `n8n import:workflow --input=n8n/workflows/shopify-new-order.json`
   - `n8n import:workflow --input=n8n/workflows/shopify-billing.json`
4. Crear credenciales en UI: Google Sheets (Service Account), SMTP, Slack webhook.
5. Simular webhook (local):
   - `curl -H "Content-Type: application/json" --data @n8n/fixtures/order-normal.json http://localhost:5678/webhook/shopify-new-order`
   - `curl -H "Content-Type: application/json" --data @n8n/fixtures/order-highvalue.json http://localhost:5678/webhook/shopify-new-order`
6. Verificar:
   - Fila añadida en Google Sheets configurado.
   - Email enviado (ver logs SMTP or test sink).
   - Para high-value, mensaje en Slack webhook.
   - Si facturación falla, email fallback a `SUPPORT_EMAIL`.

Variables de entorno necesarias (documentadas en `n8n/.env.example`):
- `SHOPIFY_SHARED_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `SMTP_*`, `SLACK_WEBHOOK_URL`, `SUPPORT_EMAIL`, `HIGH_VALUE_THRESHOLD`.

Notas:
- No incluir credenciales reales en el repo. Usar n8n credentials o variables de entorno.
- QuickBooks está marcado como placeholder: si se quiere habilitar, agregar credenciales OAuth en n8n UI y configurar `QUICKBOOKS_*`.

Ejemplos de logs/resultados (simulación):
- fixture `order-normal.json` → Sheets row appended, email sent.
- fixture `order-highvalue.json` → Sheets row appended, email sent, Slack notified.


