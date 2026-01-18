const wf = workflow('', 'AI Gmail: Prioritize What You Should Read')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'hours' }] } },
				position: [-1264, 0],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					simple: false,
					filters: { readStatus: 'unread' },
					options: {},
					operation: 'getAll',
					returnAll: true,
				},
				position: [-1040, 0],
				name: 'Get All Unread Messages',
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
								id: 'e8fecc44-bfcf-42cd-a82d-b2963d8f4c94',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '4967158d-b4ee-41b4-a945-d19462d08886',
								name: 'text',
								type: 'string',
								value: '={{ $json.text ? $json.text : $json.html}}',
							},
							{
								id: '48cf009c-69ea-48aa-9de8-d53039aca4a5',
								name: 'from',
								type: 'string',
								value: '={{ $json.from.value[0].name }}',
							},
							{
								id: 'cfd63044-5e92-44c3-ad28-16118c1b83cb',
								name: 'threadId',
								type: 'string',
								value: '={{ $json.threadId }}',
							},
						],
					},
				},
				position: [-816, 0],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=You are a strict JSON generator.\n\nAnalyze the following email content and classify it into one of the following categories:\n\n- "Action" → bills, inquiries, reply needed, or require my attention.\n- "Informational" → updates, shipping, delivery alerts, social media updates or messages. \n- "Spam" → promotional or marketing emails.\n- "Receipt" → receipts of purchases or subscriptions.\n\nSummary: Extract the most important information of the email into 1 sentence, not more than 4000 characters. \n\nReturn your response in a JSON object, **only using** this exact format (this is an example — follow this structure exactly):\n{ "label": "<one of the 4 categories>", "summary": "<Summary>", "id": {{ $json.id }}, "threadId": {{ $json.threadId }} }\n\nExample output (follow this exact style):\n{ "label": "Informational", "summary": "Your Apple Magic Keyboard has shipped and will arrive June 28.", "id": "abc123" }\n\nRules:\n- Do NOT return markdown (no triple backticks, no ```json)\n- Use double quotes for keys and string values\n- Do NOT include explanations, extra text, or formatting\n- Return ONLY the one-line function call above, replacing values as needed and using the exact format above.\n\nReview your response to ensure you meet the rules before you generate the output. \n\n\nid: {{ $json.id }}\nthreadId: {{ $json.threadId }}\n\nEmail content:\n{{ $json.text }}\n',
					options: {},
					promptType: 'define',
				},
				position: [-592, 0],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Action',
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
											id: '7822ad3b-3f0a-4e7e-8f3c-96641f2e2d4a',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.output.label }}',
											rightValue: 'Action',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Informational',
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
											id: 'a076e618-a956-4ea7-a253-67e90a008495',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.output.label }}',
											rightValue: 'Informational',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Receipt',
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
											id: '873953c5-db09-450c-b5ed-59f695bfc9af',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.output.label }}',
											rightValue: 'Receipt',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: { fallbackOutput: 'extra' },
				},
				position: [-128, -32],
				name: 'Switch',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: ['Label_4190586288433010009', 'IMPORTANT'],
					messageId: '={{ $json.output.id }}',
					operation: 'addLabels',
				},
				position: [96, -288],
				name: 'Add label "Action" to email',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: { messageId: '={{ $json.id }}', operation: 'markAsRead' },
				position: [432, -64],
				name: 'Mark email as read',
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
					labelIds: ['Label_4104611383523107189'],
					messageId: '={{ $json.output.id }}',
					operation: 'addLabels',
				},
				position: [96, -96],
				name: 'Add label "Informational" to email',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: ['Label_3361902760602362460'],
					messageId: '={{ $json.output.id }}',
					operation: 'addLabels',
				},
				position: [96, 96],
				name: 'Add label "Receipt" to email',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					resource: 'thread',
					threadId: '={{ $json.output.threadId }}',
					operation: 'delete',
				},
				position: [96, 288],
				name: 'Delete email',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					schemaType: 'manual',
					inputSchema:
						'{\n  "type": "object",\n  "properties": {\n    "label": { "type": "string" },\n    "summary": { "type": "string" },\n    "id": { "type": "string" },\n    "threadId": { "type": "string" }\n  },\n  "required": ["label", "id"]\n}\n',
				},
				position: [-336, 224],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o',
						cachedResultName: 'gpt-4o',
					},
					options: {},
				},
				position: [-592, 224],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-3.5-turbo',
						cachedResultName: 'gpt-3.5-turbo',
					},
					options: {},
				},
				position: [-464, 224],
				name: 'OpenAI Fall Back Model',
			},
		}),
	)
	.add(
		sticky(
			'### 💡 Schedule Trigger\nThis runs every hour. You can change the interval here depending on how often you want your Gmail to be processed.',
			{ color: 5, position: [-1320, -144], width: 208, height: 304 },
		),
	)
	.add(
		sticky(
			'### ⚠️ Setup Required\n- Connect your Gmail account using OAuth2. \n- Add your OpenAI API Key under “API Credentials”.\n- Create these labels in your Gmail: Action, Informational, Spam and Receipt',
			{ name: 'Sticky Note1', position: [-1312, 256], width: 304, height: 224 },
		),
	)
	.add(
		sticky(
			'### 💡 Customize Classification Logic\nYou can change the prompt to match your context. For example, tell the AI to detect more labels like `Meeting`, `Newsletter`, etc.',
			{ name: 'Sticky Note2', color: 5, position: [-640, -160], width: 432, height: 320 },
		),
	)
	.add(
		sticky(
			'### 💡 Add More Labels\nWant to detect  `Meeting`, `Newsletter`, etc?\nAdd more conditions here and route them to different Gmail actions.',
			{ name: 'Sticky Note3', color: 5, position: [-200, -160], height: 352 },
		),
	);
