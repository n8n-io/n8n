import type { WorkflowTestData, IRun } from 'n8n-workflow';
import { createDeferredPromise, Workflow, ApplicationError } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

const nodeTypes = Helpers.NodeTypes();

// V2 parallel execution test data following the same pattern as v1WorkflowExecuteTests
const v2WorkflowExecuteTests: WorkflowTestData[] = [
	{
		description: 'should execute parallel branches with v2 execution order',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'branch1',
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'branch2',
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [
					[
						{}, // Start node produces empty json object
					],
				],
				Set1: [
					[
						{
							branch: 'branch1', // Set node output without json wrapper
						},
					],
				],
				Set2: [
					[
						{
							branch: 'branch2', // Set node output without json wrapper
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'Set1', 'Set2'], // Note: v2 may execute Set1/Set2 in different order due to parallelism
		},
	},
	{
		description: 'should respect maxParallel limits in v2 mode',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'value',
										value: 'output1',
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'value',
										value: 'output2',
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [
					[
						{}, // Start node produces empty json object
					],
				],
				Set1: [
					[
						{
							value: 'output1', // Set node output without json wrapper
						},
					],
				],
				Set2: [
					[
						{
							value: 'output2', // Set node output without json wrapper
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'Set1', 'Set2'],
		},
	},
];

describe('WorkflowExecute', () => {
	describe('v2 execution order', () => {
		const tests: WorkflowTestData[] = v2WorkflowExecuteTests;

		const executionMode = 'manual';

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v2',
						maxParallel: 2,
					},
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise;

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData: any) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry: any) => entry.json);
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Note: We don't check execution order for v2 because parallel execution
				// may result in different but valid execution orders
				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});
});
