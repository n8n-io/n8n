const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					filters: { labelIds: ['INBOX'] },
					pollTimes: { item: [{ mode: 'everyHour' }] },
				},
				position: [-768, 368],
				name: 'Look for Invoices',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					limit: 1,
					simple: false,
					filters: {},
					options: { downloadAttachments: true },
					operation: 'getAll',
				},
				position: [-544, 368],
				name: 'Get Email Content',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.guardrails',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Get Email Content').item.json.text }}",
					guardrails: {
						topicalAlignment: {
							value: {
								prompt:
									'=You are a financial controller AI. \n\nSCOPE:\n- The text MUST contain evidence of a financial transaction, invoice, receipt, or bill.\n- It is ON-TOPIC if it mentions payments, amounts owed, subscription renewals with prices, or attached invoices.\n- It is OFF-TOPIC if it is a newsletter, a marketing email without a specific transaction, or a personal conversation.',
								threshold: 0.8,
							},
						},
					},
				},
				position: [-336, 368],
				name: 'Guardrail: Is Finance?',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 1,
			config: {
				parameters: {
					values: {
						string: [
							{ name: 'gSheetID', value: 'ENTER_YOUR_GOOGLE_SHEET_ID' },
							{ name: 'adminEmailForErrors', value: 'user@example.com' },
						],
					},
					options: {},
				},
				name: 'Configuration: User Settings',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'check-aligned',
								operator: { type: 'boolean', operation: 'false', singleValue: true },
								leftValue: '={{ $json.checks.triggered }}',
								rightValue: '',
							},
						],
					},
					looseTypeValidation: true,
				},
				position: [208, 336],
				name: 'IF (Guardrail Passed)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'or',
						conditions: [
							{
								id: 'filter-invoice',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $('Get Email Content').item.json.subject }}",
								rightValue: 'Invoice',
							},
							{
								id: 'filter-receipt',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $('Get Email Content').item.json.subject }}",
								rightValue: 'Receipt',
							},
							{
								id: 'filter-bill',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $('Get Email Content').item.json.subject }}",
								rightValue: 'Bill',
							},
							{
								id: 'filter-payment',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $('Get Email Content').item.json.subject }}",
								rightValue: 'Payment Confirmation',
							},
						],
					},
				},
				position: [592, 432],
				name: 'Filter Finance Keywords',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'check-attachment',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ Object.keys($binary || {}).length }}',
								rightValue: 0,
							},
						],
					},
					looseTypeValidation: true,
				},
				position: [-576, 1040],
				name: 'Check for Attachment',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: {
					options: {},
					operation: 'pdf',
					binaryPropertyName: "={{ Object.keys($json.binary || {})[0] || 'attachment_0' }}",
				},
				position: [-240, 816],
				name: 'Extract PDF Data',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.text }}',
					options: {
						systemMessage:
							'=You are a Financial OCR Expert. Extract invoice data from the PDF text.\n\nCRITICAL INSTRUCTIONS:\n1. Return ONLY a JSON object.\n2. Normalize dates to YYYY-MM-DD.\n3. Clean currency symbols from amounts (return numbers).\n\nREQUIRED JSON STRUCTURE:\n{\n  "vendor_name": "string",\n  "invoice_date": "YYYY-MM-DD",\n  "invoice_id": "string",\n  "total_amount": number,\n  "tax_amount": number,\n  "currency": "USD/EUR/GBP",\n  "items_summary": "string (brief description)",\n  "vendor_tax_id": "string or null"\n}',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-32, 800],
				name: 'AI Agent (PDF OCR)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						'// Check if AI extraction succeeded\nif ($json.error) {\n	return {\n		json: {\n			error_occurred: true,\n			error_type: "AI_EXTRACTION_FAILED",\n			error_message: $json.error.message || "AI extraction failed",\n			timestamp: new Date().toISOString()\n		}\n	};\n}\n\nlet data;\ntry {\n	data = typeof $json.output === \'string\' ? JSON.parse($json.output) : $json.output;\n} catch (e) {\n	return {\n		json: {\n			error_occurred: true,\n			error_type: "JSON_PARSE_ERROR",\n			error_message: e.message,\n			timestamp: new Date().toISOString()\n		}\n	};\n}\n\n// Validation Logic\nconst required = [\'vendor_name\', \'total_amount\', \'invoice_date\'];\nconst missing = required.filter(field => !data[field]);\n\nif (missing.length > 0) {\n	return {\n		json: {\n			error_occurred: true,\n			error_type: "MISSING_FIELDS",\n			error_message: `Missing: ${missing.join(\', \')}`,\n			extracted_data: data,\n			timestamp: new Date().toISOString()\n		}\n	};\n}\n\n// Amount Validation\nif (isNaN(parseFloat(data.total_amount))) {\n	return {\n		json: {\n			error_occurred: true,\n			error_type: "INVALID_AMOUNT",\n			error_message: "Total Amount is not a number",\n			extracted_data: data,\n			timestamp: new Date().toISOString()\n		}\n	};\n}\n\nreturn {\n	json: {\n		error_occurred: false,\n		validated_data: data\n	}\n};',
				},
				position: [528, 992],
				name: 'Validate Extraction',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'check-error',
								operator: { type: 'boolean', operation: 'false' },
								leftValue: '={{ $json.error_occurred }}',
								rightValue: '',
							},
						],
					},
					looseTypeValidation: true,
				},
				position: [800, 992],
				name: 'Check for Errors',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						'const data = $json.validated_data;\n\n// Business Logic for GL Coding\nlet glCategory = "Uncategorized";\n// Convert vendor to lowercase for easier matching\nconst vendor = (data.vendor_name || "").toLowerCase();\n\n// FIX 1: Added "amazon" to the check so it catches "Amazon Web Services"\nif (vendor.includes("aws") || vendor.includes("amazon") || vendor.includes("google cloud") || vendor.includes("digitalocean")) {\n	glCategory = "6000 - Software & Hosting";\n} else if (vendor.includes("uber") || vendor.includes("lyft") || vendor.includes("airline") || vendor.includes("flight")) {\n	glCategory = "5000 - Travel & Meals";\n} else if (vendor.includes("wework") || vendor.includes("office")) {\n	glCategory = "4000 - Rent & Utilities";\n}\n\n// Approval Thresholds\nlet approvalStatus = "Auto-Approved";\n// Ensure amount is a number\nconst amount = parseFloat(data.total_amount);\n\n// FIX 2: Check the HIGHEST value first.\n// If we checked > 1000 first, 5200 would trigger that and stop.\nif (amount > 5000) {\n	approvalStatus = "VP Approval Needed";\n} else if (amount > 1000) {\n	approvalStatus = "Manager Approval Needed";\n}\n\nreturn {\n	json: {\n		...data,\n		gl_category: glCategory,\n		approval_status: approvalStatus,\n		case_id: `INV-${Date.now()}`,\n		processed_at: new Date().toISOString()\n	}\n};',
				},
				position: [1040, 672],
				name: 'Apply Finance Rules',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {},
						schema: [
							{
								id: 'invoice_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'invoice_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'vendor_name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'vendor_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'invoice_date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'invoice_date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_amount',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'currency',
								type: 'string',
								display: true,
								required: false,
								displayName: 'currency',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'tax_amount',
								type: 'string',
								display: true,
								required: false,
								displayName: 'tax_amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'gl_category',
								type: 'string',
								display: true,
								required: false,
								displayName: 'gl_category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'approval_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'approval_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'timestamp',
								type: 'string',
								display: true,
								required: false,
								displayName: 'timestamp',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'case_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'case_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'items_summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'items_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'vendor_tax_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'vendor_tax_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'processed_at',
								type: 'string',
								display: true,
								required: false,
								displayName: 'processed_at',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'autoMapInputData',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1260157166,
						cachedResultUrl: '',
						cachedResultName: 'Invoices',
					},
					documentId: {
						__rl: true,
						mode: 'expression',
						value: "={{ $('Configuration: User Settings').item.json.gSheetID }}",
					},
				},
				position: [1376, 672],
				name: 'Log to Invoices Sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: "={{ $('Configuration: User Settings').item.json.adminEmailForErrors }}",
					message:
						'=<html>\n<body>\n<h3>Invoice Processed Successfully</h3>\n<p><strong>Vendor:</strong> {{ $json.vendor_name }}</p>\n<p><strong>Amount:</strong> {{ $json.currency }} {{ $json.total_amount }}</p>\n<p><strong>GL Category:</strong> {{ $json.gl_category }}</p>\n<p><strong>Status:</strong> {{ $json.approval_status }}</p>\n<br>\n<p>Check the Google Sheet for details.</p>\n</body>\n</html>',
					options: { appendAttribution: false },
					subject: '=💰 Invoice Processed: {{ $json.vendor_name }} - {{ $json.approval_status }}',
				},
				position: [1632, 672],
				name: 'Send Confirmation Email',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							amount: "={{ $('Apply Finance Rules').item.json.total_amount }}",
							vendor: "={{ $('Apply Finance Rules').item.json.vendor_name }}",
							case_id: "={{ $('Apply Finance Rules').item.json.case_id }}",
							timestamp: '={{ $today }}',
							email_sent: 'Yes',
							gl_category: "={{ $('Apply Finance Rules').item.json.gl_category }}",
							approval_status: "={{ $('Apply Finance Rules').item.json.approval_status }}",
							processing_time_seconds:
								'={{ Math.round(($execution.startedAt ? (Date.now() - new Date($execution.startedAt).getTime()) / 1000 : 0)) }}',
						},
						schema: [
							{
								id: 'timestamp',
								type: 'string',
								display: true,
								required: false,
								displayName: 'timestamp',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'case_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'case_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'processing_time_seconds',
								type: 'string',
								display: true,
								required: false,
								displayName: 'processing_time_seconds',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'vendor',
								type: 'string',
								display: true,
								required: false,
								displayName: 'vendor',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'amount',
								type: 'string',
								display: true,
								required: false,
								displayName: 'amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'gl_category',
								type: 'string',
								display: true,
								required: false,
								displayName: 'gl_category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'approval_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'approval_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_sent',
								type: 'string',
								display: true,
								required: false,
								displayName: 'email_sent',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 2011163382,
						cachedResultUrl: '',
						cachedResultName: 'Success Metrics',
					},
					documentId: {
						__rl: true,
						mode: 'expression',
						value: "={{ $('Configuration: User Settings').item.json.gSheetID }}",
					},
				},
				position: [1904, 672],
				name: 'Log Success Metrics',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							timestamp: '={{ $json.timestamp }}',
							error_type: '={{ $json.error_type }}',
							error_message: '={{ $json.error_message }}',
							original_subject: "={{ $('Look for Invoices').item.json.subject }}",
							workflow_execution_id: '={{ $workflow.id }}',
						},
						schema: [
							{ id: 'timestamp', type: 'string', displayName: 'timestamp' },
							{ id: 'error_type', type: 'string', displayName: 'error_type' },
							{
								id: 'error_message',
								type: 'string',
								displayName: 'error_message',
							},
							{
								id: 'original_subject',
								type: 'string',
								displayName: 'original_subject',
							},
							{
								id: 'workflow_execution_id',
								type: 'string',
								displayName: 'workflow_execution_id',
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'Error Logs',
						cachedResultName: 'Error Logs',
					},
					documentId: {
						__rl: true,
						mode: 'expression',
						value: "={{ $('Configuration: User Settings').item.json.gSheetID }}",
					},
				},
				position: [1088, 1248],
				name: 'Log Error to Sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: "={{ $('Configuration: User Settings').item.json.adminEmailForErrors }}",
					message:
						'=<html>\n<body>\n<h3>Workflow Failed</h3>\n<p><strong>Error:</strong> {{ $json.error_message }}</p>\n<p><strong>Original Email:</strong> {{ $json.original_subject }}</p>\n</body>\n</html>',
					options: {},
					subject: '=⚠️ Finance Workflow Error: {{ $json.error_type }}',
				},
				position: [1424, 1248],
				name: 'Send Error Notification',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: "={{ $('Get Email Content').item.json.text }}",
					options: {
						systemMessage:
							'=You are a Financial OCR Expert. Extract receipt data from the email body text.\n\nCRITICAL INSTRUCTIONS:\n1. Return ONLY a JSON object.\n2. Normalize dates to YYYY-MM-DD.\n3. Clean currency symbols from amounts (return numbers).\n\nREQUIRED JSON STRUCTURE:\n{\n  "vendor_name": "string",\n  "invoice_date": "YYYY-MM-DD",\n  "invoice_id": "string (or \'EMAIL-RECEIPT\' if missing)",\n  "total_amount": number,\n  "tax_amount": number,\n  "currency": "USD/EUR/GBP",\n  "items_summary": "string (brief description)",\n  "vendor_tax_id": "string or null"\n}',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-32, 1088],
				name: 'AI Agent (Email OCR)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
					options: { temperature: 0.2, responseFormat: 'json_object' },
				},
				position: [-32, 960],
				name: 'gpt 4o mini',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: { parameters: { options: {} }, position: [-336, 480], name: 'Gemini 2.5 flash' },
		}),
	)
	.add(
		sticky(
			'## 1. Finance Guardrails\nUses Gemini/LangChain to detect if the email is actually a financial document.',
			{ name: 'Sticky Note Guardrail', color: 4, position: [-368, 240], width: 288, height: 288 },
		),
	)
	.add(
		sticky(
			'## 2. Dual Extraction Path\nIf Attachment -> **PDF OCR Agent**\nIf No Attachment -> **Email Body Agent**\n\nBoth normalize data into the same JSON structure.',
			{ name: 'Sticky Note Extraction', color: 5, position: [-272, 656], width: 480, height: 608 },
		),
	)
	.add(
		sticky(
			'## 3. Business Logic\n- **GL Coding**: Auto-categorizes vendors (Uber -> Travel).\n- **Thresholds**: Flags high amounts (> $1000) for approval.',
			{ name: 'Sticky Note Logic', color: 7, position: [912, 544], width: 352, height: 320 },
		),
	)
	.add(
		sticky(
			'## Overview\n### **[Gtaras](https://n8n.io/creators/tarasidis/)**  \n\nManual financial reconciliation is tedious and prone to error. This workflow functions as an AI Financial Controller, automatically monitoring your inbox for invoices, receipts, and bills, extracting the data using OCR, and syncing it to Google Sheets for approval.\n\nUnlike simple scrapers, this workflow uses a "Guardrail" AI agent to filter out non-financial emails (like newsletters) before they are processed, ensuring only actual transactions are recorded.\n\n## Who is it for?\n* **Finance Teams:** To automate the collection of vendor invoices.\n* **Freelancers:** To track expenses and receipts for tax season.\n* **Operations Managers:** To monitor budget spend and categorize costs automatically.\n\n## How it works\n1.  **Ingest:** The workflow watches a specific Gmail label (e.g., "INBOX") for new emails.\n2.  **Guardrail:** A Gemini-powered AI agent analyzes the email text to determine if it is a valid financial transaction. If not, the workflow stops.\n3.  **Extraction (OCR):**\n    * **If an attachment exists:** An AI Agent (GPT-4o) extracts data from the PDF.\n    * **If no attachment:** An AI Agent extracts data directly from the email body.\n4.  **Validation:** Code nodes check for missing fields or invalid amounts.\n5.  **Business Logic:** The system automatically assigns General Ledger (GL) categories (e.g., "Uber" -> "Travel") and sets approval statuses based on amount thresholds.\n6.  **Sync:** Validated data is logged to Google Sheets, and a confirmation email is sent. Errors are logged to a separate error sheet.\n\n## How to set up\n1.  **Google Sheets:** Copy [this Google Sheet template](https://docs.google.com/spreadsheets/d/1IaovDHswLKbcQdEyfw-2JSYHOVX1pLNcTIYlJQzxYGU/copy) to your drive. It contains the necessary tabs (Invoices, Error Logs, Success Metrics).\n2.  **Configure Workflow:**\n    * Open the node named **"Configuration: User Settings"**.\n    * Paste your Google Sheet ID (found in the URL of your new sheet).\n    * Enter the Admin Email address where you want to receive error notifications.\n3.  **Credentials:**\n    * Connect your **Gmail** account.\n    * Connect your **Google Sheets** account.\n    * Connect your **OpenAI** (for OCR) and **Google Gemini/PaLM** (for Guardrails) accounts.\n\n## Requirements\n* n8n version 1.0 or higher.\n* Gmail account.\n* OpenAI API Key.\n* Google Gemini (PaLM) API Key.',
			{ position: [-1344, 176], width: 512, height: 1216 },
		),
	)
	.add(
		sticky('## ⚠️ Error Handling Flow\n### Any failures are logged and admins are notified', {
			name: 'Sticky Note21',
			color: 2,
			position: [1024, 1152],
			width: 640,
			height: 304,
		}),
	)
	.add(
		sticky('## 📊 Success Metrics Logger', {
			name: 'Sticky Note17',
			color: 6,
			position: [1792, 608],
			width: 352,
			height: 248,
		}),
	);
