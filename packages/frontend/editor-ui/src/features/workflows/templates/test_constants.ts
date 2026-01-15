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
				id: 'd4e5f6a7-b8c9-0123-defa-456789012345',
				name: 'Process Blocks',
				type: 'n8n-nodes-base.function',
				position: [1360, 280],
				parameters: {
					functionCode:
						'let returnData = {\n  json: {\n    toDelete: false,\n    pageID: $node["SplitInBatches"].json["id"],\n  }\n};\n\nif (!items[0].json.id) {\n  returnData.json.toDelete = true;\n  return [returnData];\n}\n\nfor (item of items) {\n  \n  let toDelete = false;\n\n  let type = item.json.type;\n  let data = item.json[type];\n\n  if (!toDelete) {\n    if (data.text.length == 0) {\n      toDelete = true;\n    } else {\n      returnData.json.toDelete = false;\n      break;\n    }\n  }\n\n  returnData.json.toDelete = toDelete;\n}\n\nreturn [returnData];',
				},
				typeVersion: 1,
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
				id: 'f6a7b8c9-d0e1-2345-fabc-678901234567',
				name: 'Check for empty properties',
				type: 'n8n-nodes-base.function',
				position: [600, 300],
				parameters: {
					functionCode:
						'for (item of items) {\n\n  let toDelete = false;\n  for (const key in item.json.properties) {\n    let type = item.json.properties[key].type;\n    let data = item.json.properties[key][type];\n    \n    if (!data || data.length == 0) {\n      toDelete = true;\n    } else {\n      toDelete = false;\n      break;\n    }\n  }\n\n  item.json.toDelete = toDelete;\n}\n\nreturn items;',
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
			'Process Blocks': {
				main: [
					[
						{
							node: 'If toDelete',
							type: 'main',
							index: 0,
						},
						{
							node: 'SplitInBatches',
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
							node: 'Process Blocks',
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
							node: 'Check for empty properties',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Check for empty properties': {
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
				nodes: [
					'Check for empty properties',
					'If Empty Properties',
					'If toDelete',
					'Process Blocks',
					'SplitInBatches',
					'Get Page Blocks',
				],
			},
			{
				name: 'Actions',
				description: 'Nodes that perform actions in Notion',
				nodes: ['Archive Page', 'HTTP Request'],
			},
		],
	},
};
