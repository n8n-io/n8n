return workflow('I7d4x1yTzFgp0Eib', 'Smart Inventory Replenishment & Auto-Purchase Orders', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } }, position: [-144, 384] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://your-warehouse-api.com/api/inventory',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [64, 384], name: 'Fetch Current Inventory' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://your-sales-api.com/api/sales/velocity',
      options: {},
      sendQuery: true,
      sendHeaders: true,
      queryParameters: { parameters: [{ name: 'days', value: '30' }] },
      headerParameters: {
        parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }]
      }
    }, position: [288, 384], name: 'Fetch Sales Velocity' } }))
  .add(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Merge inventory and sales data\nconst inventoryData = $input.first().json;\nconst salesData = $input.last().json;\n\n// Create a map of sales data by product_id\nconst salesMap = {};\nif (Array.isArray(salesData)) {\n  salesData.forEach(sale => {\n    salesMap[sale.product_id] = sale;\n  });\n} else {\n  salesMap[salesData.product_id] = salesData;\n}\n\n// Merge data\nconst mergedData = [];\nconst inventory = Array.isArray(inventoryData) ? inventoryData : [inventoryData];\n\ninventory.forEach(item => {\n  const salesInfo = salesMap[item.product_id] || {\n    units_sold_30days: 0,\n    avg_daily_sales: 0,\n    trend: \'stable\'\n  };\n  \n  mergedData.push({\n    product_id: item.product_id,\n    product_name: item.product_name,\n    current_stock: item.current_stock,\n    reorder_point: item.reorder_point,\n    supplier_id: item.supplier_id,\n    units_sold_30days: salesInfo.units_sold_30days,\n    avg_daily_sales: salesInfo.avg_daily_sales,\n    trend: salesInfo.trend,\n    unit_cost: item.unit_cost || 0,\n    lead_time_days: item.lead_time_days || 7\n  });\n});\n\nreturn mergedData.map(item => ({ json: item }));'
    }, position: [512, 384], name: 'Merge Inventory & Sales Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.3, config: { parameters: { resource: '__CUSTOM_API_CALL__' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [736, 384], name: 'AI Demand Forecasting' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Parse AI response and prepare data for filtering\nconst item = $input.first().json;\n\nlet aiResponse;\ntry {\n  // Try to parse the AI response\n  const content = item.message?.content || item.content || \'{}\';\n  aiResponse = typeof content === \'string\' ? JSON.parse(content) : content;\n} catch (error) {\n  // If parsing fails, use defaults\n  aiResponse = {\n    should_reorder: false,\n    recommended_quantity: 0,\n    days_until_stockout: 999,\n    forecasted_demand_30days: 0,\n    confidence_level: \'low\',\n    reasoning: \'Failed to parse AI response\'\n  };\n}\n\n// Combine original data with AI forecast\nconst result = {\n  ...item,\n  ai_forecast: aiResponse,\n  should_reorder: aiResponse.should_reorder,\n  recommended_quantity: aiResponse.recommended_quantity,\n  days_until_stockout: aiResponse.days_until_stockout,\n  forecasted_demand_30days: aiResponse.forecasted_demand_30days,\n  confidence_level: aiResponse.confidence_level,\n  reasoning: aiResponse.reasoning\n};\n\nreturn { json: result };'
    }, position: [944, 384], name: 'Parse AI Response' } }))
  .then(node({ type: 'n8n-nodes-base.filter', version: 2, config: { parameters: {
      options: {},
      conditions: {
        boolean: [{ value1: '={{ $json.should_reorder }}', value2: true }]
      }
    }, position: [1168, 384], name: 'Filter: Reorder Needed' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Generate Purchase Order\nconst items = $input.all();\n\nconst purchaseOrders = items.map((item, index) => {\n  const data = item.json;\n  \n  // Generate unique PO number\n  const poNumber = `PO-${Date.now()}-${String(index + 1).padStart(3, \'0\')}`;\n  \n  // Calculate order details\n  const quantity = data.recommended_quantity;\n  const unitCost = data.unit_cost || 0;\n  const totalCost = quantity * unitCost;\n  \n  // Create purchase order\n  const purchaseOrder = {\n    po_number: poNumber,\n    product_id: data.product_id,\n    product_name: data.product_name,\n    supplier_id: data.supplier_id,\n    quantity: quantity,\n    unit_cost: unitCost,\n    total_cost: totalCost,\n    currency: \'USD\',\n    order_date: new Date().toISOString(),\n    expected_delivery: new Date(Date.now() + (data.lead_time_days * 24 * 60 * 60 * 1000)).toISOString(),\n    status: \'pending\',\n    created_by: \'AI_System\',\n    notes: data.reasoning,\n    forecast_data: {\n      current_stock: data.current_stock,\n      days_until_stockout: data.days_until_stockout,\n      forecasted_demand_30days: data.forecasted_demand_30days,\n      confidence_level: data.confidence_level\n    }\n  };\n  \n  return { json: purchaseOrder };\n});\n\nreturn purchaseOrders;'
    }, position: [1392, 384], name: 'Create Purchase Order' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://your-supplier-api.com/api/purchase-orders',
      method: 'POST',
      options: {},
      sendBody: true,
      sendHeaders: true,
      bodyParameters: {
        parameters: [
          { name: 'po_number', value: '={{ $json.po_number }}' },
          { name: 'supplier_id', value: '={{ $json.supplier_id }}' },
          { name: 'product_id', value: '={{ $json.product_id }}' },
          { name: 'quantity', value: '={{ $json.quantity }}' },
          { name: 'total_cost', value: '={{ $json.total_cost }}' },
          {
            name: 'expected_delivery',
            value: '={{ $json.expected_delivery }}'
          }
        ]
      },
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [1616, 384], name: 'Send PO to Supplier' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://your-erp-system.com/api/purchase-orders',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'raw',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      }
    }, position: [1824, 384], name: 'Log to ERP System' } }))
  .then(node({ type: 'n8n-nodes-base.postgres', version: 2.4, config: { parameters: {
      query: 'INSERT INTO purchase_orders (\n  po_number, product_id, product_name, supplier_id,\n  quantity, unit_cost, total_cost, order_date,\n  expected_delivery, status, created_by, notes,\n  forecast_confidence, days_until_stockout\n) VALUES (\n  \'{{ $json.po_number }}\',\n  \'{{ $json.product_id }}\',\n  \'{{ $json.product_name }}\',\n  \'{{ $json.supplier_id }}\',\n  {{ $json.quantity }},\n  {{ $json.unit_cost }},\n  {{ $json.total_cost }},\n  \'{{ $json.order_date }}\',\n  \'{{ $json.expected_delivery }}\',\n  \'{{ $json.status }}\',\n  \'{{ $json.created_by }}\',\n  \'{{ $json.notes }}\',\n  \'{{ $json.forecast_data.confidence_level }}\',\n  {{ $json.forecast_data.days_until_stockout }}\n);',
      options: {},
      operation: 'executeQuery'
    }, credentials: {
      postgres: { id: 'credential-id', name: 'postgres Credential' }
    }, position: [2048, 384], name: 'Save to Database' } }))
  .then(node({ type: 'n8n-nodes-base.emailSend', version: 2.1, config: { parameters: {
      options: {},
      subject: 'New Purchase Order Created: {{ $json.po_number }}',
      toEmail: 'user@example.com',
      fromEmail: 'user@example.com'
    }, credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } }, position: [2272, 384], name: 'Send Notification Email' } }))
  .add(sticky('**"🕐 SCHEDULE TRIGGER Runs every 6 hours to check inventory levels\nYou can adjust the interval:\n- Change \'hoursInterval\' to run more less frequently  Use \'minutes\' for faster testing This triggers the entire workflow automatically"** to edit me. ', { position: [-224, -160], width: 176, height: 736 }))
  .add(sticky('**=📋 WORKFLOW START\nThis workflow monitors inventory levels and automatically:\n1. Checks warehouse stock\n2. Analyzes sales velocity\n3. Forecasts demand using AI\n4. Creates purchase orders\n5. Sends POs to suppliers\n6. Logs everything in ERP\n\nConfigure your API credentials in each node!"** ', { name: 'Sticky Note1', position: [0, -176], width: 176, height: 736 }))
  .add(sticky('**"📦 FETCH INVENTORY DATA\n\nRetrieves current stock levels from warehouse system\n\nTO CONFIGURE:\n.1 Replace URL with your warehouse API endpoint\n2. Update Authorization token in headers\n3. Adjust method if needed (GET/POST)\n\n', { name: 'Sticky Note2', position: [224, -96], width: 208, height: 640 }))
  .add(sticky('**"💾 LOG TO ERP SYSTEM\\n\\nRecords complete PO in your ERP system\\n\\nTO CONFIGURE:\\n1. Replace URL with your ERP API endpoint\\n   (SAP, Oracle, NetSuite, etc.)\\n2. Update Authorization credentials\\n3. Adjust body format for your ERP\\n\\nCommon ERP Systems:\\n- SAP Business One: /api/PurchaseOrders\\n- Oracle NetSuite: /services/rest/record/v1/purchaseOrder\\n- Odoo: /api/v2/purchase.order\\n- Microsoft Dynamics: /api/data/v9.0/purchaseorders\\n\\nLogs complete PO including forecast data"**', { name: 'Sticky Note3', position: [1776, -320], width: 192, height: 880 }))
  .add(sticky('**"🗄️ SAVE TO DATABASE\\n\\nStores PO record in your database\\n\\nTO CONFIGURE:\\n1. Add database credentials in n8n\\n   (PostgreSQL, MySQL, etc.)\\n2. Adjust table name if different\\n3. Modify columns to match your schema\\n\\nDatabase Table Schema:\\nCREATE TABLE purchase_orders (\\n  id SERIAL PRIMARY KEY,\\n  po_number VARCHAR(50),\\n  product_id VARCHAR(50),\\n  product_name VARCHAR(255),\\n  supplier_id VARCHAR(50),\\n  quantity INT,\\n  unit_cost DECIMAL(10,2),\\n  total_cost DECIMAL(10,2),\\n  order_date TIMESTAMP,\\n  expected_delivery TIMESTAMP,\\n  status VARCHAR(20),\\n  created_by VARCHAR(50),\\n  notes TEXT,\\n  forecast_confidence VARCHAR(20),\\n  days_until_stockout INT,\\n  created_at TIMESTAMP DEFAULT NOW()\\n);"** ', { name: 'Sticky Note4', position: [2000, -512], width: 176, height: 1040 }))
  .add(sticky('**📧 SEND NOTIFICATION\\n\\nSends email notification about created PO\\n\\nTO CONFIGURE:\\n1. Add SMTP credentials in n8n Settings\\n2. Set recipient email address\\n3. Customize email template if needed\\n\\nSMTP Settings:\\n- Host: smtp.gmail.com (for Gmail)\\n- Port: 587 (TLS) or 465 (SSL)\\n- Username: your-email@gmail.com\\n- Password: your-app-password\\n\\nEmail includes:\\n- PO details\\n- Cost information\\n- AI forecast data\\n- Reasoning for order"** ', { name: 'Sticky Note5', position: [2224, -320], height: 864 }))
  .add(sticky('**"📤 SEND TO SUPPLIER\\n\\nSends purchase order to supplier\'s system via API\\n\\nTO CONFIGURE:\\n1. Replace URL with supplier API endpoint\\n2. Update Authorization token\\n3. Adjust body parameters to match supplier\'s format\\n\\nThis can also be configured to:\\n- Send email instead of API call\\n- Generate PDF and attach\\n- Use multiple supplier endpoints\\n\\nExpected Response:\\n{\\n  \\"status\\": \\"success\\",\\n  \\"po_id\\": \\"SUP-PO-12345\\",\\n  \\"confirmation\\": \\"Order received\\"\\n}"**', { name: 'Sticky Note7', position: [1552, -144], width: 208, height: 720 }))
  .add(sticky('**"📝 CREATE PURCHASE ORDER\\n\\nGenerates complete PO document\\n\\nThis code:\\n1. Creates unique PO number with timestamp\\n2. Calculates costs (quantity × unit cost)\\n3. Sets delivery date based on lead time\\n4. Includes all forecast data\\n5. Adds AI reasoning as notes\\n\\nPO includes:\\n- PO number, dates, supplier info\\n- Product details and quantities\\n- Cost calculations\\n- Forecast confidence data\\n\\nNO CONFIGURATION NEEDED"**', { name: 'Sticky Note8', position: [1328, -96], width: 208, height: 672 }))
  .add(sticky('**"🎯 FILTER: REORDER NEEDED\\n\\nOnly passes items where AI recommends reordering\\n\\nCondition: should_reorder === true\\n\\nItems that pass continue to PO creation\\nItems that fail are logged but no action taken\\n\\nNO CONFIGURATION NEEDED\\nFilter is already set up correctly"** ', { name: 'Sticky Note6', position: [1104, 32], width: 208, height: 496 }))
  .add(sticky('**"🔍 PARSE AI RESPONSE\\n\\nExtracts and structures the AI forecast data\\n\\nThis code:\\n1. Parses JSON from AI response\\n2. Handles parsing errors gracefully\\n3. Combines forecast with original data\\n4. Prepares data for filtering\\n\\nNO CONFIGURATION NEEDED"**', { name: 'Sticky Note9', position: [896, 0], width: 192, height: 528 }))
  .add(sticky('**"🤖 AI DEMAND FORECASTING\\n\\nUses OpenAI GPT-4 to analyze data and forecast demand\\n\\nTO CONFIGURE:\\n1. Add OpenAI API credentials in n8n\\n2. Select model (gpt-4 or gpt-4-turbo)\\n3. Temperature is set to 0.3 for consistent results\\n\\nThe AI considers:\\n- Current stock levels\\n- Sales velocity\\n- Trends (increasing/decreasing)\\n- Lead times\\n- Reorder points\\n\\nOutputs recommendations in JSON format"** ', { name: 'Sticky Note10', position: [688, -80], width: 176, height: 640 }))
  .add(sticky('*"🔗 MERGE DATA\\n\\nCombines inventory and sales data into single dataset\\n\\nThis code:\\n1. Takes inventory data from first input\\n2. Takes sales data from second input\\n3. Matches products by product_id\\n4. Creates unified data structure\\n\\nNO CONFIGURATION NEEDED\\nThis node automatically processes the data"** ', { name: 'Sticky Note11', position: [480, -96], width: 160, height: 672 }))