const wf = workflow('vMvm0kfL6V7u4bPO', 'Client Responder IG/TG', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '/shoe-orders',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [-600, 0],
				name: 'Receive Request',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: "={{ $('Receive Request').first().json.body.message }}",
					batching: {},
					messages: {
						messageValues: [
							{
								type: '=SystemMessagePromptTemplate',
								message:
									'=Extract shoe details from customer inquiry: brand name, model name, size, and color. Return only valid JSON format: {"brand": "", "model": "", "size": "", "color": ""}\n\nExamples:\n- "Do you have Nike Air Max size 40?" → {"brand": "Nike", "model": "Air Max", "size": "40", "color": ""}\n- "Looking for white Adidas size 38" → {"brand": "Adidas", "model": "", "size": "38", "color": "white"}\n\nCustomer message: {{ $json.message }}',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-360, 0],
				name: 'Parse Request AI',
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
						'const input = $input.first().json;\nconst parsedData = JSON.parse(input.text);\n\nreturn [{\n  json: {\n    brand: parsedData.brand || "",\n    model: parsedData.model || "",\n    size: parsedData.size || "",\n    color: parsedData.color || ""\n  }\n}];',
				},
				position: [80, 0],
				name: 'Extract Data',
			},
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
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1AczF58510i-QEppNi_UnzgqqfX0ickNJZjFW2Bu-6mI/edit#gid=0',
						cachedResultName: 'Лист1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1AczF58510i-QEppNi_UnzgqqfX0ickNJZjFW2Bu-6mI',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1AczF58510i-QEppNi_UnzgqqfX0ickNJZjFW2Bu-6mI/edit?usp=drivesdk',
						cachedResultName: 'In Stock',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [300, 0],
				name: 'Product Database',
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
						"const allItems = $input.all();\nconst search = $('Extract Data').first().json;\n\nconst filtered = allItems.filter(item => {\n  const brandMatch = item.json.Brand?.toString()?.toLowerCase() === search.brand?.toLowerCase();\n  const modelMatch = search.model ? item.json.Model?.toString()?.toLowerCase().includes(search.model?.toLowerCase()) : true;\n  const sizeMatch = item.json.Size?.toString() === search.size;\n  const colorMatch = search.color ? item.json.Color?.toString()?.toLowerCase().includes(search.color?.toLowerCase()) : true;\n  \n  return brandMatch && modelMatch && sizeMatch && colorMatch;\n});\n\nreturn filtered;",
				},
				position: [540, 0],
				name: 'Filter Products',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: "={{ $('Receive Request').first().json.body.message }}",
					batching: {},
					messages: {
						messageValues: [
							{
								type: '=SystemMessagePromptTemplate',
								message:
									'=You are a friendly shoe store assistant. Based on the product data below, generate a helpful response about availability, pricing, and stock.\n\nProduct data: {{ JSON.stringify($input.all()) }}\n\nResponse style: Friendly, helpful, and informative. Include price, stock quantity, and suggest alternatives if item is out of stock.',
							},
						],
					},
					promptType: 'define',
				},
				position: [740, 0],
				name: 'AI Manager',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.3,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.text }}',
				},
				position: [1140, 0],
				name: 'Send Response',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.3,
			config: {
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody: '={{ $json.text }}',
				},
				position: [1140, 0],
				name: 'Send Response',
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
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-340, 220],
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
						value: 'gpt-4',
						cachedResultName: 'gpt-4',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [780, 200],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		sticky(
			'Workflow Node Descriptions:\nReceive Request: "📥 Incoming customer message"\nParse Request AI: "🤖 Extract brand/model/size from text"\nExtract Data: "📊 Process JSON output"\nProduct Database: "📋 Load all products from inventory"\nFilter Products: "🔍 Find matching items only"\nAI Manager: "💬 Generate friendly response"\nSend Response: "📤 Deliver result to customer"',
			{ color: 3, position: [-700, -340], width: 2060, height: 860 },
		),
	);
