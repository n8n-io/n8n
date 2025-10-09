import { describe, it, expect } from 'vitest';
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
