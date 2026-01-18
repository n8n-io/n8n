const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.3,
			config: { parameters: { options: { responseMode: 'responseNodes' } }, position: [-48, -240] },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					options: {
						systemMessage:
							'Goal:\nYou are only helping the user create new tasks in a Google Sheet. Do not handle updates yet.\n\nProcess:\n\nStart by determining whether the user wants to create a new item or update an existing one.\n\nContinue chatting naturally with the user until:\n\nYou know that they want to update (in which case you’ll stop and output that), or\n\nYou’ve gathered all the necessary fields for a new task.\n\nRequired fields for creating a new task:\n\nTask\n\nDescription\n\nStatus\n\nThe user can respond with “don’t know,” in which case that field is left blank (output nothing for that field).\n\nOutput Format:\n\n{\n  "response": "Your message back to the user",\n  "info gathered": {\n    "type": "create or update",\n    "Task": "",\n    "Description": "",\n    "Status": ""\n  },\n  "all Info": "Yes or No"\n}\n\n\nRules:\n\n"type" can only be "create" or "update".\n\n"all Info" can only be "Yes" or "No", depending on whether you have all required fields for the chosen action.\n\nKeep chatting with the user until "all Info" = "Yes".',
					},
					hasOutputParser: true,
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Chat Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								autoFix: true,
								jsonSchemaExample:
									'{\n	"response": "what you want to say back to the user", \n  "info gathered": "all of the info you have gathered so far", \n  "all Info": "Yes or no if you have all of the fields"\n}',
							},
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
									version: 1.2,
									config: {
										parameters: {
											model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
											options: {},
										},
										credentials: {
											openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
										},
										name: 'OpenAI Chat Model1',
									},
								}),
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [288, 0],
				name: 'Project Manager Agent',
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
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '852bfa85-8367-4822-ae6b-e8490c57f00e',
								operator: { type: 'string', operation: 'equals' },
								leftValue: "={{ $json.output['all Info'] }}",
								rightValue: 'Yes',
							},
						],
					},
				},
				position: [640, 0],
				name: 'Have All Info?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ $json.output['info gathered'] }}",
					options: {
						systemMessage: 'take in this info and parse it into this json. ',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model2',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n	"task": "task",\n	"description": "description",\n  "status": "status"\n}',
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [1264, -288],
				name: 'Write Json',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							Task: '={{ $json.output.task }}',
							Status: '={{ $json.output.status }}',
							Description: '={{ $json.output.description }}',
						},
						schema: [
							{
								id: 'Task',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Task',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Description',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Task'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pbK-B-Q9p8fVjxJIsjEVrAfRgqEPCeYw8rZojZPAb84/edit#gid=0',
						cachedResultName: 'Tasks',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pbK-B-Q9p8fVjxJIsjEVrAfRgqEPCeYw8rZojZPAb84',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pbK-B-Q9p8fVjxJIsjEVrAfRgqEPCeYw8rZojZPAb84/edit?usp=drivesdk',
						cachedResultName: 'Project Manager',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1712, 160],
				name: 'Add Task',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chat',
			version: 1,
			config: {
				parameters: { message: '=Item Added', options: {}, waitUserReply: false },
				position: [2000, -288],
				name: 'Respond Complete',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chat',
			version: 1,
			config: {
				parameters: {
					message: '={{ $json.output.response }}',
					options: {},
					waitUserReply: false,
				},
				position: [992, 128],
				name: 'Get More Info',
			},
		}),
	)
	.add(
		sticky(
			'### AI Project Manager — Add Tasks to Google Sheets from Chat\n\nLet your team create, track, and manage project tasks through natural conversation.  \nThis workflow uses an **AI Project Manager Agent** that chats with users, gathers the task details it needs, and automatically adds them to a **Google Sheet**.\n',
			{ name: 'Sticky Note1', color: 7, position: [-208, -448], width: 2448, height: 1136 },
		),
	)
	.add(
		sticky(
			'## ⚙️ Setup instructions\n\n### 1. Connect OpenAI\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys) → copy your API key.  \n2. In n8n, create **New Credentials → OpenAI API** and paste your key.  \n3. Ensure your account has active billing under [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview).\n\n### 2. Connect Google Sheets (OAuth2)\n1. In **n8n → Credentials → New → Google Sheets (OAuth2)**  \n2. Sign in with your Google account and **grant access**.  \n3. Select your spreadsheet and tab (e.g., “Tasks”) when prompted.  \n   - Example sheet: `https://docs.google.com/spreadsheets/d/1pbK-B-Q9p8fVjxJIsjEVrAfRgqEPCeYw8rZojZPAb84/edit`\n\n### 3. Test your chat\nClick **Execute Workflow**, then start chatting:  \n> “Add a task for reviewing the project report tomorrow.”  \nThe agent will ask questions if needed, then add the record to your sheet.\n\n---\n\n\n\n## 📬 Contact  \nNeed help customizing this (e.g., adding deadlines, linking to Notion, or Slack notifications)?  \n\n- 📧 **robert@ynteractive.com**  \n- 🔗 **[Robert Breen](https://www.linkedin.com/in/robert-breen-29429625/)**  \n- 🌐 **[ynteractive.com](https://ynteractive.com)**  ',
			{ name: 'Sticky Note4', position: [-640, -448], width: 400, height: 1136 },
		),
	)
	.add(
		sticky(
			'### 2) Connect Google Sheets (OAuth2)\n\n1. In **n8n → Credentials → New → Google Sheets (OAuth2)**  \n2. Sign in with your Google account and **grant access**.  \n3. In your workflow’s **Google Sheets** node (e.g., *Append or Update*), select this spreadsheet and tab:  \n   - **Spreadsheet URL:** https://docs.google.com/spreadsheets/d/1pbK-B-Q9p8fVjxJIsjEVrAfRgqEPCeYw8rZojZPAb84/edit?gid=0#gid=0\n',
			{ name: 'Sticky Note64', color: 3, position: [1632, -272], width: 256, height: 656 },
		),
	)
	.add(
		sticky(
			'### 1 Set Up OpenAI Connection\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)  \n2. Navigate to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview)  \n3. Add funds to your billing account  \n4. Copy your API key into the **OpenAI credentials** in n8n  ',
			{ name: 'Sticky Note29', color: 3, position: [-48, 256], width: 288, height: 304 },
		),
	);
