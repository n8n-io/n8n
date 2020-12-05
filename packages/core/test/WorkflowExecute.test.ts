
import {
	IConnections,
	INode,
	IRun,
	Workflow,
} from 'n8n-workflow';

import {
	createDeferredPromise,
	WorkflowExecute,
} from '../src';

import * as Helpers from './Helpers';


describe('WorkflowExecute', () => {

	describe('run', () => {

		const tests: Array<{
			description: string;
			input: {
				workflowData: {
					nodes: INode[],
					connections: IConnections,
				}
			},
			output: {
				nodeExecutionOrder: string[];
				nodeData: {
					[key: string]: any[][]; // tslint:disable-line:no-any
				};
			},
		}> = [
			{
				description: 'should run basic two node workflow',
				input: {
					// Leave the workflowData in regular JSON to be able to easily
					// copy it from/in the UI
					workflowData: {
						"nodes": [
							{
								"parameters": {},
								"name": "Start",
								"type": "n8n-nodes-base.start",
								"typeVersion": 1,
								"position": [
									100,
									300,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value1",
												"value": 1,
											},
										],
									},
								},
								"name": "Set",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									280,
									300,
								],
							},
						],
						"connections": {
							"Start": {
								"main": [
									[
										{
											"node": "Set",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeExecutionOrder: [
						'Start',
						'Set',
					],
					nodeData: {
						Set: [
							[
								{
									value1: 1,
								},
							],
						],
					},
				},
			},
			{
				description: 'should run node twice when it has two input connections',
				input: {
					// Leave the workflowData in regular JSON to be able to easily
					// copy it from/in the UI
					workflowData: {
						"nodes": [
							{
								"parameters": {},
								"name": "Start",
								"type": "n8n-nodes-base.start",
								"typeVersion": 1,
								"position": [
									100,
									300,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value1",
												"value": 1,
											},
										],
									},
								},
								"name": "Set1",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									300,
									250,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value2",
												"value": 2,
											},
										],
									},
								},
								"name": "Set2",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									500,
									400,
								],
							},
						],
						"connections": {
							"Start": {
								"main": [
									[
										{
											"node": "Set1",
											"type": "main",
											"index": 0,
										},
										{
											"node": "Set2",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Set1": {
								"main": [
									[
										{
											"node": "Set2",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeExecutionOrder: [
						'Start',
						'Set1',
						'Set2',
						'Set2',
					],
					nodeData: {
						Set1: [
							[
								{
									value1: 1,
								},
							],
						],
						Set2: [
							[
								{
									value2: 2,
								},
							],
							[
								{
									value1: 1,
									value2: 2,
								},
							],
						],
					},
				},
			},
			{
				description: 'should run complicated multi node workflow',
				input: {
					// Leave the workflowData in regular JSON to be able to easily
					// copy it from/in the UI
					workflowData: {
						"nodes": [
							{
								"parameters": {
									"mode": "passThrough",
								},
								"name": "Merge4",
								"type": "n8n-nodes-base.merge",
								"typeVersion": 1,
								"position": [
									1150,
									500,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value2",
												"value": 2,
											},
										],
									},
								},
								"name": "Set2",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									290,
									400,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value4",
												"value": 4,
											},
										],
									},
								},
								"name": "Set4",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									850,
									200,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value3",
												"value": 3,
											},
										],
									},
								},
								"name": "Set3",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									650,
									200,
								],
							},
							{
								"parameters": {
									"mode": "passThrough",
								},
								"name": "Merge4",
								"type": "n8n-nodes-base.merge",
								"typeVersion": 1,
								"position": [
									1150,
									500,
								],
							},
							{
								"parameters": {},
								"name": "Merge3",
								"type": "n8n-nodes-base.merge",
								"typeVersion": 1,
								"position": [
									1000,
									400,
								],
							},
							{
								"parameters": {
									"mode": "passThrough",
									"output": "input2",
								},
								"name": "Merge2",
								"type": "n8n-nodes-base.merge",
								"typeVersion": 1,
								"position": [
									700,
									400,
								],
							},
							{
								"parameters": {},
								"name": "Merge1",
								"type": "n8n-nodes-base.merge",
								"typeVersion": 1,
								"position": [
									500,
									300,
								],
							},
							{
								"parameters": {
									"values": {
										"number": [
											{
												"name": "value1",
												"value": 1,
											},
										],
									},
								},
								"name": "Set1",
								"type": "n8n-nodes-base.set",
								"typeVersion": 1,
								"position": [
									300,
									200,
								],
							},
							{
								"parameters": {},
								"name": "Start",
								"type": "n8n-nodes-base.start",
								"typeVersion": 1,
								"position": [
									100,
									300,
								],
							},
						],
						"connections": {
							"Set2": {
								"main": [
									[
										{
											"node": "Merge1",
											"type": "main",
											"index": 1,
										},
										{
											"node": "Merge2",
											"type": "main",
											"index": 1,
										},
									],
								],
							},
							"Set4": {
								"main": [
									[
										{
											"node": "Merge3",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Set3": {
								"main": [
									[
										{
											"node": "Set4",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Merge3": {
								"main": [
									[
										{
											"node": "Merge4",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Merge2": {
								"main": [
									[
										{
											"node": "Merge3",
											"type": "main",
											"index": 1,
										},
									],
								],
							},
							"Merge1": {
								"main": [
									[
										{
											"node": "Merge2",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Set1": {
								"main": [
									[
										{
											"node": "Merge1",
											"type": "main",
											"index": 0,
										},
										{
											"node": "Set3",
											"type": "main",
											"index": 0,
										},
									],
								],
							},
							"Start": {
								"main": [
									[
										{
											"node": "Set1",
											"type": "main",
											"index": 0,
										},
										{
											"node": "Set2",
											"type": "main",
											"index": 0,
										},
										{
											"node": "Merge4",
											"type": "main",
											"index": 1,
										},
									],
								],
							},
						},
					},
				},
				output: {
					nodeExecutionOrder: [
						'Start',
						'Set1',
						'Set2',
						'Set3',
						'Merge1',
						'Set4',
						'Merge2',
						'Merge3',
						'Merge4',
					],
					nodeData: {
						Set1: [
							[
								{
									value1: 1,
								},
							],
						],
						Set2: [
							[
								{
									value2: 2,
								},
							],
						],
						Set3: [
							[
								{
									value1: 1,
									value3: 3,
								},
							],
						],
						Set4: [
							[
								{
									value1: 1,
									value3: 3,
									value4: 4,
								},
							],
						],
						Merge1: [
							[
								{
									value1: 1,
								},
								{
									value2: 2,
								},
							],
						],
						Merge2: [
							[
								{
									value2: 2,
								},
							],
						],
						Merge3: [
							[
								{
									value1: 1,
									value3: 3,
									value4: 4,
								},
								{
									value2: 2,
								},
							],
						],
						Merge4: [
							[
								{
									value1: 1,
									value3: 3,
									value4: 4,
								},
								{
									value2: 2,
								},
							],
						],
					},
				},
			},
		];


		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, async () => {

				const workflowInstance = new Workflow({ id: 'test', nodes: testData.input.workflowData.nodes, connections: testData.input.workflowData.connections, active: false, nodeTypes });

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance, undefined);

				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new Error(`Data for node "${nodeName}" is missing!`);
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json );
					});

					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
				expect(result.data.executionData!.waitingExecution).toEqual({});
			});
		}

	});

});
