import type { IWorkflowTemplate } from '@n8n/rest-api-client';

export const TEST_TEMPLATE_WITH_MODULES: IWorkflowTemplate = {
	id: 115,
	name: 'Archive empty pages in Notion Database',
	workflow: {
		nodes: [
			{
				id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				name: 'Get All Databases',
				type: 'n8n-nodes-base.notion',
				position: [240, 300],
				parameters: {
					resource: 'database',
					operation: 'getAll',
					returnAll: true,
				},
				credentials: {
					notionApi: {
						id: 'credential-id',
						name: 'notionApi Credential',
					},
				},
				typeVersion: 2,
			},
			{
				id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
				name: 'Get All Database Pages',
				type: 'n8n-nodes-base.notion',
				position: [420, 300],
				parameters: {
					simple: false,
					options: {},
					resource: 'databasePage',
					operation: 'getAll',
					returnAll: true,
					databaseId: '={{$json["id"]}}',
				},
				credentials: {
					notionApi: {
						id: 'credential-id',
						name: 'notionApi Credential',
					},
				},
				typeVersion: 2,
			},
			{
				id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
				name: 'Get Page Blocks',
				type: 'n8n-nodes-base.notion',
				position: [1180, 280],
				parameters: {
					blockId: '={{$json["id"]}}',
					resource: 'block',
					operation: 'getAll',
					returnAll: true,
				},
				credentials: {
					notionApi: {
						id: 'credential-id',
						name: 'notionApi Credential',
					},
				},
				typeVersion: 2,
			},
			{
				id: 'e5f6a7b8-c9d0-1234-efab-567890123456',
				name: 'SplitInBatches',
				type: 'n8n-nodes-base.splitInBatches',
				position: [1000, 280],
				parameters: {
					options: {},
					batchSize: 1,
				},
				typeVersion: 1,
			},
			{
				id: 'a7b8c9d0-e1f2-3456-abcd-789012345678',
				name: 'Archive Page',
				type: 'n8n-nodes-base.notion',
				position: [1760, 260],
				parameters: {
					pageId: '={{$json["pageID"]}}',
					operation: 'archive',
				},
				credentials: {
					notionApi: {
						id: 'credential-id',
						name: 'notionApi Credential',
					},
				},
				typeVersion: 2,
			},
			{
				id: 'b8c9d0e1-f2a3-4567-bcde-890123456789',
				name: 'If toDelete',
				type: 'n8n-nodes-base.if',
				position: [1560, 280],
				parameters: {
					conditions: {
						boolean: [
							{
								value1: '={{$json["toDelete"]}}',
								value2: true,
							},
						],
					},
				},
				typeVersion: 1,
			},
			{
				id: 'c9d0e1f2-a3b4-5678-cdef-901234567890',
				name: 'If Empty Properties',
				type: 'n8n-nodes-base.if',
				position: [760, 300],
				parameters: {
					conditions: {
						boolean: [
							{
								value1: '={{$json["toDelete"]}}',
								value2: true,
							},
						],
					},
				},
				typeVersion: 1,
			},
			{
				id: 'd0e1f2a3-b4c5-6789-defa-012345678901',
				name: 'Every day @ 2am',
				type: 'n8n-nodes-base.cron',
				position: [80, 300],
				parameters: {
					triggerTimes: {
						item: [
							{
								hour: 2,
							},
						],
					},
				},
				typeVersion: 1,
			},
			{
				parameters: {
					options: {},
				},
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.3,
				position: [2064, 320],
				id: 'feeb3fe1-2f49-46e8-a851-ece761e8fc67',
				name: 'HTTP Request',
			},
			{
				id: '62cc6d3d-53cd-43f7-ad59-c556d061b4cd',
				name: 'Get many events',
				type: 'n8n-nodes-base.googleCalendar',
				typeVersion: 1.3,
				parameters: {
					operation: 'getAll',
					calendar: {
						__rl: true,
						mode: 'list',
						value: '',
					},
					timeMin: '[DateTime: 2026-01-21T07:45:39.029-05:00]',
					timeMax: '[DateTime: 2026-01-28T07:45:39.029-05:00]',
					options: {},
				},
				position: [2352, 784],
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'e71zldqTHabI3yUa',
						name: 'Google Calendar account',
					},
				},
			},
			{
				id: '7da75fc6-6e0d-4790-96c6-04ec4b984690',
				name: 'Get a report',
				type: 'n8n-nodes-base.googleAnalytics',
				typeVersion: 2,
				parameters: {
					propertyId: {
						__rl: true,
						mode: 'list',
						value: '',
					},
					dateRange: 'custom',
					metricsGA4: {
						metricValues: [{}],
					},
					dimensionsGA4: {
						dimensionValues: [{}],
					},
					additionalFields: {},
				},
				position: [2048, 896],
			},
			{
				id: '1e9c79b7-bf42-47f9-8fb1-83b6c006f6ac',
				type: 'n8n-nodes-base.discourse',
				name: 'Create a category',
				typeVersion: 1,
				parameters: {
					resource: 'category',
				},
				position: [1296, 784],
			},
			{
				id: '499b7695-48df-41d5-aa15-05a45f5d8636',
				name: 'Create a message',
				type: 'n8n-nodes-base.googleChat',
				typeVersion: 1,
				parameters: {
					jsonParameters: true,
					additionalFields: {},
				},
				position: [2080, 736],
				webhookId: 'ab0d8d0b-aefa-4dc3-b656-99a454a6b34d',
			},
			{
				id: '91d3d939-1c57-4f63-9fd6-d704a2578cf7',
				name: 'HTML',
				type: 'n8n-nodes-base.html',
				typeVersion: 1.2,
				parameters: {},
				position: [1584, 640],
			},
			{
				id: '6d4891da-3e66-4c61-ae44-27a6b4205a26',
				name: 'Code in Python',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				parameters: {
					language: 'pythonNative',
					pythonCode:
						'# Loop over input items and add a new field called \'my_new_field\' to the JSON of each one\nfor item in _items:\n  item["json"]["my_new_field"] = 1\nreturn _items',
				},
				position: [1968, 1024],
			},
			{
				id: 'bc1137ac-39c5-4deb-bd91-40f9e49ee4bd',
				name: 'Code in JavaScript',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				parameters: {
					jsCode:
						"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
				},
				position: [192, 0],
			},
			{
				id: 'b83e1a20-c13a-49ac-8beb-7f2ba2bae9c4',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'f0992132-ffe9-4ab2-9255-010e96003bf7',
								name: 'name',
								value: '',
								type: 'string',
							},
							{
								id: 'a76fa292-a5d3-4a75-8d97-17a3d12c1f76',
								name: 'age',
								value: 0,
								type: 'number',
							},
							{
								id: '37eacdfd-3493-4d4a-a466-6c2b19a029aa',
								name: 'isActive',
								value: false,
								type: 'boolean',
							},
						],
					},
					options: {},
				},
				position: [928, 720],
			},
		],
		settings: {},
		connections: {
			'If toDelete': {
				main: [
					[
						{
							node: 'Archive Page',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'HTTP Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			SplitInBatches: {
				main: [
					[
						{
							node: 'Get Page Blocks',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Every day @ 2am': {
				main: [
					[
						{
							node: 'Get All Databases',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Page Blocks': {
				main: [
					[
						{
							node: 'If toDelete',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get All Databases': {
				main: [
					[
						{
							node: 'Get All Database Pages',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'If Empty Properties': {
				main: [
					[
						{
							node: 'SplitInBatches',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get All Database Pages': {
				main: [
					[
						{
							node: 'If Empty Properties',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
		modules: [
			{
				name: 'Trigger',
				description: 'Nodes that start workflows',
				nodes: ['Every day @ 2am'],
			},
			{
				name: 'Get Notion Data',
				description: 'Nodes to retrieve data from Notion',
				nodes: ['Get All Databases', 'Get All Database Pages'],
			},
			{
				name: 'Logic',
				description: 'Logical operations and data processing',
				nodes: ['If Empty Properties', 'If toDelete', 'SplitInBatches', 'Get Page Blocks'],
			},
			{
				name: 'Actions',
				description: 'Nodes that perform actions in Notion',
				nodes: ['Archive Page', 'HTTP Request'],
			},
		],
	},
};
