import { describe, it, expect } from 'vitest';
import type { INode, IRunExecutionData, NodeConnectionType } from 'n8n-workflow';
import { useAIAssistantHelpers } from './useAIAssistantHelpers';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { IWorkflowDb } from '@/Interface';

const referencedNodesTestCases: Array<{ caseName: string; node: INode; expected: string[] }> = [
	{
		caseName: 'Should return an empty array if no referenced nodes',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: 'https://httpbin.org/get1',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: [],
	},
	{
		caseName: 'Should return an array of references for regular node',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: "={{ $('Edit Fields 2').item.json.sheet }}",
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields', 'Edit Fields 2'],
	},
	{
		caseName: 'Should return an array of references for set node',
		node: {
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: [
						{
							id: '135e0eb0-f412-430d-8990-731c57cf43ae',
							name: 'document',
							value: "={{ $('Edit Fields 2').item.json.document}}",
							type: 'string',
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'b5942df6-0160-4ef7-965d-57583acdc8aa',
							name: 'Replace me with your logic',
							type: 'n8n-nodes-base.noOp',
							position: [520, 340],
							typeVersion: 1,
						},
					],
				},
				includeOtherFields: false,
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [560, -140],
			id: '7306745f-ba8c-451d-ae1a-c627f60fbdd3',
			name: 'Edit Fields 2',
		},
		expected: ['Edit Fields 2'],
	},
	{
		caseName: 'Should handle expressions with single quotes, double quotes and backticks',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: '={{ $("Edit Fields 2").item.json.sheet }}',
					mode: 'id',
				},
				rowName: {
					__rl: true,
					value: '={{ $(`Edit Fields 3`).item.json.row }}',
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields', 'Edit Fields 2', 'Edit Fields 3'],
	},
	{
		caseName: 'Should only add one reference for each referenced node',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.sheet }}",
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields'],
	},
	{
		caseName: 'Should handle multiple node references in one expression',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: "={{ $('Edit Fields').item.json.one }} {{ $('Edit Fields 2').item.json.two }} {{ $('Edit Fields').item.json.three }}",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['Edit Fields', 'Edit Fields 2'],
	},
	{
		caseName: 'Should respect whitespace around node references',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: "={{ $('   Edit Fields     ').item.json.one }}",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['   Edit Fields     '],
	},
	{
		caseName: 'Should ignore whitespace inside expressions',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: "={{ $(    'Edit Fields'     ).item.json.one }}",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['Edit Fields'],
	},
	{
		caseName: 'Should ignore special characters in node references',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: "={{ $(    'Ignore ' this'    ).item.json.document }",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: [],
	},
	{
		caseName: 'Should correctly detect node names that contain single quotes',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				// In order to carry over backslashes to test function, the string needs to be double escaped
				url: "={{ $('Edit \\'Fields\\' 2').item.json.name }}",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ["Edit 'Fields' 2"],
	},
	{
		caseName: 'Should correctly detect node names with inner backticks',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: "={{ $('Edit `Fields` 2').item.json.name }}",
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['Edit `Fields` 2'],
	},
	{
		caseName: 'Should correctly detect node names with inner escaped backticks',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: '={{ $(`Edit \\`Fields\\` 2`).item.json.name }}',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['Edit `Fields` 2'],
	},
	{
		caseName: 'Should correctly detect node names with inner escaped double quotes',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				// In order to carry over backslashes to test function, the string needs to be double escaped
				url: '={{ $("Edit \\"Fields\\" 2").item.json.name }}',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: ['Edit "Fields" 2'],
	},
	{
		caseName: 'Should not detect invalid expressions',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				// String not closed properly
				url: "={{ $('Edit ' fields').item.json.document }",
				// Mixed quotes
				url2: '{{ $("Edit \'Fields" 2").item.json.name }}',
				url3: '{{ $("Edit `Fields" 2").item.json.name }}',
				// Quotes not escaped
				url4: '{{ $("Edit "Fields" 2").item.json.name }}',
				url5: "{{ $('Edit 'Fields' 2').item.json.name }}",
				url6: '{{ $(`Edit `Fields` 2`).item.json.name }}',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: [],
	},
];

const testWorkflow: IWorkflowDb = {
	id: 'MokOcBHON6KkPq6Y',
	name: 'My Sub-Workflow 3',
	active: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {
		'Execute Workflow Trigger': {
			main: [
				[
					{
						node: 'Replace me with your logic',
						type: 'main' as NodeConnectionType,
						index: 0,
					},
				],
			],
		},
	},
	nodes: [
		{
			parameters: {
				notice: '',
				events: 'worklfow_call',
			},
			id: 'c055762a-8fe7-4141-a639-df2372f30060',
			name: 'Execute Workflow Trigger',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			position: [260, 340],
			typeVersion: 0,
		},
		{
			parameters: {},
			id: 'b5942df6-0160-4ef7-965d-57583acdc8aa',
			name: 'Replace me with your logic',
			type: 'n8n-nodes-base.noOp',
			position: [520, 340],
			typeVersion: 1,
		},
	],
	settings: {
		executionOrder: 'v1',
	},
	tags: [],
	pinData: {},
	versionId: '9f3263e3-d23d-4cc8-bff0-0fdecfbd82bf',
	usedCredentials: [],
	scopes: [
		'workflow:create',
		'workflow:delete',
		'workflow:execute',
		'workflow:list',
		'workflow:move',
		'workflow:read',
		'workflow:share',
		'workflow:update',
	],
	sharedWithProjects: [],
};

const testExecutionData: IRunExecutionData['resultData'] = {
	runData: {
		'When clicking ‘Test workflow’': [
			{
				hints: [],
				startTime: 1732882780588,
				executionTime: 4,
				source: [],
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {},
								pairedItem: {
									item: 0,
								},
							},
						],
					],
				},
			},
		],
		'Edit Fields': [
			{
				hints: [],
				startTime: 1732882780593,
				executionTime: 0,
				source: [
					{
						previousNode: 'When clicking ‘Test workflow’',
					},
				],
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									something: 'here',
								},
								pairedItem: {
									item: 0,
								},
							},
						],
					],
				},
			},
		],
	},
	pinData: {},
	lastNodeExecuted: 'Edit Fields',
};

describe.each(referencedNodesTestCases)('getReferencedNodes', (testCase) => {
	let aiAssistantHelpers: ReturnType<typeof useAIAssistantHelpers>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		aiAssistantHelpers = useAIAssistantHelpers();
	});

	const caseName = testCase.caseName;
	it(`${caseName}`, () => {
		expect(aiAssistantHelpers.getReferencedNodes(testCase.node)).toEqual(testCase.expected);
	});
});

describe('Simplify assistant payloads', () => {
	let aiAssistantHelpers: ReturnType<typeof useAIAssistantHelpers>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		aiAssistantHelpers = useAIAssistantHelpers();
	});

	it('simplifyWorkflowForAssistant: Should remove unnecessary properties from workflow object', () => {
		const simplifiedWorkflow = aiAssistantHelpers.simplifyWorkflowForAssistant(testWorkflow);
		const removedProperties = [
			'createdAt',
			'updatedAt',
			'settings',
			'versionId',
			'usedCredentials',
			'sharedWithProjects',
			'pinData',
			'scopes',
			'tags',
		];
		removedProperties.forEach((property) => {
			expect(simplifiedWorkflow).not.toHaveProperty(property);
		});
	});

	it('simplifyResultData: Should remove data from nodes', () => {
		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(testExecutionData);
		for (const nodeName of Object.keys(simplifiedResultData.runData)) {
			expect(simplifiedResultData.runData[nodeName][0]).not.toHaveProperty('data');
		}
	});
});
