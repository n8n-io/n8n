const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Survey',
					formFields: {
						values: [
							{ fieldLabel: 'Name' },
							{ fieldLabel: 'Q1: Where did you learn about n8n?' },
							{
								fieldType: 'dropdown',
								fieldLabel: 'Q2: What is your experience with n8n?',
								fieldOptions: {
									values: [
										{ option: 'Beginner' },
										{ option: 'Intermediate' },
										{ option: 'Advanced' },
									],
								},
							},
							{
								fieldLabel: 'Q3: What kind of automations do you need help with?',
							},
						],
					},
					responseMode: 'lastNode',
				},
				position: [1600, 208],
				name: 'Survey Submission',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.dataTable',
			version: 1,
			config: {
				parameters: {
					columns: {
						value: {
							Q1: '={{ $json["Q1: Where did you learn about n8n?"] }}',
							Q2: '={{ $json["Q2: What is your experience with n8n?"] }}',
							Q3: '={{ $json["Q3: What kind of automations do you need help with?"] }}',
							Name: '={{ $json.Name }}',
						},
						schema: [
							{
								id: 'Name',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Name',
								defaultMatch: false,
							},
							{
								id: 'Q1',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Q1',
								defaultMatch: false,
							},
							{
								id: 'Q2',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Q2',
								defaultMatch: false,
							},
							{
								id: 'Q3',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Q3',
								defaultMatch: false,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					filters: {
						conditions: [{ keyName: 'Name', keyValue: '={{ $json.Name }}' }],
					},
					operation: 'upsert',
					dataTableId: {
						__rl: true,
						mode: 'list',
						value: 'OQV4v3sGHFOgIdi1',
						cachedResultUrl: '/projects/hQhYsbYCXUcQaMSY/datatables/OQV4v3sGHFOgIdi1',
						cachedResultName: 'Survey Responses',
					},
				},
				position: [2048, 288],
				name: 'Store Survey Result',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: { mode: 'combine', options: {}, combineBy: 'combineAll' },
				position: [2704, 208],
				name: 'Combine Results',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=Q1: Where did you learn about n8n?  {{ $(\'Survey Submission\').item.json["Q1: Where did you learn about n8n?"] }}\nQ2: What is your experience with n8n? {{ $(\'Survey Submission\').item.json["Q2: What is your experience with n8n?"] }}\nQ3: What kind of automations do you need help with? {{ $(\'Survey Submission\').item.json["Q3: What kind of automations do you need help with?"] }}\n\nCourses: {{ $json["Available Courses"] }}',
					options: {
						systemMessage:
							'You are taking in survey responses. Compare their input, and pick the best course for them to take. \n\n\noutput like this. \n\n{\n	"course": "recommended course excact name",\n	"reasoning": "reasoning",\n    "url": "url"\n}',
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
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n	"course": "recommended course excact name",\n	"reasoning": "reasoning",\n    "url": "url"\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [2960, 0],
				name: 'Choose Best Course',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					operation: 'completion',
					respondWith: 'showText',
					responseText:
						'=<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Course Recommendation</title>\n  <style>\n    body {\n      font-family: Arial, sans-serif;\n      margin: 40px;\n      background-color: #f9f9f9;\n      color: #333;\n    }\n    .container {\n      background: #fff;\n      padding: 20px 30px;\n      border-radius: 10px;\n      box-shadow: 0 4px 12px rgba(0,0,0,0.1);\n      max-width: 600px;\n      margin: auto;\n    }\n    h1 {\n      color: #0066cc;\n    }\n    a {\n      color: #0066cc;\n      text-decoration: none;\n      font-weight: bold;\n    }\n    .reasoning {\n      margin-top: 20px;\n      font-style: italic;\n    }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <h1>Recommended Course</h1>\n    <p>\n      We recommend the following course:\n      <strong>{{ $json.output.course }}</strong>\n    </p>\n    <p>\n      You can view it here:\n      <a href="{{ $json.output.url }}" target="_blank">{{ $json.output.url }}</a>\n    </p>\n    <div class="reasoning">\n      <p>Reasoning: {{ $json.output.reasoning }}</p>\n    </div>\n  </div>\n</body>\n</html>\n',
				},
				position: [3392, 16],
				name: 'Form',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.dataTable',
			version: 1,
			config: {
				parameters: {
					operation: 'get',
					dataTableId: {
						__rl: true,
						mode: 'list',
						value: 'Sf4Q1kD2R6v17c7A',
						cachedResultUrl: '/projects/hQhYsbYCXUcQaMSY/datatables/Sf4Q1kD2R6v17c7A',
						cachedResultName: 'Courses',
					},
				},
				position: [2048, 1024],
				name: 'Get Available Courses',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [2368, 912],
				name: 'Aggregate Courses',
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
								id: 'b12a41cb-5aaa-4a47-91c8-856a3970e3e1',
								name: 'Available Courses',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [2592, 592],
				name: 'Convert to Text',
			},
		}),
	)
	.add(
		sticky(
			'### Recommend the Best n8n Course from a User Survey (Form Trigger + **Data Tables** + OpenAI Agent)\n\nUse the **n8n Data Tables** feature to store, retrieve, and analyze survey results — then let OpenAI automatically recommend the most relevant course for each respondent.\n\n',
			{ name: 'Sticky Note55', color: 7, position: [1520, -464], width: 2272, height: 1808 },
		),
	)
	.add(
		sticky(
			'### Recommend the Best n8n Course from a User Survey (Form Trigger + **Data Tables** + OpenAI Agent)\n\n@[youtube](lFbjJAcWII8)\n\n\n## ⚙️ How to set it up\n### 1️⃣ Create your **n8n Data Tables**\nThis workflow uses **two Data Tables** — both created directly inside n8n.\n\n#### 🧾 Table 1: `Survey Responses`\nColumns:\n- `Name`\n- `Q1` — Where did you learn about n8n?\n- `Q2` — What is your experience with n8n?\n- `Q3` — What kind of automations do you need help with?\n\nTo create:\n1. Add a **Data Table node** to your workflow.  \n2. From the list, click **“Create New Data Table.”**  \n3. Name it **Survey Responses** and add the columns above.\n\n---\n\n#### 📚 Table 2: `Courses`\nColumns:\n- `Course`\n- `Description`\n\nTo create:\n1. Add another **Data Table node**.  \n2. Click **“Create New Data Table.”**  \n3. Name it **Courses** and create the columns above.  \n4. Copy course data from this Google Sheet:  \n   👉 https://docs.google.com/spreadsheets/d/1Y0Q0CnqN0w47c5nCpbA1O3sn0mQaKXPhql2Bc1UeiFY/edit?usp=sharing\n\nThis **Courses Data Table** is where you’ll store all available learning paths or programs for the AI to compare against survey inputs.\n\n---\n\n### 2️⃣ Connect OpenAI\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)  \n2. Create an API key  \n3. In n8n, open **Credentials → OpenAI API** and paste your key  \n4. The workflow uses the **gpt-4.1-mini** model via the LangChain integration\n\n## 📬 Contact  \nNeed help customizing this (e.g., expanding Data Tables, connecting multiple surveys, or automating follow-ups)?  \n\n- 📧 **robert@ynteractive.com**  \n- 🔗 **[Robert Breen](https://www.linkedin.com/in/robert-breen-29429625/)**  \n- 🌐 **[ynteractive.com](https://ynteractive.com)**\n',
			{ name: 'Sticky Note9', position: [1072, -464], width: 400, height: 1792 },
		),
	)
	.add(
		sticky(
			'#### 📚 Table 2: `Courses`\nColumns:\n- `Course`\n- `Description`\n\nTo create:\n1. Add another **Data Table node**.  \n2. Click **“Create New Data Table.”**  \n3. Name it **Courses** and create the columns above.  \n4. Copy course data from this Google Sheet:  \n   👉 https://docs.google.com/spreadsheets/d/1Y0Q0CnqN0w47c5nCpbA1O3sn0mQaKXPhql2Bc1UeiFY/edit?usp=sharing\n\nThis **Courses Data Table** is where you’ll store all available learning paths or programs for the AI to compare against survey inputs.',
			{ name: 'Sticky Note61', color: 3, position: [1952, 512], width: 288, height: 688 },
		),
	)
	.add(
		sticky(
			'#### 🧾 Table 1: `Survey Responses`\nColumns:\n- `Name`\n- `Q1` — Where did you learn about n8n?\n- `Q2` — What is your experience with n8n?\n- `Q3` — What kind of automations do you need help with?\n\nTo create:\n1. Add a **Data Table node** to your workflow.  \n2. From the list, click **“Create New Data Table.”**  \n3. Name it **Survey Responses** and add the columns above.\n',
			{ name: 'Sticky Note63', color: 3, position: [1952, -128], width: 288, height: 560 },
		),
	)
	.add(
		sticky(
			'### 2️⃣ Set Up OpenAI Connection\n1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)  \n2. Navigate to [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview)  \n3. Add funds to your billing account  \n4. Copy your API key into the **OpenAI credentials** in n8n  ',
			{ name: 'Sticky Note31', color: 3, position: [2960, 432], width: 288, height: 304 },
		),
	);
