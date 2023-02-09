import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../test/nodes/Helpers';

// import nock from 'nock';

describe('Test executeWorkflow Node', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	// beforeAll(() => {
	// 	nock.disableNetConnect();
	// });

	// afterAll(() => {
	// 	nock.restore();
	// });

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});

const _result = {
	executionData: {
		data: {
			startData: {},
			resultData: {
				runData: {
					'When clicking "Execute Workflow"': [
						{
							startTime: 1675933194926,
							executionTime: 1,
							source: [],
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
					'Execute Workflow': [
						{
							startTime: 1675933194928,
							executionTime: 46,
							source: [
								{
									previousNode: 'When clicking "Execute Workflow"',
								},
							],
							error: {
								message: 'Binary Data Manager not initialized',
								stack:
									'Error: Binary Data Manager not initialized\n    at Function.getInstance (/home/me/Work/n8n/packages/core/src/BinaryDataManager/index.ts:44:10)\n    at /home/me/Work/n8n/packages/core/src/NodeExecuteFunctions.ts:2219:25\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)',
							},
						},
					],
				},
				lastNodeExecuted: 'Execute Workflow',
				error: {
					message: 'Binary Data Manager not initialized',
					stack:
						'Error: Binary Data Manager not initialized\n    at Function.getInstance (/home/me/Work/n8n/packages/core/src/BinaryDataManager/index.ts:44:10)\n    at /home/me/Work/n8n/packages/core/src/NodeExecuteFunctions.ts:2219:25\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)',
				},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{
						node: {
							parameters: {
								source: 'parameter',
								workflowJson:
									'{\n  "meta": {\n    "instanceId": "36203ea1ce3cef713fa25999bd9874ae26b9e4c2c3a90a365f2882a154d031d0"\n  },\n  "nodes": [\n    {\n      "parameters": {\n        "options": {}\n      },\n      "id": "f0f37a8f-9136-42e8-be34-f32b77e4aa88",\n      "name": "XML2",\n      "type": "n8n-nodes-base.xml",\n      "typeVersion": 1,\n      "position": [\n        840,\n        520\n      ]\n    },\n    {\n      "parameters": {\n        "jsCode": "return {\\n\\"data\\":\\n\'<?xml version=\\"1.0\\" encoding=\\"UTF-8\\" standalone=\\"yes\\"?> <data> <id>1</id> <firstName>Adam</firstName> <secondName>Smith</secondName> <fullName>Adam Smith</fullName> </data>\'\\n}"\n      },\n      "id": "1f7dfe58-f877-454b-a680-dc9e1764c663",\n      "name": "Code1",\n      "type": "n8n-nodes-base.code",\n      "typeVersion": 1,\n      "position": [\n        660,\n        520\n      ]\n    },\n    {\n      "parameters": {},\n      "id": "8e56a83b-e9d2-453d-aaed-8e3601d0e8f2",\n      "name": "Execute Workflow Trigger",\n      "type": "n8n-nodes-base.executeWorkflowTrigger",\n      "typeVersion": 1,\n      "position": [\n        480,\n        520\n      ]\n    }\n  ],\n  "connections": {\n    "Code1": {\n      "main": [\n        [\n          {\n            "node": "XML2",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    },\n    "Execute Workflow Trigger": {\n      "main": [\n        [\n          {\n            "node": "Code1",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    }\n  }\n}',
								executeWorkflowNotice: '',
							},
							id: 'aacf9116-8103-473c-964f-e9bfbe5f580e',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1,
							position: [1080, 400],
						},
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
						source: {
							main: [
								{
									previousNode: 'When clicking "Execute Workflow"',
								},
							],
						},
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
		mode: 'manual',
		startedAt: '2023-02-09T08:59:54.923Z',
		stoppedAt: '2023-02-09T08:59:54.974Z',
	},
	result: {
		data: {
			startData: {},
			resultData: {
				runData: {
					'When clicking "Execute Workflow"': [
						{
							startTime: 1675933194926,
							executionTime: 1,
							source: [],
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
					'Execute Workflow': [
						{
							startTime: 1675933194928,
							executionTime: 46,
							source: [
								{
									previousNode: 'When clicking "Execute Workflow"',
								},
							],
							error: {
								message: 'Binary Data Manager not initialized',
								stack:
									'Error: Binary Data Manager not initialized\n    at Function.getInstance (/home/me/Work/n8n/packages/core/src/BinaryDataManager/index.ts:44:10)\n    at /home/me/Work/n8n/packages/core/src/NodeExecuteFunctions.ts:2219:25\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)',
							},
						},
					],
				},
				lastNodeExecuted: 'Execute Workflow',
				error: {
					message: 'Binary Data Manager not initialized',
					stack:
						'Error: Binary Data Manager not initialized\n    at Function.getInstance (/home/me/Work/n8n/packages/core/src/BinaryDataManager/index.ts:44:10)\n    at /home/me/Work/n8n/packages/core/src/NodeExecuteFunctions.ts:2219:25\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)',
				},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{
						node: {
							parameters: {
								source: 'parameter',
								workflowJson:
									'{\n  "meta": {\n    "instanceId": "36203ea1ce3cef713fa25999bd9874ae26b9e4c2c3a90a365f2882a154d031d0"\n  },\n  "nodes": [\n    {\n      "parameters": {\n        "options": {}\n      },\n      "id": "f0f37a8f-9136-42e8-be34-f32b77e4aa88",\n      "name": "XML2",\n      "type": "n8n-nodes-base.xml",\n      "typeVersion": 1,\n      "position": [\n        840,\n        520\n      ]\n    },\n    {\n      "parameters": {\n        "jsCode": "return {\\n\\"data\\":\\n\'<?xml version=\\"1.0\\" encoding=\\"UTF-8\\" standalone=\\"yes\\"?> <data> <id>1</id> <firstName>Adam</firstName> <secondName>Smith</secondName> <fullName>Adam Smith</fullName> </data>\'\\n}"\n      },\n      "id": "1f7dfe58-f877-454b-a680-dc9e1764c663",\n      "name": "Code1",\n      "type": "n8n-nodes-base.code",\n      "typeVersion": 1,\n      "position": [\n        660,\n        520\n      ]\n    },\n    {\n      "parameters": {},\n      "id": "8e56a83b-e9d2-453d-aaed-8e3601d0e8f2",\n      "name": "Execute Workflow Trigger",\n      "type": "n8n-nodes-base.executeWorkflowTrigger",\n      "typeVersion": 1,\n      "position": [\n        480,\n        520\n      ]\n    }\n  ],\n  "connections": {\n    "Code1": {\n      "main": [\n        [\n          {\n            "node": "XML2",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    },\n    "Execute Workflow Trigger": {\n      "main": [\n        [\n          {\n            "node": "Code1",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    }\n  }\n}',
								executeWorkflowNotice: '',
							},
							id: 'aacf9116-8103-473c-964f-e9bfbe5f580e',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1,
							position: [1080, 400],
						},
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
						source: {
							main: [
								{
									previousNode: 'When clicking "Execute Workflow"',
								},
							],
						},
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
		mode: 'manual',
		startedAt: '2023-02-09T08:59:54.923Z',
		stoppedAt: '2023-02-09T08:59:54.974Z',
	},
	nodeExecutionOrder: ['When clicking "Execute Workflow"', 'Execute Workflow'],
};
