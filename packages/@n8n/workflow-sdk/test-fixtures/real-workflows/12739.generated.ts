const wf = workflow('L87pnGIo6Q1Bmxwe', 'Automated Client Onboarding and Task Assignment System', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2.1,
			config: {
				parameters: {
					path: 'client-intake',
					options: {},
					httpMethod: 'POST',
					responseMode: 'lastNode',
				},
				position: [128, 128],
				name: 'New Client Intake Form',
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
								id: 'id-1',
								name: 'strategyConsultantChannel',
								type: 'string',
								value: '<__PLACEHOLDER_VALUE__Slack channel ID for Strategy consultant__>',
							},
							{
								id: 'id-2',
								name: 'managementConsultantChannel',
								type: 'string',
								value: '<__PLACEHOLDER_VALUE__Slack channel ID for Management consultant__>',
							},
							{
								id: 'id-3',
								name: 'itConsultantChannel',
								type: 'string',
								value: '<__PLACEHOLDER_VALUE__Slack channel ID for IT consultant__>',
							},
							{
								id: 'id-4',
								name: 'googleSheetId',
								type: 'string',
								value: '<__PLACEHOLDER_VALUE__Google Sheets spreadsheet ID__>',
							},
							{
								id: 'id-5',
								name: 'crmApiUrl',
								type: 'string',
								value: '<__PLACEHOLDER_VALUE__CRM API endpoint URL__>',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [352, 128],
				name: 'Workflow Configuration',
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
								id: 'id-1',
								name: 'clientName',
								type: 'string',
								value: "={{ $json.body.name || $json.body.clientName || '' }}",
							},
							{
								id: 'id-2',
								name: 'clientEmail',
								type: 'string',
								value: "={{ $json.body.email || $json.body.clientEmail || '' }}",
							},
							{
								id: 'id-3',
								name: 'projectType',
								type: 'string',
								value: "={{ $json.body.projectType || $json.body.project_type || '' }}",
							},
							{
								id: 'id-4',
								name: 'company',
								type: 'string',
								value: "={{ $json.body.company || '' }}",
							},
							{
								id: 'id-5',
								name: 'phone',
								type: 'string',
								value: "={{ $json.body.phone || '' }}",
							},
						],
					},
					includeOtherFields: true,
				},
				position: [576, 128],
				name: 'Normalize Client Data',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 2.1,
			config: {
				parameters: {
					modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
					options: {
						instructions:
							'You are an expert consultant onboarding assistant. Based on the client information and project type provided, generate:\n\n1. A comprehensive onboarding checklist (5-8 items) tailored to the project type\n2. First 3-5 actionable tasks to get started\n3. Key deliverables and milestones\n\nFormat your response as JSON with the following structure:\n{\n  "checklist": ["item1", "item2", ...],\n  "firstTasks": ["task1", "task2", ...],\n  "deliverables": ["deliverable1", "deliverable2", ...]\n}\n\nTailor recommendations based on project type:\n- Strategy: Focus on analysis, planning, and strategic frameworks\n- Management: Focus on process optimization, team coordination, and implementation\n- IT: Focus on technical requirements, system architecture, and development phases',
					},
					responses: {
						values: [
							{
								content:
									'=Client Name: {{ $json.clientName }}\nProject Type: {{ $json.projectType }}\nCompany: {{ $json.company }}\n\nGenerate a customized onboarding checklist and first tasks for this client.',
							},
						],
					},
					builtInTools: {},
				},
				credentials: {
					openAiApi: { id: 'HTy8dVDHzRHtxXLm', name: 'n8n free OpenAI API credits' },
				},
				position: [800, 128],
				name: 'Generate Onboarding Checklist',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.4,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Strategy',
								conditions: {
									options: {
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.projectType }}',
											rightValue: 'Strategy',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Management',
								conditions: {
									options: {
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.projectType }}',
											rightValue: 'Management',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IT',
								conditions: {
									options: {
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.projectType }}',
											rightValue: 'IT',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [1152, 112],
				name: 'Route by Project Type',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: null,
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: ['Email'],
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'name', value: 'Strategy Clients' },
					documentId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.googleSheetId }}",
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: '5b6oIAuqcO9HRb2A', name: 'Google Sheets account 3' },
				},
				position: [1376, -64],
				name: 'Log to Google Sheets - Strategy',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.4,
			config: {
				parameters: {
					text: '=🎯 *New Strategy Client Assigned*\n\n*Client:* {{ $json.clientName }}\n*Company:* {{ $json.company }}\n*Email:* {{ $json.clientEmail }}\n*Phone:* {{ $json.phone }}\n\n*Onboarding Checklist:*\n{{ $json.message.content ? JSON.parse($json.message.content).checklist.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}\n\n*First Tasks:*\n{{ $json.message.content ? JSON.parse($json.message.content).firstTasks.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.strategyConsultantChannel }}",
					},
					otherOptions: {},
				},
				position: [1600, -64],
				name: 'Notify Strategy Consultant',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: '=<html>\n<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">\n  <h2 style="color: #0066cc;">Welcome, {{ $json.clientName }}! 🎉</h2>\n  \n  <p>Thank you for choosing our consulting services. We\'re excited to partner with you on your <strong>{{ $json.projectType }}</strong> project.</p>\n  \n  <h3>What\'s Next?</h3>\n  <p>Your dedicated consultant has been assigned and will reach out shortly to schedule your kickoff meeting.</p>\n  \n  <h3>Your Onboarding Checklist:</h3>\n  <ul>\n    {{ $json.message.content ? JSON.parse($json.message.content).checklist.map(item => `<li>${item}</li>`).join("") : "<li>Details will be shared in your kickoff meeting</li>" }}\n  </ul>\n  \n  <h3>First Tasks:</h3>\n  <ul>\n    {{ $json.message.content ? JSON.parse($json.message.content).firstTasks.map(item => `<li>${item}</li>`).join("") : "<li>Details will be shared in your kickoff meeting</li>" }}\n  </ul>\n  \n  <p>If you have any questions, feel free to reply to this email.</p>\n  \n  <p>Best regards,<br>Your Consulting Team</p>\n</body>\n</html>',
					options: {},
					subject: '=Welcome to Our Consulting Services - {{ $json.clientName }}',
					toEmail: '={{ $json.clientEmail }}',
					fromEmail: '<__PLACEHOLDER_VALUE__Your company email address__>',
				},
				position: [1824, 128],
				name: 'Send Welcome Email',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleCalendar',
			version: 1.3,
			config: {
				parameters: {
					end: "={{ $now.plus(2, 'days').set({ hour: 11, minute: 0 }).toISO() }}",
					start: "={{ $now.plus(2, 'days').set({ hour: 10, minute: 0 }).toISO() }}",
					calendar: { __rl: true, mode: 'id', value: 'primary' },
					additionalFields: {
						summary: '=Kickoff Meeting - {{ $json.clientName }}',
						attendees: ['={{ $json.clientEmail }}'],
						description:
							'=Initial kickoff meeting for {{ $json.projectType }} project with {{ $json.clientName }} from {{ $json.company }}.\n\nAgenda:\n- Introductions\n- Project overview\n- Timeline and deliverables\n- Next steps',
					},
				},
				position: [2048, 128],
				name: 'Schedule Kickoff Meeting',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: {
					url: "={{ $('Workflow Configuration').first().json.crmApiUrl }}",
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "name": "{{ $json.clientName }}",\n  "email": "{{ $json.clientEmail }}",\n  "company": "{{ $json.company }}",\n  "phone": "{{ $json.phone }}",\n  "projectType": "{{ $json.projectType }}",\n  "status": "onboarding",\n  "onboardingData": {{ $json.message.content || "{}" }}\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
				},
				position: [2272, 128],
				name: 'Sync to CRM',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: null,
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: ['Email'],
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'name', value: 'Management Clients' },
					documentId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.googleSheetId }}",
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: '5b6oIAuqcO9HRb2A', name: 'Google Sheets account 3' },
				},
				position: [1376, 128],
				name: 'Log to Google Sheets - Management',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.4,
			config: {
				parameters: {
					text: '=📊 *New Management Client Assigned*\n\n*Client:* {{ $json.clientName }}\n*Company:* {{ $json.company }}\n*Email:* {{ $json.clientEmail }}\n*Phone:* {{ $json.phone }}\n\n*Onboarding Checklist:*\n{{ $json.message.content ? JSON.parse($json.message.content).checklist.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}\n\n*First Tasks:*\n{{ $json.message.content ? JSON.parse($json.message.content).firstTasks.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.managementConsultantChannel }}",
					},
					otherOptions: {},
				},
				position: [1600, 128],
				name: 'Notify Management Consultant',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: null,
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: ['Email'],
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'name', value: 'IT Clients' },
					documentId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.googleSheetId }}",
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: '5b6oIAuqcO9HRb2A', name: 'Google Sheets account 3' },
				},
				position: [1376, 320],
				name: 'Log to Google Sheets - IT',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.4,
			config: {
				parameters: {
					text: '=💻 *New IT Client Assigned*\n\n*Client:* {{ $json.clientName }}\n*Company:* {{ $json.company }}\n*Email:* {{ $json.clientEmail }}\n*Phone:* {{ $json.phone }}\n\n*Onboarding Checklist:*\n{{ $json.message.content ? JSON.parse($json.message.content).checklist.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}\n\n*First Tasks:*\n{{ $json.message.content ? JSON.parse($json.message.content).firstTasks.map((item, i) => `${i+1}. ${item}`).join("\\n") : "See full details in Google Sheets" }}',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.itConsultantChannel }}",
					},
					otherOptions: {},
				},
				position: [1600, 320],
				name: 'Notify IT Consultant',
			},
		}),
	)
	.add(sticky('## Webhook & Config', { color: 7, position: [80, -64], width: 672, height: 656 }))
	.add(
		sticky('## AI Routing ', {
			name: 'Sticky Note1',
			color: 7,
			position: [768, -64],
			width: 496,
			height: 656,
		}),
	)
	.add(
		sticky('## Log & Notify', {
			name: 'Sticky Note2',
			color: 7,
			position: [1296, -160],
			width: 496,
			height: 656,
		}),
	)
	.add(
		sticky('## CRM', {
			name: 'Sticky Note3',
			color: 7,
			position: [1808, -160],
			width: 656,
			height: 656,
		}),
	)
	.add(
		sticky(
			'## Main\nThis workflow automates consulting client onboarding, task creation, and routing. AI generates a checklist based on project type and assigns tasks to the correct team member.\n\n## Setup\n1. Connect your Webhook/Form credentials for client intake.\n2. Configure Google Sheets to store client info.\n3. Connect OpenAI credentials for checklist/task generation.\n4. Connect Slack for internal notifications.\n5. Connect email for client communication.\n6. Optional: CRM integration for automated logging.\n\n**Author:** Hyrum Hurst, AI Automation Engineer\n**Company:** QuarterSmart\n**Contact:** hyrum@quartersmart.com\n',
			{ name: 'Sticky Note4', position: [-304, -32], width: 336, height: 576 },
		),
	);
