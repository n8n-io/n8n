const wf = workflow('Cki3H3LKIaoXKG1r', 'Website Down Time Monitoring for n8n', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-1120, 2425] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 959117872,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit#gid=959117872',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=drivesdk',
						cachedResultName: 'Website Moniter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-900, 2425],
				name: 'Website URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-680, 2425], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $json['Website URL'] }}",
					options: {
						timeout: 5000,
						response: { response: { fullResponse: true } },
					},
				},
				position: [-460, 1900],
				name: 'Check website status',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.6,
					config: {
						parameters: {
							options: {},
							filtersUI: {
								values: [
									{
										lookupValue: "={{ $('Loop Over Items').item.json['Website URL'] }}",
										lookupColumn: 'Website URL',
									},
									{ lookupColumn: 'Up Time' },
								],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit#gid=0',
								cachedResultName: 'Sheet2',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=drivesdk',
								cachedResultName: 'Website Moniter',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [-20, 1800],
						name: 'Get Active Down Record',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.6,
					config: {
						parameters: {
							options: {},
							filtersUI: {
								values: [
									{
										lookupValue: "={{ $('Loop Over Items').item.json['Website URL'] }}",
										lookupColumn: 'Website URL',
									},
								],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit#gid=0',
								cachedResultName: 'Sheet2',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=drivesdk',
								cachedResultName: 'Website Moniter',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [-20, 2200],
						name: 'Get Existing Down Records',
					},
				}),
			],
			{
				version: 1,
				parameters: {
					conditions: {
						number: [
							{
								value1: '={{$json["statusCode"]}}',
								value2: 400,
								operation: 'equal',
							},
						],
					},
				},
				name: 'If Site Up',
			},
		),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.6,
					config: {
						parameters: {
							columns: {
								value: {
									'Up Time': "={{ new Date().toLocaleTimeString('en-GB', { hour12: false }) }}",
									row_number: '={{ $json.row_number }}',
									'Website URL': "={{ $json['Website URL'] }}",
									'Total downtime':
										"={{(() => {\n  const downTimeStr = $input.first().json['Down Time'];\n\n  // Get current time in HH:MM:SS format\n  const now = new Date();\n  const upTimeStr = now.toLocaleTimeString('en-GB', { hour12: false });\n\n  function parseTime(timeStr) {\n    const [h, m, s] = timeStr.split(\":\").map(Number);\n    const date = new Date();\n    date.setHours(h, m, s, 0);\n    return date;\n  }\n\n  const downTime = parseTime(downTimeStr);\n  const upTime = parseTime(upTimeStr);\n\n  // Handle overnight scenario\n  if (upTime < downTime) {\n    upTime.setDate(upTime.getDate() + 1);\n  }\n\n  const diffMs = upTime - downTime;\n  const totalMinutes = Math.floor(diffMs / 60000);\n  const hours = Math.floor(totalMinutes / 60);\n  const minutes = totalMinutes % 60;\n  const seconds = Math.floor((diffMs % 60000) / 1000);\n\n  return `${hours}h ${minutes}m ${seconds}s`;\n})()}}",
								},
								schema: [
									{
										id: 'Website URL',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Website URL',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Down Time',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Down Time',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Up Time',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Up Time',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Total downtime',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Total downtime',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'row_number',
										type: 'string',
										display: true,
										removed: false,
										readOnly: true,
										required: false,
										displayName: 'row_number',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
								],
								mappingMode: 'defineBelow',
								matchingColumns: ['row_number'],
								attemptToConvertTypes: false,
								convertFieldsToString: false,
							},
							options: {},
							operation: 'update',
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit#gid=0',
								cachedResultName: 'Sheet2',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=drivesdk',
								cachedResultName: 'Website Moniter',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [420, 1800],
						name: 'Update Uptime and Total Downtime',
					},
				}),
				node({
					type: 'n8n-nodes-base.splitInBatches',
					version: 3,
					config: { parameters: { options: {} }, position: [-680, 2425], name: 'Loop Over Items' },
				}),
			],
			{
				version: 2.2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '1337beb6-7974-45ab-9fa0-93f5ce0ee7b7',
								operator: { type: 'boolean', operation: 'false', singleValue: true },
								leftValue:
									'={{(() => {   const data = $json;   return Object.keys(data).length === 0; })()}}',
								rightValue: '',
							},
						],
					},
				},
				name: 'If Down Record Exist',
			},
		),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						"=Hi there,\n\nWe're excited to announce that the {{ $('Website URLs').item.json['Website URL'] }} is now live!\nFeel free to visit and explore.",
					options: {},
					subject: '=Site is now working fine.',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [640, 1600],
				name: 'Email Notification for Up',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			config: {
				parameters: {
					text: "We're excited to announce that the {{ $('Website URLs').item.json['Website URL'] }} is now live! Feel free to visit and explore.",
					user: {
						__rl: true,
						mode: 'list',
						value: 'U08QEDH1YVB',
						cachedResultName: 'mail',
					},
					select: 'user',
					otherOptions: { includeLinkToWorkflow: false },
					authentication: 'oAuth2',
				},
				credentials: {
					slackOAuth2Api: { id: 'credential-id', name: 'slackOAuth2Api Credential' },
				},
				position: [640, 1800],
				name: 'Slack Notification for Up',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: "We're excited to announce that the {{ $('Website URLs').item.json['Website URL'] }} is now live! Feel free to visit and explore.",
					chatId: '123456789',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [640, 2000],
				name: 'Telegram Notification for Up',
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
						"let hasIncompleteRecord = false;\n\nfor (const item of $input.all()) {\n  const url = item.json['Website URL']?.trim();\n  const downTime = item.json['Down Time']?.trim();\n  const upTime = item.json['Up Time']?.trim();\n  const totalDowntime = item.json['Total downtime']?.trim();\n\n  if (url && downTime && (!upTime || !totalDowntime)) {\n    hasIncompleteRecord = true;\n  }\n}\n\nreturn [\n  {\n    json: {\n      status: hasIncompleteRecord ? \"yes\" : \"no\",\n      websites: $input.first().json['Website URL']\n    }\n  }\n];\n",
				},
				position: [200, 2200],
				name: 'Find Existing Record',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.splitInBatches',
					version: 3,
					config: { parameters: { options: {} }, position: [-680, 2425], name: 'Loop Over Items' },
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.6,
					config: {
						parameters: {
							columns: {
								value: {
									'Down Time': "={{ new Date().toLocaleTimeString('en-GB', { hour12: false }) }}",
									'Website URL': '={{ $(\'Loop Over Items\').item.json["Website URL"] }}',
								},
								schema: [
									{
										id: 'Website URL',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Website URL',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Down Time',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Down Time',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Up Time',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Up Time',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Total downtime',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Total downtime',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'row_number',
										type: 'string',
										display: true,
										removed: false,
										readOnly: true,
										required: false,
										displayName: 'row_number',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
								],
								mappingMode: 'defineBelow',
								matchingColumns: ['Website URL'],
								attemptToConvertTypes: false,
								convertFieldsToString: false,
							},
							options: {},
							operation: 'append',
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit#gid=0',
								cachedResultName: 'Sheet2',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=drivesdk',
								cachedResultName: 'Website Moniter',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [640, 2200],
						name: 'Add Downtime Record',
					},
				}),
			],
			{
				version: 2.2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '9e5df4d3-c9fd-4311-ae97-c06fcbcc1c97',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.status }}',
								rightValue: 'yes',
							},
						],
					},
				},
				name: 'Check Downtime Exists',
			},
		),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						"=Hi there,\n\nThe Website {{ $json['Website URL'] }} is Down. Please take the required action as soon as possible.",
					options: {},
					subject: '=Your site is down!!',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [860, 1975],
				name: 'Email Notification for Down',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			config: {
				parameters: {
					text: "=🚨 Alert:| Hi there, The {{ $json['Website URL'] }} website is currently down. Kindly look into this issue and take necessary action as soon as possible.  Thank you.",
					user: {
						__rl: true,
						mode: 'list',
						value: 'U08QEDH1YVB',
						cachedResultName: 'mail',
					},
					select: 'user',
					otherOptions: { includeLinkToWorkflow: false },
					authentication: 'oAuth2',
				},
				credentials: {
					slackOAuth2Api: { id: 'credential-id', name: 'slackOAuth2Api Credential' },
				},
				position: [860, 2175],
				name: 'Slack Notification for Down',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: "=🚨 Alert: Hi there, | The {{ $json['Website URL'] }} website is currently down. Kindly look into this issue and take necessary action as soon as possible.  Thank you.",
					chatId: '123456789',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [860, 2375],
				name: 'Telegram Notification for Down',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.vapi.ai/call',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "assistantId": "assistant_id",\n  "assistantOverrides": {\n    "variableValues": {\n    "name":"John",\n    "web_domain":"{{ $json[\'Website URL\'] }}"\n    }\n  },\n  "customer": {\n    "number": "+919999999999"\n  },\n  "phoneNumberId": "phone_number_id"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [860, 2580],
				name: 'Notify over Phone Call',
			},
		}),
	)
	.add(
		sticky(
			"### Website downtime monitoring with logging\nSample Sheet: https://docs.google.com/spreadsheets/d/1_VVpkIvpYQigw5q0KmPXUAC2aV2rk1nRQLQZ7YK2KwY/edit?usp=sharing\n- Sheet 1 - Add domain list for monitoring.\n- Sheet 2 - Store all downtime logs.\n\n\nCreate new assistant in Vapi and set First message as below.\n- Hello {{name}}, I'm Website Monitoring Assistant. This is a system alert. The {{web_domain}} is currently down. Please take immediate action to investigate and resolve the issue. Thank you.\n\n\n",
			{ position: [-340, 1460], width: 560, height: 280 },
		),
	);
