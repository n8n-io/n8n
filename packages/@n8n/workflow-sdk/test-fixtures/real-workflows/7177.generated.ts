return workflow('YP981T0Pa3Ab6Dwg', 'Automated Pharmacy Inventory Alerts for Low Stock & Expiry Dates with Google Sheets', { executionOrder: 'v1' })
  .add(node({ type: 'n8n-nodes-base.cron', version: 1, config: { parameters: { triggerTimes: { item: [{ hour: 9 }] } }, position: [-1000, 440], name: 'Daily Stock Check' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 2, config: { parameters: {
      range: 'PharmacyInventory!A:E',
      options: {},
      sheetId: '{{your_google_sheet_id}}',
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [-780, 440], name: 'Fetch Stock Data' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [-560, 440], name: 'Wait For All Data' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get all input items from Google Sheets\nconst items = $input.all();\nconst alerts = [];\nconst lowStockItems = [];\nconst expiryItems = [];\n\nfor (const item of items) {\n  const data = item.json;\n\n  // Skip header row or empty entries\n  if (!data.medicine_name || data.medicine_name === \'medicine_name\') {\n    continue;\n  }\n\n  // Stock threshold (default 10 units if not specified)\n  const threshold = data.threshold || 10;\n\n  // Expiry warning in days (30 days before expiry)\n  const expiryWarningDays = 30;\n\n  // Check Low Stock\n  if (data.stock_quantity && parseInt(data.stock_quantity) <= threshold) {\n    const lowStockAlert = {\n      medicine_name: data.medicine_name,\n      stock_quantity: data.stock_quantity,\n      threshold: threshold,\n      type: "Low Stock",\n      alert_message: `LOW STOCK: ${data.medicine_name} has only ${data.stock_quantity} units remaining (threshold: ${threshold})`\n    };\n    \n    alerts.push(lowStockAlert);\n    lowStockItems.push(`• ${data.medicine_name}: ${data.stock_quantity} units (threshold: ${threshold})`);\n  }\n\n  // Check Expiry Date\n  if (data.expiry_date) {\n    const today = new Date();\n    const expiryDate = new Date(data.expiry_date);\n    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));\n\n    if (daysLeft <= expiryWarningDays) {\n      const expiryAlert = {\n        medicine_name: data.medicine_name,\n        expiry_date: data.expiry_date,\n        days_left: daysLeft,\n        type: daysLeft > 0 ? "Near Expiry" : "Expired",\n        alert_message: daysLeft > 0\n          ? `NEAR EXPIRY: ${data.medicine_name} expires in ${daysLeft} days (${data.expiry_date})`\n          : `EXPIRED: ${data.medicine_name} expired ${Math.abs(daysLeft)} days ago (${data.expiry_date})`\n      };\n      \n      alerts.push(expiryAlert);\n      expiryItems.push(daysLeft > 0 \n        ? `• ${data.medicine_name}: Expires in ${daysLeft} days (${data.expiry_date})`\n        : `• ${data.medicine_name}: EXPIRED ${Math.abs(daysLeft)} days ago (${data.expiry_date})`);\n    }\n  }\n}\n\n// Create summary for email\nconst emailSummary = {\n  lowStockList: lowStockItems.length > 0 ? lowStockItems.join(\'\\n\') : \'No low stock items found.\',\n  expiryList: expiryItems.length > 0 ? expiryItems.join(\'\\n\') : \'No items near expiry or expired.\',\n  totalAlerts: alerts.length,\n  timestamp: new Date().toISOString()\n};\n\n// Return all alerts with email summary\nif (alerts.length > 0) {\n  return [{ json: emailSummary }, ...alerts.map(alert => ({ json: alert }))];\n} else {\n  // Return empty summary if no alerts\n  return [{ json: emailSummary }];\n}'
    }, position: [-340, 440], name: 'Check Expiry Date and Low Stock' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 2, config: { parameters: {
      range: 'PharmacyInventory!A:E',
      options: {},
      sheetId: '{{your_google_sheet_id}}',
      operation: 'update',
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [-120, 440], name: 'Update Google Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.emailSend', version: 2.1, config: { parameters: {
      text: '=Hello Pharmacist,\n\nThis is an automated notification from the Pharmacy Inventory Monitoring System.\n\nThe following medicines require immediate attention as of {{ $now.format(\'YYYY-MM-DD\') }}:\n\nLOW STOCK ALERTS:\n{{ $json.lowStockList }}\n\nEXPIRY ALERTS (Near expiry or expired):\n{{ $json.expiryList }}\n\nACTION REQUIRED:\n- Please restock medicines with low quantity levels\n- Remove or return expired/near-expiry items to ensure patient safety\n- Update inventory levels in the Google Sheet after taking action\n\nFor questions about inventory management or system updates, please contact the pharmacy operations team.\n\nBest regards,\nAutomated Pharmacy Inventory System\nSunrise Pharmacy Operations\n\n---\nThis is an automated message. Please do not reply to this email.\n',
      options: {},
      subject: 'Pharmacy Inventory Alert - Low Stock & Expiry Notice - {{ $now.format(\'YYYY-MM-DD\') }}',
      toEmail: 'user@example.com',
      fromEmail: 'user@example.com',
      emailFormat: 'text'
    }, credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } }, position: [100, 440], name: 'Send Email Alert' } }))
  .add(sticky('## 📌 Automated Pharmacy Inventory Monitoring Workflow\n\n**Daily Operations Overview:**\n- **Daily Stock Check (9 AM)**: Automated trigger to monitor inventory levels\n- **Fetch Stock Data**: Retrieves current medicine data from Google Sheets\n- **Wait For All Data**: Ensures complete data retrieval before processing\n- **Check Expiry Date and Low Stock**: Analyzes inventory for alerts\n- **Update Google Sheet**: Records alert status and timestamps\n- **Send Email Alert**: Notifies pharmacist of low stock and expiry issues\n\n**Key Features:**\n✅ Low stock threshold monitoring\n✅ Expiry date tracking (30-day advance warning)\n✅ Automated email notifications\n✅ Google Sheets integration for easy management', { color: 4, position: [-1000, -40], width: 1020, height: 280 }))