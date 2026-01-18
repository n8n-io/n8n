const wf = workflow(
	'uOMGyPBvAP5ytb64',
	'AI-Powered Invoice Reminder & Payment Tracker for Finance & Accounting',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [{ field: 'cronExpression', expression: '0 9 * * *' }],
					},
				},
				position: [0, -304],
				name: 'Schedule Daily Check',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.4,
			config: {
				parameters: {
					query:
						"SELECT \n  invoice_id,\n  client_name,\n  client_email,\n  invoice_number,\n  invoice_amount,\n  currency,\n  issue_date,\n  due_date,\n  payment_status,\n  days_overdue,\n  last_reminder_sent\nFROM invoices \nWHERE payment_status != 'paid' \nAND due_date <= CURRENT_DATE + INTERVAL '7 days'\nORDER BY due_date ASC;",
					options: {},
					operation: 'executeQuery',
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [224, -304],
				name: 'Fetch Pending Invoices',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"const invoices = $input.all();\nconst today = new Date();\nconst results = [];\n\nfor (const invoice of invoices) {\n  const dueDate = new Date(invoice.json.due_date);\n  const issueDate = new Date(invoice.json.issue_date);\n  const lastReminder = invoice.json.last_reminder_sent ? new Date(invoice.json.last_reminder_sent) : null;\n  \n  // Calculate days overdue\n  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));\n  \n  // Calculate days since last reminder\n  const daysSinceReminder = lastReminder ? Math.floor((today - lastReminder) / (1000 * 60 * 60 * 24)) : 999;\n  \n  // Determine reminder type and urgency\n  let reminderType = '';\n  let urgencyLevel = '';\n  let shouldSendReminder = false;\n  \n  if (daysOverdue > 30 && daysSinceReminder >= 3) {\n    reminderType = 'final_notice';\n    urgencyLevel = 'critical';\n    shouldSendReminder = true;\n  } else if (daysOverdue > 14 && daysSinceReminder >= 5) {\n    reminderType = 'second_reminder';\n    urgencyLevel = 'high';\n    shouldSendReminder = true;\n  } else if (daysOverdue > 0 && daysSinceReminder >= 7) {\n    reminderType = 'first_reminder';\n    urgencyLevel = 'medium';\n    shouldSendReminder = true;\n  } else if (daysOverdue === 0) {\n    reminderType = 'due_today';\n    urgencyLevel = 'medium';\n    shouldSendReminder = true;\n  } else if (daysOverdue < 0 && daysOverdue >= -3 && !lastReminder) {\n    reminderType = 'upcoming_reminder';\n    urgencyLevel = 'low';\n    shouldSendReminder = true;\n  }\n  \n  if (shouldSendReminder) {\n    results.push({\n      json: {\n        ...invoice.json,\n        daysOverdue,\n        daysSinceReminder,\n        reminderType,\n        urgencyLevel,\n        shouldSendReminder\n      }\n    });\n  }\n}\n\nreturn results;",
						},
						position: [672, -304],
						name: 'Calculate Reminder Logic',
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
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'condition-1',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.payment_status }}',
								rightValue: 'unpaid',
							},
							{
								id: 'condition-2',
								operator: { type: 'number', operation: 'gte' },
								leftValue: '={{ $json.days_overdue }}',
								rightValue: 0,
							},
						],
					},
				},
				name: 'Filter Overdue Invoices',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'ai-prompt',
								name: 'aiPrompt',
								type: 'string',
								value:
									'=Generate a professional and friendly payment reminder email for the following invoice:\n\nClient Name: {{ $json.client_name }}\nInvoice Number: {{ $json.invoice_number }}\nAmount: {{ $json.currency }} {{ $json.invoice_amount }}\nIssue Date: {{ $json.issue_date }}\nDue Date: {{ $json.due_date }}\nDays Overdue: {{ $json.daysOverdue }}\nReminder Type: {{ $json.reminderType }}\nUrgency: {{ $json.urgencyLevel }}\n\nThe email should:\n- Be courteous and professional\n- Clearly state the outstanding amount and invoice details\n- Mention the due date and overdue status if applicable\n- Include a polite call-to-action for payment\n- Provide payment instructions or link\n- Be appropriately urgent based on the reminder type\n- End with a professional signature\n\nFormat the response as a complete email with subject line.',
							},
						],
					},
				},
				position: [896, -304],
				name: 'Prepare AI Prompt',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: { options: {} },
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						config: {
							parameters: {
								model: '=gpt-4o-mini',
								options: { maxTokens: 500, temperature: 0.7 },
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'Generate Email',
						},
					}),
				},
				position: [1120, -304],
				name: 'AI Agent For Generate Email Content',
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
						'const items = $input.all();\nconst results = [];\n\nfor (const item of items) {\n  const aiResponse = item.json.message?.content || item.json.response || \'\';\n  \n  // Extract subject and body from AI response\n  const subjectMatch = aiResponse.match(/Subject:(.+?)\\n/i);\n  const subject = subjectMatch ? subjectMatch[1].trim() : `Payment Reminder - Invoice ${item.json.invoice_number}`;\n  \n  // Remove subject line from body\n  let body = aiResponse.replace(/Subject:(.+?)\\n/i, \'\').trim();\n  \n  // Add invoice details table\n  const invoiceTable = `\n  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">\n    <h3 style="color: #333; margin-top: 0;">Invoice Details</h3>\n    <table style="width: 100%; border-collapse: collapse;">\n      <tr>\n        <td style="padding: 8px; font-weight: bold;">Invoice Number:</td>\n        <td style="padding: 8px;">${item.json.invoice_number}</td>\n      </tr>\n      <tr>\n        <td style="padding: 8px; font-weight: bold;">Amount:</td>\n        <td style="padding: 8px;">${item.json.currency} ${item.json.invoice_amount}</td>\n      </tr>\n      <tr>\n        <td style="padding: 8px; font-weight: bold;">Due Date:</td>\n        <td style="padding: 8px;">${item.json.due_date}</td>\n      </tr>\n      <tr>\n        <td style="padding: 8px; font-weight: bold;">Status:</td>\n        <td style="padding: 8px; color: ${item.json.daysOverdue > 0 ? \'#d32f2f\' : \'#f57c00\'};">\n          ${item.json.daysOverdue > 0 ? `Overdue by ${item.json.daysOverdue} days` : \'Due Soon\'}\n        </td>\n      </tr>\n    </table>\n  </div>\n  `;\n  \n  // Convert body to HTML format\n  body = body.replace(/\\n/g, \'<br>\').replace(/\\*\\*(.+?)\\*\\*/g, \'<strong>$1</strong>\');\n  \n  // Combine into HTML email\n  const htmlBody = `\n  <html>\n    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">\n      ${body.split(\'<br>\')[0]}\n      ${invoiceTable}\n      ${body.split(\'<br>\').slice(1).join(\'<br>\')}\n      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">\n        <p>This is an automated reminder. If you have already made the payment, please disregard this email.</p>\n      </div>\n    </body>\n  </html>\n  `;\n  \n  results.push({\n    json: {\n      ...item.json,\n      emailSubject: subject,\n      emailBody: htmlBody,\n      emailBodyPlain: body.replace(/<[^>]*>/g, \'\')\n    }\n  });\n}\n\nreturn results;',
				},
				position: [1472, -304],
				name: 'Format Email',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: { appendAttribution: false, allowUnauthorizedCerts: false },
					subject: '={{ $json.emailSubject }}',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [1696, -304],
				name: 'Send Email Reminder',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.4,
			config: {
				parameters: {
					query:
						"=UPDATE invoices \nSET \n  last_reminder_sent = CURRENT_TIMESTAMP,\n  reminder_count = reminder_count + 1,\n  last_reminder_type = '{{ $json.reminderType }}'\nWHERE invoice_id = '{{ $json.invoice_id }}';",
					options: {},
					operation: 'executeQuery',
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [1920, -304],
				name: 'Update Reminder Status',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'log-entry',
								name: 'logEntry',
								type: 'object',
								value:
									'={\n  "timestamp": "{{ $now.toISO() }}",\n  "invoice_id": "{{ $json.invoice_id }}",\n  "invoice_number": "{{ $json.invoice_number }}",\n  "client_name": "{{ $json.client_name }}",\n  "client_email": "{{ $json.client_email }}",\n  "amount": "{{ $json.invoice_amount }}",\n  "reminder_type": "{{ $json.reminderType }}",\n  "urgency_level": "{{ $json.urgencyLevel }}",\n  "days_overdue": {{ $json.daysOverdue }},\n  "status": "reminder_sent"\n}',
							},
						],
					},
				},
				position: [2144, -304],
				name: 'Create Activity Log',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.4,
			config: {
				parameters: {
					table: { __rl: true, mode: 'list', value: 'invoice_activity_log' },
					schema: { __rl: true, mode: 'list', value: 'public' },
					columns: {
						value: {},
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: [],
					},
					options: {},
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [2368, -304],
				name: 'Save to Activity Log',
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
						'const allItems = $input.all();\nconst summary = {\n  totalReminders: allItems.length,\n  byUrgency: {},\n  byType: {},\n  totalAmountOutstanding: 0,\n  clients: []\n};\n\nfor (const item of allItems) {\n  // Count by urgency\n  summary.byUrgency[item.json.urgencyLevel] = (summary.byUrgency[item.json.urgencyLevel] || 0) + 1;\n  \n  // Count by type\n  summary.byType[item.json.reminderType] = (summary.byType[item.json.reminderType] || 0) + 1;\n  \n  // Sum outstanding amounts\n  summary.totalAmountOutstanding += parseFloat(item.json.invoice_amount);\n  \n  // Collect client info\n  summary.clients.push({\n    name: item.json.client_name,\n    invoice: item.json.invoice_number,\n    amount: item.json.invoice_amount,\n    daysOverdue: item.json.daysOverdue,\n    urgency: item.json.urgencyLevel\n  });\n}\n\nreturn [{ json: summary }];',
				},
				position: [2592, -304],
				name: 'Generate Daily Summary',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					subject: "=Daily Invoice Reminder Report - {{ $now.toFormat('yyyy-MM-dd') }}",
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [2816, -304],
				name: 'Send Summary to Finance Team',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: 'invoice-paid',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [-48, 368],
				name: 'Webhook: Payment Received',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.4,
			config: {
				parameters: {
					query:
						"=UPDATE invoices \nSET \n  payment_status = 'paid',\n  payment_date = CURRENT_TIMESTAMP,\n  payment_amount = {{ $json.body.amount }},\n  payment_method = '{{ $json.body.payment_method }}'\nWHERE invoice_number = '{{ $json.body.invoice_number }}'\nRETURNING *;",
					options: {},
					operation: 'executeQuery',
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [208, 368],
				name: 'Update Payment Status',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.1,
			config: {
				parameters: {
					options: {},
					respondWith: 'json',
					responseBody:
						'={\n  "success": true,\n  "message": "Payment recorded successfully",\n  "invoice_number": "{{ $json.invoice_number }}",\n  "amount_paid": {{ $json.payment_amount }},\n  "status": "{{ $json.payment_status }}"\n}',
				},
				position: [464, 144],
				name: 'Webhook Response',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					subject: '=Payment Confirmation - Invoice {{ $json.invoice_number }}',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [480, 576],
				name: 'Send Payment Confirmation',
			},
		}),
	)
	.add(
		sticky('Starts the workflow automatically each morning.', {
			name: 'Sticky Note1',
			position: [-32, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Decides when and how to send reminders.\n', {
			position: [640, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Keeps only overdue invoices.\n', {
			name: 'Sticky Note2',
			position: [416, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Gets unpaid invoices from the database.\n', {
			name: 'Sticky Note3',
			position: [192, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Creates a personalized AI prompt for each client.\n', {
			name: 'Sticky Note4',
			position: [864, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Records reminder activity for audit.\n', {
			name: 'Sticky Note5',
			position: [2096, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Marks reminder as sent in the database.\n', {
			name: 'Sticky Note6',
			position: [1872, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Sends the email via Gmail or SMTP.\n', {
			name: 'Sticky Note7',
			position: [1648, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Converts AI text to a professional HTML email.\n', {
			name: 'Sticky Note8',
			position: [1424, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Uses AI to draft reminder emails.\n', {
			name: 'Sticky Note9',
			position: [1104, -416],
			width: 272,
			height: 288,
		}),
	)
	.add(
		sticky('Prepares a report of reminders sent.\n', {
			name: 'Sticky Note10',
			position: [2544, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Emails summary to the finance team.\n', {
			name: 'Sticky Note11',
			position: [2768, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Stores raw workflow data for review.\n', {
			name: 'Sticky Note12',
			position: [2320, -416],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Generates thank-you massage via AI.\n', {
			name: 'Sticky Note13',
			position: [432, 0],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Captures payment notifications.\n', {
			name: 'Sticky Note14',
			position: [-96, 240],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Updates invoice as “paid.”\n', {
			name: 'Sticky Note15',
			position: [160, 240],
			width: 192,
			height: 288,
		}),
	)
	.add(
		sticky('Sends payment receipt to client.', {
			name: 'Sticky Note16',
			position: [448, 416],
			width: 192,
			height: 288,
		}),
	);
