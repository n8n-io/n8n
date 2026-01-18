const wf = workflow(
	'CWailec0QgZyOq0o',
	'Create Structured Ebooks in Minutes with Google Gemini Flash 2.0 & n8n',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-720, 0], name: 'When clicking ‘Execute workflow’' },
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
								id: '52ddafbb-536f-45d6-9697-7ddf5b9b3869',
								name: 'Title',
								type: 'string',
								value: 'Provide me n8n beginners guide with chapters and high-level steps',
							},
						],
					},
				},
				position: [-500, 0],
				name: 'Set the Input Fields',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.Title }}\n\nMake sure to output as JSON',
					batching: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-320, 0],
				name: 'Ebook Thought Creation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode: 'return $input.first().json.output.structure.chapters',
				},
				position: [40, 0],
				name: 'Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [360, 0], name: 'Loop Over Items' },
		}),
	)
	.output(1)
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
								id: '39e1aa01-fca1-4226-9b21-85bd4c2c5d5a',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '21b8a776-9c14-41c4-8a54-7b8f67002842',
								name: 'objectives',
								type: 'string',
								value: '={{ $json.objectives.toJsonString() }}',
							},
						],
					},
				},
				position: [700, 20],
				name: 'Set the title, objective',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '=Provide a detailed chapter explanation for the following\n\nTitle : {{ $json.title }}\nObjective : \n{{ $json.objectives }}\n',
					batching: {},
					promptType: 'define',
				},
				position: [920, 20],
				name: 'Generate Detailed Chapter Content',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					title: "={{ $('Set the title, objective').item.json.title }}",
					folderId: 'default',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
				},
				position: [1320, 20],
				name: 'Create a Google Doc',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					actionsUi: {
						actionFields: [
							{
								text: "={{ $('Generate Detailed Chapter Content').item.json.text }}",
								action: 'insert',
							},
						],
					},
					operation: 'update',
					documentURL: '={{ $json.id }}',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
				},
				position: [1540, 20],
				name: 'Update Google Docs',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash-exp' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [940, 240],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash-exp' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-320, 220],
				name: 'Google Gemini Chat Model for Ebook thought creation',
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
						'{\n  "$schema": "http://json-schema.org/schema#",\n  "title": "Guide Schema",\n  "type": "object",\n  "properties": {\n    "type": {\n      "type": "string"\n    },\n    "version": {\n      "type": "string"\n    },\n    "metadata": {\n      "type": "object",\n      "properties": {\n        "title": { "type": "string" },\n        "description": { "type": "string" },\n        "audience": { "type": "string" },\n        "author": { "type": "string" },\n        "category": { "type": "string" }\n      },\n      "required": ["title", "description", "audience", "author", "category"]\n    },\n    "structure": {\n      "type": "object",\n      "properties": {\n        "chapters": {\n          "type": "array",\n          "items": {\n            "type": "object",\n            "properties": {\n              "chapterNumber": { "type": "integer" },\n              "title": { "type": "string" },\n              "objectives": {\n                "type": "array",\n                "items": { "type": "string" }\n              }\n            },\n            "required": ["chapterNumber", "title", "objectives"]\n          }\n        }\n      },\n      "required": ["chapters"]\n    }\n  },\n  "required": ["type", "version", "metadata", "structure"]\n}\n',
				},
				position: [-140, 220],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(sticky('## Step 1\n\nSet the input field with the "Title"', { position: [200, -320] }))
	.add(
		sticky('## Step 2\n\nSet the Google Gemini Credentials as part of the LLM data extraction', {
			name: 'Sticky Note1',
			position: [460, -320],
		}),
	)
	.add(
		sticky(
			'## Ebook creation with Google Gemini\n\nEbook creation with Google Gemini. Export the clean data to Google Document.',
			{ name: 'Sticky Note2', color: 6, position: [-360, -400], width: 540, height: 240 },
		),
	)
	.add(
		sticky('## Step 3\n\nSet the Google Document Credentials for the data export', {
			name: 'Sticky Note3',
			position: [720, -320],
		}),
	)
	.add(
		sticky('## Ebook Detailed Chapter Creation', {
			name: 'Sticky Note4',
			color: 5,
			position: [200, -140],
			width: 1060,
			height: 520,
		}),
	)
	.add(
		sticky('## LLM Usages\n\nGoogle Gemini -> Gemini 2.0 Flash Exp Model', {
			name: 'Sticky Note5',
			color: 3,
			position: [-360, -140],
			width: 540,
			height: 120,
		}),
	);
