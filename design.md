# Diseño - Automatización Shopify → n8n

Este documento describe el diseño del flujo de automatización para procesar pedidos nuevos de Shopify
y ejecutar acciones de registro, facturación (opcional) y notificaciones.

Objetivo
- Cuando llegue un pedido nuevo (Shopify Webhook), registrar los datos en Google Sheets, enviar
  confirmación por email al cliente y notificar internamente (Slack) si el pedido excede un umbral.

Diagrama de alto nivel (texto)
- Shopify (Webhook: orders/create)
  -> Webhook trigger (n8n)
    -> Function: normalizar payload (line items, impuestos, totales)
    -> Google Sheets: Append Row (guardar registro)
    -> Email (SMTP): enviar confirmación al cliente
    -> IF total >= HIGH_VALUE_THRESHOLD
       -> Slack: enviar notificación interna
    -> Alternate branch (facturación)
       -> QuickBooks (OAuth) / OR -> Generate CSV + Upload (SFTP/email)
    -> Error handling nodes: Retry (exponencial) + Log + Fallback email a soporte

Nodos previstos (n8n)
- Webhook (trigger) o Shopify node (Trigger: New Order)
- Function (JS) para mapear/normalizar line items y calcular totales
- Google Sheets (Append Row)
- Email (SMTP) para cliente
- Slack (Webhook) para notificaciones internas
- QuickBooks (opcional) o nodes para generar CSV y almacenarlo
- Set/IF/Workflow: para branching por valor del pedido
- Error Trigger / Cron para reintentos y fallback

Variables de entorno requeridas
- SHOPIFY_API_KEY (solo si se usa API; para webhook no es obligatorio)
- SHOPIFY_PASSWORD
- SHOPIFY_SHARED_SECRET (para verificar webhooks)
- GOOGLE_SERVICE_ACCOUNT_JSON (ruta o contenido JSON)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- SLACK_WEBHOOK_URL
- QUICKBOOKS_CLIENT_ID (opcional)
- QUICKBOOKS_CLIENT_SECRET (opcional)
- SUPPORT_EMAIL
- HIGH_VALUE_THRESHOLD (default 200)

Seguridad
- Nunca almacenar credenciales en el repo. Usar `n8n` credentials o variables de entorno.

Fixtures y pruebas
- Añadir ejemplos de payloads en `n8n/fixtures/`:
  - `order-normal.json` (pedido normal)
  - `order-highvalue.json` (pedido > HIGH_VALUE_THRESHOLD)

Import / despliegue local
- Instrucciones en `n8n/README.md` para importar workflow:
  `n8n import:workflow --input=n8n/workflows/shopify-new-order.json`

Observaciones
- Para la entrega inicial usar Slack para notificaciones (más simple que WhatsApp).
- Para facturación prefiero ofrecer export CSV + pasos para integrar QuickBooks como opción
  (QuickBooks requiere OAuth y credenciales externas; documentar el paso de conexión).

# Diseño: Automatización Shopify → n8n

Objetivo: recibir notificaciones de "New Order" desde Shopify y automatizar: registro en Google Sheets, envío de email al cliente, notificaciones internas (Slack) para pedidos de alto valor y opción de facturación (QuickBooks o CSV).

Diagrama de flujo (alto nivel):

- Shopify Webhook (New Order)
  -> Function: normalizar payload (line items, impuestos, totales)
    -> Google Sheets: Append Row (registro)
    -> Email: send customer confirmation
    -> If (total > HIGH_VALUE_THRESHOLD)
       -> Slack: post notification
    -> Optional: Facturación
       -> (HTTP Request QuickBooks) OR (Write CSV export)

Nodos previstos:
- Webhook (n8n) — endpoint para recibir payloads de Shopify (recomendado durante la demo usar webhook temporal de n8n o curl con fixtures)
- Function — normaliza: extrae line_items, calcula subtotal, impuestos y total en un formato plano para Sheets y email
- Google Sheets — Append Row (usa credencial Google Service Account)
- Email Send (SMTP) — plantilla sencilla al cliente
- If — decide notificaciones internas por umbral
- Slack (Webhook) — notificación para pedidos high-value
- HTTP Request — integración con QuickBooks (opcional)
- Write Binary / Move Binary Data or Google Drive — crear CSV export para contabilidad (alternativa a QuickBooks)
- Error handling nodes / workflows — en caso de fallo de facturación: reintentos + Email a soporte con payload y error

Variables de entorno requeridas (describo claves en `n8n/.env.example`):
- SHOPIFY_API_KEY, SHOPIFY_PASSWORD (opcional para Admin API)
- GOOGLE_SERVICE_ACCOUNT_JSON (ruta o JSON en base64 para el credential)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
- SLACK_WEBHOOK_URL
- QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET (opcional)
- SUPPORT_EMAIL (destino de fallback en errores)
- HIGH_VALUE_THRESHOLD (default 200)

Consideraciones de seguridad:
- Nunca persistir credenciales en el repo. Usar `n8n` credentials o variables de entorno. Documentado en `.env.example`.

Notas de despliegue y demo rápido:
- Se añade `n8n/workflows/shopify-new-order.json` exportable. Importar con:
  `n8n import:workflow --input=n8n/workflows/shopify-new-order.json`
- Durante la demo se puede simular el webhook con: `curl -H "Content-Type: application/json" --data @n8n/fixtures/order-normal.json http://localhost:5678/webhook/123` (ver `n8n/README.md`).



