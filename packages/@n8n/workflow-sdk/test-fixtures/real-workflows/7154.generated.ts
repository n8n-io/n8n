const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-1080, 1440], name: 'Run Workflow' },
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
								id: '23fed7d1-74bb-487a-bd39-59abb02b9373',
								name: 'Topic',
								type: 'string',
								value: 'n8n use cases',
							},
						],
					},
				},
				position: [-920, 1620],
				name: 'Set Topic to Search',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=idea: {{ $json.Topic }}',
					options: {
						systemMessage:
							'You are a tool that generates structured sample data in JSON format.\n\nWhen given a topic or a description of the type of data the user needs (e.g., "marketing campaigns", "customer feedback", "blog ideas"), do the following:\n\n1. Identify 5 relevant columns that would make up a realistic dataset for the topic.\n2. Generate 3–5 realistic values for each column.\n3. Output the result in a JSON object using the following structure:\n   - Each key should be labeled as "columnX (Column Name)" where X is the column number from 1 to 5.\n   - Each value should be a list of 3–5 strings representing data for that column.\n\nDo not explain your output. Do not include anything outside the JSON.\n\nOutput 5 columns of data like this. \n\nExample format:\n{\n  "column1 (Date)": [\n    "2025-08-01",\n    "2025-08-02",\n    "2025-08-03"\n  ],\n  "column2 (Platform)": [\n    "Instagram",\n    "LinkedIn",\n    "Twitter"\n  ],\n  "column3 (Content Type)": [\n    "Image Post",\n    "Blog Link",\n    "Video Snippet"\n  ],\n  "column4 (Topic)": [\n    "Workflow Automation",\n    "AI Agent Demo",\n    "Case Study"\n  ],\n  "column5 (Owner)": [\n    "Alice",\n    "Bob",\n    "Charlie"\n  ]\n}\n\n\nMake sure the data is contextually relevant to the user\'s input.\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-520, 1020],
				name: 'Generate Random Data',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.column1' },
				position: [1100, 1020],
				name: 'Split Column 1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
					numberInputs: 5,
				},
				position: [1380, 1260],
				name: 'Merge Columns together',
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
								id: '3b6cd7c0-b2ab-48bd-9d3d-c6f577d43a32',
								name: 'column1',
								type: 'string',
								value: "={{ $('Split Column 1').item.json['output.column1'] }}",
							},
							{
								id: 'e19027d6-5ebd-43ed-922c-bb5183844875',
								name: 'column2',
								type: 'string',
								value: "={{ $('Split Column 2').item.json['output.column2'] }}",
							},
							{
								id: '81339019-9a39-4e7c-a3a1-53e7370ce7c1',
								name: 'column3',
								type: 'string',
								value: "={{ $('Split Column 3').item.json['output.column3'] }}",
							},
							{
								id: '7cfb8fa4-e25c-49e6-96dc-66da82f95882',
								name: 'column4',
								type: 'string',
								value: "={{ $('Split Column 4').item.json['output.column4'] }}",
							},
							{
								id: '3301a0dc-ff0c-42a1-8df0-e3dcafed4001',
								name: 'column5',
								type: 'string',
								value: "={{ $('Split Column 5').item.json['output.column5'] }}",
							},
						],
					},
				},
				position: [1620, 1300],
				name: 'Rename Columns',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [1840, 1680], name: 'Append Column Names' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.column2' },
				position: [920, 1120],
				name: 'Split Column 2',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.column3' },
				position: [1120, 1240],
				name: 'Split Column 3',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.column4' },
				position: [880, 1320],
				name: 'Split Column 4',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.column5' },
				position: [1100, 1480],
				name: 'Split Column 5',
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
					jsCode:
						"// Get the object from input\nconst data = $input.first().json.output;\n\n// Flatten all column values into one array\nconst allValues = Object.values(data).flat();\n\n// Join all values with commas\nconst result = allValues.join(', ');\n\n// Return the final text as a single field\nreturn [\n  {\n    json: {\n      text: result\n    }\n  }\n];\n",
				},
				position: [-120, 1260],
				name: 'Outpt all Data to One Field',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=output: {{ $json.text }}',
					options: {
						systemMessage:
							'Take the input and output relevent column names for the data. there are 5 columns. give each of them a name that makes sense for the values in the column. ',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [260, 1480],
				name: 'Generate Column Names',
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
						'const columnNames = $input.first().json.output.columnnames;\n\n// Build a single row with column1, column2, etc. as keys and names as values\nconst row = {};\n\ncolumnNames.forEach((name, index) => {\n  row[`column${index + 1}`] = name;\n});\n\nreturn [\n  { json: row }\n];\n',
				},
				position: [600, 1660],
				name: 'Pivot Column Names',
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
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-540, 1340],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolThink',
			version: 1,
			config: { position: [-440, 1520], name: 'Tool: Inject Creativity1' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "column1": [\n    "2025-08-01",\n    "2025-08-02",\n    "2025-08-03"\n  ],\n  "column2": [\n    "Instagram",\n    "LinkedIn",\n    "Twitter"\n  ],\n  "column3": [\n    "Image Post",\n    "Blog Link",\n    "Video Snippet"\n  ],\n  "column4": [\n    "Workflow Automation",\n    "AI Agent Demo",\n    "Case Study"\n  ],\n  "column5": [\n    "Alice",\n    "Bob",\n    "Charlie"\n  ]\n}\n',
				},
				position: [-300, 1320],
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
					model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [240, 1740],
				name: 'OpenAI Chat Model2',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "columnnames": [\n    "first",\n    "second",\n    "third"\n  ]\n}\n',
				},
				position: [420, 1760],
				name: 'Structured Output Parser1',
			},
		}),
	)
	.add(
		sticky(
			'### 🥇 Step 1: Setup OpenAI API Credentials\n\n1. Go to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)\n2. Click **“Create new secret key”**\n3. Copy your API key\n4. In n8n:\n   - Go to **Credentials**\n   - Click **“New Credential”**\n   - Select `OpenAI API`\n   - Paste your API key\n   - Name it something like `OpenAI account`\n\n➡️ You will use this credential in:\n- `OpenAI Chat Model1`\n- `OpenAI Chat Model2`\n\n---\n\n### 🥈 Step 2: Add a Manual Trigger Node\n\n- Type: `Manual Trigger`\n- Purpose: Starts the workflow manually for testing\n- No configuration required\n\n---\n\n### 🥉 Step 3: Set Your Topic (Set Node)\n\n- Node: `Set Topic to Search`\n- Type: `Set`\n- Add a new string field:\n  - Name: `Topic`\n  - Value: e.g., `n8n use cases`\n\nThis is the topic the workflow will generate data for.\n\n---',
			{ name: 'Sticky Note4', color: 5, position: [-1160, 540], width: 420, height: 1340 },
		),
	)
	.add(
		sticky(
			'\n### ✨ Step 4: Generate Structured Data\n- **LangChain Agent** node `Generate Random Data`\n- Connect to **OpenAI Chat Model1** and **Tool: Inject Creativity1**  \n- System prompt: instruct AI to output 5 columns of realistic values in JSON  \n\n### 🔧 Step 5: Parse AI Output\n- **Structured Output Parser** to validate JSON  \n\n### 🔄 Step 6: Flatten Data\n- **Code** node `Outpt all Data to One Field`  \n- Joins all values into a comma-separated string for column naming',
			{ name: 'Sticky Note5', color: 6, position: [-700, 540], width: 780, height: 1340 },
		),
	)
	.add(
		sticky(
			'### 🧠 Step 7: Generate Column Names\n- **LangChain Agent** `Generate Column Names`  \n- Connect to **OpenAI Chat Model2**  \n- Prompt: infer 5 column names from the string  \n\n### 🔢 Step 8: Pivot Names Row\n- **Code** node `Pivot Column Names` transforms array into `{ column1: name1, … }`\n',
			{ name: 'Sticky Note7', color: 3, position: [100, 540], width: 640, height: 1340 },
		),
	)
	.add(
		sticky(
			'### 🪓 Step 9: Split Columns\n- 5 `SplitOut` nodes to break each array back into rows per column\n\n### 🔗 Step 10: Merge Rows\n- **Merge** node `Merge Columns together` using `combineByPosition`  \n\n### 🏷️ Step 11: Rename Columns\n- **Set** node `Rename Columns` assigns the AI-generated names to each column\n\n### 🔗 Step 12: Final Output\n- **Merge** `Append Column Names` combines data and header row',
			{ name: 'Sticky Note8', color: 2, position: [760, 540], width: 1460, height: 1340 },
		),
	)
	.add(
		sticky(
			'## 📬 Need Help or Want to Customize This?\n📧 [robert@ynteractive.com](mailto:robert@ynteractive.com)  \n🔗 [LinkedIn](https://www.linkedin.com/in/robert-breen-29429625/)',
			{ name: 'Sticky Note10', position: [-1160, 340], width: 3380 },
		),
	);
