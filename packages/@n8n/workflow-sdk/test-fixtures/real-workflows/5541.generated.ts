const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-540, -520], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: 'Help me test something and output the text "This is a test workflow" after calling the think tool twice.',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Think' },
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4o-mini',
									cachedResultName: 'gpt-4o-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI',
						},
					}),
				},
				position: [-260, -520],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.executeWorkflow',
			version: 1.2,
			config: {
				parameters: {
					mode: 'each',
					options: { waitForSubWorkflow: false },
					workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
					workflowInputs: {
						value: { execution_id: '={{ $execution.id }}' },
						schema: [
							{
								id: 'execution_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'execution_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['execution_id'],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
				},
				position: [200, -520],
				name: 'Call sub-workflow',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: { workflowInputs: { values: [{ name: 'execution_id' }] } },
				position: [-540, 180],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: {
					options: { activeWorkflows: true },
					resource: 'execution',
					operation: 'get',
					executionId: '={{ $json.execution_id }}',
					requestOptions: {},
				},
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [-320, 180],
				name: 'Get execution data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					include: 'selected',
					options: {},
					assignments: {
						assignments: [
							{
								id: '2e6b9daf-495c-44e3-a39e-40fc8e654eae',
								name: 'execution_id',
								type: 'number',
								value: "={{ $('When Executed by Another Workflow').item.json.execution_id }}",
							},
							{
								id: '1ba39074-c67e-453c-9a64-07e0376e64bf',
								name: 'tokenUsage',
								type: 'array',
								value:
									'={{$jmespath(\n  $json,\n  "data.resultData.runData.*[] | [?data.ai_languageModel] | [].{model: data.ai_languageModel[0][0].json.response.generations[0][0].generationInfo.model_name || inputOverride.ai_languageModel[0][0].json.options.model_name || inputOverride.ai_languageModel[0][0].json.options.model, tokenUsage: data.ai_languageModel[0][0].json.tokenUsage || data.ai_languageModel[0][0].json.tokenUsageEstimate}"\n)}}',
							},
						],
					},
					includeFields: 'workflowData.id, workflowData.name',
					includeOtherFields: true,
				},
				position: [-100, 180],
				name: 'Extract token usage data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					include: 'allOtherFields',
					options: {},
					fieldToSplitOut: 'tokenUsage',
				},
				position: [120, 180],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.summarize',
			version: 1.1,
			config: {
				parameters: {
					options: {},
					fieldsToSplitBy: 'id, name, tokenUsage.model, execution_id',
					fieldsToSummarize: {
						values: [
							{
								field: 'tokenUsage.tokenUsage.promptTokens',
								aggregation: 'sum',
							},
							{
								field: 'tokenUsage.tokenUsage.completionTokens',
								aggregation: 'sum',
							},
						],
					},
				},
				position: [320, 180],
				name: 'Sum Token Totals - aggregate by model',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							llm_model: '={{ $json.tokenUsage_model }}',
							timestamp: "={{ $now.format('yyyy-MM-dd HH:mm:ss')}}",
							workflow_id: '={{ $json.id }}',
							execution_id: '={{ $json.execution_id }}',
							'input tokens': '={{ $json.sum_tokenUsage_tokenUsage_promptTokens }}',
							workflow_name: '={{ $json.name }}',
							'completion tokens': '={{ $json.sum_tokenUsage_tokenUsage_completionTokens }}',
						},
						schema: [
							{
								id: 'execution_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'execution_id',
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
								id: 'workflow_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'workflow_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'workflow_name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'workflow_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'llm_model',
								type: 'string',
								display: true,
								required: false,
								displayName: 'llm_model',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'input tokens',
								type: 'string',
								display: true,
								required: false,
								displayName: 'input tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'completion tokens',
								type: 'string',
								display: true,
								required: false,
								displayName: 'completion tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'input price',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'input price',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'output price',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'output price',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'input cost',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'input cost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'output cost',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'output cost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total cost',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'total cost',
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
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1c9CeePI6ebNnIKogyJKHUpDWT6UEowpH9OwVtViadyE/edit#gid=0',
						cachedResultName: 'Executions',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1c9CeePI6ebNnIKogyJKHUpDWT6UEowpH9OwVtViadyE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1c9CeePI6ebNnIKogyJKHUpDWT6UEowpH9OwVtViadyE/edit?usp=drivesdk',
						cachedResultName: '[TEMPLATE] Calculate LLM Token Usage',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [540, 180],
				name: 'Record token usage',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.5-flash' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-400, -280],
				name: 'Gemini',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			version: 1.3,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-3-haiku-20240307',
						cachedResultName: 'Claude Haiku 3',
					},
					options: {},
				},
				credentials: {
					anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
				},
				position: [-240, -280],
				name: 'Anthropic',
			},
		}),
	)
	.add(
		sticky(
			"## Wait for the workflow to finish before calling the subworkflow\nIf the execution is still running, too much data is retrieved and it becomes messy.\n\nSo put this node at the end of the workflow and disable the option `Wait For Sub-Workflow Completion`.\n\nThat way you have to retrieve less data and it's easier to retrieve the token usage.\n\n`{{ $workflow.id }}` is an expression to get the current workflow id. Change this if your subworkflow is in a separate file.\n\n",
			{ color: 3, position: [60, -880], width: 380, height: 540 },
		),
	)
	.add(
		sticky(
			"After the main workflow calls the subworkflow, you'll be able to see the total tokens in the Executions spreadsheet.",
			{ name: 'Sticky Note2', color: 7, position: [-840, 160], height: 180 },
		),
	)
	.add(
		sticky(
			"## Limitations\n### 1. This workflow doesn't account for [Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)\nIf you're consecutively sending similar prompts to OpenAI it'll automatically use Cached Tokens to reduce the cost of your requests.\n\nSo our cost estimates will have a higher value than the actual cost.\n\nOther providers like Anthropic and Google have similar mechanisms.\n\n\n\n### 2. Not tested with audio or video files\nThis workflow was tested with text and images, but no tests were made with audio files or videos.\n\n\n\n### 3. The cost is an estimate\nIn the spreadsheet you can see the total cost of the requests, but that is only an estimate.\n\nIf you do batch requests, prompt caching or other techniques to reduce cost, the estimate might be higher than the actual cost.",
			{ name: 'Sticky Note1', color: 7, position: [740, -240], width: 660, height: 580 },
		),
	)
	.add(
		sticky(
			'This is an example AI Agent.\n\nUse this only to understand how to call the subworkflow and obtain the token amount.',
			{ name: 'Sticky Note3', color: 7, position: [-840, -520], height: 120 },
		),
	)
	.add(
		sticky(
			"## Where to find LLM pricing?\nYou can enter each provider's website or use one of these:\n- [llm-price.com](https://llm-price.com)\n- [llm-prices.com](https://llm-prices.com)\n- [llmprices.dev](https://llmprices.dev/)\n- [LLM Price Check](https://llmpricecheck.com/)\n- [OpenRouter Models](https://openrouter.ai/models)",
			{ name: 'Sticky Note4', color: 4, position: [-1560, -620], width: 660, height: 260 },
		),
	)
	.add(
		sticky(
			'## Make a copy of this Sheets file\n👉 [**[TEMPLATE] Calculate LLM Token Usage**](https://docs.google.com/spreadsheets/d/1c9CeePI6ebNnIKogyJKHUpDWT6UEowpH9OwVtViadyE/edit?usp=sharing)\n\nThere are two sheets in this file:\n1. Executions\nAvoid changing the green columns. They have formulas on the header rows.\n\n2. LLM Pricing\nUpdate this list with the LLM models you are using',
			{ name: 'Sticky Note5', color: 4, position: [-1560, -880], width: 660, height: 240 },
		),
	)
	.add(
		sticky(
			'# Need help?\nCreate a topic on the community forums here:\nhttps://community.n8n.io/c/questions/\n\n\nOr join our exclusive [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)  community',
			{ name: 'Sticky Note6', color: 7, position: [740, -620], width: 400, height: 200 },
		),
	)
	.add(
		sticky(
			'# Author\n![Solomon](https://gravatar.com/avatar/79aa147f090807fe0f618fb47a1de932669e385bb0c84bf3a7f891ae7d174256?r=pg&d=retro&size=200)\n### Solomon\n🎓 AI & Automation Educator at the [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)\n\nFor business inquiries:\n- automations.solomon@gmail.com\n- [Telegram](https://t.me/salomaoguilherme)\n- [LinkedIn](https://www.linkedin.com/in/guisalomao/)\n\n### Check out my other templates\n### 👉 https://n8n.io/creators/solomon/\n',
			{ name: 'Sticky Note10', color: 7, position: [-1560, -340], width: 660, height: 680 },
		),
	)
	.add(
		sticky(
			'### 💡 **Want to learn advanced n8n skills and earn money building workflows?**\n‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎Check out [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)',
			{ name: 'Sticky Note16', color: 4, position: [-1540, 240], width: 620, height: 80 },
		),
	)
	.add(
		sticky(
			"## Description\n### This n8n template demonstrates how to obtain token usage from AI Agents and places the data into a spreadsheet that calculates the estimated cost of the execution.\n\nObtaining the token usage from AI Agents is tricky, because it doesn't provide all the data from tool calls. This workflows taps into the workflow execution metadata to extract token usage information.\n\n### How it works\n- The AI Agent executes and then calls a subworkflow to calculate the token usage.\n- The data is stored in Google Sheets\n- The spreadsheet has formulas to calculate the estimated cost of the execution.\n\n### How to use\n- The AI Agent is used as an example. Feel free to replace this with other agents you have.\n- Call the subworkflow AFTER all the other branches have finished executing.\n\n### Requirements\n- LLM account (OpenAI, Gemini...) for API usage.\n- Google Drive and Sheets credentials\n- n8n API key of your instance",
			{ name: 'Sticky Note7', position: [-2280, -880], width: 700, height: 640 },
		),
	)
	.add(
		sticky(
			'Works well with all the providers above.\n\nIf you use another provider, you might need to adjust this node:\n\n`Extract token usage data`\n\nOn the below workflow 👇',
			{ name: 'Sticky Note8', color: 7, position: [-420, -160], width: 280, height: 200 },
		),
	);
