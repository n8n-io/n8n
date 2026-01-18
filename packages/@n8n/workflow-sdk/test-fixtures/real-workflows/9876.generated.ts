const wf = workflow(
	'sKPt2XLNb9anT2fW',
	'Multi-Channel DHL Status Bot with n8n, Gmail, and Webhooks',
	{
		timezone: 'America/New_York',
		errorWorkflow: '',
		executionOrder: 'v1',
		saveManualExecutions: true,
		saveExecutionProgress: true,
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
	},
)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: 'dhl-tracking-inquiry',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [304, 112],
				name: 'Webhook Form Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3,
			config: {
				parameters: { mode: 'combine', options: {} },
				position: [608, 208],
				name: 'Merge Triggers',
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
						"// Extract tracking number from different sources\nconst items = $input.all();\nconst output = [];\n\nfor (const item of items) {\n  let trackingNumber = '';\n  let customerEmail = '';\n  let customerName = '';\n  \n  // Check if from webhook (form submission)\n  if (item.json.body) {\n    trackingNumber = item.json.body.trackingNumber || item.json.body.orderNumber || '';\n    customerEmail = item.json.body.email || '';\n    customerName = item.json.body.name || 'Customer';\n  }\n  \n  // Check if from email\n  if (item.json.subject || item.json.text) {\n    // Extract tracking number using regex (DHL format)\n    const text = item.json.text || item.json.snippet || '';\n    const dhlPattern = /\\b\\d{10,}\\b/g;\n    const matches = text.match(dhlPattern);\n    \n    if (matches && matches.length > 0) {\n      trackingNumber = matches[0];\n    }\n    \n    customerEmail = item.json.from?.value?.[0]?.address || item.json.from || '';\n    customerName = item.json.from?.value?.[0]?.name || 'Customer';\n  }\n  \n  if (trackingNumber) {\n    output.push({\n      json: {\n        trackingNumber: trackingNumber,\n        customerEmail: customerEmail,\n        customerName: customerName,\n        originalData: item.json\n      }\n    });\n  }\n}\n\nreturn output;",
				},
				position: [800, 208],
				name: 'Extract Tracking Number',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api-eu.dhl.com/track/shipments',
					options: { response: { response: { responseFormat: 'json' } } },
					sendQuery: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'trackingNumber',
								value: '={{ $json.trackingNumber }}',
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'DHL-API-Key', value: 'YOUR_DHL_API_KEY' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1008, 208],
				name: 'Get DHL Tracking Status',
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
						"// Format the tracking response\nconst trackingData = $input.item.json;\nconst customerData = $node[\"Extract Tracking Number\"].json;\n\nlet statusMessage = '';\nlet trackingDetails = {};\n\ntry {\n  // Parse DHL API response\n  const shipment = trackingData.shipments?.[0];\n  \n  if (shipment) {\n    const latestEvent = shipment.events?.[0];\n    const status = shipment.status;\n    \n    trackingDetails = {\n      trackingNumber: customerData.trackingNumber,\n      currentStatus: status?.status || 'In Transit',\n      statusDescription: status?.description || '',\n      lastUpdate: latestEvent?.timestamp || new Date().toISOString(),\n      location: latestEvent?.location?.address?.addressLocality || 'Unknown',\n      estimatedDelivery: shipment.estimatedTimeOfDelivery || 'Not available',\n      carrier: 'DHL Express'\n    };\n    \n    statusMessage = `\nDear ${customerData.customerName},\n\nThank you for your inquiry about tracking number: ${trackingDetails.trackingNumber}\n\n📦 **Current Status:** ${trackingDetails.currentStatus}\n📍 **Last Location:** ${trackingDetails.location}\n🕒 **Last Update:** ${new Date(trackingDetails.lastUpdate).toLocaleString()}\n📅 **Estimated Delivery:** ${trackingDetails.estimatedDelivery}\n\n${trackingDetails.statusDescription}\n\nYou can track your shipment in real-time at:\nhttps://www.dhl.com/track?tracking-id=${trackingDetails.trackingNumber}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nCustomer Service Team\n    `;\n  } else {\n    statusMessage = `\nDear ${customerData.customerName},\n\nWe couldn't find tracking information for: ${customerData.trackingNumber}\n\nPlease verify the tracking number and try again. If the issue persists, please contact our support team.\n\nBest regards,\nCustomer Service Team\n    `;\n  }\n} catch (error) {\n  statusMessage = `\nDear ${customerData.customerName},\n\nWe encountered an issue retrieving your tracking information. Our team has been notified and will look into this immediately.\n\nTracking Number: ${customerData.trackingNumber}\n\nPlease try again later or contact our support team for immediate assistance.\n\nBest regards,\nCustomer Service Team\n  `;\n}\n\nreturn {\n  json: {\n    customerEmail: customerData.customerEmail,\n    customerName: customerData.customerName,\n    subject: `Re: DHL Tracking Update - ${customerData.trackingNumber}`,\n    message: statusMessage,\n    trackingDetails: trackingDetails,\n    isWebhook: customerData.originalData?.body ? true : false\n  }\n};",
				},
				position: [1200, 208],
				name: 'Format Response Message',
			},
		}),
	)
	.then(
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
								id: 'condition-1',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.isWebhook }}',
								rightValue: true,
							},
						],
					},
				},
				position: [1408, 208],
				name: 'Check Source',
			},
		}),
	)
	.output(0)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.1,
			config: {
				parameters: {
					options: {
						responseCode: 200,
						responseHeaders: {
							entries: [{ name: 'Content-Type', value: 'application/json' }],
						},
					},
					respondWith: 'json',
					responseBody: '={{ JSON.stringify($json.trackingDetails) }}',
				},
				position: [1600, 112],
				name: 'Webhook Response',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: '={{ $json.customerEmail }}',
					message: '={{ $json.message }}',
					options: { replyTo: 'user@example.com' },
					subject: '={{ $json.subject }}',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1600, 304],
				name: 'Send Gmail Response',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.1,
			config: {
				parameters: {
					simple: false,
					filters: { sender: [], readStatus: 'unread' },
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [304, 304],
				name: 'Gmail Email Trigger',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.1,
			config: {
				parameters: {
					options: {
						responseCode: 200,
						responseHeaders: {
							entries: [{ name: 'Content-Type', value: 'application/json' }],
						},
					},
					respondWith: 'json',
					responseBody: '={{ JSON.stringify($json.trackingDetails) }}',
				},
				position: [1600, 112],
				name: 'Webhook Response',
			},
		}),
	)
	.add(
		sticky(
			"## Multi-Channel DHL Status Bot\n\nThis workflow automatically answers customer inquiries about DHL shipment status from two different channels: web forms and email.\n\n**Channels Handled:**\n- **Webhooks:** For 'Track My Order' forms on your website.\n- **Gmail:** For direct email inquiries.\n\n**Process Flow:**\n1. Receives a tracking number from either source.\n2. Fetches the latest status from the DHL API.\n3. Sends a formatted response back to the original channel.",
			{ name: 'Workflow Overview', position: [-112, 80], width: 320, height: 410 },
		),
	)
	.add(
		sticky(
			"## ⚙️ Trigger Configuration\n\n**1. Gmail Trigger:**\n- Select the 'Gmail Email Trigger' node.\n- Connect your Gmail OAuth2 credentials.\n- **Action:** This allows the workflow to monitor an inbox for new tracking inquiries.\n\n**2. Webhook Trigger:**\n- Copy the Production URL from the 'Webhook Form Trigger' node.\n- **Action:** Paste this URL into your website's form settings (e.g., WordPress, Webflow, custom HTML form).",
			{ name: 'Trigger Setup', color: 3, position: [304, 480], width: 280, height: 308 },
		),
	)
	.add(
		sticky(
			'## Data Normalization\n\nThis Code node unifies data from both triggers.\n\n**It extracts:**\n- Tracking Number (from form body or email text)\n- Customer Email\n- Customer Name\n\nThis ensures the rest of the workflow can process the data in a consistent format, regardless of the source.',
			{ name: 'Extraction Logic', color: 5, position: [688, 384], width: 250, height: 236 },
		),
	)
	.add(
		sticky(
			"## ⚙️ DHL API Configuration\n\n**Action Required:** You must add your DHL API key to proceed.\n\n1. **Get API Key:** Register and get a key from the [DHL Developer Portal](https://developer.dhl.com/).\n2. **Add Key to Node:**\n   - Select the 'Get DHL Tracking Status' node.\n   - Go to `Headers` > `Header Parameters`.\n   - Replace `YOUR_DHL_API_KEY` with your actual key.",
			{ name: 'DHL API Configuration', color: 4, position: [1008, 384], width: 280, height: 240 },
		),
	)
	.add(
		sticky(
			'## Response Routing\n\nThis IF node intelligently routes the response based on the original inquiry source.\n\n- **If `isWebhook` is true:** The workflow sends a JSON response back to the web form.\n- **If `isWebhook` is false:** The workflow sends a formatted reply via Gmail.',
			{ name: 'Response Routing', color: 6, position: [1344, 352], width: 220, height: 232 },
		),
	)
	.add(
		sticky(
			'## ✉️ Email Customization\n\nCustomize the automated email reply.\n\n**Suggestions:**\n- **Set `Reply-To` in \'Send Gmail Response\' node:** Add a support address like `support@yourcompany.com`.\n- **Refine Message:** Edit the email body in the "Format Response Message" node to add your company signature or branding.',
			{ name: 'Email Setup', color: 2, position: [1600, 464], height: 252 },
		),
	);
