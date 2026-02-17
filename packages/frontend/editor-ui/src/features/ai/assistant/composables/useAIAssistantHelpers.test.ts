import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	deepCopy,
	type IDataObject,
	type ITaskDataConnections,
	type INode,
	type IRunExecutionData,
	type NodeConnectionType,
} from 'n8n-workflow';
import { useAIAssistantHelpers } from './useAIAssistantHelpers';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { IWorkflowDb } from '@/Interface';
import type { ChatRequest } from '../assistant.types';
import {
	ERROR_HELPER_TEST_PAYLOAD,
	PAYLOAD_SIZE_FOR_1_PASS,
	PAYLOAD_SIZE_FOR_2_PASSES,
	SUPPORT_CHAT_TEST_PAYLOAD,
} from './useAIAssistantHelpers.test.constants';

// Mock for expression extraction tests
const mockResolveExpression = vi.fn();
const mockGetNodeParametersWithResolvedExpressions = vi.fn((params) => params);

// Mock useWorkflowHelpers
vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		resolveExpression: mockResolveExpression,
		getNodeParametersWithResolvedExpressions: mockGetNodeParametersWithResolvedExpressions,
	}),
}));

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
	activeVersionId: null,
	isArchived: false,
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
		'When clicking ‘Execute workflow’': [
			{
				hints: [],
				startTime: 1732882780588,
				executionIndex: 0,
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
				executionIndex: 1,
				executionTime: 0,
				source: [
					{
						previousNode: 'When clicking ‘Execute workflow’',
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

	// Helper to create properly typed inputOverride objects
	const createInputOverride = (data: IDataObject): ITaskDataConnections => ({
		main: [[{ json: data }]],
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

	it('simplifyResultData: Should not modify inputOverride when compact is false', () => {
		const largeInputOverride = createInputOverride({ someData: 'x'.repeat(3000) });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: largeInputOverride,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData);
		expect(simplifiedResultData.runData.TestNode[0].inputOverride).toEqual(largeInputOverride);
	});

	it('simplifyResultData: Should not truncate small inputOverride when compact is true', () => {
		const smallInputOverride = createInputOverride({ someData: 'small data' });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: smallInputOverride,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			compact: true,
		});
		expect(simplifiedResultData.runData.TestNode[0].inputOverride).toEqual(smallInputOverride);
	});

	it('simplifyResultData: Should remove large inputOverride when compact is true', () => {
		const largeInputOverride = createInputOverride({ someData: 'x'.repeat(3000) });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: largeInputOverride,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			compact: true,
		});

		// Large inputOverride should be removed entirely to maintain type safety
		expect(simplifiedResultData.runData.TestNode[0].inputOverride).toBeUndefined();
	});

	it('simplifyResultData: Should handle multiple nodes with different inputOverride sizes', () => {
		const smallInput = createInputOverride({ data: 'small' });
		const largeInput = createInputOverride({ data: 'x'.repeat(3000) });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				SmallNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: smallInput,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
				LargeNode: [
					{
						hints: [],
						startTime: 1732882780589,
						executionIndex: 1,
						executionTime: 5,
						source: [],
						executionStatus: 'success',
						inputOverride: largeInput,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
				NoInputNode: [
					{
						hints: [],
						startTime: 1732882780590,
						executionIndex: 2,
						executionTime: 3,
						source: [],
						executionStatus: 'success',
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			compact: true,
		});

		// Small input should not be removed
		expect(simplifiedResultData.runData.SmallNode[0].inputOverride).toEqual(smallInput);

		// Large input should be removed entirely
		expect(simplifiedResultData.runData.LargeNode[0].inputOverride).toBeUndefined();

		// Node without inputOverride should not have it added
		expect(simplifiedResultData.runData.NoInputNode[0]).not.toHaveProperty('inputOverride');
	});

	it('simplifyResultData: Should handle multiple task data entries for the same node', () => {
		const largeInput1 = createInputOverride({ data: 'x'.repeat(3000) });
		const largeInput2 = createInputOverride({ data: 'y'.repeat(3000) });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: largeInput1,
						data: {
							main: [[{ json: {} }]],
						},
					},
					{
						hints: [],
						startTime: 1732882780589,
						executionIndex: 1,
						executionTime: 5,
						source: [],
						executionStatus: 'success',
						inputOverride: largeInput2,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			compact: true,
		});

		// Both entries should have inputOverride removed
		expect(simplifiedResultData.runData.TestNode[0].inputOverride).toBeUndefined();
		expect(simplifiedResultData.runData.TestNode[1].inputOverride).toBeUndefined();
	});

	it('simplifyResultData: Should keep full error when removeParameterValues is true', () => {
		const executionData: IRunExecutionData['resultData'] = {
			runData: {},
			error: {
				name: 'NodeOperationError',
				message: 'Something went wrong',
				stack: 'Error: Something went wrong\n    at someFunction',
				node: {
					id: 'node1',
					name: 'Test Node',
					type: 'test.node',
					typeVersion: 1,
					position: [0, 0],
					parameters: { sensitiveData: 'secret' },
				},
			} as unknown as IRunExecutionData['resultData']['error'],
			lastNodeExecuted: 'Test Node',
			metadata: { key: 'value' },
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			removeParameterValues: true,
		});

		// Full error should be present for debugging context
		expect(simplifiedResultData.error).toBeDefined();
		expect(simplifiedResultData.error?.name).toBe('NodeOperationError');
		expect(simplifiedResultData.error?.message).toBe('Something went wrong');
		expect((simplifiedResultData.error as unknown as { node?: unknown })?.node).toBeDefined();

		// Metadata and lastNodeExecuted should still be present
		expect(simplifiedResultData.lastNodeExecuted).toBe('Test Node');
		expect(simplifiedResultData.metadata).toEqual({ key: 'value' });
	});

	it('simplifyResultData: Should remove inputOverride from all task data when removeParameterValues is true', () => {
		const smallInput = createInputOverride({ data: 'small' });
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'success',
						inputOverride: smallInput,
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			removeParameterValues: true,
		});

		// inputOverride should be removed regardless of size when removeParameterValues is true
		expect(simplifiedResultData.runData.TestNode[0].inputOverride).toBeUndefined();
		// But timing/status should still be present
		expect(simplifiedResultData.runData.TestNode[0].startTime).toBe(1732882780588);
		expect(simplifiedResultData.runData.TestNode[0].executionStatus).toBe('success');
	});

	it('simplifyResultData: Should keep full error in task data when removeParameterValues is true', () => {
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				TestNode: [
					{
						hints: [],
						startTime: 1732882780588,
						executionIndex: 0,
						executionTime: 4,
						source: [],
						executionStatus: 'error',
						error: {
							name: 'NodeApiError',
							message: 'API call failed',
							stack: 'Error: API call failed\n    at apiCall',
							httpCode: '401',
							description: 'Unauthorized',
						} as unknown as IRunExecutionData['resultData']['runData'][string][number]['error'],
						data: {
							main: [[{ json: {} }]],
						},
					},
				],
			},
			pinData: {},
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			removeParameterValues: true,
		});

		// Full error should be preserved for debugging context
		const taskError = simplifiedResultData.runData.TestNode[0].error;
		expect(taskError).toBeDefined();
		expect(taskError?.name).toBe('NodeApiError');
		expect(taskError?.message).toBe('API call failed');
		expect((taskError as unknown as { httpCode?: string })?.httpCode).toBe('401');
		expect((taskError as unknown as { description?: string })?.description).toBe('Unauthorized');
	});

	it('simplifyResultData: Should keep full error when removeParameterValues is false', () => {
		const executionData: IRunExecutionData['resultData'] = {
			runData: {},
			error: {
				name: 'NodeOperationError',
				message: 'Something went wrong',
				stack: 'Error: Something went wrong\n    at someFunction',
				node: {
					id: 'node1',
					name: 'Test Node',
					type: 'test.node',
					typeVersion: 1,
					position: [0, 0],
					parameters: { sensitiveData: 'secret' },
				},
			} as unknown as IRunExecutionData['resultData']['error'],
		};

		const simplifiedResultData = aiAssistantHelpers.simplifyResultData(executionData, {
			removeParameterValues: false,
		});

		// Full error should be present
		expect(simplifiedResultData.error).toBeDefined();
		expect(simplifiedResultData.error?.name).toBe('NodeOperationError');
		expect((simplifiedResultData.error as unknown as { node?: unknown })?.node).toBeDefined();
	});
});

describe('processNodeForAssistant - excludeParameterValues', () => {
	let aiAssistantHelpers: ReturnType<typeof useAIAssistantHelpers>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		aiAssistantHelpers = useAIAssistantHelpers();
	});

	it('Should strip values from set node assignments while preserving schema', async () => {
		const node: INode = {
			id: 'set-node',
			name: 'Set Node',
			type: 'n8n-nodes-base.set',
			typeVersion: 2,
			position: [0, 0],
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: [
						{
							id: '4c1abbda-52ad-4809-97b6-6a88c421d9a3',
							name: 'firstName',
							value: 'John',
							type: 'string',
						},
						{
							id: 'af2e008d-cde6-45de-b5f1-26576ba463e0',
							name: 'lastName',
							value: 'Doe',
							type: 'string',
						},
					],
				},
				includeOtherFields: false,
				options: {},
			},
		};

		const processed = await aiAssistantHelpers.processNodeForAssistant(node, [], {
			excludeParameterValues: true,
		});

		expect(processed.parameters).toEqual({
			mode: '',
			duplicateItem: null,
			assignments: {
				assignments: [
					{
						id: '4c1abbda-52ad-4809-97b6-6a88c421d9a3',
						name: 'firstName',
						type: 'string',
					},
					{
						id: 'af2e008d-cde6-45de-b5f1-26576ba463e0',
						name: 'lastName',
						type: 'string',
					},
				],
			},
			includeOtherFields: null,
			options: {},
		});
	});

	it('Should sanitize primitive and structured parameter values', async () => {
		const resourceMapperValue = {
			mappingMode: 'auto',
			value: { firstName: 'John' },
			matchingColumns: ['firstName'],
			schema: [
				{
					id: 'field1',
					displayName: 'First Name',
					defaultMatch: true,
					required: true,
					display: true,
				},
			],
			attemptToConvertTypes: true,
			convertFieldsToString: false,
		};

		const filterValue = {
			options: {
				caseSensitive: false,
				leftValue: 'name',
				typeValidation: 'strict',
				version: 2,
			},
			combinator: 'AND',
			conditions: [
				{
					id: 'condition-1',
					leftValue: 'email',
					operator: {
						type: 'string',
						operation: 'contains',
					},
					rightValue: ['@n8n'],
				},
			],
		};

		const node: INode = {
			id: 'http-node',
			name: 'HTTP Node',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 5,
			position: [0, 0],
			parameters: {
				preBuiltAgentsCalloutHttpRequest: '',
				curlImport: '',
				method: 'GET',
				url: '=https://www.api.com/user={{ $json.firstName }}',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: true,
				nested: {
					query: {
						field: 'value',
					},
				},
				resourceLocator: {
					__rl: true,
					mode: 'list',
					value: '123',
					cachedResultName: 'User',
					cachedResultUrl: 'https://example.com',
				},
				mapper: resourceMapperValue,
				filters: filterValue,
				options: {},
			},
		};

		const processed = await aiAssistantHelpers.processNodeForAssistant(node, [], {
			excludeParameterValues: true,
		});

		expect(processed.parameters).toEqual({
			preBuiltAgentsCalloutHttpRequest: '',
			curlImport: '',
			method: '',
			url: '',
			authentication: '',
			provideSslCertificates: null,
			sendQuery: null,
			nested: {
				query: {
					field: '',
				},
			},
			resourceLocator: {
				__rl: true,
				mode: 'list',
				value: '',
			},
			mapper: {
				mappingMode: 'auto',
				value: null,
				matchingColumns: ['firstName'],
				schema: [
					{
						id: 'field1',
						displayName: 'First Name',
						defaultMatch: true,
						required: true,
						display: true,
					},
				],
				attemptToConvertTypes: true,
				convertFieldsToString: false,
			},
			filters: {
				options: {
					caseSensitive: false,
					leftValue: 'name',
					typeValidation: 'strict',
					version: 2,
				},
				combinator: 'AND',
				conditions: [
					{
						id: 'condition-1',
						leftValue: null,
						operator: {
							type: 'string',
							operation: 'contains',
						},
						rightValue: [],
					},
				],
			},
			options: {},
		});
	});
});

describe('Trim Payload Size', () => {
	let aiAssistantHelpers: ReturnType<typeof useAIAssistantHelpers>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		aiAssistantHelpers = useAIAssistantHelpers();
	});

	it('Should trim active node parameters in error helper payload', () => {
		const payload = deepCopy(ERROR_HELPER_TEST_PAYLOAD);
		aiAssistantHelpers.trimPayloadSize(payload);
		expect((payload.payload as ChatRequest.InitErrorHelper).node.parameters).toEqual({});
	});

	it('Should trim all node parameters in support chat', () => {
		// Testing the scenario where only one trimming pass is needed
		// (payload is under the limit after removing all node parameters and execution data)
		const payload: ChatRequest.RequestPayload = deepCopy(SUPPORT_CHAT_TEST_PAYLOAD);

		// Trimming to 4kb should be successful
		expect(() =>
			aiAssistantHelpers.trimPayloadSize(payload, PAYLOAD_SIZE_FOR_1_PASS),
		).not.toThrow();

		// Get the modified payload
		const supportPayload: ChatRequest.InitSupportChat =
			payload.payload as ChatRequest.InitSupportChat;

		// All active node parameters should be removed in the payload
		expect(supportPayload?.context?.activeNodeInfo?.node?.parameters).toEqual({});
		// Also, all node parameters in the workflow should be removed
		supportPayload.context?.currentWorkflow?.nodes?.forEach((node) => {
			expect(node.parameters).toEqual({});
		});
		// Node parameters in the execution data should be removed
		expect(supportPayload.context?.executionData?.runData).toEqual({});
		if (
			supportPayload.context?.executionData?.error &&
			'node' in supportPayload.context.executionData.error
		) {
			expect(supportPayload.context?.executionData?.error?.node?.parameters).toEqual({});
		}
		// Context object should still be there
		expect(supportPayload.context).to.be.an('object');
	});

	it('Should trim the whole context in support chat', () => {
		// Testing the scenario where both trimming passes are needed
		// (payload is over the limit after removing all node parameters and execution data)
		const payload: ChatRequest.RequestPayload = deepCopy(SUPPORT_CHAT_TEST_PAYLOAD);

		// Trimming should be successful
		expect(() =>
			aiAssistantHelpers.trimPayloadSize(payload, PAYLOAD_SIZE_FOR_2_PASSES),
		).not.toThrow();

		// Get the modified payload
		const supportPayload: ChatRequest.InitSupportChat =
			payload.payload as ChatRequest.InitSupportChat;

		// The whole context object should be removed
		expect(supportPayload.context).not.toBeDefined();
	});

	it('Should throw an error if payload is too big after trimming', () => {
		const payload = ERROR_HELPER_TEST_PAYLOAD;
		expect(() => aiAssistantHelpers.trimPayloadSize(payload, 0.2)).toThrow();
	});

	it('Should NOT modify the original objects when trimming payload', () => {
		// Create a test payload to verify that the original objects are not mutated
		const testNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'test.node',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: { key: 'value', nested: { data: 'test' } },
		};

		const workflowNode = {
			id: 'workflow-node',
			name: 'Workflow Node',
			type: 'test.node',
			typeVersion: 1,
			position: [100, 100] as [number, number],
			parameters: { param1: 'test1', param2: 'test2' },
		};

		const errorNode = {
			id: 'error-node',
			name: 'Error Node',
			type: 'test.node',
			typeVersion: 1,
			position: [200, 200] as [number, number],
			parameters: { errorParam: 'errorValue' },
		};

		const payload: ChatRequest.RequestPayload = {
			sessionId: 'test-session',
			payload: {
				type: 'init-support-chat',
				role: 'user',
				user: {
					firstName: 'Test User',
				},
				question: 'test question',
				context: {
					activeNodeInfo: {
						node: testNode,
					},
					currentWorkflow: {
						name: 'Test Workflow',
						nodes: [workflowNode],
						connections: {},
						active: false,
					},
					executionData: {
						runData: {
							'Test Node': [
								{
									startTime: 1000,
									executionTime: 100,
									executionIndex: 0,
									source: [],
									executionStatus: 'success',
									data: { main: [[{ json: {} }]] },
								},
							],
						},
					},
				},
			},
		};

		// Create a shared reference to verify immutability
		const sharedReference = {
			activeNode: testNode,
			workflowNode,
			errorNode,
		};

		// Store original parameter values
		const originalTestNodeParams = { ...testNode.parameters };
		const originalWorkflowNodeParams = { ...workflowNode.parameters };
		const originalErrorNodeParams = { ...errorNode.parameters };

		// Verify parameters exist before trimming
		expect(Object.keys(testNode.parameters).length).toBeGreaterThan(0);
		expect(Object.keys(workflowNode.parameters).length).toBeGreaterThan(0);
		expect(Object.keys(errorNode.parameters).length).toBeGreaterThan(0);

		// Call trimPayloadSize
		aiAssistantHelpers.trimPayloadSize(payload, PAYLOAD_SIZE_FOR_1_PASS);

		// Check that the original objects have NOT been modified
		expect(testNode.parameters).toEqual(originalTestNodeParams);
		expect(workflowNode.parameters).toEqual(originalWorkflowNodeParams);
		expect(errorNode.parameters).toEqual(originalErrorNodeParams);

		// The shared references should also remain unchanged
		expect(sharedReference.activeNode.parameters).toEqual(originalTestNodeParams);
		expect(sharedReference.workflowNode.parameters).toEqual(originalWorkflowNodeParams);
		expect(sharedReference.errorNode.parameters).toEqual(originalErrorNodeParams);

		// But the payload itself should have been modified with empty parameters
		const supportPayload = payload.payload as ChatRequest.InitSupportChat;
		expect(supportPayload.context?.activeNodeInfo?.node?.parameters).toEqual({});
		expect(
			supportPayload.context?.currentWorkflow?.nodes?.every(
				(node) => Object.keys(node.parameters).length === 0,
			),
		).toBe(true);
		expect(supportPayload.context?.executionData?.runData).toEqual({});
	});
});

describe('extractExpressionsFromWorkflow', () => {
	let aiAssistantHelpers: ReturnType<typeof useAIAssistantHelpers>;

	beforeEach(() => {
		// Create pinia
		const pinia = createTestingPinia({
			stubActions: false,
		});
		setActivePinia(pinia);

		// Setup mock implementation for resolveExpression
		mockResolveExpression.mockImplementation((expression: string) => {
			// Parse the expression and return appropriate mock values
			if (expression === '={{ "hello world" }}') return 'hello world';
			if (expression === '={{ 42 }}') return 42;
			if (expression === '={{ 3.14 }}') return 3.14;
			if (expression === '={{ true }}') return true;
			if (expression === '={{ false }}') return false;
			if (expression === '={{ 10 + 20 }}') return 30;
			if (expression === '={{ 100 * 2 }}') return 200;
			if (expression === '={{ 50 / 5 }}') return 10;
			if (expression === '={{ "Hello" + " " + "World" }}') return 'Hello World';
			if (expression === '={{ { name: "John", age: 30 } }}') return { name: 'John', age: 30 };
			if (expression === '={{ [1, 2, 3] }}') return [1, 2, 3];
			if (expression.includes('={{ "x".repeat(300) }}')) return 'x'.repeat(300);
			// Embedded expressions
			if (expression === '=Here is an expression {{ $json.text }} inside a regular string')
				return 'Here is an expression sample text inside a regular string';
			if (expression === '=Multiple expressions: {{ $now }} and {{ $json.field }}')
				return 'Multiple expressions: 2024-01-01 and field value';
			// For testing execution filtering
			if (expression === '={{ "executed node" }}') return 'executed node';
			if (expression === '={{ "not executed" }}') return 'not executed';
			if (expression === '={{ "node 1" }}') return 'node 1';
			if (expression === '={{ "node 2" }}') return 'node 2';
			if (expression === '={{ "executed 1" }}') return 'executed 1';
			if (expression === '={{ "executed 2" }}') return 'executed 2';
			if (expression.includes('$json')) {
				throw new Error('Cannot read properties of null');
			}
			return '<resolved>';
		});

		aiAssistantHelpers = useAIAssistantHelpers();
	});

	it('Should return empty object for workflow with no nodes', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result).toEqual({});
	});

	it('Should return empty object for workflow with nodes but no expressions', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						method: 'GET',
						url: 'https://example.com',
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result).toEqual({});
	});

	it('Should extract and resolve expressions with nodeType', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						url: '={{ "hello world" }}',
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['HTTP Request']).toBeDefined();
		expect(result['HTTP Request'][0]).toEqual({
			expression: '={{ "hello world" }}',
			resolvedValue: 'hello world',
			nodeType: 'n8n-nodes-base.httpRequest',
			parameterPath: 'url',
		});
	});

	it('Should extract multiple expressions from same node and nested objects', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						url: '={{ $json.url }}',
						headers: {
							authorization: '={{ $json.token }}',
						},
						documentId: {
							__rl: true,
							value: "={{ $('Edit Fields').item.json.document }}",
							mode: 'id',
						},
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['HTTP Request']).toBeDefined();
		expect(result['HTTP Request'].length).toBe(3);
		const expressions = result['HTTP Request'].map((e) => e.expression);
		expect(expressions).toContain('={{ $json.url }}');
		expect(expressions).toContain('={{ $json.token }}');
		expect(expressions).toContain("={{ $('Edit Fields').item.json.document }}");
	});

	it('Should extract expressions from arrays', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: '1',
									name: 'field1',
									value: '={{ $json.field1 }}',
									type: 'string',
								},
								{
									id: '2',
									name: 'field2',
									value: '={{ $json.field2 }}',
									type: 'string',
								},
							],
						},
					},
					id: 'node1',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Edit Fields']).toBeDefined();
		expect(result['Edit Fields'].length).toBe(2);
		expect(result['Edit Fields'][0]).toMatchObject({
			expression: '={{ $json.field1 }}',
			nodeType: 'n8n-nodes-base.set',
		});
		expect(result['Edit Fields'][1]).toMatchObject({
			expression: '={{ $json.field2 }}',
			nodeType: 'n8n-nodes-base.set',
		});
		// Both should have resolved values (even if errors)
		expect(result['Edit Fields'][0].resolvedValue).toBeDefined();
		expect(result['Edit Fields'][1].resolvedValue).toBeDefined();
	});

	it('Should trim resolved values longer than 200 characters', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// Simple long string that should be trimmed
						value: '={{ "x".repeat(300) }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		expect(result['Test Node'][0].expression).toBe('={{ "x".repeat(300) }}');

		const resolvedValue = result['Test Node'][0].resolvedValue as string;
		// Should have a resolved value
		expect(resolvedValue).toBeDefined();
		expect(resolvedValue.length).toBeGreaterThan(0);

		// If it's not an error and the value was long enough, it should be truncated
		if (!resolvedValue.startsWith('Error in expression:') && resolvedValue.length > 200) {
			expect(resolvedValue).toContain('... [truncated]');
			expect(resolvedValue.length).toBeLessThanOrEqual(220); // 200 + "... [truncated]"
		}
	});

	it('Should handle expression resolution errors gracefully', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// This expression will cause an error (accessing property of null)
						value: '={{ $json.nonexistent.nested.property }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		expect(result['Test Node'][0]).toMatchObject({
			expression: '={{ $json.nonexistent.nested.property }}',
			nodeType: 'n8n-nodes-base.set',
		});

		const resolvedValue = result['Test Node'][0].resolvedValue as string;
		// Should contain error message
		expect(resolvedValue).toContain('Error in expression:');
		// Error message should be trimmed if too long
		expect(resolvedValue.length).toBeLessThanOrEqual(250);
	});

	it('Should group expressions by node name', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						url: '={{ $json.url1 }}',
					},
					id: 'node1',
					name: 'HTTP Request 1',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						url: '={{ $json.url2 }}',
					},
					id: 'node2',
					name: 'HTTP Request 2',
					type: 'n8n-nodes-base.httpRequest',
					position: [100, 100],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(Object.keys(result)).toHaveLength(2);
		expect(result['HTTP Request 1']).toBeDefined();
		expect(result['HTTP Request 2']).toBeDefined();
		expect(result['HTTP Request 1'][0].expression).toBe('={{ $json.url1 }}');
		expect(result['HTTP Request 2'][0].expression).toBe('={{ $json.url2 }}');
	});

	it('Should not include nodes without expressions in result', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						url: 'https://example.com',
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						value: '={{ $json.field }}',
					},
					id: 'node2',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					position: [100, 100],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(Object.keys(result)).toHaveLength(1);
		expect(result['HTTP Request']).toBeUndefined();
		expect(result['Edit Fields']).toBeDefined();
	});

	it('Should handle nodes without parameters', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {},
					id: 'node1',
					name: 'No Op',
					type: 'n8n-nodes-base.noOp',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result).toEqual({});
	});

	it('Should resolve different value types correctly (string, number, boolean, object, array)', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						stringVal: '={{ "hello world" }}',
						numberVal: '={{ 42 }}',
						boolVal: '={{ true }}',
						mathVal: '={{ 10 + 20 }}',
						objVal: '={{ { name: "John", age: 30 } }}',
						arrayVal: '={{ [1, 2, 3] }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		expect(result['Test Node'].length).toBe(6);

		// Verify all expressions extracted and resolved with correct types
		const expressionMap = Object.fromEntries(
			result['Test Node'].map((e) => [e.expression, e.resolvedValue]),
		);
		// String value
		expect(expressionMap['={{ "hello world" }}']).toBe('hello world');
		// Number values
		expect(expressionMap['={{ 42 }}']).toBe(42);
		expect(expressionMap['={{ 10 + 20 }}']).toBe(30);
		// Boolean value
		expect(expressionMap['={{ true }}']).toBe(true);
		// Object value (preserved as object)
		expect(expressionMap['={{ { name: "John", age: 30 } }}']).toEqual({ name: 'John', age: 30 });
		// Array value (preserved as array)
		expect(expressionMap['={{ [1, 2, 3] }}']).toEqual([1, 2, 3]);
	});

	it('Should trim very long resolved values correctly', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// Create a long literal string
						value: '={{ "x".repeat(300) }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		const resolvedValue = result['Test Node'][0].resolvedValue as string;
		// Mock returns a 300 char string, should be trimmed
		expect(resolvedValue.length).toBeLessThanOrEqual(220); // 200 + "... [truncated]"
		expect(resolvedValue).toContain('... [truncated]');
		expect(resolvedValue).toMatch(/^x+\.\.\. \[truncated\]$/);
	});

	it('Should handle expressions embedded in regular strings', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// Single embedded expression
						message: '=Here is an expression {{ $json.text }} inside a regular string',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		expect(result['Test Node'].length).toBe(1);
		expect(result['Test Node'][0].expression).toBe(
			'=Here is an expression {{ $json.text }} inside a regular string',
		);
		expect(result['Test Node'][0].resolvedValue).toBe(
			'Here is an expression sample text inside a regular string',
		);
	});

	it('Should handle multiple expressions in one string', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// Multiple embedded expressions
						message: '=Multiple expressions: {{ $now }} and {{ $json.field }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		expect(result['Test Node'].length).toBe(1);
		expect(result['Test Node'][0].expression).toBe(
			'=Multiple expressions: {{ $now }} and {{ $json.field }}',
		);
		expect(result['Test Node'][0].resolvedValue).toBe(
			'Multiple expressions: 2024-01-01 and field value',
		);
	});

	it('Should skip static strings without expressions', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						// Static string starting with = but no expressions
						staticField: '=Static string without expressions',
						// This should be extracted
						expressionField: '={{ $json.value }}',
					},
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Test Node']).toBeDefined();
		// Should only have 1 expression (the expressionField), not the static string
		expect(result['Test Node'].length).toBe(1);
		expect(result['Test Node'][0].expression).toBe('={{ $json.value }}');
		// Verify static string was skipped
		const expressions = result['Test Node'].map((e) => e.expression);
		expect(expressions).not.toContain('=Static string without expressions');
	});

	it('Should only extract expressions from executed nodes when execution data is provided', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						value: '={{ "executed node" }}',
					},
					id: 'node1',
					name: 'Executed Node',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						value: '={{ "not executed" }}',
					},
					id: 'node2',
					name: 'Not Executed Node',
					type: 'n8n-nodes-base.set',
					position: [100, 0],
					typeVersion: 1,
				},
			],
		};

		// Execution data with only one node executed
		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				'Executed Node': [
					{
						hints: [],
						startTime: 1000,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						executionStatus: 'success',
						data: { main: [[{ json: {} }]] },
					},
				],
			},
			pinData: {},
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow, executionData);

		// Should only have expressions from executed node
		expect(result['Executed Node']).toBeDefined();
		expect(result['Not Executed Node']).toBeUndefined();
		expect(Object.keys(result)).toHaveLength(1);
	});

	it('Should extract from all nodes when no execution data is provided', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						value: '={{ "node 1" }}',
					},
					id: 'node1',
					name: 'Node 1',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						value: '={{ "node 2" }}',
					},
					id: 'node2',
					name: 'Node 2',
					type: 'n8n-nodes-base.set',
					position: [100, 0],
					typeVersion: 1,
				},
			],
		};

		// No execution data provided
		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);

		// Should extract from both nodes
		expect(result['Node 1']).toBeDefined();
		expect(result['Node 2']).toBeDefined();
		expect(Object.keys(result)).toHaveLength(2);
	});

	it('Should handle execution data with multiple executed nodes', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						value: '={{ "executed 1" }}',
					},
					id: 'node1',
					name: 'Executed Node 1',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						value: '={{ "executed 2" }}',
					},
					id: 'node2',
					name: 'Executed Node 2',
					type: 'n8n-nodes-base.set',
					position: [100, 0],
					typeVersion: 1,
				},
				{
					parameters: {
						value: '={{ "not executed" }}',
					},
					id: 'node3',
					name: 'Not Executed',
					type: 'n8n-nodes-base.set',
					position: [200, 0],
					typeVersion: 1,
				},
			],
		};

		const executionData: IRunExecutionData['resultData'] = {
			runData: {
				'Executed Node 1': [
					{
						hints: [],
						startTime: 1000,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						executionStatus: 'success',
						data: { main: [[{ json: {} }]] },
					},
				],
				'Executed Node 2': [
					{
						hints: [],
						startTime: 1010,
						executionTime: 10,
						executionIndex: 1,
						source: [],
						executionStatus: 'success',
						data: { main: [[{ json: {} }]] },
					},
				],
			},
			pinData: {},
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow, executionData);

		// Should have expressions from both executed nodes
		expect(result['Executed Node 1']).toBeDefined();
		expect(result['Executed Node 2']).toBeDefined();
		expect(result['Not Executed']).toBeUndefined();
		expect(Object.keys(result)).toHaveLength(2);
	});

	it('Should include parameterPath for simple parameters', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						url: '={{ "hello world" }}',
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['HTTP Request']).toBeDefined();
		expect(result['HTTP Request'][0]).toEqual({
			expression: '={{ "hello world" }}',
			resolvedValue: 'hello world',
			nodeType: 'n8n-nodes-base.httpRequest',
			parameterPath: 'url',
		});
	});

	it('Should include parameterPath for nested object parameters', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						headers: {
							authorization: '={{ "token" }}',
						},
					},
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['HTTP Request']).toBeDefined();
		expect(result['HTTP Request'][0].parameterPath).toBe('headers.authorization');
	});

	it('Should include parameterPath for array parameters', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: '1',
									name: 'field1',
									value: '={{ "value1" }}',
									type: 'string',
								},
								{
									id: '2',
									name: 'field2',
									value: '={{ "value2" }}',
									type: 'string',
								},
							],
						},
					},
					id: 'node1',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Edit Fields']).toBeDefined();
		expect(result['Edit Fields'].length).toBe(2);
		expect(result['Edit Fields'][0].parameterPath).toBe('assignments.assignments[0].value');
		expect(result['Edit Fields'][1].parameterPath).toBe('assignments.assignments[1].value');
	});

	it('Should include parameterPath for resource locator values', async () => {
		const workflow: IWorkflowDb = {
			...testWorkflow,
			nodes: [
				{
					parameters: {
						documentId: {
							__rl: true,
							value: '={{ "doc-id" }}',
							mode: 'id',
						},
					},
					id: 'node1',
					name: 'Google Sheets',
					type: 'n8n-nodes-base.googleSheets',
					position: [0, 0],
					typeVersion: 1,
				},
			],
		};

		const result = await aiAssistantHelpers.extractExpressionsFromWorkflow(workflow);
		expect(result['Google Sheets']).toBeDefined();
		expect(result['Google Sheets'][0].parameterPath).toBe('documentId.value');
	});
});
