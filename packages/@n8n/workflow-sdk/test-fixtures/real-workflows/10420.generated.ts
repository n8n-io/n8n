const wf = workflow('LtlVKYumh3ovfRvp', 'Loyverse Sales Report Agent', {
	timezone: 'Asia/Bangkok',
	callerPolicy: 'workflowsFromSameOwner',
	availableInMCP: false,
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-240, -400], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'/*\nYOUR_AWS_SECRET_KEY_HERE======\nUSER CONFIGURATION\nYOUR_AWS_SECRET_KEY_HERE======\nThis is the ONLY node you need to edit.\n*/\n\nconst config = {\n  // --- 1. Google Sheet Settings ---\n  google_sheet_settings: {\n    SpreadsheetID: "PASTE_SPREADSHEET_ID_HERE", // ---(String after \'https://docs.google.com/spreadsheets/d/\' in your browser adress bar when accessing the Spreadsheet; Spreadsheet must be shared via link.) ---\n    ProductListSheet: "ProductList",\n    SalesDataSheet: "SalesData"\n  },\n\n  // --- 2. Business & Report Settings ---\n  business_settings: {\n    shiftStart: "PASTE_SHIFT_START_HERE", // e.g., "08:00"\n    shiftEnd: "PASTE_SHIFT_END_HERE",     // e.g., "02:00"\n    timezone: "ENTER_SAME_TIMEZONE_AS_SET_IN_WORKFLOW_SETTINGS", // e.g., "Asia/Bangkok"\n    reportEmailReceiver: "PASTE_EMAIL_RECEIVER_HERE"\n  },\n\n  // --- 4. Loyverse IDs & Config ---\n  loyverse_ids: { // <--- **FIX 2: MOVED THIS TO BE A SEPARATE KEY**\n    pos_device_ids: [\n      \'PASTE_POS_ID_1_HERE\',\n      \'PASTE_POS_ID_2_HERE\'\n    ],\n    qr_payment_type_ids: [\n      \'PASTE_QR_PAYMENT_ID_1_HERE\'\n    ],\n    CATEGORIES: {\n      \'5f22222235-713f-4ca6-9b22-dab34sab77db\': \'SampleCategory1\',\n      \'1f2229dab-e88e-4d64-bbbd-862141295f4fb\': \'SampleCategory2\',\n      \'da2222-b1b6-4bce-aecb-12444490ac554\': \'SampleCategory3\',\n    }\n  }\n}; // <--- config object closes here\n\nreturn config;',
				},
				position: [-48, -496],
				name: 'MASTER CONFIG',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: 'https://api.loyverse.com/v1.0/items',
					options: {},
					sendQuery: true,
					queryParameters: { parameters: [{ name: 'limit', value: '250' }] },
				},
				position: [16, -176],
				name: 'Get all products from Loyverse',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"\nconst allItems = $items(\"Get all products from Loyverse\")[0].json.items;\nconst flattenedItems = [];\n\nfor (const item of allItems) {\n  if (item.variants && item.variants.length > 0) {\n    for (const variant of item.variants) {\n      const variantStoreInfo = variant.stores && variant.stores.length > 0 ? variant.stores[0] : {};\n      const itemStoreInfo = item.stores && item.stores.length > 0 ? item.stores[0] : {};\n\n      flattenedItems.push({\n        json: {\n          variant_id: variant.variant_id,\n          barcode: variant.barcode || item.barcode,\n          cost: variant.cost,\n          price: variantStoreInfo.price !== undefined ? variantStoreInfo.price : itemStoreInfo.price,\n          sku: variant.sku,\n          available_for_sale: variant.available_for_sale,\n          option1_value: variant.option1_value,\n          option2_value: variant.option2_value,\n          option3_value: variant.option3_value,\n          item_id: item.id,\n          handle: item.handle,\n          item_name: item.item_name,\n          is_composite: item.is_composite,\n          category_id: item.category_id,\n          modifier_ids: item.modifier_ids ? item.modifier_ids.join(', ') : null,\n          option1_name: item.option1_name,\n          option2_name: item.option2_name,\n          option3_name: item.option3_name,\n          created_at: item.created_at,\n          updated_at: item.updated_at,\n          deleted_at: item.deleted_at,\n          // **NEW:** Add the components array for this variant\n          components: variant.components || null\n        }\n      });\n    }\n  } else {\n    console.log(`Warning: Item '${item.item_name}' (ID: ${item.id}) has no variants array and will be skipped.`);\n  }\n}\n\nreturn flattenedItems;",
				},
				position: [240, -176],
				name: 'Format Product Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'name', value: '' },
					documentId: { __rl: true, mode: 'id', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [528, -176],
				name: 'Save Product List',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// --- CONFIGURATION ---\n// Get config from the MASTER CONFIG node\nconst config = $node["MASTER CONFIG"].json.business_settings;\n\n// Get the shift end time (e.g., "02:00") from the config\nconst shiftEndTime = config.shiftEnd; \n\n// Get the timezone (e.g., "Asia/Bangkok")\nconst TIMEZONE = config.timezone;\n\n\n// 1. Calculate the new "Changeover" time\n// Parse the "HH:mm" string into numbers\nconst [endHour, endMinute] = shiftEndTime.split(\':\').map(Number);\n\n// Calculate the changeover time (2 hours after shift end)\n// setHours() is smart and handles hour numbers > 23 automatically\nconst changeoverHour = endHour + 2; \nconst changeoverMinute = endMinute;\n\n// 2. Get the current time in your specified timezone\nconst nowInUserTz = new Date(new Date().toLocaleString(\'en-US\', { timeZone: TIMEZONE }));\n\n// 3. Determine the end of the report window\n// First, set a potential end date to *today\'s* changeover time\nlet reportEndDate = new Date(nowInUserTz);\nreportEndDate.setHours(changeoverHour, changeoverMinute, 0, 0);\n\n// 4. Check if the current time is *before* today\'s changeover\n// We must create a separate date object for this comparison\nlet changeoverToday = new Date(nowInUserTz);\nchangeoverToday.setHours(changeoverHour, changeoverMinute, 0, 0);\n\n// If "now" is before the changeover, the business day hasn\'t ended.\n// We must report on the *previous* day\'s window.\nif (nowInUserTz < changeoverToday) {\n  // Wind the report end date back to *yesterday\'s* changeover time\n  reportEndDate.setDate(reportEndDate.getDate() - 1);\n}\n\n// 5. Calculate the start of the report window\n// The API query window starts exactly 24 hours before the end time.\nconst reportStartDate = new Date(reportEndDate.getTime() - (24 * 60 * 60 * 1000));\n\n// 6. Determine the "business date" (the calendar date the shift started)\nconst year = reportStartDate.getFullYear();\nconst month = String(reportStartDate.getMonth() + 1).padStart(2, \'0\');\nconst day = String(reportStartDate.getDate()).padStart(2, \'0\');\nconst businessDateString = `${year}-${month}-${day}`;\n\n// 7. Return the dates as UTC ISO strings for the Loyverse API\nreturn [{ \n  json: {\n    start_of_day: reportStartDate.toISOString(), \n    end_of_day: reportEndDate.toISOString(),\n    businessDate: businessDateString // Pass the correct date to the next nodes\n  }\n}];',
				},
				position: [672, -656],
				name: 'Calculate Shift Time',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: 'https://api.loyverse.com/v1.0/shifts',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: 'created_at_min',
								value: "={{ $('Calculate Shift Time').item.json.start_of_day }}",
							},
							{
								name: 'created_at_max',
								value: "={{ $('Calculate Shift Time').item.json.end_of_day }}",
							},
						],
					},
				},
				position: [912, -656],
				name: "Get Yesterday's Shifts From Loyverse",
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: 'https://api.loyverse.com/v1.0/receipts\n',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: 'created_at_min',
								value: "={{ $('Calculate Shift Time').item.json.start_of_day }}",
							},
							{
								name: 'created_at_max',
								value: "={{ $('Calculate Shift Time').item.json.end_of_day }}",
							},
							{ name: 'limit', value: '250' },
						],
					},
				},
				position: [1120, -656],
				name: "Get Yesterday's Receipts From Loyverse",
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					sheetName: { __rl: true, mode: 'name', value: '' },
					documentId: { __rl: true, mode: 'id', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [976, -176],
				name: 'Read Historical Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// --- Read Config ---\n// Read the configuration from the MASTER CONFIG node\nconst CONFIG = $node[\"MASTER CONFIG\"].json.loyverse_ids;\n\n// --- Main Logic ---\nconst shiftsData = $items(\"Get Yesterday's Shifts From Loyverse\");\nconst receiptsData = $items(\"Get Yesterday's Receipts From Loyverse\");\nconst itemMasterData = $items(\"Format Product Data\");\nconst historicalData = $items(\"Read Historical Data\").map(item => item.json);\nconst shifts = (shiftsData.length > 0 && shiftsData[0].json) ? shiftsData[0].json.shifts || [] : [];\nconst receipts = (receiptsData.length > 0 && receiptsData[0].json) ? receiptsData[0].json.receipts || [] : [];\nconst allItems = itemMasterData.map(item => item.json);\n\nif (shifts.length === 0 && receipts.length === 0) {\n  return [{ json: { \"message\": \"No shifts or receipts found to process.\" } }];\n}\n\n// Build a map of all items for fast lookup\nconst itemMap = {};\nfor (const item of allItems) {\n  itemMap[item.variant_id] = item;\n}\n\nconst businessDateString = $items(\"Calculate Shift Time\")[0].json.businessDate;\nconst businessDate = new Date(businessDateString + 'T12:00:00Z');\n\n// --- Initialize Metrics ---\nconst metrics = {\n  date: businessDateString,\n  weekday: businessDate.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short' }),\n  gross_profit: 0,\n  net_operating_profit: 0,\n  best_seller_by_quantity_name: 'N/A',\n  best_seller_by_quantity_count: 0,\n  best_seller_by_profit_name: 'N/A',\n  best_seller_by_profit_amount: 0,\n  weekday_performance_vs_avg: 'N/A',\n  weekday_rank: 'N/A',\n  month_performance_vs_avg: 'N/A',\n  ATV: 0,\n  IPT: 0,\n  total_discounts_amount: 0,\n  total_discounts_count: 0,\n  rolling_30_day_nop: 0,\n  wtd_net_operating_profit: 0,\n  profit_tendency: '➡️',\n  // New generic totals\n  total_cash_net: 0,\n  total_qr_payments: 0,\n  total_cash_difference: 0,\n  totalGrossRevenue: 0 // Will be calculated from receipts\n};\n\n// Dynamically create category metrics\nfor (const categoryName of Object.values(CONFIG.CATEGORIES)) {\n  const safeCategoryName = categoryName.replace(/ /g, '_').replace(/\\./g, '');\n  metrics[`${safeCategoryName}_items_sold`] = 0;\n  metrics[`${safeCategoryName}_revenue`] = 0;\n  metrics[`${safeCategoryName}_profit`] = 0;\n}\n\n// --- Process Shifts (Flexible) ---\nlet total_paid_out = 0;\nconst relevantShifts = shifts.filter(s => CONFIG.pos_device_ids.includes(s.pos_device_id));\n\nfor (const shift of relevantShifts) {\n  metrics.total_cash_net += (shift.actual_cash - shift.starting_cash);\n  metrics.total_discounts_amount += shift.discounts || 0;\n  metrics.total_cash_difference += (shift.actual_cash - shift.expected_cash);\n  total_paid_out += shift.paid_out || 0;\n\n  // Find all QR payments for this shift\n  for (const payment of shift.payments) {\n    if (CONFIG.qr_payment_type_ids.includes(payment.payment_type_id)) {\n      metrics.total_qr_payments += payment.money_amount;\n    }\n  }\n}\n\n// --- Process Receipts ---\nconst itemCounts = {};\nconst itemProfits = {};\nlet totalItemsSold = 0;\n\nfor (const receipt of receipts) {\n  if (receipt.total_discounts > 0) {\n    metrics.total_discounts_count++;\n  }\n\n  for (const lineItem of receipt.line_items) {\n    totalItemsSold += lineItem.quantity;\n    const masterItem = itemMap[lineItem.variant_id];\n    if (!masterItem) continue;\n\n    const cost = masterItem.cost || 0;\n    const grossRevenue = lineItem.total_money || 0;\n    metrics.totalGrossRevenue += grossRevenue; // Use this as the main revenue metric\n    const revenueBeforeVat = (grossRevenue / 107) * 100;\n    const profit = revenueBeforeVat - (cost * lineItem.quantity);\n    \n    metrics.gross_profit += profit;\n\n    const itemName = masterItem.variant_name === 'Default' ? masterItem.item_name : `${masterItem.item_name} (${masterItem.variant_name})`;\n    itemCounts[itemName] = (itemCounts[itemName] || 0) + lineItem.quantity;\n    itemProfits[itemName] = (itemProfits[itemName] || 0) + profit;\n\n    // Add to category totals\n    const categoryName = CONFIG.CATEGORIES[masterItem.category_id];\n    if (categoryName) {\n      const safeCategoryName = categoryName.replace(/ /g, '_').replace(/\\./g, '');\n      metrics[`${safeCategoryName}_revenue`] += grossRevenue;\n      metrics[`${safeCategoryName}_profit`] += profit;\n    }\n  }\n}\n\n// --- Final Calculations ---\nmetrics.net_operating_profit = metrics.gross_profit - total_paid_out;\n\nif (receipts.length > 0) {\n  metrics.ATV = metrics.totalGrossRevenue / receipts.length;\n  metrics.IPT = totalItemsSold / receipts.length;\n}\n\n// Best Seller (Quantity)\nlet maxQuantity = 0;\nfor (const itemName in itemCounts) {\n  if (itemCounts[itemName] > maxQuantity) {\n    maxQuantity = itemCounts[itemName];\n    metrics.best_seller_by_quantity_name = itemName;\n    metrics.best_seller_by_quantity_count = maxQuantity;\n  }\n}\n\n// Best Seller (Profit)\nlet maxProfit = -Infinity;\nfor (const itemName in itemProfits) {\n  if (itemProfits[itemName] > maxProfit) {\n    maxProfit = itemProfits[itemName];\n    metrics.best_seller_by_profit_name = itemName;\n    metrics.best_seller_by_profit_amount = maxProfit;\n  }\n}\n\n// --- Historical Calculations ---\n// Note: This uses totalGrossRevenue (from receipts) as the \"Total Revenue\"\nconst todayRevenue = metrics.totalGrossRevenue; \nconst todayWeekday = metrics.weekday;\nconst todayMonth = businessDate.getMonth();\nconst todayYear = businessDate.getFullYear();\nconst oneYearAgo = new Date();\noneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);\n\n// Weekday Performance\nconst sameWeekdayHistory = historicalData.filter(row => {\n  const rowDate = new Date(row.Date);\n  const rowWeekday = rowDate.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short' });\n  return rowWeekday === todayWeekday && rowDate >= oneYearAgo;\n});\nif (sameWeekdayHistory.length > 0) {\n  const totalRevenue = sameWeekdayHistory.reduce((sum, row) => sum + (parseFloat(row['Total Revenue']) || 0), 0);\n  const avgRevenue = totalRevenue / sameWeekdayHistory.length;\n  metrics.weekday_performance_vs_avg = (((todayRevenue / avgRevenue) - 1) * 100).toFixed(2) + '%';\n  const allRevenues = sameWeekdayHistory.map(row => parseFloat(row['Total Revenue']) || 0);\n  allRevenues.push(todayRevenue);\n  allRevenues.sort((a, b) => b - a);\n  const rank = allRevenues.indexOf(todayRevenue) + 1;\n  metrics.weekday_rank = `${rank} of ${allRevenues.length}`;\n}\n\n// Month Performance\nconst sameMonthHistory = historicalData.filter(row => {\n  const rowDate = new Date(row.Date);\n  return rowDate.getMonth() === todayMonth && rowDate.getFullYear() === todayYear;\n});\nif (sameMonthHistory.length > 0) {\n  const totalRevenue = sameMonthHistory.reduce((sum, row) => sum + (parseFloat(row['Total Revenue']) || 0), 0);\n  const avgRevenue = totalRevenue / sameMonthHistory.length;\n  metrics.month_performance_vs_avg = (((todayRevenue / avgRevenue) - 1) * 100).toFixed(2) + '%';\n}\n\n// --- Rolling 30-Day & WTD Calculations ---\nfunction getStartOfWeek(date) {\n  const d = new Date(date);\n  const day = d.getDay();\n  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday\n  d.setHours(0, 0, 0, 0); // Normalize time\n  return new Date(d.setDate(diff));\n}\n\nconst today = businessDate; \nconst startOfCurrentWeek = getStartOfWeek(today);\n\n// Rolling 30-Day\nconst endDate = new Date(today);\nconst startDate = new Date(today);\nstartDate.setDate(startDate.getDate() - 29); // 30-day window\nconst rolling30DayData = historicalData.filter(row => {\n  const rowDate = new Date(row.Date + 'T12:00:00Z');\n  return rowDate >= startDate && rowDate < endDate;\n});\nconst historical30DayProfit = rolling30DayData.reduce((sum, row) => {\n  return sum + (parseFloat(row['Net Operating Profit']) || 0);\n}, 0);\nmetrics.rolling_30_day_nop = historical30DayProfit + metrics.net_operating_profit;\n\n// Week-to-Date\nconst sameWeekData = historicalData.filter(row => {\n  const rowDate = new Date(row.Date + 'T12:00:00Z');\n  return rowDate >= startOfCurrentWeek && rowDate < today;\n});\nconst historicalWtdProfit = sameWeekData.reduce((sum, row) => {\n  return sum + (parseFloat(row['Net Operating Profit']) || 0);\n}, 0);\nmetrics.wtd_net_operating_profit = historicalWtdProfit + metrics.net_operating_profit;\n\n// Profit Tendency\nconst fourWeeksAgo = new Date(startOfCurrentWeek);\nfourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);\nconst last4WeeksData = historicalData.filter(row => {\n  const rowDate = new Date(row.Date + 'T12:00:00Z');\n  return rowDate >= fourWeeksAgo && rowDate < startOfCurrentWeek;\n});\nif (last4WeeksData.length > 0) {\n  const last4WeeksTotalProfit = last4WeeksData.reduce((sum, row) => {\n    return sum + (parseFloat(row['Net Operating Profit']) || 0);\n  }, 0);\n  const avgWeeklyProfit = last4WeeksTotalProfit / 4;\n  if (metrics.wtd_net_operating_profit > avgWeeklyProfit) {\n    metrics.profit_tendency = '⬆️';\n  } else if (metrics.wtd_net_operating_profit < avgWeeklyProfit) {\n    metrics.profit_tendency = '⬇️';\n  }\n}\n\nreturn [{ json: metrics }];",
				},
				position: [1232, -176],
				name: 'Calculate All Metrics',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					text: '==📊 REPORT 📊\n👇👇👇👇👇👇👇\n {{ $items("Calculate All Metrics")[0].json.weekday }} , {{ $items("Calculate All Metrics")[0].json.date }}\n\n💰 Total income: {{ $items("Calculate All Metrics")[0].json.totalGrossRevenue.toFixed(2)}} THB\n🤑 Final Net Profit: {{ $items("Calculate All Metrics")[0].json.net_operating_profit.toFixed(2) }} THB\n\n⎯⎯⎯⎯⎯⎯⎯\n\n🚨 CASH HANDLING 🚨\n\nTotal Cash Difference: {{ $items("Calculate All Metrics")[0].json.total_cash_difference.toFixed(2) }} THB\n\n⎯⎯⎯⎯⎯⎯⎯\n\n📈 PERFORMANCE 📉\n\n...compared with same day average: \n{{ $items("Calculate All Metrics")[0].json.weekday_performance_vs_avg }}\n\n📊 CUMULATIVE NET OPERATING PROFIT 📊\n\n👉 This Week: {{ $items("Calculate All Metrics")[0].json.wtd_net_operating_profit.toFixed(2) }} THB\n👉 30 days rolling: {{ $items("Calculate All Metrics")[0].json.rolling_30_day_nop.toFixed(2) }} THB\n👉 Trend (vs. last 4wks): {{ $items("Calculate All Metrics")[0].json.profit_tendency }}',
					options: {},
					subject: '=Daily Report for {{ $items("Calculate All Metrics")[0].json.date }}',
					toEmail: '={{ $node["MASTER CONFIG"].json.business_settings.reportEmailReceiver }}',
					fromEmail: 'user@example.com',
					emailFormat: 'text',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [1616, -672],
				name: 'Send email',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'name', value: '' },
					documentId: { __rl: true, mode: 'id', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1616, 176],
				name: 'Save Latest Sales Data',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: { interval: [{ triggerAtHour: 8, triggerAtMinute: 15 }] },
				},
				position: [-256, -176],
				name: 'Run Daily at 8:15AM (open to change)',
			},
		}),
	)
	.add(
		sticky(
			'# SETUP STEP 2/4\n## 1. Make a copy of this Spreadsheet: https://docs.google.com/spreadsheets/d/1DlEUo3mQUaxn2HEp34m7VAath8L3RDuPy5zFCljSZHE/edit?usp=sharing\n## 2. Open the MASTER CONFIG node below and edit the necessary variables:',
			{ color: 3, position: [-96, -768], width: 672, height: 448 },
		),
	)
	.add(
		sticky('## Get Product Data from Loyverse\nNo Changes required here!', {
			name: 'Sticky Note1',
			color: 5,
			position: [-32, -288],
			width: 432,
			height: 352,
		}),
	)
	.add(
		sticky(
			'## Get Sales Data From Last Shift\nNo Changes required here! (Change the Shift Start and End in Config Node!)\n',
			{ name: 'Sticky Note2', color: 5, position: [608, -768], width: 720, height: 336 },
		),
	)
	.add(
		sticky('## Calculate Metrics', {
			name: 'Sticky Note3',
			color: 5,
			position: [1152, -288],
			width: 336,
			height: 288,
		}),
	)
	.add(
		sticky('## Send Report', {
			name: 'Sticky Note4',
			color: 4,
			position: [1552, -768],
			width: 320,
			height: 288,
		}),
	)
	.add(
		sticky(
			'# SETUP STEP 4/4\n\n## Open the "Save latest sales data" node below and select the "LoyverseDataTool" Spreadsheet from the list in document section.\n\n## In the sheet section, paste the following code:\n### Sheet: {{ $node["MASTER CONFIG"].json.google_sheet_settings.SalesDataSheet }}\n\n## 3. The column list will now appear and you can map your columns to the data from the Calculate All Metrics node.',
			{ name: 'Sticky Note5', color: 3, position: [1552, -288], width: 704, height: 640 },
		),
	)
	.add(
		sticky(
			'# SETUP STEP 1/4\n\n## Create credentials for…\n\n1. Loyverse: Create an API token in Loyverse under “Integrations” - “Access Tokens”. Then create Loyverse credentials in N8N: (“Generic / “Bearer Auth”, save Loyverse API token in “Bearer Token” field).\n2. Google Sheets API \n3. Email Sender (SMTP credentials or a mail service like GMAIL.\n',
			{ name: 'Sticky Note6', position: [-512, -768], width: 384, height: 320 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n# Setup Step 3/4\n### After the MASTER CONFIG is filled out (!) open the "Save Product List" node and select "From List" in the "Document" section. You can then select the "LoyverseDataTool" Spreadsheet that you just copied from the list. \n\nAlternative, if you have problems with setting up the Google Sheet Credentials: share the Spreadsheet via link, copy the ID and save it in MASTER CONFIG, then select "ID" in the document section, switch to "expression" and paste this code:\n{{ $node["MASTER CONFIG"].json.google_sheet_settings.SpreadsheetID }} \n\n\n### Next, in the Sheet section, paste this code (switch to "expression" first): {{ $node["MASTER CONFIG"].json.google_sheet_settings.ProductListSheet }}\n\n### The "Map Each Column Manually" section will load your sheet\'s columns and you can now map your columns to the data from "Format Product Data" node.\n\n### Next, open "Read Historical Data" node, select the document form the list or paste the same code as above. In Sheet section paste the following code (different from the one above!)\nSheet: {{ $node["MASTER CONFIG"].json.google_sheet_settings.SalesDataSheet }}\n(no mapping required here).\n',
			{ name: 'Sticky Note7', color: 3, position: [432, -288], width: 688, height: 688 },
		),
	);
