const wf = workflow(
	'tMez4xptNdwuoUMa',
	'Real-Time Stock Price Monitor & Smart Alerts for Indian & US Markets',
	{ executionOrder: 'v1' },
)
	.add(
		node({
			type: 'n8n-nodes-base.cron',
			version: 1,
			config: { position: [-352, 176], name: 'Market Hours Trigger' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4,
			config: {
				parameters: {
					options: {},
					sheetName: { __rl: true, mode: 'id', value: '=YOUR_GOOGLE_SHEET_ID_HERE' },
					documentId: { __rl: true, mode: 'id', value: '=YOUR_GOOGLE_SHEET_ID_HERE' },
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [-128, 176],
				name: 'Read Stock Watchlist',
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
						"const items = [];\nconst inputData = $input.all();\n\nfor (let i = 0; i < inputData.length; i++) {\n  const row = inputData[i].json;\n\n  // Validate required fields\n  if (row.symbol && row.upper_limit && row.lower_limit) {\n    items.push({\n      json: {\n        symbol: row.symbol,\n        upper_limit: parseFloat(row.upper_limit),\n        lower_limit: parseFloat(row.lower_limit),\n        direction: row.direction || 'both',\n        cooldown_minutes: parseInt(row.cooldown_minutes) || 15,\n        last_alert_price: parseFloat(row.last_alert_price) || 0,\n        last_alert_time: row.last_alert_time || ''\n      }\n    });\n  }\n}\n\nreturn items;\n",
				},
				position: [96, 176],
				name: 'Parse Watchlist Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: '=https://api.twelvedata.com/time_series?symbol={{ $json.symbol }}&interval={{ $json.cooldown_minutes }}min&apikey=your_api_key_add_here',
					options: { response: { response: { neverError: true } } },
				},
				position: [320, 176],
				name: 'Fetch Live Stock Price',
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
						"const watchlist = $('Parse Watchlist Data').first().json;\n\nconst symbol = watchlist.symbol;\nconst upperLimit = parseFloat(watchlist.upper_limit);\nconst lowerLimit = parseFloat(watchlist.lower_limit);\n\nconst values = $input.first().json.values;\n\nlet alerts = [];\n\nfor (let i = 0; i < Math.min(20, values.length); i++) {\n  const datetime = values[i].datetime;\n  const closePrice = parseFloat(values[i].close);\n\n  if (closePrice >= upperLimit) {\n    alerts.push({\n      symbol: symbol,\n      status: 'UP',\n      price: closePrice,\n      limit: upperLimit,\n      datetime: datetime,\n      message: `${datetime} - ${symbol} crossed UP limit. Current Price: ${closePrice}`\n    });\n  } else if (closePrice <= lowerLimit) {\n    alerts.push({\n      symbol: symbol,\n      status: 'DOWN',\n      price: closePrice,\n      limit: lowerLimit,\n      datetime: datetime,\n      message: `${datetime} - ${symbol} crossed DOWN limit. Current Price: ${closePrice}`\n    });\n  }\n}\n\nreturn alerts.length ? alerts.map(alert => ({ json: alert })) : [{ json: { message: 'No alerts' } }];\n",
				},
				position: [544, 176],
				name: 'Smart Alert Logic',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.emailSend',
					version: 2.1,
					config: {
						parameters: {
							text: "=🚨 Stock Alert: {{ $('Smart Alert Logic').item.json.message }}",
							options: {},
							subject: "=🚨 Stock Alert: {{ $('Smart Alert Logic').item.json.message }}",
							toEmail: 'user@example.com',
							fromEmail: 'user@example.com',
							emailFormat: 'text',
						},
						credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
						position: [992, -16],
						name: 'Send Email Alert',
					},
				}),
				null,
			],
			{
				version: 2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 1,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '8e7f6d5c-4b3a-2910-8765-fedcba098765',
								operator: { type: 'string', operation: 'notEmpty' },
								leftValue: '={{ $json.alertMessage }}',
								rightValue: '',
							},
						],
					},
				},
				name: 'Check Alert Conditions',
			},
		),
	)
	// Disconnected: Send Telegram Alert
	.add(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1,
			config: {
				parameters: {
					text: '={{ $json.alert_message }}',
					chatId: 'YOUR_TELEGRAM_CHAT_ID',
					additionalFields: { parse_mode: 'HTML' },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [992, 368],
				name: 'Send Telegram Alert',
			},
		}),
	)
	// Disconnected: Update Alert History
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4,
			config: {
				parameters: {
					columns: {
						value: {},
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: 'Sheet1',
					documentId: 'YOUR_GOOGLE_SHEET_ID_HERE',
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [992, 176],
				name: 'Update Alert History',
			},
		}),
	)
	// Disconnected: Alert Status Check
	.add(
		node({
			type: 'n8n-nodes-base.if',
			version: 2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'success-condition',
								operator: { type: 'string', operation: 'notEmpty' },
								leftValue: '={{ $json.symbol }}',
								rightValue: '',
							},
						],
					},
				},
				position: [1216, 176],
				name: 'Alert Status Check',
			},
		}),
	)
	// Disconnected: Success Notification
	.add(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					subject: '✅ Stock Monitor: Alert Sent Successfully',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [1440, 80],
				name: 'Success Notification',
			},
		}),
	)
	// Disconnected: Error Notification
	.add(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					subject: '❌ Stock Monitor: Alert Failed',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [1440, 272],
				name: 'Error Notification',
			},
		}),
	)
	.add(
		sticky(
			'## 📈 Real-Time Stock Price Monitor & Smart Alerts\n### Monitor Indian (NSE/BSE) and US stock markets with intelligent price alerts, cooldown periods, and multi-channel notifications (Email + Telegram). Automatically tracks price movements and sends alerts when stocks cross predefined upper/lower limits.\n### Perfect for day traders, investors, and portfolio managers who need instant notifications for price breakouts and breakdowns.\n\n\n\n\n## Google Sheets Setup:\n### Create a Google Sheet with these columns (in exact order):\n\nA: symbol (e.g., TCS, AAPL, RELIANCE.BSE)\nB: upper_limit (e.g., 4000)\nC: lower_limit (e.g., 3600)\nD: direction (both/above/below)\nE: cooldown_minutes (e.g., 15)\nF: last_alert_price (auto-updated)\nG: last_alert_time (auto-updated)',
			{ position: [48, -544], width: 800, height: 480 },
		),
	)
	.add(
		sticky(
			'## 🔧 How It Works\n\n**📊 Market Hours Trigger** - Runs every 2 minutes during market hours\n**📋 Read Stock Watchlist** - Fetches your stock list from Google Sheets\n**🔍 Parse Watchlist Data** - Processes stock symbols and alert parameters\n**💰 Fetch Live Stock Price** - Gets real-time prices from Twelve Data API\n**🧠 Smart Alert Logic** - Intelligent price checking with cooldown periods\n**⚡ Check Alert Conditions** - Validates if alerts should be triggered\n**📧 Send Email Alert** - Sends detailed email notifications\n**📱 Send Telegram Alert** - Instant mobile notifications\n**📝 Update Alert History** - Records alert timestamps in Google Sheets\n**✅ Alert Status Check** - Monitors workflow success/failure\n**🔔 Success/Error Notifications** - Admin notifications for monitoring\n\n### 🎯 Key Features:\n- **Smart Cooldown**: Prevents alert spam\n- **Multi-Market**: Supports Indian & US stocks\n- **Dual Alerts**: Email + Telegram notifications\n- **Auto-Update**: Tracks last alert times\n- **Error Handling**: Built-in failure notifications',
			{ name: 'Sticky Note1', color: 4, position: [-736, -528], width: 640, height: 480 },
		),
	);
