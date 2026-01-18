const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.3,
			config: { parameters: { options: {} }, position: [-1840, 1056], name: 'Chat with Your Data' },
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
							'Google Sheets Ask-YOUR_OPENAI_KEY_HERE \n\n\nYou are Ask-YOUR_OPENAI_KEY_HERE. Answer questions using Google Sheets ONLY via the tool below. Be precise and conservative. \n\nThere is only one dataset. dont ask what dataset it is. \n\nUse the data tool to answer the question.',
					},
					hasOutputParser: true,
				},
				position: [-1328, 896],
				name: 'Talk to Your Data',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 365710158,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UDWt0-Z9fHqwnSNfU3vvhSoYCFG6EG3E-ZewJC_CLq4/edit#gid=365710158',
						cachedResultName: 'Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1UDWt0-Z9fHqwnSNfU3vvhSoYCFG6EG3E-ZewJC_CLq4',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UDWt0-Z9fHqwnSNfU3vvhSoYCFG6EG3E-ZewJC_CLq4/edit?usp=drivesdk',
						cachedResultName: 'Sample Marketing Data - n8n',
					},
				},
				position: [-1248, 1536],
				name: 'Analyze Data',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: { position: [-1296, 1088], name: 'Memory' },
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
						value: 'gpt-4.1-nano',
						cachedResultName: 'gpt-4.1-nano',
					},
					options: {},
				},
				position: [-1808, 1520],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		sticky(
			"## Talk to Your Data with Google Sheets & OpenAI GPT-5 Mini\nThis n8n workflow template creates an intelligent data analysis chatbot that can answer questions about data stored in Google Sheets using OpenAI's GPT-5 Mini model. The system automatically analyzes your spreadsheet data and provides insights through natural language conversations.\n",
			{ name: 'Sticky Note2', color: 7, position: [-2064, 624], width: 1152, height: 1168 },
		),
	)
	.add(
		sticky(
			'### 3. Ask Questions of Your Data\n\nYou can ask natural language questions to analyze your marketing data, such as:\n- **Total spend** across all campaigns.\n- **Spend for Paid Search only**.\n- **Month-over-month changes** in ad spend.\n- **Top-performing campaigns** by conversion rate.\n- **Cost per lead** for each channel.',
			{ name: 'Sticky Note7', color: 7, position: [-2016, 784], width: 480, height: 432 },
		),
	)
	.add(
		sticky(
			'## 🎥 Watch This Tutorial\n\n@[youtube](qsrVPdo6svc)\n\n\n### 1. Set Up OpenAI Connection\n\n#### Get Your API Key\n1. Visit the [OpenAI API Keys](https://platform.openai.com/api-keys) page.\n2. Go to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview).\n3. Add funds to your billing account.\n4. Copy your API key into your **OpenAI credentials** in n8n (or your chosen platform).\n\n---\n### 2. Prepare Your Google Sheet\n\n#### Connect Your Data in Google Sheets\n- Data must follow this format: [Sample Marketing Data](https://docs.google.com/spreadsheets/d/1UDWt0-Z9fHqwnSNfU3vvhSoYCFG6EG3E-ZewJC_CLq4/edit?gid=365710158#gid=365710158)\n- **First row** contains column names.\n- Data should be in **rows 2–100**.\n- Log in using **OAuth**, then select your workbook and sheet.\n\n---\n### 3. Ask Questions of Your Data\n\nYou can ask natural language questions to analyze your marketing data, such as:\n- **Total spend** across all campaigns.\n- **Spend for Paid Search only**.\n- **Month-over-month changes** in ad spend.\n- **Top-performing campaigns** by conversion rate.\n- **Cost per lead** for each channel.\n\n---\n## 📬 Need Help or Want to Customize This?\n📧 [rbreen@ynteractive.com](mailto:rbreen@ynteractive.com)  \n🔗 [LinkedIn](https://www.linkedin.com/in/robert-breen-29429625/)\n\n',
			{ name: 'Sticky Note8', position: [-2624, 624], width: 528, height: 1168 },
		),
	)
	.add(
		sticky(
			'### 1. Set Up OpenAI Connection\n\n#### Get API Key:\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)\n1. Go to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview)\n2. Add funds to your billing account & copy your api key into the openAI credentials\n',
			{ name: 'Sticky Note9', color: 3, position: [-2016, 1264], width: 480, height: 432 },
		),
	)
	.add(
		sticky(
			'### 2. Prepare Your Google Sheet\n\n#### Connect your Data in Google Sheets\n- Data must be in a format similar to this: [Sample Marketing Data](https://docs.google.com/spreadsheets/d/1UDWt0-Z9fHqwnSNfU3vvhSoYCFG6EG3E-ZewJC_CLq4/edit?gid=365710158#gid=365710158)\n- First row contains column names\n- Data in rows 2-100\n- Log in with OAuth2 and choose your workbook and sheet\n- Optional: Try connecting to Airtable, Notion or your Database',
			{ name: 'Sticky Note10', color: 3, position: [-1472, 1264], width: 512, height: 432 },
		),
	)
	.add(sticky('', { color: 7, position: [-1472, 784], width: 512, height: 432 }));
