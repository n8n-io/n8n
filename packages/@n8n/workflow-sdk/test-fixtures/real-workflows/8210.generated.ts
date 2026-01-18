const wf = workflow(
	'MGxb1ugenLCp7pGW',
	'AI content summarization from URLs, text, and PDFs using OpenAI and n8n',
	{
		callerPolicy: 'workflowsFromSameOwner',
		errorWorkflow: 'tKU8rgsN4cH2Mv9F',
		executionOrder: 'v1',
	},
)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: 'webhook-url',
					options: { rawBody: true },
					responseMode: 'responseNode',
				},
				position: [-1344, 1040],
				name: 'Initial Trigger',
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
								name: 'input_type',
								type: 'string',
								value: "={{ $json.query.input_type || $json.body.input_type || 'url' }}",
							},
							{
								name: 'url',
								type: 'string',
								value: "={{ $json.query.url || $json.body.url || '' }}",
							},
							{
								name: 'text_content',
								type: 'string',
								value: "={{ $json.query.text_content || $json.body.text_content || '' }}",
							},
							{
								name: 'summary_length',
								type: 'string',
								value:
									"={{ $json.query.summary_length || $json.body.summary_length || 'standard' }}",
							},
							{
								name: 'focus',
								type: 'string',
								value: "={{ $json.query.focus || $json.body.focus || 'key_points' }}",
							},
							{
								name: 'language',
								type: 'string',
								value: "={{ $json.query.language || $json.body.language || 'english' }}",
							},
							{
								name: 'file_content',
								type: 'string',
								value: "={{ $json.query.file_content || $json.body.file_content || '' }}",
							},
						],
					},
				},
				position: [-1120, 1040],
				name: 'Parse Input Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'url',
								conditions: {
									options: {
										version: 1,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'f2e4855a-2828-4ade-94ac-f06a9e795d54',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.input_type }}',
											rightValue: '={{ "url" }}',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'text',
								conditions: {
									options: {
										version: 1,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									conditions: [
										{
											id: '3a855f49-b559-4ef4-a94e-e7b2dfab3057',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.input_type }}',
											rightValue: '={{ "text" }}',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'file',
								conditions: {
									options: {
										version: 1,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									conditions: [
										{
											id: '0be44b08-67ca-4b5c-9ec1-24ca112fbd53',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.input_type }}',
											rightValue: '={{ "file" }}',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [-944, 1024],
				name: 'Input Type Switch',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.url }}', options: {} },
				position: [-288, 960],
				name: 'Fetch URL Content',
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
								id: '80a0f7dc-ee66-4499-ac84-1e21fca8e6c7',
								name: 'raw_content',
								type: 'string',
								value:
									"={{ $json.raw_content || $json.data || $json.text || $json.text_content || $json.ParsedResults?.[0]?.ParsedText || '' }}",
							},
						],
					},
				},
				position: [448, 1040],
				name: 'Clean & Format Content',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Summarize: {{ $json.raw_content }}',
					options: {
						systemMessage:
							"=Current date and time {{ $now }}\n\nYou are an expert content summarizer. \nCreate a {{ $('Parse Input Parameters').item.json.summary_length === 'brief' ? '**brief** (2-3 sentences)' : $('Parse Input Parameters').item.json.summary_length === 'detailed' ? '**detailed** (2-3 paragraphs)' : '**standard** (1 paragraph)' }} summary in markdown format.\n\n**Focus**: \n{{ $('Parse Input Parameters').item.json.focus === 'numbers_data' \n    ? 'Extract key **numbers**, **percentages**, and quantitative data' \n    : $('Parse Input Parameters').item.json.focus === 'conclusions' \n    ? 'Highlight main **conclusions** and findings' \n    : $('Parse Input Parameters').item.json.focus === 'action_items' \n    ? 'List concrete **action items** and recommendations' \n    : 'Capture essential **key points** and main themes' }}\n\n**Formatting Guidelines:**\n- Use **bold** for key terms and important information\n- Use *italics* for emphasis\n- Use bullet points (- ) for lists\n- Use ## for section headers when appropriate\n- Lead with the most important information\n- Include specific details that support main points\n- Ensure the summary is complete and stands alone\n\n**Language**: \n{{ $('Parse Input Parameters').item.json.language === 'spanish' \n    ? 'Spanish' \n    : $('Parse Input Parameters').item.json.language === 'french' \n    ? 'French' \n    : $('Parse Input Parameters').item.json.language === 'german' \n    ? 'German' \n    : 'English' }}\n\nContent: {{ $json.raw_content }}\n",
					},
					promptType: 'define',
				},
				position: [672, 1040],
				name: 'Generate AI Summary (Unified)',
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
								name: 'content',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [1024, 1040],
				name: 'Structure Final Output',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [1248, 1040],
				name: 'Return Summary Response',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.file_content }}', options: {} },
				position: [-608, 1296],
				name: 'Fetch PDF File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [-464, 1296],
				name: 'Extract From File',
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
								id: '88a7fc31-aac6-4e2f-899e-c250feef5f10',
								operator: { type: 'string', operation: 'empty' },
								leftValue: '={{ $json.text }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-320, 1296],
				name: 'Check If Extracted Text Empty',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: {
				parameters: {
					functionCode:
						"const lang = $json.language?.toLowerCase() || 'english';\nlet code = 'eng';\nif (lang.includes('spanish')) code = 'spa';\nelse if (lang.includes('french')) code = 'fra';\nelse if (lang.includes('german')) code = 'ger';\nreturn { json: { language_code: code } };",
				},
				position: [16, 1344],
				name: 'Map Language Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ocr.space/parse/image',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'language', value: '={{ $json.language_code }}' },
							{ name: 'isOverlayRequired', value: 'false' },
							{ name: 'file', parameterType: 'formBinaryData' },
						],
					},
					headerParameters: { parameters: [{ name: 'apikey', value: 'YOUR_OCR_API_KEY' }] },
				},
				position: [176, 1344],
				name: 'OCR.Space',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '7e7f989c-cbf9-4d21-87e3-d85f1bff6649',
					options: { rawBody: true },
					responseMode: 'responseNode',
					authentication: 'headerAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-1328, 1664],
				name: 'summarize-url',
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
								name: 'input_type',
								type: 'string',
								value: "={{ $json.query.input_type || $json.body.input_type || 'url' }}",
							},
							{
								name: 'url',
								type: 'string',
								value: "={{ $json.query.url || $json.body.url || '' }}",
							},
							{
								name: 'text_content',
								type: 'string',
								value: "={{ $json.query.text_content || $json.body.text_content || '' }}",
							},
							{
								name: 'summary_length',
								type: 'string',
								value:
									"={{ $json.query.summary_length || $json.body.summary_length || 'standard' }}",
							},
							{
								name: 'focus',
								type: 'string',
								value: "={{ $json.query.focus || $json.body.focus || 'key_points' }}",
							},
							{
								name: 'language',
								type: 'string',
								value: "={{ $json.query.language || $json.body.language || 'english' }}",
							},
							{
								name: 'file_content',
								type: 'string',
								value: "={{ $json.query.file_content || $json.body.file_content || '' }}",
							},
						],
					},
				},
				position: [-1104, 1664],
				name: 'Extract URL Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.url }}', options: {} },
				position: [-880, 1664],
				name: 'Scrape Web Page Content',
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
								id: '80a0f7dc-ee66-4499-ac84-1e21fca8e6c7',
								name: 'raw_content',
								type: 'string',
								value:
									"={{ $json.raw_content || $json.data || $json.text || $json.text_content || $json.ParsedResults?.[0]?.ParsedText || '' }}",
							},
						],
					},
				},
				position: [-656, 1664],
				name: 'Clean Scraped Content',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Summarize: {{ $json.raw_content }}',
					options: {
						systemMessage:
							"=Current date and time {{ $now }}\n\nYou are an expert content summarizer. \nCreate a {{ $('Extract URL Parameters').item.json.summary_length === 'brief' ? '**brief** (2-3 sentences)' : $('Extract URL Parameters').item.json.summary_length === 'detailed' ? '**detailed** (2-3 paragraphs)' : '**standard** (1 paragraph)' }} summary in markdown format.\n\n**Focus**: \n{{ $('Extract URL Parameters').item.json.focus === 'numbers_data' \n    ? 'Extract key **numbers**, **percentages**, and quantitative data' \n    : $('Extract URL Parameters').item.json.focus === 'conclusions' \n    ? 'Highlight main **conclusions** and findings' \n    : $('Extract URL Parameters').item.json.focus === 'action_items' \n    ? 'List concrete **action items** and recommendations' \n    : 'Capture essential **key points** and main themes' }}\n\n**Formatting Guidelines:**\n- Use **bold** for key terms and important information\n- Use *italics* for emphasis\n- Use bullet points (- ) for lists\n- Use ## for section headers when appropriate\n- Lead with the most important information\n- Include specific details that support main points\n- Ensure the summary is complete and stands alone\n\n**Language**: \n{{ $('Extract URL Parameters').item.json.language === 'spanish' \n    ? 'Spanish' \n    : $('Extract URL Parameters').item.json.language === 'french' \n    ? 'French' \n    : $('Extract URL Parameters').item.json.language === 'german' \n    ? 'German' \n    : 'English' }}\n\nContent: {{ $json.raw_content }}\n",
					},
					promptType: 'define',
				},
				position: [-432, 1664],
				name: 'Summarize URL Content',
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
								name: 'content',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [-80, 1664],
				name: 'Format URL Summary',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [144, 1664],
				name: 'Return URL Summary',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '7fd2e79d-a18a-4b4f-a161-ca2bf060c891',
					options: { rawBody: true },
					responseMode: 'responseNode',
					authentication: 'headerAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-1312, 2192],
				name: 'summarize-text',
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
								name: 'input_type',
								type: 'string',
								value: "={{ $json.query.input_type || $json.body.input_type || 'url' }}",
							},
							{
								name: 'url',
								type: 'string',
								value: "={{ $json.query.url || $json.body.url || '' }}",
							},
							{
								name: 'text_content',
								type: 'string',
								value: "={{ $json.query.text_content || $json.body.text_content || '' }}",
							},
							{
								name: 'summary_length',
								type: 'string',
								value:
									"={{ $json.query.summary_length || $json.body.summary_length || 'standard' }}",
							},
							{
								name: 'focus',
								type: 'string',
								value: "={{ $json.query.focus || $json.body.focus || 'key_points' }}",
							},
							{
								name: 'language',
								type: 'string',
								value: "={{ $json.query.language || $json.body.language || 'english' }}",
							},
							{
								name: 'file_content',
								type: 'string',
								value: "={{ $json.query.file_content || $json.body.file_content || '' }}",
							},
						],
					},
				},
				position: [-1088, 2192],
				name: 'Extract Text Parameters',
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
								id: '80a0f7dc-ee66-4499-ac84-1e21fca8e6c7',
								name: 'raw_content',
								type: 'string',
								value:
									"={{ $json.raw_content || $json.data || $json.text || $json.text_content || $json.ParsedResults?.[0]?.ParsedText || '' }}",
							},
						],
					},
				},
				position: [-864, 2192],
				name: 'Process Raw Text Input',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Summarize: {{ $json.raw_content }}',
					options: {
						systemMessage:
							"=Current date and time {{ $now }}\n\nYou are an expert content summarizer. \nCreate a {{ $('Extract Text Parameters').item.json.summary_length === 'brief' ? '**brief** (2-3 sentences)' : $('Extract Text Parameters').item.json.summary_length === 'detailed' ? '**detailed** (2-3 paragraphs)' : '**standard** (1 paragraph)' }} summary in markdown format.\n\n**Focus**: \n{{ $('Extract Text Parameters').item.json.focus === 'numbers_data' \n    ? 'Extract key **numbers**, **percentages**, and quantitative data' \n    : $('Extract Text Parameters').item.json.focus === 'conclusions' \n    ? 'Highlight main **conclusions** and findings' \n    : $('Extract Text Parameters').item.json.focus === 'action_items' \n    ? 'List concrete **action items** and recommendations' \n    : 'Capture essential **key points** and main themes' }}\n\n**Formatting Guidelines:**\n- Use **bold** for key terms and important information\n- Use *italics* for emphasis\n- Use bullet points (- ) for lists\n- Use ## for section headers when appropriate\n- Lead with the most important information\n- Include specific details that support main points\n- Ensure the summary is complete and stands alone\n\n**Language**: \n{{ $('Extract Text Parameters').item.json.language === 'spanish' \n    ? 'Spanish' \n    : $('Extract Text Parameters').item.json.language === 'french' \n    ? 'French' \n    : $('Extract Text Parameters').item.json.language === 'german' \n    ? 'German' \n    : 'English' }}\n\nContent: {{ $json.raw_content }}\n",
					},
					promptType: 'define',
				},
				position: [-640, 2192],
				name: 'Summarize Text Input',
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
								name: 'content',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [-288, 2192],
				name: 'Format Text Summary',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [-64, 2192],
				name: 'Return Text Summary',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '6e8000d4-56cb-457a-9dfe-5961a75b342f',
					options: { rawBody: true },
					responseMode: 'responseNode',
					authentication: 'headerAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-1312, 2800],
				name: 'summarize-file',
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
								name: 'input_type',
								type: 'string',
								value: "={{ $json.query.input_type || $json.body.input_type || 'url' }}",
							},
							{
								name: 'url',
								type: 'string',
								value: "={{ $json.query.url || $json.body.url || '' }}",
							},
							{
								name: 'text_content',
								type: 'string',
								value: "={{ $json.query.text_content || $json.body.text_content || '' }}",
							},
							{
								name: 'summary_length',
								type: 'string',
								value:
									"={{ $json.query.summary_length || $json.body.summary_length || 'standard' }}",
							},
							{
								name: 'focus',
								type: 'string',
								value: "={{ $json.query.focus || $json.body.focus || 'key_points' }}",
							},
							{
								name: 'language',
								type: 'string',
								value: "={{ $json.query.language || $json.body.language || 'english' }}",
							},
							{
								name: 'file_content',
								type: 'string',
								value: "={{ $json.query.file_content || $json.body.file_content || '' }}",
							},
						],
					},
				},
				position: [-1088, 2800],
				name: 'Extract File Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.file_content }}', options: {} },
				position: [-864, 2800],
				name: 'Download PDF File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [-640, 2800],
				name: 'Extract Text from PDF',
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
								id: '88a7fc31-aac6-4e2f-899e-c250feef5f10',
								operator: { type: 'string', operation: 'empty' },
								leftValue: '={{ $json.text }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-416, 2800],
				name: 'Check PDF Text Extraction',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: {
				parameters: {
					functionCode:
						"const lang = $json.language?.toLowerCase() || 'english';\nlet code = 'eng';\nif (lang.includes('spanish')) code = 'spa';\nelse if (lang.includes('french')) code = 'fra';\nelse if (lang.includes('german')) code = 'ger';\nreturn { json: { language_code: code } };",
				},
				position: [-192, 2624],
				name: 'Map OCR Language Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ocr.space/parse/image',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'language', value: '={{ $json.language_code }}' },
							{ name: 'isOverlayRequired', value: 'false' },
							{ name: 'file', parameterType: 'formBinaryData' },
						],
					},
					headerParameters: { parameters: [{ name: 'apikey', value: 'YOUR_OCR_API_KEY' }] },
				},
				position: [-32, 2624],
				name: 'OCR Fallback Processing',
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
								id: '80a0f7dc-ee66-4499-ac84-1e21fca8e6c7',
								name: 'raw_content',
								type: 'string',
								value:
									"={{ $json.raw_content || $json.data || $json.text || $json.text_content || $json.ParsedResults?.[0]?.ParsedText || '' }}",
							},
						],
					},
				},
				position: [160, 2816],
				name: 'Process Extracted Text',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Summarize: {{ $json.raw_content }}',
					options: {
						systemMessage:
							"=Current date and time {{ $now }}\n\nYou are an expert content summarizer. \nCreate a {{ $('Extract File Parameters').item.json.summary_length === 'brief' ? '**brief** (2-3 sentences)' : $('Extract File Parameters').item.json.summary_length === 'detailed' ? '**detailed** (2-3 paragraphs)' : '**standard** (1 paragraph)' }} summary in markdown format.\n\n**Focus**: \n{{ $('Extract File Parameters').item.json.focus === 'numbers_data' \n    ? 'Extract key **numbers**, **percentages**, and quantitative data' \n    : $('Extract File Parameters').item.json.focus === 'conclusions' \n    ? 'Highlight main **conclusions** and findings' \n    : $('Extract File Parameters').item.json.focus === 'action_items' \n    ? 'List concrete **action items** and recommendations' \n    : 'Capture essential **key points** and main themes' }}\n\n**Formatting Guidelines:**\n- Use **bold** for key terms and important information\n- Use *italics* for emphasis\n- Use bullet points (- ) for lists\n- Use ## for section headers when appropriate\n- Lead with the most important information\n- Include specific details that support main points\n- Ensure the summary is complete and stands alone\n\n**Language**: \n{{ $('Extract File Parameters').item.json.language === 'spanish' \n    ? 'Spanish' \n    : $('Extract File Parameters').item.json.language === 'french' \n    ? 'French' \n    : $('Extract File Parameters').item.json.language === 'german' \n    ? 'German' \n    : 'English' }}\n\nContent: {{ $json.raw_content }}\n",
					},
					promptType: 'define',
				},
				position: [480, 2800],
				name: 'Summarize PDF Content',
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
								name: 'content',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [832, 2800],
				name: 'Format PDF Summary',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [1056, 2800],
				name: 'Return PDF Summary',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [1248, 1040],
				name: 'Return Summary Response',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [144, 1664],
				name: 'Return URL Summary',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [-64, 2192],
				name: 'Return Text Summary',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.content }}',
				},
				position: [1056, 2800],
				name: 'Return PDF Summary',
			},
		}),
	)
	.add(
		node({
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
				position: [752, 1264],
				name: 'OpenAI GPT-4.1 (Unified)',
			},
		}),
	)
	.add(
		node({
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
				position: [-368, 1888],
				name: 'OpenAI GPT-4.1 (URL)',
			},
		}),
	)
	.add(
		node({
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
				position: [-640, 2400],
				name: 'OpenAI GPT-4.1 (Text)',
			},
		}),
	)
	.add(
		node({
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
				position: [560, 3024],
				name: 'OpenAI GPT-4.1 (PDF)',
			},
		}),
	)
	.add(
		sticky('# Summarize a PDF file', { color: 5, position: [-1824, 2800], width: 400, height: 96 }),
	)
	.add(
		sticky('# Summarize text', {
			name: 'Sticky Note1',
			color: 5,
			position: [-1824, 2224],
			width: 384,
			height: 80,
		}),
	)
	.add(
		sticky('# Summarize URL', {
			name: 'Sticky Note2',
			color: 5,
			position: [-1808, 1680],
			width: 384,
			height: 80,
		}),
	)
	.add(
		sticky('# Summarize All in One', {
			name: 'Sticky Note3',
			color: 5,
			position: [-1824, 1024],
			width: 400,
			height: 80,
		}),
	)
	.add(
		sticky(
			'# AI Content Summarizer Suite\n\nThis n8n template collection demonstrates how to build a comprehensive AI-powered content summarization system that handles multiple input types: URLs, raw text, and PDF files. Built as 4 separate workflows for maximum flexibility.\nUse cases: Research workflows, content curation, document processing, meeting prep, social media content creation, or integrating smart summarization into any app or platform.\n\n## How it works\n- Multi-input handling: Separate workflows for URLs (web scraping), direct text input, and PDF file processing\n- Smart PDF processing: Attempts text extraction first, falls back to OCR.Space for image-based PDFs\n- AI summarization: Uses OpenAI\'s GPT-4.1-mini with customizable length (brief/standard/detailed) and focus areas (key points/numbers/conclusions/action items)\n- Language support: Multi-language summaries with automatic language detection\n- Flexible output: Returns clean markdown-formatted summaries via webhook responses\n- Unified option: The all-in-one workflow automatically detects input type and routes accordingly\n\n## How to use\n1. Replace webhook triggers with your preferred method (manual, form, API endpoint)\n2. Each workflow accepts different parameters: URL, text content, or file upload\n3. Customize summary length and focus in the AI prompt nodes\nAuthentication is optional - switch to "none" if running internally\n4. Perfect for integration with Bubble, Zapier, or any platform that can make HTTP requests\n\n## Requirements\n- OpenAI API key or OpenRouter Keys\n- OCR.Space API key (for PDF fallback processing)\n- n8n instance (cloud or self-hosted)\n- Any platform that can make HTTP requests.\n\n## Setup Steps\n1. Replace "Dummy OpenAI" with your OpenAI credentials\n2. Add your OCR.Space API key in the OCR nodes is not mandatory.\n3. Update webhook authentication as needed\n4. Test each workflow path individually',
			{ name: 'Sticky Note6', position: [-2752, 1008], width: 608, height: 1008 },
		),
	)
	.add(
		sticky('## Important\n- PDF file must be publicly accesible.', {
			name: 'Sticky Note4',
			color: 3,
			position: [-2752, 2048],
			width: 528,
			height: 80,
		}),
	);
